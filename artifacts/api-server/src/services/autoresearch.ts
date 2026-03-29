import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  cyclesTable,
  forecastsTable,
  experimentsTable,
  changelogEntriesTable,
  adminConfigTable,
} from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { generateForecasts } from "./forecasting";
import { ingestRSSFeeds } from "./evidence-ingestion";
import { parseLLMJson } from "./scoring";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ai } from "@workspace/integrations-gemini-ai";

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

    const ingestedCount = await ingestRSSFeeds();
    logger.info({ cycleId, ingestedCount }, "Evidence ingestion complete");

    const evidencePackVersion = new Date().toISOString().slice(0, 10);
    const forecasts = await generateForecasts(cycleId, evidencePackVersion);

    await db.update(forecastsTable)
      .set({ isCurrent: false })
      .where(eq(forecastsTable.isCurrent, true));

    for (const f of forecasts) {
      const forecastId = randomUUID();
      await db.insert(forecastsTable).values({
        id: forecastId,
        cycleId,
        evidencePackVersion,
        timeHorizon: f.timeHorizon,
        probabilities: f.probabilities,
        rationale: f.rationale,
        keyEvidenceItems: f.keyEvidenceItems,
        isCurrent: true,
      });
    }

    logger.info({ cycleId, forecastCount: forecasts.length }, "Forecasts generated");

    const experimentResult = await runExperiment(cycleId, forecasts);
    if (experimentResult) {
      experimentsRun++;
      totalTokens += experimentResult.tokensConsumed;
      totalCost += experimentResult.costUsd;
      if (experimentResult.retained) experimentsRetained++;
    }

    const primaryForecast = forecasts.find(f => f.timeHorizon === "90d");
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

    logger.info({ cycleId }, "Autoresearch cycle completed successfully");
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

function generateHeadline(probs: Record<string, number>): string {
  const top = Object.entries(probs).sort((a, b) => b[1] - a[1])[0];
  if (!top) return "Forecast updated";
  const pct = Math.round((top[1] ?? 0) * 100);
  const label = top[0].replace(/_/g, " ");
  return `${pct}% probability of ${label} at 90-day horizon`;
}

interface ExperimentResult {
  retained: boolean;
  tokensConsumed: number;
  costUsd: number;
}

async function runExperiment(
  cycleId: string,
  forecasts: Array<{ timeHorizon: string; probabilities: Record<string, number>; rationale: string }>
): Promise<ExperimentResult | null> {
  try {
    const primaryForecast = forecasts.find(f => f.timeHorizon === "90d");
    if (!primaryForecast) return null;

    const probsStr = JSON.stringify(primaryForecast.probabilities, null, 2);

    const geminiResult = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a conflict analysis red-team. Challenge this Iran conflict 90-day forecast with contrarian evidence and arguments:\n\n${probsStr}\n\nRationale: ${primaryForecast.rationale}\n\nProvide 3 specific counter-arguments and suggest adjusted probabilities if warranted.`,
    });
    const redTeamText = geminiResult.text ?? "";

    const evalResponse = await openai.chat.completions.create({
      model: process.env["OPENAI_MODEL"] || "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a Bayesian forecast evaluator. Score forecasts on accuracy and calibration.",
        },
        {
          role: "user",
          content: `Evaluate this Iran conflict forecast and red-team challenge. Return JSON:
{
  "scoreImprovement": <-1 to 1>,
  "recommendation": "retain" | "discard",
  "reasoning": "<1 sentence>"
}

FORECAST: ${probsStr}
RED-TEAM: ${redTeamText.slice(0, 1000)}`,
        },
      ],
      max_completion_tokens: 256,
    });

    const evalText = evalResponse.choices[0]?.message?.content ?? "";
    let evalResult: { scoreImprovement?: number; recommendation?: string; reasoning?: string } = {};
    try {
      evalResult = parseLLMJson(evalText) as typeof evalResult;
    } catch {
      evalResult = { recommendation: "discard", reasoning: "Parse failed" };
    }

    const retained = evalResult["recommendation"] === "retain";
    const estimatedTokens = 2000;
    const estimatedCost = 0.003;

    await db.insert(experimentsTable).values({
      id: randomUUID(),
      cycleId,
      task: "A",
      changeDescription: `Red-team evaluation: ${evalResult["reasoning"] ?? "Unknown"}`,
      changeDiff: redTeamText.slice(0, 500),
      scoresBefore: primaryForecast.probabilities,
      scoresAfter: primaryForecast.probabilities,
      diagnosis: evalResult["reasoning"] ?? null,
      retained,
      tokensConsumed: estimatedTokens,
      wallClockSeconds: null,
      costUsd: estimatedCost,
    });

    return { retained, tokensConsumed: estimatedTokens, costUsd: estimatedCost };
  } catch (err) {
    logger.warn({ err, cycleId }, "Experiment failed");
    return null;
  }
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
