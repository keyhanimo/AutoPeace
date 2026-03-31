import { Router } from "express";
import { db } from "@workspace/db";
import { cyclesTable, experimentsTable, forecastsTable, dealsTable, pipelineEvolutionTable } from "@workspace/db/schema";
import { eq, desc, and, count, isNotNull, inArray } from "drizzle-orm";

const router = Router();

router.get("/autoresearch/timeline", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"]) || 50, 100);

    const cycles = await db.select({
      id: cyclesTable.id,
      startedAt: cyclesTable.startedAt,
      experimentsRun: cyclesTable.experimentsRun,
      experimentsRetained: cyclesTable.experimentsRetained,
    })
      .from(cyclesTable)
      .where(eq(cyclesTable.status, "completed"))
      .orderBy(desc(cyclesTable.startedAt))
      .limit(limit);

    const forecastTimeline = [];
    for (const cycle of cycles.reverse()) {
      const [forecast] = await db.select({
        brierScore: forecastsTable.brierScore,
        logScore: forecastsTable.logScore,
      })
        .from(forecastsTable)
        .where(and(eq(forecastsTable.cycleId, cycle.id), eq(forecastsTable.timeHorizon, "90d")))
        .orderBy(desc(forecastsTable.createdAt))
        .limit(1);

      forecastTimeline.push({
        cycleId: cycle.id,
        timestamp: cycle.startedAt.toISOString(),
        brierScore: forecast?.brierScore ?? null,
        logScore: forecast?.logScore ?? null,
        experimentsRun: cycle.experimentsRun,
        experimentsRetained: cycle.experimentsRetained,
      });
    }

    const deals = await db.select({
      id: dealsTable.id,
      createdAt: dealsTable.createdAt,
      scores: dealsTable.scores,
      architecture: dealsTable.architecture,
      pipelineConfig: dealsTable.pipelineConfig,
      isCurrent: dealsTable.isCurrent,
    })
      .from(dealsTable)
      .where(eq(dealsTable.generatedBy, "ai"))
      .orderBy(dealsTable.createdAt)
      .limit(limit);

    const evolutions = await db.select({
      id: pipelineEvolutionTable.id,
      generation: pipelineEvolutionTable.generation,
    }).from(pipelineEvolutionTable).orderBy(pipelineEvolutionTable.generation);

    const dealTimeline = deals.map(d => {
      const scores = d.scores as Record<string, number> | null;
      const config = d.pipelineConfig as Record<string, string> | null;
      const configId = config?.evolutionId;
      const evo = configId ? evolutions.find(e => e.id === configId) : null;
      return {
        dealId: d.id,
        timestamp: d.createdAt.toISOString(),
        compositeScore: scores?.composite ?? 0,
        architecture: d.architecture,
        generation: evo?.generation ?? (evolutions.length > 0 ? evolutions[evolutions.length - 1].generation : 0),
        isCurrent: d.isCurrent,
      };
    });

    res.json({ forecastTimeline, dealTimeline });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/autoresearch/champion-lineage", async (req, res) => {
  try {
    const taskFilter = (req.query["task"] as string) || "all";
    const limit = Math.min(Number(req.query["limit"]) || 30, 100);

    const conditions = [eq(experimentsTable.retained, true)];
    if (taskFilter === "A") {
      conditions.push(inArray(experimentsTable.task, ["A", "both"]));
    } else if (taskFilter === "B") {
      conditions.push(inArray(experimentsTable.task, ["B", "both"]));
    }

    const champions = await db.select({
      id: experimentsTable.id,
      cycleId: experimentsTable.cycleId,
      timestamp: experimentsTable.timestamp,
      task: experimentsTable.task,
      changeDescription: experimentsTable.changeDescription,
      scoresBefore: experimentsTable.scoresBefore,
      scoresAfter: experimentsTable.scoresAfter,
      diagnosis: experimentsTable.diagnosis,
      tokensConsumed: experimentsTable.tokensConsumed,
    })
      .from(experimentsTable)
      .where(and(...conditions))
      .orderBy(experimentsTable.timestamp)
      .limit(limit);

    const cycleDealMap: Record<string, { compositeScore: number; architecture: string; isCurrent: boolean }> = {};
    if (champions.length > 0) {
      const allDeals = await db.select({
        scores: dealsTable.scores,
        architecture: dealsTable.architecture,
        isCurrent: dealsTable.isCurrent,
        createdAt: dealsTable.createdAt,
      })
        .from(dealsTable)
        .where(eq(dealsTable.generatedBy, "ai"))
        .orderBy(dealsTable.createdAt);

      const cycleFirstExp: Record<string, number> = {};
      for (const champion of champions) {
        const t = champion.timestamp.getTime();
        if (!cycleFirstExp[champion.cycleId] || t < cycleFirstExp[champion.cycleId]) {
          cycleFirstExp[champion.cycleId] = t;
        }
      }

      for (const [cycleId, expTime] of Object.entries(cycleFirstExp)) {
        let bestDeal: typeof allDeals[0] | null = null;
        let bestGap = Infinity;
        for (const deal of allDeals) {
          const gap = Math.abs(deal.createdAt.getTime() - expTime);
          if (gap < bestGap) {
            bestGap = gap;
            bestDeal = deal;
          }
        }
        if (bestDeal) {
          const scores = bestDeal.scores as Record<string, number> | null;
          cycleDealMap[cycleId] = {
            compositeScore: scores?.composite ?? 0,
            architecture: bestDeal.architecture ?? "unknown",
            isCurrent: bestDeal.isCurrent ?? false,
          };
        }
      }
    }

    const [totalRetainedResult] = await db.select({ count: count() })
      .from(experimentsTable)
      .where(eq(experimentsTable.retained, true));

    const [totalResult] = await db.select({ count: count() })
      .from(experimentsTable);

    const data = champions.map(c => ({
      ...c,
      timestamp: c.timestamp.toISOString(),
      dealInfo: cycleDealMap[c.cycleId] ?? null,
    }));

    res.json({
      champions: data,
      totalRetained: totalRetainedResult?.count ?? 0,
      totalExperiments: totalResult?.count ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/autoresearch/pipeline-evolution", async (_req, res) => {
  try {
    const generations = await db.select()
      .from(pipelineEvolutionTable)
      .orderBy(pipelineEvolutionTable.generation);

    const current = generations.find(g => g.isCurrent);

    const data = generations.map(g => ({
      id: g.id,
      parentConfigId: g.parentConfigId,
      generation: g.generation,
      promptOverrides: g.promptOverrides,
      description: g.description,
      avgCompositeScore: g.avgCompositeScore,
      dealCount: g.dealCount,
      isCurrent: g.isCurrent,
      createdAt: g.createdAt.toISOString(),
    }));

    res.json({
      generations: data,
      currentGeneration: current?.generation ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
