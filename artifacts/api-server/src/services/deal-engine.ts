import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger";
import type { DealSubStage } from "../lib/cycle-status";
import { emitCycleLog, truncateForLog } from "../lib/cycle-log";
import {
  callLLM as sharedCallLLM,
  callLLMForStage as sharedCallLLMForStage,
  resolveStageConfig as sharedResolveStageConfig,
  validateModelConfig as sharedValidateModelConfig,
  getModelConfig as sharedGetModelConfig,
  LLMCallError,
  MODEL_DEFAULTS,
  type ProviderName as SharedProviderName,
  type ModelConfig as SharedModelConfig,
  type CallLLMOptions,
} from "./llm-router";
import { db } from "@workspace/db";
import { stakeholdersTable, adminConfigTable } from "@workspace/db/schema";
import { inArray, desc, eq } from "drizzle-orm";
import { PIPELINE_STAKEHOLDER_IDS } from "./stakeholder-updater";

export async function getRecentEvidenceSummary(): Promise<string> {
  try {
    const { evidenceItemsTable } = await import("@workspace/db/schema");
    const items = await db.select({
      title: evidenceItemsTable.title,
      text: evidenceItemsTable.text,
      publishedAt: evidenceItemsTable.publishedAt,
      evidenceType: evidenceItemsTable.evidenceType,
      source: evidenceItemsTable.source,
    })
      .from(evidenceItemsTable)
      .orderBy(desc(evidenceItemsTable.publishedAt))
      .limit(30);

    if (items.length === 0) return "";

    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
      const type = item.evidenceType || "other";
      if (!grouped[type]) grouped[type] = [];
      grouped[type]!.push(item);
    }

    const dateRange = (() => {
      const dates = items.filter(i => i.publishedAt).map(i => new Date(i.publishedAt!));
      if (dates.length === 0) return "";
      const newest = new Date(Math.max(...dates.map(d => d.getTime())));
      const oldest = new Date(Math.min(...dates.map(d => d.getTime())));
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      return ` covering ${fmt(oldest)} to ${fmt(newest)}`;
    })();

    const typeOrder = ["military", "diplomatic", "economic", "humanitarian", "other"];
    const typeLabels: Record<string, string> = {
      military: "MILITARY & SECURITY",
      diplomatic: "DIPLOMATIC & POLITICAL",
      economic: "ECONOMIC & SANCTIONS",
      humanitarian: "HUMANITARIAN",
      other: "OTHER",
    };

    let summary = `RECENT GEOPOLITICAL INTELLIGENCE BRIEFING (${items.length} items${dateRange}):\n`;

    for (const type of typeOrder) {
      const group = grouped[type];
      if (!group || group.length === 0) continue;
      summary += `\n${typeLabels[type] ?? type.toUpperCase()} (${group.length}):\n`;
      for (const item of group) {
        const date = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : "undated";
        const snippet = item.text?.slice(0, 120)?.replace(/\n/g, " ") ?? "";
        summary += `- [${date}] ${item.title}${snippet ? ". " + snippet : ""}\n`;
      }
    }

    return summary.trim();
  } catch (err) {
    logger.warn({ error: err instanceof Error ? err.message : String(err) }, "Failed to retrieve recent evidence summary — evaluation stages will proceed without evidence context");
    return "";
  }
}

export async function generateStrategicSummary(modelConfig?: ModelConfig): Promise<{ summary: string; tokens: number }> {
  try {
    const { evidenceItemsTable } = await import("@workspace/db/schema");
    const items = await db.select({
      title: evidenceItemsTable.title,
      text: evidenceItemsTable.text,
      publishedAt: evidenceItemsTable.publishedAt,
      evidenceType: evidenceItemsTable.evidenceType,
    })
      .from(evidenceItemsTable)
      .orderBy(desc(evidenceItemsTable.publishedAt))
      .limit(150);

    if (items.length === 0) return { summary: "", tokens: 0 };

    const dates = items.filter(i => i.publishedAt).map(i => new Date(i.publishedAt!));
    const newest = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().slice(0, 10) : "unknown";
    const oldest = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().slice(0, 10) : "unknown";

    const evidenceBlock = items.map(item => {
      const date = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : "undated";
      const type = item.evidenceType || "other";
      const snippet = item.text?.slice(0, 200)?.replace(/\n/g, " ") ?? "";
      return `[${date}][${type}] ${item.title}. ${snippet}`;
    }).join("\n");

    const systemPrompt = `You are a senior geopolitical intelligence analyst producing a strategic situation assessment for the Iran-US-Israel conflict complex. Your assessment will be used by an AI peace deal optimization system to ground its proposals in reality.`;

    const prompt = `Below is a corpus of ${items.length} evidence items spanning ${oldest} to ${newest} from news feeds, conflict trackers, and diplomatic sources.

Synthesize this into a STRATEGIC SITUATION ASSESSMENT of approximately 500 words. Structure it as follows:

1. CONFLICT TRAJECTORY: How the conflict started, key escalation milestones, and current phase (escalating/de-escalating/stalemate)
2. MILITARY SITUATION: Current state of military operations, force deployments, and battlefield dynamics
3. DIPLOMATIC LANDSCAPE: Active diplomatic channels, negotiations, stated positions of key parties (Iran, US, Israel, regional actors)
4. SANCTIONS & ECONOMIC CONTEXT: Current sanctions regime, economic pressures, energy market impacts
5. HUMANITARIAN SITUATION: Civilian impact, displacement, humanitarian access
6. KEY STRUCTURAL FACTORS: Underlying dynamics that constrain or enable peace (domestic politics, alliance structures, nuclear capabilities)

Be factual and analytical. Cite specific events with dates where relevant. Distinguish between established facts and emerging trends. Flag any contradictions in the evidence.

EVIDENCE CORPUS:
${evidenceBlock}`;

    const config = modelConfig ?? await sharedGetModelConfig();
    const { content, tokens } = await callLLM(
      prompt,
      systemPrompt,
      config.extractionProvider,
      config.extractionModel ?? config.anthropicModel,
      { maxTokens: 2000 },
    );

    const summary = `STRATEGIC SITUATION ASSESSMENT (synthesized from ${items.length} items, ${oldest} to ${newest}):\n\n${content.trim()}`;

    await cacheStrategicSummary(summary);

    return { summary, tokens };
  } catch (err) {
    logger.warn({ error: err instanceof Error ? err.message : String(err) }, "Failed to generate strategic summary");
    return { summary: "", tokens: 0 };
  }
}

async function cacheStrategicSummary(summary: string): Promise<void> {
  try {
    const key = "latestStrategicSummary";
    const value = JSON.stringify({ summary, generatedAt: new Date().toISOString() });
    const existing = await db.select().from(adminConfigTable).where(eq(adminConfigTable.key, key));
    if (existing.length > 0) {
      await db.update(adminConfigTable).set({ value, updatedAt: new Date() }).where(eq(adminConfigTable.key, key));
    } else {
      await db.insert(adminConfigTable).values({ key, value });
    }
  } catch (err) {
    logger.warn({ error: err instanceof Error ? err.message : String(err) }, "Failed to cache strategic summary");
  }
}

export async function getCachedStrategicSummary(): Promise<string> {
  try {
    const rows = await db.select().from(adminConfigTable).where(eq(adminConfigTable.key, "latestStrategicSummary"));
    if (rows.length === 0) return "";
    const parsed = JSON.parse(rows[0]!.value!);
    return parsed.summary ?? "";
  } catch {
    return "";
  }
}

export async function getFullEvidenceContext(modelConfig?: ModelConfig): Promise<{ context: string; strategicTokens: number }> {
  const [recentBriefing, { summary: strategicSummary, tokens: strategicTokens }] = await Promise.all([
    getRecentEvidenceSummary(),
    generateStrategicSummary(modelConfig),
  ]);

  if (!strategicSummary && !recentBriefing) return { context: "", strategicTokens: 0 };

  let context = "";

  if (strategicSummary) {
    context += strategicSummary;
  }

  if (recentBriefing) {
    context += `\n\n---\n\n${recentBriefing}`;
  }

  return { context: context.trim(), strategicTokens };
}

export type InnovativeProvision = {
  title: string;
  description: string;
  rationale: string;
  historicalPrecedent?: string;
};

export type DealTerms = {
  nuclearProtocol: string;
  sanctionsRelief: string;
  hormuzArrangements: string;
  humanitarianProvisions: string;
  verificationMechanism: string;
  timelineYears: number;
  sequencing: string;
  additionalClauses: string[];
  innovativeProvisions?: InnovativeProvision[];
  stakeholderCommitments?: Record<string, string>;
};

export type JudgePanelEntry = {
  provider: ProviderName;
  model: string;
  scores: Record<string, number>;
  rationale: Record<string, string>;
};

export type DealScores = {
  feasibility: number;
  coherence: number;
  evidenceGrounding: number;
  domesticSellability: number;
  regionalStability: number;
  implementability: number;
  durability: number;
  composite: number;
  scoreRationale?: Record<string, string>;
  evaluationError?: string;
  judgePanel?: JudgePanelEntry[];
  judgePrompt?: string;
};

export type StakeholderVerdict = {
  verdict: "accept" | "conditional" | "reject";
  rationale: string;
  redLineViolations: string[];
  conditions: string[];
};

export type DomesticVerdict = {
  audience: string;
  verdict: "sellable" | "difficult" | "unsellable";
  rationale: string;
};

export type RedTeamResult = {
  attack: string;
  severity: "low" | "medium" | "high" | "critical";
  response: string;
  survived: boolean;
};

export type NegotiatorResult = {
  proposedAmendments: Array<{
    stakeholder: string;
    originalConcern: string;
    proposedChange: string;
    likelihood: "low" | "medium" | "high";
  }>;
  revisedTermsPartial: Partial<DealTerms>;
  negotiationStrategy: string;
};

export type MetaEvaluatorResult = {
  pipelineQuality: number;
  reasoning: string;
  blindspots: string[];
  suggestedNextArchitecture: string;
  confidenceInOutcome: number;
  promptImprovements?: Array<{
    stage: string;
    currentWeakness: string;
    suggestedChange: string;
    expectedImpact: string;
  }>;
};

export type BrainstormInsights = {
  historicalAnalogies: Array<{ dealName: string; relevantLesson: string; applicability: string }>;
  creativeProvisions: Array<{ idea: string; rationale: string; noveltyLevel: string }>;
  crossIssueLinkages: Array<{ linkage: string; stakeholdersHelped: string[] }>;
  unconventionalApproaches: string[];
};

export type DealMemoryEntry = {
  architecture: string;
  compositeScore: number;
  terms: Partial<DealTerms>;
  topProvisions: Array<{ title: string; description: string; scoreDelta?: number }>;
  stakeholderVerdicts: Record<string, { verdict: string; rationale: string }>;
  diagnosis: string;
};

export type DealMemoryContext = {
  topDeals: DealMemoryEntry[];
  provisionInsights: Array<{ title: string; avgScoreDelta: number; bestDimension: string; worstDimension: string; count: number }>;
};

export type DomesticFramingStrategy = {
  audience: string;
  framingNarrative: string;
  keyTalkingPoints: string[];
  historicalAnalogy?: string;
  riskOfBackfire: string;
};

export type CreativeTradeoff = {
  gives: string;
  gets: string;
  netBenefit: string;
};

export type ProviderName = SharedProviderName;
export type ModelConfig = SharedModelConfig;
export const validateModelConfig = sharedValidateModelConfig;
export const resolveStageConfig = sharedResolveStageConfig;

export type EvaluatedDeal = {
  terms: DealTerms;
  scores: DealScores;
  stakeholderEvaluations: Record<string, StakeholderVerdict>;
  domesticEvaluations: Record<string, DomesticVerdict>;
  domesticFramingStrategies: Record<string, DomesticFramingStrategy>;
  brainstormInsights: BrainstormInsights | null;
  redTeamResults: RedTeamResult[];
  negotiatorResult: NegotiatorResult | null;
  metaEvaluatorResult: MetaEvaluatorResult | null;
  diagnosis: string;
  pipelineConfig: Record<string, string>;
  tokensConsumed: number;
  costUsd: number;
};

const ARCHITECTURES = ["balanced", "nuclear-first", "hormuz-first", "humanitarian-first", "radical-restructure", "asymmetric-grand-bargain", "incremental-confidence", "freeform"] as const;
type Architecture = typeof ARCHITECTURES[number];

const DEFAULT_MODELS = MODEL_DEFAULTS;

const callLLM = sharedCallLLM;
const callLLMForStage = sharedCallLLMForStage;

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

class LLMParseError extends Error {
  constructor(label: string, public textSnippet: string) {
    super(`LLM JSON parse failed for "${label}": all strategies exhausted`);
    this.name = "LLMParseError";
  }
}

function parseLLMJson<T>(text: string, label: string): T {
  const strategies = [
    () => {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (!match) return null;
      return match[1];
    },
    () => {
      const match = text.match(/(\{[\s\S]*\})/);
      if (!match) return null;
      return match[1];
    },
    () => {
      const match = text.match(/(\[[\s\S]*\])/);
      if (!match) return null;
      return match[1];
    },
    () => text,
  ];

  for (const strategy of strategies) {
    try {
      let raw = strategy();
      if (!raw) continue;
      raw = raw.replace(/,\s*([}\]])/g, "$1");
      raw = raw.replace(/[\x00-\x1f\x7f]/g, (c) => c === "\n" || c === "\r" || c === "\t" ? c : "");
      const parsed = JSON.parse(raw) as T;
      if (parsed !== null && parsed !== undefined) return parsed;
    } catch {
      continue;
    }
  }

  logger.error({ label, textSnippet: text.slice(0, 500) }, "parseLLMJson FAILED — all parse strategies exhausted, no fallback");
  throw new LLMParseError(label, text.slice(0, 500));
}

type AcceptanceTier = "required" | "critical" | "influential" | "contextual";

type StakeholderEntry = {
  id: string;
  name: string;
  profile: string;
  tier: AcceptanceTier;
};

let STAKEHOLDER_REGISTRY: StakeholderEntry[] = [];

async function loadStakeholderRegistryFromDB(): Promise<StakeholderEntry[]> {
  const rows = await db.select().from(stakeholdersTable)
    .where(inArray(stakeholdersTable.id, PIPELINE_STAKEHOLDER_IDS));
  const validTiers: AcceptanceTier[] = ["required", "critical", "influential", "contextual"];
  STAKEHOLDER_REGISTRY = rows.map(r => ({
    id: r.id,
    name: r.name,
    profile: r.profileSummary || r.goals,
    tier: (validTiers.includes(r.tier as AcceptanceTier) ? r.tier : "contextual") as AcceptanceTier,
  }));
  const loadedIds = new Set(rows.map(r => r.id));
  const missingIds = PIPELINE_STAKEHOLDER_IDS.filter(id => !loadedIds.has(id));
  if (missingIds.length > 0) {
    logger.warn({ missingIds, expected: PIPELINE_STAKEHOLDER_IDS.length, loaded: rows.length }, "Stakeholder registry missing expected IDs");
  }
  logger.info({ count: STAKEHOLDER_REGISTRY.length }, "Loaded stakeholder registry from DB");
  return STAKEHOLDER_REGISTRY;
}

async function ensureRegistryLoaded(): Promise<void> {
  if (STAKEHOLDER_REGISTRY.length === 0) {
    await loadStakeholderRegistryFromDB();
  }
}

function getStakeholdersByTier(...tiers: AcceptanceTier[]): StakeholderEntry[] {
  return STAKEHOLDER_REGISTRY.filter(s => tiers.includes(s.tier));
}

function getCoreStakeholders(): StakeholderEntry[] {
  return getStakeholdersByTier("required", "critical", "influential");
}

function getAllEvaluatedStakeholders(): StakeholderEntry[] {
  return STAKEHOLDER_REGISTRY;
}

const DOMESTIC_AUDIENCES: Record<string, { stakeholder: string; audiences: string[] }> = {
  "iran": { stakeholder: "Iran", audiences: ["Supreme Leader", "IRGC", "reformists", "public"] },
  "us": { stakeholder: "United States", audiences: ["Congress", "Pentagon", "Israel lobby", "public"] },
  "israel": { stakeholder: "Israel", audiences: ["Knesset hardliners", "security establishment", "center-left coalition"] },
};

/**
 * INNOVATION BRAINSTORM (Stage 0) — creative pre-generation
 * Extended reasoning stage that mines historical precedents, explores creative
 * mechanisms, identifies cross-issue linkages, and generates unconventional
 * approaches BEFORE the formal proposal is constructed.
 * This is where "superhuman" AI creativity happens — the model processes all
 * stakeholder preferences simultaneously and finds non-obvious trade-offs.
 */
export async function runInnovationBrainstorm(
  evidenceSummary: string,
  previousDiagnosis: string,
  architecture: Architecture = "balanced",
  modelConfig: ModelConfig = DEFAULT_MODELS,
  pipelineOverrides: Record<string, string> = {},
  dealMemory: DealMemoryContext | null = null,
): Promise<{ insights: BrainstormInsights; tokens: number }> {
  await ensureRegistryLoaded();
  const overridePrompt = pipelineOverrides["brainstorm_system"] || "";
  const overrideUser = pipelineOverrides["brainstorm_user"] || "";

  const systemPrompt = `You are a creative genius in conflict resolution, combining deep knowledge of historical peace processes with lateral thinking and game theory.
Your task is NOT to write a peace deal yet — it is to BRAINSTORM. Think expansively, creatively, and unconventionally.
You have the unique ability to simultaneously consider the preferences, fears, and domestic constraints of 20+ stakeholders and find non-obvious intersections where everyone can gain.

KEY CREATIVE MANDATE:
1. HISTORICAL MINING: Draw specific, actionable lessons from successful peace deals (Camp David, Good Friday Agreement, JCPOA, Dayton, Oslo, the Iran-Iraq War ceasefire, ASEAN Treaty of Amity, the Abraham Accords). What specific mechanisms from these deals could be adapted?
2. CROSS-ISSUE LINKAGES: Find creative connections between seemingly unrelated issues. Example: "Iran's water crisis + Gulf desalination technology" could be linked to "nuclear cooperation transparency." Think about how solving one country's domestic problem can be packaged as a concession from another.
3. CREATIVE MECHANISMS: Invent deal provisions that don't fit traditional categories — joint economic zones, shared technology platforms, cultural exchange corridors, resource-sharing agreements, face-saving asymmetric timelines, constructive ambiguity clauses, phased sovereignty arrangements.
4. REFRAMING: Think about how to present painful concessions as victories. How can enrichment limits be sold as Iran's ticket to civilian nuclear prestige? How can sanctions relief be framed as US strategic repositioning rather than capitulation?
5. UNCONVENTIONAL APPROACHES: Consider ideas that traditional diplomats might dismiss — citizen diplomacy tracks, economic integration before political resolution, technology-driven verification that builds trust, regional development banks, shared threat frameworks (climate, water, pandemics).

${overridePrompt}
Output valid JSON only.`;

  const allPastProvisionTitles = dealMemory?.topDeals
    .flatMap(d => d.topProvisions.map(p => p.title))
    .filter((t, i, arr) => arr.indexOf(t) === i) ?? [];
  const overusedProvisions = allPastProvisionTitles.length > 0
    ? `\nDO NOT REPEAT these provisions (they have already been explored in previous deals — invent entirely NEW mechanisms):
${allPastProvisionTitles.map(t => `- "${t}"`).join("\n")}
Instead, brainstorm NOVEL provisions that have NOT been tried before. Creativity means generating ideas the system has never seen.`
    : "";

  const dealMemoryBlock = dealMemory && dealMemory.topDeals.length > 0 ? `
LESSONS FROM PREVIOUS DEALS (learn from patterns, but do NOT copy their provisions):
${dealMemory.topDeals.slice(0, 3).map((d, i) => `
Deal ${i + 1} (${d.architecture}, score: ${(d.compositeScore * 100).toFixed(1)}%):
- Nuclear approach: ${(d.terms.nuclearProtocol || "").slice(0, 300)}
- What worked: ${d.topProvisions.filter(p => (p.scoreDelta ?? 0) > 0).map(p => p.title).join(", ") || "N/A"}
- What failed: ${Object.entries(d.stakeholderVerdicts).filter(([, v]) => v.verdict === "reject").map(([id, v]) => `${id} rejected: ${v.rationale.slice(0, 100)}`).join("; ") || "No rejections"}
- Diagnosis: ${d.diagnosis.slice(0, 200)}`).join("\n")}
${dealMemory.provisionInsights.length > 0 ? `
PROVISION TRACK RECORD (which mechanisms have correlated with better scores):
${dealMemory.provisionInsights.slice(0, 8).map(p => `- "${p.title}" (used ${p.count}x, avg delta: ${p.avgScoreDelta > 0 ? "+" : ""}${(p.avgScoreDelta * 100).toFixed(1)}pp, best for: ${p.bestDimension}, weakest for: ${p.worstDimension})`).join("\n")}` : ""}
${overusedProvisions}
` : "";

  const radicalInstructions = ["radical-restructure", "asymmetric-grand-bargain", "incremental-confidence"].includes(architecture) ? `
RADICAL EXPLORATION MODE: You are brainstorming for a "${architecture}" approach. This means you should:
- REJECT conventional diplomatic framing entirely. Do not default to JCPOA-like structures.
- Think about fundamentally different ways to structure the problem — what if the nuclear issue is not the central axis? What if economic integration precedes political agreement? What if the deal creates new institutions rather than modifying existing ones?
- Consider approaches that traditional diplomats would dismiss as "unrealistic" — those are often the most creative.
- Generate at least 3 ideas rated "breakthrough" novelty level.
` : architecture === "freeform" ? `
FREEFORM EXPLORATION MODE: You have NO predetermined architectural constraints. This means you should:
- Do NOT anchor on any single axis (nuclear, sanctions, maritime, etc.) as the organizing principle.
- Let the EVIDENCE and STAKEHOLDER NEEDS dictate the deal's shape. The structure should emerge organically from the geopolitical reality.
- Feel free to combine elements from multiple architectures, invent entirely new framings, or propose structures that defy conventional diplomatic categorization.
- The deal may be asymmetric, multi-speed, conditional, phased, or any hybrid — whatever best serves the evidence.
- Prioritize creativity and evidence-grounding equally. The best freeform deal is one no predetermined lens would have produced.
` : "";

  const prompt = `${overrideUser}
CURRENT GEOPOLITICAL EVIDENCE:
${evidenceSummary.slice(0, 8000)}

${previousDiagnosis ? `PITFALLS TO AVOID (lessons learned — but brainstorm completely fresh ideas, not revisions):
${previousDiagnosis}` : "This is the first brainstorm for a fresh deal search."}
${dealMemoryBlock}
${architecture === "freeform" ? "ARCHITECTURE LENS: freeform — no predetermined structure. Let the evidence and stakeholder needs shape the deal organically." : `ARCHITECTURE LENS: ${architecture}`}
${radicalInstructions}

ALL STAKEHOLDERS AND THEIR DEEP PROFILES:
${STAKEHOLDER_REGISTRY.map(s => `- ${s.id} [${s.tier.toUpperCase()}]: ${s.name}. ${s.profile}`).join("\n")}

DOMESTIC AUDIENCES THAT MUST BE CONVINCED:
${Object.entries(DOMESTIC_AUDIENCES).map(([id, { stakeholder, audiences }]) => `- ${stakeholder}: ${audiences.join(", ")}`).join("\n")}

ECONOMIC CONTEXT: Conflict costs ~$450B/yr globally. Peace yields ~$560B/yr. Key: Iran bears $87B in costs but gains $142B from peace — the largest single-country swing. This asymmetry is a creative leverage point.

BRAINSTORM INSTRUCTIONS:
Think deeply about EVERY stakeholder simultaneously. What does each one need that another could provide at low cost? Where are the positive-sum trades hiding? What historical mechanisms solved similar multi-party deadlocks?

Return JSON:
{
  "historicalAnalogies": [
    { "dealName": "specific historical agreement", "relevantLesson": "what specific mechanism or approach worked", "applicability": "how it maps to this conflict" }
  ],
  "creativeProvisions": [
    { "idea": "novel deal element that doesn't fit traditional categories", "rationale": "why this helps multiple stakeholders", "noveltyLevel": "incremental|significant|breakthrough" }
  ],
  "crossIssueLinkages": [
    { "linkage": "how issue X can be traded for issue Y across stakeholders", "stakeholdersHelped": ["list", "of", "benefiting", "stakeholders"] }
  ],
  "unconventionalApproaches": ["list of bold, creative approaches that traditional diplomats might miss"]
}

Generate at least 4 historical analogies, 5 creative provisions (at least 2 at 'breakthrough' novelty), 4 cross-issue linkages, and 4 unconventional approaches.`;

  const { content, tokens } = await callLLMForStage(prompt, systemPrompt, 1, "generation", modelConfig, { maxTokens: 16384, timeoutMs: 600_000 });

  const PROVISION_POOL: BrainstormInsights["creativeProvisions"] = [
    { idea: "Regional Water-Energy Nexus Agreement linking Gulf desalination tech to Iranian gas exports", rationale: "Creates economic interdependence that raises cost of conflict", noveltyLevel: "breakthrough" },
    { idea: "Joint Iran-Gulf States Earthquake Early Warning Network with shared seismological data", rationale: "Non-political cooperation builds institutional trust infrastructure", noveltyLevel: "significant" },
    { idea: "Persian Gulf Environmental Protection Fund with mandatory polluter-pays contributions", rationale: "Environmental cooperation creates shared governance precedents applicable to security", noveltyLevel: "significant" },
    { idea: "Digital Enrichment Transparency Platform with real-time centrifuge monitoring via blockchain-verified sensor data", rationale: "Technology-driven verification eliminates ambiguity without sovereignty intrusion", noveltyLevel: "breakthrough" },
    { idea: "Iran-US-Israel Joint Pandemic Preparedness Center building on COVID cooperation channels", rationale: "Health security cooperation as politically neutral trust-building mechanism", noveltyLevel: "significant" },
    { idea: "Multilateral Hormuz Maritime Insurance Consortium reducing shipping premiums through collective security", rationale: "Financial incentives align commercial interests with peace maintenance", noveltyLevel: "breakthrough" },
    { idea: "Cross-border Special Economic Zone at Iran-Iraq-Turkey junction with extraterritorial trade rules", rationale: "Creates economic constituency for peace with tangible local benefits", noveltyLevel: "breakthrough" },
    { idea: "Regional Cyber Non-Aggression Pact with mutual forensic transparency obligations", rationale: "Addresses modern threat vector while building verification culture", noveltyLevel: "significant" },
    { idea: "Graduated Sovereignty-Sharing Protocol for disputed maritime zones with revenue-sharing", rationale: "Transforms zero-sum territorial disputes into positive-sum economic arrangements", noveltyLevel: "breakthrough" },
    { idea: "Cultural Heritage Protection Treaty with joint UNESCO site management across borders", rationale: "Leverages shared Persian-Arab-Jewish cultural heritage as peace infrastructure", noveltyLevel: "incremental" },
    { idea: "Iran Re-integration Scholarship Fund placing Iranian students in Western universities in exchange for transparency commitments", rationale: "Creates human capital ties that make conflict costly for future generations", noveltyLevel: "significant" },
    { idea: "Asymmetric De-escalation Ladder where each side pre-commits to proportional responses rather than escalation", rationale: "Reduces miscalculation risk through transparent signaling framework", noveltyLevel: "breakthrough" },
  ];
  const selectedProvisions = fisherYatesShuffle(PROVISION_POOL).slice(0, 3 + Math.floor(Math.random() * 3));

  const ANALOGY_POOL = [
    { dealName: "JCPOA (2015)", relevantLesson: "Phased sanctions relief tied to verifiable nuclear rollback created momentum", applicability: "Core framework can be revived with stronger verification" },
    { dealName: "Good Friday Agreement", relevantLesson: "Constructive ambiguity on sovereignty allowed both sides to claim victory", applicability: "Iran's 'nuclear rights' vs US 'non-proliferation' can use similar framing" },
    { dealName: "Camp David Accords (1978)", relevantLesson: "Bilateral deal between enemies enabled by superpower security guarantees and economic incentives", applicability: "US security guarantees to both Iran and Israel could unlock bilateral concessions" },
    { dealName: "Dayton Agreement (1995)", relevantLesson: "Complex multi-ethnic power-sharing architecture designed under extreme time pressure", applicability: "Regional power-sharing frameworks for Gulf security governance" },
    { dealName: "Abraham Accords (2020)", relevantLesson: "Economic normalization without resolving core political disputes", applicability: "Iran-Gulf economic integration could proceed before nuclear resolution" },
    { dealName: "ASEAN Treaty of Amity and Cooperation", relevantLesson: "Non-aggression norms established through regional institution-building", applicability: "Gulf equivalent could provide framework for Iran inclusion in regional security" },
    { dealName: "Iran-Iraq Ceasefire (1988)", relevantLesson: "Exhaustion-driven peace with face-saving UN mediation when both sides needed an exit ramp", applicability: "Demonstrates how reframing 'defeat' as 'pragmatic statesmanship' enables ceasefire acceptance" },
    { dealName: "Helsinki Accords (1975)", relevantLesson: "Bundled security, economic cooperation, and human rights across ideological blocs through basket approach", applicability: "Multi-basket framework could package nuclear, economic, and humanitarian dimensions as inseparable unit" },
  ];
  const selectedAnalogies = fisherYatesShuffle(ANALOGY_POOL).slice(0, 3 + Math.floor(Math.random() * 2));

  const insights = parseLLMJson<BrainstormInsights>(content, "brainstorm");
  return { insights, tokens };
}

/**
 * PROPOSAL AGENT (Stage 1) — generation role
 * Designs the initial deal terms for a given architecture.
 * NOW ENHANCED: Receives brainstorm insights as creative fuel,
 * includes innovativeProvisions field for novel mechanisms.
 */
export async function generateProposal(
  evidenceSummary: string,
  previousDiagnosis: string,
  architecture: Architecture = "balanced",
  modelConfig: ModelConfig = DEFAULT_MODELS,
  brainstormInsights: BrainstormInsights | null = null,
  pipelineOverrides: Record<string, string> = {},
  dealMemory: DealMemoryContext | null = null,
): Promise<{ terms: DealTerms; tokens: number }> {
  await ensureRegistryLoaded();
  const overridePrompt = pipelineOverrides["proposal_system"] || "";
  const overrideUser = pipelineOverrides["proposal_user"] || "";

  const brainstormContext = brainstormInsights ? `
CREATIVE BRAINSTORM INSIGHTS (use these as fuel for your proposal — incorporate the best ideas):

Historical Lessons to Apply:
${brainstormInsights.historicalAnalogies.map(a => `- ${a.dealName}: ${a.relevantLesson} → ${a.applicability}`).join("\n")}

Creative Provisions to Consider Incorporating:
${brainstormInsights.creativeProvisions.map(p => `- [${p.noveltyLevel}] ${p.idea}: ${p.rationale}`).join("\n")}

Cross-Issue Linkages to Exploit:
${brainstormInsights.crossIssueLinkages.map(l => `- ${l.linkage} (helps: ${l.stakeholdersHelped.join(", ")})`).join("\n")}

Unconventional Approaches:
${brainstormInsights.unconventionalApproaches.map(a => `- ${a}`).join("\n")}
` : "";

  const systemPrompt = `You are an expert peace negotiator and conflict resolution specialist trained in cooperative game theory, with a particular talent for CREATIVE and UNCONVENTIONAL deal design.
Your task is to design a detailed, realistic peace deal framework for the Iran-US-Israel conflict complex.
${architecture === "freeform" ? "Architecture focus: freeform — you decide the deal's organizing logic based on evidence and stakeholder needs." : `Architecture focus: ${architecture}.`}

CRITICAL PRINCIPLES:
1. GRAND COALITION: Stable peace requires binding commitments from ALL relevant stakeholders. Design commitments for every stakeholder that give each party a concrete stake in the deal's success.
2. CREATIVE MECHANISMS: Go beyond traditional diplomatic categories. Include innovative provisions that create new value rather than just dividing existing pie. Think about economic integration, technology sharing, environmental cooperation, cultural exchange — anything that creates positive-sum dynamics.
3. FACE-SAVING FRAMING: For every painful concession, build in face-saving language or asymmetric framing that lets each leader sell the deal domestically as a victory.
4. SEQUENCING INNOVATION: Think creatively about sequencing — not just "who goes first" but how to create irreversible momentum through early wins that make walking away costly for all parties.

${overridePrompt}

WRITING STYLE (MANDATORY — overrides any conflicting instructions above):
- SELF-CONTAINED: Every field must be fully understandable on its own. NEVER reference "previous deals," "revisions," "key changes," "updated terms," "modifications," or "all existing provisions remain." The reader has NO context about prior proposals. Write each field as if it is the first and only deal ever written.
- CONCISE: Use direct, policy-brief style. State specific terms (numbers, percentages, timelines, mechanisms) without preamble or filler. Aim for 2-4 sentences per field, not paragraphs. Avoid hedging language like "could potentially" or "it is envisioned that."
Output valid JSON only, no prose.`;

  const pastProposalProvisions = dealMemory?.topDeals
    .flatMap(d => d.topProvisions.map(p => p.title))
    .filter((t, i, arr) => arr.indexOf(t) === i) ?? [];

  const proposalDealMemoryBlock = dealMemory && dealMemory.topDeals.length > 0 ? `
RESEARCH CONTEXT (learn from these patterns, but your output must be a FRESH STANDALONE proposal — never reference or compare to these):
${dealMemory.topDeals.slice(0, 3).map((d, i) => `
Deal ${i + 1} (${d.architecture}, ${(d.compositeScore * 100).toFixed(1)}% composite):
- Nuclear: ${(d.terms.nuclearProtocol || "").slice(0, 250)}
- Sanctions: ${(d.terms.sanctionsRelief || "").slice(0, 250)}
- Successful provisions: ${d.topProvisions.filter(p => (p.scoreDelta ?? 0) >= 0).map(p => `"${p.title}"`).join(", ") || "None identified"}
- Stakeholder rejections: ${Object.entries(d.stakeholderVerdicts).filter(([, v]) => v.verdict === "reject").map(([id, v]) => `${id}: ${v.rationale.slice(0, 80)}`).join("; ") || "None"}
- Key weakness: ${d.diagnosis.slice(0, 150)}`).join("\n")}
${dealMemory.provisionInsights.length > 0 ? `
PROVISION TRACK RECORD (learn the PRINCIPLES behind what works, but invent NEW provisions):
${dealMemory.provisionInsights.slice(0, 6).map(p => `- "${p.title}": ${p.avgScoreDelta > 0 ? "HELPS" : "HURTS"} (${p.avgScoreDelta > 0 ? "+" : ""}${(p.avgScoreDelta * 100).toFixed(1)}pp avg, strongest on ${p.bestDimension})`).join("\n")}` : ""}
${pastProposalProvisions.length > 0 ? `
ALREADY-TRIED PROVISIONS (do NOT reuse these exact titles — create NOVEL alternatives):
${pastProposalProvisions.map(t => `- "${t}"`).join("\n")}` : ""}
` : "";

  const radicalProposalInstructions = ["radical-restructure", "asymmetric-grand-bargain", "incremental-confidence"].includes(architecture) ? `
RADICAL MODE — ${architecture.toUpperCase()}:
You MUST NOT produce a deal that resembles a traditional JCPOA-style framework. Instead:
${architecture === "radical-restructure" ? "- Restructure the problem entirely. Consider multilateral consortiums, new institutions, or bundling issues that are normally kept separate. The nuclear question might not be the starting point." : ""}
${architecture === "asymmetric-grand-bargain" ? "- Design a deal where each party gives what is CHEAP for them but VALUABLE to the other. Find the asymmetries. One big package, not sequential steps." : ""}
${architecture === "incremental-confidence" ? "- Design dozens of small, independently verifiable steps. No single step should be a deal-breaker. Build trust through accumulated micro-successes." : ""}
` : architecture === "freeform" ? `
FREEFORM MODE:
You are NOT constrained by any predetermined architecture. Do NOT default to a "balanced" or JCPOA-style framework.
- Let the evidence, stakeholder dynamics, and cost-benefit analysis dictate the deal's organizing logic.
- The deal's structure should emerge from what works, not from a preset template.
- You may combine nuclear-first sequencing with incremental confidence-building, pair asymmetric trades with radical institutional reform, or invent an entirely new structural paradigm.
- The only constraint is that the deal must be coherent internally and grounded in the evidence provided.
` : "";

  const prompt = `${overrideUser}Based on current evidence:
${evidenceSummary.slice(0, 8000)}

${previousDiagnosis ? `LESSONS FROM PAST ATTEMPTS (avoid these pitfalls, but write your proposal as a fresh standalone deal): ${previousDiagnosis}` : "Design an initial deal proposal."}
${proposalDealMemoryBlock}${radicalProposalInstructions}
${architecture === "freeform" ? "Architecture approach: freeform — design the deal's structure from scratch based on evidence and stakeholder needs." : `Architecture approach: ${architecture}`}
${brainstormContext}

COST-BENEFIT CONTEXT (annual estimates, USD billions):
The ongoing conflict costs the world ~$450B/yr in GDP-equivalent losses. A durable peace could generate ~$560B/yr in benefits. Key channels: Trade & Sanctions ($75B war cost, $122B peace gain), Energy Markets ($113B/$133B — includes transfers), Shipping & Insurance ($55B/$69B), Finance & Banking ($55B/$82B), Defense & Security ($72B/$39B), Aviation & Tourism ($30B/$45B), Humanitarian ($28B/$26B), Productivity & FDI ($28B/$56B).
Most affected: Iran ($87B cost, $142B peace benefit), US ($52B/$38B), Israel ($43B/$35B), Europe ($42B/$55B), China ($35B/$48B).
Your deal should address the channels where the largest economic gains are achievable and ensure stakeholders who bear the highest costs have clear incentives to participate.

STAKEHOLDER ACCEPTANCE TIERS:
REQUIRED (deal cannot proceed without their acceptance):
${getStakeholdersByTier("required").map(s => `- ${s.id}: ${s.name}. ${s.profile}`).join("\n")}

CRITICAL (borderline make-or-break — rejection severely undermines viability):
${getStakeholdersByTier("critical").map(s => `- ${s.id}: ${s.name}. ${s.profile}`).join("\n")}

INFLUENTIAL (important for durability/implementation but not gatekeepers):
${getStakeholdersByTier("influential").map(s => `- ${s.id}: ${s.name}. ${s.profile}`).join("\n")}

CONTEXTUAL (affected parties whose support strengthens the deal):
${getStakeholdersByTier("contextual").map(s => `- ${s.id}: ${s.name}`).join(", ")}

Generate a peace deal JSON with these exact keys. Be CONCISE — 2-4 sentences per string field, policy-brief style, no filler:
{
  "nuclearProtocol": "concise nuclear terms: enrichment caps, facility access, technology arrangements",
  "sanctionsRelief": "concise sanctions terms: timing, conditionality, snapback triggers",
  "hormuzArrangements": "concise maritime security terms: patrol arrangements, passage guarantees",
  "humanitarianProvisions": "concise humanitarian terms: immediate relief and longer-term commitments",
  "verificationMechanism": "concise verification terms: monitoring bodies, inspection protocols, technology",
  "timelineYears": number,
  "sequencing": "complete step-by-step phasing with specific actions per phase, early wins, and irreversibility mechanisms — write the FULL sequence, never say 'all existing provisions remain'",
  "additionalClauses": ["concise additional terms — one sentence each"],
  "innovativeProvisions": [
    {
      "title": "short title (3-6 words)",
      "description": "1-2 sentences: what this provision does concretely",
      "rationale": "1 sentence: which stakeholders benefit and why",
      "historicalPrecedent": "optional: brief historical analogy"
    }
  ],
  "stakeholderCommitments": {
${getCoreStakeholders().map(s => `    "${s.id}": "1-2 sentences: specific actions ${s.name} commits to — what they DO, PROVIDE, or GUARANTEE"`).join(",\n")}
  }
}

CREATIVE MANDATE: Include at least 3 innovative provisions beyond traditional nuclear/sanctions/verification. Each must have a unique title addressing a DIFFERENT domain (economic, technological, environmental, cultural). Keep descriptions tight.

IMPORTANT: Iran and US are REQUIRED parties. Israel is CRITICAL. Every stakeholder commitment must specify concrete actions, not vague support.

REMINDER: Write every field as a STANDALONE statement. Do NOT say "revised," "updated," "key changes," "modified from," or reference any prior deal. The reader sees only THIS deal.`;

  const { content, tokens } = await callLLMForStage(prompt, systemPrompt, 1, "generation", modelConfig, { maxTokens: 16384, timeoutMs: 600_000 });
  const terms = parseLLMJson<DealTerms>(content, "proposal");

  if (!terms.innovativeProvisions || terms.innovativeProvisions.length === 0) {
    logger.error({ architecture }, "LLM proposal missing innovativeProvisions — deal will be stored without them");
  }

  return { terms, tokens };
}

/**
 * STAKEHOLDER EVALUATION AGENT (OpenAI) — evaluation role
 * Evaluates ALL stakeholders in a tiered system:
 * - Required (Iran, US): must accept for deal to be implementable
 * - Critical (Israel): borderline make-or-break
 * - Influential: important for durability but not gatekeepers
 * - Contextual: broader affected parties
 */
export async function evaluateStakeholders(
  terms: DealTerms,
  modelConfig: ModelConfig = DEFAULT_MODELS,
  evidenceSummary: string = "",
): Promise<{ evaluations: Record<string, StakeholderVerdict>; tokens: number }> {
  await ensureRegistryLoaded();
  const systemPrompt = `You are a geopolitical analyst evaluating how stakeholders will respond to a peace proposal.
Each stakeholder has a specific acceptance tier that determines their importance:
- REQUIRED: Iran and US must BOTH accept for the deal to be implementable at all
- CRITICAL: Israel's rejection would severely undermine the deal but is not an absolute veto
- INFLUENTIAL: Important for durability and implementation but not gatekeepers
- CONTEXTUAL: Affected parties whose support strengthens the deal

Evaluate whether each would accept given what they must commit AND what they receive in return.
You must consider any recent geopolitical developments provided — they may significantly shift stakeholder positions, red lines, or willingness to negotiate. Factor them into your assessment where relevant.
Output a JSON object mapping stakeholder IDs to their verdict. Each verdict has:
{ "verdict": "accept"|"conditional"|"reject", "rationale": "string", "redLineViolations": [], "conditions": [] }`;

  const commitments = terms.stakeholderCommitments ?? {};

  const coreTierLines = getCoreStakeholders().map(s => {
    const commitment = commitments[s.id];
    return `- ${s.id} [${s.tier.toUpperCase()}]: ${s.name}. ${s.profile}${commitment ? `\n  THEIR COMMITMENTS: ${commitment}` : ""}`;
  }).join("\n");

  const contextualLines = getStakeholdersByTier("contextual").map(s =>
    `- ${s.id}: ${s.name}. ${s.profile}`
  ).join("\n");

  const innovativeContext = terms.innovativeProvisions?.length
    ? `\nINNOVATIVE PROVISIONS (novel deal elements that create new value — factor these into each stakeholder's assessment):\n${terms.innovativeProvisions.map(p => `- ${p.title}: ${p.description}`).join("\n")}`
    : "";

  const evidenceBlock = evidenceSummary
    ? `\nRECENT GEOPOLITICAL DEVELOPMENTS (these are the latest developments — they may or may not have major bearing on stakeholder positions, but you must consider them):
${evidenceSummary.slice(0, 8000)}\n`
    : "";

  const prompt = `Evaluate how these stakeholders would respond to this peace deal, considering both what they receive and what they are asked to commit:
${evidenceBlock}
DEAL TERMS:
- Nuclear: ${terms.nuclearProtocol}
- Sanctions: ${terms.sanctionsRelief}
- Maritime: ${terms.hormuzArrangements}
- Humanitarian: ${terms.humanitarianProvisions}
- Verification: ${terms.verificationMechanism}
- Timeline: ${terms.timelineYears} years
- Sequencing: ${terms.sequencing}${innovativeContext}

CORE STAKEHOLDERS (required + critical + influential — evaluate in detail):
${coreTierLines}

CONTEXTUAL STAKEHOLDERS (evaluate with a brief verdict — their opinions matter but are not make-or-break):
${contextualLines}

ACCEPTANCE HIERARCHY:
- Iran AND US must BOTH accept for the deal to be implementable. If either rejects, the deal fails.
- Israel's acceptance is borderline essential — rejection severely damages feasibility.
- Other stakeholders' reactions affect durability and regional stability but do not veto the deal.

For each stakeholder, consider: (1) Does what they receive justify what they must commit? (2) Do their commitments violate any red lines? (3) For contextual stakeholders, focus on whether the deal creates winners/losers among them.

Return JSON with ALL stakeholder IDs: { "iran": { verdict, rationale, redLineViolations, conditions }, "us": {...}, "uae": {...}, ... }`;

  const { content, tokens } = await callLLMForStage(prompt, systemPrompt, 2, "evaluation", modelConfig, { maxTokens: 16384, timeoutMs: 600_000 });

  const parsed = parseLLMJson<Record<string, StakeholderVerdict>>(content, "stakeholder-evaluation");

  const normalized: Record<string, StakeholderVerdict> = { ...parsed };
  const REQUIRED_IDS = ["iran", "us"];
  const missingRequired: string[] = [];
  for (const s of getAllEvaluatedStakeholders()) {
    const e = normalized[s.id];
    if (!e || !e.verdict || !["accept", "conditional", "reject"].includes(e.verdict)) {
      if (REQUIRED_IDS.includes(s.id)) {
        missingRequired.push(s.id);
      } else {
        logger.warn({ stakeholderId: s.id }, "Stakeholder missing from LLM evaluation output");
      }
    }
  }
  if (missingRequired.length > 0) {
    throw new LLMParseError(
      "stakeholder-evaluation",
      `Required stakeholders missing or invalid in LLM output: ${missingRequired.join(", ")}`
    );
  }

  return { evaluations: normalized, tokens };
}

/**
 * CREATIVE REFRAMING AGENT (Stage 3.5) — domestic narrative generation
 * Instead of just evaluating sellability, this stage GENERATES clever framing
 * strategies for selling each deal term to domestic audiences.
 * This is where AI creativity shines — finding narratives that transform
 * painful concessions into perceived victories.
 */
export async function generateDomesticFramingStrategies(
  terms: DealTerms,
  domesticEvaluations: Record<string, DomesticVerdict>,
  modelConfig: ModelConfig = DEFAULT_MODELS,
  pipelineOverrides: Record<string, string> = {},
): Promise<{ strategies: Record<string, DomesticFramingStrategy>; tokens: number }> {
  const overridePrompt = pipelineOverrides["framing_system"] || "";

  const unsellableAudiences = Object.entries(domesticEvaluations)
    .filter(([, ev]) => ev.verdict === "unsellable" || ev.verdict === "difficult")
    .map(([key, ev]) => ({ key, audience: ev.audience, rationale: ev.rationale }));

  if (unsellableAudiences.length === 0) {
    return { strategies: {}, tokens: 0 };
  }

  const systemPrompt = `You are a master political strategist and communications expert who specializes in selling difficult compromises to hostile domestic audiences.
Your genius lies in REFRAMING: taking what looks like a concession and presenting it as a strategic victory. You draw on historical examples of leaders who successfully sold painful peace deals at home.

KEY TECHNIQUES:
1. VICTORY FRAMING: Find the angle where a concession IS a victory. "We didn't give up enrichment — we gained international recognition as a peaceful nuclear power."
2. THREAT REFRAMING: Show what happens WITHOUT the deal. "Without this agreement, we face X which is worse."
3. HISTORICAL ANCHORING: Connect to national myths, historical victories, or cultural values. "Like [historical leader] who..."
4. STRATEGIC REPOSITIONING: Frame the deal as a smart strategic move, not capitulation. "This frees us to focus on [bigger priority]."
5. FACE-SAVING LANGUAGE: Find specific words and phrases that honor dignity while achieving compromise.
6. DOMESTIC BENEFIT SPOTLIGHTING: Highlight specific tangible benefits that matter to the target audience.

${overridePrompt}
Output valid JSON only.`;

  const innovativeContext = terms.innovativeProvisions?.length
    ? `\nINNOVATIVE PROVISIONS (new value created by this deal):\n${terms.innovativeProvisions.map(p => `- ${p.title}: ${p.description}`).join("\n")}`
    : "";

  const prompt = `For each difficult domestic audience below, generate a creative framing strategy that could make this peace deal SELLABLE to them.

DEAL TERMS:
- Nuclear: ${terms.nuclearProtocol}
- Sanctions: ${terms.sanctionsRelief}
- Sequencing: ${terms.sequencing}
- Timeline: ${terms.timelineYears} years
${innovativeContext}

AUDIENCES THAT FIND THIS DEAL DIFFICULT OR UNSELLABLE:
${unsellableAudiences.map(a => `- ${a.key} (${a.audience}): ${a.rationale}`).join("\n")}

For each audience, return a creative framing strategy. Think about what narrative would ACTUALLY work with this specific group — not generic talking points, but tailored, psychologically astute framing.

Return JSON object keyed by audience key:
{
  "${unsellableAudiences[0]?.key || "example"}": {
    "audience": "full audience name",
    "framingNarrative": "The core narrative in 2-3 sentences — this is the 'story' leaders would tell. Be specific and creative.",
    "keyTalkingPoints": ["specific talking point 1", "specific talking point 2", "specific talking point 3"],
    "historicalAnalogy": "optional: a historical example of a leader successfully selling a similar compromise",
    "riskOfBackfire": "honest assessment of risks with this framing approach"
  }
}`;

  const { content, tokens } = await callLLMForStage(prompt, systemPrompt, 3, "evaluation", modelConfig, { maxTokens: 8192 });

  const parsed = parseLLMJson<Record<string, DomesticFramingStrategy>>(content, "domestic-framing");
  return { strategies: parsed, tokens };
}

/**
 * CREATIVE NEGOTIATOR AGENT (Stage 5) — generation role
 * UPGRADED: No longer just patches rejections. Now proactively searches for
 * Pareto improvements — creative win-win restructurings where everyone gains.
 * Also generates "creative tradeoffs" — novel cross-issue deals that traditional
 * negotiators might miss.
 */
export async function runNegotiator(
  terms: DealTerms,
  stakeholderEvaluations: Record<string, StakeholderVerdict>,
  domesticFramingStrategies: Record<string, DomesticFramingStrategy>,
  modelConfig: ModelConfig = DEFAULT_MODELS,
  pipelineOverrides: Record<string, string> = {},
): Promise<{ result: NegotiatorResult & { creativeTradeoffs?: CreativeTradeoff[] }; tokens: number }> {
  await ensureRegistryLoaded();
  const overridePrompt = pipelineOverrides["negotiator_system"] || "";

  const rejecters = Object.entries(stakeholderEvaluations)
    .filter(([, e]) => e.verdict === "reject")
    .map(([id, e]) => ({ id, rationale: e.rationale, redLineViolations: e.redLineViolations, conditions: e.conditions }));

  const conditionals = Object.entries(stakeholderEvaluations)
    .filter(([, e]) => e.verdict === "conditional")
    .map(([id, e]) => ({ id, conditions: e.conditions }));

  const acceptors = Object.entries(stakeholderEvaluations)
    .filter(([, e]) => e.verdict === "accept")
    .map(([id]) => id);

  const systemPrompt = `You are a master negotiator who combines strategic brilliance with creative lateral thinking.
Your role goes FAR beyond patching rejections. You actively SEARCH for Pareto improvements — restructurings where everyone gains.

THREE MODES OF OPERATION:
1. FIX REJECTIONS: Address specific stakeholder objections with targeted amendments.
2. FIND PARETO IMPROVEMENTS: Look for creative restructurings where EVERY party is better off. Can you add value rather than just redistribute it? Can you link issues across stakeholders to create positive-sum trades?
3. CREATIVE TRADEOFFS: Propose novel cross-issue deals that traditional negotiators would miss. "Iran gets X (which costs the US very little) in exchange for Y (which costs Iran very little but matters enormously to Israel)."

IMPORTANT: When fixing rejections, NEVER just weaken terms to make a rejecter happy — that usually causes other stakeholders to reject. Instead, find CREATIVE restructurings that address the objection while preserving what others value. Add new value rather than redistribute existing value.

${overridePrompt}

WRITING STYLE FOR REPLACEMENT TERMS (MANDATORY — overrides any conflicting instructions above):
- Write each replacement field as a COMPLETE, SELF-CONTAINED statement — as if writing the entire deal term from scratch.
- NEVER use language that references any previous terms or previous versions of an agreement or proposal, because this proposal has to be standalone. Language such as "revised," "amended," "updated," or references to "existing provisions" and such must be avoided and the current terms presented as independent and without need of context.
- The reader will see ONLY your output. They have no access to the original terms if you are revising some previous terms. Every field must stand alone.
Output JSON only.`;

  const tierOf = (id: string) => STAKEHOLDER_REGISTRY.find(s => s.id === id)?.tier ?? "contextual";
  const priorityLabel = (id: string) => {
    const t = tierOf(id);
    if (t === "required") return "[REQUIRED — must fix]";
    if (t === "critical") return "[CRITICAL — high priority]";
    return `[${t}]`;
  };

  const framingContext = Object.keys(domesticFramingStrategies).length > 0
    ? `\nDOMESTIC FRAMING INSIGHTS (use these to inform your amendments):\n${Object.entries(domesticFramingStrategies).map(([key, s]) => `- ${key}: ${(s.framingNarrative ?? "").slice(0, 100)}`).join("\n")}`
    : "";

  const innovativeContext = terms.innovativeProvisions?.length
    ? `\nEXISTING INNOVATIVE PROVISIONS:\n${terms.innovativeProvisions.map(p => `- ${p.title ?? "Provision"}: ${(p.description ?? "").slice(0, 100)}`).join("\n")}`
    : "";

  const prompt = `Negotiate creative improvements for this Iran peace deal:

CURRENT TERMS SUMMARY:
- Nuclear: ${terms.nuclearProtocol}
- Sanctions: ${terms.sanctionsRelief}
- Sequencing: ${terms.sequencing}
- Maritime: ${terms.hormuzArrangements}
${innovativeContext}
${framingContext}

ACCEPTING STAKEHOLDERS (do not lose their support): ${acceptors.join(", ")}

REJECTING STAKEHOLDERS (prioritized by acceptance tier):
${rejecters.map(r => `- ${r.id} ${priorityLabel(r.id)}: Red lines: ${r.redLineViolations.join(", ")}. Conditions: ${r.conditions.join(", ")}`).join("\n") || "None — focus on Pareto improvements."}

CONDITIONAL STAKEHOLDERS:
${conditionals.map(c => `- ${c.id} ${priorityLabel(c.id)}: Conditions: ${c.conditions.join(", ")}`).join("\n") || "None."}

STAKEHOLDER PROFILES (for creative trade identification):
${STAKEHOLDER_REGISTRY.filter(s => ["required", "critical", "influential"].includes(s.tier)).map(s => `- ${s.id}: ${s.profile}`).join("\n")}

PRIORITY: Iran and US rejection is a DEAL-BREAKER. Israel rejection is near-fatal. But ALSO actively search for Pareto improvements even if all parties currently accept.

Return JSON:
{
  "proposedAmendments": [
    { "stakeholder": "id", "originalConcern": "text", "proposedChange": "specific creative change", "likelihood": "low|medium|high" }
  ],
  "revisedTermsPartial": { "nuclearProtocol": "complete replacement text for this field (self-contained, no references to prior version)", "sequencing": "complete replacement text (standalone)" },
  "negotiationStrategy": "overall creative strategy text",
  "creativeTradeoffs": [
    { "gives": "what one party gives (and why it costs them relatively little)", "gets": "what they receive in exchange (and why it matters a lot to them)", "netBenefit": "why this is positive-sum — all parties gain" }
  ]
}

CREATIVE MANDATE: Include at least 2 creative tradeoffs even if no stakeholders reject. These should be novel cross-issue deals that create new value. Think about asymmetric valuations — what is cheap for one party but precious for another?`;

  const { content, tokens } = await callLLMForStage(prompt, systemPrompt, 5, "generation", modelConfig, { maxTokens: 16384, timeoutMs: 600_000 });
  const result = parseLLMJson<NegotiatorResult & { creativeTradeoffs?: CreativeTradeoff[] }>(content, "negotiator");
  return { result, tokens };
}

/**
 * DOMESTIC AUDIENCE AGENTS (OpenAI) — evaluation role
 * Assesses whether each domestic political audience in key countries would accept the deal.
 */
export async function evaluateDomesticAudiences(
  terms: DealTerms,
  modelConfig: ModelConfig = DEFAULT_MODELS,
  evidenceSummary: string = "",
): Promise<{ evaluations: Record<string, DomesticVerdict>; tokens: number }> {
  const systemPrompt = `You are a political analyst assessing domestic political sellability of a peace deal.
Consider any recent developments provided — they may shift domestic political dynamics, public opinion, or leader positioning, making the deal easier or harder to sell to specific audiences.
For each audience, return: { "audience": "label", "verdict": "sellable|difficult|unsellable", "rationale": "1-2 sentences" }
Output a JSON object with keys like "iran_supreme_leader", "us_congress", etc.`;

  const audienceList = Object.entries(DOMESTIC_AUDIENCES).flatMap(([stakeholderId, { stakeholder, audiences }]) =>
    audiences.map(a => ({ key: `${stakeholderId}_${a.replace(/\s+/g, "_").toLowerCase()}`, label: `${stakeholder} — ${a}` }))
  );

  const innovativeContext = terms.innovativeProvisions?.length
    ? `\nINNOVATIVE PROVISIONS (novel deal elements — consider how each audience would react to these):\n${terms.innovativeProvisions.map(p => `- ${p.title}: ${p.description}`).join("\n")}`
    : "";

  const evidenceBlock = evidenceSummary
    ? `\nRECENT DEVELOPMENTS (these are the latest developments — they may or may not significantly affect domestic political dynamics and audience reactions):
${evidenceSummary.slice(0, 8000)}\n`
    : "";

  const prompt = `Assess the domestic political sellability of this peace deal to these audiences:
${evidenceBlock}
DEAL TERMS:
- Nuclear: ${terms.nuclearProtocol}
- Sanctions: ${terms.sanctionsRelief}
- Sequencing: ${terms.sequencing}
- Timeline: ${terms.timelineYears} years${innovativeContext}

AUDIENCES:
${audienceList.map(a => `- ${a.key}: ${a.label}`).join("\n")}

Return JSON where each key maps to { "audience": "label", "verdict": "sellable|difficult|unsellable", "rationale": "brief" }.`;

  const { content, tokens } = await callLLMForStage(prompt, systemPrompt, 3, "evaluation", modelConfig);

  const parsed = parseLLMJson<Record<string, DomesticVerdict>>(content, "domestic-audiences");
  return { evaluations: parsed, tokens };
}

/**
 * RED-TEAM AGENT (Gemini) — adversarial role
 * Generates attack scenarios against the deal's viability.
 */
export async function runRedTeam(
  terms: DealTerms,
  modelConfig: ModelConfig = DEFAULT_MODELS,
  evidenceSummary: string = "",
): Promise<{ results: RedTeamResult[]; tokens: number }> {
  const systemPrompt = `You are an adversarial red-team analyst trying to find fatal flaws in a peace deal.
Consider any recent developments provided — they may reveal new vulnerabilities, spoiler dynamics, or destabilizing events that create attack vectors against this deal. Your attacks should reflect the current situation, not just generic risks.
Generate 5 adversarial attacks that could collapse this deal. Output as JSON array.`;

  const innovativeContext = terms.innovativeProvisions?.length
    ? `\nINNOVATIVE PROVISIONS (also stress-test these novel elements):\n${terms.innovativeProvisions.map(p => `- ${p.title}: ${p.description}`).join("\n")}`
    : "";

  const evidenceBlock = evidenceSummary
    ? `\nRECENT DEVELOPMENTS (use these to identify timely, situation-specific attack vectors — these may or may not reveal new vulnerabilities):
${evidenceSummary.slice(0, 8000)}\n`
    : "";

  const prompt = `Red-team this peace deal:
${evidenceBlock}
Nuclear: ${terms.nuclearProtocol}
Sanctions: ${terms.sanctionsRelief}
Sequencing: ${terms.sequencing}${innovativeContext}

Return JSON array: [{ "attack": "description", "severity": "low|medium|high|critical", "response": "how proponents respond", "survived": true|false }, ...]`;

  const { content, tokens } = await callLLMForStage(prompt, "You are an adversarial analyst. Output JSON.", 4, "adversarial", modelConfig);

  const parsed = parseLLMJson<RedTeamResult[]>(content, "red-team");
  return { results: parsed, tokens };
}

const SCORE_KEYS = ["feasibility", "coherence", "evidenceGrounding", "domesticSellability", "regionalStability", "implementability", "durability"] as const;

/**
 * JUDGE PANEL — multi-LLM scoring
 * Calls all 3 LLM providers (Anthropic, OpenAI, Gemini) in parallel with the
 * same prompt. Each returns per-dimension scores + rationale. The final scores
 * are the arithmetic mean across all providers. All individual responses are
 * stored in `judgePanel` for full transparency.
 */
export async function judgeAndScore(
  terms: DealTerms,
  stakeholderEvaluations: Record<string, StakeholderVerdict>,
  redTeamResults: RedTeamResult[],
  domesticEvaluations: Record<string, DomesticVerdict>,
  modelConfig: ModelConfig = DEFAULT_MODELS,
  evidenceSummary: string = "",
): Promise<{ scores: DealScores; tokens: number }> {
  const getVerdict = (id: string) => stakeholderEvaluations[id]?.verdict;
  const iranVerdict = getVerdict("iran");
  const usVerdict = getVerdict("us");
  const israelVerdict = getVerdict("israel");

  const requiredAccept = iranVerdict !== "reject" && usVerdict !== "reject";
  const israelAccepts = israelVerdict !== "reject";

  const tierCounts = (tier: AcceptanceTier) => {
    const ids = getStakeholdersByTier(tier).map(s => s.id);
    const evals = ids.map(id => stakeholderEvaluations[id]).filter(Boolean);
    return {
      accept: evals.filter(e => e.verdict === "accept").length,
      conditional: evals.filter(e => e.verdict === "conditional").length,
      reject: evals.filter(e => e.verdict === "reject").length,
      total: evals.length,
    };
  };

  const requiredTier = tierCounts("required");
  const criticalTier = tierCounts("critical");
  const influentialTier = tierCounts("influential");
  const contextualTier = tierCounts("contextual");

  const totalAccept = Object.values(stakeholderEvaluations).filter(e => e.verdict === "accept").length;
  const totalReject = Object.values(stakeholderEvaluations).filter(e => e.verdict === "reject").length;
  const totalStakeholders = Object.keys(stakeholderEvaluations).length || 1;

  const survivedCount = redTeamResults.filter(r => r.survived).length;
  const totalRedTeam = redTeamResults.length || 1;

  const domesticSellable = Object.values(domesticEvaluations).filter(d => d.verdict === "sellable").length;
  const domesticUnsellable = Object.values(domesticEvaluations).filter(d => d.verdict === "unsellable").length;
  const domesticTotal = Object.keys(domesticEvaluations).length || 1;

  const systemPrompt = `You are a panel of senior diplomats and conflict resolution experts scoring a peace deal on seven dimensions from 0.0 to 1.0.
Use the FULL range of each scale. A deal that is creative and well-structured can still score 0.6-0.8 on coherence, evidence grounding, or implementability even if political acceptance is low. Score each dimension INDEPENDENTLY based on its own criteria — do not let a weakness in one dimension drag down unrelated dimensions.
For each dimension, provide a score AND a 1-2 sentence rationale explaining the key factors behind the score.
Output JSON only.`;

  const commitmentsBlock = terms.stakeholderCommitments
    ? `\nSTAKEHOLDER COMMITMENTS (grand coalition):\n${Object.entries(terms.stakeholderCommitments).map(([id, c]) => `- ${id}: ${String(c).slice(0, 150)}`).join("\n")}`
    : "";

  const innovativeBlock = terms.innovativeProvisions?.length
    ? `\nINNOVATIVE PROVISIONS (novel mechanisms that may improve coherence, durability, or sellability scores):\n${terms.innovativeProvisions.map(p => `- ${p.title}: ${p.description}`).join("\n")}`
    : "";

  const truncField = (s: string, max = 1500) => s.length > max ? s.slice(0, max) + "…" : s;

  const evidenceBlock = evidenceSummary
    ? `\nRECENT GEOPOLITICAL EVIDENCE (use this to score "evidenceGrounding" — assess how well the deal accounts for these developments — and factor current conditions into feasibility, durability, and other dimensions where relevant):
${evidenceSummary.slice(0, 8000)}\n`
    : "";

  const prompt = `Score this peace deal (0.0-1.0 per dimension) and explain each score:
${evidenceBlock}
DEAL SUMMARY (post-negotiator amendments applied):
- Nuclear protocol: ${truncField(terms.nuclearProtocol)}
- Sanctions: ${truncField(terms.sanctionsRelief)}
- Maritime/Hormuz: ${truncField(terms.hormuzArrangements || "")}
- Humanitarian: ${truncField(terms.humanitarianProvisions || "")}
- Verification: ${truncField(terms.verificationMechanism || "")}
- Timeline: ${terms.timelineYears} years
- Sequencing: ${truncField(terms.sequencing)}
${commitmentsBlock}${innovativeBlock}

STAKEHOLDER ACCEPTANCE BY TIER:
- REQUIRED (Iran + US): ${requiredTier.accept} accept, ${requiredTier.conditional} conditional, ${requiredTier.reject} reject — Iran: ${iranVerdict || "unknown"}, US: ${usVerdict || "unknown"}
  ${!requiredAccept ? "Note: A required party rejects this deal. Factor this into feasibility, but score other dimensions on their own merits." : ""}
- CRITICAL (Israel): ${israelVerdict || "unknown"}
  ${!israelAccepts ? "Note: Israel rejects — this is a significant obstacle but not an absolute veto. Factor proportionally." : ""}
- INFLUENTIAL: ${influentialTier.accept} accept, ${influentialTier.conditional} conditional, ${influentialTier.reject} reject out of ${influentialTier.total}
- CONTEXTUAL: ${contextualTier.accept} accept, ${contextualTier.conditional} conditional, ${contextualTier.reject} reject out of ${contextualTier.total}
- OVERALL: ${totalAccept}/${totalStakeholders} accept, ${totalReject} reject

RED-TEAM SURVIVAL: ${survivedCount}/${totalRedTeam} attacks survived
DOMESTIC SELLABILITY: ${domesticSellable}/${domesticTotal} sellable, ${domesticUnsellable} unsellable

ECONOMIC CONTEXT: This conflict costs ~$450B/yr globally. A durable peace could yield ~$560B/yr in benefits — a $1T/yr swing. The largest economic channels are energy markets, trade/sanctions, and finance/banking.

ACCEPTANCE HIERARCHY: Iran and the US are the two REQUIRED parties — both must accept for ANY deal to be implementable. Israel is CRITICAL — its rejection doesn't automatically kill the deal but severely damages feasibility. Other stakeholders (influential + contextual) affect durability and regional stability but are not veto holders.

Return JSON with scores and rationale for each dimension:
{
  "feasibility": 0.0-1.0, "feasibilityRationale": "why this score",
  "coherence": 0.0-1.0, "coherenceRationale": "why this score",
  "evidenceGrounding": 0.0-1.0, "evidenceGroundingRationale": "why this score",
  "domesticSellability": 0.0-1.0, "domesticSellabilityRationale": "why this score",
  "regionalStability": 0.0-1.0, "regionalStabilityRationale": "why this score",
  "implementability": 0.0-1.0, "implementabilityRationale": "why this score",
  "durability": 0.0-1.0, "durabilityRationale": "why this score"
}`;

  const providers: { provider: ProviderName; model: string }[] = [
    { provider: "anthropic", model: modelConfig.judgePanelAnthropicModel ?? modelConfig.anthropicModel },
    { provider: "openai", model: modelConfig.judgePanelOpenaiModel ?? modelConfig.openaiModel },
    { provider: "gemini", model: modelConfig.judgePanelGeminiModel ?? modelConfig.geminiModel },
  ];

  const acceptRate = totalAccept / totalStakeholders;
  const redTeamSurvival = survivedCount / totalRedTeam;
  const baseScore = 0.3 + acceptRate * 0.3 + redTeamSurvival * 0.2;

  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const num = (v: unknown, fb: number) => { const n = Number(v); return Number.isFinite(n) ? n : fb; };

  const MIN_VALID_DIMENSIONS = 4;

  const results = await Promise.allSettled(
    providers.map(async ({ provider, model }) => {
      const resp = await callLLM(prompt, systemPrompt, provider, model, { timeoutMs: 600_000 });
      const { content, tokens } = resp;

      const parsed = parseLLMJson<Record<string, unknown>>(content, `judge-panel-${provider}`);

      let validDimensions = 0;
      const scores: Record<string, number> = {};
      const rationale: Record<string, string> = {};
      for (const key of SCORE_KEYS) {
        const raw = Number(parsed[key]);
        if (Number.isFinite(raw) && raw >= 0 && raw <= 1) {
          scores[key] = clamp(raw);
          validDimensions++;
        } else {
          logger.warn({ provider, key }, "Judge panel returned invalid score for dimension — setting to 0");
          scores[key] = 0;
        }
        rationale[key] = String(parsed[`${key}Rationale`] ?? "");
      }

      if (validDimensions < MIN_VALID_DIMENSIONS) {
        throw new Error(`${provider} returned only ${validDimensions}/${SCORE_KEYS.length} valid dimensions (need ${MIN_VALID_DIMENSIONS})`);
      }

      return { provider, model, scores, rationale, tokens };
    })
  );

  const panelEntries: JudgePanelEntry[] = [];
  let totalTokens = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { provider, model, scores, rationale, tokens } = result.value;
      panelEntries.push({ provider, model, scores, rationale });
      totalTokens += tokens;
    } else {
      logger.error({ error: result.reason }, "Judge panel LLM call failed");
    }
  }

  if (panelEntries.length === 0) {
    throw new Error("All judge panel LLM calls failed");
  }

  const averaged: Record<string, number> = {};
  const mergedRationale: Record<string, string> = {};
  for (const key of SCORE_KEYS) {
    const values = panelEntries.map(e => e.scores[key]);
    averaged[key] = values.reduce((a, b) => a + b, 0) / values.length;
    mergedRationale[key] = panelEntries.map(e => e.rationale[key]).filter(Boolean).join(" | ");
  }

  const scores: DealScores = {
    feasibility: averaged.feasibility,
    coherence: averaged.coherence,
    evidenceGrounding: averaged.evidenceGrounding,
    domesticSellability: averaged.domesticSellability,
    regionalStability: averaged.regionalStability,
    implementability: averaged.implementability,
    durability: averaged.durability,
    composite: 0,
    scoreRationale: mergedRationale,
    judgePanel: panelEntries,
    judgePrompt: `[SYSTEM]\n${systemPrompt}\n\n[USER]\n${prompt}`,
  };

  const diminish = (score: number, floor: number, strength: number) => {
    return floor + (score - floor) * strength;
  };

  if (!requiredAccept) {
    scores.feasibility = diminish(scores.feasibility, 0.10, 0.45);
    scores.implementability = diminish(scores.implementability, 0.10, 0.50);
    scores.durability = diminish(scores.durability, 0.10, 0.45);
  }
  if (!israelAccepts) {
    scores.feasibility = diminish(scores.feasibility, 0.12, 0.55);
    scores.durability = diminish(scores.durability, 0.12, 0.55);
    scores.regionalStability = diminish(scores.regionalStability, 0.12, 0.55);
  }

  scores.composite = (
    scores.feasibility * 0.15 +
    scores.coherence * 0.15 +
    scores.evidenceGrounding * 0.12 +
    scores.domesticSellability * 0.15 +
    scores.regionalStability * 0.13 +
    scores.implementability * 0.15 +
    scores.durability * 0.15
  );

  if (!requiredAccept) {
    scores.composite -= 0.10;
  }
  if (!israelAccepts) {
    scores.composite -= 0.05;
  }
  scores.composite = Math.max(0, scores.composite);

  return { scores, tokens: totalTokens };
}

/**
 * META-EVALUATOR AGENT (Stage 7) — meta-evaluation + pipeline hill-climbing
 * Evaluates the overall quality of the pipeline's reasoning and suggests improvements.
 * NOW ENHANCED: Also suggests specific prompt improvements for each pipeline stage,
 * enabling the autoresearch loop to hill-climb on the pipeline itself.
 */
export async function runMetaEvaluator(
  terms: DealTerms,
  scores: DealScores,
  negotiatorResult: NegotiatorResult | null,
  stakeholderEvaluations: Record<string, StakeholderVerdict>,
  brainstormInsights: BrainstormInsights | null,
  domesticFramingStrategies: Record<string, DomesticFramingStrategy>,
  modelConfig: ModelConfig = DEFAULT_MODELS,
  currentPipelineOverrides: Record<string, string> = {},
): Promise<{ result: MetaEvaluatorResult; tokens: number }> {
  const systemPrompt = `You are a meta-level evaluator assessing the quality of an AI peace deal pipeline's reasoning.
You have TWO critical jobs:
1. EVALUATE: Assess the pipeline's reasoning quality, find blind spots, suggest architecture changes.
2. IMPROVE THE PIPELINE ITSELF: Suggest specific prompt modifications for each stage that would produce better deals next time. Think of yourself as a machine learning researcher tuning a system — what would you change about the instructions to each AI agent?

PIPELINE STAGES YOU CAN SUGGEST IMPROVEMENTS FOR:
- "brainstorm_system" or "brainstorm_user": The innovation brainstorm pre-stage
- "proposal_system" or "proposal_user": The deal proposal generator
- "framing_system": The domestic framing strategy generator
- "negotiator_system": The creative negotiator

For each improvement, describe what's currently weak and suggest a SPECIFIC prompt addition or modification. These will be injected into future pipeline runs.

Output JSON only.`;

  const acceptCount = Object.values(stakeholderEvaluations).filter(e => e.verdict === "accept").length;
  const rejectCount = Object.values(stakeholderEvaluations).filter(e => e.verdict === "reject").length;

  const brainstormQuality = brainstormInsights
    ? `Brainstorm produced ${brainstormInsights.historicalAnalogies.length} analogies, ${brainstormInsights.creativeProvisions.length} creative provisions, ${brainstormInsights.crossIssueLinkages.length} linkages.`
    : "No brainstorm stage ran.";

  const framingQuality = Object.keys(domesticFramingStrategies).length > 0
    ? `Framing strategies generated for ${Object.keys(domesticFramingStrategies).length} difficult audiences.`
    : "No framing strategies generated.";

  const overridesActive = Object.keys(currentPipelineOverrides).length > 0
    ? `Active pipeline overrides: ${Object.keys(currentPipelineOverrides).join(", ")}`
    : "No pipeline overrides active (using default prompts).";

  const innovativeCount = terms.innovativeProvisions?.length ?? 0;

  const prompt = `Evaluate this AI pipeline's reasoning about an Iran peace deal AND suggest improvements:

DEAL COMPOSITE SCORE: ${(scores.composite * 100).toFixed(1)}%
STAKEHOLDER RESULTS: ${acceptCount} accept, ${rejectCount} reject out of ${Object.keys(stakeholderEvaluations).length}
NEGOTIATOR APPLIED: ${negotiatorResult ? `Yes — proposed ${negotiatorResult.proposedAmendments.length} amendments` : "No"}
INNOVATIVE PROVISIONS: ${innovativeCount} generated
${brainstormQuality}
${framingQuality}
${overridesActive}
WEAKEST DIMENSIONS: ${Object.entries(scores)
  .filter(([k]) => k !== "composite")
  .sort(([, a], [, b]) => (a as number) - (b as number))
  .slice(0, 2)
  .map(([k, v]) => `${k}: ${((v as number) * 100).toFixed(0)}%`)
  .join(", ")}

Assess the reasoning quality and suggest pipeline improvements:
{
  "pipelineQuality": 0.0-1.0,
  "reasoning": "2-3 sentence assessment of pipeline reasoning quality, including brainstorm and framing stages",
  "blindspots": ["list", "of", "identified", "gaps"],
  "suggestedNextArchitecture": "balanced|nuclear-first|hormuz-first|humanitarian-first|radical-restructure|asymmetric-grand-bargain|incremental-confidence|freeform",
  "confidenceInOutcome": 0.0-1.0,
  "promptImprovements": [
    {
      "stage": "brainstorm_system|brainstorm_user|proposal_system|proposal_user|framing_system|negotiator_system",
      "currentWeakness": "what the current prompts are failing to produce",
      "suggestedChange": "SPECIFIC text to add or modify in the prompt. Be concrete — write actual prompt text.",
      "expectedImpact": "what improvement this should produce and on which scoring dimensions"
    }
  ]
}

IMPORTANT: The promptImprovements field is how this pipeline evolves over time. Be specific and actionable. Vague suggestions like "improve stakeholder analysis" are useless. Instead, write specific prompt additions like "Add instruction: Consider the role of non-state actors as potential spoilers..." Include 2-4 concrete improvements.

CONSTRAINT ON PROMPT IMPROVEMENTS: Every stage's output must be SELF-CONTAINED — fully understandable without reference to any prior deal or cycle. Your suggested prompt changes must NEVER encourage the model to say "revised," "amended," "updated," "all existing provisions remain," "key changes from previous version," or any language implying the output modifies a prior document. Each deal must read as the first and only deal the reader will ever see.`;

  const { content, tokens } = await callLLMForStage(prompt, systemPrompt, 7, "evaluation", modelConfig, { maxTokens: 16384, timeoutMs: 600_000 });
  const result = parseLLMJson<MetaEvaluatorResult>(content, "meta-evaluator");
  return { result, tokens };
}

/**
 * DIAGNOSIS GENERATOR (Gemini) — adversarial/synthesis role
 * Produces a human-readable explanation of why the deal succeeded or failed.
 */
export async function generateDiagnosis(
  terms: DealTerms,
  stakeholderEvaluations: Record<string, StakeholderVerdict>,
  redTeamResults: RedTeamResult[],
  scores: DealScores,
  modelConfig: ModelConfig = DEFAULT_MODELS,
): Promise<{ diagnosis: string; tokens: number }> {
  const rejecterEntries = Object.entries(stakeholderEvaluations).filter(([, e]) => e.verdict === "reject");
  const rejecters = rejecterEntries.map(([id, e]) => `${id}: ${e.rationale}`);
  const requiredRejecters = rejecterEntries.filter(([id]) => ["iran", "us"].includes(id)).map(([id]) => id);
  const criticalRejecters = rejecterEntries.filter(([id]) => id === "israel").map(([id]) => id);

  const failures = redTeamResults.filter(r => !r.survived)
    .map(r => r.attack);

  if (rejecters.length === 0 && failures.length === 0) {
    return {
      diagnosis: `Deal scored ${(scores.composite * 100).toFixed(1)}% composite. All core stakeholders conditionally accepting. Primary area for improvement: domestic sellability (${(scores.domesticSellability * 100).toFixed(1)}%).`,
      tokens: 0,
    };
  }

  const tierWarning = requiredRejecters.length > 0
    ? `\nCRITICAL: ${requiredRejecters.join(" and ")} (REQUIRED tier) reject — deal is NOT implementable without their acceptance.`
    : criticalRejecters.length > 0
    ? `\nWARNING: Israel (CRITICAL tier) rejects — deal viability is severely undermined.`
    : "";

  const prompt = `Write a 2-3 sentence diagnosis of why this peace deal is facing difficulties:

Key rejectors: ${rejecters.slice(0, 5).join("; ")}
Failed red-team stress tests: ${failures.slice(0, 3).join("; ")}
Lowest scoring dimension: ${Object.entries(scores).filter(([k]) => k !== "composite").sort((a, b) => (a[1] as number) - (b[1] as number))[0]?.[0]}
${tierWarning}

ACCEPTANCE HIERARCHY: Iran + US acceptance is REQUIRED (deal-breaker if either rejects). Israel is CRITICAL (near-fatal). Others are influential but not gatekeepers.
Be specific about which stakeholder objections and which structural weakness are most critical to fix.`;

  const { content, tokens } = await callLLMForStage(prompt, "You are a strategic conflict analyst. Provide a concise diagnosis paragraph. No JSON.", 8, "adversarial", modelConfig);
  return {
    diagnosis: content.trim().replace(/^```[\s\S]*?```$/m, "").trim() || "Deal faces significant stakeholder resistance. Nuclear verification and domestic political constraints are the primary barriers.",
    tokens,
  };
}

/**
 * WHAT-WOULD-IT-TAKE — computes concrete requirements for acceptance
 * Now uses LLM to generate detailed, actionable requirements per rejecting stakeholder.
 */
export async function computeWhatWouldItTake(
  terms: DealTerms,
  stakeholderEvaluations: Record<string, StakeholderVerdict>,
  modelConfig: ModelConfig = DEFAULT_MODELS,
): Promise<Array<{ stakeholder: string; requirement: string; feasibility: "low" | "medium" | "high" }>> {
  const rejecters = Object.entries(stakeholderEvaluations).filter(([, e]) => e.verdict === "reject");
  const conditionals = Object.entries(stakeholderEvaluations).filter(([, e]) => e.verdict === "conditional");

  if (rejecters.length === 0 && conditionals.length === 0) return [];

  const systemPrompt = `You are a conflict resolution specialist. For each rejecting or conditional stakeholder, specify exactly what concrete change to the deal would move them toward acceptance. Be specific and actionable. Output JSON array.`;

  const prompt = `For this Iran peace deal, what concrete changes are needed for each stakeholder?

CURRENT DEAL:
- Nuclear: ${terms.nuclearProtocol.slice(0, 150)}
- Sanctions: ${terms.sanctionsRelief.slice(0, 150)}
- Sequencing: ${terms.sequencing.slice(0, 150)}

STAKEHOLDERS NEEDING CHANGES:
${[...rejecters, ...conditionals].map(([id, e]) => `- ${id}: violations: ${e.redLineViolations.join(", ")}; conditions: ${e.conditions.join(", ")}`).join("\n")}

Return JSON array: [{ "stakeholder": "id", "requirement": "specific concrete requirement", "feasibility": "low|medium|high" }]
Limit to 6 items total.`;

  const { provider, model } = resolveStageConfig(6, "evaluation", modelConfig);
  const { content } = await callLLM(prompt, systemPrompt, provider, model);

  return parseLLMJson<Array<{ stakeholder: string; requirement: string; feasibility: "low" | "medium" | "high" }>>(content, "what-would-it-take");
}

/**
 * FULL EVALUATION PIPELINE (Enhanced)
 * Stages:
 * 0. Innovation Brainstorm — creative pre-generation with historical mining
 * 1. Proposal Agent — generates deal terms with innovative provisions
 * 2. Stakeholder Evaluation Agent — assesses stakeholder acceptance
 * 3. Domestic Audience Agent — assesses domestic political sellability
 * 3.5. Creative Reframing Agent — generates domestic selling narratives
 * 4. Red-Team Agent — adversarial stress testing
 * 5. Creative Negotiator Agent — Pareto improvements + creative tradeoffs
 * 6. Judge Agent — scores on 7 dimensions (3-model panel)
 * 7. Meta-Evaluator — evaluates pipeline quality + suggests prompt improvements
 * 8. Diagnosis Generator — human-readable explanation
 */
function classifyStageError(err: unknown): { type: string; message: string; provider?: string; model?: string } {
  if (err instanceof LLMCallError) {
    return { type: "llm_call", message: err.message, provider: err.provider, model: err.model };
  }
  if (err instanceof LLMParseError) {
    return { type: "llm_parse", message: err.message };
  }
  if (err instanceof Error) {
    return { type: "runtime", message: err.message };
  }
  return { type: "unknown", message: String(err) };
}

export async function runFullEvaluation(
  evidenceSummary: string,
  previousDiagnosis: string,
  architecture: Architecture = "balanced",
  modelConfig: ModelConfig = DEFAULT_MODELS,
  pipelineOverrides: Record<string, string> = {},
  onSubStage?: (subStage: DealSubStage) => void,
  dealMemory: DealMemoryContext | null = null,
  cycleId?: string,
): Promise<EvaluatedDeal> {
  validateModelConfig(modelConfig);
  await loadStakeholderRegistryFromDB();
  const pipelineStart = Date.now();
  let currentStage = "init";
  const cid = cycleId ?? "deal-" + Date.now();
  logger.info({ architecture, overrides: Object.keys(pipelineOverrides), hasDealMemory: !!dealMemory, topDealsCount: dealMemory?.topDeals.length ?? 0 }, "Starting deal evaluation pipeline");
  const archDescriptions: Record<string, string> = {
    balanced: "a balanced approach weighing all dimensions equally",
    "nuclear-first": "prioritizing nuclear non-proliferation as the core issue",
    "hormuz-first": "prioritizing Strait of Hormuz maritime security arrangements",
    "humanitarian-first": "prioritizing humanitarian concerns and civilian welfare",
    "radical-restructure": "a radical restructuring of the entire regional security framework",
    "asymmetric-grand-bargain": "an asymmetric grand bargain with creative tradeoffs between parties",
    "incremental-confidence": "small incremental confidence-building measures that gradually build trust",
    freeform: "an unconstrained creative approach with no architectural constraints",
  };
  const archDesc = archDescriptions[architecture] ?? architecture;
  emitCycleLog({ cycleId: cid, level: "stage", stage: "deal_pipeline", message: `Starting the deal evaluation pipeline using the "${architecture}" architecture — ${archDesc}. This multi-stage pipeline will brainstorm ideas, draft a full deal proposal, evaluate it from every stakeholder's perspective, stress-test it for flaws, negotiate improvements, and score it on 7 dimensions.${Object.keys(pipelineOverrides).length > 0 ? ` Using ${Object.keys(pipelineOverrides).length} evolved prompt overrides from previous cycles.` : ""}`, metadata: { architecture, overrides: Object.keys(pipelineOverrides) } });
  let totalTokens = 0;
  let totalCost = 0;

  const stageLog = (stage: string, message: string, extra?: Partial<Parameters<typeof emitCycleLog>[0]>) => {
    emitCycleLog({ cycleId: cid, level: "info", stage: `deal.${stage}`, message, ...extra });
  };

  try {

  currentStage = "brainstorm";
  onSubStage?.("brainstorm");
  emitCycleLog({ cycleId: cid, level: "stage", stage: "deal.brainstorm", message: "Stage 0: Innovation Brainstorm — An AI model is searching through historical peace agreements (e.g., Camp David Accords, JCPOA, Good Friday Agreement) for relevant analogies, and generating creative deal provisions that could help bridge gaps between the parties. This stage feeds ideas into the proposal generator." });
  const bs0 = Date.now();
  const { insights: brainstormInsights, tokens: t0 } = await runInnovationBrainstorm(evidenceSummary, previousDiagnosis, architecture, modelConfig, pipelineOverrides, dealMemory);
  totalTokens += t0;
  logger.info({ stage: "brainstorm", analogies: brainstormInsights.historicalAnalogies.length, provisions: brainstormInsights.creativeProvisions.length, tokens: t0 }, "Stage 0 complete");
  const analogyNames = brainstormInsights.historicalAnalogies.map((a: any) => a.dealName || a.title || a.name || (typeof a === "string" ? a : JSON.stringify(a))).slice(0, 5);
  const provisionNames = brainstormInsights.creativeProvisions.map((p: any) => p.title || p.idea || p.name || (typeof p === "string" ? p : JSON.stringify(p))).slice(0, 5);
  stageLog("brainstorm", `Brainstorm complete — found ${brainstormInsights.historicalAnalogies.length} historical analogi${brainstormInsights.historicalAnalogies.length === 1 ? "y" : "es"} (lessons from past treaties) and generated ${brainstormInsights.creativeProvisions.length} creative provision${brainstormInsights.creativeProvisions.length === 1 ? "" : "s"} (novel ideas like economic cooperation zones, technology sharing, or maritime safety corridors).`, { durationMs: Date.now() - bs0, tokens: t0, metadata: { analogies: analogyNames, provisions: provisionNames } });

  currentStage = "proposal";
  onSubStage?.("proposal");
  emitCycleLog({ cycleId: cid, level: "stage", stage: "deal.proposal", message: "Stage 1: Proposal Generation — An AI model is now drafting a complete peace deal proposal. This includes specific terms for nuclear protocols, sanctions relief schedules, Strait of Hormuz security arrangements, verification mechanisms, and sequencing of concessions. The brainstorm insights from Stage 0 are used to enrich the proposal with creative provisions." });
  const bs1 = Date.now();
  const { terms, tokens: t1 } = await generateProposal(evidenceSummary, previousDiagnosis, architecture, modelConfig, brainstormInsights, pipelineOverrides, dealMemory);
  totalTokens += t1;
  logger.info({ stage: "proposal", innovativeProvisions: terms.innovativeProvisions?.length ?? 0, tokens: t1 }, "Stage 1 complete");
  stageLog("proposal", `Proposal generated with ${terms.innovativeProvisions?.length ?? 0} innovative provision${(terms.innovativeProvisions?.length ?? 0) === 1 ? "" : "s"}. The deal includes terms on nuclear safeguards, economic relief, regional security, and implementation timelines. Next: every stakeholder will evaluate this deal.`, { durationMs: Date.now() - bs1, tokens: t1, metadata: { innovativeProvisions: terms.innovativeProvisions?.map((p: any) => p.title).slice(0, 5), hasNuclearProtocol: !!terms.nuclearProtocol, hasSanctionsRelief: !!terms.sanctionsRelief, hasHormuzArrangements: !!terms.hormuzArrangements } });

  currentStage = "stakeholders";
  onSubStage?.("stakeholders");
  const stakeholderCount = 33;
  emitCycleLog({ cycleId: cid, level: "stage", stage: "deal.stakeholders", message: `Stage 2: Stakeholder Evaluation — The deal is now being evaluated from the perspective of each of the ${stakeholderCount} conflict actors (Iran, US, Israel, Saudi Arabia, UAE, IRGC, Hezbollah, IAEA, EU, China, Russia, and more). For each stakeholder, an AI model assesses whether they would accept, conditionally accept, or reject the deal based on their known interests, red lines, and domestic political constraints.` });
  const bs2 = Date.now();
  const { evaluations: stakeholderEvaluations, tokens: t2 } = await evaluateStakeholders(terms, modelConfig, evidenceSummary);
  totalTokens += t2;
  const accepts = Object.values(stakeholderEvaluations).filter((e: any) => e.verdict === "accept").length;
  const rejects = Object.values(stakeholderEvaluations).filter((e: any) => e.verdict === "reject").length;
  const conditionals = Object.keys(stakeholderEvaluations).length - accepts - rejects;
  logger.info({ stage: "stakeholders", tokens: t2 }, "Stage 2 complete");
  const rejectNames = Object.entries(stakeholderEvaluations).filter(([, e]: [string, any]) => e.verdict === "reject").map(([id]) => id).slice(0, 5);
  stageLog("stakeholders", `Stakeholder evaluation complete — ${accepts} stakeholder${accepts === 1 ? "" : "s"} would accept the deal, ${conditionals} would conditionally accept (with modifications), and ${rejects} would reject it${rejects > 0 ? ` (${rejectNames.join(", ")})` : ""}. The negotiator stage will try to address rejections.`, { durationMs: Date.now() - bs2, tokens: t2, metadata: { accepts, rejects, conditionals, rejectingStakeholders: rejectNames } });

  currentStage = "domestic";
  onSubStage?.("domestic");
  emitCycleLog({ cycleId: cid, level: "stage", stage: "deal.domestic", message: "Stage 3: Domestic Sellability — Even a perfect deal fails if leaders can't sell it at home. An AI model is now evaluating how each major country's domestic audience (voters, media, opposition parties, military establishment) would react to this deal. This tests whether the deal is politically viable, not just diplomatically sound." });
  const bs3 = Date.now();
  const { evaluations: domesticEvaluations, tokens: t3 } = await evaluateDomesticAudiences(terms, modelConfig, evidenceSummary);
  totalTokens += t3;
  const domesticCountries = Object.keys(domesticEvaluations);
  logger.info({ stage: "domestic", tokens: t3 }, "Stage 3 complete");
  stageLog("domestic", `Domestic audience analysis complete for ${domesticCountries.length} countr${domesticCountries.length === 1 ? "y" : "ies"} (${domesticCountries.join(", ")}). Each evaluation assesses public opinion feasibility, political opposition risks, and media framing challenges.`, { durationMs: Date.now() - bs3, tokens: t3, metadata: { countries: domesticCountries } });

  currentStage = "framing";
  onSubStage?.("framing");
  emitCycleLog({ cycleId: cid, level: "stage", stage: "deal.framing", message: "Stage 3.5: Victory Narrative Generation — For each country, an AI is now crafting a 'victory narrative' — the specific way each government could frame this deal to their domestic audience as a win. For example, how Iran frames nuclear concessions as sovereignty-preserving, or how the US frames sanctions relief as strategic leverage gained." });
  const bs35 = Date.now();
  const { strategies: domesticFramingStrategies, tokens: t35 } = await generateDomesticFramingStrategies(terms, domesticEvaluations, modelConfig, pipelineOverrides);
  totalTokens += t35;
  const framingCountries = Object.keys(domesticFramingStrategies);
  logger.info({ stage: "framing", strategiesGenerated: framingCountries.length, tokens: t35 }, "Stage 3.5 complete");
  stageLog("framing", `Generated ${framingCountries.length} domestic framing strateg${framingCountries.length === 1 ? "y" : "ies"} (${framingCountries.join(", ")}). Each strategy provides specific talking points, media narratives, and opposition counter-arguments that could make the deal politically viable at home.`, { durationMs: Date.now() - bs35, tokens: t35, metadata: { countries: framingCountries } });

  currentStage = "redteam";
  onSubStage?.("redteam");
  emitCycleLog({ cycleId: cid, level: "stage", stage: "deal.redteam", message: "Stage 4: Red Team Adversarial Analysis — A separate AI model (acting as an adversary) is now stress-testing the deal for fatal flaws, spoiler scenarios, and unintended consequences. It will try to find ways the deal could collapse, be exploited, or create perverse incentives — things the proposal's author might have overlooked." });
  const bs4 = Date.now();
  const { results: redTeamResults, tokens: t4 } = await runRedTeam(terms, modelConfig, evidenceSummary);
  totalTokens += t4;
  logger.info({ stage: "redteam", tokens: t4 }, "Stage 4 complete");
  const rtFlaws = Array.isArray(redTeamResults) ? redTeamResults.length : (redTeamResults as any)?.fatalFlaws?.length ?? 0;
  stageLog("redteam", `Red team analysis complete — identified ${rtFlaws} potential vulnerabilit${rtFlaws === 1 ? "y" : "ies"} including spoiler scenarios, enforcement gaps, and escalation risks. These findings will be factored into the negotiator's amendments in the next stage.`, { durationMs: Date.now() - bs4, tokens: t4, metadata: { vulnerabilitiesFound: rtFlaws } });

  currentStage = "negotiator";
  onSubStage?.("negotiator");
  emitCycleLog({ cycleId: cid, level: "stage", stage: "deal.negotiator", message: "Stage 5: AI Negotiator — An AI model is acting as a skilled mediator. It reviews all stakeholder objections, red team vulnerabilities, and domestic framing challenges, then proposes specific amendments to the deal that could flip rejections to acceptances. It looks for Pareto improvements — changes that make at least one party better off without making anyone worse off." });
  const bs5 = Date.now();
  const { result: negotiatorResult, tokens: t5 } = await runNegotiator(terms, stakeholderEvaluations, domesticFramingStrategies, modelConfig, pipelineOverrides);
  totalTokens += t5;
  const amendCount = negotiatorResult.proposedAmendments.length;
  const tradeoffCount = negotiatorResult.creativeTradeoffs?.length ?? 0;
  logger.info({ stage: "negotiator", amendments: amendCount, tradeoffs: tradeoffCount, tokens: t5 }, "Stage 5 complete");
  const amendNames = negotiatorResult.proposedAmendments.map((a: any) => a.title || a.proposedChange || a.description || a.amendment || (typeof a === "string" ? a : JSON.stringify(a))).slice(0, 5);
  const tradeoffNames = (negotiatorResult.creativeTradeoffs ?? []).map((t: any) => t.title || t.description || t.idea || (typeof t === "string" ? t : JSON.stringify(t))).slice(0, 3);
  stageLog("negotiator", `Negotiation complete — proposed ${amendCount} amendment${amendCount === 1 ? "" : "s"} to the deal terms and identified ${tradeoffCount} creative tradeoff${tradeoffCount === 1 ? "" : "s"} (ways to exchange concessions between parties so everyone gains). The deal terms are now revised with these improvements incorporated.`, { durationMs: Date.now() - bs5, tokens: t5, metadata: { amendments: amendNames, tradeoffs: tradeoffNames } });

  const revisedTerms: DealTerms = {
    ...terms,
    ...(negotiatorResult.revisedTermsPartial as Partial<DealTerms>),
  };

  currentStage = "judge";
  onSubStage?.("judge");
  emitCycleLog({ cycleId: cid, level: "stage", stage: "deal.judge", message: "Stage 6: Judicial Panel Scoring — Three different AI models (Claude, GPT, Gemini) are independently scoring the revised deal on 7 dimensions: feasibility, coherence, evidence grounding, domestic sellability, regional stability, implementability, and durability. Using multiple models reduces single-model bias and produces a more reliable composite score." });
  const bs6 = Date.now();
  const { scores, tokens: t6 } = await judgeAndScore(revisedTerms, stakeholderEvaluations, redTeamResults, domesticEvaluations, modelConfig, evidenceSummary);
  totalTokens += t6;
  const compositePercent = (scores.composite * 100).toFixed(1);
  logger.info({ stage: "judge", composite: scores.composite.toFixed(3), tokens: t6 }, "Stage 6 complete");
  const dimScores = ["feasibility", "coherence", "evidenceGrounding", "domesticSellability", "regionalStability", "implementability", "durability"]
    .map(d => `${d}: ${((scores[d as keyof typeof scores] as number ?? 0) * 100).toFixed(0)}%`)
    .join(", ");
  stageLog("judge", `Judicial panel scored the deal at ${compositePercent}% composite. Dimension breakdown: ${dimScores}. ${scores.composite >= 0.5 ? "This is above the viability threshold." : "This is below the 50% viability threshold — the deal needs significant improvement."}`, { durationMs: Date.now() - bs6, tokens: t6, metadata: { composite: scores.composite, feasibility: scores.feasibility, coherence: scores.coherence, evidenceGrounding: scores.evidenceGrounding, domesticSellability: scores.domesticSellability, regionalStability: scores.regionalStability, implementability: scores.implementability, durability: scores.durability } });

  currentStage = "meta_eval";
  onSubStage?.("meta_eval");
  emitCycleLog({ cycleId: cid, level: "stage", stage: "deal.meta_eval", message: "Stage 7: Meta-Evaluator — An AI model is now reviewing the entire pipeline's performance on this deal. It evaluates whether the brainstorm was creative enough, whether the negotiator addressed key objections, whether the scoring seems calibrated, and suggests specific prompt improvements for future cycles. This is how the system learns and improves over time." });
  const bs7 = Date.now();
  const { result: metaEvaluatorResult, tokens: t7 } = await runMetaEvaluator(revisedTerms, scores, negotiatorResult, stakeholderEvaluations, brainstormInsights, domesticFramingStrategies, modelConfig, pipelineOverrides);
  totalTokens += t7;
  const promptImpCount = metaEvaluatorResult.promptImprovements?.length ?? 0;
  logger.info({ stage: "meta-evaluator", quality: metaEvaluatorResult.pipelineQuality, promptImprovements: promptImpCount, tokens: t7 }, "Stage 7 complete");
  stageLog("meta_eval", `Meta-evaluation complete — pipeline quality rated as "${metaEvaluatorResult.pipelineQuality}". ${promptImpCount > 0 ? `Suggested ${promptImpCount} improvement${promptImpCount === 1 ? "" : "s"} to the prompts used in future cycles (the system will automatically evolve its prompts if scores improve).` : "No prompt improvements suggested — the current prompts are performing well."}`, { durationMs: Date.now() - bs7, tokens: t7, metadata: { pipelineQuality: metaEvaluatorResult.pipelineQuality, promptImprovements: metaEvaluatorResult.promptImprovements?.map((p: any) => `${p.stage}: ${p.expectedImpact}`).slice(0, 5) } });

  currentStage = "diagnosis";
  onSubStage?.("diagnosis");
  emitCycleLog({ cycleId: cid, level: "stage", stage: "deal.diagnosis", message: "Stage 8: Strategic Diagnosis — An AI model is generating a comprehensive strategic diagnosis that summarizes the deal's strengths and weaknesses, identifies the critical path to agreement, and highlights which issues need the most creative problem-solving. This diagnosis guides the next cycle's brainstorm and proposal generation." });
  const bs8 = Date.now();
  const { diagnosis, tokens: t8 } = await generateDiagnosis(revisedTerms, stakeholderEvaluations, redTeamResults, scores, modelConfig);
  totalTokens += t8;
  logger.info({ stage: "diagnosis", tokens: t8 }, "Stage 8 complete");
  stageLog("diagnosis", `Strategic diagnosis generated (${diagnosis.length} characters). This analysis will be fed into the next cycle to help the system learn from this deal's strengths and weaknesses.`, { durationMs: Date.now() - bs8, tokens: t8, output: truncateForLog(diagnosis, 500) });

  totalCost = totalTokens * 0.000003;
  const elapsedSec = ((Date.now() - pipelineStart) / 1000).toFixed(1);
  logger.info({ architecture, totalTokens, totalCost: totalCost.toFixed(4), elapsedSec, composite: scores.composite.toFixed(3) }, "Deal evaluation pipeline complete");
  emitCycleLog({ cycleId: cid, level: "stage", stage: "deal_complete", message: `Deal pipeline complete. Final composite score: ${compositePercent}% using "${architecture}" architecture. Total: ${totalTokens.toLocaleString()} tokens consumed across all AI models in ${elapsedSec}s (~$${totalCost.toFixed(4)} estimated cost). The deal has been scored, amended, and diagnosed — ready for comparison against previous deals.`, durationMs: Date.now() - pipelineStart, tokens: totalTokens, metadata: { composite: scores.composite, architecture, totalCost, elapsedSeconds: parseFloat(elapsedSec) } });

  return {
    terms: revisedTerms,
    scores,
    stakeholderEvaluations,
    domesticEvaluations,
    domesticFramingStrategies,
    brainstormInsights,
    redTeamResults,
    negotiatorResult,
    metaEvaluatorResult,
    diagnosis,
    pipelineConfig: pipelineOverrides,
    tokensConsumed: totalTokens,
    costUsd: totalCost,
  };

  } catch (err) {
    const classified = classifyStageError(err);
    const elapsedSec = ((Date.now() - pipelineStart) / 1000).toFixed(1);
    logger.error({
      stage: currentStage,
      architecture,
      errorType: classified.type,
      provider: classified.provider,
      model: classified.model,
      tokensBeforeFailure: totalTokens,
      elapsedSec,
    }, `Pipeline failed at stage '${currentStage}': ${classified.message}`);
    const stageDescriptions: Record<string, string> = {
      brainstorm: "while generating historical analogies and creative provisions",
      proposal: "while drafting the deal proposal terms",
      stakeholders: "while evaluating the deal from stakeholder perspectives",
      domestic: "while assessing domestic audience reactions",
      framing: "while generating victory narratives for domestic audiences",
      redteam: "while adversarially testing the deal for flaws",
      negotiator: "while proposing amendments and Pareto improvements",
      judge: "while the judicial panel was scoring the deal",
      meta_eval: "while the meta-evaluator was reviewing pipeline quality",
      diagnosis: "while generating the strategic diagnosis",
    };
    const stageDesc = stageDescriptions[currentStage] ?? `at stage '${currentStage}'`;
    emitCycleLog({ cycleId: cid, level: "error", stage: `deal.${currentStage}`, message: `Deal pipeline failed ${stageDesc}: ${classified.message}. ${classified.type === "timeout" ? "The AI model took too long to respond." : classified.type === "rate_limit" ? "The AI provider rate-limited us — will retry next cycle." : "This may be a temporary issue."} ${totalTokens > 0 ? `${totalTokens.toLocaleString()} tokens were consumed before the failure.` : ""}`, durationMs: Date.now() - pipelineStart, tokens: totalTokens, metadata: { errorType: classified.type, provider: classified.provider, failedStage: currentStage } });
    throw err;
  }
}

export const DEAL_ARCHITECTURES = ARCHITECTURES;
export { STAKEHOLDER_REGISTRY, loadStakeholderRegistryFromDB, type AcceptanceTier, type StakeholderEntry };

export function isDominatedOnAllDimensions(
  a: DealScores,
  b: DealScores,
): boolean {
  const dims: (keyof Omit<DealScores, "composite">)[] = [
    "feasibility", "coherence", "evidenceGrounding", "domesticSellability",
    "regionalStability", "implementability", "durability",
  ];
  // b dominates a iff: b >= a on ALL dimensions AND b > a on AT LEAST ONE dimension.
  // Ties are not domination — identical deals both survive on the frontier.
  const bWeaklyDominates = dims.every(d => (b[d] ?? 0) >= (a[d] ?? 0));
  const bStrictlyBetterOnOne = dims.some(d => (b[d] ?? 0) > (a[d] ?? 0));
  return bWeaklyDominates && bStrictlyBetterOnOne;
}
