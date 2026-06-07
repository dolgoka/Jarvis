import { Router, type IRouter } from "express";
import { eq, isNull } from "drizzle-orm";
import { db, eventsTable, businessesTable } from "@workspace/db";

const router: IRouter = Router();

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

router.get("/events", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: eventsTable.id,
      businessId: eventsTable.businessId,
      businessName: businessesTable.name,
      text: eventsTable.text,
      severity: eventsTable.severity,
      occurredAt: eventsTable.occurredAt,
      dismissedAt: eventsTable.dismissedAt,
    })
    .from(eventsTable)
    .leftJoin(businessesTable, eq(eventsTable.businessId, businessesTable.id))
    .where(isNull(eventsTable.dismissedAt));

  rows.sort((a, b) => {
    const sd = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
    if (sd !== 0) return sd;
    return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
  });

  res.json(
    rows.map((r) => ({
      id: r.id,
      businessId: r.businessId ?? null,
      businessName: r.businessName ?? null,
      text: r.text,
      severity: r.severity,
      occurredAt: r.occurredAt.toISOString(),
      dismissedAt: r.dismissedAt ? r.dismissedAt.toISOString() : null,
    }))
  );
});

router.patch("/events/:id/dismiss", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [updated] = await db
    .update(eventsTable)
    .set({ dismissedAt: new Date() })
    .where(eq(eventsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  let businessName: string | null = null;
  if (updated.businessId) {
    const biz = await db.select({ name: businessesTable.name }).from(businessesTable).where(eq(businessesTable.id, updated.businessId)).limit(1);
    businessName = biz[0]?.name ?? null;
  }

  res.json({
    id: updated.id,
    businessId: updated.businessId ?? null,
    businessName,
    text: updated.text,
    severity: updated.severity,
    occurredAt: updated.occurredAt.toISOString(),
    dismissedAt: updated.dismissedAt ? updated.dismissedAt.toISOString() : null,
  });
});

router.post("/events/dismiss-all", async (_req, res): Promise<void> => {
  const updated = await db
    .update(eventsTable)
    .set({ dismissedAt: new Date() })
    .where(isNull(eventsTable.dismissedAt))
    .returning();

  res.json({ dismissed: updated.length });
});

export default router;
