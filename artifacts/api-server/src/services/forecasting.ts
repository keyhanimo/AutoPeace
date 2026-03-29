import type Anthropic from "@anthropic-ai/sdk";
type AnthropicClient = Anthropic;
type BatchProcess = typeof import("@workspace/integrations-anthropic-ai/batch")["batchProcess"];
let _anthropic: AnthropicClient | null = null;
let _batchProcess: BatchProcess | null = null;
async function getAnthropicClient(): Promise<{ anthropic: AnthropicClient; batchProcess: BatchProcess }> {
  if (!_anthropic || !_batchProcess) {
    const [anthMod, batchMod] = await Promise.all([
      import("@workspace/integrations-anthropic-ai"),
      import("@workspace/integrations-anthropic-ai/batch"),
    ]);
    _anthropic = anthMod.anthropic;
    _batchProcess = batchMod.batchProcess;
  }
  return { anthropic: _anthropic!, batchProcess: _batchProcess! };
}
import { normalizeProbabilities, parseLLMJson, type ForecastProbabilities } from "./scoring";
import { db } from "@workspace/db";
import { evidenceItemsTable, forecastsTable } from "@workspace/db/schema";
import { desc, eq, and, ne } from "drizzle-orm";

const OUTCOMES = [
  "continued_conflict",
  "informal_deescalation",
  "limited_ceasefire",
  "humanitarian_mini_deal",
  "sanctions_partial_deal",
  "regional_framework",
  "broad_settlement",
  "major_escalation",
];

const TIME_HORIZONS = ["30d", "90d", "180d", "1y"];

const SEED_CYCLE = "seed-historical-2024";

export type GeneratedForecast = {
  timeHorizon: string;
  probabilities: ForecastProbabilities;
  rationale: string;
  keyEvidenceItems: string[];
  brierScore?: number;
  logScore?: number;
};

function computeBrierScore(probs: ForecastProbabilities, resolvedOutcome: string): number {
  let sum = 0;
  for (const outcome of OUTCOMES) {
    const p = (probs as Record<string, number>)[outcome] ?? 0;
    const o = outcome === resolvedOutcome ? 1 : 0;
    sum += (p - o) ** 2;
  }
  return sum / OUTCOMES.length;
}

function computeLogScore(probs: ForecastProbabilities, resolvedOutcome: string): number {
  const p = Math.max(1e-9, (probs as Record<string, number>)[resolvedOutcome] ?? 1e-9);
  return Math.log(p);
}

async function getHistoricalOutcomeForHorizon(horizon: string): Promise<string | null> {
  const rows = await db.select({
    calibrationBucket: forecastsTable.calibrationBucket,
  })
    .from(forecastsTable)
    .where(
      and(
        eq(forecastsTable.cycleId, SEED_CYCLE),
        eq(forecastsTable.timeHorizon, horizon),
      )
    )
    .limit(1);
  const bucket = rows[0]?.calibrationBucket;
  if (!bucket) return null;
  return bucket.replace("resolved:", "");
}

async function getFallbackResolvedOutcome(): Promise<string> {
  const rows = await db.select({ calibrationBucket: forecastsTable.calibrationBucket })
    .from(forecastsTable)
    .where(
      and(
        eq(forecastsTable.cycleId, SEED_CYCLE),
        ne(forecastsTable.calibrationBucket, "")
      )
    )
    .limit(1);
  const bucket = rows[0]?.calibrationBucket;
  return bucket ? bucket.replace("resolved:", "") : "continued_conflict";
}

export async function generateForecasts(cycleId: string, evidencePackVersion: string): Promise<GeneratedForecast[]> {
  const recentEvidence = await db.select({
    id: evidenceItemsTable.id,
    title: evidenceItemsTable.title,
    source: evidenceItemsTable.source,
    publishedAt: evidenceItemsTable.publishedAt,
    evidenceType: evidenceItemsTable.evidenceType,
    text: evidenceItemsTable.text,
  })
    .from(evidenceItemsTable)
    .orderBy(desc(evidenceItemsTable.publishedAt))
    .limit(30);

  const evidenceSummary = recentEvidence
    .map(e => `[${e.source}] ${e.title} (${e.evidenceType}, ${e.publishedAt?.toISOString().slice(0, 10)}): ${e.text.slice(0, 300)}`)
    .join("\n\n");

  const systemPrompt = `You are a Bayesian conflict forecasting model specializing in the Iran-US-Israel conflict complex.
You assess probabilities for 8 mutually exclusive conflict outcome states over different time horizons.
Your forecasts are based on systematic evidence review and calibrated uncertainty quantification.
Always respond with valid JSON in a code block.`;

  const model = process.env["ANTHROPIC_MODEL"] || "claude-sonnet-4-5";

  const tasks = TIME_HORIZONS.map(horizon => ({
    key: horizon,
    messages: [
      {
        role: "user" as const,
        content: `Assess the probability distribution for the following conflict outcomes in the Iran conflict complex over the next ${horizon}:

OUTCOMES (must sum to 1.0):
${OUTCOMES.map(o => `- ${o}`).join("\n")}

RECENT EVIDENCE:
${evidenceSummary || "No recent evidence available. Use prior knowledge."}

Respond ONLY with a JSON code block containing:
{
  "probabilities": {
    "continued_conflict": <float>,
    "informal_deescalation": <float>,
    "limited_ceasefire": <float>,
    "humanitarian_mini_deal": <float>,
    "sanctions_partial_deal": <float>,
    "regional_framework": <float>,
    "broad_settlement": <float>,
    "major_escalation": <float>
  },
  "rationale": "<2-3 sentence explanation>",
  "keyEvidenceItems": ["<evidence item id or title>", ...]
}`
      }
    ]
  }));

  const { anthropic, batchProcess } = await getAnthropicClient();
  const results = await batchProcess(
    tasks,
    async (task) => {
      const msg = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: task.messages,
      });
      const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
      const parsed = parseLLMJson(text);
      const rawProbs = parsed["probabilities"] as Record<string, number>;
      const probs = normalizeProbabilities(rawProbs);

      const resolvedOutcome = (await getHistoricalOutcomeForHorizon(task.key)) ?? (await getFallbackResolvedOutcome());
      const brierScore = computeBrierScore(probs, resolvedOutcome);
      const logScore = computeLogScore(probs, resolvedOutcome);

      return {
        timeHorizon: task.key,
        probabilities: probs,
        rationale: (parsed["rationale"] as string) ?? "",
        keyEvidenceItems: ((parsed["keyEvidenceItems"] as string[]) ?? []).slice(0, 5),
        brierScore,
        logScore,
      };
    },
    { concurrency: 2, retries: 2 }
  );

  return results.filter(Boolean);
}

export async function getRecentForecastsForBacktest(
  excludeCycleId: string,
  limit = 5
): Promise<Array<{ timeHorizon: string; probs: ForecastProbabilities; resolvedOutcome: string }>> {
  const rows = await db.select({
    timeHorizon: forecastsTable.timeHorizon,
    probabilities: forecastsTable.probabilities,
    calibrationBucket: forecastsTable.calibrationBucket,
  })
    .from(forecastsTable)
    .where(
      and(
        eq(forecastsTable.cycleId, SEED_CYCLE),
        ne(forecastsTable.timeHorizon, "")
      )
    )
    .orderBy(desc(forecastsTable.createdAt))
    .limit(limit);

  return rows
    .filter(r => r.calibrationBucket)
    .map(r => ({
      timeHorizon: r.timeHorizon,
      probs: r.probabilities as ForecastProbabilities,
      resolvedOutcome: (r.calibrationBucket ?? "").replace("resolved:", "") || "continued_conflict",
    }));
}
