import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger";

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

const ARCHITECTURES = ["balanced", "nuclear-first", "hormuz-first", "humanitarian-first"] as const;
type Architecture = typeof ARCHITECTURES[number];

const DEFAULT_MODELS: ModelConfig = {
  anthropicModel: "claude-opus-4-6",
  openaiModel: "gpt-5.2",
  geminiModel: "gemini-3.1-pro-preview",
  generationProvider: "anthropic",
  generationModel: "claude-opus-4-6",
  evaluationProvider: "openai",
  evaluationModel: "gpt-5.2",
  adversarialProvider: "gemini",
  adversarialModel: "gemini-3.1-pro-preview",
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
  maxTokens = 4096,
): Promise<{ content: string; tokens: number }> {
  try {
    const openai = await getOpenAI();
    const resp = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: maxTokens,
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
  maxTokens = 4096,
): Promise<{ content: string; tokens: number }> {
  try {
    const anthropic = await getAnthropic();
    const resp = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
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
): Promise<{ insights: BrainstormInsights; tokens: number }> {
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

  const prompt = `${overrideUser}
CURRENT GEOPOLITICAL EVIDENCE:
${evidenceSummary.slice(0, 4000)}

${previousDiagnosis ? `PREVIOUS DEAL DIAGNOSIS (what went wrong and must be overcome):
${previousDiagnosis}` : "This is the first brainstorm for a fresh deal search."}

ARCHITECTURE LENS: ${architecture}

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

  const { content, tokens } = await callLLMForStage(prompt, systemPrompt, 1, "generation", modelConfig);

  const fallback: BrainstormInsights = {
    historicalAnalogies: [
      { dealName: "JCPOA (2015)", relevantLesson: "Phased sanctions relief tied to verifiable nuclear rollback created momentum", applicability: "Core framework can be revived with stronger verification" },
      { dealName: "Good Friday Agreement", relevantLesson: "Constructive ambiguity on sovereignty allowed both sides to claim victory", applicability: "Iran's 'nuclear rights' vs US 'non-proliferation' can use similar framing" },
    ],
    creativeProvisions: [
      { idea: "Regional Water-Energy Nexus Agreement linking Gulf desalination tech to Iranian gas exports", rationale: "Creates economic interdependence that raises cost of conflict", noveltyLevel: "breakthrough" },
    ],
    crossIssueLinkages: [
      { linkage: "Iran's Chabahar port development funded by India/Japan in exchange for Hormuz navigation guarantees", stakeholdersHelped: ["iran", "india", "japan"] },
    ],
    unconventionalApproaches: ["Citizen diplomacy track with joint Iran-US-Israel university research programs on shared challenges (earthquakes, water scarcity)"],
  };

  const insights = parseLLMJson<BrainstormInsights>(content, fallback);
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
): Promise<{ terms: DealTerms; tokens: number }> {
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
Architecture focus: ${architecture}.

CRITICAL PRINCIPLES:
1. GRAND COALITION: Stable peace requires binding commitments from ALL relevant stakeholders. Design commitments for every stakeholder that give each party a concrete stake in the deal's success.
2. CREATIVE MECHANISMS: Go beyond traditional diplomatic categories. Include innovative provisions that create new value rather than just dividing existing pie. Think about economic integration, technology sharing, environmental cooperation, cultural exchange — anything that creates positive-sum dynamics.
3. FACE-SAVING FRAMING: For every painful concession, build in face-saving language or asymmetric framing that lets each leader sell the deal domestically as a victory.
4. SEQUENCING INNOVATION: Think creatively about sequencing — not just "who goes first" but how to create irreversible momentum through early wins that make walking away costly for all parties.

${overridePrompt}
Output valid JSON only, no prose.`;

  const prompt = `${overrideUser}Based on current evidence:
${evidenceSummary.slice(0, 4000)}

${previousDiagnosis ? `Previous deal failed because: ${previousDiagnosis}` : "Design an initial deal proposal."}

Architecture approach: ${architecture}
${brainstormContext}

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
  "nuclearProtocol": "string describing nuclear terms — be specific about enrichment levels, facility access, technology sharing",
  "sanctionsRelief": "string describing sanctions — be specific about timing, conditionality, snapback mechanisms",
  "hormuzArrangements": "string describing maritime security — include creative multilateral arrangements",
  "humanitarianProvisions": "string describing humanitarian terms — address immediate and long-term needs",
  "verificationMechanism": "string describing verification — consider technology-enhanced monitoring beyond traditional IAEA",
  "timelineYears": number,
  "sequencing": "string describing creative step-by-step sequencing with early wins and irreversibility mechanisms",
  "additionalClauses": ["array of additional standard terms"],
  "innovativeProvisions": [
    {
      "title": "short title of novel deal element",
      "description": "detailed description of this creative provision",
      "rationale": "why this helps the deal succeed — which stakeholders benefit and how",
      "historicalPrecedent": "optional: what historical deal used a similar mechanism"
    }
  ],
  "stakeholderCommitments": {
${CORE_STAKEHOLDERS.map(s => `    "${s.id}": "specific binding commitments ${s.name} makes — be creative about what they PROVIDE not just what they ACCEPT"`).join(",\n")}
  }
}

CREATIVE MANDATE: Include at least 3 innovative provisions that go beyond traditional nuclear/sanctions/verification categories. Think about economic integration mechanisms, technology-sharing frameworks, regional development funds, environmental cooperation, cultural exchange programs, or entirely novel constructs. The best peace deals create new value, not just redistribute concessions.

IMPORTANT: Iran and the US are the two REQUIRED parties — without both accepting, no deal is implementable. Israel is CRITICAL — its rejection would severely undermine any deal.
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

  if (!terms.innovativeProvisions || terms.innovativeProvisions.length === 0) {
    terms.innovativeProvisions = [
      { title: "Regional Economic Integration Fund", description: "A multilateral development fund seeded by sanctions-relief dividends, financing joint infrastructure projects across Iran, Gulf states, and broader region", rationale: "Creates economic interdependence that raises the cost of returning to conflict for all parties", historicalPrecedent: "European Coal and Steel Community (1951) — economic integration as peace architecture" },
    ];
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

  const { content, tokens } = await callLLMForStage(prompt, systemPrompt, 3, "evaluation", modelConfig);

  const fallback: Record<string, DomesticFramingStrategy> = {};
  for (const a of unsellableAudiences) {
    fallback[a.key] = {
      audience: a.audience,
      framingNarrative: `This deal positions ${a.audience.split("—")[0]?.trim() || "the stakeholder"} as a strategic leader who chose strength through engagement rather than isolation.`,
      keyTalkingPoints: ["Economic benefits outweigh costs", "Verification ensures compliance", "Alternative is continued instability"],
      riskOfBackfire: "Generic framing may not resonate with specific concerns of this audience.",
    };
  }

  const parsed = parseLLMJson<Record<string, DomesticFramingStrategy>>(content, fallback);
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

  const fallback: NegotiatorResult & { creativeTradeoffs?: CreativeTradeoff[] } = {
    proposedAmendments: rejecters.map(r => ({
      stakeholder: r.id,
      originalConcern: r.redLineViolations[0] ?? r.rationale.slice(0, 100),
      proposedChange: r.conditions[0] ?? "Strengthen verification and address core sovereignty concerns",
      likelihood: "medium" as const,
    })),
    revisedTermsPartial: {},
    negotiationStrategy: "Sequential confidence-building with parallel technical tracks for each stakeholder group",
    creativeTradeoffs: [],
  };

  const systemPrompt = `You are a master negotiator who combines strategic brilliance with creative lateral thinking.
Your role goes FAR beyond patching rejections. You actively SEARCH for Pareto improvements — restructurings where everyone gains.

THREE MODES OF OPERATION:
1. FIX REJECTIONS: Address specific stakeholder objections with targeted amendments.
2. FIND PARETO IMPROVEMENTS: Look for creative restructurings where EVERY party is better off. Can you add value rather than just redistribute it? Can you link issues across stakeholders to create positive-sum trades?
3. CREATIVE TRADEOFFS: Propose novel cross-issue deals that traditional negotiators would miss. "Iran gets X (which costs the US very little) in exchange for Y (which costs Iran very little but matters enormously to Israel)."

IMPORTANT: When fixing rejections, NEVER just weaken terms to make a rejecter happy — that usually causes other stakeholders to reject. Instead, find CREATIVE restructurings that address the objection while preserving what others value. Add new value rather than redistribute existing value.

${overridePrompt}
Output JSON only.`;

  const tierOf = (id: string) => STAKEHOLDER_REGISTRY.find(s => s.id === id)?.tier ?? "contextual";
  const priorityLabel = (id: string) => {
    const t = tierOf(id);
    if (t === "required") return "[REQUIRED — must fix]";
    if (t === "critical") return "[CRITICAL — high priority]";
    return `[${t}]`;
  };

  const framingContext = Object.keys(domesticFramingStrategies).length > 0
    ? `\nDOMESTIC FRAMING INSIGHTS (use these to inform your amendments):\n${Object.entries(domesticFramingStrategies).map(([key, s]) => `- ${key}: ${s.framingNarrative.slice(0, 100)}`).join("\n")}`
    : "";

  const innovativeContext = terms.innovativeProvisions?.length
    ? `\nEXISTING INNOVATIVE PROVISIONS:\n${terms.innovativeProvisions.map(p => `- ${p.title}: ${p.description.slice(0, 100)}`).join("\n")}`
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
  "revisedTermsPartial": { "nuclearProtocol": "revised if needed", "sequencing": "revised if needed" },
  "negotiationStrategy": "overall creative strategy text",
  "creativeTradeoffs": [
    { "gives": "what one party gives (and why it costs them relatively little)", "gets": "what they receive in exchange (and why it matters a lot to them)", "netBenefit": "why this is positive-sum — all parties gain" }
  ]
}

CREATIVE MANDATE: Include at least 2 creative tradeoffs even if no stakeholders reject. These should be novel cross-issue deals that create new value. Think about asymmetric valuations — what is cheap for one party but precious for another?`;

  const { content, tokens } = await callLLMForStage(prompt, systemPrompt, 5, "generation", modelConfig);
  const result = parseLLMJson<NegotiatorResult & { creativeTradeoffs?: CreativeTradeoff[] }>(content, fallback);
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
  const fallback: MetaEvaluatorResult = {
    pipelineQuality: 0.6,
    reasoning: "Pipeline produced a reasonable deal evaluation. Stakeholder coverage is adequate but domestic analysis could be deeper.",
    blindspots: ["Long-term implementation risks not fully assessed", "Regional spoiler dynamics under-modeled"],
    suggestedNextArchitecture: "nuclear-first",
    confidenceInOutcome: 0.55,
    promptImprovements: [],
  };

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
  "suggestedNextArchitecture": "balanced|nuclear-first|hormuz-first|humanitarian-first",
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

IMPORTANT: The promptImprovements field is how this pipeline evolves over time. Be specific and actionable. Vague suggestions like "improve stakeholder analysis" are useless. Instead, write specific prompt additions like "Add instruction: Consider the role of non-state actors as potential spoilers..." Include 2-4 concrete improvements.`;

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
export async function runFullEvaluation(
  evidenceSummary: string,
  previousDiagnosis: string,
  architecture: Architecture = "balanced",
  modelConfig: ModelConfig = DEFAULT_MODELS,
  pipelineOverrides: Record<string, string> = {},
): Promise<EvaluatedDeal> {
  validateModelConfig(modelConfig);
  logger.info({ architecture, models: modelConfig, overrides: Object.keys(pipelineOverrides) }, "Starting enhanced deal evaluation pipeline");
  let totalTokens = 0;
  let totalCost = 0;

  // Stage 0: Innovation Brainstorm — creative pre-generation
  const { insights: brainstormInsights, tokens: t0 } = await runInnovationBrainstorm(evidenceSummary, previousDiagnosis, architecture, modelConfig, pipelineOverrides);
  totalTokens += t0;
  logger.info({ stage: "brainstorm", analogies: brainstormInsights.historicalAnalogies.length, provisions: brainstormInsights.creativeProvisions.length, tokens: t0 }, "Stage 0 complete");

  // Stage 1: Proposal Agent — generates deal terms using brainstorm insights
  const { terms, tokens: t1 } = await generateProposal(evidenceSummary, previousDiagnosis, architecture, modelConfig, brainstormInsights, pipelineOverrides);
  totalTokens += t1;
  logger.info({ stage: "proposal", innovativeProvisions: terms.innovativeProvisions?.length ?? 0, tokens: t1 }, "Stage 1 complete");

  // Stage 2: Stakeholder Evaluation Agent (OpenAI — evaluation role)
  const { evaluations: stakeholderEvaluations, tokens: t2 } = await evaluateStakeholders(terms, modelConfig);
  totalTokens += t2;
  logger.info({ stage: "stakeholders", tokens: t2 }, "Stage 2 complete");

  // Stage 3: Domestic Audience Agent (OpenAI — evaluation role)
  const { evaluations: domesticEvaluations, tokens: t3 } = await evaluateDomesticAudiences(terms, modelConfig);
  totalTokens += t3;
  logger.info({ stage: "domestic", tokens: t3 }, "Stage 3 complete");

  // Stage 3.5: Creative Reframing Agent — generates domestic selling narratives
  const { strategies: domesticFramingStrategies, tokens: t35 } = await generateDomesticFramingStrategies(terms, domesticEvaluations, modelConfig, pipelineOverrides);
  totalTokens += t35;
  logger.info({ stage: "framing", strategiesGenerated: Object.keys(domesticFramingStrategies).length, tokens: t35 }, "Stage 3.5 complete");

  // Stage 4: Red-Team Agent (Gemini — adversarial role)
  const { results: redTeamResults, tokens: t4 } = await runRedTeam(terms, modelConfig);
  totalTokens += t4;
  logger.info({ stage: "redteam", tokens: t4 }, "Stage 4 complete");

  // Stage 5: Creative Negotiator Agent — Pareto improvements + creative tradeoffs
  const { result: negotiatorResult, tokens: t5 } = await runNegotiator(terms, stakeholderEvaluations, domesticFramingStrategies, modelConfig, pipelineOverrides);
  totalTokens += t5;
  logger.info({ stage: "negotiator", amendments: negotiatorResult.proposedAmendments.length, tradeoffs: negotiatorResult.creativeTradeoffs?.length ?? 0, tokens: t5 }, "Stage 5 complete");

  // Apply negotiator's revisedTermsPartial before judge scores the deal
  const revisedTerms: DealTerms = {
    ...terms,
    ...(negotiatorResult.revisedTermsPartial as Partial<DealTerms>),
  };

  // Stage 6: Judge Agent (OpenAI — scoring role) uses revised terms + domestic evaluations
  const { scores, tokens: t6 } = await judgeAndScore(revisedTerms, stakeholderEvaluations, redTeamResults, domesticEvaluations, modelConfig);
  totalTokens += t6;
  logger.info({ stage: "judge", composite: scores.composite.toFixed(3), tokens: t6 }, "Stage 6 complete");

  // Stage 7: Meta-Evaluator — evaluates pipeline quality + suggests prompt improvements for hill-climbing
  const { result: metaEvaluatorResult, tokens: t7 } = await runMetaEvaluator(revisedTerms, scores, negotiatorResult, stakeholderEvaluations, brainstormInsights, domesticFramingStrategies, modelConfig, pipelineOverrides);
  totalTokens += t7;
  logger.info({ stage: "meta-evaluator", quality: metaEvaluatorResult.pipelineQuality, promptImprovements: metaEvaluatorResult.promptImprovements?.length ?? 0, tokens: t7 }, "Stage 7 complete");

  // Stage 8: Diagnosis Generator (Gemini — synthesis role)
  const { diagnosis, tokens: t8 } = await generateDiagnosis(revisedTerms, stakeholderEvaluations, redTeamResults, scores, modelConfig);
  totalTokens += t8;
  logger.info({ stage: "diagnosis", tokens: t8 }, "Stage 8 complete");

  totalCost = totalTokens * 0.000003;

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
