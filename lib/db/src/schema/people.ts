import { pgTable, serial, text, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const personEffectivenessEnum = pgEnum("person_effectiveness", ["green", "yellow", "red"]);

export const peopleTable = pgTable("people", {
  id:            serial("id").primaryKey(),
  name:          text("name").notNull(),
  role:          text("role").notNull(),
  groupLabel:    text("group_label"),
  isInnerCircle: boolean("is_inner_circle").notNull().default(false),
  isAssistant:   boolean("is_assistant").notNull().default(false),
  businessId:    integer("business_id"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  shortName:     text("short_name"),
  email:         text("email"),
  cLevel:        text("c_level"),
  effectiveness: personEffectivenessEnum("effectiveness"),
});

export const insertPersonSchema = createInsertSchema(peopleTable).omit({ id: true, createdAt: true });
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type Person = typeof peopleTable.$inferSelect;
