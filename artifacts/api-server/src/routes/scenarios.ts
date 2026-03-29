import { Router } from "express";
import { db } from "@workspace/db";
import { whatIfScenariosTable } from "@workspace/db/schema";
import { computeAndStoreWhatIfScenarios } from "../services/what-if-scenarios";

const router = Router();

router.get("/scenarios", async (_req, res) => {
  try {
    const scenarios = await db.select().from(whatIfScenariosTable);
    if (scenarios.length === 0) {
      await computeAndStoreWhatIfScenarios();
      const fresh = await db.select().from(whatIfScenariosTable);
      res.json({ data: fresh });
      return;
    }
    res.json({ data: scenarios });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
