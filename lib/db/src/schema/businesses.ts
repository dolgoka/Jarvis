import { pgTable, serial, text, real, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const businessStatusEnum = pgEnum("business_status", ["active", "inactive", "pending"]);
export const businessHealthEnum = pgEnum("business_health", ["green", "yellow", "red"]);

export const businessesTable = pgTable("businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  industry: text("industry").notNull(),
  status: businessStatusEnum("status").notNull().default("active"),
  managerId: integer("manager_id").notNull().default(0),
  managerName: text("manager_name").notNull(),
  managerEmail: text("manager_email").notNull(),
  description: text("description"),
  health: businessHealthEnum("health").notNull().default("green"),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBusinessSchema = createInsertSchema(businessesTable).omit({ id: true, createdAt: true });
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businessesTable.$inferSelect;
