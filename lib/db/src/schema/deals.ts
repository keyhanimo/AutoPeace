import { pgTable, text, timestamp, boolean, real, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dealsTable = pgTable("deals", {
  id: text("id").primaryKey(),
  cycleId: text("cycle_id").notNull(),
  parentId: text("parent_id"),
  architecture: text("architecture").notNull().default("balanced"),
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
  }>(),
  stakeholderEvaluations: jsonb("stakeholder_evaluations").$type<Record<string, {
    verdict: "accept" | "conditional" | "reject";
    rationale: string;
    redLineViolations?: string[];
    conditions?: string[];
  }>>(),
  domesticEvaluations: jsonb("domestic_evaluations").$type<Record<string, {
    audience: string;
    verdict: "sellable" | "difficult" | "unsellable";
    rationale: string;
  }>>(),
  redTeamResults: jsonb("red_team_results").$type<Array<{
    attack: string;
    severity: "low" | "medium" | "high" | "critical";
    response: string;
    survived: boolean;
  }>>(),
  negotiatorResult: jsonb("negotiator_result").$type<{
    proposedAmendments: Array<{
      stakeholder: string;
      originalConcern: string;
      proposedChange: string;
      likelihood: "low" | "medium" | "high";
    }>;
    revisedTermsPartial: Record<string, unknown>;
    negotiationStrategy: string;
  }>(),
  metaEvaluatorResult: jsonb("meta_evaluator_result").$type<{
    pipelineQuality: number;
    reasoning: string;
    blindspots: string[];
    suggestedNextArchitecture: string;
    confidenceInOutcome: number;
  }>(),
  diagnosis: text("diagnosis"),
  isPareto: boolean("is_pareto").notNull().default(false),
  isCurrent: boolean("is_current").notNull().default(false),
  generatedBy: text("generated_by").notNull().default("ai"),
  tokensConsumed: integer("tokens_consumed").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDealSchema = createInsertSchema(dealsTable).omit({ createdAt: true });
export const selectDealSchema = createSelectSchema(dealsTable);
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof dealsTable.$inferSelect;
