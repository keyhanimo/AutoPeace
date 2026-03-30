import { Router } from "express";
import { db } from "@workspace/db";
import { experimentsTable, cyclesTable } from "@workspace/db/schema";
import { eq, desc, and, count, sum } from "drizzle-orm";
import { ListExperimentsResponse, GetExperimentStatsResponse } from "@workspace/api-zod";
import { sendValidated } from "../lib/validate-response";

const router = Router();

router.get("/experiments", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"]) || 20, 100);
    const offset = Number(req.query["offset"]) || 0;
    const task = req.query["task"] as string | undefined;
    const cycleId = req.query["cycleId"] as string | undefined;
    const retainedParam = req.query["retained"];

    const conditions = [];
    if (task && task !== "both") conditions.push(eq(experimentsTable.task, task));
    if (cycleId) conditions.push(eq(experimentsTable.cycleId, cycleId));
    if (retainedParam !== undefined) {
      conditions.push(eq(experimentsTable.retained, retainedParam === "true"));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db.select().from(experimentsTable)
        .where(where)
        .orderBy(desc(experimentsTable.timestamp))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(experimentsTable).where(where),
    ]);

    sendValidated(res, ListExperimentsResponse, { data, total: totalResult[0]?.count ?? 0 });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/experiments/stats", async (_req, res) => {
  try {
    const [allStats] = await db.select({
      total: count(),
      totalTokens: sum(experimentsTable.tokensConsumed),
    }).from(experimentsTable);

    const [retainedStats] = await db.select({ retained: count() }).from(experimentsTable)
      .where(eq(experimentsTable.retained, true));

    const [cyclesRun] = await db.select({ count: count() }).from(cyclesTable)
      .where(eq(cyclesTable.status, "completed"));

    const total = allStats?.total ?? 0;
    const retained = retainedStats?.retained ?? 0;

    sendValidated(res, GetExperimentStatsResponse, {
      total,
      retained,
      retentionRate: total > 0 ? retained / total : 0,
      totalCostUsd: 0,
      totalTokensConsumed: Number(allStats?.totalTokens ?? 0),
      latestBrierScore: null,
      cyclesRun: cyclesRun?.count ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
