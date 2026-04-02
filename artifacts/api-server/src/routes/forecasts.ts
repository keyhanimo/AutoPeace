import { Router } from "express";
import { db } from "@workspace/db";
import { forecastsTable } from "@workspace/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { GetForecastResponse, GetLatestForecastsResponse, ListForecastsResponse } from "@workspace/api-zod";
import { sendValidated } from "../lib/validate-response";

const router = Router();

router.get("/forecasts", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"]) || 20, 100);
    const offset = Number(req.query["offset"]) || 0;
    const timeHorizon = req.query["timeHorizon"] as string | undefined;
    const cycleId = req.query["cycleId"] as string | undefined;

    const conditions = [];
    if (timeHorizon) conditions.push(eq(forecastsTable.timeHorizon, timeHorizon));
    if (cycleId) conditions.push(eq(forecastsTable.cycleId, cycleId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db.select().from(forecastsTable)
        .where(where)
        .orderBy(desc(forecastsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(forecastsTable).where(where),
    ]);

    sendValidated(res, ListForecastsResponse, { data, total: totalResult[0]?.count ?? 0 });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/forecasts/latest", async (_req, res) => {
  try {
    const horizons = ["10d", "30d", "90d", "180d", "1y"];
    const results = await Promise.all(
      horizons.map(h =>
        db.select().from(forecastsTable)
          .where(and(eq(forecastsTable.timeHorizon, h), eq(forecastsTable.isCurrent, true)))
          .orderBy(desc(forecastsTable.createdAt))
          .limit(1)
      )
    );
    const data = results.flat();
    sendValidated(res, GetLatestForecastsResponse, { data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/forecasts/:id", async (req, res) => {
  try {
    const [forecast] = await db.select().from(forecastsTable)
      .where(eq(forecastsTable.id, req.params["id"]!));
    if (!forecast) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    sendValidated(res, GetForecastResponse, forecast);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
