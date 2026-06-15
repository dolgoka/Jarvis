import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";

export const roadmapStatusEnum = pgEnum("roadmap_status", ["done", "current", "planned"]);

export const roadmapTable = pgTable("roadmap", {
  id:         serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  title:      text("title").notNull(),
  date:       text("date").notNull(),
  status:     roadmapStatusEnum("status").notNull(),
  note:       text("note"),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

export const insertRoadmapSchema = createInsertSchema(roadmapTable).omit({ id: true, createdAt: true });
export type InsertRoadmap = z.infer<typeof insertRoadmapSchema>;
export type RoadmapItem = typeof roadmapTable.$inferSelect;
