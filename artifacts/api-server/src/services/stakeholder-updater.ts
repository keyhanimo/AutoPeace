import { db } from "@workspace/db";
import { stakeholdersTable, evidenceItemsTable } from "@workspace/db/schema";
import { eq, desc, gt } from "drizzle-orm";
import { logger } from "../lib/logger";
import { callLLM } from "./llm-router";
import { getModelConfig } from "./llm-router";

type StakeholderUpdate = {
  id: string;
  updatedGoals?: string;
  updatedRedLines?: string;
  updatedConstraints?: string;
  updatedProfileSummary?: string;
  reasoning: string;
};

function parseLLMJson<T>(text: string, fallback: T): T {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1]!.trim() : text.trim();
    return JSON.parse(jsonStr) as T;
  } catch {
    try {
      const firstBracket = text.indexOf("[");
      const lastBracket = text.lastIndexOf("]");
      if (firstBracket !== -1 && lastBracket !== -1) {
        return JSON.parse(text.slice(firstBracket, lastBracket + 1)) as T;
      }
      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as T;
      }
    } catch { /* fallthrough */ }
    return fallback;
  }
}

export async function updateStakeholderProfilesFromEvidence(
  cycleId: string,
  lookbackHours: number = 48,
): Promise<{ updated: number; skipped: number }> {
  const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

  const recentEvidence = await db.select()
    .from(evidenceItemsTable)
    .where(gt(evidenceItemsTable.ingestedAt, cutoff))
    .orderBy(desc(evidenceItemsTable.ingestedAt))
    .limit(50);

  if (recentEvidence.length === 0) {
    logger.info({ cycleId }, "No recent evidence for stakeholder update");
    return { updated: 0, skipped: 0 };
  }

  const stakeholders = await db.select().from(stakeholdersTable);
  const stakeholderMap = new Map(stakeholders.map(s => [s.id, s]));

  const evidenceSummary = recentEvidence
    .map(e => `[${e.source}] ${e.title}: ${(e.text ?? "").slice(0, 300)}`)
    .join("\n\n");

  const stakeholderSummary = stakeholders
    .filter(s => ["required", "critical", "influential"].includes(s.tier))
    .map(s => `- ${s.id} (${s.name}): Goals: ${s.goals.slice(0, 150)}. Red lines: ${s.redLines.slice(0, 150)}. Constraints: ${s.constraints.slice(0, 150)}. Profile: ${s.profileSummary.slice(0, 150)}`)
    .join("\n");

  const modelConfig = await getModelConfig();

  const systemPrompt = `You are a geopolitical analyst updating stakeholder profiles based on new evidence.
Only propose updates when the evidence clearly shows a MATERIAL CHANGE in a stakeholder's position, goals, constraints, or red lines.
Do NOT update profiles for minor news or restatements of known positions.
Each update must cite the specific evidence that justifies the change.
Output valid JSON only.`;

  const prompt = `RECENT EVIDENCE (last ${lookbackHours} hours):
${evidenceSummary.slice(0, 6000)}

CURRENT STAKEHOLDER PROFILES (required/critical/influential only):
${stakeholderSummary}

Based on this evidence, identify any stakeholders whose profiles need updating.
Only update when there is CLEAR evidence of a material shift in position, new demands, changed constraints, or new strategic behavior.

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

  const updates = parseLLMJson<StakeholderUpdate[]>(content, []);

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

  logger.info({ cycleId, updated, skipped, evidenceCount: recentEvidence.length }, "Stakeholder profile update complete");
  return { updated, skipped };
}
