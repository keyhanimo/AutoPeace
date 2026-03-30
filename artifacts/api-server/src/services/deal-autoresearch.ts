import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { dealsTable, solutionTreeTable, adminConfigTable, pipelineEvolutionTable } from "@workspace/db/schema";
import { desc, eq, isNull, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  runFullEvaluation,
  isDominatedOnAllDimensions,
  DEAL_ARCHITECTURES,
  type DealScores,
  type MetaEvaluatorResult,
} from "./deal-engine";
import { getModelConfig } from "./llm-router";
import { ingestAllSources } from "./evidence-ingestion";

let dealCycleRunning = false;

export function isDealCycleRunning() {
  return dealCycleRunning;
}

const STALL_THRESHOLD = 3;
const PIPELINE_EVOLUTION_WINDOW = 3;

async function getEvidenceSummary(): Promise<string> {
  try {
    const { evidenceItemsTable } = await import("@workspace/db/schema");
    const items = await db.select({
      title: evidenceItemsTable.title,
      text: evidenceItemsTable.text,
    })
      .from(evidenceItemsTable)
      .orderBy(desc(evidenceItemsTable.publishedAt))
      .limit(30);
    return items.map(i => `${i.title}: ${i.text?.slice(0, 150)}`).join("\n");
  } catch {
    return "Recent evidence: Iran-US tensions remain elevated. Diplomatic back-channels active. Nuclear enrichment ongoing.";
  }
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

  if (currentConfigId) {
    await db.update(pipelineEvolutionTable)
      .set({ isCurrent: false })
      .where(eq(pipelineEvolutionTable.isCurrent, true));
  }

  const newConfigId = randomUUID();
  await db.insert(pipelineEvolutionTable).values({
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

  runDealCycleAsync(cycleId).catch(err => {
    logger.error({ err, cycleId }, "Deal autoresearch cycle failed");
    dealCycleRunning = false;
  });

  return cycleId;
}

async function runDealCycleAsync(cycleId: string): Promise<void> {
  try {
    logger.info({ cycleId }, "Starting enhanced deal autoresearch cycle (Task B)");

    await ingestAllSources().catch(() => 0);

    const evidenceSummary = await getEvidenceSummary();
    const previousDiagnosis = await getCurrentBestDiagnosis();

    const [currentBest] = await db.select()
      .from(dealsTable)
      .where(eq(dealsTable.isCurrent, true))
      .limit(1);

    const currentArchIdx = currentBest
      ? DEAL_ARCHITECTURES.indexOf(currentBest.architecture as typeof DEAL_ARCHITECTURES[number])
      : 0;

    let chosenArch = DEAL_ARCHITECTURES[currentArchIdx % DEAL_ARCHITECTURES.length] ?? "balanced";

    const [currentBestNode] = currentBest
      ? await db.select({ id: solutionTreeTable.id, depth: solutionTreeTable.depth })
          .from(solutionTreeTable)
          .where(eq(solutionTreeTable.dealId, currentBest.id))
          .orderBy(desc(solutionTreeTable.createdAt))
          .limit(1)
      : [undefined];

    const stallCount = await getStallCount(chosenArch, currentBestNode?.id ?? null);

    if (stallCount >= STALL_THRESHOLD) {
      chosenArch = DEAL_ARCHITECTURES[(currentArchIdx + 1) % DEAL_ARCHITECTURES.length] ?? "balanced";
      logger.info({ cycleId, chosenArch }, "Branching to new architecture due to stall");
    }

    const pipelineConfig = await getCurrentPipelineConfig();
    const pipelineOverrides = pipelineConfig?.overrides ?? {};

    logger.info({
      cycleId,
      pipelineGeneration: pipelineConfig?.generation ?? 0,
      overrideKeys: Object.keys(pipelineOverrides),
    }, "Using pipeline configuration");

    const modelConfig = await getModelConfig();
    const evaluated = await runFullEvaluation(evidenceSummary, previousDiagnosis, chosenArch, modelConfig, pipelineOverrides);

    const dealId = randomUUID();
    const isBetterThanCurrent = !currentBest?.scores ||
      ((evaluated.scores.composite ?? 0) > ((currentBest.scores as DealScores).composite ?? 0));

    if (isBetterThanCurrent) {
      await db.update(dealsTable)
        .set({ isCurrent: false })
        .where(eq(dealsTable.isCurrent, true));
    }

    await db.insert(dealsTable).values({
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
      isPareto: false,
      isCurrent: isBetterThanCurrent,
      generatedBy: "ai",
      tokensConsumed: evaluated.tokensConsumed,
      costUsd: evaluated.costUsd,
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

    if (pipelineConfig?.id) {
      await updatePipelineStats(pipelineConfig.id, compositeScore);
    }

    if (evaluated.metaEvaluatorResult) {
      const newOverrides = await evolvePipeline(
        evaluated.metaEvaluatorResult,
        pipelineConfig?.id ?? null,
        pipelineConfig?.generation ?? 0,
        compositeScore,
      );

      if (Object.keys(newOverrides).length > 0) {
        logger.info({
          cycleId,
          newGeneration: (pipelineConfig?.generation ?? 0) + 1,
          overrideKeys: Object.keys(newOverrides),
        }, "Pipeline will use evolved prompts in next cycle");
      }
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
    }, "Enhanced deal cycle complete");

  } catch (err) {
    throw err;
  } finally {
    dealCycleRunning = false;
  }
}
