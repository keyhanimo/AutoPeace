import { db } from "@workspace/db";
import { evidenceItemsTable, proposalsTable } from "@workspace/db/schema";
import { desc, eq, sql, isNull, and } from "drizzle-orm";
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
  getRecentEvidenceSummary,
  type DealTerms,
} from "./deal-engine";
import { callLLM, getModelConfig, resolveFallbackConfig, type ModelConfig } from "./llm-router";
import { parseLLMJson } from "./scoring";

async function evaluatePendingProposals(): Promise<number> {
  const pending = await db.select()
    .from(proposalsTable)
    .where(and(isNull(proposalsTable.scores), eq(proposalsTable.submittedBy, "auto-extractor")))
    .limit(1);

  if (pending.length === 0) return 0;

  const modelConfig = await getModelConfig();
  let evaluated = 0;

  for (const proposal of pending) {
    const terms = proposal.terms as DealTerms;
    if (!terms) continue;

    logger.info({ proposalId: proposal.id, name: proposal.name }, "Evaluating previously unevaluated proposal");

    try {
      const evidenceSummary = await getRecentEvidenceSummary();
      const { evaluations: aiEvals } = await evaluateStakeholders(terms, modelConfig, evidenceSummary);
      const { evaluations: domesticEvals } = await evaluateDomesticAudiences(terms, modelConfig, evidenceSummary);
      const { results: redTeamResults } = await runRedTeam(terms, modelConfig, evidenceSummary);
      const { result: negotiatorResult } = await runNegotiator(terms, aiEvals, {}, modelConfig);

      const revisedTerms: DealTerms = {
        ...terms,
        ...(negotiatorResult.revisedTermsPartial as Partial<DealTerms>),
      };

      const { scores: aiScores } = await judgeAndScore(revisedTerms, aiEvals, redTeamResults, domesticEvals, modelConfig, evidenceSummary);

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
        .where(eq(proposalsTable.id, proposal.id));

      logger.info({ proposalId: proposal.id, composite: aiScores.composite }, "Pending proposal evaluated successfully");
      evaluated++;
    } catch (evalErr) {
      logger.warn({ proposalId: proposal.id, err: evalErr }, "AI evaluation failed for pending proposal");
    }
  }

  return evaluated;
}

function proposalStableId(name: string, source: string): string {
  const key = `proposal::${name.toLowerCase().trim()}::${source.toLowerCase().trim()}`;
  return `news-${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
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
Your task: scan news articles and policy publications for mentions of NEW peace proposals, diplomatic frameworks, deal offers, or policy plans related to the Iran conflict.

IMPORTANT CRITERIA:
- Extract CONCRETE proposals with actual policy substance (specific nuclear terms, sanctions conditions, timelines, etc.)
- Also extract proposals that are described indirectly — e.g. "Zarif outlined a plan in Foreign Affairs" or "China and Pakistan issued a joint framework" — infer the structured terms from the article's description of the proposal
- Include proposals from think tanks, former officials, policy journals (Foreign Affairs, Brookings, Carnegie, etc.), and joint government statements — not only currently serving officials
- Do NOT extract vague diplomatic statements like "we are open to talks" or "peace is important"
- The proposal must be attributable to a specific real-world actor (a government, international body, think tank, former official, etc.)
- Must contain enough detail to evaluate as a deal framework
- When an article describes a proposal's terms in narrative form, extract and structure those terms even if they are not presented as a formal list

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

const KEY_ACTORS = [
  "zarif", "khamenei", "rouhani", "pezeshkian", "araghchi", "raisi",
  "trump", "biden", "blinken", "sullivan",
  "netanyahu", "gallant", "gantz",
  "wang yi", "xi jinping",
  "putin", "lavrov",
  "macron", "scholz",
  "china", "pakistan", "russia", "turkey", "saudi",
  "eu", "iaea", "un", "nato",
  "brookings", "carnegie", "csis", "crisis group", "rand",
  "foreign affairs", "foreign policy",
];

function extractKeyActors(text: string): Set<string> {
  const lower = text.toLowerCase();
  return new Set(KEY_ACTORS.filter(actor => lower.includes(actor)));
}

function significantWords(text: string): Set<string> {
  const stopWords = new Set(["the", "and", "for", "with", "from", "that", "this", "have", "will", "been", "into", "about", "their", "would", "could", "should", "between", "through", "under", "over", "after", "before", "point", "plan", "deal", "framework", "proposal", "initiative", "peace", "iran", "iranian"]);
  return new Set(
    text.toLowerCase().split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w))
  );
}

function checkDuplicate(
  proposal: ExtractedProposal,
  nameLower: string,
  seenNames: Set<string>,
  existingProposals: { id: string; name: string; source?: string | null; summary?: string | null }[],
): string | false {
  for (const existing of seenNames) {
    const existingWords = significantWords(existing);
    const newNameWords = significantWords(nameLower);
    const nameOverlap = [...newNameWords].filter(w => existingWords.has(w));
    if (nameOverlap.length >= 2) {
      return `name word overlap (in-batch): ${nameOverlap.join(", ")}`;
    }
  }

  const newNameWords = significantWords(nameLower);
  for (const existing of existingProposals) {
    const existingNameLower = existing.name.toLowerCase().trim();
    const existingWords = significantWords(existingNameLower);
    const nameOverlap = [...newNameWords].filter(w => existingWords.has(w));
    if (nameOverlap.length >= 2) {
      return `name word overlap: ${nameOverlap.join(", ")}`;
    }
  }

  const newActors = extractKeyActors(proposal.name + " " + proposal.source + " " + proposal.summary);
  for (const existing of existingProposals) {
    const existingText = `${existing.name} ${existing.source ?? ""} ${existing.summary ?? ""}`;
    const existingActors = extractKeyActors(existingText);
    const actorOverlap = [...newActors].filter(a => existingActors.has(a));
    if (actorOverlap.length >= 1) {
      const existingSummaryWords = significantWords(existing.summary ?? "");
      const newSummaryWords = significantWords(proposal.summary ?? "");
      const summaryOverlap = [...newSummaryWords].filter(w => existingSummaryWords.has(w));
      if (summaryOverlap.length >= 5) {
        return `shared actor (${actorOverlap.join(", ")}) + ${summaryOverlap.length} summary words in common`;
      }
    }
  }

  const newNameSimple = nameLower.replace(/[^a-z0-9\s]/g, "");
  for (const existing of existingProposals) {
    const existingSimple = existing.name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");
    if (newNameSimple.includes(existingSimple) || existingSimple.includes(newNameSimple)) {
      return `name substring match`;
    }
  }

  return false;
}

export async function extractProposalsFromEvidence(cycleId?: string): Promise<number> {
  const pendingEvaluated = await evaluatePendingProposals();
  if (pendingEvaluated > 0) {
    logger.info({ pendingEvaluated }, "Evaluated pending proposals from previous cycles");
  }

  const recentItems = await db
    .select()
    .from(evidenceItemsTable)
    .where(
      eq(evidenceItemsTable.isProcessed, false),
    )
    .orderBy(desc(evidenceItemsTable.publishedAt))
    .limit(50);

  if (recentItems.length === 0) {
    logger.info("No unprocessed evidence items — skipping proposal extraction");
    return pendingEvaluated;
  }

  const articleBatch = recentItems
    .map((item, i) => {
      const text = (item.text ?? "").slice(0, 8000);
      return `--- ARTICLE ${i + 1} ---\nTitle: ${item.title}\nSource: ${item.source}\nDate: ${item.publishedAt.toISOString().slice(0, 10)}\nURL: ${item.sourceUrl}\n${text}\n`;
    })
    .join("\n");

  let extracted: ExtractedProposal[] = [];
  try {
    const extractionConfig = await getModelConfig();
    const fallback = resolveFallbackConfig("extraction", extractionConfig);
    const resp = await callLLM(
      EXTRACTION_USER_PROMPT(articleBatch),
      EXTRACTION_SYSTEM_PROMPT,
      extractionConfig.extractionProvider,
      extractionConfig.extractionModel,
      { maxTokens: 6000, fallbackProvider: fallback?.provider, fallbackModel: fallback?.model },
    );

    const text = resp.content;
    const parsed = parseLLMJson(text) as { proposals?: ExtractedProposal[] } | ExtractedProposal[];
    const rawProposals = Array.isArray(parsed) ? parsed : (parsed.proposals ?? []);
    const validated = rawProposals.filter(p =>
      p && typeof p.name === "string" && typeof p.source === "string" &&
      p.terms && typeof p.terms === "object" && p.confidence >= 0.6
    );

    const beforeFilter = validated.length;
    extracted = validated.filter(p => {
      const hasNuclear = !!(p.terms?.nuclearProtocol && p.terms.nuclearProtocol.trim().length > 0);
      const hasSanctions = !!(p.terms?.sanctionsRelief && p.terms.sanctionsRelief.trim().length > 0);
      if (!hasNuclear && !hasSanctions) {
        logger.debug({ name: p.name }, "Proposal rejected — no nuclear protocol or sanctions relief terms");
        return false;
      }
      return true;
    });

    if (beforeFilter !== extracted.length) {
      logger.info({ cycleId, beforeFilter, afterFilter: extracted.length }, "Filtered out proposals lacking nuclear/sanctions terms");
    }

    logger.info({ cycleId, articlesScanned: recentItems.length, proposalsFound: extracted.length }, "Proposal extraction complete");
  } catch (err) {
    logger.error({ err, cycleId }, "Proposal extraction LLM call failed");
    return pendingEvaluated;
  }

  if (extracted.length === 0) {
    await db
      .update(evidenceItemsTable)
      .set({ isProcessed: true })
      .where(
        sql`${evidenceItemsTable.id} IN (${sql.join(recentItems.map(i => sql`${i.id}`), sql`, `)})`
      );
    return pendingEvaluated;
  }

  const existingProposals = await db
    .select({ id: proposalsTable.id, name: proposalsTable.name, source: proposalsTable.source, summary: proposalsTable.summary })
    .from(proposalsTable);
  const seenNames = new Set(existingProposals.map(p => p.name.toLowerCase().trim()));
  const seenIds = new Set(existingProposals.map(p => p.id));

  const modelConfig = await getModelConfig();
  let created = 0;
  const MAX_EVALUATIONS_PER_CYCLE = 1;
  let evaluated = 0;

  for (const proposal of extracted) {
    const proposalId = proposalStableId(proposal.name, proposal.source);
    const nameLower = proposal.name.toLowerCase().trim();

    if (seenIds.has(proposalId) || seenNames.has(nameLower)) {
      logger.debug({ name: proposal.name }, "Proposal already exists — skipping");
      continue;
    }

    const isDuplicate = checkDuplicate(proposal, nameLower, seenNames, existingProposals);

    if (isDuplicate) {
      logger.debug({ name: proposal.name, reason: isDuplicate }, "Proposal looks like a duplicate — skipping");
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
      existingProposals.push({ id: proposalId, name: proposal.name, source: proposal.source, summary: proposal.summary });
      created++;

      logger.info({ proposalId, name: proposal.name }, "Auto-extracted proposal created");

      if (evaluated >= MAX_EVALUATIONS_PER_CYCLE) {
        logger.info({ proposalId, name: proposal.name }, "Skipping AI evaluation this cycle (limit reached) — will be evaluated in a future cycle");
        continue;
      }

      logger.info({ proposalId, name: proposal.name }, "Running full AI evaluation pipeline");
      evaluated++;

      try {
        const evidenceSummary = await getRecentEvidenceSummary();
        const { evaluations: aiEvals } = await evaluateStakeholders(terms, modelConfig, evidenceSummary);
        const { evaluations: domesticEvals } = await evaluateDomesticAudiences(terms, modelConfig, evidenceSummary);
        const { results: redTeamResults } = await runRedTeam(terms, modelConfig, evidenceSummary);
        const { result: negotiatorResult } = await runNegotiator(terms, aiEvals, {}, modelConfig);

        const revisedTerms: DealTerms = {
          ...terms,
          ...(negotiatorResult.revisedTermsPartial as Partial<DealTerms>),
        };

        const { scores: aiScores } = await judgeAndScore(revisedTerms, aiEvals, redTeamResults, domesticEvals, modelConfig, evidenceSummary);

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

  logger.info({ cycleId, extracted: extracted.length, created, pendingEvaluated }, "Proposal extraction pipeline complete");
  return created + pendingEvaluated;
}
