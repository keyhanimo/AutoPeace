import { Router } from "express";
import { db } from "@workspace/db";
import {
  forecastsTable, dealsTable, experimentsTable,
  stakeholdersTable, evidenceItemsTable, costOfWarTable, changelogEntriesTable,
} from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const router = Router();

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]!);
  const header = keys.join(",");
  const lines = rows.map(row =>
    keys.map(k => {
      const v = row[k];
      if (v === null || v === undefined) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    }).join(",")
  );
  return [header, ...lines].join("\n");
}

router.get("/downloads/forecasts.json", async (req, res) => {
  try {
    const data = await db.select().from(forecastsTable)
      .orderBy(desc(forecastsTable.cycleId))
      .limit(1000);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=autopeace-forecasts.json");
    res.json({ data, exportedAt: new Date().toISOString(), count: data.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/downloads/forecasts.csv", async (req, res) => {
  try {
    const data = await db.select().from(forecastsTable)
      .orderBy(desc(forecastsTable.cycleId))
      .limit(1000);
    const flat = data.map(f => ({
      id: f.id,
      cycleId: f.cycleId,
      timeHorizon: f.timeHorizon,
      ...Object.fromEntries(
        Object.entries(f.probabilities as Record<string, number>).map(([k, v]) => [`prob_${k}`, v])
      ),
      createdAt: f.createdAt.toISOString(),
    }));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=autopeace-forecasts.csv");
    res.send(toCSV(flat as Record<string, unknown>[]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/downloads/deals.json", async (req, res) => {
  try {
    const data = await db.select().from(dealsTable)
      .orderBy(desc(dealsTable.createdAt))
      .limit(200);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=autopeace-deals.json");
    res.json({ data, exportedAt: new Date().toISOString(), count: data.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/downloads/deals.csv", async (req, res) => {
  try {
    const data = await db.select().from(dealsTable)
      .orderBy(desc(dealsTable.createdAt))
      .limit(200);
    const flat = data.map(d => {
      const s = d.scores as Record<string, number> | null;
      const jsonCol = (v: unknown) => v != null ? JSON.stringify(v) : "";
      return {
        id: d.id,
        cycleId: d.cycleId,
        parentId: d.parentId ?? "",
        architecture: d.architecture,
        isCurrent: d.isCurrent,
        isPareto: d.isPareto,
        composite: s?.composite ?? "",
        feasibility: s?.feasibility ?? "",
        coherence: s?.coherence ?? "",
        evidenceGrounding: s?.evidenceGrounding ?? "",
        domesticSellability: s?.domesticSellability ?? "",
        regionalStability: s?.regionalStability ?? "",
        implementability: s?.implementability ?? "",
        durability: s?.durability ?? "",
        diagnosis: d.diagnosis ?? "",
        generatedBy: d.generatedBy,
        tokensConsumed: d.tokensConsumed,
        costUsd: d.costUsd,
        terms: jsonCol(d.terms),
        stakeholderEvaluations: jsonCol(d.stakeholderEvaluations),
        redTeamResults: jsonCol(d.redTeamResults),
        negotiatorResult: jsonCol(d.negotiatorResult),
        brainstormInsights: jsonCol(d.brainstormInsights),
        domesticEvaluations: jsonCol(d.domesticEvaluations),
        domesticFramingStrategies: jsonCol(d.domesticFramingStrategies),
        metaEvaluatorResult: jsonCol(d.metaEvaluatorResult),
        createdAt: d.createdAt.toISOString(),
      };
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=autopeace-deals.csv");
    res.send(toCSV(flat as Record<string, unknown>[]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/downloads/experiments.csv", async (req, res) => {
  try {
    const data = await db.select().from(experimentsTable)
      .orderBy(desc(experimentsTable.cycleId))
      .limit(2000);
    const flat = data.map(e => ({
      id: e.id,
      cycleId: e.cycleId,
      task: e.task,
      retained: e.retained,
      scoresBefore: e.scoresBefore,
      scoresAfter: e.scoresAfter,
      timestamp: e.timestamp.toISOString(),
    }));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=autopeace-experiments.csv");
    res.send(toCSV(flat as Record<string, unknown>[]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/downloads/stakeholders.json", async (req, res) => {
  try {
    const data = await db.select().from(stakeholdersTable);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=autopeace-stakeholders.json");
    res.json({ data, exportedAt: new Date().toISOString(), count: data.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/downloads/evidence.json", async (req, res) => {
  try {
    const data = await db.select().from(evidenceItemsTable)
      .orderBy(desc(evidenceItemsTable.publishedAt))
      .limit(500);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=autopeace-evidence.json");
    res.json({ data, exportedAt: new Date().toISOString(), count: data.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/downloads/costs.json", async (req, res) => {
  try {
    const data = await db.select().from(costOfWarTable)
      .orderBy(desc(costOfWarTable.timestamp));
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=autopeace-costs.json");
    res.json({ data, exportedAt: new Date().toISOString(), count: data.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/downloads/experiments.json", async (_req, res) => {
  try {
    const data = await db.select().from(experimentsTable)
      .orderBy(desc(experimentsTable.cycleId))
      .limit(2000);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=autopeace-experiments.json");
    res.json({ data, exportedAt: new Date().toISOString(), count: data.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/downloads/stakeholders.csv", async (_req, res) => {
  try {
    const data = await db.select().from(stakeholdersTable);
    const flat = data.map(s => ({
      id: s.id,
      name: s.name,
      role: s.role,
      region: s.region,
      goals: s.goals,
      redLines: s.redLines,
      preferredOutcomes: s.preferredOutcomes,
      createdAt: s.createdAt.toISOString(),
    }));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=autopeace-stakeholders.csv");
    res.send(toCSV(flat as Record<string, unknown>[]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/downloads/evidence.csv", async (_req, res) => {
  try {
    const data = await db.select().from(evidenceItemsTable)
      .orderBy(desc(evidenceItemsTable.publishedAt))
      .limit(500);
    const flat = data.map(e => ({
      id: e.id,
      title: e.title,
      source: e.source,
      sourceUrl: e.sourceUrl,
      evidenceType: e.evidenceType,
      publishedAt: e.publishedAt.toISOString(),
      isProcessed: e.isProcessed,
      stakeholderRelevanceCount: Array.isArray(e.stakeholderRelevance) ? (e.stakeholderRelevance as unknown[]).length : 0,
      influencedCycleId: e.influencedCycleId ?? "",
      influencedForecastId: e.influencedForecastId ?? "",
      ingestedAt: e.ingestedAt.toISOString(),
    }));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=autopeace-evidence.csv");
    res.send(toCSV(flat as Record<string, unknown>[]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/downloads/costs.csv", async (_req, res) => {
  try {
    const data = await db.select().from(costOfWarTable)
      .orderBy(desc(costOfWarTable.timestamp));
    const flat = data.map(c => ({
      id: c.id,
      stakeholderId: c.stakeholderId,
      timestamp: c.timestamp.toISOString(),
      economicTotal: (c.economic as Record<string, unknown>)?.total ?? "",
      humanitarianTotal: (c.humanitarian as Record<string, unknown>)?.total ?? "",
      strategicTotal: (c.strategic as Record<string, unknown>)?.total ?? "",
      dataVersion: c.dataVersion,
    }));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=autopeace-costs.csv");
    res.send(toCSV(flat as Record<string, unknown>[]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/downloads/deals-pareto.json", async (_req, res) => {
  try {
    const data = await db.select().from(dealsTable)
      .where(eq(dealsTable.isPareto, true))
      .orderBy(desc(dealsTable.createdAt));
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=autopeace-deals-pareto.json");
    res.json({
      description: "Pareto frontier — deals that are not dominated on any scoring dimension",
      exportedAt: new Date().toISOString(),
      count: data.length,
      data,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/openapi.yaml", (_req, res) => {
  try {
    const specPath = path.join(process.cwd(), "..", "..", "lib", "api-spec", "openapi.yaml");
    const content = fs.readFileSync(specPath, "utf-8");
    res.setHeader("Content-Type", "text/yaml; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(content);
  } catch {
    res.status(404).json({ error: "OpenAPI spec not found" });
  }
});

router.get("/downloads/index", async (_req, res) => {
  const BASE_URL = "/api/downloads";
  res.json({
    description: "AutoPeace data download portal — all datasets available for download",
    exportedAt: new Date().toISOString(),
    datasets: [
      { id: "forecasts-json", name: "Forecasts (JSON)", url: `${BASE_URL}/forecasts.json`, format: "JSON", description: "All probabilistic outcome forecasts with probability distributions and Brier scores" },
      { id: "forecasts-csv", name: "Forecasts (CSV)", url: `${BASE_URL}/forecasts.csv`, format: "CSV", description: "Flattened forecasts table for spreadsheet analysis" },
      { id: "deals-json", name: "AI Peace Deals (JSON)", url: `${BASE_URL}/deals.json`, format: "JSON", description: "All AI-generated deal architectures with composite viability scores" },
      { id: "deals-csv", name: "AI Peace Deals (CSV)", url: `${BASE_URL}/deals.csv`, format: "CSV", description: "Flattened deals table including architecture and score dimensions" },
      { id: "deals-pareto-json", name: "Pareto Frontier Deals (JSON)", url: `${BASE_URL}/deals-pareto.json`, format: "JSON", description: "Subset of deals on the Pareto frontier — not dominated on any scoring dimension. Key dataset for optimal deal analysis." },
      { id: "experiments-json", name: "Experiment Log (JSON)", url: `${BASE_URL}/experiments.json`, format: "JSON", description: "Forecasting cycle experiment metadata with full score objects" },
      { id: "experiments-csv", name: "Experiment Log (CSV)", url: `${BASE_URL}/experiments.csv`, format: "CSV", description: "Forecasting cycle experiment metadata, tokens consumed, and accuracy scores" },
      { id: "stakeholders-json", name: "Stakeholder Profiles (JSON)", url: `${BASE_URL}/stakeholders.json`, format: "JSON", description: "All stakeholder profiles including goals, red lines, preferred outcomes, and influence weights" },
      { id: "stakeholders-csv", name: "Stakeholder Profiles (CSV)", url: `${BASE_URL}/stakeholders.csv`, format: "CSV", description: "Flattened stakeholder table for spreadsheet analysis" },
      { id: "evidence-json", name: "Evidence Corpus (JSON)", url: `${BASE_URL}/evidence.json`, format: "JSON", description: "All gathered evidence items with stakeholder relevance, source, date, and influence indicators" },
      { id: "evidence-csv", name: "Evidence Corpus (CSV)", url: `${BASE_URL}/evidence.csv`, format: "CSV", description: "Flattened evidence table with stakeholder count and forecast influence linkage columns" },
      { id: "costs-json", name: "Cost-of-War Records (JSON)", url: `${BASE_URL}/costs.json`, format: "JSON", description: "Economic, humanitarian, and strategic cost estimates by stakeholder and time period" },
      { id: "costs-csv", name: "Cost-of-War Records (CSV)", url: `${BASE_URL}/costs.csv`, format: "CSV", description: "Flattened costs table with top-level cost totals per category" },
    ],
  });
});

export default router;
