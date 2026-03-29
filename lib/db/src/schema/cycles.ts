import { pgTable, text, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cyclesTable = pgTable("cycles", {
  id: text("id").primaryKey(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  status: text("status").notNull().default("running"),
  tokensConsumed: integer("tokens_consumed").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  experimentsRun: integer("experiments_run").notNull().default(0),
  experimentsRetained: integer("experiments_retained").notNull().default(0),
  errorMessage: text("error_message"),
});

export const insertCycleSchema = createInsertSchema(cyclesTable).omit({ startedAt: true });
export const selectCycleSchema = createSelectSchema(cyclesTable);
export type InsertCycle = z.infer<typeof insertCycleSchema>;
export type Cycle = typeof cyclesTable.$inferSelect;
