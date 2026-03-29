import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const proposalSubmissionsTable = pgTable("proposal_submissions", {
  id: text("id").primaryKey(),
  submitterName: text("submitter_name").notNull().default("Anonymous"),
  sourceUrl: text("source_url").notNull(),
  sourceName: text("source_name").notNull(),
  summary: text("summary").notNull(),
  terms: jsonb("terms").notNull().$type<{
    nuclearProtocol?: string;
    sanctionsRelief?: string;
    hormuzArrangements?: string;
    humanitarianProvisions?: string;
    verificationMechanism?: string;
    timelineYears?: number;
    sequencing?: string;
    additionalClauses?: string[];
  }>(),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  reviewedAt: timestamp("reviewed_at"),
  approvedProposalId: text("approved_proposal_id"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export const insertProposalSubmissionSchema = createInsertSchema(proposalSubmissionsTable).omit({ submittedAt: true, reviewedAt: true });
export const selectProposalSubmissionSchema = createSelectSchema(proposalSubmissionsTable);
export type InsertProposalSubmission = z.infer<typeof insertProposalSubmissionSchema>;
export type ProposalSubmission = typeof proposalSubmissionsTable.$inferSelect;
