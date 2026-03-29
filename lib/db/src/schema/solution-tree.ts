import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const solutionTreeTable = pgTable("solution_tree", {
  id: text("id").primaryKey(),
  dealId: text("deal_id").notNull(),
  parentNodeId: text("parent_node_id"),
  cycleId: text("cycle_id").notNull(),
  branchLabel: text("branch_label").notNull().default("main"),
  architecture: text("architecture").notNull().default("balanced"),
  depth: integer("depth").notNull().default(0),
  isStalled: boolean("is_stalled").notNull().default(false),
  stalledReason: text("stalled_reason"),
  isBestInBranch: boolean("is_best_in_branch").notNull().default(false),
  compositeScore: text("composite_score"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSolutionTreeSchema = createInsertSchema(solutionTreeTable).omit({ createdAt: true });
export const selectSolutionTreeSchema = createSelectSchema(solutionTreeTable);
export type InsertSolutionTree = z.infer<typeof insertSolutionTreeSchema>;
export type SolutionTree = typeof solutionTreeTable.$inferSelect;
