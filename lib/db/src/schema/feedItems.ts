import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const feedSeverityEnum = pgEnum("feed_severity", ["critical", "important", "info"]);
export const feedTypeEnum = pgEnum("feed_type", ["task_stuck", "staff", "red_zone", "routine"]);
export const feedStatusEnum = pgEnum("feed_status", ["pending", "dismissed", "resolved"]);

export const feedItemsTable = pgTable("feed_items", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id"),
  type: feedTypeEnum("type").notNull(),
  severity: feedSeverityEnum("severity").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  relatedPerson: text("related_person"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  status: feedStatusEnum("status").notNull().default("pending"),
});

export const insertFeedItemSchema = createInsertSchema(feedItemsTable).omit({ id: true, createdAt: true });
export type InsertFeedItem = z.infer<typeof insertFeedItemSchema>;
export type FeedItem = typeof feedItemsTable.$inferSelect;
