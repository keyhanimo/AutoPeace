import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stakeholdersTable = pgTable("stakeholders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  region: text("region").notNull(),
  flag: text("flag").notNull().default(""),
  goals: text("goals").notNull().default(""),
  redLines: text("red_lines").notNull().default(""),
  preferredOutcomes: text("preferred_outcomes").notNull().default(""),
  constraints: text("constraints").notNull().default(""),
  communicationStyle: text("communication_style").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStakeholderSchema = createInsertSchema(stakeholdersTable).omit({ createdAt: true, updatedAt: true });
export const selectStakeholderSchema = createSelectSchema(stakeholdersTable);
export type InsertStakeholder = z.infer<typeof insertStakeholderSchema>;
export type Stakeholder = typeof stakeholdersTable.$inferSelect;
