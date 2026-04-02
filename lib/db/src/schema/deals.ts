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
    innovativeProvisions?: Array<{
      title: string;
      description: string;
      rationale: string;
      historicalPrecedent?: string;
    }>;
    stakeholderCommitments?: Record<string, string>;
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
  domesticFramingStrategies: jsonb("domestic_framing_strategies").$type<Record<string, {
    audience: string;
    framingNarrative: string;
    keyTalkingPoints: string[];
    historicalAnalogy?: string;
    riskOfBackfire: string;
  }>>(),
  brainstormInsights: jsonb("brainstorm_insights").$type<{
    historicalAnalogies: Array<{ dealName: string; relevantLesson: string; applicability: string }>;
    creativeProvisions: Array<{ idea: string; rationale: string; noveltyLevel: string }>;
    crossIssueLinkages: Array<{ linkage: string; stakeholdersHelped: string[] }>;
    unconventionalApproaches: string[];
  }>(),
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
    creativeTradeoffs?: Array<{
      gives: string;
      gets: string;
      netBenefit: string;
    }>;
  }>(),
  metaEvaluatorResult: jsonb("meta_evaluator_result").$type<{
    pipelineQuality: number;
    reasoning: string;
    blindspots: string[];
    suggestedNextArchitecture: string;
    confidenceInOutcome: number;
    promptImprovements?: Array<{
      stage: string;
      currentWeakness: string;
      suggestedChange: string;
      expectedImpact: string;
    }>;
  }>(),
  pipelineConfig: jsonb("pipeline_config").$type<Record<string, string>>(),
  diagnosis: text("diagnosis"),
  evidenceSummary: text("evidence_summary"),
  isPareto: boolean("is_pareto").notNull().default(false),
  isCurrent: boolean("is_current").notNull().default(false),
  generatedBy: text("generated_by").notNull().default("ai"),
  tokensConsumed: integer("tokens_consumed").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  narrativeSummary: text("narrative_summary"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pipelineEvolutionTable = pgTable("pipeline_evolution", {
  id: text("id").primaryKey(),
  parentConfigId: text("parent_config_id"),
  generation: integer("generation").notNull().default(0),
  promptOverrides: jsonb("prompt_overrides").notNull().$type<Record<string, string>>(),
  parameterOverrides: jsonb("parameter_overrides").notNull().$type<Record<string, number | string>>(),
  description: text("description").notNull(),
  avgCompositeScore: real("avg_composite_score"),
  dealCount: integer("deal_count").notNull().default(0),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDealSchema = createInsertSchema(dealsTable).omit({ createdAt: true });
export const selectDealSchema = createSelectSchema(dealsTable);
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof dealsTable.$inferSelect;

export const provisionOutcomesTable = pgTable("provision_outcomes", {
  id: text("id").primaryKey(),
  dealId: text("deal_id").notNull(),
  provisionTitle: text("provision_title").notNull(),
  provisionDescription: text("provision_description").notNull(),
  category: text("category").notNull().default("general"),
  compositeScore: real("composite_score"),
  parentCompositeScore: real("parent_composite_score"),
  scoreDelta: real("score_delta"),
  dimensionDeltas: jsonb("dimension_deltas").$type<Record<string, number>>(),
  stakeholderReactions: jsonb("stakeholder_reactions").$type<Record<string, string>>(),
  architecture: text("architecture").notNull().default("balanced"),
  appearedInTopDeal: boolean("appeared_in_top_deal").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPipelineEvolutionSchema = createInsertSchema(pipelineEvolutionTable).omit({ createdAt: true });
export const selectPipelineEvolutionSchema = createSelectSchema(pipelineEvolutionTable);
export type InsertPipelineEvolution = z.infer<typeof insertPipelineEvolutionSchema>;
export type PipelineEvolution = typeof pipelineEvolutionTable.$inferSelect;

export const insertProvisionOutcomeSchema = createInsertSchema(provisionOutcomesTable).omit({ createdAt: true });
export const selectProvisionOutcomeSchema = createSelectSchema(provisionOutcomesTable);
export type InsertProvisionOutcome = z.infer<typeof insertProvisionOutcomeSchema>;
export type ProvisionOutcome = typeof provisionOutcomesTable.$inferSelect;
