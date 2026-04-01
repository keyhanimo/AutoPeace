import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { dealsTable, solutionTreeTable, adminConfigTable, pipelineEvolutionTable, changelogEntriesTable, provisionOutcomesTable } from "@workspace/db/schema";
import { desc, eq, isNull, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  runFullEvaluation,
  isDominatedOnAllDimensions,
  DEAL_ARCHITECTURES,
  getFullEvidenceContext,
  type DealScores,
  type DealTerms,
  type MetaEvaluatorResult,
  type DealMemoryContext,
  type DealMemoryEntry,
  type StakeholderVerdict,
} from "./deal-engine";
import { setDealSubStage, type DealSubStage } from "../lib/cycle-status";
import { getModelConfig } from "./llm-router";
import { ingestAllSources } from "./evidence-ingestion";
import { emitCycleLog } from "../lib/cycle-log";

let dealCycleRunning = false;

export function isDealCycleRunning() {
  return dealCycleRunning;
}

const STALL_THRESHOLD = 3;
const PIPELINE_EVOLUTION_WINDOW = 3;

const STANDARD_ARCHITECTURES = ["balanced", "nuclear-first", "hormuz-first", "humanitarian-first"] as const;
const RADICAL_ARCHITECTURES = ["radical-restructure", "asymmetric-grand-bargain", "incremental-confidence", "freeform"] as const;
const RADICAL_EXPLORATION_PROBABILITY = 0.3;

async function getEvidenceSummary(modelConfig?: import("./llm-router").ModelConfig): Promise<{ context: string; strategicTokens: number }> {
  return getFullEvidenceContext(modelConfig);
}

async function getCurrentBestDiagnosis(): Promise<string> {
  try {
    const [best] = await db.select({ diagnosis: dealsTable.diagnosis })
      .from(dealsTable)
      .where(eq(dealsTable.isCurrent, true))
      .limit(1);
    return best?.diagnosis ?? "";
  } catch {
    return "";
  }
}

async function buildDealMemory(): Promise<DealMemoryContext> {
  try {
    const topDeals = await db.select()
      .from(dealsTable)
      .orderBy(desc(sql`(${dealsTable.scores}->>'composite')::float`))
      .limit(5);

    const dealMemoryEntries: DealMemoryEntry[] = topDeals.map(d => {
      const scores = d.scores as DealScores | null;
      const terms = d.terms as Partial<DealTerms> | null;
      const stakeholderEvals = d.stakeholderEvaluations as Record<string, StakeholderVerdict> | null;
      const provisions = terms?.innovativeProvisions ?? [];

      return {
        architecture: d.architecture,
        compositeScore: scores?.composite ?? 0,
        terms: {
          nuclearProtocol: terms?.nuclearProtocol,
          sanctionsRelief: terms?.sanctionsRelief,
          sequencing: terms?.sequencing,
          hormuzArrangements: terms?.hormuzArrangements,
        },
        topProvisions: provisions.map(p => ({ title: p.title, description: p.description })),
        stakeholderVerdicts: Object.fromEntries(
          Object.entries(stakeholderEvals ?? {}).map(([id, v]) => [id, { verdict: v.verdict, rationale: v.rationale }])
        ),
        diagnosis: d.diagnosis ?? "",
      };
    });

    const provisionRows = await db.select()
      .from(provisionOutcomesTable)
      .orderBy(desc(provisionOutcomesTable.createdAt))
      .limit(100);

    const provisionMap = new Map<string, { deltas: number[]; dimensions: Record<string, number[]>; count: number }>();
    for (const row of provisionRows) {
      const key = row.provisionTitle;
      if (!provisionMap.has(key)) {
        provisionMap.set(key, { deltas: [], dimensions: {}, count: 0 });
      }
      const entry = provisionMap.get(key)!;
      entry.count++;
      if (row.scoreDelta != null) {
        entry.deltas.push(row.scoreDelta);
      }
      if (row.dimensionDeltas) {
        for (const [dim, val] of Object.entries(row.dimensionDeltas)) {
          if (!entry.dimensions[dim]) entry.dimensions[dim] = [];
          entry.dimensions[dim].push(val as number);
        }
      }
    }

    const provisionInsights = Array.from(provisionMap.entries()).map(([title, data]) => {
      const avgScoreDelta = data.deltas.length > 0
        ? data.deltas.reduce((a, b) => a + b, 0) / data.deltas.length
        : 0;

      let bestDimension = "none";
      let worstDimension = "none";
      let bestAvg = -Infinity;
      let worstAvg = Infinity;

      for (const [dim, vals] of Object.entries(data.dimensions)) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        if (avg > bestAvg) { bestAvg = avg; bestDimension = dim; }
        if (avg < worstAvg) { worstAvg = avg; worstDimension = dim; }
      }

      return { title, avgScoreDelta, bestDimension, worstDimension, count: data.count };
    }).sort((a, b) => b.avgScoreDelta - a.avgScoreDelta);

    for (const entry of dealMemoryEntries) {
      for (const prov of entry.topProvisions) {
        const insight = provisionMap.get(prov.title);
        if (insight && insight.deltas.length > 0) {
          prov.scoreDelta = insight.deltas.reduce((a, b) => a + b, 0) / insight.deltas.length;
        }
      }
    }

    return { topDeals: dealMemoryEntries, provisionInsights };
  } catch (err) {
    logger.warn({ err }, "Failed to build deal memory — proceeding without it");
    return { topDeals: [], provisionInsights: [] };
  }
}

async function recordProvisionOutcomes(
  dealId: string,
  terms: DealTerms,
  scores: DealScores,
  parentScores: DealScores | null,
  architecture: string,
  isBest: boolean,
  stakeholderEvals: Record<string, StakeholderVerdict>,
): Promise<void> {
  try {
    const provisions = terms.innovativeProvisions ?? [];
    if (provisions.length === 0) return;

    const parentComposite = parentScores?.composite ?? 0;
    const currentComposite = scores.composite ?? 0;
    const scoreDelta = currentComposite - parentComposite;

    const dimensionDeltas: Record<string, number> = {};
    const dims = ["feasibility", "coherence", "evidenceGrounding", "domesticSellability", "regionalStability", "implementability", "durability"] as const;
    for (const dim of dims) {
      dimensionDeltas[dim] = (scores[dim] ?? 0) - (parentScores?.[dim] ?? 0);
    }

    const stakeholderReactions: Record<string, string> = {};
    for (const [id, v] of Object.entries(stakeholderEvals)) {
      stakeholderReactions[id] = v.verdict;
    }

    for (const provision of provisions) {
      const category = categorizeProvision(provision.title, provision.description);
      await db.insert(provisionOutcomesTable).values({
        id: randomUUID(),
        dealId,
        provisionTitle: provision.title,
        provisionDescription: provision.description,
        category,
        compositeScore: currentComposite,
        parentCompositeScore: parentComposite,
        scoreDelta,
        dimensionDeltas,
        stakeholderReactions,
        architecture,
        appearedInTopDeal: isBest,
      });
    }

    logger.info({ dealId, provisionCount: provisions.length }, "Recorded provision outcomes");
  } catch (err) {
    logger.warn({ err, dealId }, "Failed to record provision outcomes");
  }
}

function categorizeProvision(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("economic") || text.includes("fund") || text.includes("trade") || text.includes("investment")) return "economic-integration";
  if (text.includes("water") || text.includes("climate") || text.includes("environment") || text.includes("energy")) return "environmental-cooperation";
  if (text.includes("technology") || text.includes("tech") || text.includes("cyber") || text.includes("digital")) return "technology-sharing";
  if (text.includes("cultural") || text.includes("education") || text.includes("university") || text.includes("exchange")) return "cultural-exchange";
  if (text.includes("verification") || text.includes("monitor") || text.includes("inspect") || text.includes("iaea")) return "verification-innovation";
  if (text.includes("maritime") || text.includes("hormuz") || text.includes("shipping") || text.includes("naval")) return "maritime-security";
  if (text.includes("humanitarian") || text.includes("refugee") || text.includes("medical") || text.includes("food")) return "humanitarian";
  if (text.includes("security") || text.includes("military") || text.includes("defense") || text.includes("arms")) return "security-arrangement";
  return "general";
}

async function updateParetoFrontier(): Promise<void> {
  const allDeals = await db.select().from(dealsTable);

  if (allDeals.length === 0) return;

  const paretoIds = new Set<string>();

  for (const a of allDeals) {
    if (!a.scores) continue;
    let dominated = false;
    for (const b of allDeals) {
      if (a.id === b.id || !b.scores) continue;
      if (isDominatedOnAllDimensions(a.scores as DealScores, b.scores as DealScores)) {
        dominated = true;
        break;
      }
    }
    if (!dominated) {
      paretoIds.add(a.id);
    }
  }

  for (const deal of allDeals) {
    const shouldBePareto = paretoIds.has(deal.id);
    if (deal.isPareto !== shouldBePareto) {
      await db.update(dealsTable)
        .set({ isPareto: shouldBePareto })
        .where(eq(dealsTable.id, deal.id));
    }
  }
}

async function getStallCount(architecture: string, parentNodeId: string | null): Promise<number> {
  const nodes = await db.select()
    .from(solutionTreeTable)
    .where(
      parentNodeId
        ? eq(solutionTreeTable.parentNodeId, parentNodeId)
        : isNull(solutionTreeTable.parentNodeId)
    );
  return nodes.filter(n => n.architecture === architecture && n.isStalled).length;
}

async function getCurrentPipelineConfig(): Promise<{ id: string; overrides: Record<string, string>; generation: number } | null> {
  try {
    const [current] = await db.select()
      .from(pipelineEvolutionTable)
      .where(eq(pipelineEvolutionTable.isCurrent, true))
      .limit(1);
    if (!current) return null;
    return {
      id: current.id,
      overrides: current.promptOverrides as Record<string, string>,
      generation: current.generation,
    };
  } catch {
    return null;
  }
}

const PIPELINE_EVOLUTION_MIN_DEALS = 2;
const PIPELINE_SCORE_IMPROVEMENT_THRESHOLD = 0.01;

async function evolvePipeline(
  metaResult: MetaEvaluatorResult,
  currentConfigId: string | null,
  currentGeneration: number,
  compositeScore: number,
): Promise<Record<string, string>> {
  const improvements = metaResult.promptImprovements;
  if (!improvements || improvements.length === 0) {
    logger.info("No pipeline improvements suggested by meta-evaluator");
    return {};
  }

  let currentOverrides: Record<string, string> = {};
  let parentAvgScore = 0;
  if (currentConfigId) {
    const [cfg] = await db.select()
      .from(pipelineEvolutionTable)
      .where(eq(pipelineEvolutionTable.id, currentConfigId))
      .limit(1);
    if (cfg) {
      currentOverrides = cfg.promptOverrides as Record<string, string>;
      parentAvgScore = cfg.avgCompositeScore ?? 0;

      if (cfg.dealCount < PIPELINE_EVOLUTION_MIN_DEALS) {
        logger.info({
          configId: currentConfigId,
          dealCount: cfg.dealCount,
          minRequired: PIPELINE_EVOLUTION_MIN_DEALS,
        }, "Pipeline evolution deferred — current config needs more data points before evolving");
        return currentOverrides;
      }

      if (compositeScore < parentAvgScore + PIPELINE_SCORE_IMPROVEMENT_THRESHOLD) {
        logger.info({
          compositeScore: compositeScore.toFixed(3),
          parentAvg: parentAvgScore.toFixed(3),
          threshold: PIPELINE_SCORE_IMPROVEMENT_THRESHOLD,
        }, "Pipeline evolution skipped — score did not improve over baseline");
        return currentOverrides;
      }
    }
  }

  const newOverrides: Record<string, string> = { ...currentOverrides };
  const validStages = ["brainstorm_system", "brainstorm_user", "proposal_system", "proposal_user", "framing_system", "negotiator_system"];

  for (const imp of improvements) {
    if (validStages.includes(imp.stage) && imp.suggestedChange && imp.suggestedChange.length > 10) {
      const existing = newOverrides[imp.stage] || "";
      newOverrides[imp.stage] = existing
        ? `${existing}\n\nADDITIONAL INSTRUCTION (gen ${currentGeneration + 1}): ${imp.suggestedChange}`
        : imp.suggestedChange;
    }
  }

  if (JSON.stringify(newOverrides) === JSON.stringify(currentOverrides)) {
    return currentOverrides;
  }

  const description = improvements
    .map(imp => `[${imp.stage}] ${imp.currentWeakness} → ${imp.expectedImpact}`)
    .join("; ");

  const newConfigId = randomUUID();
  await db.transaction(async (tx) => {
    if (currentConfigId) {
      await tx.update(pipelineEvolutionTable)
        .set({ isCurrent: false })
        .where(eq(pipelineEvolutionTable.isCurrent, true));
    }

    await tx.insert(pipelineEvolutionTable).values({
      id: newConfigId,
      parentConfigId: currentConfigId,
      generation: currentGeneration + 1,
      promptOverrides: newOverrides,
      parameterOverrides: {},
      description,
      avgCompositeScore: 0,
      dealCount: 0,
      isCurrent: true,
    });
  });

  logger.info({
    configId: newConfigId,
    generation: currentGeneration + 1,
    overrideKeys: Object.keys(newOverrides),
    parentScore: parentAvgScore.toFixed(3),
    triggeringScore: compositeScore.toFixed(3),
    description: description.slice(0, 200),
  }, "Pipeline evolved — score improvement triggered new prompt overrides");

  return newOverrides;
}

async function updatePipelineStats(configId: string, compositeScore: number): Promise<void> {
  try {
    const [cfg] = await db.select()
      .from(pipelineEvolutionTable)
      .where(eq(pipelineEvolutionTable.id, configId))
      .limit(1);
    if (!cfg) return;

    const currentAvg = cfg.avgCompositeScore ?? compositeScore;
    const currentCount = cfg.dealCount;
    const newAvg = (currentAvg * currentCount + compositeScore) / (currentCount + 1);

    await db.update(pipelineEvolutionTable)
      .set({
        avgCompositeScore: newAvg,
        dealCount: currentCount + 1,
      })
      .where(eq(pipelineEvolutionTable.id, configId));
  } catch (err) {
    logger.warn({ err }, "Failed to update pipeline stats");
  }
}

function selectArchitecture(
  currentArchIdx: number,
  stallCount: number,
  totalDeals: number,
): typeof DEAL_ARCHITECTURES[number] {
  if (stallCount >= STALL_THRESHOLD || (totalDeals > 0 && Math.random() < RADICAL_EXPLORATION_PROBABILITY)) {
    const radicalIdx = Math.floor(Math.random() * RADICAL_ARCHITECTURES.length);
    logger.info({ radicalIdx, stallCount, totalDeals }, "Selecting radical architecture");
    return RADICAL_ARCHITECTURES[radicalIdx] ?? "radical-restructure";
  }

  const nextIdx = (currentArchIdx + 1 + Math.floor(Math.random() * (STANDARD_ARCHITECTURES.length - 1))) % STANDARD_ARCHITECTURES.length;
  const arch = STANDARD_ARCHITECTURES[nextIdx] ?? "balanced";
  logger.info({ currentArchIdx, nextIdx, arch, totalDeals }, "Selecting standard architecture (cycling, not repeating current)");
  return arch;
}

export async function runDealCycleNow(): Promise<string> {
  if (dealCycleRunning) {
    const [recent] = await db.select({ cycleId: dealsTable.cycleId })
      .from(dealsTable)
      .orderBy(desc(dealsTable.createdAt))
      .limit(1);
    return recent?.cycleId ?? randomUUID();
  }

  dealCycleRunning = true;
  const cycleId = randomUUID();

  await runDealCycleAsync(cycleId);

  return cycleId;
}

async function runDealCycleAsync(cycleId: string): Promise<void> {
  try {
    logger.info({ cycleId }, "Starting enhanced deal autoresearch cycle (Task B)");
    emitCycleLog({ cycleId, level: "stage", stage: "deal_engine", message: "Starting the deal autoresearch cycle. This orchestrates the full deal optimization process: gathering evidence, selecting a deal architecture strategy, loading deal memory from previous cycles, running the multi-stage deal evaluation pipeline, and comparing the result against the current best deal." });

    emitCycleLog({ cycleId, level: "info", stage: "deal_engine", message: "Refreshing evidence from news feeds to ensure the deal engine has the latest information..." });
    await ingestAllSources().catch((err: unknown) => {
      logger.warn({ err, cycleId }, "Evidence ingestion failed — continuing with existing evidence");
      emitCycleLog({ cycleId, level: "warn", stage: "deal_engine", message: `Evidence refresh failed (continuing with cached evidence): ${String(err)}` });
    });

    const modelConfig = await getModelConfig();
    emitCycleLog({ cycleId, level: "info", stage: "deal_engine", message: "Building the evidence context — compiling all available news, intelligence, and diplomatic signals into a structured summary that the deal engine can reason about." });
    const { context: evidenceSummary, strategicTokens } = await getEvidenceSummary(modelConfig);
    logger.info({ cycleId, strategicTokens, evidenceContextLength: evidenceSummary.length }, "Generated two-layer evidence context (strategic + tactical)");
    emitCycleLog({ cycleId, level: "info", stage: "deal_engine", message: `Evidence context compiled: ${(evidenceSummary.length / 1000).toFixed(1)}K characters of strategic and tactical analysis, consuming ${strategicTokens.toLocaleString()} tokens for evidence summarization.`, metadata: { evidenceLength: evidenceSummary.length, strategicTokens } });
    const previousDiagnosis = await getCurrentBestDiagnosis();

    const [currentBest] = await db.select()
      .from(dealsTable)
      .where(eq(dealsTable.isCurrent, true))
      .limit(1);

    const totalDeals = await db.select({ count: sql<number>`count(*)` }).from(dealsTable);
    const dealCount = totalDeals[0]?.count ?? 0;

    const currentArchIdx = currentBest
      ? DEAL_ARCHITECTURES.indexOf(currentBest.architecture as typeof DEAL_ARCHITECTURES[number])
      : 0;

    const [currentBestNode] = currentBest
      ? await db.select({ id: solutionTreeTable.id, depth: solutionTreeTable.depth })
          .from(solutionTreeTable)
          .where(eq(solutionTreeTable.dealId, currentBest.id))
          .orderBy(desc(solutionTreeTable.createdAt))
          .limit(1)
      : [undefined];

    const stallCount = await getStallCount(
      DEAL_ARCHITECTURES[currentArchIdx % DEAL_ARCHITECTURES.length] ?? "balanced",
      currentBestNode?.id ?? null,
    );

    const chosenArch = selectArchitecture(currentArchIdx, stallCount, dealCount);

    if (stallCount >= STALL_THRESHOLD) {
      logger.info({ cycleId, chosenArch, stallCount }, "Branching to new architecture due to stall");
      emitCycleLog({ cycleId, level: "info", stage: "deal_engine", message: `Architecture stall detected (${stallCount} consecutive cycles without improvement). Switching to a radical architecture "${chosenArch}" to explore fundamentally different deal structures and break out of a local optimum.`, metadata: { stallCount, chosenArch } });
    } else {
      const archDescriptions: Record<string, string> = {
        balanced: "weighing all dimensions equally",
        "nuclear-first": "prioritizing nuclear non-proliferation",
        "hormuz-first": "prioritizing Strait of Hormuz security",
        "humanitarian-first": "prioritizing humanitarian concerns",
        "radical-restructure": "radically restructuring the regional framework",
        "asymmetric-grand-bargain": "exploring asymmetric grand bargains",
        "incremental-confidence": "building trust through small steps",
        freeform: "unconstrained creative exploration",
      };
      emitCycleLog({ cycleId, level: "info", stage: "deal_engine", message: `Selected deal architecture: "${chosenArch}" — ${archDescriptions[chosenArch] ?? chosenArch}. ${dealCount > 0 ? `This is deal attempt #${dealCount + 1}.` : "This is the first deal generation."} ${currentBest ? `Current best deal scores ${((currentBest.scores as DealScores).composite * 100).toFixed(1)}% composite.` : "No previous deals to compare against."}`, metadata: { chosenArch, dealCount, currentBestComposite: currentBest ? (currentBest.scores as DealScores).composite : null } });
    }

    const pipelineConfig = await getCurrentPipelineConfig();
    const pipelineOverrides = pipelineConfig?.overrides ?? {};

    emitCycleLog({ cycleId, level: "info", stage: "deal_engine", message: "Loading deal memory — the system remembers what worked and what didn't in previous deals. Top-performing deals, successful provisions, and failed approaches all inform the next proposal." });
    const dealMemory = await buildDealMemory();

    logger.info({
      cycleId,
      chosenArch,
      pipelineGeneration: pipelineConfig?.generation ?? 0,
      overrideKeys: Object.keys(pipelineOverrides),
      dealMemoryDeals: dealMemory.topDeals.length,
      provisionInsights: dealMemory.provisionInsights.length,
    }, "Using pipeline configuration with deal memory");
    emitCycleLog({ cycleId, level: "info", stage: "deal_engine", message: `Deal memory loaded: ${dealMemory.topDeals.length} previous top deals and ${dealMemory.provisionInsights.length} provision performance insights available. Pipeline generation: ${pipelineConfig?.generation ?? 0}${Object.keys(pipelineOverrides).length > 0 ? ` with ${Object.keys(pipelineOverrides).length} evolved prompt overrides` : ""}.`, metadata: { topDeals: dealMemory.topDeals.length, provisionInsights: dealMemory.provisionInsights.length, pipelineGeneration: pipelineConfig?.generation ?? 0 } });

    const evaluated = await runFullEvaluation(evidenceSummary, previousDiagnosis, chosenArch, modelConfig, pipelineOverrides, setDealSubStage, dealMemory, cycleId);

    const dealId = randomUUID();
    const newComposite = evaluated.scores.composite ?? 0;
    const prevComposite = currentBest?.scores ? ((currentBest.scores as DealScores).composite ?? 0) : 0;
    const isBetterThanCurrent = !currentBest?.scores || (newComposite > prevComposite);

    if (isBetterThanCurrent) {
      emitCycleLog({ cycleId, level: "info", stage: "deal_engine", message: `New champion deal! This deal scored ${(newComposite * 100).toFixed(1)}% composite${currentBest ? `, beating the previous best of ${(prevComposite * 100).toFixed(1)}% (+${((newComposite - prevComposite) * 100).toFixed(1)} percentage points improvement)` : " — this is the first deal generated"}. The new deal is now the current champion displayed on the dashboard.`, metadata: { newComposite, prevComposite, improvement: newComposite - prevComposite, architecture: chosenArch } });
    } else {
      emitCycleLog({ cycleId, level: "info", stage: "deal_engine", message: `This deal scored ${(newComposite * 100).toFixed(1)}% composite, which did not beat the current best of ${(prevComposite * 100).toFixed(1)}%. The current champion deal remains unchanged. The system will try a different approach next cycle.`, metadata: { newComposite, prevComposite, architecture: chosenArch } });
    }

    await db.transaction(async (tx) => {
      if (isBetterThanCurrent) {
        await tx.update(dealsTable)
          .set({ isCurrent: false })
          .where(eq(dealsTable.isCurrent, true));
      }

      await tx.insert(dealsTable).values({
        id: dealId,
        cycleId,
        parentId: currentBest?.id ?? null,
        architecture: chosenArch,
        terms: evaluated.terms,
        scores: evaluated.scores,
        stakeholderEvaluations: evaluated.stakeholderEvaluations,
        domesticEvaluations: evaluated.domesticEvaluations,
        domesticFramingStrategies: evaluated.domesticFramingStrategies,
        brainstormInsights: evaluated.brainstormInsights,
        redTeamResults: evaluated.redTeamResults,
        negotiatorResult: evaluated.negotiatorResult ?? undefined,
        metaEvaluatorResult: evaluated.metaEvaluatorResult ?? undefined,
        pipelineConfig: evaluated.pipelineConfig,
        diagnosis: evaluated.diagnosis,
        evidenceSummary,
        isPareto: false,
        isCurrent: isBetterThanCurrent,
        generatedBy: "ai",
        tokensConsumed: evaluated.tokensConsumed,
      });
    });

    const compositeScore = evaluated.scores.composite ?? 0;
    const isStalled = compositeScore < 0.35;

    const treeNodeId = randomUUID();

    await db.insert(solutionTreeTable).values({
      id: treeNodeId,
      dealId,
      parentNodeId: currentBestNode?.id ?? null,
      cycleId,
      branchLabel: `${chosenArch} attempt (gen ${pipelineConfig?.generation ?? 0})`,
      architecture: chosenArch,
      depth: currentBestNode ? currentBestNode.depth + 1 : 0,
      isStalled,
      stalledReason: isStalled ? evaluated.diagnosis : null,
      isBestInBranch: isBetterThanCurrent,
      compositeScore: compositeScore.toFixed(3),
    });

    await updateParetoFrontier();

    const parentScores = currentBest?.scores ? (currentBest.scores as DealScores) : null;
    await recordProvisionOutcomes(
      dealId,
      evaluated.terms,
      evaluated.scores,
      parentScores,
      chosenArch,
      isBetterThanCurrent,
      evaluated.stakeholderEvaluations,
    );

    if (pipelineConfig?.id) {
      await updatePipelineStats(pipelineConfig.id, compositeScore);
    }

    if (evaluated.metaEvaluatorResult) {
      const newOverrides = await evolvePipeline(
        evaluated.metaEvaluatorResult,
        pipelineConfig?.id ?? null,
        pipelineConfig?.generation ?? 0,
        newComposite,
      );

      if (Object.keys(newOverrides).length > 0) {
        logger.info({
          cycleId,
          newGeneration: (pipelineConfig?.generation ?? 0) + 1,
          overrideKeys: Object.keys(newOverrides),
        }, "Pipeline will use evolved prompts in next cycle");
        emitCycleLog({ cycleId, level: "info", stage: "deal_engine", message: `Pipeline evolution: the meta-evaluator's suggestions triggered prompt improvements for generation ${(pipelineConfig?.generation ?? 0) + 1}. The next deal cycle will use refined prompts targeting: ${Object.keys(newOverrides).join(", ")}.`, metadata: { newGeneration: (pipelineConfig?.generation ?? 0) + 1, overrideKeys: Object.keys(newOverrides) } });
      }
    }

    const dealHeadline = isBetterThanCurrent
      ? `New best deal: ${(compositeScore * 100).toFixed(0)}% composite (${chosenArch}, +${((compositeScore - prevComposite) * 100).toFixed(0)}pp)`
      : `Deal cycle: ${(compositeScore * 100).toFixed(0)}% composite (${chosenArch}, did not beat current ${(prevComposite * 100).toFixed(0)}%)`;

    const scoreDelta: Record<string, number> = {};
    for (const [k, v] of Object.entries(evaluated.scores)) {
      if (typeof v === "number") scoreDelta[k] = v;
    }

    const dealNotes = [
      `Architecture: ${chosenArch}`,
      `Composite score: ${(compositeScore * 100).toFixed(1)}%`,
      isBetterThanCurrent ? `Improved from ${(prevComposite * 100).toFixed(1)}% → ${(compositeScore * 100).toFixed(1)}%` : `Current best remains at ${(prevComposite * 100).toFixed(1)}%`,
      evaluated.diagnosis ? `Diagnosis: ${evaluated.diagnosis.slice(0, 300)}` : null,
    ].filter(Boolean).join(". ");

    try {
      await db.insert(changelogEntriesTable).values({
        id: randomUUID(),
        cycleId,
        headline: dealHeadline,
        scoreDelta,
        keyEvidence: [],
        notes: dealNotes,
      });
    } catch (changelogErr) {
      logger.warn({ err: changelogErr, cycleId }, "Failed to insert deal changelog entry");
    }

    logger.info({
      cycleId,
      dealId,
      composite: compositeScore.toFixed(3),
      isCurrent: isBetterThanCurrent,
      architecture: chosenArch,
      pipelineGeneration: pipelineConfig?.generation ?? 0,
      innovativeProvisions: evaluated.terms.innovativeProvisions?.length ?? 0,
      framingStrategies: Object.keys(evaluated.domesticFramingStrategies).length,
      dealMemoryUsed: dealMemory.topDeals.length > 0,
    }, "Enhanced deal cycle complete");
    emitCycleLog({ cycleId, level: "stage", stage: "deal_engine", message: `Deal autoresearch cycle complete. ${isBetterThanCurrent ? `New champion deal at ${(compositeScore * 100).toFixed(1)}% composite using "${chosenArch}" architecture.` : `Deal scored ${(compositeScore * 100).toFixed(1)}% composite but didn't beat the current best.`} ${evaluated.terms.innovativeProvisions?.length ?? 0} innovative provisions, ${Object.keys(evaluated.domesticFramingStrategies).length} framing strategies, ${evaluated.tokensConsumed.toLocaleString()} total tokens consumed.`, metadata: { dealId, composite: compositeScore, isCurrent: isBetterThanCurrent, architecture: chosenArch, tokensConsumed: evaluated.tokensConsumed } });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errName = err instanceof Error ? err.constructor.name : "unknown";
    logger.error({ err, cycleId, errorType: errName }, `Deal cycle failed: ${errMsg}`);
    emitCycleLog({ cycleId, level: "error", stage: "deal_engine", message: `Deal autoresearch cycle failed: ${errMsg}. ${errName === "TimeoutError" || errMsg.includes("timed out") ? "The pipeline took too long — this is usually caused by slow AI model responses." : "The system will retry on the next scheduled cycle."} Any forecasting results from the parent cycle are preserved.`, metadata: { errorType: errName } });
    throw err;
  } finally {
    dealCycleRunning = false;
  }
}
