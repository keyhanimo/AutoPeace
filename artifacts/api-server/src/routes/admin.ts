import { Router } from "express";
import { db } from "@workspace/db";
import { adminConfigTable, evidenceSourcesTable, experimentsTable, cyclesTable } from "@workspace/db/schema";
import { eq, sum } from "drizzle-orm";
import { adminAuth } from "../lib/admin-auth";
import { runCycleNow, isRunning } from "../services/autoresearch";
import { runDealCycleNow, isDealCycleRunning } from "../services/deal-autoresearch";
import { UpdateAdminConfigBody, UpdateEvidenceSourceBody } from "@workspace/api-zod";

const router = Router();

router.use(adminAuth);

const CONFIG_DEFAULTS: Record<string, string> = {
  cadence: "daily",
  budgetCapUsd: "5.0",
  isPaused: "false",
  anthropicModel: "claude-sonnet-4-5",
  openaiModel: "gpt-4o",
  geminiModel: "gemini-2.5-flash",
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
  return {
    cadence: cfg["cadence"] ?? "daily",
    budgetCapUsd: parseFloat(cfg["budgetCapUsd"] ?? "5"),
    isPaused: cfg["isPaused"] === "true",
    anthropicModel: cfg["anthropicModel"] ?? "claude-sonnet-4-5",
    openaiModel: cfg["openaiModel"] ?? "gpt-4o",
    geminiModel: cfg["geminiModel"] ?? "gemini-2.5-flash",
  };
}

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
