import { Router, type IRouter } from "express";
import { eq, inArray, and } from "drizzle-orm";
import { db, peopleTable, tasksTable, taskActivityTable, newsItemsTable } from "@workspace/db";
import OpenAI from "openai";

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
    returnComment: task.returnComment ?? null,
    resultNote: task.resultNote ?? null,
    lastActivityAt: task.lastActivityAt.toISOString(),
    createdAt: task.createdAt.toISOString(),
  };
}

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
  recipientRole: "owner" | "employee";
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
  const box = req.query["box"] as string | undefined;

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

  await writeActivity({ taskId: id, type: "accepted_final", actorRole: "owner", at: now });

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

  await writeActivity({ taskId: id, type: "returned", actorRole: "owner", text: comment.trim(), at: now });

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

  await writeActivity({ taskId: id, type: "accepted", actorRole: updated.createdBy ?? "owner", at: now });

  // Feed: accepted into work → notify owner
  await writeTaskFeedEvent({
    taskId:        id,
    type:          "task_accepted",
    title:         "Задача принята в работу",
    body:          updated.title,
    recipientRole: "owner",
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

  // Feed: submitted for review → notify owner
  const bodyParts = [updated.title];
  if (resultNote?.trim()) bodyParts.push(resultNote.trim());
  await writeTaskFeedEvent({
    taskId:        id,
    type:          "task_review",
    title:         "Задача сдана на проверку",
    body:          bodyParts.join(" — "),
    recipientRole: "owner",
    severity:      "attention",
  });

  res.json(taskToResponse(updated, assignee!, allPeople));
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
  } = req.body as {
    title?: string;
    body?: string;
    assigneeId?: number;
    watchers?: number[];
    priority?: string;
    dueDate?: string | null;
    businessId?: number | null;
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
    lastActivityAt: now,
  }).returning();

  await writeActivity({ taskId: task!.id, type: "created", actorRole: "owner", at: now });

  // Feed: task created/sent → notify assignee (employee inbox)
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

export default router;
