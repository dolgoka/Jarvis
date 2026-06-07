import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";

export const eventSeverityEnum = pgEnum("event_severity", ["critical", "warning", "info"]);

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessesTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  severity: eventSeverityEnum("severity").notNull().default("info"),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  dismissedAt: timestamp("dismissed_at"),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
