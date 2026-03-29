import { Router } from "express";
import { db } from "@workspace/db";
import { costOfWarTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { GetCostsByStakeholderResponse, ListCostsResponse } from "@workspace/api-zod";
import { sendValidated } from "../lib/validate-response";

const router = Router();

router.get("/costs", async (req, res) => {
  try {
    const stakeholderId = req.query["stakeholderId"] as string | undefined;

    let data;
    if (stakeholderId) {
      data = await db.select().from(costOfWarTable)
        .where(eq(costOfWarTable.stakeholderId, stakeholderId))
        .orderBy(desc(costOfWarTable.timestamp))
        .limit(1);
    } else {
      const subquery = db.selectDistinct({ stakeholderId: costOfWarTable.stakeholderId })
        .from(costOfWarTable);

      const allStakeholderIds = (await subquery).map(r => r.stakeholderId);
      data = await Promise.all(
        allStakeholderIds.map(id =>
          db.select().from(costOfWarTable)
            .where(eq(costOfWarTable.stakeholderId, id))
            .orderBy(desc(costOfWarTable.timestamp))
            .limit(1)
            .then(rows => rows[0])
        )
      );
      data = data.filter(Boolean);
    }

    sendValidated(res, ListCostsResponse, { data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/costs/:stakeholderId", async (req, res) => {
  try {
    const [row] = await db.select().from(costOfWarTable)
      .where(eq(costOfWarTable.stakeholderId, req.params["stakeholderId"]!))
      .orderBy(desc(costOfWarTable.timestamp))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    sendValidated(res, GetCostsByStakeholderResponse, row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
