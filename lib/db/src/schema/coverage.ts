import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";

export const coverageTable = pgTable("coverage", {
  id:         serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  area:       text("area").notNull(),
  closed:     boolean("closed").notNull().default(false),
  ownerRole:  text("owner_role").notNull(),
  note:       text("note"),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

export const insertCoverageSchema = createInsertSchema(coverageTable).omit({ id: true, createdAt: true });
export type InsertCoverage = z.infer<typeof insertCoverageSchema>;
export type Coverage = typeof coverageTable.$inferSelect;
