import { db } from "@workspace/db";
import { costOfWarTable } from "@workspace/db/schema";
import { randomUUID } from "node:crypto";

const COST_DATA = [
  {
    stakeholderId: "iran",
    economic: {
      oilPriceImpactUsd: -45000000000,
      gdpImpactPct: -3.8,
      sanctionsCostUsd: 200000000000,
      militaryExpenditureUsd: 25000000000,
      tradeDisruptionUsd: 80000000000,
      totalUsd: 350000000000,
      sources: [
        { metric: "Sanctions total cost since 2018", sourceName: "IMF/World Bank", sourceUrl: "https://imf.org", date: "2024-01-01", uncertaintyRange: "±20%" },
      ],
    },
    humanitarian: {
      casualtiesEstimate: 1200,
      displacedPersons: 0,
      infrastructureDamageUsd: 15000000000,
      foodInsecurityAffected: 12000000,
      sources: [
        { metric: "Civilian casualties from conflict-linked incidents", sourceName: "ACLED", sourceUrl: "https://acleddata.com", date: "2024-01-01", uncertaintyRange: "±30%" },
      ],
    },
    strategic: {
      proliferationRiskLevel: "high",
      escalationProbability30d: 0.18,
      allianceStabilityIndex: 0.42,
      sources: [
        { metric: "Nuclear enrichment level", sourceName: "IAEA", sourceUrl: "https://iaea.org", date: "2024-01-01", uncertaintyRange: "low" },
      ],
    },
  },
  {
    stakeholderId: "us",
    economic: {
      oilPriceImpactUsd: -30000000000,
      gdpImpactPct: -0.2,
      sanctionsCostUsd: 5000000000,
      militaryExpenditureUsd: 45000000000,
      tradeDisruptionUsd: 25000000000,
      totalUsd: 105000000000,
      sources: [
        { metric: "Military deployment costs", sourceName: "DoD", sourceUrl: "https://defense.gov", date: "2024-01-01", uncertaintyRange: "±10%" },
      ],
    },
    humanitarian: {
      casualtiesEstimate: 45,
      displacedPersons: 0,
      infrastructureDamageUsd: 2000000000,
      foodInsecurityAffected: 0,
      sources: [
        { metric: "Service member casualties in region", sourceName: "DoD", sourceUrl: "https://defense.gov", date: "2024-01-01", uncertaintyRange: "low" },
      ],
    },
    strategic: {
      proliferationRiskLevel: "medium",
      escalationProbability30d: 0.12,
      allianceStabilityIndex: 0.71,
      sources: [
        { metric: "Alliance cohesion index", sourceName: "RAND", sourceUrl: "https://rand.org", date: "2024-01-01", uncertaintyRange: "±15%" },
      ],
    },
  },
  {
    stakeholderId: "israel",
    economic: {
      oilPriceImpactUsd: -8000000000,
      gdpImpactPct: -2.1,
      sanctionsCostUsd: 0,
      militaryExpenditureUsd: 23000000000,
      tradeDisruptionUsd: 12000000000,
      totalUsd: 43000000000,
      sources: [
        { metric: "Military expenditure 2024", sourceName: "SIPRI", sourceUrl: "https://sipri.org", date: "2024-01-01", uncertaintyRange: "±5%" },
      ],
    },
    humanitarian: {
      casualtiesEstimate: 1200,
      displacedPersons: 200000,
      infrastructureDamageUsd: 8000000000,
      foodInsecurityAffected: 500000,
      sources: [
        { metric: "Conflict-related casualties and displacement", sourceName: "OCHA", sourceUrl: "https://ochaopt.org", date: "2024-01-01", uncertaintyRange: "±20%" },
      ],
    },
    strategic: {
      proliferationRiskLevel: "high",
      escalationProbability30d: 0.22,
      allianceStabilityIndex: 0.58,
      sources: [
        { metric: "Regional threat assessment", sourceName: "RAND", sourceUrl: "https://rand.org", date: "2024-01-01", uncertaintyRange: "±15%" },
      ],
    },
  },
];

export async function seedCosts(): Promise<void> {
  for (const c of COST_DATA) {
    await db.insert(costOfWarTable).values({
      id: randomUUID(),
      stakeholderId: c.stakeholderId,
      economic: c.economic,
      humanitarian: c.humanitarian,
      strategic: c.strategic,
      dataVersion: "1.0",
    }).onConflictDoNothing();
  }
}
