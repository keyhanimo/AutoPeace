import { Router } from "express";
import { db } from "@workspace/db";
import { cyclesTable, dealsTable, pipelineEvolutionTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/autoresearch/timeline", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"]) || 50, 100);

    const cycles = await db.select({
      id: cyclesTable.id,
      startedAt: cyclesTable.startedAt,
    })
      .from(cyclesTable)
      .where(eq(cyclesTable.status, "completed"))
      .orderBy(desc(cyclesTable.startedAt))
      .limit(limit);

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

    res.json({ dealTimeline });
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
