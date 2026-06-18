import { Router, type IRouter } from "express";
import { eq, inArray, or, and, lte } from "drizzle-orm";
import { db, feedItemsTable, businessesTable, peopleTable, tasksTable } from "@workspace/db";
import OpenAI from "openai";

const router: IRouter = Router();

function makeClient() {
  const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("No OpenAI API key configured");
  return new OpenAI({ ...(baseURL ? { baseURL } : {}), apiKey });
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, important: 1, info: 2 };

// ── GET /feed/items ───────────────────────────────────────────────────────────
// Returns pending items + snoozed items whose snoozedUntil has passed.

router.get("/feed/items", async (_req, res): Promise<void> => {
  const now = new Date();

  const items = await db.select().from(feedItemsTable).where(
    or(
      eq(feedItemsTable.status, "pending"),
      and(
        eq(feedItemsTable.status, "snoozed"),
        lte(feedItemsTable.snoozedUntil, now),
      ),
    ),
  );

  items.sort((a, b) =>
    (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  );

  const bizIds = [...new Set(items.map(i => i.businessId).filter((id): id is number => id != null))];
  const businesses = bizIds.length
    ? await db.select({ id: businessesTable.id, name: businessesTable.name })
        .from(businessesTable)
        .where(inArray(businessesTable.id, bizIds))
    : [];
  const bizMap = new Map(businesses.map(b => [b.id, b.name]));

  res.json(items.map(item => ({
    id: item.id,
    businessId: item.businessId ?? null,
    businessName: item.businessId != null ? (bizMap.get(item.businessId) ?? null) : null,
    type: item.type,
    severity: item.severity,
    title: item.title,
    body: item.body,
    relatedPerson: item.relatedPerson ?? null,
    recommendation: item.recommendation ?? null,
    defaultAssignee: item.defaultAssignee ?? null,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
  })));
});

// ── PATCH /feed/items/:id/dismiss ─────────────────────────────────────────────

router.patch("/feed/items/:id/dismiss", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"]!, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.update(feedItemsTable).set({ status: "dismissed" }).where(eq(feedItemsTable.id, id));
  res.json({ dismissed: 1 });
});

// ── PATCH /feed/items/:id/start ───────────────────────────────────────────────
// Sets status to in_progress and auto-creates a task from the recommendation.

router.patch("/feed/items/:id/start", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"]!, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [item] = await db.select().from(feedItemsTable).where(eq(feedItemsTable.id, id));
  if (!item) { res.status(404).json({ error: "not found" }); return; }

  const people = await db.select().from(peopleTable).orderBy(peopleTable.id);

  let assigneeId = people[0]?.id ?? 1;
  if (item.defaultAssignee && people.length > 0) {
    const needle = item.defaultAssignee.toLowerCase();
    const match = people.find(p =>
      (p.role ?? "").toLowerCase().includes(needle) ||
      (p.name ?? "").toLowerCase().includes(needle) ||
      needle.includes((p.role ?? "").toLowerCase()),
    );
    if (match) assigneeId = match.id;
  }

  const [task] = await db.insert(tasksTable).values({
    title: item.recommendation ?? item.title,
    body: item.body,
    assigneeId,
    watchers: [],
    feedItemId: id,
    businessId: item.businessId ?? null,
    status: "in_progress",
  }).returning();

  await db.update(feedItemsTable).set({ status: "in_progress" }).where(eq(feedItemsTable.id, id));

  res.json({ started: 1, taskId: task!.id });
});

// ── PATCH /feed/items/:id/delegate ────────────────────────────────────────────
// Marks item as delegated; stores the assignee name.

router.patch("/feed/items/:id/delegate", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"]!, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const { assigneeName } = req.body as { assigneeName?: string };
  if (!assigneeName?.trim()) { res.status(400).json({ error: "assigneeName required" }); return; }

  await db.update(feedItemsTable).set({
    status: "delegated",
    relatedPerson: assigneeName.trim(),
  }).where(eq(feedItemsTable.id, id));

  res.json({ delegated: 1 });
});

// ── PATCH /feed/items/:id/snooze ──────────────────────────────────────────────
// Snoozes item until tomorrow 08:00.

router.patch("/feed/items/:id/snooze", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"]!, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  await db.update(feedItemsTable).set({
    status: "snoozed",
    snoozedUntil: tomorrow,
  }).where(eq(feedItemsTable.id, id));

  res.json({ snoozed: 1, until: tomorrow.toISOString() });
});

// ── POST /feed/draft-task ─────────────────────────────────────────────────────

router.post("/feed/draft-task", async (req, res): Promise<void> => {
  const { text, feedItemId } = req.body as { text?: string; feedItemId?: number };
  if (!text?.trim()) { res.status(400).json({ error: "text is required" }); return; }

  let businessName: string | null = null;
  let businessId: number | null = null;

  if (feedItemId) {
    const [item] = await db.select().from(feedItemsTable)
      .where(eq(feedItemsTable.id, feedItemId));
    if (item?.businessId != null) {
      businessId = item.businessId;
      const [biz] = await db.select({ name: businessesTable.name })
        .from(businessesTable).where(eq(businessesTable.id, item.businessId));
      businessName = biz?.name ?? null;
    }
  }

  const people = await db.select().from(peopleTable).orderBy(peopleTable.id);
  const directory = people
    .map(p => `id=${p.id}: ${p.name}${p.shortName ? ` (${p.shortName})` : ""} — ${p.role}`)
    .join("\n");

  const systemPrompt = `Ты — ассистент постановки задач. Список людей в ближнем круге:
${directory}
${businessName ? `\nКонтекст карточки: компания «${businessName}».` : ""}

По тексту сообщения верни JSON строго такого вида:
{
  "title": "краткое название задачи (до 8 слов)",
  "description": "подробное описание",
  "assigneeId": <id исполнителя из справочника, 1 если непонятно>,
  "linkedPeopleIds": [<id доп. участников если упомянуты, иначе []>]
}

Правила:
- Имена сопоставляй гибко: "Ане"/"Аня" → Анна Петрова, "Саше"/"Смирнов" → Александр Смирнов, etc.
- linkedPeopleIds — только упомянутые доп. участники, не исполнитель
- Верни только валидный JSON без markdown-обёртки`;

  try {
    const completion = await makeClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      title?: string;
      description?: string;
      assigneeId?: number;
      linkedPeopleIds?: number[];
    };

    const assigneeId = parsed.assigneeId ?? people[0]?.id ?? 1;
    const linkedIds: number[] = (parsed.linkedPeopleIds ?? []).filter(
      (id): id is number => typeof id === "number" && id !== assigneeId,
    );

    const assignee = people.find(p => p.id === assigneeId) ?? people[0]!;
    const linked = linkedIds
      .map(id => people.find(p => p.id === id))
      .filter(Boolean)
      .map(p => ({ id: p!.id, name: p!.name, role: p!.role, email: p!.email ?? null }));

    res.json({
      title: parsed.title ?? "Новая задача",
      description: parsed.description ?? text,
      assigneeId: assignee.id,
      assigneeName: assignee.shortName ?? assignee.name,
      assigneeRole: assignee.role,
      linkedPeopleIds: linkedIds,
      linkedPeople: linked,
      businessId,
      businessName,
    });
  } catch (err) {
    console.error("feed draft-task AI error", err);
    res.status(500).json({ error: "AI error" });
  }
});

// ── POST /feed/confirm-task ───────────────────────────────────────────────────

router.post("/feed/confirm-task", async (req, res): Promise<void> => {
  const { title, description, assigneeId, linkedPeopleIds, feedItemId, businessId } = req.body as {
    title?: string;
    description?: string;
    assigneeId?: number;
    linkedPeopleIds?: number[];
    feedItemId?: number;
    businessId?: number;
  };
  const body = (description ?? "").trim();
  const watchers = linkedPeopleIds ?? [];

  if (!title?.trim() || !assigneeId) {
    res.status(400).json({ error: "title and assigneeId are required" });
    return;
  }

  const allPeople = await db.select().from(peopleTable);
  const assignee = allPeople.find(p => p.id === assigneeId);
  if (!assignee) { res.status(400).json({ error: "assignee not found" }); return; }

  const [task] = await db.insert(tasksTable).values({
    title: title.trim(),
    body,
    assigneeId,
    watchers,
    feedItemId: feedItemId ?? null,
    businessId: businessId ?? null,
  }).returning();

  if (feedItemId) {
    await db.update(feedItemsTable)
      .set({ status: "resolved" })
      .where(eq(feedItemsTable.id, feedItemId));
  }

  const ids = (task!.watchers ?? []) as number[];
  const linked = ids
    .map(id => allPeople.find(p => p.id === id))
    .filter(Boolean)
    .map(p => ({ id: p!.id, name: p!.name, role: p!.role, email: p!.email ?? null }));

  res.status(201).json({
    id: task!.id,
    title: task!.title,
    body: task!.body,
    assigneeId: task!.assigneeId,
    assigneeName: assignee.name,
    assigneeRole: assignee.role,
    watchers: ids,
    linkedPeople: linked,
    status: task!.status,
    createdAt: task!.createdAt.toISOString(),
    feedItemId: task!.feedItemId ?? null,
    businessId: task!.businessId ?? null,
  });
});

export default router;
