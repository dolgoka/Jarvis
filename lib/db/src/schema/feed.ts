import {
  pgTable, serial, text, integer, timestamp, boolean, pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";

export const newsSeverityEnum = pgEnum("news_severity", ["critical", "attention", "info"]);
export const newsTypeEnum     = pgEnum("news_type",     ["urgent", "hr", "corporate", "task", "external"]);
export const newsStatusEnum   = pgEnum("news_status",   ["new", "snoozed", "done"]);

export const newsItemsTable = pgTable("news_items", {
  id:           serial("id").primaryKey(),
  severity:     newsSeverityEnum("severity").notNull(),
  type:         newsTypeEnum("type").notNull(),
  title:        text("title").notNull(),
  body:         text("body").notNull(),
  businessId:   integer("business_id").references(() => businessesTable.id, { onDelete: "set null" }),
  sourceLabel:  text("source_label").notNull(),
  isUrgentFlag: boolean("is_urgent_flag").notNull().default(false),
  actionable:   boolean("actionable").notNull().default(false),
  status:       newsStatusEnum("status").notNull().default("new"),
  snoozedUntil: timestamp("snoozed_until"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export const insertNewsItemSchema = createInsertSchema(newsItemsTable).omit({ id: true, createdAt: true });
export type InsertNewsItem = z.infer<typeof insertNewsItemSchema>;
export type NewsItem       = typeof newsItemsTable.$inferSelect;
