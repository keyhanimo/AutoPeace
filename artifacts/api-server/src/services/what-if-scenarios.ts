import { db } from "@workspace/db";
import { whatIfScenariosTable, forecastsTable, proposalsTable, adminConfigTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { generateScenarioForecast, type ScenarioInput, type ForecastProbabilities } from "./forecasting";
import {
  evaluateStakeholders,
  judgeAndScore,
  type ModelConfig,
  type DealTerms,
} from "./deal-engine";

const OUTCOMES = [
  "continued_conflict",
  "major_escalation",
  "informal_deescalation",
  "limited_ceasefire",
  "humanitarian_mini_deal",
  "sanctions_partial_deal",
  "regional_framework",
  "broad_settlement",
];

type ScenarioDef = ScenarioInput;

const SCENARIO_DEFS: ScenarioDef[] = [
  {
    id: "sanctions-lifted",
    name: "Sanctions Lifted",
    description: "Western sanctions on Iran fully removed as part of a phased deal",
    triggerCondition: "Full JCPOA-plus agreement with verified enrichment rollback",
  },
  {
    id: "military-strikes",
    name: "Military Strikes",
    description: "Israeli or US military strikes on Iranian nuclear facilities",
    triggerCondition: "Iran crosses 90% enrichment threshold or credible weapon assembly detected",
  },
  {
    id: "hormuz-closure",
    name: "Strait of Hormuz Closure",
    description: "Iran closes the Strait of Hormuz disrupting global energy supply",
    triggerCondition: "US or Israeli military action or crushing sanction escalation",
  },
  {
    id: "us-withdrawal",
    name: "US Withdraws from Region",
    description: "United States significantly reduces military presence in the Middle East",
    triggerCondition: "Domestic political shift, budget crisis, or grand strategy reorientation",
  },
];

function extractProbs(forecast: Record<string, unknown>): Record<string, number> {
  const rawProbs = forecast["probabilities"] as Record<string, unknown> | undefined;
  const probs: Record<string, number> = {};
  for (const key of OUTCOMES) {
    const val = rawProbs?.[key] ?? forecast[key] ?? 0;
    const num = typeof val === "number" ? val : Number(val);
    probs[key] = Number.isFinite(num) ? num : 0;
  }
  return probs;
}

async function getDefaultModelConfig(): Promise<ModelConfig> {
  const cfg = await db.select().from(adminConfigTable);
  const map = Object.fromEntries(cfg.map(r => [r.key, r.value]));
  const openaiModel = map["openaiModel"] ?? "gpt-5.2";
  return {
    anthropicModel: map["anthropicModel"] ?? "claude-opus-4-6",
    openaiModel,
    geminiModel: map["geminiModel"] ?? "gemini-3.1-pro-preview",
    generationProvider: (map["generationProvider"] ?? "anthropic") as "anthropic" | "openai" | "gemini",
    generationModel: map["generationModel"] ?? "claude-opus-4-6",
    evaluationProvider: (map["evaluationProvider"] ?? "openai") as "anthropic" | "openai" | "gemini",
    evaluationModel: map["evaluationModel"] ?? openaiModel,
    adversarialProvider: (map["adversarialProvider"] ?? "anthropic") as "anthropic" | "openai" | "gemini",
    adversarialModel: map["adversarialModel"] ?? "claude-opus-4-6",
    judgePanelAnthropicModel: map["judgePanelAnthropicModel"] || undefined,
    judgePanelOpenaiModel: map["judgePanelOpenaiModel"] || undefined,
    judgePanelGeminiModel: map["judgePanelGeminiModel"] || undefined,
  };
}

async function computeProposalImpactsViaScoring(
  proposals: Array<{ id: string; name: string; terms: unknown; scores: unknown }>,
  scenarioDef: ScenarioDef,
  modelConfig: ModelConfig,
  maxProposals = 5,
): Promise<Array<{ proposalId: string; proposalName: string; viabilityDelta: number; projectedComposite: number; favorabilityNote: string }>> {
  const scored = proposals
    .filter(p => p.scores !== null && p.scores !== undefined)
    .slice(0, maxProposals);

  const results = await Promise.all(scored.map(async (p) => {
    const baseScores = p.scores as Record<string, number> | null | undefined;
    const baseComposite = baseScores?.composite ?? 0;
    try {
      const terms = p.terms as DealTerms;
      const enrichedTerms: DealTerms = {
        ...terms,
        nuclearProtocol: `[SCENARIO: ${scenarioDef.name} — ${scenarioDef.description}]\n\n${terms.nuclearProtocol}`,
      };
      const { evaluations: stakeholderEvaluations } = await evaluateStakeholders(enrichedTerms, modelConfig);
      const { scores } = await judgeAndScore(enrichedTerms, stakeholderEvaluations, [], {}, modelConfig);
      const projectedComposite = Math.round((scores.composite ?? baseComposite) * 100) / 100;
      const viabilityDelta = Math.round((projectedComposite - baseComposite) * 100) / 100;
      const favorabilityNote = viabilityDelta > 0.05
        ? "More viable under this scenario"
        : viabilityDelta < -0.05
          ? "Less viable under this scenario"
          : "Minimal change in viability";
      return { proposalId: p.id, proposalName: p.name, viabilityDelta, projectedComposite, favorabilityNote };
    } catch {
      return { proposalId: p.id, proposalName: p.name, viabilityDelta: 0, projectedComposite: baseComposite, favorabilityNote: "Evaluation unavailable" };
    }
  }));
  return results;
}

export async function computeAndStoreWhatIfScenarios(cycleId?: string): Promise<void> {
  const preferred = await db.select()
    .from(forecastsTable)
    .where(eq(forecastsTable.timeHorizon, "90d"))
    .orderBy(desc(forecastsTable.createdAt))
    .limit(1);

  const latestForecasts = preferred.length > 0 ? preferred : await db.select()
    .from(forecastsTable)
    .orderBy(desc(forecastsTable.createdAt))
    .limit(1);

  if (latestForecasts.length === 0) return;
  const latest = latestForecasts[0]!;
  const usedCycleId = cycleId ?? latest.cycleId ?? undefined;
  const base = extractProbs(latest as unknown as Record<string, unknown>);

  const proposals = await db.select({
    id: proposalsTable.id,
    name: proposalsTable.name,
    terms: proposalsTable.terms,
    scores: proposalsTable.scores,
  }).from(proposalsTable);

  const modelConfig = await getDefaultModelConfig();

  for (const def of SCENARIO_DEFS) {
    let absolute: Record<string, number> = base;
    let rationale = "";

    try {
      const result = await generateScenarioForecast(def, base as ForecastProbabilities);
      absolute = result.probabilities;
      rationale = result.rationale;
    } catch {
      absolute = base;
    }

    const deltas: Record<string, number> = {};
    for (const key of OUTCOMES) {
      deltas[key] = (absolute[key] ?? 0) - (base[key] ?? 0);
    }

    const proposalImpacts = await computeProposalImpactsViaScoring(
      proposals as Array<{ id: string; name: string; terms: unknown; scores: unknown }>,
      def,
      modelConfig,
      5,
    );

    await db.insert(whatIfScenariosTable).values({
      id: def.id,
      name: def.name,
      description: def.description,
      triggerCondition: def.triggerCondition,
      basedOnCycleId: usedCycleId,
      probabilityDeltas: deltas,
      absoluteProbabilities: absolute,
      proposalImpacts,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: whatIfScenariosTable.id,
      set: {
        basedOnCycleId: usedCycleId,
        probabilityDeltas: deltas,
        absoluteProbabilities: absolute,
        proposalImpacts,
        updatedAt: new Date(),
      },
    });

    void rationale;
  }
}
