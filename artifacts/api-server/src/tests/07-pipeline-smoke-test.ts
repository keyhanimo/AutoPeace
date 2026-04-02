import "dotenv/config";

const STAGE_PROMPTS: { stage: number; name: string; role: "generation" | "evaluation" | "adversarial"; prompt: string; systemPrompt: string; maxTokens: number }[] = [
  {
    stage: 1, name: "Proposal Agent", role: "generation", maxTokens: 4096,
    systemPrompt: "You are an expert in peace deal design. Output valid JSON only.",
    prompt: `Draft a brief peace deal proposal for Iran nuclear negotiations with these terms:
Return JSON: { "nuclearProtocol": "brief description", "sanctionsRelief": "brief description", "verificationMechanism": "brief description", "timelineYears": 5 }`,
  },
  {
    stage: 2, name: "Stakeholder Evaluator", role: "evaluation", maxTokens: 4096,
    systemPrompt: "You are a geopolitical analyst evaluating a peace deal from multiple stakeholder perspectives. Output valid JSON only.",
    prompt: `Evaluate this deal: "Iran limits enrichment to 3.67%, US lifts energy sanctions over 2 years, IAEA gets full access."
Return JSON: { "iran": { "verdict": "accept|conditional|reject", "rationale": "why" }, "us": { "verdict": "accept|conditional|reject", "rationale": "why" }, "israel": { "verdict": "accept|conditional|reject", "rationale": "why" } }`,
  },
  {
    stage: 3, name: "Domestic Audiences", role: "evaluation", maxTokens: 2048,
    systemPrompt: "You analyze domestic political feasibility of peace deals. Output valid JSON only.",
    prompt: `For the deal "Iran limits enrichment, US lifts sanctions", assess domestic sellability.
Return JSON: { "iran": { "sellable": true, "narrative": "brief framing" }, "us": { "sellable": true, "narrative": "brief framing" } }`,
  },
  {
    stage: 4, name: "Red-Team Agent", role: "adversarial", maxTokens: 2048,
    systemPrompt: "You are an adversarial analyst. Output JSON.",
    prompt: `Stress-test this deal: "Iran limits enrichment to 3.67%, US lifts sanctions, IAEA monitors."
Return JSON array: [{ "flaw": "description", "severity": "critical|moderate|minor", "mitigatable": true }]`,
  },
  {
    stage: 5, name: "Negotiator Agent", role: "generation", maxTokens: 4096,
    systemPrompt: "You are a skilled mediator proposing deal amendments. Output valid JSON only.",
    prompt: `Israel rejected the deal because of enrichment concerns. Propose amendments.
Return JSON: { "proposedAmendments": [{ "amendment": "description", "targetStakeholder": "israel", "tradeoff": "what iran gets in return" }] }`,
  },
  {
    stage: 6, name: "Judge Agent", role: "evaluation", maxTokens: 2048,
    systemPrompt: "You are a judicial panel scoring a peace deal. Output valid JSON only.",
    prompt: `Score this deal on 7 dimensions (0.0-1.0): "Iran limits enrichment, US lifts sanctions, IAEA monitors."
Return JSON: { "feasibility": 0.6, "coherence": 0.7, "evidenceGrounding": 0.5, "domesticSellability": 0.4, "regionalStability": 0.6, "implementability": 0.5, "durability": 0.5 }`,
  },
  {
    stage: 7, name: "Meta-Evaluator", role: "evaluation", maxTokens: 2048,
    systemPrompt: "You evaluate pipeline quality. Output valid JSON only.",
    prompt: `The deal scored 55% composite. Brainstorm had 3 analogies, 4 provisions. 2/3 stakeholders accepted.
Return JSON: { "pipelineQuality": "adequate|good|excellent", "promptImprovements": [{ "stage": "brainstorm", "suggestion": "be more creative" }] }`,
  },
  {
    stage: 8, name: "Diagnosis Generator", role: "adversarial", maxTokens: 1024,
    systemPrompt: "You are a strategic conflict analyst. Provide a concise diagnosis paragraph. No JSON.",
    prompt: `The deal scored 55%. Israel rejected it. Iran accepted conditionally. US accepted. Main weakness: enrichment limits too weak for Israel. Provide a 2-sentence diagnosis for the next cycle.`,
  },
];

async function callProvider(provider: string, model: string, systemPrompt: string, prompt: string, maxTokens: number, timeoutMs: number): Promise<{ ok: boolean; latencyMs: number; tokens?: number; error?: string; contentLength?: number }> {
  const start = Date.now();
  try {
    if (provider === "anthropic") {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const resp = await client.messages.create({
        model, max_tokens: maxTokens, system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      }, { timeout: timeoutMs, maxRetries: 0 });
      const block = resp.content[0];
      const content = block?.type === "text" ? block.text : "";
      return { ok: !!content, latencyMs: Date.now() - start, tokens: (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0), contentLength: content.length };
    } else if (provider === "openai") {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: timeoutMs });
      const resp = await client.chat.completions.create({
        model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
        max_completion_tokens: maxTokens,
      });
      const content = resp.choices[0]?.message?.content ?? "";
      return { ok: !!content, latencyMs: Date.now() - start, tokens: resp.usage?.total_tokens ?? 0, contentLength: content.length };
    } else if (provider === "gemini") {
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const resp = await client.models.generateContent({
        model, contents: prompt, config: { maxOutputTokens: maxTokens, systemInstruction: systemPrompt },
      });
      const content = resp.text ?? "";
      return { ok: !!content, latencyMs: Date.now() - start, contentLength: content.length };
    }
    return { ok: false, latencyMs: 0, error: "Unknown provider" };
  } catch (err: unknown) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

const ROLE_PROVIDERS: Record<string, { provider: string; model: string }> = {
  generation: { provider: "anthropic", model: "claude-opus-4-6" },
  evaluation: { provider: "openai", model: "gpt-5.2" },
  adversarial: { provider: "gemini", model: "gemini-3.1-pro-preview" },
};

async function main() {
  console.log("=== Deal Pipeline Integration Smoke Test ===\n");
  console.log("Using default role→provider mapping (no DB config needed)\n");

  let passed = 0;
  let failed = 0;
  const TIMEOUT = 120_000;

  for (const stage of STAGE_PROMPTS) {
    const { provider, model } = ROLE_PROVIDERS[stage.role]!;
    process.stdout.write(`  Stage ${stage.stage} (${stage.name}) [${provider}/${model}]... `);

    const result = await callProvider(provider, model, stage.systemPrompt, stage.prompt, stage.maxTokens, TIMEOUT);

    if (result.ok) {
      console.log(`PASS | ${result.latencyMs}ms | ${result.tokens ?? "?"} tok | ${result.contentLength} chars`);
      passed++;
    } else {
      console.log(`FAIL | ${result.latencyMs}ms | ${result.error?.slice(0, 80)}`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  ${passed}/${passed + failed} stages passed`);
  if (failed > 0) {
    console.log(`  ${failed} stage(s) failed — review provider availability and timeouts`);
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
