import { Router } from "express";
import { db } from "@workspace/db";
import { evidenceItemsTable } from "@workspace/db/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";

const router = Router();

router.get("/evidence", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"]) || 20, 100);
    const offset = Number(req.query["offset"]) || 0;
    const source = req.query["source"] as string | undefined;
    const evidenceType = req.query["evidenceType"] as string | undefined;

    const conditions = [];
    if (source) conditions.push(eq(evidenceItemsTable.source, source));
    if (evidenceType) conditions.push(eq(evidenceItemsTable.evidenceType, evidenceType));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db.select().from(evidenceItemsTable)
        .where(where)
        .orderBy(desc(evidenceItemsTable.publishedAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(evidenceItemsTable).where(where),
    ]);

    res.json({ data, total: totalResult[0]?.count ?? 0 });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
