import { pgTable, serial, integer, real, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";

export const metricStageScopeEnum = pgEnum("metric_stage_scope", ["investment", "operational"]);
export const metricPeriodEnum      = pgEnum("metric_period",      ["day", "week", "month"]);

export const metricsTable = pgTable("metrics", {
  id:               serial("id").primaryKey(),
  businessId:       integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  stageScope:       metricStageScopeEnum("stage_scope").notNull(),
  key:              text("key").notNull(),
  label:            text("label").notNull(),
  unit:             text("unit").notNull(),
  plan:             real("plan").notNull(),
  fact:             real("fact").notNull(),
  period:           metricPeriodEnum("period").notNull().default("month"),
  ownerRole:        text("owner_role").notNull(),
  thresholdYellow:  real("threshold_yellow").notNull().default(10),
  thresholdRed:     real("threshold_red").notNull().default(20),
  date:             text("date").notNull(),
  note:             text("note"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

export const insertMetricSchema = createInsertSchema(metricsTable).omit({ id: true, createdAt: true });
export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type Metric = typeof metricsTable.$inferSelect;
