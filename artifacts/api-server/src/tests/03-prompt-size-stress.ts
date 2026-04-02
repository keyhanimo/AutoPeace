import "dotenv/config";

const BASE_PROMPT = "Analyze this geopolitical context and return a JSON object with a 'summary' field (1-2 sentences) and a 'stakeholderCount' field (integer). Context:\n";
const SYSTEM_PROMPT = "You are a geopolitical analyst. Return valid JSON only: {\"summary\": \"...\", \"stakeholderCount\": N}";
const FILLER = "Iran's nuclear program remains a central point of tension. The IAEA continues monitoring enrichment levels. US sanctions impact regional economics. Gulf states seek stability through diplomatic channels. ";

function buildPrompt(targetChars: number): string {
  let prompt = BASE_PROMPT;
  while (prompt.length < targetChars) {
    prompt += FILLER;
  }
  return prompt.slice(0, targetChars);
}

async function callProvider(provider: string, model: string, prompt: string, timeoutMs: number): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    if (provider === "anthropic") {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const resp = await client.messages.create({
        model, max_tokens: 256, system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }, { timeout: timeoutMs, maxRetries: 0 });
      return { ok: resp.content[0]?.type === "text", latencyMs: Date.now() - start };
    } else if (provider === "openai") {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: timeoutMs });
      const resp = await client.chat.completions.create({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
        max_completion_tokens: 256,
      });
      return { ok: !!resp.choices[0]?.message?.content, latencyMs: Date.now() - start };
    } else if (provider === "gemini") {
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const resp = await client.models.generateContent({
        model, contents: prompt,
        config: { maxOutputTokens: 256, systemInstruction: SYSTEM_PROMPT },
      });
      return { ok: !!resp.text, latencyMs: Date.now() - start };
    }
    return { ok: false, latencyMs: 0, error: "Unknown provider" };
  } catch (err: unknown) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  console.log("=== Prompt Size Stress Test ===\n");

  const sizes = [1_000, 5_000, 10_000, 20_000, 40_000];
  const models = [
    { provider: "anthropic", model: "claude-opus-4-6" },
    { provider: "openai", model: "gpt-5.2" },
    { provider: "gemini", model: "gemini-3.1-pro-preview" },
  ];
  const TIMEOUT = 180_000;

  for (const { provider, model } of models) {
    console.log(`--- ${provider}/${model} (timeout=${TIMEOUT / 1000}s) ---`);
    let lastPassSize = 0;

    for (const size of sizes) {
      const prompt = buildPrompt(size);
      const result = await callProvider(provider, model, prompt, TIMEOUT);
      const status = result.ok ? "PASS" : "FAIL";
      console.log(`  ${(size / 1000).toFixed(0)}K chars → ${status} | ${result.latencyMs}ms${result.error ? ` | ${result.error.slice(0, 80)}` : ""}`);
      if (result.ok) lastPassSize = size;
    }

    if (lastPassSize < 40_000) {
      console.log(`  ⚠ Threshold: ${provider} fails between ${(lastPassSize / 1000).toFixed(0)}K and ${((sizes[sizes.indexOf(lastPassSize) + 1] ?? 40_000) / 1000).toFixed(0)}K chars`);
    } else {
      console.log(`  All sizes passed for ${provider}`);
    }
    console.log();
  }
}

main().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
