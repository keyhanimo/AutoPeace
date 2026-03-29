import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const whatIfScenariosTable = pgTable("what_if_scenarios", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  triggerCondition: text("trigger_condition").notNull(),
  basedOnCycleId: text("based_on_cycle_id"),
  probabilityDeltas: jsonb("probability_deltas").notNull().$type<Record<string, number>>(),
  absoluteProbabilities: jsonb("absolute_probabilities").notNull().$type<Record<string, number>>(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const selectWhatIfScenarioSchema = createSelectSchema(whatIfScenariosTable);
export type WhatIfScenario = typeof whatIfScenariosTable.$inferSelect;
export type WhatIfScenarioRecord = z.infer<typeof selectWhatIfScenarioSchema>;
