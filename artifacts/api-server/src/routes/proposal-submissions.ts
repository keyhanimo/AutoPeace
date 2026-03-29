import { Router } from "express";
import { db } from "@workspace/db";
import { proposalSubmissionsTable, proposalsTable, adminConfigTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { adminAuth } from "../lib/admin-auth";
import {
  evaluateStakeholders,
  judgeAndScore,
  computeWhatWouldItTake,
  type ModelConfig,
  type DealTerms,
} from "../services/deal-engine";

async function getDefaultModelConfig(): Promise<ModelConfig> {
  const cfg = await db.select().from(adminConfigTable);
  const map = Object.fromEntries(cfg.map(r => [r.key, r.value]));
  const openaiModel = map["openaiModel"] ?? "gpt-4o";
  return {
    anthropicModel: map["anthropicModel"] ?? "claude-opus-4-5",
    openaiModel,
    geminiModel: map["geminiModel"] ?? "gemini-2.5-pro",
    generationProvider: (map["generationProvider"] ?? "anthropic") as "anthropic" | "openai" | "gemini",
    generationModel: map["generationModel"] ?? "claude-opus-4-5",
    evaluationProvider: (map["evaluationProvider"] ?? "openai") as "anthropic" | "openai" | "gemini",
    evaluationModel: map["evaluationModel"] ?? openaiModel,
    adversarialProvider: (map["adversarialProvider"] ?? "anthropic") as "anthropic" | "openai" | "gemini",
    adversarialModel: map["adversarialModel"] ?? "claude-opus-4-5",
    judgePanelAnthropicModel: map["judgePanelAnthropicModel"] || undefined,
    judgePanelOpenaiModel: map["judgePanelOpenaiModel"] || undefined,
    judgePanelGeminiModel: map["judgePanelGeminiModel"] || undefined,
  };
}

const router = Router();

router.post("/proposals/submit", async (req, res) => {
  try {
    const {
      submitterName,
      sourceUrl,
      sourceName,
      summary,
      terms,
    } = req.body as {
      submitterName?: string;
      sourceUrl: string;
      sourceName: string;
      summary: string;
      terms: Record<string, unknown>;
    };

    if (!sourceUrl || !sourceName || !summary || !terms) {
      res.status(400).json({ error: "sourceUrl, sourceName, summary, and terms are required" });
      return;
    }

    const id = randomUUID();
    await db.insert(proposalSubmissionsTable).values({
      id,
      submitterName: submitterName || "Anonymous",
      sourceUrl,
      sourceName,
      summary,
      terms,
      status: "pending",
    });

    res.json({
      id,
      message: "Proposal submitted for review. If approved, it will appear in the Proposal Arena.",
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/admin/proposals/queue", adminAuth, async (req, res) => {
  try {
    const status = String(req.query["status"] || "pending");
    const limit = Math.min(Number(req.query["limit"]) || 20, 100);

    const submissions = await db.select()
      .from(proposalSubmissionsTable)
      .where(eq(proposalSubmissionsTable.status, status))
      .orderBy(desc(proposalSubmissionsTable.submittedAt))
      .limit(limit);

    res.json({ data: submissions, total: submissions.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/admin/proposals/queue/:id/terms", adminAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { summary, terms } = req.body as {
      summary?: string;
      terms?: Record<string, unknown>;
    };

    const [submission] = await db.select()
      .from(proposalSubmissionsTable)
      .where(eq(proposalSubmissionsTable.id, id));

    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    if (submission.status !== "pending") {
      res.status(409).json({ error: `Cannot edit a ${submission.status} submission` });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (summary !== undefined) updates["summary"] = summary;
    if (terms !== undefined) updates["terms"] = terms;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Provide summary and/or terms to update" });
      return;
    }

    await db.update(proposalSubmissionsTable)
      .set(updates)
      .where(eq(proposalSubmissionsTable.id, id));

    res.json({ message: "Submission terms updated", id });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/admin/proposals/queue/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { action, adminNotes } = req.body as {
      action: "approve" | "reject";
      adminNotes?: string;
    };

    if (!["approve", "reject"].includes(action)) {
      res.status(400).json({ error: "action must be 'approve' or 'reject'" });
      return;
    }

    const [submission] = await db.select()
      .from(proposalSubmissionsTable)
      .where(eq(proposalSubmissionsTable.id, id));

    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    if (submission.status !== "pending") {
      res.status(409).json({ error: `Submission already ${submission.status}` });
      return;
    }

    let approvedProposalId: string | undefined;

    if (action === "approve") {
      approvedProposalId = randomUUID();
      await db.insert(proposalsTable).values({
        id: approvedProposalId,
        name: submission.sourceName,
        source: "community",
        submittedBy: submission.submitterName,
        terms: submission.terms as Record<string, unknown>,
        summary: submission.summary,
      });

      const pid = approvedProposalId;
      const terms = submission.terms as unknown as DealTerms;

      (async () => {
        try {
          const modelConfig = await getDefaultModelConfig();
          const { evaluations: stakeholderEvaluations } = await evaluateStakeholders(terms, modelConfig);

          const [{ scores }, whatWouldItTakeList] = await Promise.all([
            judgeAndScore(terms, stakeholderEvaluations, [], {}, modelConfig),
            computeWhatWouldItTake(terms, stakeholderEvaluations, modelConfig),
          ]);

          const proposalScores = {
            feasibility: scores.feasibility,
            coherence: scores.coherence,
            evidenceGrounding: scores.evidenceGrounding,
            domesticSellability: scores.domesticSellability,
            regionalStability: scores.regionalStability,
            implementability: scores.implementability,
            durability: scores.durability,
            composite: scores.composite,
            scoreRationale: scores.scoreRationale,
            judgePanel: scores.judgePanel,
            judgePrompt: scores.judgePrompt,
          };

          const stakeholderEvals = Object.fromEntries(
            Object.entries(stakeholderEvaluations).map(([k, v]) => [k, {
              verdict: v.verdict,
              rationale: v.rationale,
              redLineViolations: v.redLineViolations,
              conditions: v.conditions,
            }])
          );

          const whatWouldItTakeArray = whatWouldItTakeList.map(item => ({
            dimension: item.stakeholder,
            currentGap: "Stakeholder rejects or conditionally accepts current terms",
            requiredChange: item.requirement,
            feasibility: item.feasibility,
          }));

          await db.update(proposalsTable)
            .set({
              scores: proposalScores,
              stakeholderEvaluations: stakeholderEvals,
              whatWouldItTake: whatWouldItTakeArray,
            })
            .where(eq(proposalsTable.id, pid));

          console.info(`[proposal-eval] Evaluation complete for proposal ${pid} (submission ${id})`);
        } catch (evalErr: unknown) {
          const errMsg = evalErr instanceof Error ? evalErr.message : String(evalErr);
          console.error(`[proposal-eval] Evaluation FAILED for proposal ${pid} (submission ${id}): ${errMsg}`);
          try {
            await db.update(proposalsTable)
              .set({ scores: { evaluationError: errMsg } as unknown as Record<string, number> })
              .where(eq(proposalsTable.id, pid));
          } catch {
          }
        }
      })();
    }

    await db.update(proposalSubmissionsTable)
      .set({
        status: action === "approve" ? "approved" : "rejected",
        adminNotes: adminNotes,
        reviewedAt: new Date(),
        approvedProposalId: approvedProposalId ?? null,
      })
      .where(eq(proposalSubmissionsTable.id, id));

    res.json({
      message: action === "approve"
        ? `Approved — added to Proposal Arena as proposal ${approvedProposalId}. Stakeholder evaluation queued.`
        : "Rejected",
      approvedProposalId: approvedProposalId ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
