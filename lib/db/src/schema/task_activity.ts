import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tasksTable } from "./tasks";

export const taskActivityTypeEnum = pgEnum("task_activity_type", [
  "created",
  "accepted",
  "decomposed",
  "submitted",
  "accepted_final",
  "returned",
  "commented",
  "escalated",
  "pinged",
  "owner_reminded",
  "reassigned",
]);

export const taskActivityTable = pgTable("task_activity", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  type: taskActivityTypeEnum("type").notNull(),
  actorRole: text("actor_role").notNull().default("owner"),
  text: text("text"),
  at: timestamp("at").notNull().defaultNow(),
});

export type TaskActivity = typeof taskActivityTable.$inferSelect;
export type InsertTaskActivity = typeof taskActivityTable.$inferInsert;
