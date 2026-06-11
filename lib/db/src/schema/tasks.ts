import { pgTable, serial, text, integer, json, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { peopleTable } from "./people";

export const taskStatusEnum = pgEnum("task_status", ["waiting", "accepted", "stuck"]);

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  assigneeId: integer("assignee_id").notNull().references(() => peopleTable.id),
  linkedPeopleIds: json("linked_people_ids").$type<number[]>().default([]),
  status: taskStatusEnum("status").notNull().default("waiting"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  stuckDays: integer("stuck_days"),
  feedItemId: integer("feed_item_id"),
  businessId: integer("business_id"),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
