import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { proposalsTable, dealsTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { adminAuth } from "../lib/admin-auth";

const router = Router();

router.get("/proposals", async (_req, res) => {
  try {
    const data = await db.select()
      .from(proposalsTable)
      .orderBy(desc(proposalsTable.createdAt));

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/proposals/arena", async (_req, res) => {
  try {
    const [proposals, currentDeals] = await Promise.all([
      db.select().from(proposalsTable).orderBy(desc(proposalsTable.createdAt)),
      db.select().from(dealsTable).where(eq(dealsTable.isCurrent, true)).limit(1),
    ]);

    res.json({
      proposals,
      currentAiDeal: currentDeals[0] ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/proposals/:id", async (req, res) => {
  try {
    const [proposal] = await db.select()
      .from(proposalsTable)
      .where(eq(proposalsTable.id, req.params["id"]!));

    if (!proposal) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(proposal);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/proposals", adminAuth, async (req, res) => {
  try {
    const { name, source, summary, terms } = req.body as {
      name: string;
      source: string;
      summary: string;
      terms: Record<string, unknown>;
    };

    if (!name || !source || !terms) {
      res.status(400).json({ error: "name, source, and terms are required" });
      return;
    }

    const id = randomUUID();

    await db.insert(proposalsTable).values({
      id,
      name,
      source,
      submittedBy: "admin",
      summary: summary ?? "",
      terms: terms as Record<string, never>,
      scores: null,
      stakeholderEvaluations: null,
      knownResponses: null,
      whatWouldItTake: null,
    });

    const [created] = await db.select().from(proposalsTable).where(eq(proposalsTable.id, id));
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
