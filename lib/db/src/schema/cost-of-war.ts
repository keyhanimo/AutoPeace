import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const costOfWarTable = pgTable("cost_of_war", {
  id: text("id").primaryKey(),
  stakeholderId: text("stakeholder_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  economic: jsonb("economic").notNull().default({}),
  humanitarian: jsonb("humanitarian").notNull().default({}),
  strategic: jsonb("strategic").notNull().default({}),
  dataVersion: text("data_version").notNull().default("1.0"),
});

export const insertCostOfWarSchema = createInsertSchema(costOfWarTable).omit({ timestamp: true });
export const selectCostOfWarSchema = createSelectSchema(costOfWarTable);
export type InsertCostOfWar = z.infer<typeof insertCostOfWarSchema>;
export type CostOfWar = typeof costOfWarTable.$inferSelect;
