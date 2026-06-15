import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const noteSourceEnum = pgEnum("note_source", ["voice", "text"]);

export const notesTable = pgTable("notes", {
  id:         serial("id").primaryKey(),
  body:       text("body").notNull(),
  source:     noteSourceEnum("source").notNull().default("text"),
  pinned:     boolean("pinned").notNull().default(false),
  businessId: integer("business_id"),
  aiSummary:  text("ai_summary"),
  ownerKey:   text("owner_key").notNull().default("owner"),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
  updatedAt:  timestamp("updated_at").notNull().defaultNow(),
});

export const insertNoteSchema = createInsertSchema(notesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notesTable.$inferSelect;
