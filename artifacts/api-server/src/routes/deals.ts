import { Router } from "express";
import { db } from "@workspace/db";
import { dealsTable, solutionTreeTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";

const router = Router();

router.get("/deals", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"]) || 20, 100);
    const offset = Number(req.query["offset"]) || 0;
    const architecture = req.query["architecture"] as string | undefined;

    let query = db.select().from(dealsTable);
    if (architecture) {
      query = query.where(eq(dealsTable.architecture, architecture)) as typeof query;
    }

    const data = await query
      .orderBy(desc(dealsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ data, total: data.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/deals/current", async (_req, res) => {
  try {
    const [deal] = await db.select()
      .from(dealsTable)
      .where(eq(dealsTable.isCurrent, true))
      .orderBy(desc(dealsTable.createdAt))
      .limit(1);

    if (!deal) {
      res.status(404).json({ error: "No current deal found" });
      return;
    }
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/deals/pareto", async (_req, res) => {
  try {
    const data = await db.select()
      .from(dealsTable)
      .where(eq(dealsTable.isPareto, true))
      .orderBy(desc(dealsTable.createdAt));

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/deals/tree", async (_req, res) => {
  try {
    const nodes = await db.select().from(solutionTreeTable).orderBy(desc(solutionTreeTable.createdAt));
    res.json({ nodes });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/deals/:id", async (req, res) => {
  try {
    const [deal] = await db.select()
      .from(dealsTable)
      .where(eq(dealsTable.id, req.params["id"]!));

    if (!deal) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
