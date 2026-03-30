import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  cyclesTable,
  forecastsTable,
  experimentsTable,
  changelogEntriesTable,
  adminConfigTable,
  evidenceItemsTable,
} from "@workspace/db/schema";
import { desc, eq, sql, isNull } from "drizzle-orm";
import { logger } from "../lib/logger";
import { computeAndStoreWhatIfScenarios } from "./what-if-scenarios";
import { generateForecasts, getRecentForecastsForBacktest, type GeneratedForecast } from "./forecasting";
import { ingestAllSources } from "./evidence-ingestion";
import { extractProposalsFromEvidence } from "./proposal-extractor";
import { runDealCycleNow, isDealCycleRunning } from "./deal-autoresearch";
import {
  parseLLMJson,
  computeBrierScore,
  computeLogScore,
  normalizeProbabilities,
  type ForecastProbabilities,
} from "./scoring";
let _openai: import("openai").OpenAI | null = null;
async function getOpenAI(): Promise<import("openai").OpenAI> {
  if (!_openai) {
    const mod = await import("@workspace/integrations-openai-ai-server");
    _openai = mod.openai;
  }
  return _openai;
}

let _gemini: import("@google/genai").GoogleGenAI | null = null;
async function getGemini(): Promise<import("@google/genai").GoogleGenAI> {
  if (!_gemini) {
    const mod = await import("@workspace/integrations-gemini-ai");
    _gemini = mod.ai;
  }
  return _gemini;
}

let runningCycleId: string | null = null;

export function isRunning() {
  return runningCycleId !== null;
}

async function getConfigValue(key: string, defaultValue: string): Promise<string> {
  const rows = await db.select().from(adminConfigTable).where(eq(adminConfigTable.key, key));
  return rows[0]?.value ?? defaultValue;
}

export async function runCycleNow(): Promise<string> {
  if (runningCycleId) return runningCycleId;

  const cycleId = randomUUID();
  runningCycleId = cycleId;

  await db.insert(cyclesTable).values({
    id: cycleId,
    status: "running",
  });

  runCycleAsync(cycleId).catch(err => {
    logger.error({ err, cycleId }, "Autoresearch cycle failed");
  });

  return cycleId;
}

async function runCycleAsync(cycleId: string): Promise<void> {
  let totalTokens = 0;
  let totalCost = 0;
  let experimentsRun = 0;
  let experimentsRetained = 0;

  try {
    logger.info({ cycleId }, "Starting autoresearch cycle");

    const isPaused = await getConfigValue("isPaused", "false");
    if (isPaused === "true") {
      logger.info({ cycleId }, "Cycle paused by admin config");
      await db.update(cyclesTable).set({ status: "completed", completedAt: new Date() }).where(eq(cyclesTable.id, cycleId));
      runningCycleId = null;
      return;
    }

    const budgetCapUsd = parseFloat(await getConfigValue("budgetCapUsd", "5.0"));
    const [cycleAgg] = await db.select({ totalCostUsd: sql<number>`coalesce(sum(${cyclesTable.costUsd}),0)` }).from(cyclesTable);
    const spentSoFar = Number(cycleAgg?.totalCostUsd ?? 0);
    if (spentSoFar >= budgetCapUsd) {
      logger.warn({ cycleId, spentSoFar, budgetCapUsd }, "Budget cap reached — cycle skipped");
      await db.update(cyclesTable).set({ status: "completed", completedAt: new Date(), errorMessage: `Budget cap $${budgetCapUsd} reached` }).where(eq(cyclesTable.id, cycleId));
      runningCycleId = null;
      return;
    }

    const ingestedCount = await ingestAllSources();
    logger.info({ cycleId, ingestedCount }, "Evidence ingestion complete");

    try {
      const extractedProposals = await extractProposalsFromEvidence(cycleId);
      logger.info({ cycleId, extractedProposals }, "Proposal extraction from evidence complete");
    } catch (extractErr) {
      logger.warn({ err: extractErr, cycleId }, "Proposal extraction failed (non-critical)");
    }

    const evidencePackVersion = new Date().toISOString().slice(0, 10);
    const baseForecast = await generateForecasts(cycleId, evidencePackVersion);

    await db.update(forecastsTable)
      .set({ isCurrent: false })
      .where(eq(forecastsTable.isCurrent, true));

    for (const f of baseForecast) {
      const forecastId = randomUUID();
      await db.insert(forecastsTable).values({
        id: forecastId,
        cycleId,
        evidencePackVersion,
        timeHorizon: f.timeHorizon,
        probabilities: f.probabilities,
        rationale: f.rationale,
        keyEvidenceItems: f.keyEvidenceItems,
        brierScore: f.brierScore ?? null,
        logScore: f.logScore ?? null,
        calibrationBucket: null,
        isCurrent: true,
      });
    }

    logger.info({ cycleId, forecastCount: baseForecast.length }, "Base forecasts generated");

    const primary90dForecast = baseForecast.find(f => f.timeHorizon === "90d");
    if (primary90dForecast) {
      const primaryForecastRow = await db.select({ id: forecastsTable.id })
        .from(forecastsTable)
        .where(eq(forecastsTable.cycleId, cycleId))
        .orderBy(desc(forecastsTable.createdAt))
        .limit(1);
      const primaryForecastId = primaryForecastRow[0]?.id ?? null;
      await db.update(evidenceItemsTable)
        .set({ influencedCycleId: cycleId, influencedForecastId: primaryForecastId })
        .where(isNull(evidenceItemsTable.influencedCycleId));
      logger.info({ cycleId, primaryForecastId }, "Evidence items linked to cycle");
    }

    const hillClimbResults = await runHillClimbing(cycleId, baseForecast);
    experimentsRun = hillClimbResults.experimentsRun;
    experimentsRetained = hillClimbResults.experimentsRetained;
    totalTokens = hillClimbResults.totalTokens;
    totalCost = hillClimbResults.totalCost;

    if (hillClimbResults.champion && hillClimbResults.experimentsRetained > 0) {
      const championState = JSON.stringify({
        probabilities: hillClimbResults.champion.probabilities,
        rationale: hillClimbResults.champion.rationale,
        cycleId,
        retainedAt: new Date().toISOString(),
      });
      const existing = await db.select().from(adminConfigTable).where(eq(adminConfigTable.key, "championState"));
      if (existing.length > 0) {
        await db.update(adminConfigTable).set({ value: championState, updatedAt: new Date() }).where(eq(adminConfigTable.key, "championState"));
      } else {
        await db.insert(adminConfigTable).values({ key: "championState", value: championState });
      }
      logger.info({ cycleId, experimentsRetained }, "Champion state persisted to admin_config");
    }

    const primaryForecast = hillClimbResults.champion ?? baseForecast.find(f => f.timeHorizon === "90d");
    if (primaryForecast) {
      const headline = generateHeadline(primaryForecast.probabilities);

      await db.insert(changelogEntriesTable).values({
        id: randomUUID(),
        cycleId,
        headline,
        forecastDelta: primaryForecast.probabilities,
        keyEvidence: primaryForecast.keyEvidenceItems.map((title: string) => ({ title })),
        experimentsTried: experimentsRun,
        experimentsRetained,
        notes: primaryForecast.rationale,
      });
    }

    await db.update(cyclesTable).set({
      status: "completed",
      completedAt: new Date(),
      tokensConsumed: totalTokens,
      costUsd: totalCost,
      experimentsRun,
      experimentsRetained,
    }).where(eq(cyclesTable.id, cycleId));

    logger.info({ cycleId, experimentsRun, experimentsRetained }, "Autoresearch cycle completed successfully");

    try {
      await computeAndStoreWhatIfScenarios(cycleId);
      logger.info({ cycleId }, "What-if scenario variants updated");
    } catch (scenarioErr) {
      logger.warn({ err: scenarioErr }, "What-if scenario update failed (non-critical)");
    }

    try {
      if (isDealCycleRunning()) {
        logger.info({ cycleId }, "Deal cycle already running — skipping deal optimization this cycle");
      } else {
        logger.info({ cycleId }, "Starting deal optimization as part of autoresearch cycle");
        const dealCycleId = await runDealCycleNow();
        logger.info({ cycleId, dealCycleId }, "Deal optimization triggered successfully");
      }
    } catch (dealErr) {
      logger.warn({ err: dealErr, cycleId }, "Deal optimization failed (non-critical — forecasts still updated)");
    }
  } catch (err) {
    logger.error({ err, cycleId }, "Autoresearch cycle error");
    await db.update(cyclesTable).set({
      status: "failed",
      completedAt: new Date(),
      errorMessage: String(err),
    }).where(eq(cyclesTable.id, cycleId));
  } finally {
    runningCycleId = null;
  }
}

interface HillClimbResults {
  experimentsRun: number;
  experimentsRetained: number;
  totalTokens: number;
  totalCost: number;
  champion: GeneratedForecast | null;
}

const OUTCOME_KEYS = [
  "continued_conflict",
  "informal_deescalation",
  "limited_ceasefire",
  "humanitarian_mini_deal",
  "sanctions_partial_deal",
  "regional_framework",
  "broad_settlement",
  "major_escalation",
] as const;

const OUTCOME_KEYS_STR = OUTCOME_KEYS.join(", ");

const PROMPT_MUTATIONS: Array<{
  name: string;
  task: "A" | "B" | "both";
  prompt: (probs: string, rationale: string) => string;
}> = [
  {
    name: "red-team-optimistic",
    task: "A",
    prompt: (probs: string, rationale: string) =>
      `You are an optimistic peace analyst challenging a bearish Iran conflict forecast.\n\nCurrent 90-day probabilities:\n${probs}\nRationale: ${rationale}\n\nArgue for a higher probability of peace outcomes using recent diplomatic signals. Return ONLY a JSON code block with adjusted probabilities using exactly these keys: ${OUTCOME_KEYS_STR}.`,
  },
  {
    name: "red-team-pessimistic",
    task: "B",
    prompt: (probs: string, rationale: string) =>
      `You are a hawkish strategic analyst challenging an optimistic Iran conflict forecast.\n\nCurrent 90-day probabilities:\n${probs}\nRationale: ${rationale}\n\nArgue for higher conflict risk using regional threat assessments and historical conflict patterns. Return ONLY a JSON code block with adjusted probabilities using exactly these keys: ${OUTCOME_KEYS_STR}.`,
  },
  {
    name: "red-team-base-rate",
    task: "both",
    prompt: (probs: string, rationale: string) =>
      `You are a superforecaster applying base-rate thinking to an Iran conflict forecast.\n\nCurrent 90-day probabilities:\n${probs}\nRationale: ${rationale}\n\nUsing historical conflict resolution base rates and regression-to-mean adjustments, propose calibrated probability estimates. Return ONLY a JSON code block with adjusted probabilities using exactly these keys: ${OUTCOME_KEYS_STR}.`,
  },
];


async function loadPersistedChampion(): Promise<GeneratedForecast | null> {
  const rows = await db.select().from(adminConfigTable).where(eq(adminConfigTable.key, "championState"));
  const raw = rows[0]?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { probabilities?: ForecastProbabilities; rationale?: string; cycleId?: string };
    if (parsed.probabilities && parsed.rationale) {
      return {
        timeHorizon: "90d",
        probabilities: parsed.probabilities,
        rationale: parsed.rationale,
        keyEvidenceItems: [],
      };
    }
  } catch {
    return null;
  }
  return null;
}

async function runHillClimbing(
  cycleId: string,
  baseForecastSet: GeneratedForecast[]
): Promise<HillClimbResults> {
  const primary = baseForecastSet.find(f => f.timeHorizon === "90d");
  if (!primary) {
    return { experimentsRun: 0, experimentsRetained: 0, totalTokens: 0, totalCost: 0, champion: null };
  }

  const backtestRecords = await getRecentForecastsForBacktest(cycleId);

  const persisted = await loadPersistedChampion();
  const initialChampion = persisted ?? primary;
  let champion: GeneratedForecast = initialChampion;
  let championScore = computeCompositeScore(champion.probabilities, backtestRecords);

  let experimentsRun = 0;
  let experimentsRetained = 0;
  let totalTokens = 0;
  let totalCost = 0;

  for (const mutation of PROMPT_MUTATIONS) {
    try {
      const probsStr = JSON.stringify(champion.probabilities, null, 2);
      const promptText = mutation.prompt(probsStr, champion.rationale);

      const geminiModel = await getConfigValue("geminiModel", "gemini-3.1-pro-preview");
      const ai = await getGemini();
      const geminiResult = await ai.models.generateContent({
        model: geminiModel,
        contents: promptText,
      });
      const mutantText = geminiResult.text ?? "";

      let mutantProbs: ForecastProbabilities = champion.probabilities;
      try {
        const parsed = parseLLMJson(mutantText) as Record<string, unknown>;
        const rawProbs =
          typeof parsed["probabilities"] === "object" && parsed["probabilities"] !== null
            ? (parsed["probabilities"] as Record<string, number>)
            : (parsed as Record<string, number>);
        mutantProbs = normalizeProbabilities(rawProbs);
      } catch {
        logger.warn({ mutation: mutation.name, cycleId }, "Could not parse mutant probabilities — using champion");
      }

      const mutantScore = computeCompositeScore(mutantProbs, backtestRecords);

      const openaiModel = await getConfigValue("openaiModel", "gpt-5.2");
      const openai = await getOpenAI();
      const evalResponse = await openai.chat.completions.create({
        model: openaiModel,
        messages: [
          {
            role: "system",
            content: "You are a Bayesian forecast evaluator. Compare two probability distributions and decide which is better calibrated. Respond ONLY with valid JSON.",
          },
          {
            role: "user",
            content: `Compare these two Iran conflict forecasts and decide which to retain.

Champion composite score (lower Brier is better): ${championScore.brier.toFixed(4)}, log: ${championScore.log.toFixed(4)}
Challenger composite score: ${mutantScore.brier.toFixed(4)}, log: ${mutantScore.log.toFixed(4)}

Champion: ${JSON.stringify(champion.probabilities)}
Challenger (${mutation.name}): ${JSON.stringify(mutantProbs)}
Challenge rationale: ${mutantText.slice(0, 800)}

Respond with JSON: {"recommendation": "retain_challenger" | "retain_champion", "reasoning": "<1 sentence>"}`,
          },
        ],
        max_completion_tokens: 200,
      });

      const evalText = evalResponse.choices[0]?.message?.content ?? "";
      let evalResult: { recommendation?: string; reasoning?: string } = {};
      try {
        evalResult = parseLLMJson(evalText) as typeof evalResult;
      } catch {
        evalResult = {
          recommendation: mutantScore.composite < championScore.composite ? "retain_challenger" : "retain_champion",
          reasoning: `Composite improvement: ${(championScore.composite - mutantScore.composite).toFixed(4)}`,
        };
      }

      const retained = evalResult["recommendation"] === "retain_challenger";
      experimentsRun++;

      const geminiTokens = geminiResult.usageMetadata?.totalTokenCount ?? 600;
      const openaiTokens = evalResponse.usage?.total_tokens ?? 200;
      const geminiCostEst = geminiTokens * 0.00000015;
      const openaiCostEst = openaiTokens * 0.000005;
      const expCost = geminiCostEst + openaiCostEst;
      const expTokens = geminiTokens + openaiTokens;
      totalTokens += expTokens;
      totalCost += expCost;

      const scoresBefore = { ...champion.probabilities };
      const scoresAfter = retained ? { ...mutantProbs } : { ...champion.probabilities };

      if (retained) {
        champion = { ...champion, probabilities: mutantProbs, rationale: `${champion.rationale} [${mutation.name} applied: ${evalResult["reasoning"] ?? "improved calibration"}]` };
        championScore = mutantScore;
        experimentsRetained++;
        logger.info({ mutation: mutation.name, cycleId, mutantScore, championScore }, "Challenger promoted to champion");
      }

      await db.insert(experimentsTable).values({
        id: randomUUID(),
        cycleId,
        task: mutation.task,
        changeDescription: `[${mutation.name}] ${evalResult["reasoning"] ?? "evaluated"}`,
        changeDiff: mutantText.slice(0, 500),
        scoresBefore,
        scoresAfter,
        diagnosis: evalResult["reasoning"] ?? null,
        retained,
        tokensConsumed: expTokens,
        wallClockSeconds: null,
        costUsd: expCost,
        providerCosts: { gemini: geminiCostEst, openai: openaiCostEst },
      });
    } catch (err) {
      logger.warn({ err, mutation: mutation.name, cycleId }, "Mutation experiment failed");
      experimentsRun++;
    }
  }

  return { experimentsRun, experimentsRetained, totalTokens, totalCost, champion };
}

type BacktestRecord = { timeHorizon: string; probs: ForecastProbabilities; resolvedOutcome: string };

function computeCompositeScore(
  probs: ForecastProbabilities,
  backtestRecords: BacktestRecord[]
): { brier: number; log: number; composite: number } {
  if (backtestRecords.length === 0) {
    const fallback = computeBrierScore(probs, "continued_conflict");
    const fallbackLog = computeLogScore(probs, "continued_conflict");
    return { brier: fallback, log: fallbackLog, composite: fallback - fallbackLog * 0.1 };
  }

  const brierScores = backtestRecords.map(r => computeBrierScore(probs, r.resolvedOutcome));
  const logScores = backtestRecords.map(r => computeLogScore(probs, r.resolvedOutcome));

  const avgBrier = brierScores.reduce((a, b) => a + b, 0) / brierScores.length;
  const avgLog = logScores.reduce((a, b) => a + b, 0) / logScores.length;

  return {
    brier: avgBrier,
    log: avgLog,
    composite: avgBrier - avgLog * 0.1,
  };
}

function generateHeadline(probs: Record<string, number>): string {
  const top = Object.entries(probs).sort((a, b) => b[1] - a[1])[0];
  if (!top) return "Forecast updated";
  const pct = Math.round((top[1] ?? 0) * 100);
  const label = top[0].replace(/_/g, " ");
  return `${pct}% probability of ${label} at 90-day horizon`;
}

export async function startScheduler(): Promise<void> {
  const cron = await import("node-cron");

  cron.schedule("0 * * * *", async () => {
    const cadence = await getConfigValue("cadence", "daily");
    const isPaused = await getConfigValue("isPaused", "false");

    if (isPaused === "true") return;
    if (runningCycleId) return;

    const now = new Date();
    const hour = now.getUTCHours();

    if (cadence === "manual") return;

    if (cadence === "hourly") {
      await runCycleNow();
    } else if (cadence === "daily" && hour === 6) {
      await runCycleNow();
    } else if (cadence === "weekly" && now.getUTCDay() === 1 && hour === 6) {
      await runCycleNow();
    }
  });

  logger.info("Autoresearch scheduler started");
}
