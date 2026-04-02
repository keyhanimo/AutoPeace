import { Router } from "express";
import { db } from "@workspace/db";
import { adminConfigTable, evidenceSourcesTable, dealsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { adminAuth } from "../lib/admin-auth";
import { runCycleNow, isRunning, getCycleStatus } from "../services/autoresearch";
import { isDealCycleRunning } from "../services/deal-autoresearch";
import { UpdateAdminConfigBody, UpdateEvidenceSourceBody } from "@workspace/api-zod";
import {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_GEMINI_MODEL,
  MODEL_DEFAULTS,
  FALLBACK_DEFAULTS,
} from "../services/llm-router";

const router = Router();

const STAGE_META: { stage: number; name: string; role: "generation" | "evaluation" | "adversarial" }[] = [
  { stage: 1, name: "Proposal Agent",       role: "generation" },
  { stage: 2, name: "Stakeholder Evaluator", role: "evaluation" },
  { stage: 3, name: "Domestic Audiences",    role: "evaluation" },
  { stage: 4, name: "Red-Team Agent",        role: "adversarial" },
  { stage: 5, name: "Negotiator Agent",      role: "generation" },
  { stage: 6, name: "Judge Agent",           role: "evaluation" },
  { stage: 7, name: "Meta-Evaluator",        role: "evaluation" },
  { stage: 8, name: "Diagnosis Generator",   role: "adversarial" },
];

const CONFIG_DEFAULTS: Record<string, string> = {
  cadence: "daily",
  budgetCapUsd: "5.0",
  isPaused: "false",
  anthropicModel: DEFAULT_ANTHROPIC_MODEL,
  openaiModel: DEFAULT_OPENAI_MODEL,
  geminiModel: DEFAULT_GEMINI_MODEL,
  generationProvider: MODEL_DEFAULTS.generationProvider,
  generationModel: MODEL_DEFAULTS.generationModel,
  evaluationProvider: MODEL_DEFAULTS.evaluationProvider,
  evaluationModel: MODEL_DEFAULTS.evaluationModel,
  adversarialProvider: MODEL_DEFAULTS.adversarialProvider,
  adversarialModel: MODEL_DEFAULTS.adversarialModel,
  forecastingProvider: MODEL_DEFAULTS.forecastingProvider,
  forecastingModel: MODEL_DEFAULTS.forecastingModel,
  extractionProvider: MODEL_DEFAULTS.extractionProvider,
  extractionModel: MODEL_DEFAULTS.extractionModel,
  judgePanelAnthropicModel: "",
  judgePanelOpenaiModel: "",
  judgePanelGeminiModel: "",
  submissionScreeningModel: "claude-sonnet-4-5",
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

async function getConfigMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(adminConfigTable);
  const result = { ...CONFIG_DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

function mapToResponse(cfg: Record<string, string>) {
  const base: Record<string, unknown> = {
    cadence: cfg["cadence"] ?? "daily",
    budgetCapUsd: parseFloat(cfg["budgetCapUsd"] ?? "5"),
    isPaused: cfg["isPaused"] === "true",
    anthropicModel: cfg["anthropicModel"] ?? DEFAULT_ANTHROPIC_MODEL,
    openaiModel: cfg["openaiModel"] ?? DEFAULT_OPENAI_MODEL,
    geminiModel: cfg["geminiModel"] ?? DEFAULT_GEMINI_MODEL,
    generationProvider: cfg["generationProvider"] ?? MODEL_DEFAULTS.generationProvider,
    generationModel: cfg["generationModel"] ?? cfg["anthropicModel"] ?? MODEL_DEFAULTS.generationModel,
    evaluationProvider: cfg["evaluationProvider"] ?? MODEL_DEFAULTS.evaluationProvider,
    evaluationModel: cfg["evaluationModel"] ?? cfg["openaiModel"] ?? MODEL_DEFAULTS.evaluationModel,
    adversarialProvider: cfg["adversarialProvider"] ?? MODEL_DEFAULTS.adversarialProvider,
    adversarialModel: cfg["adversarialModel"] ?? cfg["geminiModel"] ?? MODEL_DEFAULTS.adversarialModel,
    forecastingProvider: cfg["forecastingProvider"] ?? MODEL_DEFAULTS.forecastingProvider,
    forecastingModel: cfg["forecastingModel"] ?? cfg["anthropicModel"] ?? MODEL_DEFAULTS.forecastingModel,
    extractionProvider: cfg["extractionProvider"] ?? MODEL_DEFAULTS.extractionProvider,
    extractionModel: cfg["extractionModel"] ?? cfg["anthropicModel"] ?? MODEL_DEFAULTS.extractionModel,
    judgePanelAnthropicModel: cfg["judgePanelAnthropicModel"] ?? "",
    judgePanelOpenaiModel: cfg["judgePanelOpenaiModel"] ?? "",
    judgePanelGeminiModel: cfg["judgePanelGeminiModel"] ?? "",
    submissionScreeningModel: cfg["submissionScreeningModel"] ?? "claude-sonnet-4-5",
    generationFallbackProvider: cfg["generationFallbackProvider"] ?? FALLBACK_DEFAULTS.generation!.provider,
    generationFallbackModel: cfg["generationFallbackModel"] ?? FALLBACK_DEFAULTS.generation!.model,
    evaluationFallbackProvider: cfg["evaluationFallbackProvider"] ?? FALLBACK_DEFAULTS.evaluation!.provider,
    evaluationFallbackModel: cfg["evaluationFallbackModel"] ?? FALLBACK_DEFAULTS.evaluation!.model,
    adversarialFallbackProvider: cfg["adversarialFallbackProvider"] ?? FALLBACK_DEFAULTS.adversarial!.provider,
    adversarialFallbackModel: cfg["adversarialFallbackModel"] ?? FALLBACK_DEFAULTS.adversarial!.model,
    forecastingFallbackProvider: cfg["forecastingFallbackProvider"] ?? FALLBACK_DEFAULTS.forecasting!.provider,
    forecastingFallbackModel: cfg["forecastingFallbackModel"] ?? FALLBACK_DEFAULTS.forecasting!.model,
    extractionFallbackProvider: cfg["extractionFallbackProvider"] ?? FALLBACK_DEFAULTS.extraction!.provider,
    extractionFallbackModel: cfg["extractionFallbackModel"] ?? FALLBACK_DEFAULTS.extraction!.model,
  };
  // Include per-stage overrides if present
  for (let s = 1; s <= 8; s++) {
    const pKey = `stage${s}Provider`;
    const mKey = `stage${s}Model`;
    if (cfg[pKey]) base[pKey] = cfg[pKey];
    if (cfg[mKey]) base[mKey] = cfg[mKey];
  }
  return base;
}

function resolveStageProviderModel(
  stage: number,
  role: "generation" | "evaluation" | "adversarial",
  cfg: Record<string, string>,
): { provider: string; model: string; overridden: boolean } {
  const stageProvider = cfg[`stage${stage}Provider`];
  const stageModel = cfg[`stage${stage}Model`];
  if (stageProvider && stageModel) {
    return { provider: stageProvider, model: stageModel, overridden: true };
  }
  const roleProviderKey = `${role}Provider` as const;
  const roleModelKey = `${role}Model` as const;
  const resolvedProvider = cfg[roleProviderKey] ?? MODEL_DEFAULTS[roleProviderKey as keyof typeof MODEL_DEFAULTS] ?? "anthropic";
  const roleModelDefault = MODEL_DEFAULTS[roleModelKey as keyof typeof MODEL_DEFAULTS] ??
    (resolvedProvider === "openai" ? DEFAULT_OPENAI_MODEL : resolvedProvider === "gemini" ? DEFAULT_GEMINI_MODEL : DEFAULT_ANTHROPIC_MODEL);
  return {
    provider: resolvedProvider,
    model: cfg[roleModelKey] ?? roleModelDefault,
    overridden: false,
  };
}

router.get("/admin/pipeline/config", async (_req, res) => {
  try {
    const cfg = await getConfigMap();
    const stages = STAGE_META.map(({ stage, name, role }) => {
      const { provider, model, overridden } = resolveStageProviderModel(stage, role, cfg);
      return { stage, name, role, provider, model, overridden };
    });
    const genProvider = cfg["generationProvider"] ?? "anthropic";
    const evalProvider = cfg["evaluationProvider"] ?? "openai";
    res.json({
      stages,
      constraint: `Generation and evaluation must use different providers. Currently: generation=${genProvider}, evaluation=${evalProvider}.`,
      generationProviderConflict: genProvider === evalProvider,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/admin/config", async (_req, res) => {
  try {
    const cfg = await getConfigMap();
    res.json(mapToResponse(cfg));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.use(adminAuth);

router.post("/admin/config", async (req, res) => {
  const parsed = UpdateAdminConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }
  try {
    const updates = parsed.data as Record<string, unknown>;

    // Enforce generation/evaluation provider separation at save time
    const current = await getConfigMap();
    const merged = { ...current };
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined && v !== null) merged[k] = String(v);
    }
    const effectiveGenProv = merged["generationProvider"] ?? "anthropic";
    const effectiveEvalProv = merged["evaluationProvider"] ?? "openai";
    if (effectiveGenProv === effectiveEvalProv) {
      res.status(400).json({
        error: `Config rejected: generationProvider and evaluationProvider must be different providers (both set to "${effectiveGenProv}"). This requirement ensures generation/evaluation independence.`,
      });
      return;
    }

    // Enforce stage-level separation: resolved effective provider for any generation-role stage
    // must not equal the resolved effective provider for any evaluation-role stage.
    const genStages = STAGE_META.filter(s => s.role === "generation");
    const evalStages = STAGE_META.filter(s => s.role === "evaluation");
    const effectiveGenProviders = new Set(genStages.map(s => {
      const override = merged[`stage${s.stage}Provider`];
      return override ?? effectiveGenProv;
    }));
    const effectiveEvalProviders = new Set(evalStages.map(s => {
      const override = merged[`stage${s.stage}Provider`];
      return override ?? effectiveEvalProv;
    }));
    const stageConflicts = [...effectiveGenProviders].filter(p => effectiveEvalProviders.has(p));
    if (stageConflicts.length > 0) {
      res.status(400).json({
        error: `Config rejected: Stage-level overrides create generation/evaluation provider conflict. Provider(s) "${stageConflicts.join(', ')}" appear in both generation-role and evaluation-role stages. Each provider must serve only one role across all stages.`,
      });
      return;
    }

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === null) continue;
      const strValue = String(value);
      const existing = await db.select().from(adminConfigTable).where(eq(adminConfigTable.key, key));
      if (existing.length > 0) {
        await db.update(adminConfigTable).set({ value: strValue, updatedAt: new Date() }).where(eq(adminConfigTable.key, key));
      } else {
        await db.insert(adminConfigTable).values({ key, value: strValue });
      }
    }
    const cfg = await getConfigMap();
    res.json(mapToResponse(cfg));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/admin/cycle-status", async (_req, res) => {
  res.json(getCycleStatus());
});

router.post("/admin/run", async (_req, res) => {
  if (isRunning()) {
    res.status(409).json({ error: "A cycle is already running", cycleId: "", message: "Already running" });
    return;
  }
  try {
    const cycleId = await runCycleNow();
    res.json({ cycleId, message: "Autoresearch cycle started" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});


router.get("/admin/deal-cycles", async (_req, res) => {
  try {
    const recentDeals = await db.select({
      cycleId: dealsTable.cycleId,
      architecture: dealsTable.architecture,
      composite: sql<number>`(${dealsTable.scores}->>'composite')::float`,
      isPareto: dealsTable.isPareto,
      isCurrent: dealsTable.isCurrent,
      createdAt: dealsTable.createdAt,
    }).from(dealsTable).orderBy(desc(dealsTable.createdAt)).limit(50);

    const cycleMap = new Map<string, {
      cycleId: string; status: string; dealsCount: number;
      bestComposite: number; architectures: string[];
      startedAt: Date;
    }>();

    for (const deal of recentDeals) {
      const existing = cycleMap.get(deal.cycleId);
      const comp = deal.composite ?? 0;
      if (!existing) {
        cycleMap.set(deal.cycleId, {
          cycleId: deal.cycleId,
          status: "complete",
          dealsCount: 1,
          bestComposite: comp,
          architectures: [deal.architecture],
          startedAt: deal.createdAt,
        });
      } else {
        existing.dealsCount++;
        existing.bestComposite = Math.max(existing.bestComposite, comp);
        if (!existing.architectures.includes(deal.architecture)) existing.architectures.push(deal.architecture);
      }
    }

    const isRunning = isDealCycleRunning();
    const cycles = Array.from(cycleMap.values()).map((c, idx) => ({
      ...c,
      status: idx === 0 && isRunning ? "running" : c.status,
    }));

    res.json({ data: cycles, currentlyRunning: isRunning });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/admin/sources", async (_req, res) => {
  try {
    const data = await db.select().from(evidenceSourcesTable);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/admin/sources/:id", async (req, res) => {
  const bodyParsed = UpdateEvidenceSourceBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: bodyParsed.error.issues });
    return;
  }
  try {
    const { id } = req.params;
    const update = bodyParsed.data;
    const [existing] = await db.select().from(evidenceSourcesTable).where(eq(evidenceSourcesTable.id, id!));
    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const updateData: Partial<typeof existing> = {};
    if (update.isEnabled !== undefined) updateData.isEnabled = update.isEnabled;
    if (update.fetchFrequencyMinutes !== undefined) updateData.fetchFrequencyMinutes = update.fetchFrequencyMinutes;
    await db.update(evidenceSourcesTable).set(updateData).where(eq(evidenceSourcesTable.id, id!));
    const [updated] = await db.select().from(evidenceSourcesTable).where(eq(evidenceSourcesTable.id, id!));
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
