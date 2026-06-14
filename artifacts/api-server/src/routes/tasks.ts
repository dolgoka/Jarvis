import { Router, type IRouter } from "express";
import { db, peopleTable, tasksTable } from "@workspace/db";
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
    lastActivityAt: task.lastActivityAt.toISOString(),
    createdAt: task.createdAt.toISOString(),
  };
}

router.get("/tasks", async (_req, res): Promise<void> => {
  const [tasks, allPeople] = await Promise.all([
    db.select().from(tasksTable).orderBy(tasksTable.createdAt),
    db.select().from(peopleTable),
  ]);

  const result = tasks.map(task => {
    const assignee = allPeople.find(p => p.id === task.assigneeId);
    if (!assignee) return null;
    return taskToResponse(task, assignee, allPeople);
  }).filter(Boolean);

  res.json(result);
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

  const [task] = await db.insert(tasksTable).values({
    title: title.trim(),
    body: (body ?? "").trim(),
    assigneeId,
    watchers: watchers ?? [],
    priority: validPriority,
    dueDate: dueDate ?? null,
    businessId: businessId ?? null,
    status: "sent",
  }).returning();

  res.status(201).json(taskToResponse(task!, assignee, allPeople));
});

export default router;
