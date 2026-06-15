import { Router, type IRouter } from "express";
import { eq, desc, asc, and } from "drizzle-orm";
import { db, notesTable } from "@workspace/db";

const router: IRouter = Router();
const OWNER_KEY = "owner";

function noteDto(n: typeof notesTable.$inferSelect) {
  return {
    id: n.id,
    body: n.body,
    source: n.source,
    pinned: n.pinned,
    businessId: n.businessId ?? null,
    aiSummary: n.aiSummary ?? null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

// GET /notes — pinned first, then newest first
router.get("/notes", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.ownerKey, OWNER_KEY))
      .orderBy(desc(notesTable.pinned), desc(notesTable.createdAt));
    res.json(rows.map(noteDto));
  } catch (err) {
    console.error("notes GET error:", err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// POST /notes
router.post("/notes", async (req, res): Promise<void> => {
  try {
    const { body, source, businessId } = req.body as {
      body: string;
      source?: "voice" | "text";
      businessId?: number | null;
    };
    if (!body?.trim()) {
      res.status(400).json({ error: "body required" });
      return;
    }
    const [inserted] = await db
      .insert(notesTable)
      .values({
        body: body.trim(),
        source: source ?? "text",
        businessId: businessId ?? null,
        ownerKey: OWNER_KEY,
      })
      .returning();
    res.status(201).json(noteDto(inserted!));
  } catch (err) {
    console.error("notes POST error:", err);
    res.status(500).json({ error: "Failed to create note" });
  }
});

// POST /notes/patch?id
router.post("/notes/patch", async (req, res): Promise<void> => {
  try {
    const id = Number(req.query["id"]);
    if (!id) { res.status(400).json({ error: "id required" }); return; }

    const { body, pinned, aiSummary } = req.body as {
      body?: string;
      pinned?: boolean;
      aiSummary?: string | null;
    };

    const patch: Partial<typeof notesTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body !== undefined)      patch.body = body.trim();
    if (pinned !== undefined)    patch.pinned = pinned;
    if (aiSummary !== undefined) patch.aiSummary = aiSummary;

    const [updated] = await db
      .update(notesTable)
      .set(patch)
      .where(and(eq(notesTable.id, id), eq(notesTable.ownerKey, OWNER_KEY)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(noteDto(updated));
  } catch (err) {
    console.error("notes/patch error:", err);
    res.status(500).json({ error: "Failed to update note" });
  }
});

// POST /notes/delete?id
router.post("/notes/delete", async (req, res): Promise<void> => {
  try {
    const id = Number(req.query["id"]);
    if (!id) { res.status(400).json({ error: "id required" }); return; }
    await db
      .delete(notesTable)
      .where(and(eq(notesTable.id, id), eq(notesTable.ownerKey, OWNER_KEY)));
    res.json({ deleted: 1 });
  } catch (err) {
    console.error("notes/delete error:", err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

export default router;
