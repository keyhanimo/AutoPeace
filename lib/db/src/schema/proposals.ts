import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const proposalsTable = pgTable("proposals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  submittedBy: text("submitted_by").notNull().default("human"),
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
  scores: jsonb("scores").$type<{
    feasibility?: number;
    coherence?: number;
    evidenceGrounding?: number;
    domesticSellability?: number;
    regionalStability?: number;
    implementability?: number;
    durability?: number;
    composite?: number;
    scoreRationale?: Record<string, string>;
    evaluationError?: string;
    judgePanel?: Array<{
      provider: string;
      model: string;
      scores: Record<string, number>;
      rationale: Record<string, string>;
    }>;
    judgePrompt?: string;
  }>(),
  stakeholderEvaluations: jsonb("stakeholder_evaluations").$type<Record<string, {
    verdict: "accept" | "conditional" | "reject";
    rationale: string;
    redLineViolations?: string[];
    conditions?: string[];
  }>>(),
  knownResponses: jsonb("known_responses").$type<Record<string, string>>(),
  whatWouldItTake: jsonb("what_would_it_take").$type<Array<{
    dimension: string;
    currentGap: string;
    requiredChange: string;
    feasibility: "low" | "medium" | "high";
  }>>(),
  summary: text("summary").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProposalSchema = createInsertSchema(proposalsTable).omit({ createdAt: true, updatedAt: true });
export const selectProposalSchema = createSelectSchema(proposalsTable);
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposalsTable.$inferSelect;
