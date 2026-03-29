import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const changelogEntriesTable = pgTable("changelog_entries", {
  id: text("id").primaryKey(),
  cycleId: text("cycle_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  headline: text("headline").notNull(),
  forecastDelta: jsonb("forecast_delta"),
  scoreDelta: jsonb("score_delta"),
  keyEvidence: jsonb("key_evidence"),
  experimentsTried: integer("experiments_tried").notNull().default(0),
  experimentsRetained: integer("experiments_retained").notNull().default(0),
  notes: text("notes"),
});

export const insertChangelogEntrySchema = createInsertSchema(changelogEntriesTable).omit({ timestamp: true });
export const selectChangelogEntrySchema = createSelectSchema(changelogEntriesTable);
export type InsertChangelogEntry = z.infer<typeof insertChangelogEntrySchema>;
export type ChangelogEntry = typeof changelogEntriesTable.$inferSelect;
