import { eq, count } from "drizzle-orm";
import { db, peopleTable, tasksTable, taskActivityTable } from "@workspace/db";

async function seed() {
  // Find root task to attach subtasks to (the Q2 review task)
  const allTasks = await db.select().from(tasksTable);
  const root = allTasks.find(t => t.title.includes("Подготовить отчёт Q2"));
  if (!root) {
    console.log("Root task not found — run seedTasks first.");
    process.exit(1);
  }

  // Check if subtasks already exist
  const existing = allTasks.filter(t => t.parentId === root.id);
  if (existing.length > 0) {
    console.log(`Subtasks already exist for task #${root.id} (${existing.length} rows) — skipping.`);
    process.exit(0);
  }

  const people = await db.select().from(peopleTable);
  const find = (role: string) => people.find(p => p.role === role)!;

  const lawyer    = find("Юрист");
  const cfo       = find("Финдиректор");
  const assistant = people.find(p => p.isAssistant)!;

  const now = Date.now();
  const stale = new Date(now - 28 * 3600 * 1000); // 28h ago = stale

  const subtasks = [
    {
      title: "Юридическая часть отчёта",
      body: "Проверить соответствие данных требованиям корпоративного права.",
      assigneeId: lawyer.id,
      status: "in_progress" as const,
      priority: "medium" as const,
      parentId: root.id,
      createdBy: "owner",
      lastActivityAt: new Date(now - 10 * 3600 * 1000), // 10h ago — not stale
      actorRole: lawyer.role,
      actorActivity: "accepted",
    },
    {
      title: "Финансовая часть отчёта",
      body: "Свести данные по EBITDA, cash flow и прогнозам Q3.",
      assigneeId: cfo.id,
      status: "sent" as const,  // "не приняли" bottleneck
      priority: "high" as const,
      parentId: root.id,
      createdBy: "owner",
      lastActivityAt: stale,  // stale AND not accepted = double bottleneck
      actorRole: cfo.role,
      actorActivity: null,
    },
    {
      title: "Сводный дашборд для совета",
      body: "Оформить итоговую презентацию с ключевыми метриками.",
      assigneeId: assistant.id,
      status: "review" as const,
      priority: "medium" as const,
      parentId: root.id,
      createdBy: "owner",
      lastActivityAt: new Date(now - 3 * 3600 * 1000), // 3h ago — not stale
      actorRole: assistant.role,
      actorActivity: "submitted",
    },
  ];

  console.log(`Inserting ${subtasks.length} subtasks for task #${root.id}: "${root.title}"`);

  for (const s of subtasks) {
    const createdAt = new Date(now - 48 * 3600 * 1000);
    const { lastActivityAt, actorRole, actorActivity, ...rest } = s;

    const [ins] = await db.insert(tasksTable).values({
      ...rest,
      watchers: [],
      createdAt,
      lastActivityAt,
    }).returning();

    // Activity: created
    await db.insert(taskActivityTable).values({
      taskId: ins!.id,
      type: "created",
      actorRole: "owner",
      at: createdAt,
    });

    // Activity: accepted (if applicable)
    if (actorActivity === "accepted" || actorActivity === "submitted") {
      await db.insert(taskActivityTable).values({
        taskId: ins!.id,
        type: "accepted",
        actorRole,
        at: new Date(now - 36 * 3600 * 1000),
      });
    }

    if (actorActivity === "submitted") {
      await db.insert(taskActivityTable).values({
        taskId: ins!.id,
        type: "submitted",
        actorRole,
        at: new Date(now - 3 * 3600 * 1000),
      });
    }

    console.log(`  #${ins!.id} [${s.status}] ${s.title}`);
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
