import { Router, type IRouter } from "express";
import { eq, or, lte, and, inArray, isNull } from "drizzle-orm";
import { db, newsItemsTable, businessesTable } from "@workspace/db";

const router: IRouter = Router();

const SEV_ORDER: Record<string, number> = { critical: 0, attention: 1, info: 2 };

function isActive(item: typeof newsItemsTable.$inferSelect): boolean {
  if (item.status === "new") return true;
  if (item.status === "snoozed" && item.snoozedUntil && item.snoozedUntil <= new Date()) return true;
  return false;
}

router.get("/feed", async (req, res): Promise<void> => {
  const severityFilter = req.query["severity"] as string | undefined;
  const includeExternal = req.query["includeExternal"] === "true";
  const role = req.query["role"] as string | undefined;

  const rows = await db.select().from(newsItemsTable)
    .where(or(
      eq(newsItemsTable.status, "new"),
      and(
        eq(newsItemsTable.status, "snoozed"),
        lte(newsItemsTable.snoozedUntil, new Date()),
      ),
    ));

  let items = rows.filter(isActive);

  if (!includeExternal) {
    items = items.filter(i => i.type !== "external");
  }
  if (severityFilter) {
    items = items.filter(i => i.severity === severityFilter);
  }

  // Role-based inbox filter:
  // owner sees: items with no recipientRole (general news) + items addressed to 'owner'
  // director/employee: only items addressed to their role (C2)
  // no role param: all items (backward compat)
  if (role === "owner") {
    items = items.filter(i => i.recipientRole == null || i.recipientRole === "owner");
  } else if (role === "director" || role === "employee") {
    items = items.filter(i => i.recipientRole === role);
  }

  items.sort((a, b) => {
    if (Number(b.isUrgentFlag) !== Number(a.isUrgentFlag)) return Number(b.isUrgentFlag) - Number(a.isUrgentFlag);
    const sd = (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9);
    if (sd !== 0) return sd;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const bizIds = [...new Set(items.map(i => i.businessId).filter((id): id is number => id != null))];
  const businesses = bizIds.length
    ? await db.select({ id: businessesTable.id, name: businessesTable.name })
        .from(businessesTable)
        .where(inArray(businessesTable.id, bizIds))
    : [];
  const bizMap = new Map(businesses.map(b => [b.id, b.name]));

  res.json(items.map(item => ({
    id:            item.id,
    severity:      item.severity,
    type:          item.type,
    title:         item.title,
    body:          item.body,
    businessId:    item.businessId ?? null,
    businessName:  item.businessId != null ? (bizMap.get(item.businessId) ?? null) : null,
    sourceLabel:   item.sourceLabel,
    isUrgentFlag:  item.isUrgentFlag,
    actionable:    item.actionable,
    status:        item.status,
    snoozedUntil:  item.snoozedUntil?.toISOString() ?? null,
    createdAt:     item.createdAt.toISOString(),
    taskId:        item.taskId ?? null,
    recipientRole: item.recipientRole ?? null,
  })));
});

router.post("/feed/seen", async (req, res): Promise<void> => {
  const id = parseInt(req.query["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.update(newsItemsTable).set({ status: "done" }).where(eq(newsItemsTable.id, id));
  res.json({ dismissed: 1 });
});

router.post("/feed/snooze", async (req, res): Promise<void> => {
  const id    = parseInt(req.query["id"] as string, 10);
  const hours = parseInt(req.query["hours"] as string ?? "8", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const snoozedUntil = new Date(Date.now() + (isNaN(hours) ? 8 : hours) * 3_600_000);
  await db.update(newsItemsTable).set({ status: "snoozed", snoozedUntil }).where(eq(newsItemsTable.id, id));
  res.json({ dismissed: 1 });
});

export default router;
