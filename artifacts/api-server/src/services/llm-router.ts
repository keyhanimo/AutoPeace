import { db } from "@workspace/db";
import { adminConfigTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import pino from "pino";
import { emitCycleLog, getActiveCycleContext, truncateForLog } from "../lib/cycle-log";

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
  generationFallbackProvider?: ProviderName;
  generationFallbackModel?: string;
  evaluationFallbackProvider?: ProviderName;
  evaluationFallbackModel?: string;
  adversarialFallbackProvider?: ProviderName;
  adversarialFallbackModel?: string;
  forecastingFallbackProvider?: ProviderName;
  forecastingFallbackModel?: string;
  extractionFallbackProvider?: ProviderName;
  extractionFallbackModel?: string;
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

export const FALLBACK_DEFAULTS: Record<string, { provider: ProviderName; model: string }> = {
  generation: { provider: "openai", model: DEFAULT_OPENAI_MODEL },
  evaluation: { provider: "gemini", model: DEFAULT_GEMINI_MODEL },
  adversarial: { provider: "anthropic", model: DEFAULT_ANTHROPIC_MODEL },
  forecasting: { provider: "openai", model: DEFAULT_OPENAI_MODEL },
  extraction: { provider: "openai", model: DEFAULT_OPENAI_MODEL },
};

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
  generationFallbackProvider: FALLBACK_DEFAULTS.generation!.provider,
  generationFallbackModel: FALLBACK_DEFAULTS.generation!.model,
  evaluationFallbackProvider: FALLBACK_DEFAULTS.evaluation!.provider,
  evaluationFallbackModel: FALLBACK_DEFAULTS.evaluation!.model,
  adversarialFallbackProvider: FALLBACK_DEFAULTS.adversarial!.provider,
  adversarialFallbackModel: FALLBACK_DEFAULTS.adversarial!.model,
  forecastingFallbackProvider: FALLBACK_DEFAULTS.forecasting!.provider,
  forecastingFallbackModel: FALLBACK_DEFAULTS.forecasting!.model,
  extractionFallbackProvider: FALLBACK_DEFAULTS.extraction!.provider,
  extractionFallbackModel: FALLBACK_DEFAULTS.extraction!.model,
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

    const resolveFallbackModel = (role: string): string => {
      const key = `${role}FallbackModel`;
      if (cfg[key]) return cfg[key];
      const providerKey = `${role}FallbackProvider`;
      const provider = cfg[providerKey] ?? FALLBACK_DEFAULTS[role]?.provider;
      if (provider === "anthropic") return anthropicModel;
      if (provider === "openai") return openaiModel;
      if (provider === "gemini") return geminiModel;
      return FALLBACK_DEFAULTS[role]?.model ?? openaiModel;
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
      generationFallbackProvider: (cfg["generationFallbackProvider"] ?? FALLBACK_DEFAULTS.generation!.provider) as ProviderName,
      generationFallbackModel: resolveFallbackModel("generation"),
      evaluationFallbackProvider: (cfg["evaluationFallbackProvider"] ?? FALLBACK_DEFAULTS.evaluation!.provider) as ProviderName,
      evaluationFallbackModel: resolveFallbackModel("evaluation"),
      adversarialFallbackProvider: (cfg["adversarialFallbackProvider"] ?? FALLBACK_DEFAULTS.adversarial!.provider) as ProviderName,
      adversarialFallbackModel: resolveFallbackModel("adversarial"),
      forecastingFallbackProvider: (cfg["forecastingFallbackProvider"] ?? FALLBACK_DEFAULTS.forecasting!.provider) as ProviderName,
      forecastingFallbackModel: resolveFallbackModel("forecasting"),
      extractionFallbackProvider: (cfg["extractionFallbackProvider"] ?? FALLBACK_DEFAULTS.extraction!.provider) as ProviderName,
      extractionFallbackModel: resolveFallbackModel("extraction"),
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

export function resolveFallbackConfig(
  role: "generation" | "evaluation" | "adversarial" | "forecasting" | "extraction",
  config: ModelConfig,
): { provider: ProviderName; model: string } | null {
  const fbProvider = config[`${role}FallbackProvider` as keyof ModelConfig] as ProviderName | undefined;
  const fbModel = config[`${role}FallbackModel` as keyof ModelConfig] as string | undefined;
  if (fbProvider && fbModel) return { provider: fbProvider, model: fbModel };
  const defaults = FALLBACK_DEFAULTS[role];
  if (defaults) return defaults;
  return null;
}

let _openai: import("openai").OpenAI | null = null;
async function getOpenAI() {
  if (!_openai) {
    const { default: OpenAI } = await import("openai");
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

let _gemini: import("@google/genai").GoogleGenAI | null = null;
async function getGemini() {
  if (!_gemini) {
    const { GoogleGenAI } = await import("@google/genai");
    _gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _gemini;
}

let _anthropic: import("@anthropic-ai/sdk").Anthropic | null = null;
async function getAnthropic() {
  if (!_anthropic) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

export { getOpenAI, getGemini, getAnthropic };

export interface CallLLMOptions {
  maxTokens?: number;
  timeoutMs?: number;
  fallbackProvider?: ProviderName;
  fallbackModel?: string;
}

async function callOpenAI(
  prompt: string,
  systemPrompt: string,
  model: string,
  opts: CallLLMOptions = {},
): Promise<{ content: string; tokens: number }> {
  const maxTokens = opts.maxTokens ?? 4096;
  const openai = await getOpenAI();
  const promptChars = prompt.length + systemPrompt.length;
  const startMs = Date.now();
  logger.info({ model, maxTokens, promptChars }, "OpenAI API call starting");
  try {
    const resp = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: maxTokens,
    });
    const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);
    const content = resp.choices[0]?.message?.content;
    logger.info({ model, elapsedSec, totalTokens: resp.usage?.total_tokens, hasContent: !!content }, "OpenAI API call completed");
    if (!content) {
      throw new Error("OpenAI returned empty response (no content in choices[0])");
    }
    return {
      content,
      tokens: resp.usage?.total_tokens ?? 0,
    };
  } catch (err: unknown) {
    const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ model, elapsedSec, errMsg, promptChars, maxTokens }, "OpenAI API call failed");
    throw err;
  }
}

async function callGemini(
  prompt: string,
  systemPrompt: string,
  model: string,
  opts: CallLLMOptions = {},
): Promise<{ content: string; tokens: number }> {
  const maxTokens = opts.maxTokens ?? 4096;
  const gemini = await getGemini();
  const promptChars = prompt.length + systemPrompt.length;
  const startMs = Date.now();
  logger.info({ model, maxTokens, promptChars }, "Gemini API call starting");
  try {
    const resp = await gemini.models.generateContent({
      model,
      contents: prompt,
      config: {
        maxOutputTokens: maxTokens,
        systemInstruction: systemPrompt,
      },
    });
    const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);
    const content = resp.text;
    logger.info({ model, elapsedSec, hasContent: !!content }, "Gemini API call completed");
    if (!content) {
      throw new Error("Gemini returned empty response (no text)");
    }
    return {
      content,
      tokens: 500,
    };
  } catch (err: unknown) {
    const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ model, elapsedSec, errMsg, promptChars, maxTokens }, "Gemini API call failed");
    throw err;
  }
}

async function callAnthropic(
  prompt: string,
  systemPrompt: string,
  model: string,
  opts: CallLLMOptions = {},
): Promise<{ content: string; tokens: number }> {
  const maxTokens = opts.maxTokens ?? 4096;
  const anthropic = await getAnthropic();
  const promptChars = prompt.length + systemPrompt.length;
  const startMs = Date.now();
  logger.info({ model, maxTokens, promptChars }, "Anthropic API call starting");
  try {
    const resp = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    }, { timeout: opts.timeoutMs ?? 300_000, maxRetries: 0 });
    const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);
    const block = resp.content[0];
    const content = block?.type === "text" ? block.text : null;
    logger.info({ model, elapsedSec, inputTokens: resp.usage?.input_tokens, outputTokens: resp.usage?.output_tokens, stopReason: resp.stop_reason, hasContent: !!content }, "Anthropic API call completed");
    if (!content) {
      throw new Error(`Anthropic returned empty response (stop_reason=${resp.stop_reason}, blocks=${resp.content.length})`);
    }
    return {
      content,
      tokens: (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0),
    };
  } catch (err: unknown) {
    const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);
    const errMsg = err instanceof Error ? err.message : String(err);
    const errName = err instanceof Error ? err.constructor.name : "Unknown";
    const status = (err as Record<string, unknown>)?.status;
    logger.error({ model, elapsedSec, errName, errMsg, status, promptChars, maxTokens }, "Anthropic API call failed");
    throw err;
  }
}

const MAX_LLM_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 5_000;

export function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (/timed?\s*out|timeout/i.test(msg)) return true;
  if (/overloaded|529|503|502|rate.?limit|too many requests|429/i.test(msg)) return true;
  const status = (err as Record<string, unknown>)?.status;
  if (status === 429 || status === 529 || status === 503 || status === 502) return true;
  return false;
}

async function callProviderWithRetries(
  prompt: string,
  systemPrompt: string,
  provider: ProviderName,
  model: string,
  opts: CallLLMOptions = {},
): Promise<{ content: string; tokens: number }> {
  const timeoutMs = opts.timeoutMs ?? 300_000;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= MAX_LLM_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn({ provider, model, attempt, delayMs: delay }, "Retrying LLM call after transient failure");
      await new Promise(r => setTimeout(r, delay));
    }

    try {
      let llmCall: Promise<{ content: string; tokens: number }>;
      switch (provider) {
        case "anthropic":
          llmCall = callAnthropic(prompt, systemPrompt, model, opts);
          break;
        case "openai":
          llmCall = callOpenAI(prompt, systemPrompt, model, opts);
          break;
        case "gemini":
          llmCall = callGemini(prompt, systemPrompt, model, opts);
          break;
        default:
          throw new Error(`Unknown LLM provider: ${provider}`);
      }
      const result = await Promise.race([
        llmCall,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`LLM call to ${provider}/${model} timed out after ${timeoutMs / 1000}s`)), timeoutMs)
        ),
      ]);
      return result;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_LLM_RETRIES && isRetryableError(err)) {
        continue;
      }
      break;
    }
  }

  throw lastErr;
}

export async function callLLM(
  prompt: string,
  systemPrompt: string,
  provider: ProviderName,
  model: string,
  opts: CallLLMOptions = {},
): Promise<{ content: string; tokens: number }> {
  const ctx = getActiveCycleContext();
  const callStart = Date.now();

  if (ctx) {
    emitCycleLog({
      cycleId: ctx.cycleId,
      level: "llm_start",
      stage: ctx.stage,
      message: `Calling ${provider}/${model}...`,
      provider,
      model,
      prompt,
      metadata: { systemPrompt },
    });
  }

  try {
    const result = await callProviderWithRetries(prompt, systemPrompt, provider, model, opts);

    if (ctx) {
      emitCycleLog({
        cycleId: ctx.cycleId,
        level: "llm_complete",
        stage: ctx.stage,
        message: `${provider}/${model} responded — ${result.tokens.toLocaleString()} tokens in ${((Date.now() - callStart) / 1000).toFixed(1)}s`,
        provider,
        model,
        tokens: result.tokens,
        durationMs: Date.now() - callStart,
        output: result.content,
      });
    }

    return result;
  } catch (primaryErr) {
    const fbProvider = opts.fallbackProvider;
    const fbModel = opts.fallbackModel;

    if (fbProvider && fbModel && (fbProvider !== provider || fbModel !== model)) {
      logger.warn(
        { primaryProvider: provider, primaryModel: model, fallbackProvider: fbProvider, fallbackModel: fbModel,
          primaryError: primaryErr instanceof Error ? primaryErr.message : String(primaryErr) },
        "Primary LLM failed — attempting fallback frontier model"
      );

      if (ctx) {
        emitCycleLog({
          cycleId: ctx.cycleId,
          level: "warn",
          stage: ctx.stage,
          message: `${provider}/${model} failed after retries — falling back to ${fbProvider}/${fbModel}`,
          provider,
          model,
          durationMs: Date.now() - callStart,
        });
      }

      try {
        const fbResult = await callProviderWithRetries(prompt, systemPrompt, fbProvider, fbModel, opts);

        if (ctx) {
          emitCycleLog({
            cycleId: ctx.cycleId,
            level: "llm_complete",
            stage: ctx.stage,
            message: `Fallback ${fbProvider}/${fbModel} responded — ${fbResult.tokens.toLocaleString()} tokens in ${((Date.now() - callStart) / 1000).toFixed(1)}s`,
            provider: fbProvider,
            model: fbModel,
            tokens: fbResult.tokens,
            durationMs: Date.now() - callStart,
            output: fbResult.content,
          });
        }

        return fbResult;
      } catch (fbErr) {
        logger.error(
          { fallbackProvider: fbProvider, fallbackModel: fbModel,
            fallbackError: fbErr instanceof Error ? fbErr.message : String(fbErr),
            primaryError: primaryErr instanceof Error ? primaryErr.message : String(primaryErr) },
          "Fallback LLM also failed — both primary and fallback exhausted"
        );

        if (ctx) {
          emitCycleLog({
            cycleId: ctx.cycleId,
            level: "llm_error",
            stage: ctx.stage,
            message: `Both ${provider}/${model} and fallback ${fbProvider}/${fbModel} failed`,
            provider,
            model,
            durationMs: Date.now() - callStart,
          });
        }

        const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
        const fbMsg = fbErr instanceof Error ? fbErr.message : String(fbErr);
        const combined = new LLMCallError(
          provider, model,
          new Error(`Primary (${provider}/${model}): ${primaryMsg}; Fallback (${fbProvider}/${fbModel}): ${fbMsg}`),
        );
        throw combined;
      }
    }

    if (ctx) {
      emitCycleLog({
        cycleId: ctx.cycleId,
        level: "llm_error",
        stage: ctx.stage,
        message: `${provider}/${model} failed: ${primaryErr instanceof Error ? primaryErr.message : String(primaryErr)}`,
        provider,
        model,
        durationMs: Date.now() - callStart,
      });
    }

    if (primaryErr instanceof LLMCallError) throw primaryErr;
    throw new LLMCallError(provider, model, primaryErr);
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
  const fallback = resolveFallbackConfig(role, config);
  const enrichedOpts: CallLLMOptions = {
    ...opts,
    fallbackProvider: opts.fallbackProvider ?? fallback?.provider,
    fallbackModel: opts.fallbackModel ?? fallback?.model,
  };
  return callLLM(prompt, systemPrompt, provider, model, enrichedOpts);
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
