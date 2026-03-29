import { pgTable, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const evidenceItemsTable = pgTable("evidence_items", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  sourceUrl: text("source_url").notNull().default(""),
  publishedAt: timestamp("published_at").notNull(),
  title: text("title").notNull(),
  text: text("text").notNull().default(""),
  evidenceType: text("evidence_type").notNull().default("general"),
  stakeholderRelevance: jsonb("stakeholder_relevance").notNull().default([]),
  isProcessed: boolean("is_processed").notNull().default(false),
  ingestedAt: timestamp("ingested_at").notNull().defaultNow(),
});

export const insertEvidenceItemSchema = createInsertSchema(evidenceItemsTable).omit({ ingestedAt: true });
export const selectEvidenceItemSchema = createSelectSchema(evidenceItemsTable);
export type InsertEvidenceItem = z.infer<typeof insertEvidenceItemSchema>;
export type EvidenceItem = typeof evidenceItemsTable.$inferSelect;
