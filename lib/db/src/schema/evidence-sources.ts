import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const evidenceSourcesTable = pgTable("evidence_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  url: text("url").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  lastFetchedAt: timestamp("last_fetched_at"),
  fetchFrequencyMinutes: integer("fetch_frequency_minutes").notNull().default(60),
});

export const insertEvidenceSourceSchema = createInsertSchema(evidenceSourcesTable);
export const selectEvidenceSourceSchema = createSelectSchema(evidenceSourcesTable);
export type InsertEvidenceSource = z.infer<typeof insertEvidenceSourceSchema>;
export type EvidenceSource = typeof evidenceSourcesTable.$inferSelect;
