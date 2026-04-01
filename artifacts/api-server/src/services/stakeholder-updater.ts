import { db } from "@workspace/db";
import { stakeholdersTable, evidenceItemsTable } from "@workspace/db/schema";
import { desc, isNull } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { callLLM } from "./llm-router";
import { getModelConfig } from "./llm-router";

const PIPELINE_STAKEHOLDER_IDS = [
  "iran", "us", "israel",
  "saudi_arabia", "iaea", "russia", "china", "eu3",
  "uae", "qatar", "oman", "turkey", "iraq", "egypt",
  "india", "japan", "south_korea", "jordan", "pakistan",
  "ukraine", "global_north", "global_south_energy_importers",
  "global_south_energy_exporters",
];

type StakeholderUpdate = {
  id: string;
  updatedGoals?: string;
  updatedRedLines?: string;
  updatedConstraints?: string;
  updatedProfileSummary?: string;
  reasoning: string;
};

function parseLLMJson<T>(text: string, label: string): T {
  const strategies: Array<{ name: string; extract: () => string }> = [
    { name: "fenced-json", extract: () => { const m = text.match(/```(?:json)?\s*([\s\S]*?)```/); if (!m?.[1]) throw new Error("no match"); return m[1].trim(); } },
    { name: "array-regex", extract: () => { const i = text.indexOf("["); const j = text.lastIndexOf("]"); if (i === -1 || j === -1) throw new Error("no match"); return text.slice(i, j + 1); } },
    { name: "object-regex", extract: () => { const i = text.indexOf("{"); const j = text.lastIndexOf("}"); if (i === -1 || j === -1) throw new Error("no match"); return text.slice(i, j + 1); } },
  ];
  for (const strategy of strategies) {
    try {
      return JSON.parse(strategy.extract()) as T;
    } catch { /* try next */ }
  }
  logger.error({ label, textSnippet: text.slice(0, 300) }, "parseLLMJson failed — could not extract JSON");
  throw new Error(`Failed to parse LLM JSON for ${label}`);
}

export async function updateStakeholderProfilesFromEvidence(
  cycleId: string,
): Promise<{ updated: number; skipped: number }> {
  const cycleEvidence = await db.select()
    .from(evidenceItemsTable)
    .where(isNull(evidenceItemsTable.influencedCycleId))
    .orderBy(desc(evidenceItemsTable.ingestedAt))
    .limit(80);

  if (cycleEvidence.length === 0) {
    logger.info({ cycleId }, "No cycle evidence for stakeholder update");
    return { updated: 0, skipped: 0 };
  }

  const stakeholders = await db.select().from(stakeholdersTable);
  const stakeholderMap = new Map(stakeholders.map(s => [s.id, s]));

  const relevanceMap = new Map<string, string[]>();
  for (const ev of cycleEvidence) {
    const relevance = ev.stakeholderRelevance as string[] | null;
    if (relevance && Array.isArray(relevance)) {
      for (const stakeholderId of relevance) {
        if (!relevanceMap.has(stakeholderId)) {
          relevanceMap.set(stakeholderId, []);
        }
        relevanceMap.get(stakeholderId)!.push(
          `[${ev.source}] ${ev.title}: ${(ev.text ?? "").slice(0, 200)}`
        );
      }
    }
  }

  const generalEvidence = cycleEvidence
    .map(e => `[${e.source}] ${e.title}: ${(e.text ?? "").slice(0, 200)}`)
    .join("\n\n");

  const stakeholderSummary = stakeholders
    .map(s => {
      const relevantEvidence = relevanceMap.get(s.id);
      const evidenceSection = relevantEvidence
        ? `\n  DIRECTLY RELEVANT EVIDENCE (${relevantEvidence.length} items):\n  ${relevantEvidence.slice(0, 5).join("\n  ")}`
        : "";
      return `- ${s.id} [${s.tier}] (${s.name}): Goals: ${s.goals.slice(0, 120)}. Red lines: ${s.redLines.slice(0, 120)}. Profile: ${s.profileSummary.slice(0, 120)}${evidenceSection}`;
    })
    .join("\n");

  const modelConfig = await getModelConfig();

  const systemPrompt = `You are a geopolitical analyst updating stakeholder profiles based on new evidence.
Only propose updates when the evidence clearly shows a MATERIAL CHANGE in a stakeholder's position, goals, constraints, or red lines.
Do NOT update profiles for minor news or restatements of known positions.
Each update must cite the specific evidence that justifies the change.
You may update ANY stakeholder — core parties, regional actors, or contextual blocs — if the evidence warrants it.
Output valid JSON only.`;

  const prompt = `CYCLE EVIDENCE (${cycleEvidence.length} items from cycle ${cycleId}):
${generalEvidence.slice(0, 5000)}

ALL STAKEHOLDER PROFILES (with directly relevant evidence tagged per stakeholder):
${stakeholderSummary.slice(0, 6000)}

Based on this cycle's evidence, identify any stakeholders whose profiles need updating.
Only update when there is CLEAR evidence of a material shift in position, new demands, changed constraints, or new strategic behavior.
Pay special attention to stakeholders with DIRECTLY RELEVANT EVIDENCE tagged above.

Return a JSON array of updates (empty array if no updates needed):
[{
  "id": "stakeholder_id",
  "updatedGoals": "new goals text (only if changed, otherwise omit)",
  "updatedRedLines": "new red lines text (only if changed, otherwise omit)",
  "updatedConstraints": "new constraints text (only if changed, otherwise omit)",
  "updatedProfileSummary": "new profile summary (only if changed, otherwise omit)",
  "reasoning": "what evidence triggered this update"
}]`;

  const { content } = await callLLM(
    prompt,
    systemPrompt,
    modelConfig.extractionProvider ?? "anthropic",
    modelConfig.extractionModel ?? "claude-sonnet-4-20250514",
  );

  const updates = parseLLMJson<StakeholderUpdate[]>(content, "stakeholder-profile-update");

  let updated = 0;
  let skipped = 0;

  for (const update of updates) {
    const existing = stakeholderMap.get(update.id);
    if (!existing) {
      logger.warn({ stakeholderId: update.id }, "Stakeholder update references unknown ID, skipping");
      skipped++;
      continue;
    }

    const setValues: Record<string, unknown> = { updatedAt: new Date() };
    if (update.updatedGoals) setValues["goals"] = update.updatedGoals;
    if (update.updatedRedLines) setValues["redLines"] = update.updatedRedLines;
    if (update.updatedConstraints) setValues["constraints"] = update.updatedConstraints;
    if (update.updatedProfileSummary) setValues["profileSummary"] = update.updatedProfileSummary;

    if (Object.keys(setValues).length <= 1) {
      skipped++;
      continue;
    }

    await db.update(stakeholdersTable)
      .set(setValues)
      .where(eq(stakeholdersTable.id, update.id));

    logger.info({ stakeholderId: update.id, reasoning: update.reasoning }, "Updated stakeholder profile from evidence");
    updated++;
  }

  logger.info({ cycleId, updated, skipped, evidenceCount: cycleEvidence.length, relevantStakeholders: relevanceMap.size }, "Stakeholder profile update complete");
  return { updated, skipped };
}

export { PIPELINE_STAKEHOLDER_IDS };
