import { Router } from "express";
import { db } from "@workspace/db";
import { stakeholdersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/stakeholders", async (req, res) => {
  try {
    const role = req.query["role"] as string | undefined;
    let data;
    if (role) {
      data = await db.select().from(stakeholdersTable).where(eq(stakeholdersTable.role, role));
    } else {
      data = await db.select().from(stakeholdersTable);
    }
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/stakeholders/:id", async (req, res) => {
  try {
    const [stakeholder] = await db.select().from(stakeholdersTable)
      .where(eq(stakeholdersTable.id, req.params["id"]!));
    if (!stakeholder) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(stakeholder);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
