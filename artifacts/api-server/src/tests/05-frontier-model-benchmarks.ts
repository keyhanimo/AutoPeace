import "dotenv/config";

const BRAINSTORM_PROMPT = `CURRENT GEOPOLITICAL EVIDENCE:
Iran's nuclear enrichment has reached 60% purity at Fordow. IAEA inspectors report limited access. US sanctions continue. Gulf states seek diplomatic normalization. Regional water crisis affects Iran-Iraq-Turkey relations. Israel maintains opposition to any enrichment. EU mediators propose phased approach.

ARCHITECTURE LENS: balanced

ALL STAKEHOLDERS:
- iran [REQUIRED]: Islamic Republic of Iran. Seeks sanctions relief, nuclear sovereignty recognition, regional influence preservation.
- us [REQUIRED]: United States. Seeks non-proliferation guarantees, regional stability, de-escalation.
- israel [CRITICAL]: State of Israel. Seeks existential security guarantees, enrichment limits.
- saudi_arabia [INFLUENTIAL]: Kingdom of Saudi Arabia. Seeks regional power balance, economic diversification partnerships.
- iaea [INFLUENTIAL]: International Atomic Energy Agency. Seeks verification access, compliance monitoring.
- eu [INFLUENTIAL]: European Union. Seeks diplomatic solution, trade normalization.

BRAINSTORM INSTRUCTIONS:
Think deeply about EVERY stakeholder simultaneously. What does each one need that another could provide at low cost?

Return JSON:
{
  "historicalAnalogies": [
    { "dealName": "specific agreement", "relevantLesson": "mechanism that worked", "applicability": "how it maps here" }
  ],
  "creativeProvisions": [
    { "idea": "novel mechanism", "rationale": "why it helps", "noveltyLevel": "incremental|significant|breakthrough" }
  ],
  "crossIssueLinkages": [
    { "linkage": "how issue X trades for issue Y", "stakeholdersHelped": ["list"] }
  ],
  "unconventionalApproaches": ["bold ideas"]
}

Generate at least 3 historical analogies, 4 creative provisions (at least 1 breakthrough), 3 cross-issue linkages, and 3 unconventional approaches.`;

const SYSTEM_PROMPT = "You are a creative genius in conflict resolution. Output valid JSON only.";

type BenchResult = {
  provider: string;
  model: string;
  ok: boolean;
  latencyMs: number;
  tokens?: number;
  contentLength?: number;
  validJson: boolean;
  analogiesCount: number;
  provisionsCount: number;
  breakthroughCount: number;
  linkagesCount: number;
  unconventionalCount: number;
  error?: string;
};

async function benchmark(provider: string, model: string): Promise<BenchResult> {
  const start = Date.now();
  const base: BenchResult = {
    provider, model, ok: false, latencyMs: 0, validJson: false,
    analogiesCount: 0, provisionsCount: 0, breakthroughCount: 0,
    linkagesCount: 0, unconventionalCount: 0,
  };

  try {
    let content = "";
    let tokens = 0;

    if (provider === "anthropic") {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const resp = await client.messages.create({
        model, max_tokens: 8192, system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: BRAINSTORM_PROMPT }],
      }, { timeout: 180_000, maxRetries: 0 });
      const block = resp.content[0];
      content = block?.type === "text" ? block.text : "";
      tokens = (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0);
    } else if (provider === "openai") {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 180_000 });
      const resp = await client.chat.completions.create({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: BRAINSTORM_PROMPT }],
        max_completion_tokens: 8192,
      });
      content = resp.choices[0]?.message?.content ?? "";
      tokens = resp.usage?.total_tokens ?? 0;
    } else if (provider === "gemini") {
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const resp = await client.models.generateContent({
        model, contents: BRAINSTORM_PROMPT,
        config: { maxOutputTokens: 8192, systemInstruction: SYSTEM_PROMPT },
      });
      content = resp.text ?? "";
    }

    base.latencyMs = Date.now() - start;
    base.ok = !!content;
    base.tokens = tokens;
    base.contentLength = content.length;

    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? content.match(/(\{[\s\S]*\})/);
      if (jsonMatch?.[1]) {
        const parsed = JSON.parse(jsonMatch[1].replace(/,\s*([}\]])/g, "$1"));
        base.validJson = true;
        base.analogiesCount = Array.isArray(parsed.historicalAnalogies) ? parsed.historicalAnalogies.length : 0;
        base.provisionsCount = Array.isArray(parsed.creativeProvisions) ? parsed.creativeProvisions.length : 0;
        base.breakthroughCount = Array.isArray(parsed.creativeProvisions)
          ? parsed.creativeProvisions.filter((p: Record<string, unknown>) => p.noveltyLevel === "breakthrough").length : 0;
        base.linkagesCount = Array.isArray(parsed.crossIssueLinkages) ? parsed.crossIssueLinkages.length : 0;
        base.unconventionalCount = Array.isArray(parsed.unconventionalApproaches) ? parsed.unconventionalApproaches.length : 0;
      }
    } catch {}

    return base;
  } catch (err: unknown) {
    base.latencyMs = Date.now() - start;
    base.error = err instanceof Error ? err.message : String(err);
    return base;
  }
}

async function main() {
  console.log("=== Frontier Model Comparison Benchmarks ===\n");

  const models = [
    { provider: "anthropic", model: "claude-opus-4-6" },
    { provider: "openai", model: "gpt-5.2" },
    { provider: "gemini", model: "gemini-3.1-pro-preview" },
  ];

  const results: BenchResult[] = [];

  for (const { provider, model } of models) {
    console.log(`Benchmarking ${provider}/${model}...`);
    const result = await benchmark(provider, model);
    results.push(result);

    if (result.ok) {
      console.log(`  PASS | ${result.latencyMs}ms | ${result.tokens ?? "?"} tokens | ${result.contentLength} chars`);
      console.log(`  JSON: ${result.validJson ? "valid" : "INVALID"} | Analogies: ${result.analogiesCount} | Provisions: ${result.provisionsCount} (${result.breakthroughCount} breakthrough) | Linkages: ${result.linkagesCount} | Unconventional: ${result.unconventionalCount}`);
    } else {
      console.log(`  FAIL | ${result.latencyMs}ms | ${result.error?.slice(0, 100)}`);
    }
    console.log();
  }

  console.log("=== Comparison Table ===");
  console.log("Provider            | Latency  | Tokens | JSON | Analogies | Provisions | Breakthrough | Linkages | Unconventional");
  console.log("-".repeat(120));
  for (const r of results) {
    console.log(
      `${(r.provider + "/" + r.model).padEnd(20)} | ${(r.latencyMs + "ms").padEnd(8)} | ${String(r.tokens ?? "?").padEnd(6)} | ${(r.validJson ? "OK" : "BAD").padEnd(4)} | ${String(r.analogiesCount).padEnd(9)} | ${String(r.provisionsCount).padEnd(10)} | ${String(r.breakthroughCount).padEnd(12)} | ${String(r.linkagesCount).padEnd(8)} | ${r.unconventionalCount}`
    );
  }

  console.log("\n=== Fallback Viability ===");
  const viable = results.filter(r => r.ok && r.validJson && r.provisionsCount >= 3);
  if (viable.length >= 2) {
    const sorted = viable.sort((a, b) => a.latencyMs - b.latencyMs);
    console.log(`Recommended fallback order: ${sorted.map(r => `${r.provider}/${r.model} (${r.latencyMs}ms)`).join(" → ")}`);
  } else {
    console.log("WARNING: Fewer than 2 frontier models produced viable output. Review model names and API keys.");
  }
}

main().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
