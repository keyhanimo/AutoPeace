import { db } from "@workspace/db";
import { whatIfScenariosTable, forecastsTable, proposalsTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";

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

type ScenarioDef = {
  id: string;
  name: string;
  description: string;
  triggerCondition: string;
  multipliers: Record<string, number>;
};

const SCENARIO_DEFS: ScenarioDef[] = [
  {
    id: "sanctions-lifted",
    name: "Sanctions Lifted",
    description: "Western sanctions on Iran fully removed as part of a phased deal",
    triggerCondition: "Full JCPOA-plus agreement with verified enrichment rollback",
    multipliers: {
      continued_conflict: 0.4,
      major_escalation: 0.3,
      informal_deescalation: 1.5,
      limited_ceasefire: 1.6,
      humanitarian_mini_deal: 1.3,
      sanctions_partial_deal: 2.8,
      regional_framework: 2.0,
      broad_settlement: 3.5,
    },
  },
  {
    id: "military-strikes",
    name: "Military Strikes",
    description: "Israeli or US military strikes on Iranian nuclear facilities",
    triggerCondition: "Iran crosses 90% enrichment threshold or credible weapon assembly detected",
    multipliers: {
      continued_conflict: 2.2,
      major_escalation: 4.0,
      informal_deescalation: 0.3,
      limited_ceasefire: 0.4,
      humanitarian_mini_deal: 0.5,
      sanctions_partial_deal: 0.2,
      regional_framework: 0.1,
      broad_settlement: 0.05,
    },
  },
  {
    id: "hormuz-closure",
    name: "Strait of Hormuz Closure",
    description: "Iran closes the Strait of Hormuz disrupting global energy supply",
    triggerCondition: "US or Israeli military action or crushing sanction escalation",
    multipliers: {
      continued_conflict: 2.5,
      major_escalation: 3.8,
      informal_deescalation: 0.2,
      limited_ceasefire: 0.3,
      humanitarian_mini_deal: 0.4,
      sanctions_partial_deal: 0.1,
      regional_framework: 0.15,
      broad_settlement: 0.05,
    },
  },
  {
    id: "us-withdrawal",
    name: "US Withdraws from Region",
    description: "United States significantly reduces military presence in the Middle East",
    triggerCondition: "Domestic political shift, budget crisis, or grand strategy reorientation",
    multipliers: {
      continued_conflict: 1.4,
      major_escalation: 0.7,
      informal_deescalation: 1.8,
      limited_ceasefire: 1.3,
      humanitarian_mini_deal: 1.5,
      sanctions_partial_deal: 1.1,
      regional_framework: 1.8,
      broad_settlement: 1.2,
    },
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

function normalizeToSum(probs: Record<string, number>): Record<string, number> {
  const total = Object.values(probs).reduce((a, b) => a + b, 0);
  if (total <= 0) return probs;
  const normalized: Record<string, number> = {};
  for (const key of OUTCOMES) {
    normalized[key] = (probs[key] ?? 0) / total;
  }
  return normalized;
}

function applyScenario(base: Record<string, number>, multipliers: Record<string, number>): {
  absolute: Record<string, number>;
  deltas: Record<string, number>;
} {
  const raw: Record<string, number> = {};
  for (const key of OUTCOMES) {
    raw[key] = (base[key] ?? 0) * (multipliers[key] ?? 1.0);
  }
  const absolute = normalizeToSum(raw);
  const deltas: Record<string, number> = {};
  for (const key of OUTCOMES) {
    deltas[key] = (absolute[key] ?? 0) - (base[key] ?? 0);
  }
  return { absolute, deltas };
}

const SCENARIO_PROPOSAL_MODIFIERS: Record<string, Record<string, number>> = {
  "sanctions-lifted": {
    feasibility: 0.15, coherence: 0.05, evidenceGrounding: 0.10,
    domesticSellability: 0.12, regionalStability: 0.20, implementability: 0.15,
    durability: 0.18,
  },
  "military-strikes": {
    feasibility: -0.30, coherence: -0.10, evidenceGrounding: -0.05,
    domesticSellability: -0.25, regionalStability: -0.35, implementability: -0.30,
    durability: -0.40,
  },
  "hormuz-closure": {
    feasibility: -0.25, coherence: -0.08, evidenceGrounding: -0.05,
    domesticSellability: -0.20, regionalStability: -0.30, implementability: -0.25,
    durability: -0.35,
  },
  "us-withdrawal": {
    feasibility: 0.05, coherence: 0.02, evidenceGrounding: 0.00,
    domesticSellability: 0.08, regionalStability: -0.05, implementability: 0.03,
    durability: -0.10,
  },
};

const SCORE_KEYS = ["feasibility", "coherence", "evidenceGrounding", "domesticSellability",
  "regionalStability", "implementability", "durability"] as const;

type ScoreKeys = typeof SCORE_KEYS[number];

type ScoreRecord = Record<ScoreKeys, number> & { composite?: number };

function computeProposalImpacts(
  proposals: Array<{ id: string; name: string; scores: Record<string, number> | null | undefined }>,
  scenarioId: string,
): Array<{ proposalId: string; proposalName: string; viabilityDelta: number; projectedComposite: number; favorabilityNote: string }> {
  const mods = SCENARIO_PROPOSAL_MODIFIERS[scenarioId] ?? {};
  return proposals.map(p => {
    const scores = p.scores as ScoreRecord | null | undefined;
    if (!scores) {
      return { proposalId: p.id, proposalName: p.name, viabilityDelta: 0, projectedComposite: 0, favorabilityNote: "No scores available" };
    }
    const baseComposite = scores.composite ?? (
      SCORE_KEYS.reduce((sum, k) => sum + (scores[k] ?? 0), 0) / SCORE_KEYS.length
    );
    let projectedSum = 0;
    let count = 0;
    for (const k of SCORE_KEYS) {
      const base = scores[k] ?? 0;
      const mod = mods[k] ?? 0;
      projectedSum += Math.max(0, Math.min(1, base + mod));
      count++;
    }
    const projectedComposite = count > 0 ? Math.round((projectedSum / count) * 100) / 100 : 0;
    const viabilityDelta = Math.round((projectedComposite - baseComposite) * 100) / 100;
    const favorabilityNote = viabilityDelta > 0.05
      ? "More viable under this scenario"
      : viabilityDelta < -0.05
        ? "Less viable under this scenario"
        : "Minimal change in viability";
    return { proposalId: p.id, proposalName: p.name, viabilityDelta, projectedComposite, favorabilityNote };
  });
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
    scores: proposalsTable.scores,
  }).from(proposalsTable);

  for (const def of SCENARIO_DEFS) {
    const { absolute, deltas } = applyScenario(base, def.multipliers);
    const proposalImpacts = computeProposalImpacts(
      proposals as Array<{ id: string; name: string; scores: Record<string, number> | null | undefined }>,
      def.id,
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
  }
}
