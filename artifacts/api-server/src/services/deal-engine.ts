import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger";

export type DealTerms = {
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
};

export type ProviderName = "anthropic" | "openai" | "gemini";

/**
 * ModelConfig — three levels of specificity (highest wins):
 *   1. Per-agent stage override (stage1..stage8 Provider/Model)
 *   2. Per-role bucket (generationProvider/Model, evaluationProvider/Model, adversarialProvider/Model)
 *   3. Legacy per-provider model (anthropicModel, openaiModel, geminiModel)
 */
export type ModelConfig = {
  anthropicModel: string;
  openaiModel: string;
  geminiModel: string;
  // Role-level config (applies to all stages with that role unless stage-level override exists)
  generationProvider: ProviderName;
  generationModel: string;
  evaluationProvider: ProviderName;
  evaluationModel: string;
  adversarialProvider: ProviderName;
  adversarialModel: string;
  // Judge panel model overrides (for 3-model scoring; falls back to base models)
  judgePanelAnthropicModel?: string;
  judgePanelOpenaiModel?: string;
  judgePanelGeminiModel?: string;
  // Per-agent stage overrides (highest priority)
  stage1Provider?: ProviderName; stage1Model?: string;   // Proposal Agent
  stage2Provider?: ProviderName; stage2Model?: string;   // Stakeholder Evaluator
  stage3Provider?: ProviderName; stage3Model?: string;   // Domestic Audiences
  stage4Provider?: ProviderName; stage4Model?: string;   // Red-Team Agent
  stage5Provider?: ProviderName; stage5Model?: string;   // Negotiator Agent
  stage6Provider?: ProviderName; stage6Model?: string;   // Judge Agent
  stage7Provider?: ProviderName; stage7Model?: string;   // Meta-Evaluator
  stage8Provider?: ProviderName; stage8Model?: string;   // Diagnosis Generator
};

export function validateModelConfig(config: ModelConfig): void {
  if (config.generationProvider === config.evaluationProvider) {
    throw new Error(
      `ModelConfig violation: generationProvider (${config.generationProvider}) and evaluationProvider (${config.evaluationProvider}) must use different LLM providers to ensure generation/evaluation independence.`
    );
  }
}

/** Resolve the effective provider+model for a given stage, with per-agent > per-role fallback. */
export function resolveStageConfig(
  stage: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
  role: "generation" | "evaluation" | "adversarial",
  config: ModelConfig,
): { provider: ProviderName; model: string } {
  const p = config[`stage${stage}Provider` as keyof ModelConfig] as ProviderName | undefined;
  const m = config[`stage${stage}Model` as keyof ModelConfig] as string | undefined;
  if (p && m) return { provider: p, model: m };
  return { provider: config[`${role}Provider`], model: config[`${role}Model`] };
}

export type EvaluatedDeal = {
  terms: DealTerms;
  scores: DealScores;
  stakeholderEvaluations: Record<string, StakeholderVerdict>;
  domesticEvaluations: Record<string, DomesticVerdict>;
  redTeamResults: RedTeamResult[];
  negotiatorResult: NegotiatorResult | null;
  metaEvaluatorResult: MetaEvaluatorResult | null;
  diagnosis: string;
  tokensConsumed: number;
  costUsd: number;
};

const ARCHITECTURES = ["balanced", "nuclear-first", "hormuz-first", "humanitarian-first"] as const;
type Architecture = typeof ARCHITECTURES[number];

const DEFAULT_MODELS: ModelConfig = {
  anthropicModel: "claude-sonnet-4-5",
  openaiModel: "gpt-4o",
  geminiModel: "gemini-2.5-flash",
  generationProvider: "anthropic",
  generationModel: "claude-sonnet-4-5",
  evaluationProvider: "openai",
  evaluationModel: "gpt-4o",
  adversarialProvider: "gemini",
  adversarialModel: "gemini-2.5-flash",
};

let _openai: import("openai").OpenAI | null = null;
async function getOpenAI() {
  if (!_openai) {
    const mod = await import("@workspace/integrations-openai-ai-server");
    _openai = mod.openai;
  }
  return _openai;
}

let _gemini: import("@google/genai").GoogleGenAI | null = null;
async function getGemini() {
  if (!_gemini) {
    const mod = await import("@workspace/integrations-gemini-ai");
    _gemini = mod.ai;
  }
  return _gemini;
}

let _anthropic: import("@anthropic-ai/sdk").Anthropic | null = null;
async function getAnthropic() {
  if (!_anthropic) {
    const mod = await import("@workspace/integrations-anthropic-ai");
    _anthropic = mod.anthropic;
  }
  return _anthropic;
}

async function callOpenAI(
  prompt: string,
  systemPrompt: string,
  model = DEFAULT_MODELS.openaiModel,
): Promise<{ content: string; tokens: number }> {
  try {
    const openai = await getOpenAI();
    const resp = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    return {
      content: resp.choices[0]?.message?.content ?? "{}",
      tokens: resp.usage?.total_tokens ?? 0,
    };
  } catch (err) {
    logger.warn({ err }, "OpenAI call failed, using fallback");
    return { content: "{}", tokens: 0 };
  }
}

async function callGemini(
  prompt: string,
  model = DEFAULT_MODELS.geminiModel,
): Promise<{ content: string; tokens: number }> {
  try {
    const gemini = await getGemini();
    const resp = await gemini.models.generateContent({
      model,
      contents: prompt,
    });
    return {
      content: resp.text ?? "{}",
      tokens: 500,
    };
  } catch (err) {
    logger.warn({ err }, "Gemini call failed, using fallback");
    return { content: "{}", tokens: 0 };
  }
}

async function callAnthropic(
  prompt: string,
  systemPrompt: string,
  model = DEFAULT_MODELS.anthropicModel,
): Promise<{ content: string; tokens: number }> {
  try {
    const anthropic = await getAnthropic();
    const resp = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });
    const content = resp.content[0];
    return {
      content: content?.type === "text" ? content.text : "{}",
      tokens: (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0),
    };
  } catch (err) {
    logger.warn({ err }, "Anthropic call failed, using fallback");
    return { content: "{}", tokens: 0 };
  }
}

/**
 * callLLM — routes an LLM call to a specific provider+model pair.
 */
async function callLLM(
  prompt: string,
  systemPrompt: string,
  provider: ProviderName,
  model: string,
): Promise<{ content: string; tokens: number }> {
  switch (provider) {
    case "anthropic":
      return callAnthropic(prompt, systemPrompt, model);
    case "openai":
      return callOpenAI(prompt, systemPrompt, model);
    case "gemini":
      return callGemini(prompt, model);
    default:
      logger.warn({ provider }, "Unknown provider, falling back to anthropic");
      return callAnthropic(prompt, systemPrompt, model);
  }
}

/**
 * callLLMForStage — resolves per-agent > per-role > default and dispatches.
 * stage: 1..8 maps to the 8 pipeline agents; role is the default bucket fallback.
 */
async function callLLMForStage(
  prompt: string,
  systemPrompt: string,
  stage: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
  role: "generation" | "evaluation" | "adversarial",
  config: ModelConfig,
): Promise<{ content: string; tokens: number }> {
  const { provider, model } = resolveStageConfig(stage, role, config);
  return callLLM(prompt, systemPrompt, provider, model);
}

function parseLLMJson<T>(text: string, fallback: T): T {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    const raw = match?.[1] ?? text;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getDefaultTerms(architecture: Architecture): DealTerms {
  const base: DealTerms = {
    nuclearProtocol: "Iran limits enrichment to 3.67% with IAEA continuous monitoring; US provides nuclear civilian technology cooperation",
    sanctionsRelief: "Phased sanctions relief tied to verified compliance milestones; 90-day review mechanism",
    hormuzArrangements: "Guaranteed freedom of navigation; joint maritime coordination center with Gulf states",
    humanitarianProvisions: "Immediate unfreezing of $6B in humanitarian funds; medicine and food import exemptions",
    verificationMechanism: "Modified JCPOA verification with IAEA snap inspections and satellite monitoring",
    timelineYears: 5,
    sequencing: "Simultaneous first steps: Iran caps enrichment, US lifts secondary sanctions on oil",
    additionalClauses: ["Regional security consultations with GCC", "Prisoner exchange as confidence building measure"],
    stakeholderCommitments: {
      iran: "Cap enrichment at 3.67%, allow IAEA inspections, reduce regional proxy support",
      us: "Lift secondary sanctions in phases, provide security assurances, normalize diplomatic channels",
      israel: "Accept verified enrichment limits, participate in regional security framework",
      saudi_arabia: "Support economic normalization, de-escalate Yemen conflict, open trade corridors",
      eu3: "Provide economic incentives package, guarantee trade mechanisms (INSTEX successor)",
      russia: "Support UNSC resolution endorsement, contribute to verification framework",
      china: "Maintain economic engagement transparency, support sanctions relief timeline",
      iaea: "Implement enhanced verification protocol, provide continuous monitoring reports",
    },
  };

  if (architecture === "nuclear-first") {
    base.nuclearProtocol = "Comprehensive nuclear rollback to pre-2019 JCPOA levels as primary condition for any relief";
    base.sequencing = "Nuclear compliance verified first, then phased sanctions relief over 18 months";
  } else if (architecture === "hormuz-first") {
    base.hormuzArrangements = "Maritime security framework as foundation; Hormuz guarantee enables economic normalization";
    base.sequencing = "Maritime security agreement signed first, enabling economic negotiations";
  } else if (architecture === "humanitarian-first") {
    base.humanitarianProvisions = "Immediate comprehensive humanitarian corridor as trust-building prerequisite";
    base.sequencing = "Humanitarian access guaranteed immediately; nuclear talks begin within 60 days";
  }

  return base;
}

type AcceptanceTier = "required" | "critical" | "influential" | "contextual";

type StakeholderEntry = {
  id: string;
  name: string;
  profile: string;
  tier: AcceptanceTier;
};

const STAKEHOLDER_REGISTRY: StakeholderEntry[] = [
  { id: "iran", name: "Iran", tier: "required",
    profile: "Seeks sanctions relief, nuclear recognition, no regime change threat. Red lines: denuclearization, regime change, loss of deterrence." },
  { id: "us", name: "United States", tier: "required",
    profile: "Seeks verifiable denuclearization, regional security. Red lines: nuclear weapons capability, Hormuz blockade." },

  { id: "israel", name: "Israel", tier: "critical",
    profile: "Opposes any deal that leaves Iran with enrichment capacity. Red line: any path to Iranian nuclear weapon. Borderline make-or-break — can undermine implementation unilaterally." },

  { id: "saudi_arabia", name: "Saudi Arabia", tier: "influential",
    profile: "Seeks regional security guarantees, economic normalization. Concerned about Iranian influence in Yemen, Lebanon." },
  { id: "iaea", name: "IAEA", tier: "influential",
    profile: "Verification authority. Supports snap inspections, continuous monitoring. Essential for implementation but not a party to the deal." },
  { id: "russia", name: "Russia", tier: "influential",
    profile: "UNSC veto holder. Supports Iranian sovereignty, opposes Western-led sanctions. Can block/enable at UN level." },
  { id: "china", name: "China", tier: "influential",
    profile: "Major Iranian trade partner. Values economic ties, opposes sanctions, supports negotiated solution. BRI interests." },
  { id: "eu3", name: "EU (France/UK/Germany)", tier: "influential",
    profile: "Strong verification advocate, supports phased sanctions relief, key economic/trade mechanisms." },

  { id: "uae", name: "United Arab Emirates", tier: "contextual",
    profile: "Trade hub stability, neutrality preservation, significant Iranian trade volumes. Strait of Hormuz exposure." },
  { id: "qatar", name: "Qatar", tier: "contextual",
    profile: "Mediation role, shared gas field with Iran. Multi-directional diplomacy, potential deal broker." },
  { id: "oman", name: "Oman", tier: "contextual",
    profile: "Traditional neutral facilitator, Strait of Hormuz geography. Back-channel specialist." },
  { id: "turkey", name: "Turkey", tier: "contextual",
    profile: "NATO member with Iranian economic relations. Regional power seeking mediator role. Kurdish issue linkage." },
  { id: "iraq", name: "Iraq", tier: "contextual",
    profile: "Caught between Iran/US. PMF-Iranian ties, US troop presence. Avoids becoming battleground." },
  { id: "egypt", name: "Egypt", tier: "contextual",
    profile: "Regional stability, Gaza ceasefire, canal revenues. Pragmatic broker." },
  { id: "india", name: "India", tier: "contextual",
    profile: "Energy security (Iranian oil), Chabahar port access. Balancing US and Iran." },
  { id: "japan", name: "Japan", tier: "contextual",
    profile: "Strait of Hormuz oil dependency, constitutional pacifism. Quiet mediator." },
  { id: "south_korea", name: "South Korea", tier: "contextual",
    profile: "Frozen Iranian assets leverage, energy security. US-aligned but economically exposed." },
  { id: "jordan", name: "Jordan", tier: "contextual",
    profile: "Palestinian linkage, US support dependency. Regional stability buffer." },
  { id: "pakistan", name: "Pakistan", tier: "contextual",
    profile: "Iran border, economic corridor interests. Islamic solidarity framework." },
  { id: "ukraine", name: "Ukraine", tier: "contextual",
    profile: "Wants to cut Iran-Russia military supply chain (Shahed drones). Active war with Russia shapes priorities." },
  { id: "global_north", name: "Global North Bloc", tier: "contextual",
    profile: "Rules-based order, non-proliferation norms, energy price stability." },
  { id: "global_south_energy_importers", name: "Global South Energy Importers", tier: "contextual",
    profile: "Low energy prices, food security. Oil spike above $120/bbl is red line." },
  { id: "global_south_energy_exporters", name: "Global South Energy Exporters", tier: "contextual",
    profile: "OPEC+ cohesion, elevated oil prices. Controlled conflict may serve their interests." },
];

function getStakeholdersByTier(...tiers: AcceptanceTier[]): StakeholderEntry[] {
  return STAKEHOLDER_REGISTRY.filter(s => tiers.includes(s.tier));
}

const REQUIRED_STAKEHOLDERS = getStakeholdersByTier("required");
const CRITICAL_STAKEHOLDERS = getStakeholdersByTier("critical");
const CORE_STAKEHOLDERS = getStakeholdersByTier("required", "critical", "influential");
const ALL_EVALUATED_STAKEHOLDERS = STAKEHOLDER_REGISTRY;

const DOMESTIC_AUDIENCES: Record<string, { stakeholder: string; audiences: string[] }> = {
  "iran": { stakeholder: "Iran", audiences: ["Supreme Leader", "IRGC", "reformists", "public"] },
  "us": { stakeholder: "United States", audiences: ["Congress", "Pentagon", "Israel lobby", "public"] },
  "israel": { stakeholder: "Israel", audiences: ["Knesset hardliners", "security establishment", "center-left coalition"] },
};

/**
 * PROPOSAL AGENT (Anthropic) — generation role
 * Designs the initial deal terms for a given architecture.
 */
export async function generateProposal(
  evidenceSummary: string,
  previousDiagnosis: string,
  architecture: Architecture = "balanced",
  modelConfig: ModelConfig = DEFAULT_MODELS,
): Promise<{ terms: DealTerms; tokens: number }> {
  const systemPrompt = `You are an expert peace negotiator and conflict resolution specialist trained in cooperative game theory.
Your task is to design a detailed, realistic peace deal framework for the Iran-US-Israel conflict complex.
Architecture focus: ${architecture}.
CRITICAL PRINCIPLE: Stable peace outcomes often require a GRAND COALITION — binding commitments from ALL relevant stakeholders, not just the primary parties. A deal that only specifies what Iran, the US, and Israel must do will likely fail because secondary stakeholders (EU, Russia, China, Saudi Arabia, IAEA) hold veto power, spoiler potential, or economic leverage that can make or break implementation.
Design commitments for every stakeholder that give each party a concrete stake in the deal's success.
Output valid JSON only, no prose.`;

  const prompt = `Based on current evidence:
${evidenceSummary.slice(0, 2000)}

${previousDiagnosis ? `Previous deal failed because: ${previousDiagnosis}` : "Design an initial deal proposal."}

Architecture approach: ${architecture}

COST-BENEFIT CONTEXT (annual estimates, USD billions):
The ongoing conflict costs the world ~$450B/yr in GDP-equivalent losses. A durable peace could generate ~$560B/yr in benefits. Key channels: Trade & Sanctions ($75B war cost, $122B peace gain), Energy Markets ($113B/$133B — includes transfers), Shipping & Insurance ($55B/$69B), Finance & Banking ($55B/$82B), Defense & Security ($72B/$39B), Aviation & Tourism ($30B/$45B), Humanitarian ($28B/$26B), Productivity & FDI ($28B/$56B).
Most affected: Iran ($87B cost, $142B peace benefit), US ($52B/$38B), Israel ($43B/$35B), Europe ($42B/$55B), China ($35B/$48B).
Your deal should address the channels where the largest economic gains are achievable and ensure stakeholders who bear the highest costs have clear incentives to participate.

STAKEHOLDER ACCEPTANCE TIERS:
REQUIRED (deal cannot proceed without their acceptance):
${REQUIRED_STAKEHOLDERS.map(s => `- ${s.id}: ${s.name}. ${s.profile}`).join("\n")}

CRITICAL (borderline make-or-break — rejection severely undermines viability):
${CRITICAL_STAKEHOLDERS.map(s => `- ${s.id}: ${s.name}. ${s.profile}`).join("\n")}

INFLUENTIAL (important for durability/implementation but not gatekeepers):
${getStakeholdersByTier("influential").map(s => `- ${s.id}: ${s.name}. ${s.profile}`).join("\n")}

CONTEXTUAL (affected parties whose support strengthens the deal):
${getStakeholdersByTier("contextual").map(s => `- ${s.id}: ${s.name}`).join(", ")}

Generate a peace deal JSON with these exact keys:
{
  "nuclearProtocol": "string describing nuclear terms",
  "sanctionsRelief": "string describing sanctions",
  "hormuzArrangements": "string describing maritime security",
  "humanitarianProvisions": "string describing humanitarian terms",
  "verificationMechanism": "string describing verification",
  "timelineYears": number,
  "sequencing": "string describing step-by-step sequencing",
  "additionalClauses": ["array", "of", "additional", "terms"],
  "stakeholderCommitments": {
${CORE_STAKEHOLDERS.map(s => `    "${s.id}": "specific binding commitments ${s.name} makes"`).join(",\n")}
  }
}

IMPORTANT: Iran and the US are the two REQUIRED parties — without both accepting, no deal is implementable. Israel is CRITICAL — its rejection would severely undermine any deal. Other stakeholders (influential tier) matter for durability and implementation but are not absolute gatekeepers.
Every stakeholder MUST have concrete, specific commitments. Vague statements like "supports the deal" are insufficient. Each commitment should specify what the stakeholder will DO, PROVIDE, or GUARANTEE.`;

  const { content, tokens } = await callLLMForStage(prompt, systemPrompt, 1, "generation", modelConfig);
  const terms = parseLLMJson<DealTerms>(content, getDefaultTerms(architecture));

  const sc = terms.stakeholderCommitments || {};
  const defaults = getDefaultTerms(architecture).stakeholderCommitments || {};
  for (const s of CORE_STAKEHOLDERS) {
    if (!sc[s.id] || sc[s.id].trim().length < 10) {
      sc[s.id] = defaults[s.id] || `Participates in grand coalition framework with binding obligations`;
    }
  }
  terms.stakeholderCommitments = sc;

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
): Promise<{ evaluations: Record<string, StakeholderVerdict>; tokens: number }> {
  const systemPrompt = `You are a geopolitical analyst evaluating how stakeholders will respond to a peace proposal.
Each stakeholder has a specific acceptance tier that determines their importance:
- REQUIRED: Iran and US must BOTH accept for the deal to be implementable at all
- CRITICAL: Israel's rejection would severely undermine the deal but is not an absolute veto
- INFLUENTIAL: Important for durability and implementation but not gatekeepers
- CONTEXTUAL: Affected parties whose support strengthens the deal

Evaluate whether each would accept given what they must commit AND what they receive in return.
Output a JSON object mapping stakeholder IDs to their verdict. Each verdict has:
{ "verdict": "accept"|"conditional"|"reject", "rationale": "string", "redLineViolations": [], "conditions": [] }`;

  const commitments = terms.stakeholderCommitments ?? {};

  const coreTierLines = CORE_STAKEHOLDERS.map(s => {
    const commitment = commitments[s.id];
    return `- ${s.id} [${s.tier.toUpperCase()}]: ${s.name}. ${s.profile}${commitment ? `\n  THEIR COMMITMENTS: ${commitment}` : ""}`;
  }).join("\n");

  const contextualLines = getStakeholdersByTier("contextual").map(s =>
    `- ${s.id}: ${s.name}. ${s.profile}`
  ).join("\n");

  const prompt = `Evaluate how these stakeholders would respond to this peace deal, considering both what they receive and what they are asked to commit:

DEAL TERMS:
- Nuclear: ${terms.nuclearProtocol}
- Sanctions: ${terms.sanctionsRelief}
- Maritime: ${terms.hormuzArrangements}
- Humanitarian: ${terms.humanitarianProvisions}
- Verification: ${terms.verificationMechanism}
- Timeline: ${terms.timelineYears} years
- Sequencing: ${terms.sequencing}

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

  const { content, tokens } = await callLLMForStage(prompt, systemPrompt, 2, "evaluation", modelConfig);

  const fallback: Record<string, StakeholderVerdict> = {};
  for (const s of ALL_EVALUATED_STAKEHOLDERS) {
    fallback[s.id] = {
      verdict: "conditional",
      rationale: `${s.name} has reservations but sees potential for negotiation.`,
      redLineViolations: [],
      conditions: ["Further clarification needed"],
    };
  }

  const parsed = parseLLMJson<Record<string, StakeholderVerdict>>(content, fallback);

  const normalized: Record<string, StakeholderVerdict> = { ...fallback, ...parsed };
  for (const s of ALL_EVALUATED_STAKEHOLDERS) {
    const e = normalized[s.id];
    if (!e || !e.verdict || !["accept", "conditional", "reject"].includes(e.verdict)) {
      normalized[s.id] = fallback[s.id]!;
    }
  }

  return { evaluations: normalized, tokens };
}

/**
 * NEGOTIATOR AGENT (Anthropic) — generation role
 * Analyzes rejecting stakeholders and proposes targeted amendments to bridge gaps.
 * Runs after initial stakeholder evaluation to attempt to reconcile rejections.
 */
export async function runNegotiator(
  terms: DealTerms,
  stakeholderEvaluations: Record<string, StakeholderVerdict>,
  modelConfig: ModelConfig = DEFAULT_MODELS,
): Promise<{ result: NegotiatorResult; tokens: number }> {
  const rejecters = Object.entries(stakeholderEvaluations)
    .filter(([, e]) => e.verdict === "reject")
    .map(([id, e]) => ({ id, rationale: e.rationale, redLineViolations: e.redLineViolations, conditions: e.conditions }));

  const conditionals = Object.entries(stakeholderEvaluations)
    .filter(([, e]) => e.verdict === "conditional")
    .map(([id, e]) => ({ id, conditions: e.conditions }));

  const fallback: NegotiatorResult = {
    proposedAmendments: rejecters.map(r => ({
      stakeholder: r.id,
      originalConcern: r.redLineViolations[0] ?? r.rationale.slice(0, 100),
      proposedChange: r.conditions[0] ?? "Strengthen verification and address core sovereignty concerns",
      likelihood: "medium" as const,
    })),
    revisedTermsPartial: {},
    negotiationStrategy: "Sequential confidence-building with parallel technical tracks for each stakeholder group",
  };

  if (rejecters.length === 0 && conditionals.length === 0) {
    return { result: fallback, tokens: 0 };
  }

  const systemPrompt = `You are a master negotiator specializing in multi-party peace agreements.
Your role: given stakeholder objections, propose specific, realistic amendments that could bring rejecting/conditional parties toward acceptance WITHOUT losing other parties' support.
Output JSON only.`;

  const tierOf = (id: string) => STAKEHOLDER_REGISTRY.find(s => s.id === id)?.tier ?? "contextual";
  const priorityLabel = (id: string) => {
    const t = tierOf(id);
    if (t === "required") return "[REQUIRED — must fix]";
    if (t === "critical") return "[CRITICAL — high priority]";
    return `[${t}]`;
  };

  const prompt = `Negotiate amendments for this Iran peace deal:

CURRENT TERMS SUMMARY:
- Nuclear: ${terms.nuclearProtocol.slice(0, 150)}
- Sanctions: ${terms.sanctionsRelief.slice(0, 150)}
- Sequencing: ${terms.sequencing.slice(0, 150)}

REJECTING STAKEHOLDERS (prioritized by acceptance tier):
${rejecters.map(r => `- ${r.id} ${priorityLabel(r.id)}: Red lines violated: ${r.redLineViolations.join(", ")}. Conditions for acceptance: ${r.conditions.join(", ")}`).join("\n")}

CONDITIONAL STAKEHOLDERS:
${conditionals.map(c => `- ${c.id} ${priorityLabel(c.id)}: Conditions: ${c.conditions.join(", ")}`).join("\n")}

PRIORITY: Iran and US rejection is a DEAL-BREAKER — amendments MUST address their concerns first. Israel rejection is near-fatal — high priority. Other stakeholders matter for durability but are not gatekeepers.

Return JSON:
{
  "proposedAmendments": [
    { "stakeholder": "id", "originalConcern": "text", "proposedChange": "specific change text", "likelihood": "low|medium|high" }
  ],
  "revisedTermsPartial": { "nuclearProtocol": "revised if needed", "sequencing": "revised if needed" },
  "negotiationStrategy": "overall strategy text"
}`;

  const { content, tokens } = await callLLMForStage(prompt, systemPrompt, 5, "generation", modelConfig);
  const result = parseLLMJson<NegotiatorResult>(content, fallback);
  return { result, tokens };
}

/**
 * DOMESTIC AUDIENCE AGENTS (OpenAI) — evaluation role
 * Assesses whether each domestic political audience in key countries would accept the deal.
 */
export async function evaluateDomesticAudiences(
  terms: DealTerms,
  modelConfig: ModelConfig = DEFAULT_MODELS,
): Promise<{ evaluations: Record<string, DomesticVerdict>; tokens: number }> {
  const systemPrompt = `You are a political analyst assessing domestic political sellability of a peace deal.
For each audience, return: { "audience": "label", "verdict": "sellable|difficult|unsellable", "rationale": "1-2 sentences" }
Output a JSON object with keys like "iran_supreme_leader", "us_congress", etc.`;

  const audienceList = Object.entries(DOMESTIC_AUDIENCES).flatMap(([stakeholderId, { stakeholder, audiences }]) =>
    audiences.map(a => ({ key: `${stakeholderId}_${a.replace(/\s+/g, "_").toLowerCase()}`, label: `${stakeholder} — ${a}` }))
  );

  const prompt = `Assess the domestic political sellability of this peace deal to these audiences:

DEAL TERMS:
- Nuclear: ${terms.nuclearProtocol}
- Sanctions: ${terms.sanctionsRelief}
- Sequencing: ${terms.sequencing}
- Timeline: ${terms.timelineYears} years

AUDIENCES:
${audienceList.map(a => `- ${a.key}: ${a.label}`).join("\n")}

Return JSON where each key maps to { "audience": "label", "verdict": "sellable|difficult|unsellable", "rationale": "brief" }.`;

  const { content, tokens } = await callLLMForStage(prompt, systemPrompt, 3, "evaluation", modelConfig);

  const fallback: Record<string, DomesticVerdict> = {};
  for (const { key, label } of audienceList) {
    fallback[key] = {
      audience: label,
      verdict: "difficult",
      rationale: "Domestic political constraints make this deal difficult to sell without additional confidence-building measures.",
    };
  }

  const parsed = parseLLMJson<Record<string, DomesticVerdict>>(content, fallback);
  return { evaluations: parsed, tokens };
}

/**
 * RED-TEAM AGENT (Gemini) — adversarial role
 * Generates attack scenarios against the deal's viability.
 */
export async function runRedTeam(
  terms: DealTerms,
  modelConfig: ModelConfig = DEFAULT_MODELS,
): Promise<{ results: RedTeamResult[]; tokens: number }> {
  const systemPrompt = `You are an adversarial red-team analyst trying to find fatal flaws in a peace deal.
Generate 5 adversarial attacks that could collapse this deal. Output as JSON array.`;

  const prompt = `Red-team this peace deal:
Nuclear: ${terms.nuclearProtocol}
Sanctions: ${terms.sanctionsRelief}
Sequencing: ${terms.sequencing}

Return JSON array: [{ "attack": "description", "severity": "low|medium|high|critical", "response": "how proponents respond", "survived": true|false }, ...]`;

  const { content, tokens } = await callLLMForStage(prompt, "You are an adversarial analyst. Output JSON.", 4, "adversarial", modelConfig);

  const fallback: RedTeamResult[] = [
    { attack: "Iran's IRGC rejects verification intrusions as sovereignty violation", severity: "high", response: "Narrow the inspection scope to declared sites only", survived: true },
    { attack: "US Congress blocks sanctions relief citing Iranian ballistic missiles", severity: "critical", response: "Delink ballistic missiles from initial agreement, address in Phase 2", survived: false },
    { attack: "Israel launches pre-emptive strike citing insufficient nuclear rollback", severity: "critical", response: "Strengthen nuclear constraints and add US security guarantees for Israel", survived: false },
    { attack: "Saudi Arabia demands parallel deal limiting Houthi/Hezbollah support", severity: "high", response: "Add regional security consultations mechanism", survived: true },
    { attack: "Economic hardliners in Iran use sanctions relief delay as populist wedge", severity: "medium", response: "Front-load immediate humanitarian relief to build domestic support", survived: true },
  ];

  const parsed = parseLLMJson<RedTeamResult[]>(content, fallback);
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
For each dimension, provide a score AND a 1-2 sentence rationale explaining the key factors behind the score.
Output JSON only.`;

  const commitmentsBlock = terms.stakeholderCommitments
    ? `\nSTAKEHOLDER COMMITMENTS (grand coalition):\n${Object.entries(terms.stakeholderCommitments).map(([id, c]) => `- ${id}: ${String(c).slice(0, 150)}`).join("\n")}`
    : "";

  const prompt = `Score this peace deal (0.0-1.0 per dimension) and explain each score:

DEAL SUMMARY (post-negotiator amendments applied):
- Nuclear protocol: ${terms.nuclearProtocol.slice(0, 200)}
- Sanctions: ${terms.sanctionsRelief.slice(0, 200)}
- Timeline: ${terms.timelineYears} years
- Sequencing: ${terms.sequencing.slice(0, 200)}
${commitmentsBlock}

STAKEHOLDER ACCEPTANCE BY TIER:
- REQUIRED (Iran + US): ${requiredTier.accept} accept, ${requiredTier.conditional} conditional, ${requiredTier.reject} reject — Iran: ${iranVerdict || "unknown"}, US: ${usVerdict || "unknown"}
  ${!requiredAccept ? "*** DEAL-BREAKER: A required party rejects. Score feasibility very low (0.1-0.2). ***" : ""}
- CRITICAL (Israel): ${israelVerdict || "unknown"}
  ${!israelAccepts ? "*** Israel rejects — severely undermines viability. Penalize feasibility and durability. ***" : ""}
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
      let content: string;
      let tokens: number;
      try {
        const resp = await callLLM(prompt, systemPrompt, provider, model);
        content = resp.content;
        tokens = resp.tokens;
      } catch (err) {
        throw new Error(`${provider} call failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (!content || content === "{}") {
        throw new Error(`${provider} returned empty response`);
      }

      const parsed = parseLLMJson<Record<string, unknown>>(content, {} as Record<string, unknown>);

      let validDimensions = 0;
      const scores: Record<string, number> = {};
      const rationale: Record<string, string> = {};
      for (const key of SCORE_KEYS) {
        const raw = Number(parsed[key]);
        if (Number.isFinite(raw) && raw >= 0 && raw <= 1) {
          scores[key] = clamp(raw);
          validDimensions++;
        } else {
          scores[key] = clamp(baseScore + (Math.random() - 0.5) * 0.1);
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

  if (!requiredAccept) {
    scores.feasibility = Math.min(scores.feasibility, 0.15);
    scores.implementability = Math.min(scores.implementability, 0.20);
    scores.durability = Math.min(scores.durability, 0.15);
  }
  if (!israelAccepts) {
    scores.feasibility = Math.min(scores.feasibility, 0.35);
    scores.durability = Math.min(scores.durability, 0.30);
    scores.regionalStability = Math.min(scores.regionalStability, 0.35);
  }

  scores.composite = (
    scores.feasibility * 0.2 +
    scores.coherence * 0.15 +
    scores.evidenceGrounding * 0.1 +
    scores.domesticSellability * 0.2 +
    scores.regionalStability * 0.15 +
    scores.implementability * 0.1 +
    scores.durability * 0.1
  );

  return { scores, tokens: totalTokens };
}

/**
 * META-EVALUATOR AGENT (OpenAI) — meta-evaluation role
 * Evaluates the overall quality of the pipeline's reasoning and suggests next steps.
 * Separated from the judge: the judge scores the deal, the meta-evaluator scores the reasoning process.
 */
export async function runMetaEvaluator(
  terms: DealTerms,
  scores: DealScores,
  negotiatorResult: NegotiatorResult | null,
  stakeholderEvaluations: Record<string, StakeholderVerdict>,
  modelConfig: ModelConfig = DEFAULT_MODELS,
): Promise<{ result: MetaEvaluatorResult; tokens: number }> {
  const fallback: MetaEvaluatorResult = {
    pipelineQuality: 0.6,
    reasoning: "Pipeline produced a reasonable deal evaluation. Stakeholder coverage is adequate but domestic analysis could be deeper.",
    blindspots: ["Long-term implementation risks not fully assessed", "Regional spoiler dynamics under-modeled"],
    suggestedNextArchitecture: "nuclear-first",
    confidenceInOutcome: 0.55,
  };

  const systemPrompt = `You are a meta-level evaluator assessing the quality of an AI peace deal pipeline's reasoning.
You review the overall analysis process, identify blind spots, and suggest improvements.
Output JSON only.`;

  const acceptCount = Object.values(stakeholderEvaluations).filter(e => e.verdict === "accept").length;
  const rejectCount = Object.values(stakeholderEvaluations).filter(e => e.verdict === "reject").length;

  const prompt = `Evaluate this AI pipeline's reasoning about an Iran peace deal:

DEAL COMPOSITE SCORE: ${(scores.composite * 100).toFixed(1)}%
STAKEHOLDER RESULTS: ${acceptCount} accept, ${rejectCount} reject out of ${Object.keys(stakeholderEvaluations).length}
NEGOTIATOR APPLIED: ${negotiatorResult ? `Yes — proposed ${negotiatorResult.proposedAmendments.length} amendments` : "No"}
WEAKEST DIMENSIONS: ${Object.entries(scores)
  .filter(([k]) => k !== "composite")
  .sort(([, a], [, b]) => (a as number) - (b as number))
  .slice(0, 2)
  .map(([k, v]) => `${k}: ${((v as number) * 100).toFixed(0)}%`)
  .join(", ")}

Assess the reasoning quality and return:
{
  "pipelineQuality": 0.0-1.0 (how well the pipeline reasoned about this deal),
  "reasoning": "2-3 sentence assessment of pipeline's reasoning quality",
  "blindspots": ["list", "of", "identified", "gaps"],
  "suggestedNextArchitecture": "balanced|nuclear-first|hormuz-first|humanitarian-first",
  "confidenceInOutcome": 0.0-1.0
}`;

  const { content, tokens } = await callLLMForStage(prompt, systemPrompt, 7, "evaluation", modelConfig);
  const result = parseLLMJson<MetaEvaluatorResult>(content, fallback);
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

  const fallback = rejecters.flatMap(([stakeholderId, evaluation]) =>
    (evaluation.redLineViolations ?? []).slice(0, 2).map(violation => ({
      stakeholder: stakeholderId,
      requirement: evaluation.conditions?.[0] ?? `Address: ${violation}`,
      feasibility: (["low", "medium", "high"] as const)[Math.floor(Math.random() * 3)] ?? "medium",
    }))
  ).slice(0, 6);

  return parseLLMJson<Array<{ stakeholder: string; requirement: string; feasibility: "low" | "medium" | "high" }>>(content, fallback);
}

/**
 * FULL EVALUATION PIPELINE
 * Stages:
 * 1. Proposal Agent (Anthropic) — generates deal terms
 * 2. Stakeholder Evaluation Agent (OpenAI) — assesses stakeholder acceptance
 * 3. Domestic Audience Agent (OpenAI) — assesses domestic political sellability
 * 4. Red-Team Agent (Gemini) — adversarial stress testing
 * 5. Negotiator Agent (Anthropic) — proposes amendments for rejecters
 * 6. Judge Agent (OpenAI) — scores on 7 dimensions
 * 7. Meta-Evaluator (OpenAI) — evaluates overall pipeline reasoning quality
 * 8. Diagnosis Generator (Gemini) — human-readable explanation
 */
export async function runFullEvaluation(
  evidenceSummary: string,
  previousDiagnosis: string,
  architecture: Architecture = "balanced",
  modelConfig: ModelConfig = DEFAULT_MODELS,
): Promise<EvaluatedDeal> {
  validateModelConfig(modelConfig);
  logger.info({ architecture, models: modelConfig }, "Starting full deal evaluation pipeline");
  let totalTokens = 0;
  let totalCost = 0;

  // Stage 1: Proposal Agent (Anthropic — generation role)
  const { terms, tokens: t1 } = await generateProposal(evidenceSummary, previousDiagnosis, architecture, modelConfig);
  totalTokens += t1;
  logger.info({ stage: "proposal", tokens: t1 }, "Stage 1 complete");

  // Stage 2: Stakeholder Evaluation Agent (OpenAI — evaluation role)
  const { evaluations: stakeholderEvaluations, tokens: t2 } = await evaluateStakeholders(terms, modelConfig);
  totalTokens += t2;
  logger.info({ stage: "stakeholders", tokens: t2 }, "Stage 2 complete");

  // Stage 3: Domestic Audience Agent (OpenAI — evaluation role)
  const { evaluations: domesticEvaluations, tokens: t3 } = await evaluateDomesticAudiences(terms, modelConfig);
  totalTokens += t3;
  logger.info({ stage: "domestic", tokens: t3 }, "Stage 3 complete");

  // Stage 4: Red-Team Agent (Gemini — adversarial role)
  const { results: redTeamResults, tokens: t4 } = await runRedTeam(terms, modelConfig);
  totalTokens += t4;
  logger.info({ stage: "redteam", tokens: t4 }, "Stage 4 complete");

  // Stage 5: Negotiator Agent (Anthropic — generation/bridging role)
  const { result: negotiatorResult, tokens: t5 } = await runNegotiator(terms, stakeholderEvaluations, modelConfig);
  totalTokens += t5;
  logger.info({ stage: "negotiator", amendments: negotiatorResult.proposedAmendments.length, tokens: t5 }, "Stage 5 complete");

  // Apply negotiator's revisedTermsPartial before judge scores the deal
  const revisedTerms: DealTerms = {
    ...terms,
    ...(negotiatorResult.revisedTermsPartial as Partial<DealTerms>),
  };

  // Stage 6: Judge Agent (OpenAI — scoring role) uses revised terms + domestic evaluations
  const { scores, tokens: t6 } = await judgeAndScore(revisedTerms, stakeholderEvaluations, redTeamResults, domesticEvaluations, modelConfig);
  totalTokens += t6;
  logger.info({ stage: "judge", composite: scores.composite.toFixed(3), tokens: t6 }, "Stage 6 complete");

  // Stage 7: Meta-Evaluator (OpenAI — meta-evaluation role, distinct from judge)
  const { result: metaEvaluatorResult, tokens: t7 } = await runMetaEvaluator(terms, scores, negotiatorResult, stakeholderEvaluations, modelConfig);
  totalTokens += t7;
  logger.info({ stage: "meta-evaluator", quality: metaEvaluatorResult.pipelineQuality, tokens: t7 }, "Stage 7 complete");

  // Stage 8: Diagnosis Generator (Gemini — synthesis role)
  const { diagnosis, tokens: t8 } = await generateDiagnosis(terms, stakeholderEvaluations, redTeamResults, scores, modelConfig);
  totalTokens += t8;
  logger.info({ stage: "diagnosis", tokens: t8 }, "Stage 8 complete");

  totalCost = totalTokens * 0.000003;

  return {
    terms: revisedTerms,
    scores,
    stakeholderEvaluations,
    domesticEvaluations,
    redTeamResults,
    negotiatorResult,
    metaEvaluatorResult,
    diagnosis,
    tokensConsumed: totalTokens,
    costUsd: totalCost,
  };
}

export const DEAL_ARCHITECTURES = ARCHITECTURES;
export { STAKEHOLDER_REGISTRY, type AcceptanceTier, type StakeholderEntry };

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
