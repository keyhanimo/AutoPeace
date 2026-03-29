import { Router } from "express";
import { db } from "@workspace/db";
import { proposalSubmissionsTable, proposalsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { adminAuth } from "../lib/admin-auth";

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
        ? `Approved — added to Proposal Arena as proposal ${approvedProposalId}`
        : "Rejected",
      approvedProposalId: approvedProposalId ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
