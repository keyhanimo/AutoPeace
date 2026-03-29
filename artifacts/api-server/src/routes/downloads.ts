import { Router } from "express";
import { db } from "@workspace/db";
import {
  forecastsTable, dealsTable, experimentsTable,
  stakeholdersTable, evidenceItemsTable, costOfWarTable, changelogEntriesTable,
} from "@workspace/db/schema";
import { desc } from "drizzle-orm";
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
      return {
        id: d.id,
        architecture: d.architecture,
        isCurrent: d.isCurrent,
        isPareto: d.isPareto,
        composite: s?.composite ?? "",
        feasibility: s?.feasibility ?? "",
        coherence: s?.coherence ?? "",
        domesticSellability: s?.domesticSellability ?? "",
        durability: s?.durability ?? "",
        generatedBy: d.generatedBy,
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

router.get("/openapi.yaml", (_req, res) => {
  try {
    const specPath = path.join(process.cwd(), "lib", "api-spec", "openapi.yaml");
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
      { id: "forecasts-json", name: "Forecasts (JSON)", url: `${BASE_URL}/forecasts.json`, format: "JSON" },
      { id: "forecasts-csv", name: "Forecasts (CSV)", url: `${BASE_URL}/forecasts.csv`, format: "CSV" },
      { id: "deals-json", name: "AI Peace Deals (JSON)", url: `${BASE_URL}/deals.json`, format: "JSON" },
      { id: "deals-csv", name: "AI Peace Deals (CSV)", url: `${BASE_URL}/deals.csv`, format: "CSV" },
      { id: "experiments-csv", name: "Experiment Log (CSV)", url: `${BASE_URL}/experiments.csv`, format: "CSV" },
      { id: "stakeholders-json", name: "Stakeholder Profiles (JSON)", url: `${BASE_URL}/stakeholders.json`, format: "JSON" },
      { id: "evidence-json", name: "Evidence Corpus (JSON)", url: `${BASE_URL}/evidence.json`, format: "JSON" },
      { id: "costs-json", name: "Cost-of-War Records (JSON)", url: `${BASE_URL}/costs.json`, format: "JSON" },
    ],
  });
});

export default router;
