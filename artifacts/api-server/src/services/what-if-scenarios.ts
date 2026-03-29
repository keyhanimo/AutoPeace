import { db } from "@workspace/db";
import { whatIfScenariosTable, forecastsTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";

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
  const probs: Record<string, number> = {};
  for (const key of OUTCOMES) {
    const val = forecast[key] ?? forecast[`prob_${key}`] ?? 0;
    probs[key] = typeof val === "number" ? val : 0;
  }
  return probs;
}

function normalizeToSum(probs: Record<string, number>): Record<string, number> {
  const total = Object.values(probs).reduce((a, b) => a + b, 0);
  if (total <= 0) return probs;
  const normalized: Record<string, number> = {};
  for (const key of OUTCOMES) {
    normalized[key] = Math.round(((probs[key] ?? 0) / total) * 1000) / 10;
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
    deltas[key] = Math.round(((absolute[key] ?? 0) - (base[key] ?? 0)) * 10) / 10;
  }
  return { absolute, deltas };
}

export async function computeAndStoreWhatIfScenarios(cycleId?: string): Promise<void> {
  const latestForecasts = await db.select()
    .from(forecastsTable)
    .orderBy(desc(forecastsTable.createdAt))
    .limit(1);

  if (latestForecasts.length === 0) return;
  const latest = latestForecasts[0]!;
  const usedCycleId = cycleId ?? latest.cycleId ?? undefined;
  const base = extractProbs(latest as unknown as Record<string, unknown>);

  for (const def of SCENARIO_DEFS) {
    const { absolute, deltas } = applyScenario(base, def.multipliers);
    await db.insert(whatIfScenariosTable).values({
      id: def.id,
      name: def.name,
      description: def.description,
      triggerCondition: def.triggerCondition,
      basedOnCycleId: usedCycleId,
      probabilityDeltas: deltas,
      absoluteProbabilities: absolute,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: whatIfScenariosTable.id,
      set: {
        basedOnCycleId: usedCycleId,
        probabilityDeltas: deltas,
        absoluteProbabilities: absolute,
        updatedAt: new Date(),
      },
    });
  }
}
