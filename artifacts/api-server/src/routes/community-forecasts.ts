import { Router } from "express";
import type { Request } from "express";
import { db } from "@workspace/db";
import { communityForecastsTable } from "@workspace/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const OUTCOMES = [
  "continued_conflict",
  "major_escalation",
  "informal_deescalation",
  "limited_ceasefire",
  "humanitarian_mini_deal",
  "sanctions_partial_deal",
  "regional_framework",
  "broad_settlement",
];

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function extractIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return (first ?? "").trim();
  }
  return req.socket?.remoteAddress ?? req.ip ?? "unknown";
}

router.post("/community-forecasts", async (req, res) => {
  try {
    const { sessionId, timeHorizon, estimates } = req.body as {
      sessionId: string;
      timeHorizon: string;
      estimates: Record<string, number>;
    };

    if (!sessionId || !timeHorizon || !estimates) {
      res.status(400).json({ error: "sessionId, timeHorizon, and estimates are required" });
      return;
    }

    if (!["10d", "30d", "90d", "180d", "1y"].includes(timeHorizon)) {
      res.status(400).json({ error: "Invalid timeHorizon. Must be 10d, 30d, 90d, 180d, or 1y" });
      return;
    }

    const missingKeys = OUTCOMES.filter(k => !(k in estimates));
    if (missingKeys.length > 0) {
      res.status(400).json({ error: `Missing required outcome keys: ${missingKeys.join(", ")}` });
      return;
    }

    const extraKeys = Object.keys(estimates).filter(k => !OUTCOMES.includes(k));
    if (extraKeys.length > 0) {
      res.status(400).json({ error: `Unknown outcome keys: ${extraKeys.join(", ")}` });
      return;
    }

    for (const [key, val] of Object.entries(estimates)) {
      if (typeof val !== "number" || val < 0 || val > 100) {
        res.status(400).json({ error: `Estimate for "${key}" must be a number between 0 and 100` });
        return;
      }
    }

    const total = OUTCOMES.reduce((a, k) => a + (estimates[k] ?? 0), 0);
    if (Math.abs(total - 100) > 1) {
      res.status(400).json({ error: `Estimates must sum to 100% (got ${total.toFixed(1)}%)` });
      return;
    }

    const ip = extractIp(req);
    const cutoff = new Date(Date.now() - COOLDOWN_MS);

    if (ip && ip !== "unknown") {
      const existing = await db
        .select({ id: communityForecastsTable.id })
        .from(communityForecastsTable)
        .where(
          and(
            eq(communityForecastsTable.ipAddress, ip),
            eq(communityForecastsTable.timeHorizon, timeHorizon),
            gte(communityForecastsTable.submittedAt, cutoff)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        res.status(429).json({
          error: "duplicate",
          message: "You have already submitted a forecast for this time horizon in the last 24 hours. Please come back tomorrow to update your view.",
        });
        return;
      }
    }

    const id = randomUUID();
    await db.insert(communityForecastsTable).values({
      id,
      sessionId,
      timeHorizon,
      estimates,
      ipAddress: ip,
    });

    res.json({ id, message: "Forecast submitted successfully" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/community-forecasts/aggregate", async (req, res) => {
  try {
    const timeHorizon = String(req.query["timeHorizon"] || "90d");

    const submissions = await db.select()
      .from(communityForecastsTable)
      .where(eq(communityForecastsTable.timeHorizon, timeHorizon))
      .orderBy(desc(communityForecastsTable.submittedAt))
      .limit(500);

    if (submissions.length === 0) {
      res.json({
        timeHorizon,
        count: 0,
        aggregated: {},
        outcomes: OUTCOMES,
      });
      return;
    }

    const sums: Record<string, number> = {};
    for (const outcome of OUTCOMES) {
      sums[outcome] = 0;
    }

    for (const sub of submissions) {
      const estimates = sub.estimates as Record<string, number>;
      for (const outcome of OUTCOMES) {
        sums[outcome] = (sums[outcome] ?? 0) + (estimates[outcome] ?? 0);
      }
    }

    const aggregated: Record<string, number> = {};
    for (const outcome of OUTCOMES) {
      aggregated[outcome] = Math.round(((sums[outcome] ?? 0) / submissions.length) * 10) / 10;
    }

    res.json({
      timeHorizon,
      count: submissions.length,
      aggregated,
      outcomes: OUTCOMES,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
