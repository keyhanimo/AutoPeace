import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  cyclesTable,
  forecastsTable,
  changelogEntriesTable,
  evidenceItemsTable,
} from "@workspace/db/schema";
import { desc, eq, isNull } from "drizzle-orm";
import { logger } from "../lib/logger";
import { updateStakeholderProfilesFromEvidence } from "./stakeholder-updater";
import {
  setStage,
  setRunningCycleId,
  setCycleStartedAt,
  resetCycleState,
  setLastCycleError,
  getCycleStatus,
  cycleEvents,
  type CycleStatus,
  type CycleStage,
  type DealSubStage,
} from "../lib/cycle-status";
import { emitCycleLog } from "../lib/cycle-log";
import { generateForecasts } from "./forecasting";
import { ingestAllSources } from "./evidence-ingestion";
import { extractProposalsFromEvidence } from "./proposal-extractor";
import { runDealCycleNow, isDealCycleRunning } from "./deal-autoresearch";
import { getConfigValue } from "./llm-router";

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

export { getCycleStatus, cycleEvents } from "../lib/cycle-status";
export type { CycleStatus, CycleStage, DealSubStage } from "../lib/cycle-status";

export function isRunning() {
  return getCycleStatus().isRunning;
}

export async function getNextRunAt(): Promise<number | null> {
  try {
    const cadence = await getConfigValue("cadence", "daily");
    const isPaused = await getConfigValue("isPaused", "false");
    if (isPaused === "true" || cadence === "manual") return null;

    const now = new Date();

    if (cadence === "every15m") {
      const next = new Date(now);
      const mins = next.getUTCMinutes();
      const nextSlot = Math.ceil((mins + 1) / 15) * 15;
      next.setUTCMinutes(nextSlot, 0, 0);
      return next.getTime();
    }

    if (cadence === "every30m") {
      const next = new Date(now);
      const mins = next.getUTCMinutes();
      const nextSlot = Math.ceil((mins + 1) / 30) * 30;
      next.setUTCMinutes(nextSlot, 0, 0);
      return next.getTime();
    }

    if (cadence === "hourly") {
      const next = new Date(now);
      next.setUTCMinutes(0, 0, 0);
      next.setUTCHours(next.getUTCHours() + 1);
      return next.getTime();
    }

    if (cadence === "daily") {
      const next = new Date(now);
      next.setUTCHours(6, 0, 0, 0);
      if (next.getTime() <= now.getTime()) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      return next.getTime();
    }

    if (cadence === "weekly") {
      const next = new Date(now);
      next.setUTCHours(6, 0, 0, 0);
      const daysUntilMonday = (8 - next.getUTCDay()) % 7 || 7;
      if (next.getUTCDay() === 1 && next.getTime() > now.getTime()) {
        return next.getTime();
      }
      next.setUTCDate(next.getUTCDate() + daysUntilMonday);
      return next.getTime();
    }

    return null;
  } catch {
    return null;
  }
}

export async function runCycleNow(): Promise<string> {
  const current = getCycleStatus();
  if (current.isRunning && current.cycleId) return current.cycleId;

  const cycleId = randomUUID();
  setRunningCycleId(cycleId);
  setCycleStartedAt(Date.now());
  resetCycleState();
  setStage("starting");

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
  try {
    logger.info({ cycleId }, "Starting autoresearch cycle");
    emitCycleLog({ cycleId, level: "stage", stage: "starting", message: "Beginning a full autoresearch cycle. This will ingest the latest news and evidence, generate updated conflict probability forecasts across multiple time horizons, and then launch the deal optimization engine to design and evaluate peace deal proposals." });

    const isPaused = await getConfigValue("isPaused", "false");
    if (isPaused === "true") {
      logger.info({ cycleId }, "Cycle paused by admin config");
      emitCycleLog({ cycleId, level: "info", stage: "starting", message: "Cycle is paused by an administrator. No research will be performed this cycle. The system will check again at the next scheduled interval." });
      await db.update(cyclesTable).set({ status: "completed", completedAt: new Date() }).where(eq(cyclesTable.id, cycleId));
      setStage("completed");
      setRunningCycleId(null);
      return;
    }

    setStage("evidence_ingestion");
    emitCycleLog({ cycleId, level: "stage", stage: "evidence_ingestion", message: "Scanning RSS news feeds (Reuters, AP, GDELT) for the latest articles about the Iran-US-Israel conflict. New articles will be classified by type (diplomatic moves, military actions, economic changes, etc.) and stored as evidence for the AI to reason about." });
    const ingestionStart = Date.now();
    const ingestedCount = await ingestAllSources();
    logger.info({ cycleId, ingestedCount }, "Evidence ingestion complete");
    emitCycleLog({ cycleId, level: "info", stage: "evidence_ingestion", message: ingestedCount > 0 ? `Found and stored ${ingestedCount} new evidence item${ingestedCount === 1 ? "" : "s"} from news feeds. Each item has been classified by evidence type and will influence the next forecast.` : "No new evidence items found from news feeds. The system will use previously cached evidence for this cycle's forecasts.", durationMs: Date.now() - ingestionStart, metadata: { ingestedCount } });

    try {
      const stakeholderStart = Date.now();
      emitCycleLog({ cycleId, level: "info", stage: "evidence_ingestion", message: "Using an LLM to update the profiles of all 33 conflict stakeholders (Iran, US, Israel, Gulf states, international orgs, etc.) based on the latest evidence. This keeps each actor's known positions, red lines, and priorities current." });
      const stakeholderUpdateResult = await updateStakeholderProfilesFromEvidence(cycleId);
      logger.info({ cycleId, ...stakeholderUpdateResult }, "Stakeholder profile update from evidence complete");
      emitCycleLog({ cycleId, level: "info", stage: "evidence_ingestion", message: `Stakeholder profile update complete: ${stakeholderUpdateResult.updated} stakeholder${stakeholderUpdateResult.updated === 1 ? "'s profile was" : " profiles were"} updated with new information, ${stakeholderUpdateResult.skipped} remained unchanged.`, durationMs: Date.now() - stakeholderStart, metadata: stakeholderUpdateResult });
    } catch (stakeholderErr) {
      logger.warn({ err: stakeholderErr, cycleId }, "Stakeholder profile update failed (non-critical)");
      emitCycleLog({ cycleId, level: "warn", stage: "evidence_ingestion", message: `Stakeholder profile update failed (non-critical, continuing with existing profiles): ${String(stakeholderErr)}` });
    }

    setStage("proposal_extraction");
    emitCycleLog({ cycleId, level: "stage", stage: "proposal_extraction", message: "Scanning recent evidence for any real-world peace proposals, diplomatic frameworks, or negotiation offers mentioned in news articles. These real-world proposals are extracted and stored so the deal engine can incorporate actual diplomatic ideas into its AI-generated peace deals." });
    try {
      const extractStart = Date.now();
      const extractedProposals = await extractProposalsFromEvidence(cycleId);
      logger.info({ cycleId, extractedProposals }, "Proposal extraction from evidence complete");
      emitCycleLog({ cycleId, level: "info", stage: "proposal_extraction", message: extractedProposals > 0 ? `Extracted ${extractedProposals} real-world proposal${extractedProposals === 1 ? "" : "s"} from recent evidence. These will be available for the deal engine to learn from and incorporate.` : "No new real-world proposals found in recent evidence. The deal engine will work with previously known proposals.", durationMs: Date.now() - extractStart, metadata: { extractedProposals } });
    } catch (extractErr) {
      logger.warn({ err: extractErr, cycleId }, "Proposal extraction failed (non-critical)");
      emitCycleLog({ cycleId, level: "warn", stage: "proposal_extraction", message: `Proposal extraction encountered an error (non-critical, the deal engine will still function): ${String(extractErr)}` });
    }

    setStage("forecasting");
    emitCycleLog({ cycleId, level: "stage", stage: "forecasting", message: "Sending all available evidence to an AI model to generate Bayesian probability forecasts. The model will estimate the likelihood of 8 possible conflict outcomes (e.g., nuclear deal, military escalation, status quo, diplomatic breakthrough) across multiple time horizons (30 days, 90 days, 1 year, 5 years)." });
    const forecastStart = Date.now();
    const evidencePackVersion = new Date().toISOString().slice(0, 10);
    const forecasts = await generateForecasts(cycleId, evidencePackVersion);

    await db.transaction(async (tx) => {
      await tx.update(forecastsTable)
        .set({ isCurrent: false })
        .where(eq(forecastsTable.isCurrent, true));

      for (const f of forecasts) {
        const forecastId = randomUUID();
        await tx.insert(forecastsTable).values({
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
    });

    logger.info({ cycleId, forecastCount: forecasts.length }, "Forecasts generated");
    emitCycleLog({ cycleId, level: "info", stage: "forecasting", message: `Forecasts generated for ${forecasts.length} time horizon${forecasts.length === 1 ? "" : "s"} (${forecasts.map(f => f.timeHorizon).join(", ")}). Each forecast contains probability estimates for all 8 conflict outcome states, summing to 100%.`, durationMs: Date.now() - forecastStart, metadata: { forecastCount: forecasts.length, horizons: forecasts.map(f => f.timeHorizon) } });

    const primary90dForecast = forecasts.find(f => f.timeHorizon === "90d");
    if (primary90dForecast) {
      const probEntries = Object.entries(primary90dForecast.probabilities as Record<string, number>)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`);
      emitCycleLog({ cycleId, level: "info", stage: "forecasting", message: `Primary 90-day forecast — the model's best estimate for the next 3 months. Top outcomes: ${probEntries.slice(0, 3).join(", ")}. Full distribution available in metadata.`, metadata: { probabilities: primary90dForecast.probabilities } });
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

    setStage("changelog");
    emitCycleLog({ cycleId, level: "stage", stage: "changelog", message: "Creating a human-readable changelog entry that summarizes what changed in this cycle — the headline forecast shift and which evidence was most influential." });
    const primaryForecast = forecasts.find(f => f.timeHorizon === "90d");
    if (primaryForecast) {
      const headline = generateHeadline(primaryForecast.probabilities);

      await db.insert(changelogEntriesTable).values({
        id: randomUUID(),
        cycleId,
        headline,
        forecastDelta: primaryForecast.probabilities,
        keyEvidence: primaryForecast.keyEvidenceItems.map((title: string) => ({ title })),
        notes: primaryForecast.rationale,
      });
      emitCycleLog({ cycleId, level: "info", stage: "changelog", message: `Changelog entry saved: "${headline}". This entry is now visible on the public dashboard, showing users what the latest forecast says and why.`, metadata: { headline, keyEvidence: primaryForecast.keyEvidenceItems.slice(0, 5) } });
    }

    await db.update(cyclesTable).set({
      status: "completed",
      completedAt: new Date(),
    }).where(eq(cyclesTable.id, cycleId));

    logger.info({ cycleId }, "Forecasting cycle completed successfully");
    emitCycleLog({ cycleId, level: "info", stage: "forecasting_complete", message: `Forecasting pipeline finished. The updated forecasts are now live on the dashboard.` });

    setStage("deal_engine");
    emitCycleLog({ cycleId, level: "stage", stage: "deal_engine", message: "Launching the deal optimization engine. This is a separate multi-stage pipeline that designs AI-generated peace deal proposals, evaluates them from every stakeholder's perspective, red-teams them for fatal flaws, and scores them on 7 dimensions (feasibility, coherence, durability, etc.). The best deal is retained as the current champion." });
    try {
      if (isDealCycleRunning()) {
        logger.info({ cycleId }, "Deal cycle already running — skipping deal optimization this cycle");
        emitCycleLog({ cycleId, level: "warn", stage: "deal_engine", message: "A deal optimization cycle is already in progress from a previous run. Skipping deal generation this cycle to avoid conflicts. The forecasts from this cycle are still saved." });
      } else {
        logger.info({ cycleId }, "Starting deal optimization as part of autoresearch cycle");
        const dealEngineStart = Date.now();
        const dealCycleId = await withTimeout(runDealCycleNow(), 2_700_000, "Deal engine timed out after 45 minutes");
        logger.info({ cycleId, dealCycleId }, "Deal optimization triggered successfully");
        emitCycleLog({ cycleId, level: "info", stage: "deal_engine", message: `Deal optimization completed successfully. A new peace deal proposal has been generated, evaluated, and scored. See the Deal Dashboard for full details.`, durationMs: Date.now() - dealEngineStart, metadata: { dealCycleId } });
      }
    } catch (dealErr) {
      logger.warn({ err: dealErr, cycleId }, "Deal optimization failed (non-critical — forecasts still updated)");
      emitCycleLog({ cycleId, level: "error", stage: "deal_engine", message: `Deal optimization failed: ${String(dealErr)}. Note: this is non-critical — the forecasting results from this cycle are still saved and visible on the dashboard. The deal engine will retry on the next cycle.` });
    }
    setStage("completed");
    emitCycleLog({ cycleId, level: "stage", stage: "completed", message: "Autoresearch cycle complete. All forecasts have been updated, evidence has been ingested, and the deal engine has run. The dashboard now reflects the latest analysis." });
  } catch (err) {
    logger.error({ err, cycleId }, "Autoresearch cycle error");
    setLastCycleError(String(err));
    setStage("failed");
    emitCycleLog({ cycleId, level: "error", stage: "failed", message: `Autoresearch cycle failed with an error: ${String(err)}. The system will automatically retry at the next scheduled interval. Any partial results (e.g., evidence already ingested) are preserved.` });
    await db.update(cyclesTable).set({
      status: "failed",
      completedAt: new Date(),
      errorMessage: String(err),
    }).where(eq(cyclesTable.id, cycleId));
  } finally {
    setRunningCycleId(null);
    cycleEvents.emit("change", getCycleStatus());
  }
}

function generateHeadline(probs: Record<string, number>): string {
  const top = Object.entries(probs).sort((a, b) => b[1] - a[1])[0];
  if (!top) return "Forecast updated";
  const pct = Math.round((top[1] ?? 0) * 100);
  const label = top[0].replace(/_/g, " ");
  return `${pct}% probability of ${label} at 90-day horizon`;
}

export async function recoverStuckCycles(): Promise<void> {
  try {
    const stuck = await db
      .select({ id: cyclesTable.id })
      .from(cyclesTable)
      .where(eq(cyclesTable.status, "running"));

    if (stuck.length > 0) {
      const ids = stuck.map(c => c.id);
      for (const id of ids) {
        await db.update(cyclesTable).set({
          status: "failed",
          completedAt: new Date(),
          errorMessage: "Server restarted while cycle was running",
        }).where(eq(cyclesTable.id, id));
      }
      logger.info({ count: stuck.length, ids }, "Recovered stuck cycles from previous server instance");
    }
  } catch (err) {
    logger.warn({ err }, "Failed to recover stuck cycles (non-critical)");
  }
}

export async function startScheduler(): Promise<void> {
  const cron = await import("node-cron");

  cron.schedule("*/15 * * * *", async () => {
    const cadence = await getConfigValue("cadence", "daily");
    const isPaused = await getConfigValue("isPaused", "false");

    if (isPaused === "true") return;
    if (getCycleStatus().isRunning) return;

    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();

    if (cadence === "manual") return;

    if (cadence === "every15m") {
      await runCycleNow();
    } else if (cadence === "every30m" && minute % 30 < 15) {
      await runCycleNow();
    } else if (cadence === "hourly" && minute < 15) {
      await runCycleNow();
    } else if (cadence === "daily" && hour === 6 && minute < 15) {
      await runCycleNow();
    } else if (cadence === "weekly" && now.getUTCDay() === 1 && hour === 6 && minute < 15) {
      await runCycleNow();
    }
  });

  logger.info("Autoresearch scheduler started");
}
