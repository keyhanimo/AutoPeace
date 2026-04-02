import type Anthropic from "@anthropic-ai/sdk";
import { callLLM, getModelConfig, getAnthropic, resolveFallbackConfig } from "./llm-router";

async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: { concurrency?: number; retries?: number } = {},
): Promise<R[]> {
  const { concurrency = 2, retries = 2 } = options;
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function runOne(index: number): Promise<void> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        results[index] = await processor(items[index], index);
        return;
      } catch (err) {
        lastErr = err;
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt)));
        }
      }
    }
    throw lastErr;
  }

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      await runOne(idx);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
import { normalizeProbabilities, parseLLMJson, type ForecastProbabilities } from "./scoring";
export type { ForecastProbabilities };
import { db } from "@workspace/db";
import { evidenceItemsTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";

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

const TIME_HORIZONS = ["10d", "30d", "90d", "180d", "1y"];

export type GeneratedForecast = {
  timeHorizon: string;
  probabilities: ForecastProbabilities;
  rationale: string;
  keyEvidenceItems: string[];
};

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

  const modelConfig = await getModelConfig();
  const forecastingProvider = modelConfig.forecastingProvider;
  const forecastingModel = modelConfig.forecastingModel;

  const tasks = TIME_HORIZONS.map(horizon => ({
    key: horizon,
    prompt: `Assess the probability distribution for the following conflict outcomes in the Iran conflict complex over the next ${horizon}:

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
}`,
  }));

  const results = await batchProcess(
    tasks,
    async (task) => {
      const fbConfig = resolveFallbackConfig("forecasting", modelConfig);
      const resp = await callLLM(task.prompt, systemPrompt, forecastingProvider, forecastingModel, { maxTokens: 4096, fallbackProvider: fbConfig?.provider, fallbackModel: fbConfig?.model });
      const text = resp.content;
      const parsed = parseLLMJson(text);
      const rawProbs = parsed["probabilities"] as Record<string, number>;
      const probs = normalizeProbabilities(rawProbs);

      return {
        timeHorizon: task.key,
        probabilities: probs,
        rationale: (parsed["rationale"] as string) ?? "",
        keyEvidenceItems: ((parsed["keyEvidenceItems"] as string[]) ?? []).slice(0, 5),
      };
    },
    { concurrency: 2, retries: 2 }
  );

  return results.filter(Boolean);
}

export type ScenarioInput = {
  id: string;
  name: string;
  description: string;
  triggerCondition: string;
};

export async function generateScenarioForecast(
  scenario: ScenarioInput,
  baseProbabilities: ForecastProbabilities,
): Promise<{ probabilities: ForecastProbabilities; rationale: string }> {
  const recentEvidence = await db.select({
    title: evidenceItemsTable.title,
    source: evidenceItemsTable.source,
    publishedAt: evidenceItemsTable.publishedAt,
    evidenceType: evidenceItemsTable.evidenceType,
    text: evidenceItemsTable.text,
  })
    .from(evidenceItemsTable)
    .orderBy(desc(evidenceItemsTable.publishedAt))
    .limit(20);

  const evidenceSummary = recentEvidence
    .map(e => `[${e.source}] ${e.title} (${e.evidenceType}): ${e.text.slice(0, 200)}`)
    .join("\n\n");

  const baseSummary = Object.entries(baseProbabilities)
    .map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`)
    .join(", ");

  const systemPrompt = `You are a Bayesian conflict forecasting model specializing in the Iran-US-Israel conflict complex.
You re-assess outcome probabilities under specific hypothetical scenarios using systematic evidence review.
Always respond with valid JSON in a code block.`;

  const modelConfig = await getModelConfig();

  const userPrompt = `SCENARIO: "${scenario.name}"
Description: ${scenario.description}
Trigger condition: ${scenario.triggerCondition}

BASE FORECAST (current 90d probabilities without this scenario):
${baseSummary}

RECENT EVIDENCE CONTEXT:
${evidenceSummary || "No recent evidence available."}

TASK: Given that the above scenario has occurred or is occurring, reassess the 90-day conflict outcome probabilities.
Adjust from the base forecast to reflect the causal effects of this scenario on each outcome.

OUTCOMES (must sum to 1.0):
${OUTCOMES.map(o => `- ${o}`).join("\n")}

Respond ONLY with a JSON code block:
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
  "rationale": "<2-3 sentence explanation of how this scenario shifts the probabilities>"
}`;

  const fbConfig = resolveFallbackConfig("forecasting", modelConfig);
  const resp = await callLLM(userPrompt, systemPrompt, modelConfig.forecastingProvider, modelConfig.forecastingModel, { maxTokens: 4096, fallbackProvider: fbConfig?.provider, fallbackModel: fbConfig?.model });
  const text = resp.content;
  const parsed = parseLLMJson(text);
  const rawProbs = parsed["probabilities"] as Record<string, number>;
  const probabilities = normalizeProbabilities(rawProbs);

  return {
    probabilities,
    rationale: (parsed["rationale"] as string) ?? "",
  };
}
