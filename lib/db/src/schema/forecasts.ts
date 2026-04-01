import { pgTable, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const forecastsTable = pgTable("forecasts", {
  id: text("id").primaryKey(),
  cycleId: text("cycle_id").notNull(),
  experimentId: text("experiment_id"),
  evidencePackVersion: text("evidence_pack_version").notNull().default(""),
  timeHorizon: text("time_horizon").notNull(),
  probabilities: jsonb("probabilities").notNull(),
  rationale: text("rationale").notNull().default(""),
  keyEvidenceItems: jsonb("key_evidence_items").notNull().default([]),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertForecastSchema = createInsertSchema(forecastsTable).omit({ createdAt: true });
export const selectForecastSchema = createSelectSchema(forecastsTable);
export type InsertForecast = z.infer<typeof insertForecastSchema>;
export type Forecast = typeof forecastsTable.$inferSelect;
