import { Router } from "express";
import { db } from "@workspace/db";
import { dealsTable, solutionTreeTable } from "@workspace/db/schema";
import { count, desc, eq, inArray } from "drizzle-orm";
import { dealToMarkdown } from "../services/deal-markdown.js";
import { callLLM, getModelConfig } from "../services/llm-router.js";
import { generateDealNarrative } from "../services/deal-narrative.js";
import { adminAuth } from "../lib/admin-auth.js";

const router = Router();

router.get("/deals", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"]) || 20, 500);
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
    const limit = Math.min(Number(req.query["limit"]) || 50, 500);
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

router.get("/deals/:id/llm.md", async (req, res) => {
  try {
    const [deal] = await db.select()
      .from(dealsTable)
      .where(eq(dealsTable.id, String(req.params["id"])));

    if (!deal) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const baseHost = (process.env["PUBLIC_DOMAIN"] || process.env["REPLIT_DEPLOYMENT_URL"] || process.env["REPLIT_DEV_DOMAIN"] || "autopeace.org").replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const permalinkUrl = `https://${baseHost}/deals/${deal.id}`;

    const markdown = dealToMarkdown(deal, permalinkUrl);
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.send(markdown);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/deals/:id/share-text", async (req, res) => {
  try {
    const platform = req.body?.platform as string;
    if (!platform || !["twitter", "facebook", "linkedin", "reddit"].includes(platform)) {
      res.status(400).json({ error: "Invalid platform. Must be one of: twitter, facebook, linkedin, reddit" });
      return;
    }

    const [deal] = await db.select()
      .from(dealsTable)
      .where(eq(dealsTable.id, String(req.params["id"])));

    if (!deal) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const scores = deal.scores as Record<string, number> | null;
    const composite = scores?.composite ? `${(scores.composite * 100).toFixed(0)}%` : "N/A";
    const terms = deal.terms as Record<string, unknown>;
    const stakeholderEvals = (deal.stakeholderEvaluations ?? {}) as Record<string, { verdict: string }>;
    const accepts = Object.values(stakeholderEvals).filter(e => e.verdict === "accept").length;
    const total = Object.keys(stakeholderEvals).length;

    const baseHost = (process.env["PUBLIC_DOMAIN"] || process.env["REPLIT_DEPLOYMENT_URL"] || process.env["REPLIT_DEV_DOMAIN"] || "autopeace.org").replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const permalinkUrl = `https://${baseHost}/deals/${deal.id}`;

    const platformGuidelines: Record<string, string> = {
      twitter: "Max 280 characters total (the URL will be appended separately, so leave ~25 chars for it). Punchy, use 2-3 hashtags like #PeaceDeal #IranDeal. Do NOT include any URL in the text. Engaging and shareable.",
      facebook: "2-4 sentences. Conversational, thought-provoking. Do NOT include any URL in the text — the URL is attached separately. Encourage discussion.",
      linkedin: "Professional tone. 2-3 paragraphs. Analytical lens — focus on diplomatic/policy implications. Do NOT include any URL in the text — the URL is attached separately.",
      reddit: "Return ONLY a compelling, informative title (one line, no URL). Factual, not clickbait. Do NOT include any URL.",
    };

    const dealSummary = `Architecture: ${deal.architecture}. Composite score: ${composite}. ${accepts}/${total} stakeholders accept. Key terms: nuclear protocol (${terms.nuclearProtocol ? "yes" : "none"}), sanctions relief (${terms.sanctionsRelief ? "yes" : "none"}), maritime security (${terms.hormuzArrangements ? "yes" : "none"}).`;

    const systemPrompt = `You are a communications specialist. Generate social media post text for sharing an AI-generated peace deal proposal for the Iran-US-Israel conflict from AutoPeace.org. Be factual, nuanced, and constructive. Never sensationalize. The tone should convey this is a serious research tool, not a game. IMPORTANT: Never include URLs or links in the generated text — the permalink is attached separately by the sharing system.`;

    const prompt = `Generate a ${platform} post for sharing this AI-generated peace deal:

${dealSummary}

Platform guidelines: ${platformGuidelines[platform]}

Return ONLY the post text, nothing else. Do NOT include any URLs or links.`;

    const config = await getModelConfig();
    const result = await callLLM(prompt, systemPrompt, config.generationProvider, config.generationModel, { maxTokens: 500 });

    res.json({ platform, text: result.content.trim(), permalinkUrl });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

let narrativeGenerationInProgress: string | null = null;

router.get("/deals/current/narrative", async (req, res) => {
  try {
    const [[deal], [{ value: totalDeals }]] = await Promise.all([
      db.select()
        .from(dealsTable)
        .where(eq(dealsTable.isCurrent, true))
        .orderBy(desc(dealsTable.createdAt))
        .limit(1),
      db.select({ value: count() }).from(dealsTable),
    ]);

    if (!deal) {
      res.status(404).json({ error: "No current deal found" });
      return;
    }

    const base = {
      dealId: deal.id,
      architecture: deal.architecture,
      composite: (deal.scores as Record<string, number> | null)?.composite ?? null,
      createdAt: deal.createdAt,
      totalDeals: Number(totalDeals),
    };

    const generate = req.query["generate"] === "true";

    if (!deal.narrativeSummary && generate && narrativeGenerationInProgress !== deal.id) {
      narrativeGenerationInProgress = deal.id;
      try {
        const narrative = await generateDealNarrative(deal.id);
        narrativeGenerationInProgress = null;
        res.json({ ...base, narrative });
        return;
      } catch (err) {
        narrativeGenerationInProgress = null;
        res.json({ ...base, narrative: null, generationError: String(err) });
        return;
      }
    }

    res.json({
      ...base,
      narrative: deal.narrativeSummary ?? null,
      generating: narrativeGenerationInProgress === deal.id,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/deals/:id/generate-narrative", adminAuth, async (req, res) => {
  try {
    const narrative = await generateDealNarrative(String(req.params["id"]));
    res.json({ narrative });
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
