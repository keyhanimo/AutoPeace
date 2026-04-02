import "dotenv/config";

const FRONTIER_MODELS: { provider: string; model: string; envKey: string }[] = [
  { provider: "anthropic", model: "claude-opus-4-6", envKey: "ANTHROPIC_API_KEY" },
  { provider: "openai", model: "gpt-5.2", envKey: "OPENAI_API_KEY" },
  { provider: "gemini", model: "gemini-3.1-pro-preview", envKey: "GEMINI_API_KEY" },
];

const MINIMAL_PROMPT = "Reply with exactly: {\"status\":\"ok\"}";
const SYSTEM_PROMPT = "You are a test assistant. Output only valid JSON.";

async function testAnthropic(model: string): Promise<{ ok: boolean; latencyMs: number; error?: string; tokens?: number }> {
  const start = Date.now();
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await client.messages.create({
      model,
      max_tokens: 64,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: MINIMAL_PROMPT }],
    }, { timeout: 30_000, maxRetries: 0 });
    const latencyMs = Date.now() - start;
    const block = resp.content[0];
    const content = block?.type === "text" ? block.text : "";
    const tokens = (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0);
    return { ok: !!content, latencyMs, tokens };
  } catch (err: unknown) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

async function testOpenAI(model: string): Promise<{ ok: boolean; latencyMs: number; error?: string; tokens?: number }> {
  const start = Date.now();
  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: MINIMAL_PROMPT },
      ],
      max_completion_tokens: 64,
    });
    const latencyMs = Date.now() - start;
    const content = resp.choices[0]?.message?.content ?? "";
    const tokens = resp.usage?.total_tokens ?? 0;
    return { ok: !!content, latencyMs, tokens };
  } catch (err: unknown) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

async function testGemini(model: string): Promise<{ ok: boolean; latencyMs: number; error?: string; tokens?: number }> {
  const start = Date.now();
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const resp = await client.models.generateContent({
      model,
      contents: MINIMAL_PROMPT,
      config: { maxOutputTokens: 64, systemInstruction: SYSTEM_PROMPT },
    });
    const latencyMs = Date.now() - start;
    const content = resp.text ?? "";
    return { ok: !!content, latencyMs };
  } catch (err: unknown) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  console.log("=== LLM Provider Connectivity Test ===\n");

  let allPassed = true;

  for (const { provider, model, envKey } of FRONTIER_MODELS) {
    const hasKey = !!process.env[envKey];
    console.log(`[${provider}/${model}]`);
    console.log(`  API Key (${envKey}): ${hasKey ? "SET" : "MISSING"}`);

    if (!hasKey) {
      console.log(`  Result: SKIP — no API key\n`);
      allPassed = false;
      continue;
    }

    let result: { ok: boolean; latencyMs: number; error?: string; tokens?: number };
    switch (provider) {
      case "anthropic":
        result = await testAnthropic(model);
        break;
      case "openai":
        result = await testOpenAI(model);
        break;
      case "gemini":
        result = await testGemini(model);
        break;
      default:
        result = { ok: false, latencyMs: 0, error: "Unknown provider" };
    }

    if (result.ok) {
      console.log(`  Result: PASS — ${result.latencyMs}ms latency${result.tokens ? `, ${result.tokens} tokens` : ""}`);
    } else {
      console.log(`  Result: FAIL — ${result.error}`);
      console.log(`  Latency: ${result.latencyMs}ms`);
      allPassed = false;
    }
    console.log();
  }

  console.log("=== Summary ===");
  console.log(allPassed ? "All providers reachable." : "Some providers FAILED — check API keys and model names.");
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
