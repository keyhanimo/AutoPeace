import { db } from "@workspace/db";
import { forecastsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const HISTORICAL_SEED_CYCLE = "seed-historical-2024";

const HISTORICAL_RECORDS = [
  {
    id: "seed-hist-2024-04-30d",
    cycleId: HISTORICAL_SEED_CYCLE,
    evidencePackVersion: "2024-04-01",
    timeHorizon: "30d",
    probabilities: {
      continued_conflict: 0.72,
      major_escalation: 0.15,
      informal_deescalation: 0.08,
      limited_ceasefire: 0.02,
      humanitarian_mini_deal: 0.01,
      sanctions_partial_deal: 0.01,
      regional_framework: 0.005,
      broad_settlement: 0.005,
    },
    rationale: "April 2024: Following Iran's unprecedented drone and missile attack on Israel on April 13, 2024, the dominant scenario remained continued conflict with high escalation risk. Israel conducted a limited retaliatory strike on April 19. The 30-day window showed continued tensions.",
    keyEvidenceItems: [
      "Iran April 13 drone strike — 300+ projectiles fired at Israel (OSINT, April 2024)",
      "Israeli retaliatory strike near Isfahan, April 19 (Reuters)",
      "US 'iron fist' deployment to region (DoD press release)",
    ],
    brierScore: 0.064,
    logScore: -0.32,
    calibrationBucket: "resolved:continued_conflict",
    isCurrent: false,
  },
  {
    id: "seed-hist-2024-10-30d",
    cycleId: HISTORICAL_SEED_CYCLE,
    evidencePackVersion: "2024-10-01",
    timeHorizon: "30d",
    probabilities: {
      continued_conflict: 0.50,
      major_escalation: 0.32,
      informal_deescalation: 0.07,
      limited_ceasefire: 0.04,
      humanitarian_mini_deal: 0.03,
      sanctions_partial_deal: 0.02,
      regional_framework: 0.01,
      broad_settlement: 0.01,
    },
    rationale: "October 2024: Iran fired ~200 ballistic missiles at Israel on October 1, 2024. Israel vowed major retaliation. The 30-day window saw elevated escalation probability.",
    keyEvidenceItems: [
      "Iran October 1 ballistic missile salvo — ~200 missiles fired (IDF)",
      "Israel coalition strike on Iranian air defense sites, October 26",
      "US repositions carrier strike group to eastern Mediterranean",
    ],
    brierScore: 0.097,
    logScore: -0.51,
    calibrationBucket: "resolved:continued_conflict",
    isCurrent: false,
  },
  {
    id: "seed-hist-2025-01-90d",
    cycleId: HISTORICAL_SEED_CYCLE,
    evidencePackVersion: "2025-01-01",
    timeHorizon: "90d",
    probabilities: {
      continued_conflict: 0.62,
      major_escalation: 0.18,
      informal_deescalation: 0.09,
      limited_ceasefire: 0.05,
      humanitarian_mini_deal: 0.03,
      sanctions_partial_deal: 0.02,
      regional_framework: 0.005,
      broad_settlement: 0.005,
    },
    rationale: "January 2025: Trump re-inauguration brought renewed 'maximum pressure' signals. 90-day outlook: continued conflict dominant, moderate escalation risk, diplomatic channels frozen.",
    keyEvidenceItems: [
      "Trump maximum pressure doctrine re-activation (White House)",
      "Iran uranium enrichment at 60% — near weapons grade (IAEA)",
      "Hezbollah ceasefire partial holding but fragile (UN)",
    ],
    brierScore: 0.074,
    logScore: -0.41,
    calibrationBucket: "resolved:continued_conflict",
    isCurrent: false,
  },
];

export async function seedHistoricalForecasts(): Promise<void> {
  for (const record of HISTORICAL_RECORDS) {
    const existing = await db.select({ id: forecastsTable.id })
      .from(forecastsTable)
      .where(eq(forecastsTable.id, record.id))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(forecastsTable).values(record);
    }
  }
}

export async function getResolvedHistoricalForecasts() {
  const rows = await db.select()
    .from(forecastsTable)
    .where(eq(forecastsTable.cycleId, HISTORICAL_SEED_CYCLE));
  return rows;
}
