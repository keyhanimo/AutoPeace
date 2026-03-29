import { Router } from "express";
import { db } from "@workspace/db";
import { forecastsTable } from "@workspace/db/schema";
import { eq, desc, and, count, isNotNull } from "drizzle-orm";
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
    const horizons = ["30d", "90d", "180d", "1y"];
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

router.get("/forecasts/calibration/curve", async (_req, res) => {
  try {
    const forecasts = await db.select({
      probabilities: forecastsTable.probabilities,
      brierScore: forecastsTable.brierScore,
      timeHorizon: forecastsTable.timeHorizon,
    })
      .from(forecastsTable)
      .where(isNotNull(forecastsTable.brierScore))
      .orderBy(desc(forecastsTable.createdAt))
      .limit(200);

    const NUM_BINS = 10;
    type BinAcc = { sumForecast: number; sumOutcome: number; count: number };
    const bins: BinAcc[] = Array.from({ length: NUM_BINS }, () => ({ sumForecast: 0, sumOutcome: 0, count: 0 }));

    for (const f of forecasts) {
      if (!f.probabilities || f.brierScore === null) continue;
      const probs = f.probabilities as Record<string, number>;

      for (const [, prob] of Object.entries(probs)) {
        if (typeof prob !== 'number') continue;
        const binIdx = Math.min(Math.floor(prob * NUM_BINS), NUM_BINS - 1);
        bins[binIdx]!.sumForecast += prob;
        bins[binIdx]!.count += 1;
      }
    }

    const brierScores = forecasts.map(f => f.brierScore as number);
    const meanBrier = brierScores.length > 0 ? brierScores.reduce((a, b) => a + b, 0) / brierScores.length : null;
    const byHorizon: Record<string, number> = {};
    for (const f of forecasts) {
      if (f.brierScore !== null && f.timeHorizon) {
        byHorizon[f.timeHorizon] = byHorizon[f.timeHorizon]
          ? (byHorizon[f.timeHorizon]! + (f.brierScore as number)) / 2
          : (f.brierScore as number);
      }
    }

    const curve = bins.map((bin, i) => ({
      binMidpoint: (i + 0.5) / NUM_BINS,
      meanForecast: bin.count > 0 ? bin.sumForecast / bin.count : (i + 0.5) / NUM_BINS,
      meanOutcome: bin.count > 0 ? bin.sumOutcome / bin.count : null,
      count: bin.count,
    }));

    res.json({
      curve,
      meanBrierScore: meanBrier,
      byHorizon,
      sampleSize: forecasts.length,
    });
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
