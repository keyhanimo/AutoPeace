import { Router } from "express";
import { db } from "@workspace/db";
import { dealsTable, solutionTreeTable } from "@workspace/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

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

router.get("/deals/history", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"]) || 50, 200);
    const offset = Number(req.query["offset"]) || 0;

    const data = await db.select({
      id: dealsTable.id,
      cycleId: dealsTable.cycleId,
      architecture: dealsTable.architecture,
      scores: dealsTable.scores,
      diagnosis: dealsTable.diagnosis,
      evidenceSummary: dealsTable.evidenceSummary,
      isCurrent: dealsTable.isCurrent,
      isPareto: dealsTable.isPareto,
      generatedBy: dealsTable.generatedBy,
      tokensConsumed: dealsTable.tokensConsumed,
      costUsd: dealsTable.costUsd,
      createdAt: dealsTable.createdAt,
    }).from(dealsTable)
      .orderBy(desc(dealsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ data, total: data.length, offset, limit });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/deals/robustness", async (req, res) => {
  try {
    const recentCount = Math.min(Number(req.query["n"]) || 10, 50);
    const deals = await db.select({
      id: dealsTable.id,
      architecture: dealsTable.architecture,
      redTeamResults: dealsTable.redTeamResults,
      scores: dealsTable.scores,
      createdAt: dealsTable.createdAt,
    }).from(dealsTable)
      .orderBy(desc(dealsTable.createdAt))
      .limit(recentCount);

    type RedTeamEntry = { attack: string; severity: string; survived: boolean };
    const allAttacks = deals.flatMap(d => (d.redTeamResults as RedTeamEntry[] | null) ?? []);
    const totalAttacks = allAttacks.length;
    const survivedAttacks = allAttacks.filter(a => a.survived).length;
    const criticalFails = allAttacks.filter(a => !a.survived && a.severity === "critical").length;

    const bySeverity: Record<string, { total: number; survived: number }> = {};
    for (const a of allAttacks) {
      const sev = a.severity ?? "unknown";
      bySeverity[sev] ??= { total: 0, survived: 0 };
      bySeverity[sev].total++;
      if (a.survived) bySeverity[sev].survived++;
    }

    res.json({
      dealsSampled: deals.length,
      totalAttacks,
      survivedAttacks,
      survivalRate: totalAttacks > 0 ? survivedAttacks / totalAttacks : null,
      criticalFails,
      bySeverity,
      deals: deals.map(d => ({
        id: d.id,
        architecture: d.architecture,
        composite: (d.scores as { composite?: number } | null)?.composite ?? null,
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/deals/compare", async (req, res) => {
  try {
    const ids = (req.query["ids"] as string | undefined)?.split(",").filter(Boolean) ?? [];
    if (ids.length < 2 || ids.length > 10) {
      res.status(400).json({ error: "Provide 2–10 deal IDs via ?ids=id1,id2,..." });
      return;
    }

    const deals = await db.select()
      .from(dealsTable)
      .where(inArray(dealsTable.id, ids));

    if (deals.length === 0) {
      res.status(404).json({ error: "No matching deals found" });
      return;
    }

    const DIMENSIONS = ["feasibility", "coherence", "evidenceGrounding", "domesticSellability", "regionalStability", "implementability", "durability", "composite"] as const;

    const comparison = deals.map(d => {
      const scores = d.scores as Record<string, number | undefined> | null;
      const dimensionScores: Record<string, number | null> = {};
      for (const dim of DIMENSIONS) {
        dimensionScores[dim] = scores?.[dim] ?? null;
      }
      return {
        id: d.id,
        architecture: d.architecture,
        isCurrent: d.isCurrent,
        isPareto: d.isPareto,
        generatedBy: d.generatedBy,
        diagnosis: d.diagnosis,
        scores: dimensionScores,
        createdAt: d.createdAt,
      };
    });

    const leaders: Record<string, string | null> = {};
    for (const dim of DIMENSIONS) {
      let best: { id: string; score: number } | null = null;
      for (const d of comparison) {
        const score = d.scores[dim];
        if (score !== null && score !== undefined && (best === null || score > best.score)) {
          best = { id: d.id, score };
        }
      }
      leaders[dim] = best?.id ?? null;
    }

    res.json({ deals: comparison, leaders });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/deals/:id/stakeholder-evals", async (req, res) => {
  try {
    const dealId = String(req.params["id"]);
    const [deal] = await db.select({
      id: dealsTable.id,
      architecture: dealsTable.architecture,
      stakeholderEvaluations: dealsTable.stakeholderEvaluations,
      domesticEvaluations: dealsTable.domesticEvaluations,
      negotiatorResult: dealsTable.negotiatorResult,
    }).from(dealsTable).where(eq(dealsTable.id, dealId));

    if (!deal) {
      res.status(404).json({ error: "Deal not found" });
      return;
    }

    const stakeholderEvals = (deal.stakeholderEvaluations ?? {}) as Record<string, { verdict: string; rationale: string; redLineViolations?: string[]; conditions?: string[] }>;
    const summary = {
      accept: Object.values(stakeholderEvals).filter(e => e.verdict === "accept").length,
      conditional: Object.values(stakeholderEvals).filter(e => e.verdict === "conditional").length,
      reject: Object.values(stakeholderEvals).filter(e => e.verdict === "reject").length,
    };

    res.json({
      dealId: deal.id,
      architecture: deal.architecture,
      stakeholderEvaluations: deal.stakeholderEvaluations,
      domesticEvaluations: deal.domesticEvaluations,
      negotiatorAmendments: deal.negotiatorResult,
      summary,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/deals/:id", async (req, res) => {
  try {
    const [deal] = await db.select()
      .from(dealsTable)
      .where(eq(dealsTable.id, String(req.params["id"])));

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
