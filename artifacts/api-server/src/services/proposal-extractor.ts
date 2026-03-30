import { db } from "@workspace/db";
import { evidenceItemsTable, proposalsTable, adminConfigTable } from "@workspace/db/schema";
import { desc, eq, and, isNull, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { logger } from "../lib/logger";
import {
  evaluateStakeholders,
  evaluateDomesticAudiences,
  runRedTeam,
  runNegotiator,
  judgeAndScore,
  runMetaEvaluator,
  generateDiagnosis,
  computeWhatWouldItTake,
  type ModelConfig,
  type DealTerms,
} from "./deal-engine";
import { parseLLMJson } from "./scoring";

let _anthropic: import("@anthropic-ai/sdk").Anthropic | null = null;
async function getAnthropic() {
  if (!_anthropic) {
    const mod = await import("@workspace/integrations-anthropic-ai");
    _anthropic = mod.anthropic;
  }
  return _anthropic;
}

function proposalStableId(name: string, source: string): string {
  const key = `proposal::${name.toLowerCase().trim()}::${source.toLowerCase().trim()}`;
  return `news-${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
}

async function getModelConfig(): Promise<ModelConfig> {
  try {
    const rows = await db.select().from(adminConfigTable);
    const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]));
    const anthropicModel = cfg["anthropicModel"] ?? "claude-sonnet-4-5";
    const openaiModel = cfg["openaiModel"] ?? "gpt-4o";
    const geminiModel = cfg["geminiModel"] ?? "gemini-2.5-flash";
    return {
      anthropicModel,
      openaiModel,
      geminiModel,
      generationProvider: (cfg["generationProvider"] ?? "anthropic") as "anthropic" | "openai" | "gemini",
      generationModel: cfg["generationModel"] ?? anthropicModel,
      evaluationProvider: (cfg["evaluationProvider"] ?? "openai") as "anthropic" | "openai" | "gemini",
      evaluationModel: cfg["evaluationModel"] ?? openaiModel,
      adversarialProvider: (cfg["adversarialProvider"] ?? "gemini") as "anthropic" | "openai" | "gemini",
      adversarialModel: cfg["adversarialModel"] ?? geminiModel,
      judgePanelAnthropicModel: cfg["judgePanelAnthropicModel"] || undefined,
      judgePanelOpenaiModel: cfg["judgePanelOpenaiModel"] || undefined,
      judgePanelGeminiModel: cfg["judgePanelGeminiModel"] || undefined,
    };
  } catch {
    return {
      anthropicModel: "claude-sonnet-4-5", openaiModel: "gpt-4o", geminiModel: "gemini-2.5-flash",
      generationProvider: "anthropic", generationModel: "claude-sonnet-4-5",
      evaluationProvider: "openai", evaluationModel: "gpt-4o",
      adversarialProvider: "gemini", adversarialModel: "gemini-2.5-flash",
    };
  }
}

type ExtractedProposal = {
  name: string;
  source: string;
  summary: string;
  terms: {
    nuclearProtocol: string;
    sanctionsRelief: string;
    hormuzArrangements: string;
    humanitarianProvisions: string;
    verificationMechanism: string;
    timelineYears: number;
    sequencing: string;
    additionalClauses: string[];
    stakeholderCommitments?: Record<string, string>;
  };
  knownResponses: Record<string, string>;
  confidence: number;
};

const EXTRACTION_SYSTEM_PROMPT = `You are a peace-research analyst specializing in Iran-related diplomacy.
Your task: scan news articles for mentions of NEW peace proposals, diplomatic frameworks, deal offers, or policy plans related to the Iran conflict.

IMPORTANT CRITERIA:
- Only extract CONCRETE proposals with actual policy substance (specific nuclear terms, sanctions conditions, timelines, etc.)
- Do NOT extract vague diplomatic statements like "we are open to talks" or "peace is important"
- Do NOT extract analysis pieces or opinion columns — only actual proposals or frameworks from real actors
- The proposal must be attributable to a specific real-world actor (a government, international body, think tank, etc.)
- Must contain enough detail to evaluate as a deal framework

Return a JSON object with a "proposals" key containing an array. Return {"proposals": []} if no actionable proposals are found.`;

const EXTRACTION_USER_PROMPT = (articles: string) => `Scan these recent news articles about the Iran conflict. Extract any NEW peace proposals, diplomatic frameworks, or deal offers.

ARTICLES:
${articles}

For each genuine proposal found, return:
{
  "proposals": [
    {
      "name": "Short descriptive name of the proposal",
      "source": "Who proposed it (e.g., 'EU3 Foreign Ministers / March 2026')",
      "summary": "2-3 sentence summary of the proposal",
      "terms": {
        "nuclearProtocol": "What the proposal says about nuclear issues",
        "sanctionsRelief": "What the proposal says about sanctions",
        "hormuzArrangements": "Strait of Hormuz / maritime provisions (or empty string if not mentioned)",
        "humanitarianProvisions": "Humanitarian provisions (or empty string if not mentioned)",
        "verificationMechanism": "Verification and monitoring provisions",
        "timelineYears": 5,
        "sequencing": "How steps would be ordered",
        "additionalClauses": ["Other notable provisions"],
        "stakeholderCommitments": {
          "actor_id": "What this actor commits to do (only include actors with explicit commitments mentioned)"
        }
      },
      "knownResponses": {
        "actor_name": "Their known reaction (if mentioned in articles)"
      },
      "confidence": 0.0-1.0
    }
  ]
}

Only include proposals with confidence >= 0.6. Return {"proposals": []} if nothing qualifies.`;

export async function extractProposalsFromEvidence(cycleId?: string): Promise<number> {
  const recentItems = await db
    .select()
    .from(evidenceItemsTable)
    .where(
      and(
        eq(evidenceItemsTable.evidenceType, "diplomatic"),
        eq(evidenceItemsTable.isProcessed, false),
      )
    )
    .orderBy(desc(evidenceItemsTable.publishedAt))
    .limit(30);

  if (recentItems.length === 0) {
    logger.info("No unprocessed diplomatic evidence items — skipping proposal extraction");
    return 0;
  }

  const articleBatch = recentItems
    .map((item, i) => `--- ARTICLE ${i + 1} ---\nTitle: ${item.title}\nSource: ${item.source}\nDate: ${item.publishedAt.toISOString().slice(0, 10)}\nURL: ${item.sourceUrl}\n${item.text}\n`)
    .join("\n");

  let extracted: ExtractedProposal[] = [];
  try {
    const anthropic = await getAnthropic();
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 3000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: EXTRACTION_USER_PROMPT(articleBatch) }],
    });

    const text = resp.content[0]?.type === "text" ? resp.content[0].text : "{}";
    const parsed = parseLLMJson(text) as { proposals?: ExtractedProposal[] } | ExtractedProposal[];
    const rawProposals = Array.isArray(parsed) ? parsed : (parsed.proposals ?? []);
    extracted = rawProposals.filter(p =>
      p && typeof p.name === "string" && typeof p.source === "string" &&
      p.terms && typeof p.terms === "object" && p.confidence >= 0.6
    );

    logger.info({ cycleId, articlesScanned: recentItems.length, proposalsFound: extracted.length }, "Proposal extraction complete");
  } catch (err) {
    logger.error({ err, cycleId }, "Proposal extraction LLM call failed");
    return 0;
  }

  if (extracted.length === 0) {
    await db
      .update(evidenceItemsTable)
      .set({ isProcessed: true })
      .where(
        sql`${evidenceItemsTable.id} IN (${sql.join(recentItems.map(i => sql`${i.id}`), sql`, `)})`
      );
    return 0;
  }

  const existingProposals = await db
    .select({ id: proposalsTable.id, name: proposalsTable.name })
    .from(proposalsTable);
  const seenNames = new Set(existingProposals.map(p => p.name.toLowerCase().trim()));
  const seenIds = new Set(existingProposals.map(p => p.id));

  const modelConfig = await getModelConfig();
  let created = 0;

  for (const proposal of extracted) {
    const proposalId = proposalStableId(proposal.name, proposal.source);
    const nameLower = proposal.name.toLowerCase().trim();

    if (seenIds.has(proposalId) || seenNames.has(nameLower)) {
      logger.debug({ name: proposal.name }, "Proposal already exists — skipping");
      continue;
    }

    const isDuplicate = [...seenNames].some(existing => {
      const words1 = new Set(nameLower.split(/\s+/));
      const words2 = new Set(existing.split(/\s+/));
      const intersection = [...words1].filter(w => words2.has(w) && w.length > 3);
      return intersection.length >= 3;
    });

    if (isDuplicate) {
      logger.debug({ name: proposal.name }, "Proposal looks like a duplicate — skipping");
      continue;
    }

    try {
      const terms: DealTerms = {
        nuclearProtocol: proposal.terms?.nuclearProtocol || "",
        sanctionsRelief: proposal.terms?.sanctionsRelief || "",
        hormuzArrangements: proposal.terms?.hormuzArrangements || "",
        humanitarianProvisions: proposal.terms?.humanitarianProvisions || "",
        verificationMechanism: proposal.terms?.verificationMechanism || "",
        timelineYears: proposal.terms?.timelineYears || 5,
        sequencing: proposal.terms?.sequencing || "",
        additionalClauses: proposal.terms?.additionalClauses || [],
        stakeholderCommitments: proposal.terms?.stakeholderCommitments || undefined,
      };

      const initialEvals = Object.fromEntries(
        Object.entries(proposal.knownResponses || {}).map(([actor, response]) => [
          actor,
          { verdict: "conditional" as const, rationale: response, redLineViolations: [] as string[], conditions: [] as string[] },
        ])
      );

      const inserted = await db.insert(proposalsTable).values({
        id: proposalId,
        name: proposal.name,
        source: proposal.source,
        submittedBy: "auto-extractor",
        summary: proposal.summary,
        terms,
        scores: null,
        stakeholderEvaluations: initialEvals,
        knownResponses: proposal.knownResponses || {},
        whatWouldItTake: [],
      }).onConflictDoNothing().returning({ id: proposalsTable.id });

      if (inserted.length === 0) {
        logger.debug({ proposalId }, "Proposal insert was a no-op (conflict) — skipping");
        seenIds.add(proposalId);
        seenNames.add(nameLower);
        continue;
      }

      seenIds.add(proposalId);
      seenNames.add(nameLower);
      created++;

      logger.info({ proposalId, name: proposal.name }, "Auto-extracted proposal created — running AI evaluation");

      try {
        const { evaluations: aiEvals } = await evaluateStakeholders(terms, modelConfig);
        const { evaluations: domesticEvals } = await evaluateDomesticAudiences(terms, modelConfig);
        const { results: redTeamResults } = await runRedTeam(terms, modelConfig);
        const { result: negotiatorResult } = await runNegotiator(terms, aiEvals, {}, modelConfig);

        const revisedTerms: DealTerms = {
          ...terms,
          ...(negotiatorResult.revisedTermsPartial as Partial<DealTerms>),
        };

        const { scores: aiScores } = await judgeAndScore(revisedTerms, aiEvals, redTeamResults, domesticEvals, modelConfig);

        await runMetaEvaluator(terms, aiScores, negotiatorResult, aiEvals, null, {}, modelConfig);
        await generateDiagnosis(terms, aiEvals, redTeamResults, aiScores, modelConfig);

        const rawWwit = await computeWhatWouldItTake(terms, aiEvals, modelConfig);

        const whatWouldItTake = rawWwit.map(item => ({
          dimension: item.stakeholder,
          currentGap: "Stakeholder rejects or conditionally accepts current terms",
          requiredChange: item.requirement,
          feasibility: item.feasibility,
        }));

        await db.update(proposalsTable)
          .set({
            stakeholderEvaluations: aiEvals,
            scores: aiScores,
            whatWouldItTake,
            updatedAt: new Date(),
          })
          .where(eq(proposalsTable.id, proposalId));

        logger.info({ proposalId, composite: aiScores.composite }, "Auto-extracted proposal evaluated with full pipeline");
      } catch (evalErr) {
        logger.warn({ proposalId, err: evalErr }, "AI evaluation failed for auto-extracted proposal");
      }
    } catch (insertErr) {
      logger.warn({ name: proposal.name, err: insertErr }, "Failed to insert auto-extracted proposal");
    }
  }

  await db
    .update(evidenceItemsTable)
    .set({ isProcessed: true })
    .where(
      sql`${evidenceItemsTable.id} IN (${sql.join(recentItems.map(i => sql`${i.id}`), sql`, `)})`
    );

  logger.info({ cycleId, extracted: extracted.length, created }, "Proposal extraction pipeline complete");
  return created;
}
