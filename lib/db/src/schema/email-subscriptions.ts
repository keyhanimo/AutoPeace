import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailSubscriptionsTable = pgTable("email_subscriptions", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
  confirmed: boolean("confirmed").notNull().default(false),
  unsubscribedAt: timestamp("unsubscribed_at"),
  source: text("source").notNull().default("web"),
});

export const insertEmailSubscriptionSchema = createInsertSchema(emailSubscriptionsTable).omit({ subscribedAt: true });
export const selectEmailSubscriptionSchema = createSelectSchema(emailSubscriptionsTable);
export type InsertEmailSubscription = z.infer<typeof insertEmailSubscriptionSchema>;
export type EmailSubscription = typeof emailSubscriptionsTable.$inferSelect;
