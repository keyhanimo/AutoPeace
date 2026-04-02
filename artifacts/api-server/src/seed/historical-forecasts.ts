import { db } from "@workspace/db";
import { forecastsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const HISTORICAL_SEED_CYCLE = "seed-historical-2024";

const CURRENT_SEED_CYCLE = "seed-current-2025-03";

const CURRENT_FORECASTS = [
  {
    id: "seed-current-2025-03-10d",
    cycleId: CURRENT_SEED_CYCLE,
    evidencePackVersion: "2025-03-01",
    timeHorizon: "10d",
    probabilities: {
      continued_conflict: 0.68,
      major_escalation: 0.17,
      informal_deescalation: 0.06,
      limited_ceasefire: 0.04,
      humanitarian_mini_deal: 0.02,
      sanctions_partial_deal: 0.01,
      regional_framework: 0.01,
      broad_settlement: 0.01,
    },
    rationale: "March 2025 (10d): In a 10-day window, the status quo strongly dominates. Maximum pressure campaign continues with no imminent diplomatic openings. Gaza ceasefire holding but fragile. Escalation risk is present but unlikely to crystallize within 10 days absent a specific trigger event. Very little probability mass on any positive outcomes at this ultra-short horizon.",
    keyEvidenceItems: [
      "Trump executive order expanding Iran sanctions (Jan 2025)",
      "IAEA: Iran enrichment at 60%, ~4kg near-weapons-grade material (Feb 2025)",
      "No scheduled US-Iran diplomatic contacts in March 2025",
    ],
    isCurrent: true,
    isHistorical: false,
  },
  {
    id: "seed-current-2025-03-30d",
    cycleId: CURRENT_SEED_CYCLE,
    evidencePackVersion: "2025-03-01",
    timeHorizon: "30d",
    probabilities: {
      continued_conflict: 0.61,
      major_escalation: 0.19,
      informal_deescalation: 0.08,
      limited_ceasefire: 0.05,
      humanitarian_mini_deal: 0.03,
      sanctions_partial_deal: 0.02,
      regional_framework: 0.01,
      broad_settlement: 0.01,
    },
    rationale: "March 2025 (30d): Trump's maximum pressure campaign intensifies. Iran uranium enrichment at 60%. Gaza ceasefire fragile. Probability of informal deescalation remains low as no diplomatic track is active between US-Iran.",
    keyEvidenceItems: [
      "IAEA: Iran enrichment at 60%, ~4kg near-weapons-grade material (Feb 2025)",
      "Trump executive order expanding Iran sanctions (Jan 2025)",
      "Gaza ceasefire Phase 1 holding but Rafah offensive risk remains",
    ],
    isCurrent: true,
  },
  {
    id: "seed-current-2025-03-90d",
    cycleId: CURRENT_SEED_CYCLE,
    evidencePackVersion: "2025-03-01",
    timeHorizon: "90d",
    probabilities: {
      continued_conflict: 0.55,
      major_escalation: 0.22,
      informal_deescalation: 0.11,
      limited_ceasefire: 0.05,
      humanitarian_mini_deal: 0.04,
      sanctions_partial_deal: 0.02,
      regional_framework: 0.005,
      broad_settlement: 0.005,
    },
    rationale: "March 2025 (90d): Over 90 days, there is moderate chance of informal signals. Escalation risk remains elevated given Israeli political pressure for preemptive action on nuclear sites. Diplomatic back-channels via Oman remain open.",
    keyEvidenceItems: [
      "Oman diplomatic channel partially active (Reuters, Mar 2025)",
      "Israeli PM coalition pressure for military action on Fordow",
      "Iran Revolutionary Guard command structure changes",
    ],
    isCurrent: true,
  },
  {
    id: "seed-current-2025-03-180d",
    cycleId: CURRENT_SEED_CYCLE,
    evidencePackVersion: "2025-03-01",
    timeHorizon: "180d",
    probabilities: {
      continued_conflict: 0.48,
      major_escalation: 0.21,
      informal_deescalation: 0.14,
      limited_ceasefire: 0.07,
      humanitarian_mini_deal: 0.05,
      sanctions_partial_deal: 0.03,
      regional_framework: 0.01,
      broad_settlement: 0.01,
    },
    rationale: "March 2025 (180d): Six months offers more runway for diplomatic back-channels or economic pressure to shift Iranian calculus. However, nuclear timeline creates urgency for potential Israeli preemptive action. Uncertainty is highest at this horizon.",
    keyEvidenceItems: [
      "Iran nuclear breakout timeline estimated at 3-4 months (RAND, 2025)",
      "China-Iran strategic partnership deepening (trade data)",
      "US-GCC talks on collective deterrence framework",
    ],
    isCurrent: true,
  },
  {
    id: "seed-current-2025-03-1y",
    cycleId: CURRENT_SEED_CYCLE,
    evidencePackVersion: "2025-03-01",
    timeHorizon: "1y",
    probabilities: {
      continued_conflict: 0.40,
      major_escalation: 0.18,
      informal_deescalation: 0.17,
      limited_ceasefire: 0.10,
      humanitarian_mini_deal: 0.07,
      sanctions_partial_deal: 0.05,
      regional_framework: 0.02,
      broad_settlement: 0.01,
    },
    rationale: "March 2025 (1y): Over a full year, diplomatic outcomes become more plausible. Either a negotiated track emerges, or conflict escalates to a defining confrontation over Iran's nuclear program. The distribution flattens considerably at this horizon.",
    keyEvidenceItems: [
      "Historical base rate: Iran deals take 18+ months of back-channel prep",
      "JCPOA negotiations precedent: 2013-2015 trajectory",
      "Regional security architecture negotiations via P5+1 successor track",
    ],
    isCurrent: true,
  },
];

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

  const hasCurrent = await db.select({ id: forecastsTable.id })
    .from(forecastsTable)
    .where(eq(forecastsTable.isCurrent, true))
    .limit(1);

  if (hasCurrent.length === 0) {
    for (const record of CURRENT_FORECASTS) {
      const existing = await db.select({ id: forecastsTable.id })
        .from(forecastsTable)
        .where(eq(forecastsTable.id, record.id))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(forecastsTable).values(record);
      }
    }
  }
}

export async function getResolvedHistoricalForecasts() {
  const rows = await db.select()
    .from(forecastsTable)
    .where(eq(forecastsTable.cycleId, HISTORICAL_SEED_CYCLE));
  return rows;
}
