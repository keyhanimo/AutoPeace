import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { dealsTable, solutionTreeTable, adminConfigTable } from "@workspace/db/schema";
import { desc, eq, isNull } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  runFullEvaluation,
  isDominatedOnAllDimensions,
  DEAL_ARCHITECTURES,
  type DealScores,
  type ModelConfig,
} from "./deal-engine";
import { ingestAllSources } from "./evidence-ingestion";

let dealCycleRunning = false;

export function isDealCycleRunning() {
  return dealCycleRunning;
}

const STALL_THRESHOLD = 3;

async function getModelConfig(): Promise<ModelConfig> {
  try {
    const rows = await db.select().from(adminConfigTable);
    const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]));
    const anthropicModel = cfg["anthropicModel"] ?? "claude-sonnet-4-5";
    const openaiModel = cfg["openaiModel"] ?? "gpt-4o";
    const geminiModel = cfg["geminiModel"] ?? "gemini-2.5-flash";
    const base: ModelConfig = {
      anthropicModel,
      openaiModel,
      geminiModel,
      generationProvider: (cfg["generationProvider"] ?? "anthropic") as "anthropic" | "openai" | "gemini",
      generationModel: cfg["generationModel"] ?? anthropicModel,
      evaluationProvider: (cfg["evaluationProvider"] ?? "openai") as "anthropic" | "openai" | "gemini",
      evaluationModel: cfg["evaluationModel"] ?? openaiModel,
      adversarialProvider: (cfg["adversarialProvider"] ?? "gemini") as "anthropic" | "openai" | "gemini",
      adversarialModel: cfg["adversarialModel"] ?? geminiModel,
      judgePanelAnthropicModel: cfg["judgePanelAnthropicModel"] || undefined,
      judgePanelOpenaiModel: cfg["judgePanelOpenaiModel"] || undefined,
      judgePanelGeminiModel: cfg["judgePanelGeminiModel"] || undefined,
    };
    for (let s = 1; s <= 8; s++) {
      const pk = `stage${s}Provider` as keyof ModelConfig;
      const mk = `stage${s}Model` as keyof ModelConfig;
      if (cfg[`stage${s}Provider`]) (base as Record<string, unknown>)[pk] = cfg[`stage${s}Provider`];
      if (cfg[`stage${s}Model`]) (base as Record<string, unknown>)[mk] = cfg[`stage${s}Model`];
    }
    return base;
  } catch {
    return {
      anthropicModel: "claude-sonnet-4-5",
      openaiModel: "gpt-4o",
      geminiModel: "gemini-2.5-flash",
      generationProvider: "anthropic",
      generationModel: "claude-sonnet-4-5",
      evaluationProvider: "openai",
      evaluationModel: "gpt-4o",
      adversarialProvider: "gemini",
      adversarialModel: "gemini-2.5-flash",
    };
  }
}

async function getEvidenceSummary(): Promise<string> {
  try {
    const { evidenceItemsTable } = await import("@workspace/db/schema");
    const items = await db.select({
      title: evidenceItemsTable.title,
      text: evidenceItemsTable.text,
    })
      .from(evidenceItemsTable)
      .orderBy(desc(evidenceItemsTable.publishedAt))
      .limit(20);
    return items.map(i => `${i.title}: ${i.text?.slice(0, 100)}`).join("\n");
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
    logger.info({ cycleId }, "Starting deal autoresearch cycle (Task B)");

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

    const modelConfig = await getModelConfig();
    const evaluated = await runFullEvaluation(evidenceSummary, previousDiagnosis, chosenArch, modelConfig);

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
      redTeamResults: evaluated.redTeamResults,
      negotiatorResult: evaluated.negotiatorResult ?? undefined,
      metaEvaluatorResult: evaluated.metaEvaluatorResult ?? undefined,
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
      branchLabel: `${chosenArch} attempt`,
      architecture: chosenArch,
      depth: currentBestNode ? currentBestNode.depth + 1 : 0,
      isStalled,
      stalledReason: isStalled ? evaluated.diagnosis : null,
      isBestInBranch: isBetterThanCurrent,
      compositeScore: compositeScore.toFixed(3),
    });

    await updateParetoFrontier();

    logger.info({
      cycleId,
      dealId,
      composite: compositeScore.toFixed(3),
      isCurrent: isBetterThanCurrent,
      architecture: chosenArch,
    }, "Deal cycle complete");

  } catch (err) {
    throw err;
  } finally {
    dealCycleRunning = false;
  }
}
