import { Router, type IRouter } from "express";
import { eq, inArray, and } from "drizzle-orm";
import { db, peopleTable, tasksTable, taskActivityTable, newsItemsTable } from "@workspace/db";
import OpenAI from "openai";
import { resolveStuckEvents } from "../lib/taskMonitor";

const router: IRouter = Router();

function makeClient() {
  const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("No OpenAI API key configured (set OPENAI_API_KEY)");
  return new OpenAI({ ...(baseURL ? { baseURL } : {}), apiKey });
}

function personDto(p: typeof peopleTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    role: p.role,
    groupLabel: p.groupLabel ?? null,
    isInnerCircle: p.isInnerCircle,
    isAssistant: p.isAssistant,
    email: p.email ?? null,
  };
}

function taskToResponse(
  task: typeof tasksTable.$inferSelect,
  assignee: typeof peopleTable.$inferSelect,
  allPeople: typeof peopleTable.$inferSelect[],
) {
  const watcherIds = (task.watchers ?? []) as number[];
  const watcherPeople = watcherIds
    .map(id => allPeople.find(p => p.id === id))
    .filter(Boolean)
    .map(p => personDto(p!));

  return {
    id: task.id,
    title: task.title,
    body: task.body,
    assigneeId: task.assigneeId,
    assigneeName: assignee.name,
    assigneeRole: assignee.role,
    watchers: watcherPeople,
    priority: task.priority,
    dueDate: task.dueDate ?? null,
    businessId: task.businessId ?? null,
    status: task.status,
    createdBy: task.createdBy,
    createdByPersonId: task.createdByPersonId ?? null,
    parentId: task.parentId ?? null,
    returnComment: task.returnComment ?? null,
    resultNote: task.resultNote ?? null,
    lastActivityAt: task.lastActivityAt.toISOString(),
    createdAt: task.createdAt.toISOString(),
  };
}

const RESOLVE_STUCK_TYPES = new Set<typeof taskActivityTable.$inferInsert["type"]>([
  "accepted", "accepted_final", "submitted", "returned",
]);

async function writeActivity(params: {
  taskId: number;
  type: typeof taskActivityTable.$inferInsert["type"];
  actorRole: string;
  text?: string;
  at?: Date;
}) {
  await db.insert(taskActivityTable).values({
    taskId: params.taskId,
    type: params.type,
    actorRole: params.actorRole,
    text: params.text ?? null,
    at: params.at ?? new Date(),
  });
  if (RESOLVE_STUCK_TYPES.has(params.type)) {
    await resolveStuckEvents(params.taskId);
  }
}

/**
 * Write a task-event news item with idempotency guard.
 * Will not create a duplicate if a pending (status=new) item for the same
 * taskId + type already exists.
 */
async function writeTaskFeedEvent(params: {
  taskId: number;
  type: "task_new" | "task_accepted" | "task_review" | "task_returned";
  title: string;
  body: string;
  recipientRole: "owner" | "employee" | "director";
  severity: "attention" | "info";
}) {
  const existing = await db
    .select({ id: newsItemsTable.id })
    .from(newsItemsTable)
    .where(
      and(
        eq(newsItemsTable.taskId, params.taskId),
        eq(newsItemsTable.type, params.type),
        eq(newsItemsTable.status, "new"),
      ),
    )
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(newsItemsTable).values({
    taskId:        params.taskId,
    type:          params.type,
    severity:      params.severity,
    title:         params.title,
    body:          params.body,
    recipientRole: params.recipientRole,
    sourceLabel:   "Задачи",
    isUrgentFlag:  false,
    actionable:    true,
    status:        "new",
  });
}

const ACTIVE_STATUSES = ["sent", "in_progress", "returned"] as const;
const REVIEW_STATUSES = ["review"] as const;

router.get("/tasks", async (req, res): Promise<void> => {
  const box               = req.query["box"]               as string | undefined;
  const assigneeId        = req.query["assigneeId"]        ? parseInt(req.query["assigneeId"] as string, 10) : undefined;
  const createdByPersonId = req.query["createdByPersonId"] ? parseInt(req.query["createdByPersonId"] as string, 10) : undefined;

  const [tasks, allPeople] = await Promise.all([
    db.select().from(tasksTable).orderBy(tasksTable.createdAt),
    db.select().from(peopleTable),
  ]);

  let filtered = tasks;
  if (box === "review") {
    filtered = tasks.filter(t => (REVIEW_STATUSES as readonly string[]).includes(t.status));
  } else if (box === "active") {
    filtered = tasks.filter(t => (ACTIVE_STATUSES as readonly string[]).includes(t.status));
  }

  if (assigneeId && !isNaN(assigneeId)) {
    filtered = filtered.filter(t => t.assigneeId === assigneeId);
  }

  if (createdByPersonId && !isNaN(createdByPersonId)) {
    filtered = filtered.filter(t => t.createdByPersonId === createdByPersonId);
  }

  const result = filtered.map(task => {
    const assignee = allPeople.find(p => p.id === task.assigneeId);
    if (!assignee) return null;
    return taskToResponse(task, assignee, allPeople);
  }).filter(Boolean);

  res.json(result);
});

router.get("/tasks/activity", async (req, res): Promise<void> => {
  const id = Number(req.query["id"]);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "id query param required" });
    return;
  }

  const rows = await db
    .select()
    .from(taskActivityTable)
    .where(eq(taskActivityTable.taskId, id))
    .orderBy(taskActivityTable.at);

  res.json(rows.map(r => ({
    id: r.id,
    taskId: r.taskId,
    type: r.type,
    actorRole: r.actorRole,
    text: r.text ?? null,
    at: r.at.toISOString(),
  })));
});

router.get("/tasks/tree", async (req, res): Promise<void> => {
  const id = Number(req.query["id"]);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "id query param required" });
    return;
  }

  const [allTasks, allPeople] = await Promise.all([
    db.select().from(tasksTable),
    db.select().from(peopleTable),
  ]);

  const root = allTasks.find(t => t.id === id);
  if (!root) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  function toNode(t: typeof tasksTable.$inferSelect) {
    const assignee = allPeople.find(p => p.id === t.assigneeId);
    return {
      id: t.id,
      title: t.title,
      assigneeRole: assignee?.role ?? "—",
      status: t.status,
      acceptedAt: (t as any).acceptedAt ? (t as any).acceptedAt.toISOString() : null,
      lastActivityAt: t.lastActivityAt.toISOString(),
      parentId: t.parentId ?? null,
    };
  }

  // Depth-first recursive collection of all subtasks
  function collectChildren(parentId: number, depth = 0): ReturnType<typeof toNode>[] {
    if (depth > 6) return [];
    const direct = allTasks.filter(t => t.parentId === parentId);
    const result: ReturnType<typeof toNode>[] = [];
    for (const t of direct) {
      result.push(toNode(t));
      result.push(...collectChildren(t.id, depth + 1));
    }
    return result;
  }

  res.json({
    root: toNode(root),
    children: collectChildren(id),
  });
});

router.post("/tasks/accept", async (req, res): Promise<void> => {
  const id = Number(req.query["id"]);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "id query param required" });
    return;
  }

  const now = new Date();
  const [updated] = await db
    .update(tasksTable)
    .set({ status: "done", lastActivityAt: now })
    .where(eq(tasksTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const actorLabel = updated.createdByPersonId ? "director" : "owner";
  await writeActivity({ taskId: id, type: "accepted_final", actorRole: actorLabel, at: now });

  // Notify the assignee (employee) that their work was accepted
  await writeTaskFeedEvent({
    taskId:        id,
    type:          "task_accepted",
    title:         "Задача принята",
    body:          updated.title,
    recipientRole: "employee",
    severity:      "info",
  });

  const allPeople = await db.select().from(peopleTable);
  const assignee = allPeople.find(p => p.id === updated.assigneeId)!;
  res.json(taskToResponse(updated, assignee, allPeople));
});

router.post("/tasks/return", async (req, res): Promise<void> => {
  const id = Number(req.query["id"]);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "id query param required" });
    return;
  }

  const { comment } = req.body as { comment?: string };
  if (!comment?.trim()) {
    res.status(400).json({ error: "comment is required" });
    return;
  }

  const now = new Date();
  const [updated] = await db
    .update(tasksTable)
    .set({ status: "returned", returnComment: comment.trim(), lastActivityAt: now })
    .where(eq(tasksTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const actorLabel = updated.createdByPersonId ? "director" : "owner";
  await writeActivity({ taskId: id, type: "returned", actorRole: actorLabel, text: comment.trim(), at: now });

  // Feed: task returned → notify assignee (employee inbox)
  await writeTaskFeedEvent({
    taskId:        id,
    type:          "task_returned",
    title:         "Задача возвращена на доработку",
    body:          updated.title + (comment.trim() ? ` — ${comment.trim()}` : ""),
    recipientRole: "employee",
    severity:      "attention",
  });

  const allPeople = await db.select().from(peopleTable);
  const assignee = allPeople.find(p => p.id === updated.assigneeId)!;
  res.json(taskToResponse(updated, assignee, allPeople));
});

router.post("/tasks/start", async (req, res): Promise<void> => {
  const id = Number(req.query["id"]);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "id query param required" });
    return;
  }

  const now = new Date();
  const [updated] = await db
    .update(tasksTable)
    .set({ status: "in_progress", acceptedAt: now, lastActivityAt: now })
    .where(eq(tasksTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  await writeActivity({ taskId: id, type: "accepted", actorRole: updated.assigneeId ? "assignee" : "owner", at: now });

  // Notify the task creator that work has started
  // If createdByPersonId is set → task was from director → notify director
  // Otherwise → task was from owner → notify owner
  const notifyRole = updated.createdByPersonId ? "director" : "owner";
  await writeTaskFeedEvent({
    taskId:        id,
    type:          "task_accepted",
    title:         "Задача принята в работу",
    body:          updated.title,
    recipientRole: notifyRole,
    severity:      "info",
  });

  const allPeople = await db.select().from(peopleTable);
  const assignee = allPeople.find(p => p.id === updated.assigneeId)!;
  res.json(taskToResponse(updated, assignee, allPeople));
});

router.post("/tasks/submit", async (req, res): Promise<void> => {
  const id = Number(req.query["id"]);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "id query param required" });
    return;
  }

  const { resultNote } = req.body as { resultNote?: string };
  const now = new Date();

  const [updated] = await db
    .update(tasksTable)
    .set({
      status: "review",
      resultNote: resultNote?.trim() ?? null,
      lastActivityAt: now,
    })
    .where(eq(tasksTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const allPeople = await db.select().from(peopleTable);
  const assignee = allPeople.find(p => p.id === updated.assigneeId);
  await writeActivity({
    taskId: id,
    type: "submitted",
    actorRole: assignee?.role ?? "assignee",
    text: resultNote?.trim() ?? undefined,
    at: now,
  });

  // Feed: submitted for review
  // If createdByPersonId is set → submitted back to director (not owner)
  // Otherwise → submitted to owner
  const notifyRole: "owner" | "director" = updated.createdByPersonId ? "director" : "owner";
  const bodyParts = [updated.title];
  if (resultNote?.trim()) bodyParts.push(resultNote.trim());
  await writeTaskFeedEvent({
    taskId:        id,
    type:          "task_review",
    title:         "Задача сдана на проверку",
    body:          bodyParts.join(" — "),
    recipientRole: notifyRole,
    severity:      "attention",
  });

  res.json(taskToResponse(updated, assignee!, allPeople));
});

router.post("/tasks/request-approval", async (req, res): Promise<void> => {
  const { title, body, approverRole, requesterRole, blockedTaskId } = req.body as {
    title?: string;
    body?: string;
    approverRole?: string;
    requesterRole?: string;
    blockedTaskId?: number | null;
  };

  if (!title?.trim() || !approverRole?.trim() || !requesterRole?.trim()) {
    res.status(400).json({ error: "title, approverRole and requesterRole are required" });
    return;
  }

  const allPeople = await db.select().from(peopleTable);
  // Find a real person to use as assignee: match role name, or fall back to assistant
  const approverPerson =
    allPeople.find(p => p.role === approverRole) ??
    allPeople.find(p => p.isAssistant) ??
    allPeople[0];

  if (!approverPerson) {
    res.status(503).json({ error: "No people in DB — run seed:tasks first" });
    return;
  }

  const now = new Date();
  const [approval] = await db.insert(tasksTable).values({
    title: title.trim(),
    body: (body ?? "").trim(),
    assigneeId: approverPerson.id,
    kind: "approval",
    approverRole: approverRole.trim(),
    status: "sent",
    priority: "high",
    watchers: [],
    createdBy: requesterRole.trim(),
    lastActivityAt: now,
    createdAt: now,
  }).returning();

  await writeActivity({ taskId: approval!.id, type: "created", actorRole: requesterRole.trim(), at: now });

  // Optionally mark blocked task
  if (blockedTaskId) {
    await db.update(tasksTable)
      .set({ blockedByApprovalId: approval!.id })
      .where(eq(tasksTable.id, blockedTaskId));
  }

  // Feed event for approver — recipientRole maps role → feed recipient
  const feedRecipient: "owner" | "director" | "employee" =
    approverRole === "owner" ? "owner"
    : approverRole.toLowerCase().includes("директор") || approverRole.toLowerCase().includes("director") ? "director"
    : "owner";

  await db.insert(newsItemsTable).values({
    taskId:        approval!.id,
    type:          "approval",
    severity:      "attention",
    title:         "На согласование",
    body:          `${requesterRole} запрашивает согласование: ${title.trim()}`,
    recipientRole: feedRecipient,
    sourceLabel:   "Согласование",
    isUrgentFlag:  false,
    actionable:    true,
    status:        "new",
  });

  res.status(201).json(taskToResponse(approval!, approverPerson, allPeople));
});

router.post("/tasks/approve", async (req, res): Promise<void> => {
  const id = Number(req.query["id"]);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "id query param required" });
    return;
  }

  const now = new Date();
  const [updated] = await db
    .update(tasksTable)
    .set({ status: "done", lastActivityAt: now })
    .where(eq(tasksTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Task not found" }); return; }

  await writeActivity({ taskId: id, type: "accepted_final", actorRole: updated.approverRole ?? "owner", at: now });

  // Unblock any tasks that were blocked waiting for this approval
  await db.update(tasksTable)
    .set({ blockedByApprovalId: null })
    .where(eq(tasksTable.blockedByApprovalId, id));

  // Notify requester ("согласовано")
  const requesterRole = updated.createdBy;
  const feedRecipient: "owner" | "director" | "employee" =
    requesterRole === "owner" ? "owner"
    : requesterRole.toLowerCase().includes("директор") ? "director"
    : "employee";

  await db.insert(newsItemsTable).values({
    taskId:        id,
    type:          "task_accepted",
    severity:      "info",
    title:         "Согласовано ✓",
    body:          `«${updated.title}» — одобрено`,
    recipientRole: feedRecipient,
    sourceLabel:   "Согласование",
    isUrgentFlag:  false,
    actionable:    false,
    status:        "new",
  });

  const allPeople = await db.select().from(peopleTable);
  const assignee = allPeople.find(p => p.id === updated.assigneeId)!;
  res.json(taskToResponse(updated, assignee, allPeople));
});

router.post("/tasks/reject", async (req, res): Promise<void> => {
  const id = Number(req.query["id"]);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "id query param required" });
    return;
  }

  const { comment } = req.body as { comment?: string };
  if (!comment?.trim()) {
    res.status(400).json({ error: "comment is required" });
    return;
  }

  const now = new Date();
  const [updated] = await db
    .update(tasksTable)
    .set({ status: "returned", returnComment: comment.trim(), lastActivityAt: now })
    .where(eq(tasksTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Task not found" }); return; }

  await writeActivity({ taskId: id, type: "returned", actorRole: updated.approverRole ?? "owner", text: comment.trim(), at: now });

  // Notify requester ("отклонено: причина")
  const requesterRole = updated.createdBy;
  const feedRecipient: "owner" | "director" | "employee" =
    requesterRole === "owner" ? "owner"
    : requesterRole.toLowerCase().includes("директор") ? "director"
    : "employee";

  await db.insert(newsItemsTable).values({
    taskId:        id,
    type:          "task_returned",
    severity:      "attention",
    title:         "Отклонено",
    body:          `«${updated.title}» — отклонено: ${comment.trim()}`,
    recipientRole: feedRecipient,
    sourceLabel:   "Согласование",
    isUrgentFlag:  false,
    actionable:    false,
    status:        "new",
  });

  const allPeople = await db.select().from(peopleTable);
  const assignee = allPeople.find(p => p.id === updated.assigneeId)!;
  res.json(taskToResponse(updated, assignee, allPeople));
});

router.post("/tasks/draft", async (req, res): Promise<void> => {
  const { text } = req.body as { text?: string };
  if (!text?.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const people = await db.select().from(peopleTable).orderBy(peopleTable.id);

  if (people.length === 0) {
    res.status(503).json({ error: "Справочник сотрудников пуст — запустите seed:tasks" });
    return;
  }

  const directory = people
    .map(p => `id=${p.id}: ${p.role}${p.isInnerCircle ? " (приближённый)" : ""}${p.isAssistant ? " (дефолтный)" : ""}`)
    .join("\n");

  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `Ты — умный ассистент для постановки задач в команде собственника бизнеса.
Сегодняшняя дата: ${today}.

Справочник сотрудников (только роли, без имён):
${directory}

Проанализируй текст задачи и верни JSON строго такого вида:
{
  "title": "краткое название задачи (до 8 слов)",
  "body": "развёрнутое описание задачи с контекстом",
  "assigneeId": <id исполнителя из справочника>,
  "watcherIds": [<id соисполнителей если упомянуты, иначе []>],
  "priority": "<high|medium|low>",
  "dueDate": "<ISO date YYYY-MM-DD или null>",
  "rationale": "1–2 предложения: почему именно эта роль"
}

Правила:
- Если роль исполнителя неясна — выбери Ассистент (помечен дефолтным).
- Приоритет: слова «срочно», «срочная», «ASAP», «немедленно» → high; «важно», «приоритет» → medium; иначе → low.
- Срок: распознай дату из текста и переведи в ISO. Если срок не указан — null.
- watcherIds: только упомянутые дополнительные участники, не исполнитель.
- Верни только валидный JSON, без markdown-обёртки.`;

  try {
    let client;
    try {
      client = makeClient();
    } catch (err) {
      console.error("[AI] tasks/draft: OpenAI key not configured:", err instanceof Error ? err.message : err);
      res.status(503).json({ error: "Ключ OpenAI не настроен на сервере" });
      return;
    }
    const completion = await client.chat.completions.create({
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
      body?: string;
      assigneeId?: number;
      watcherIds?: number[];
      priority?: string;
      dueDate?: string | null;
      rationale?: string;
    };

    const assistantPerson = people.find(p => p.isAssistant) ?? people[0]!;
    const assigneeId = parsed.assigneeId ?? assistantPerson.id;
    const watcherIds: number[] = (parsed.watcherIds ?? []).filter(
      (id): id is number => typeof id === "number" && id !== assigneeId,
    );

    const assignee = people.find(p => p.id === assigneeId) ?? assistantPerson;
    const watcherPeople = watcherIds
      .map(id => people.find(p => p.id === id))
      .filter(Boolean)
      .map(p => personDto(p!));

    const priority = (["high", "medium", "low"] as const).includes(parsed.priority as "high" | "medium" | "low")
      ? (parsed.priority as "high" | "medium" | "low")
      : "medium";

    res.json({
      title: parsed.title ?? "Новая задача",
      body: parsed.body ?? text,
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      assigneeRole: assignee.role,
      watchers: watcherPeople,
      priority,
      dueDate: parsed.dueDate ?? null,
      rationale: parsed.rationale ?? "",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[tasks/draft] AI error:", msg, err);
    res.status(500).json({ error: "Не удалось оформить задачу", detail: msg });
  }
});

router.post("/tasks", async (req, res): Promise<void> => {
  const {
    title,
    body,
    assigneeId,
    watchers,
    priority,
    dueDate,
    businessId,
    createdByPersonId,
    parentId,
    createdBy,
  } = req.body as {
    title?: string;
    body?: string;
    assigneeId?: number;
    watchers?: number[];
    priority?: string;
    dueDate?: string | null;
    businessId?: number | null;
    createdByPersonId?: number;
    parentId?: number;
    createdBy?: string;
  };

  if (!title?.trim() || !assigneeId) {
    res.status(400).json({ error: "title and assigneeId are required" });
    return;
  }

  const allPeople = await db.select().from(peopleTable);
  const assignee = allPeople.find(p => p.id === assigneeId);
  if (!assignee) {
    res.status(400).json({ error: "assignee not found" });
    return;
  }

  const validPriority = (["high", "medium", "low"] as const).includes(priority as "high" | "medium" | "low")
    ? (priority as "high" | "medium" | "low")
    : "medium";

  const actorLabel = createdBy ?? (createdByPersonId ? "director" : "owner");

  const now = new Date();
  const [task] = await db.insert(tasksTable).values({
    title: title.trim(),
    body: (body ?? "").trim(),
    assigneeId,
    watchers: watchers ?? [],
    priority: validPriority,
    dueDate: dueDate ?? null,
    businessId: businessId ?? null,
    status: "sent",
    createdBy: actorLabel,
    createdByPersonId: createdByPersonId ?? null,
    parentId: parentId ?? null,
    lastActivityAt: now,
  }).returning();

  await writeActivity({ taskId: task!.id, type: "created", actorRole: actorLabel, at: now });

  // Feed: task created → notify assignee (always employee in this case)
  await writeTaskFeedEvent({
    taskId:        task!.id,
    type:          "task_new",
    title:         "Новая задача",
    body:          task!.title,
    recipientRole: "employee",
    severity:      "info",
  });

  res.status(201).json(taskToResponse(task!, assignee, allPeople));
});

router.post("/tasks/ping", async (req, res): Promise<void> => {
  const id = Number(req.query["id"]);
  if (!id) { res.status(400).json({ error: "id required" }); return; }

  const allPeople = await db.select().from(peopleTable);
  const rows = await db.select().from(tasksTable).where(eq(tasksTable.id, id)).limit(1);
  const task = rows[0];
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  const assignee = allPeople.find(p => p.id === task.assigneeId);
  if (!assignee) { res.status(404).json({ error: "Assignee not found" }); return; }

  const now = new Date();
  await writeActivity({ taskId: id, type: "pinged", actorRole: "owner", at: now });
  await db.insert(newsItemsTable).values({
    taskId: id,
    type: "task_stuck",
    severity: "attention",
    title: "Напоминание владельца",
    body: `Владелец ждёт результата по задаче «${task.title}»`,
    recipientRole: "employee",
    sourceLabel: "Владелец",
    isUrgentFlag: false,
    actionable: false,
    status: "new",
  });

  res.json(taskToResponse(task, assignee, allPeople));
});

router.post("/tasks/escalate", async (req, res): Promise<void> => {
  const id = Number(req.query["id"]);
  if (!id) { res.status(400).json({ error: "id required" }); return; }

  const allPeople = await db.select().from(peopleTable);
  const rows = await db.select().from(tasksTable).where(eq(tasksTable.id, id)).limit(1);
  const task = rows[0];
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  const assignee = allPeople.find(p => p.id === task.assigneeId);
  if (!assignee) { res.status(404).json({ error: "Assignee not found" }); return; }

  const now = new Date();
  await writeActivity({ taskId: id, type: "escalated", actorRole: "owner", at: now });
  const recipient = task.createdByPersonId ? "director" : "owner";
  await db.insert(newsItemsTable).values({
    taskId: id,
    type: "task_escalated",
    severity: "critical",
    title: "Ручная эскалация",
    body: `Задача «${task.title}» эскалирована вручную — требует немедленного внимания`,
    recipientRole: recipient,
    sourceLabel: "Владелец",
    isUrgentFlag: true,
    actionable: true,
    status: "new",
  });

  res.json(taskToResponse(task, assignee, allPeople));
});

export default router;

