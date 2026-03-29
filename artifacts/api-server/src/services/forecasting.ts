import { anthropic } from "@workspace/integrations-anthropic-ai";
import { batchProcess } from "@workspace/integrations-anthropic-ai/batch";
import { normalizeProbabilities, parseLLMJson, type ForecastProbabilities } from "./scoring";
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

const TIME_HORIZONS = ["30d", "90d", "180d", "1y"];

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
      return {
        timeHorizon: task.key,
        probabilities: normalizeProbabilities(rawProbs),
        rationale: (parsed["rationale"] as string) ?? "",
        keyEvidenceItems: ((parsed["keyEvidenceItems"] as string[]) ?? []).slice(0, 5),
      };
    },
    { concurrency: 2, retries: 2 }
  );

  return results.filter(Boolean);
}
