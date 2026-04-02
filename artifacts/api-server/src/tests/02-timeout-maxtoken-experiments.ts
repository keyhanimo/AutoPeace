import "dotenv/config";

const REPRESENTATIVE_PROMPT = `You are analyzing a complex geopolitical situation involving multiple stakeholders.
Generate a JSON response with the following structure:
{
  "historicalAnalogies": [
    { "dealName": "name", "relevantLesson": "lesson", "applicability": "how it applies" }
  ],
  "creativeProvisions": [
    { "idea": "novel mechanism", "rationale": "why it helps", "noveltyLevel": "incremental|significant|breakthrough" }
  ]
}
Generate exactly 3 historical analogies and 3 creative provisions. Be thorough but concise.
Context: Iran nuclear negotiations involving US, EU, IAEA, Gulf states. Consider economic interdependence, verification mechanisms, and phased implementation.`;

const SYSTEM_PROMPT = "You are an expert in conflict resolution and international diplomacy. Output valid JSON only.";

type TestConfig = { provider: string; model: string; timeoutMs: number; maxTokens: number };

async function callWithConfig(config: TestConfig): Promise<{ ok: boolean; latencyMs: number; tokens?: number; error?: string; contentLength?: number }> {
  const start = Date.now();
  try {
    if (config.provider === "anthropic") {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const resp = await client.messages.create({
        model: config.model,
        max_tokens: config.maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: REPRESENTATIVE_PROMPT }],
      }, { timeout: config.timeoutMs, maxRetries: 0 });
      const block = resp.content[0];
      const content = block?.type === "text" ? block.text : "";
      return {
        ok: !!content,
        latencyMs: Date.now() - start,
        tokens: (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0),
        contentLength: content.length,
      };
    } else if (config.provider === "openai") {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: config.timeoutMs });
      const resp = await client.chat.completions.create({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: REPRESENTATIVE_PROMPT },
        ],
        max_completion_tokens: config.maxTokens,
      });
      const content = resp.choices[0]?.message?.content ?? "";
      return { ok: !!content, latencyMs: Date.now() - start, tokens: resp.usage?.total_tokens ?? 0, contentLength: content.length };
    } else if (config.provider === "gemini") {
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const resp = await client.models.generateContent({
        model: config.model,
        contents: REPRESENTATIVE_PROMPT,
        config: { maxOutputTokens: config.maxTokens, systemInstruction: SYSTEM_PROMPT },
      });
      const content = resp.text ?? "";
      return { ok: !!content, latencyMs: Date.now() - start, contentLength: content.length };
    }
    return { ok: false, latencyMs: Date.now() - start, error: "Unknown provider" };
  } catch (err: unknown) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  console.log("=== Timeout & MaxTokens Parameter Experiments ===\n");

  const models = [
    { provider: "anthropic", model: "claude-opus-4-6" },
    { provider: "openai", model: "gpt-5.2" },
    { provider: "gemini", model: "gemini-3.1-pro-preview" },
  ];

  const timeouts = [30_000, 60_000, 120_000, 180_000, 300_000];
  const maxTokensList = [1024, 4096, 8192, 16384];

  for (const { provider, model } of models) {
    console.log(`\n--- ${provider}/${model} ---`);

    console.log("\n  Timeout experiments (maxTokens=4096):");
    for (const timeoutMs of timeouts) {
      const result = await callWithConfig({ provider, model, timeoutMs, maxTokens: 4096 });
      const status = result.ok ? "PASS" : "FAIL";
      console.log(`  timeout=${(timeoutMs / 1000).toFixed(0)}s → ${status} | ${result.latencyMs}ms${result.tokens ? ` | ${result.tokens} tok` : ""}${result.error ? ` | ${result.error.slice(0, 80)}` : ""}`);
      if (result.ok) break;
    }

    console.log("\n  MaxTokens experiments (timeout=120s):");
    for (const maxTokens of maxTokensList) {
      const result = await callWithConfig({ provider, model, timeoutMs: 120_000, maxTokens });
      const status = result.ok ? "PASS" : "FAIL";
      console.log(`  maxTokens=${maxTokens} → ${status} | ${result.latencyMs}ms${result.tokens ? ` | ${result.tokens} tok` : ""}${result.contentLength ? ` | ${result.contentLength} chars` : ""}${result.error ? ` | ${result.error.slice(0, 80)}` : ""}`);
    }
  }

  console.log("\n=== Recommendations ===");
  console.log("- If Opus times out at 120s but succeeds at 180s, consider 180s as the minimum viable timeout");
  console.log("- If maxTokens=16384 is much slower than 4096, consider reducing for non-critical stages");
  console.log("- Compare latencies across providers to choose optimal fallback order");
}

main().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
