import { pgTable, text, timestamp, boolean, real, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const experimentsTable = pgTable("experiments", {
  id: text("id").primaryKey(),
  cycleId: text("cycle_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  task: text("task").notNull().default("A"),
  changeDescription: text("change_description").notNull(),
  changeDiff: text("change_diff").notNull().default(""),
  scoresBefore: jsonb("scores_before"),
  scoresAfter: jsonb("scores_after"),
  diagnosis: text("diagnosis"),
  retained: boolean("retained").notNull().default(false),
  tokensConsumed: integer("tokens_consumed").notNull().default(0),
  wallClockSeconds: integer("wall_clock_seconds"),
  costUsd: real("cost_usd").notNull().default(0),
  providerCosts: jsonb("provider_costs").$type<{ gemini?: number; openai?: number; anthropic?: number }>(),
});

export const insertExperimentSchema = createInsertSchema(experimentsTable).omit({ timestamp: true });
export const selectExperimentSchema = createSelectSchema(experimentsTable);
export type InsertExperiment = z.infer<typeof insertExperimentSchema>;
export type Experiment = typeof experimentsTable.$inferSelect;
