import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const communityForecastsTable = pgTable("community_forecasts", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  timeHorizon: text("time_horizon").notNull(),
  estimates: jsonb("estimates").notNull().$type<Record<string, number>>(),
  ipAddress: text("ip_address"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export const insertCommunityForecastSchema = createInsertSchema(communityForecastsTable).omit({ submittedAt: true });
export const selectCommunityForecastSchema = createSelectSchema(communityForecastsTable);
export type InsertCommunityForecast = z.infer<typeof insertCommunityForecastSchema>;
export type CommunityForecast = typeof communityForecastsTable.$inferSelect;
