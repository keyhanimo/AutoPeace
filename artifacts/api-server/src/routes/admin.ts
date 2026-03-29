import { Router } from "express";
import { db } from "@workspace/db";
import { adminConfigTable, evidenceSourcesTable, experimentsTable, cyclesTable, dealsTable } from "@workspace/db/schema";
import { eq, sum, desc, sql } from "drizzle-orm";
import { adminAuth } from "../lib/admin-auth";
import { runCycleNow, isRunning } from "../services/autoresearch";
import { runDealCycleNow, isDealCycleRunning } from "../services/deal-autoresearch";
import { UpdateAdminConfigBody, UpdateEvidenceSourceBody } from "@workspace/api-zod";

const router = Router();

router.use(adminAuth);

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
  anthropicModel: "claude-sonnet-4-5",
  openaiModel: "gpt-4o",
  geminiModel: "gemini-2.5-flash",
  generationProvider: "anthropic",
  generationModel: "claude-sonnet-4-5",
  evaluationProvider: "openai",
  evaluationModel: "gpt-4o",
  adversarialProvider: "gemini",
  adversarialModel: "gemini-2.5-flash",
  // Per-stage overrides are intentionally absent from defaults — empty means "inherit from role"
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
    anthropicModel: cfg["anthropicModel"] ?? "claude-sonnet-4-5",
    openaiModel: cfg["openaiModel"] ?? "gpt-4o",
    geminiModel: cfg["geminiModel"] ?? "gemini-2.5-flash",
    generationProvider: cfg["generationProvider"] ?? "anthropic",
    generationModel: cfg["generationModel"] ?? cfg["anthropicModel"] ?? "claude-sonnet-4-5",
    evaluationProvider: cfg["evaluationProvider"] ?? "openai",
    evaluationModel: cfg["evaluationModel"] ?? cfg["openaiModel"] ?? "gpt-4o",
    adversarialProvider: cfg["adversarialProvider"] ?? "gemini",
    adversarialModel: cfg["adversarialModel"] ?? cfg["geminiModel"] ?? "gemini-2.5-flash",
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
  return {
    provider: cfg[roleProviderKey] ?? "anthropic",
    model: cfg[roleModelKey] ?? "claude-sonnet-4-5",
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

router.post("/admin/deal-run", async (_req, res) => {
  if (isDealCycleRunning()) {
    res.status(409).json({ error: "A deal cycle is already running", message: "Already running" });
    return;
  }
  try {
    const cycleId = await runDealCycleNow();
    res.json({ cycleId, message: "Deal autoresearch cycle started" });
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
      tokensConsumed: dealsTable.tokensConsumed,
      costUsd: dealsTable.costUsd,
      createdAt: dealsTable.createdAt,
    }).from(dealsTable).orderBy(desc(dealsTable.createdAt)).limit(50);

    const cycleMap = new Map<string, {
      cycleId: string; status: string; dealsCount: number;
      bestComposite: number; architectures: string[];
      tokensConsumed: number; costUsd: number; startedAt: Date;
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
          tokensConsumed: deal.tokensConsumed,
          costUsd: deal.costUsd,
          startedAt: deal.createdAt,
        });
      } else {
        existing.dealsCount++;
        existing.bestComposite = Math.max(existing.bestComposite, comp);
        existing.tokensConsumed += deal.tokensConsumed;
        existing.costUsd += deal.costUsd;
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

router.get("/admin/costs-summary", async (_req, res) => {
  try {
    const experiments = await db.select({
      costUsd: experimentsTable.costUsd,
      tokensConsumed: experimentsTable.tokensConsumed,
      providerCosts: experimentsTable.providerCosts,
    }).from(experimentsTable);

    const [cycleAgg] = await db.select({
      totalCycleCostUsd: sum(cyclesTable.costUsd),
      totalCycleTokens: sum(cyclesTable.tokensConsumed),
    }).from(cyclesTable);

    const cycles = await db.select({
      cycleId: cyclesTable.id,
      startedAt: cyclesTable.startedAt,
      costUsd: cyclesTable.costUsd,
      tokens: cyclesTable.tokensConsumed,
    }).from(cyclesTable);

    let geminiCostUsd = 0;
    let openaiCostUsd = 0;
    let totalExpCostUsd = 0;
    let totalExpTokens = 0;

    for (const exp of experiments) {
      totalExpCostUsd += Number(exp.costUsd ?? 0);
      totalExpTokens += Number(exp.tokensConsumed ?? 0);
      const pc = exp.providerCosts as { gemini?: number; openai?: number } | null;
      if (pc) {
        geminiCostUsd += pc.gemini ?? 0;
        openaiCostUsd += pc.openai ?? 0;
      } else {
        geminiCostUsd += Number(exp.costUsd ?? 0) * 0.5;
        openaiCostUsd += Number(exp.costUsd ?? 0) * 0.5;
      }
    }

    const totalCycleCostUsd = Number(cycleAgg?.totalCycleCostUsd ?? 0);
    const totalCycleTokens = Number(cycleAgg?.totalCycleTokens ?? 0);

    const anthropicCostUsd = Math.max(0, totalCycleCostUsd - totalExpCostUsd);
    const anthropicTokens = Math.max(0, totalCycleTokens - totalExpTokens);
    const geminiTokensEst = totalExpTokens > 0 ? Math.round(totalExpTokens * (geminiCostUsd / (geminiCostUsd + openaiCostUsd + 0.00001))) : 0;
    const openaiTokensEst = totalExpTokens - geminiTokensEst;

    res.json({
      totalCostUsd: parseFloat(totalCycleCostUsd.toFixed(4)),
      totalTokens: totalCycleTokens,
      byProvider: {
        anthropic: {
          costUsd: parseFloat(anthropicCostUsd.toFixed(4)),
          tokens: anthropicTokens,
          role: "base-forecast-generation",
        },
        gemini: {
          costUsd: parseFloat(geminiCostUsd.toFixed(4)),
          tokens: geminiTokensEst,
          role: "mutation-red-teaming",
        },
        openai: {
          costUsd: parseFloat(openaiCostUsd.toFixed(4)),
          tokens: openaiTokensEst,
          role: "champion-evaluation",
        },
      },
      byCycle: cycles.map(c => ({
        cycleId: c.cycleId,
        startedAt: c.startedAt?.toISOString() ?? "",
        costUsd: c.costUsd ?? 0,
        tokens: c.tokens ?? 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
