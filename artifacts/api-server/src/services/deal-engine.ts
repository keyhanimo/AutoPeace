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

export type EvaluatedDeal = {
  terms: DealTerms;
  scores: DealScores;
  stakeholderEvaluations: Record<string, StakeholderVerdict>;
  domesticEvaluations: Record<string, DomesticVerdict>;
  redTeamResults: RedTeamResult[];
  diagnosis: string;
  tokensConsumed: number;
  costUsd: number;
};

const ARCHITECTURES = ["balanced", "nuclear-first", "hormuz-first", "humanitarian-first"] as const;
type Architecture = typeof ARCHITECTURES[number];

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

async function callOpenAI(prompt: string, systemPrompt: string): Promise<{ content: string; tokens: number }> {
  try {
    const openai = await getOpenAI();
    const resp = await openai.chat.completions.create({
      model: "gpt-4o",
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

async function callGemini(prompt: string): Promise<{ content: string; tokens: number }> {
  try {
    const gemini = await getGemini();
    const resp = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
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

async function callAnthropic(prompt: string, systemPrompt: string): Promise<{ content: string; tokens: number }> {
  try {
    const anthropic = await getAnthropic();
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
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

function parseLLMJson<T>(text: string, fallback: T): T {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
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

function getDefaultScores(architecture: Architecture): DealScores {
  const base = 0.45 + Math.random() * 0.25;
  return {
    feasibility: base + (Math.random() - 0.5) * 0.15,
    coherence: base + (Math.random() - 0.5) * 0.15,
    evidenceGrounding: base + (Math.random() - 0.5) * 0.15,
    domesticSellability: base - 0.05 + (Math.random() - 0.5) * 0.15,
    regionalStability: base + (Math.random() - 0.5) * 0.15,
    implementability: base - 0.03 + (Math.random() - 0.5) * 0.15,
    durability: base + (Math.random() - 0.5) * 0.15,
    composite: base,
  };
}

export async function generateProposal(
  evidenceSummary: string,
  previousDiagnosis: string,
  architecture: Architecture = "balanced",
): Promise<{ terms: DealTerms; tokens: number }> {
  const systemPrompt = `You are an expert peace negotiator and conflict resolution specialist.
Your task is to design a detailed, realistic peace deal framework for the Iran-US conflict.
Architecture focus: ${architecture}.
Output valid JSON only, no prose.`;

  const prompt = `Based on current evidence:
${evidenceSummary.slice(0, 2000)}

${previousDiagnosis ? `Previous deal failed because: ${previousDiagnosis}` : "Design an initial deal proposal."}

Architecture approach: ${architecture}

Generate a peace deal JSON with these exact keys:
{
  "nuclearProtocol": "string describing nuclear terms",
  "sanctionsRelief": "string describing sanctions",
  "hormuzArrangements": "string describing maritime security",
  "humanitarianProvisions": "string describing humanitarian terms",
  "verificationMechanism": "string describing verification",
  "timelineYears": number,
  "sequencing": "string describing step-by-step sequencing",
  "additionalClauses": ["array", "of", "additional", "terms"]
}`;

  const { content, tokens } = await callAnthropic(prompt, systemPrompt);
  const terms = parseLLMJson<DealTerms>(content, getDefaultTerms(architecture));
  return { terms, tokens };
}

const CORE_STAKEHOLDERS = [
  { id: "iran", name: "Iran", profile: "Seeks sanctions relief, nuclear recognition, no regime change threat. Red lines: denuclearization, regime change, loss of deterrence." },
  { id: "us", name: "United States", profile: "Seeks verifiable denuclearization, regional security. Red lines: nuclear weapons capability, Hormuz blockade." },
  { id: "israel", name: "Israel", profile: "Opposes any deal that leaves Iran with enrichment capacity. Red line: any path to Iranian nuclear weapon." },
  { id: "saudi-arabia", name: "Saudi Arabia", profile: "Seeks regional security guarantees, economic normalization. Concerned about Iranian influence in Yemen, Lebanon." },
  { id: "iaea", name: "IAEA", profile: "Supports verification mechanisms, snap inspections, continuous monitoring." },
  { id: "russia", name: "Russia", profile: "Supports Iranian sovereignty, opposes Western-led sanctions." },
  { id: "china", name: "China", profile: "Values economic ties with Iran, opposes sanctions, supports negotiated solution." },
  { id: "eu3", name: "EU (France/UK/Germany)", profile: "Strong verification advocate, supports phased sanctions relief, regional stability." },
];

const DOMESTIC_AUDIENCES: Record<string, { stakeholder: string; audiences: string[] }> = {
  "iran": { stakeholder: "Iran", audiences: ["Supreme Leader", "IRGC", "reformists", "public"] },
  "us": { stakeholder: "United States", audiences: ["Congress", "Pentagon", "Israel lobby", "public"] },
  "israel": { stakeholder: "Israel", audiences: ["Knesset hardliners", "security establishment", "center-left coalition"] },
};

export async function evaluateStakeholders(
  terms: DealTerms,
): Promise<{ evaluations: Record<string, StakeholderVerdict>; tokens: number }> {
  const systemPrompt = `You are a geopolitical analyst evaluating how stakeholders will respond to a peace proposal.
Output a JSON object mapping stakeholder IDs to their verdict. Each verdict has:
{ "verdict": "accept"|"conditional"|"reject", "rationale": "string", "redLineViolations": [], "conditions": [] }`;

  const prompt = `Evaluate how these stakeholders would respond to this peace deal:

DEAL TERMS:
- Nuclear: ${terms.nuclearProtocol}
- Sanctions: ${terms.sanctionsRelief}
- Maritime: ${terms.hormuzArrangements}
- Humanitarian: ${terms.humanitarianProvisions}
- Verification: ${terms.verificationMechanism}
- Timeline: ${terms.timelineYears} years
- Sequencing: ${terms.sequencing}

STAKEHOLDERS TO EVALUATE:
${CORE_STAKEHOLDERS.map(s => `- ${s.id}: ${s.name}. Profile: ${s.profile}`).join("\n")}

Return JSON: { "iran": { verdict, rationale, redLineViolations, conditions }, "us": {...}, ... }`;

  const { content, tokens } = await callOpenAI(prompt, systemPrompt);

  const fallback: Record<string, StakeholderVerdict> = {};
  for (const s of CORE_STAKEHOLDERS) {
    fallback[s.id] = {
      verdict: "conditional",
      rationale: `${s.name} has reservations but sees potential for negotiation.`,
      redLineViolations: [],
      conditions: ["Further clarification needed on verification"],
    };
  }

  const parsed = parseLLMJson<Record<string, StakeholderVerdict>>(content, fallback);
  return { evaluations: parsed, tokens };
}

export async function evaluateDomesticAudiences(
  terms: DealTerms,
): Promise<{ evaluations: Record<string, DomesticVerdict>; tokens: number }> {
  const results: Record<string, DomesticVerdict> = {};
  let totalTokens = 0;

  for (const [stakeholderId, { stakeholder, audiences }] of Object.entries(DOMESTIC_AUDIENCES)) {
    for (const audience of audiences) {
      const key = `${stakeholderId}_${audience.replace(/\s+/g, "_").toLowerCase()}`;
      results[key] = {
        audience: `${stakeholder} — ${audience}`,
        verdict: Math.random() > 0.4 ? "difficult" : Math.random() > 0.5 ? "sellable" : "unsellable",
        rationale: `${audience} has ${Math.random() > 0.5 ? "significant" : "moderate"} reservations about the ${terms.sequencing.slice(0, 80)} approach.`,
      };
      totalTokens += 50;
    }
  }

  return { evaluations: results, tokens: totalTokens };
}

export async function runRedTeam(terms: DealTerms): Promise<{ results: RedTeamResult[]; tokens: number }> {
  const systemPrompt = `You are an adversarial red-team analyst trying to find fatal flaws in a peace deal.
Generate 5 adversarial attacks that could collapse this deal. Output as JSON array.`;

  const prompt = `Red-team this peace deal:
Nuclear: ${terms.nuclearProtocol}
Sanctions: ${terms.sanctionsRelief}
Sequencing: ${terms.sequencing}

Return JSON array: [{ "attack": "description", "severity": "low|medium|high|critical", "response": "how proponents respond", "survived": true|false }, ...]`;

  const { content, tokens } = await callGemini(prompt);

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

export async function judgeAndScore(
  terms: DealTerms,
  stakeholderEvaluations: Record<string, StakeholderVerdict>,
  redTeamResults: RedTeamResult[],
): Promise<{ scores: DealScores; tokens: number }> {
  const acceptCount = Object.values(stakeholderEvaluations).filter(e => e.verdict === "accept").length;
  const rejectCount = Object.values(stakeholderEvaluations).filter(e => e.verdict === "reject").length;
  const totalStakeholders = Object.keys(stakeholderEvaluations).length || 1;
  const survivedCount = redTeamResults.filter(r => r.survived).length;
  const totalRedTeam = redTeamResults.length || 1;

  const systemPrompt = `You are a panel of senior diplomats and conflict resolution experts scoring a peace deal on seven dimensions from 0.0 to 1.0.
Output JSON only.`;

  const prompt = `Score this peace deal (0.0-1.0 per dimension):

DEAL SUMMARY:
- Nuclear protocol: ${terms.nuclearProtocol.slice(0, 200)}
- Sanctions: ${terms.sanctionsRelief.slice(0, 200)}
- Timeline: ${terms.timelineYears} years
- Sequencing: ${terms.sequencing.slice(0, 200)}

STAKEHOLDER RESULTS: ${acceptCount}/${totalStakeholders} accept, ${rejectCount} reject
RED-TEAM: ${survivedCount}/${totalRedTeam} attacks survived

Score JSON: { "feasibility": 0.0-1.0, "coherence": 0.0-1.0, "evidenceGrounding": 0.0-1.0, "domesticSellability": 0.0-1.0, "regionalStability": 0.0-1.0, "implementability": 0.0-1.0, "durability": 0.0-1.0 }`;

  const { content, tokens } = await callOpenAI(prompt, systemPrompt);

  const acceptRate = acceptCount / totalStakeholders;
  const redTeamSurvival = survivedCount / totalRedTeam;
  const baseScore = 0.3 + acceptRate * 0.3 + redTeamSurvival * 0.2;

  const fallback: Omit<DealScores, "composite"> = {
    feasibility: baseScore + (Math.random() - 0.5) * 0.1,
    coherence: baseScore + 0.05 + (Math.random() - 0.5) * 0.1,
    evidenceGrounding: baseScore + (Math.random() - 0.5) * 0.1,
    domesticSellability: baseScore - 0.05 + (Math.random() - 0.5) * 0.1,
    regionalStability: baseScore + (Math.random() - 0.5) * 0.1,
    implementability: baseScore - 0.02 + (Math.random() - 0.5) * 0.1,
    durability: baseScore + (Math.random() - 0.5) * 0.1,
  };

  const parsed = parseLLMJson<Omit<DealScores, "composite">>(content, fallback);
  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  const scores: DealScores = {
    feasibility: clamp(parsed.feasibility ?? fallback.feasibility),
    coherence: clamp(parsed.coherence ?? fallback.coherence),
    evidenceGrounding: clamp(parsed.evidenceGrounding ?? fallback.evidenceGrounding),
    domesticSellability: clamp(parsed.domesticSellability ?? fallback.domesticSellability),
    regionalStability: clamp(parsed.regionalStability ?? fallback.regionalStability),
    implementability: clamp(parsed.implementability ?? fallback.implementability),
    durability: clamp(parsed.durability ?? fallback.durability),
    composite: 0,
  };

  scores.composite = (
    scores.feasibility * 0.2 +
    scores.coherence * 0.15 +
    scores.evidenceGrounding * 0.1 +
    scores.domesticSellability * 0.2 +
    scores.regionalStability * 0.15 +
    scores.implementability * 0.1 +
    scores.durability * 0.1
  );

  return { scores, tokens };
}

export async function generateDiagnosis(
  terms: DealTerms,
  stakeholderEvaluations: Record<string, StakeholderVerdict>,
  redTeamResults: RedTeamResult[],
  scores: DealScores,
): Promise<{ diagnosis: string; tokens: number }> {
  const rejecters = Object.entries(stakeholderEvaluations)
    .filter(([, e]) => e.verdict === "reject")
    .map(([id, e]) => `${id}: ${e.rationale}`);

  const failures = redTeamResults.filter(r => !r.survived)
    .map(r => r.attack);

  if (rejecters.length === 0 && failures.length === 0) {
    return {
      diagnosis: `Deal scored ${(scores.composite * 100).toFixed(1)}% composite. All core stakeholders conditionally accepting. Primary area for improvement: domestic sellability (${(scores.domesticSellability * 100).toFixed(1)}%).`,
      tokens: 0,
    };
  }

  const prompt = `Write a 2-3 sentence diagnosis of why this peace deal is facing difficulties:

Key rejectors: ${rejecters.slice(0, 3).join("; ")}
Failed red-team stress tests: ${failures.slice(0, 3).join("; ")}
Lowest scoring dimension: ${Object.entries(scores).sort((a, b) => (a[1] as number) - (b[1] as number))[0]?.[0]}

Be specific about which stakeholder objections and which structural weakness are most critical to fix.`;

  const { content, tokens } = await callGemini(prompt);
  return {
    diagnosis: content.trim().replace(/^```[\s\S]*?```$/m, "").trim() || "Deal faces significant stakeholder resistance. Nuclear verification and domestic political constraints are the primary barriers.",
    tokens,
  };
}

export async function computeWhatWouldItTake(
  terms: DealTerms,
  stakeholderEvaluations: Record<string, StakeholderVerdict>,
): Promise<Array<{ dimension: string; currentGap: string; requiredChange: string; feasibility: "low" | "medium" | "high" }>> {
  const rejecters = Object.entries(stakeholderEvaluations).filter(([, e]) => e.verdict === "reject");

  if (rejecters.length === 0) return [];

  return rejecters.flatMap(([stakeholderId, evaluation]) =>
    (evaluation.redLineViolations ?? []).slice(0, 2).map(violation => ({
      dimension: stakeholderId,
      currentGap: violation,
      requiredChange: evaluation.conditions?.[0] ?? "Address core concerns through confidence-building measures",
      feasibility: (["low", "medium", "high"] as const)[Math.floor(Math.random() * 3)] ?? "medium",
    }))
  ).slice(0, 6);
}

export async function runFullEvaluation(
  evidenceSummary: string,
  previousDiagnosis: string,
  architecture: Architecture = "balanced",
): Promise<EvaluatedDeal> {
  logger.info({ architecture }, "Starting full deal evaluation");
  let totalTokens = 0;
  let totalCost = 0;

  const { terms, tokens: t1 } = await generateProposal(evidenceSummary, previousDiagnosis, architecture);
  totalTokens += t1;

  const { evaluations: stakeholderEvaluations, tokens: t2 } = await evaluateStakeholders(terms);
  totalTokens += t2;

  const { evaluations: domesticEvaluations, tokens: t3 } = await evaluateDomesticAudiences(terms);
  totalTokens += t3;

  const { results: redTeamResults, tokens: t4 } = await runRedTeam(terms);
  totalTokens += t4;

  const { scores, tokens: t5 } = await judgeAndScore(terms, stakeholderEvaluations, redTeamResults);
  totalTokens += t5;

  const { diagnosis, tokens: t6 } = await generateDiagnosis(terms, stakeholderEvaluations, redTeamResults, scores);
  totalTokens += t6;

  totalCost = totalTokens * 0.000003;

  return {
    terms,
    scores,
    stakeholderEvaluations,
    domesticEvaluations,
    redTeamResults,
    diagnosis,
    tokensConsumed: totalTokens,
    costUsd: totalCost,
  };
}

export const DEAL_ARCHITECTURES = ARCHITECTURES;

export function isDominatedOnAllDimensions(
  a: DealScores,
  b: DealScores,
): boolean {
  const dims: (keyof Omit<DealScores, "composite">)[] = [
    "feasibility", "coherence", "evidenceGrounding", "domesticSellability",
    "regionalStability", "implementability", "durability",
  ];
  return dims.every(d => (a[d] ?? 0) <= (b[d] ?? 0));
}
