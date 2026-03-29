import { Router } from "express";
import { db } from "@workspace/db";
import { changelogEntriesTable } from "@workspace/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { ListChangelogResponse } from "@workspace/api-zod";
import { sendValidated } from "../lib/validate-response";

const router = Router();

router.get("/changelog", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"]) || 20, 100);
    const offset = Number(req.query["offset"]) || 0;

    const [data, totalResult] = await Promise.all([
      db.select().from(changelogEntriesTable)
        .orderBy(desc(changelogEntriesTable.timestamp))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(changelogEntriesTable),
    ]);

    sendValidated(res, ListChangelogResponse, { data, total: totalResult[0]?.count ?? 0 });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/changelog/:id", async (req, res) => {
  try {
    const [entry] = await db.select().from(changelogEntriesTable)
      .where(eq(changelogEntriesTable.id, req.params["id"]!));
    if (!entry) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
