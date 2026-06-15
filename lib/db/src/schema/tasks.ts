import { pgTable, serial, text, integer, json, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { peopleTable } from "./people";

export const taskPriorityEnum = pgEnum("task_priority", ["high", "medium", "low"]);
export const taskStatusEnum = pgEnum("task_status", ["draft", "sent", "in_progress", "review", "done", "returned"]);
export const taskKindEnum = pgEnum("task_kind", ["task", "approval"]);

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  assigneeId: integer("assignee_id").notNull().references(() => peopleTable.id),
  watchers: json("watchers").$type<number[]>().default([]),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  dueDate: text("due_date"),
  businessId: integer("business_id"),
  status: taskStatusEnum("status").notNull().default("draft"),
  kind: taskKindEnum("kind").notNull().default("task"),
  approverRole: text("approver_role"),
  acceptedAt: timestamp("accepted_at"),
  blockedByApprovalId: integer("blocked_by_approval_id"),
  createdBy: text("created_by").notNull().default("owner"),
  parentId: integer("parent_id"),
  returnComment: text("return_comment"),
  resultNote: text("result_note"),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  feedItemId: integer("feed_item_id"),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, lastActivityAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
