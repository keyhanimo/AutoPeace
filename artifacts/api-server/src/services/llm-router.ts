import { db } from "@workspace/db";
import { adminConfigTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import pino from "pino";

const logger = pino({ name: "llm-router" });

export type ProviderName = "anthropic" | "openai" | "gemini";

export type ModelConfig = {
  anthropicModel: string;
  openaiModel: string;
  geminiModel: string;
  generationProvider: ProviderName;
  generationModel: string;
  evaluationProvider: ProviderName;
  evaluationModel: string;
  adversarialProvider: ProviderName;
  adversarialModel: string;
  forecastingProvider: ProviderName;
  forecastingModel: string;
  extractionProvider: ProviderName;
  extractionModel: string;
  judgePanelAnthropicModel?: string;
  judgePanelOpenaiModel?: string;
  judgePanelGeminiModel?: string;
  stage1Provider?: ProviderName; stage1Model?: string;
  stage2Provider?: ProviderName; stage2Model?: string;
  stage3Provider?: ProviderName; stage3Model?: string;
  stage4Provider?: ProviderName; stage4Model?: string;
  stage5Provider?: ProviderName; stage5Model?: string;
  stage6Provider?: ProviderName; stage6Model?: string;
  stage7Provider?: ProviderName; stage7Model?: string;
  stage8Provider?: ProviderName; stage8Model?: string;
};

export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-4-6";
export const DEFAULT_OPENAI_MODEL = "gpt-5.2";
export const DEFAULT_GEMINI_MODEL = "gemini-3.1-pro-preview";

export const MODEL_DEFAULTS: ModelConfig = {
  anthropicModel: DEFAULT_ANTHROPIC_MODEL,
  openaiModel: DEFAULT_OPENAI_MODEL,
  geminiModel: DEFAULT_GEMINI_MODEL,
  generationProvider: "anthropic",
  generationModel: DEFAULT_ANTHROPIC_MODEL,
  evaluationProvider: "openai",
  evaluationModel: DEFAULT_OPENAI_MODEL,
  adversarialProvider: "gemini",
  adversarialModel: DEFAULT_GEMINI_MODEL,
  forecastingProvider: "anthropic",
  forecastingModel: DEFAULT_ANTHROPIC_MODEL,
  extractionProvider: "anthropic",
  extractionModel: DEFAULT_ANTHROPIC_MODEL,
};

export class LLMCallError extends Error {
  constructor(
    public readonly provider: ProviderName,
    public readonly model: string,
    public readonly cause: unknown,
  ) {
    const causeMsg = cause instanceof Error ? cause.message : String(cause);
    super(`${provider}/${model} call failed: ${causeMsg}`);
    this.name = "LLMCallError";
  }
}

export async function getModelConfig(): Promise<ModelConfig> {
  try {
    const rows = await db.select().from(adminConfigTable);
    const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]));
    const anthropicModel = cfg["anthropicModel"] ?? DEFAULT_ANTHROPIC_MODEL;
    const openaiModel = cfg["openaiModel"] ?? DEFAULT_OPENAI_MODEL;
    const geminiModel = cfg["geminiModel"] ?? DEFAULT_GEMINI_MODEL;

    const resolveModel = (key: string, providerKey: string, fallbackModel: string) => {
      if (cfg[key]) return cfg[key];
      const provider = cfg[providerKey];
      if (provider === "anthropic") return anthropicModel;
      if (provider === "openai") return openaiModel;
      if (provider === "gemini") return geminiModel;
      return fallbackModel;
    };

    const base: ModelConfig = {
      anthropicModel,
      openaiModel,
      geminiModel,
      generationProvider: (cfg["generationProvider"] ?? "anthropic") as ProviderName,
      generationModel: resolveModel("generationModel", "generationProvider", anthropicModel),
      evaluationProvider: (cfg["evaluationProvider"] ?? "openai") as ProviderName,
      evaluationModel: resolveModel("evaluationModel", "evaluationProvider", openaiModel),
      adversarialProvider: (cfg["adversarialProvider"] ?? "gemini") as ProviderName,
      adversarialModel: resolveModel("adversarialModel", "adversarialProvider", geminiModel),
      forecastingProvider: (cfg["forecastingProvider"] ?? "anthropic") as ProviderName,
      forecastingModel: resolveModel("forecastingModel", "forecastingProvider", anthropicModel),
      extractionProvider: (cfg["extractionProvider"] ?? "anthropic") as ProviderName,
      extractionModel: resolveModel("extractionModel", "extractionProvider", anthropicModel),
      judgePanelAnthropicModel: cfg["judgePanelAnthropicModel"] || undefined,
      judgePanelOpenaiModel: cfg["judgePanelOpenaiModel"] || undefined,
      judgePanelGeminiModel: cfg["judgePanelGeminiModel"] || undefined,
    };

    for (let s = 1; s <= 8; s++) {
      const pk = `stage${s}Provider` as keyof ModelConfig;
      const mk = `stage${s}Model` as keyof ModelConfig;
      if (cfg[`stage${s}Provider`]) (base as Record<string, unknown>)[pk] = cfg[`stage${s}Provider`];
      if (cfg[`stage${s}Model`]) (base as Record<string, unknown>)[mk] = cfg[`stage${s}Model`];
    }
    return base;
  } catch (err) {
    logger.warn({ err }, "Failed to load model config from DB — using defaults");
    return { ...MODEL_DEFAULTS };
  }
}

export async function getConfigValue(key: string, defaultValue: string): Promise<string> {
  const rows = await db.select().from(adminConfigTable).where(eq(adminConfigTable.key, key));
  return rows[0]?.value ?? defaultValue;
}

export function validateModelConfig(config: ModelConfig): void {
  if (config.generationProvider === config.evaluationProvider) {
    throw new Error(
      `ModelConfig violation: generationProvider (${config.generationProvider}) and evaluationProvider (${config.evaluationProvider}) must use different LLM providers to ensure generation/evaluation independence.`
    );
  }
}

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

export { getOpenAI, getGemini, getAnthropic };

export interface CallLLMOptions {
  maxTokens?: number;
}

async function callOpenAI(
  prompt: string,
  systemPrompt: string,
  model: string,
  opts: CallLLMOptions = {},
): Promise<{ content: string; tokens: number }> {
  const maxTokens = opts.maxTokens ?? 4096;
  const openai = await getOpenAI();
  const resp = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    max_completion_tokens: maxTokens,
  });
  const content = resp.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response (no content in choices[0])");
  }
  return {
    content,
    tokens: resp.usage?.total_tokens ?? 0,
  };
}

async function callGemini(
  prompt: string,
  systemPrompt: string,
  model: string,
  opts: CallLLMOptions = {},
): Promise<{ content: string; tokens: number }> {
  const maxTokens = opts.maxTokens ?? 4096;
  const gemini = await getGemini();
  const resp = await gemini.models.generateContent({
    model,
    contents: prompt,
    config: {
      maxOutputTokens: maxTokens,
      systemInstruction: systemPrompt,
    },
  });
  const content = resp.text;
  if (!content) {
    throw new Error("Gemini returned empty response (no text)");
  }
  return {
    content,
    tokens: 500,
  };
}

async function callAnthropic(
  prompt: string,
  systemPrompt: string,
  model: string,
  opts: CallLLMOptions = {},
): Promise<{ content: string; tokens: number }> {
  const maxTokens = opts.maxTokens ?? 4096;
  const anthropic = await getAnthropic();
  const resp = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });
  const block = resp.content[0];
  const content = block?.type === "text" ? block.text : null;
  if (!content) {
    throw new Error("Anthropic returned empty response (no text block)");
  }
  return {
    content,
    tokens: (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0),
  };
}

export async function callLLM(
  prompt: string,
  systemPrompt: string,
  provider: ProviderName,
  model: string,
  opts: CallLLMOptions = {},
): Promise<{ content: string; tokens: number }> {
  try {
    switch (provider) {
      case "anthropic":
        return await callAnthropic(prompt, systemPrompt, model, opts);
      case "openai":
        return await callOpenAI(prompt, systemPrompt, model, opts);
      case "gemini":
        return await callGemini(prompt, systemPrompt, model, opts);
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  } catch (err) {
    if (err instanceof LLMCallError) throw err;
    throw new LLMCallError(provider, model, err);
  }
}

export async function callLLMForStage(
  prompt: string,
  systemPrompt: string,
  stage: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
  role: "generation" | "evaluation" | "adversarial",
  config: ModelConfig,
  opts: CallLLMOptions = {},
): Promise<{ content: string; tokens: number }> {
  const { provider, model } = resolveStageConfig(stage, role, config);
  return callLLM(prompt, systemPrompt, provider, model, opts);
}

export function resolveProviderModel(
  provider: ProviderName,
  config: ModelConfig,
): string {
  switch (provider) {
    case "anthropic": return config.anthropicModel;
    case "openai": return config.openaiModel;
    case "gemini": return config.geminiModel;
    default: return config.anthropicModel;
  }
}
