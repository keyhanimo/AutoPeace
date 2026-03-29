import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { proposalsTable, dealsTable, adminConfigTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { adminAuth } from "../lib/admin-auth";
import {
  evaluateStakeholders,
  computeWhatWouldItTake,
  judgeAndScore,
  type DealTerms,
  type ModelConfig,
} from "../services/deal-engine";

async function getModelConfig(): Promise<ModelConfig> {
  try {
    const rows = await db.select().from(adminConfigTable);
    const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]));
    const anthropicModel = cfg["anthropicModel"] ?? "claude-sonnet-4-5";
    const openaiModel = cfg["openaiModel"] ?? "gpt-4o";
    const geminiModel = cfg["geminiModel"] ?? "gemini-2.5-flash";
    const base: ModelConfig = {
      anthropicModel,
      openaiModel,
      geminiModel,
      generationProvider: (cfg["generationProvider"] ?? "anthropic") as "anthropic" | "openai" | "gemini",
      generationModel: cfg["generationModel"] ?? anthropicModel,
      evaluationProvider: (cfg["evaluationProvider"] ?? "openai") as "anthropic" | "openai" | "gemini",
      evaluationModel: cfg["evaluationModel"] ?? openaiModel,
      adversarialProvider: (cfg["adversarialProvider"] ?? "gemini") as "anthropic" | "openai" | "gemini",
      adversarialModel: cfg["adversarialModel"] ?? geminiModel,
    };
    for (let s = 1; s <= 8; s++) {
      const pk = `stage${s}Provider` as keyof ModelConfig;
      const mk = `stage${s}Model` as keyof ModelConfig;
      if (cfg[`stage${s}Provider`]) (base as Record<string, unknown>)[pk] = cfg[`stage${s}Provider`];
      if (cfg[`stage${s}Model`]) (base as Record<string, unknown>)[mk] = cfg[`stage${s}Model`];
    }
    return base;
  } catch {
    return {
      anthropicModel: "claude-sonnet-4-5",
      openaiModel: "gpt-4o",
      geminiModel: "gemini-2.5-flash",
      generationProvider: "anthropic",
      generationModel: "claude-sonnet-4-5",
      evaluationProvider: "openai",
      evaluationModel: "gpt-4o",
      adversarialProvider: "gemini",
      adversarialModel: "gemini-2.5-flash",
    };
  }
}

const router = Router();

router.get("/proposals", async (_req, res) => {
  try {
    const data = await db.select()
      .from(proposalsTable)
      .orderBy(desc(proposalsTable.createdAt));

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/proposals/arena", async (_req, res) => {
  try {
    const [proposals, currentDeals] = await Promise.all([
      db.select().from(proposalsTable).orderBy(desc(proposalsTable.createdAt)),
      db.select().from(dealsTable).where(eq(dealsTable.isCurrent, true)).limit(1),
    ]);

    res.json({
      proposals,
      currentAiDeal: currentDeals[0] ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/proposals/:id", async (req, res) => {
  try {
    const [proposal] = await db.select()
      .from(proposalsTable)
      .where(eq(proposalsTable.id, req.params["id"]!));

    if (!proposal) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(proposal);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/admin/proposals/:id/evaluate", adminAuth, async (req, res) => {
  try {
    const proposalId = String(req.params["id"]);
    const [proposal] = await db.select().from(proposalsTable).where(eq(proposalsTable.id, proposalId));

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    const modelConfig = await getModelConfig();
    const terms = proposal.terms as DealTerms;

    const { evaluations: stakeholderEvaluations } = await evaluateStakeholders(terms, modelConfig);

    const [{ scores }, whatWouldItTakeList] = await Promise.all([
      judgeAndScore(terms, stakeholderEvaluations, [], modelConfig),
      computeWhatWouldItTake(terms, stakeholderEvaluations, modelConfig),
    ]);

    const whatWouldItTakeArray = whatWouldItTakeList.map(item => ({
      dimension: item.stakeholder,
      currentGap: "Stakeholder rejects or conditionally accepts current terms",
      requiredChange: item.requirement,
      feasibility: item.feasibility,
    }));

    const proposalScores = {
      feasibility: scores.feasibility,
      coherence: scores.coherence,
      evidenceGrounding: scores.evidenceGrounding,
      domesticSellability: scores.domesticSellability,
      regionalStability: scores.regionalStability,
      implementability: scores.implementability,
      durability: scores.durability,
      composite: scores.composite,
    };

    const proposalStakeholderEvals: typeof proposalsTable.$inferInsert["stakeholderEvaluations"] = Object.fromEntries(
      Object.entries(stakeholderEvaluations).map(([k, v]) => [k, {
        verdict: v.verdict,
        rationale: v.rationale,
        redLineViolations: v.redLineViolations,
        conditions: v.conditions,
      }])
    );

    await db.update(proposalsTable)
      .set({
        scores: proposalScores,
        stakeholderEvaluations: proposalStakeholderEvals,
        whatWouldItTake: whatWouldItTakeArray,
      })
      .where(eq(proposalsTable.id, proposalId));

    const [updated] = await db.select().from(proposalsTable).where(eq(proposalsTable.id, proposalId));
    res.json({ proposal: updated });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/proposals", adminAuth, async (req, res) => {
  try {
    const { name, source, summary, terms } = req.body as {
      name: string;
      source: string;
      summary: string;
      terms: Record<string, unknown>;
    };

    if (!name || !source || !terms) {
      res.status(400).json({ error: "name, source, and terms are required" });
      return;
    }

    const id = randomUUID();

    await db.insert(proposalsTable).values({
      id,
      name,
      source,
      submittedBy: "admin",
      summary: summary ?? "",
      terms: terms as Record<string, never>,
      scores: null,
      stakeholderEvaluations: null,
      knownResponses: null,
      whatWouldItTake: null,
    });

    const [created] = await db.select().from(proposalsTable).where(eq(proposalsTable.id, id));
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
