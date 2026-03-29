import { Router } from "express";
import { db } from "@workspace/db";
import { whatIfScenariosTable } from "@workspace/db/schema";
import { computeAndStoreWhatIfScenarios } from "../services/what-if-scenarios";
import { adminAuth } from "../lib/admin-auth";

const router = Router();

router.get("/scenarios", async (_req, res) => {
  try {
    const scenarios = await db.select().from(whatIfScenariosTable);
    if (scenarios.length === 0) {
      res.json({ data: [], status: "not_ready", message: "Scenario snapshots are not yet computed. They are generated automatically during each research cycle. An admin can trigger computation manually via POST /api/admin/scenarios/compute." });
      return;
    }
    res.json({ data: scenarios });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/admin/scenarios/compute", adminAuth, async (_req, res) => {
  try {
    await computeAndStoreWhatIfScenarios();
    const scenarios = await db.select().from(whatIfScenariosTable);
    res.json({ message: "Scenario snapshots computed successfully", count: scenarios.length, data: scenarios });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
