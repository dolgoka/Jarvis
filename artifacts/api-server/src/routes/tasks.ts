import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, peopleTable, tasksTable } from "@workspace/db";
import OpenAI from "openai";

const router: IRouter = Router();

function makeClient() {
  const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("No OpenAI API key configured (set OPENAI_API_KEY)");
  return new OpenAI({ ...(baseURL ? { baseURL } : {}), apiKey });
}

function resolveLinked(ids: number[], allPeople: typeof peopleTable.$inferSelect[]) {
  return ids
    .map(id => allPeople.find(p => p.id === id))
    .filter(Boolean)
    .map(p => ({ id: p!.id, name: p!.name, role: p!.role, email: p!.email ?? null }));
}

function taskToResponse(
  task: typeof tasksTable.$inferSelect,
  assignee: typeof peopleTable.$inferSelect,
  allPeople: typeof peopleTable.$inferSelect[],
) {
  const ids = (task.linkedPeopleIds ?? []) as number[];
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    assigneeId: task.assigneeId,
    assigneeName: assignee.name,
    assigneeRole: assignee.role,
    linkedPeopleIds: ids,
    linkedPeople: resolveLinked(ids, allPeople),
    status: task.status,
    createdAt: task.createdAt.toISOString(),
    acceptedAt: task.acceptedAt?.toISOString() ?? null,
    stuckDays: task.stuckDays ?? null,
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
  const directory = people.map(p => `id=${p.id}: ${p.name} — ${p.role}`).join("\n");

  const systemPrompt = `Ты — умный ассистент для постановки задач. У тебя есть справочник сотрудников:
${directory}

Проанализируй текст пользователя и верни JSON строго такого вида:
{
  "title": "краткое название задачи (до 8 слов)",
  "description": "развёрнутое описание задачи",
  "assigneeId": <id исполнителя из справочника или 1 если непонятно>,
  "linkedPeopleIds": [<id доп. участников если упомянуты, иначе []>]
}

Правила:
- Имена сопоставляй гибко: «Ане» → Аня (id=1), «по безопасности» → Виктор, «зам» → Саша Батов и т.д.
- linkedPeopleIds — только те, кто упомянут как дополнительные участники, не исполнитель
- Верни только валидный JSON, без markdown-обёртки`;

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
    const linked = resolveLinked(linkedIds, people);

    res.json({
      title: parsed.title ?? "Новая задача",
      description: parsed.description ?? text,
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      assigneeRole: assignee.role,
      linkedPeopleIds: linkedIds,
      linkedPeople: linked,
    });
  } catch (err) {
    console.error("draft task AI error", err);
    res.status(500).json({ error: "AI error" });
  }
});

router.post("/tasks", async (req, res): Promise<void> => {
  const { title, description, assigneeId, linkedPeopleIds } = req.body as {
    title?: string;
    description?: string;
    assigneeId?: number;
    linkedPeopleIds?: number[];
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

  const [task] = await db.insert(tasksTable).values({
    title: title.trim(),
    description: (description ?? "").trim(),
    assigneeId,
    linkedPeopleIds: linkedPeopleIds ?? [],
    status: "waiting",
  }).returning();

  res.status(201).json(taskToResponse(task!, assignee, allPeople));
});

export default router;
