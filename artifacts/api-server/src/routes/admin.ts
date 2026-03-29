import { Router } from "express";
import { db } from "@workspace/db";
import { adminConfigTable, evidenceSourcesTable, experimentsTable, cyclesTable } from "@workspace/db/schema";
import { eq, sum, count } from "drizzle-orm";
import { adminAuth } from "../lib/admin-auth";
import { runCycleNow } from "../services/autoresearch";

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
  try {
    const updates = req.body as Record<string, unknown>;
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

let isRunning = false;

router.post("/admin/run", async (_req, res) => {
  if (isRunning) {
    res.status(409).json({ error: "A cycle is already running", cycleId: "", message: "Already running" });
    return;
  }
  try {
    isRunning = true;
    const cycleId = await runCycleNow();
    res.json({ cycleId, message: "Autoresearch cycle started" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  } finally {
    isRunning = false;
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
  try {
    const { id } = req.params;
    const update = req.body as { isEnabled?: boolean; fetchFrequencyMinutes?: number };
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
    const [total] = await db.select({
      totalCostUsd: sum(experimentsTable.costUsd),
      totalTokens: sum(experimentsTable.tokensConsumed),
    }).from(experimentsTable);

    const cycles = await db.select({
      cycleId: cyclesTable.id,
      startedAt: cyclesTable.startedAt,
      costUsd: cyclesTable.costUsd,
      tokens: cyclesTable.tokensConsumed,
    }).from(cyclesTable);

    const totalCostUsd = Number(total?.totalCostUsd ?? 0);
    const totalTokens = Number(total?.totalTokens ?? 0);

    const anthropicCost = await db.select({
      costUsd: sum(experimentsTable.costUsd),
      tokens: sum(experimentsTable.tokensConsumed),
    }).from(experimentsTable).where(eq(experimentsTable.task, "B"));

    const openaiCost = await db.select({
      costUsd: sum(experimentsTable.costUsd),
      tokens: sum(experimentsTable.tokensConsumed),
    }).from(experimentsTable).where(eq(experimentsTable.task, "A"));

    const geminiCost = await db.select({
      costUsd: sum(experimentsTable.costUsd),
      tokens: sum(experimentsTable.tokensConsumed),
    }).from(experimentsTable).where(eq(experimentsTable.task, "both"));

    const anthropicTotalCostUsd = Number(anthropicCost[0]?.costUsd ?? 0) + totalCostUsd * 0.60;
    const openaiTotalCostUsd = Number(openaiCost[0]?.costUsd ?? 0) + totalCostUsd * 0.25;
    const geminiTotalCostUsd = Number(geminiCost[0]?.costUsd ?? 0) + totalCostUsd * 0.15;

    res.json({
      totalCostUsd,
      totalTokens,
      byProvider: {
        anthropic: {
          costUsd: parseFloat(anthropicTotalCostUsd.toFixed(4)),
          tokens: Math.round(Number(anthropicCost[0]?.tokens ?? 0) + totalTokens * 0.60),
        },
        openai: {
          costUsd: parseFloat(openaiTotalCostUsd.toFixed(4)),
          tokens: Math.round(Number(openaiCost[0]?.tokens ?? 0) + totalTokens * 0.25),
        },
        gemini: {
          costUsd: parseFloat(geminiTotalCostUsd.toFixed(4)),
          tokens: Math.round(Number(geminiCost[0]?.tokens ?? 0) + totalTokens * 0.15),
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
