import { eq, count } from "drizzle-orm";
import { db, peopleTable, tasksTable, taskActivityTable, newsItemsTable } from "@workspace/db";

async function seed() {
  const [row] = await db
    .select({ n: count() })
    .from(tasksTable)
    .where(eq(tasksTable.kind, "approval"));

  if ((row?.n ?? 0) > 0) {
    console.log(`Approval tasks already seeded (${row!.n} rows) — skipping.`);
    process.exit(0);
  }

  const people = await db.select().from(peopleTable);
  const find = (role: string) => people.find(p => p.role === role);
  const assistant = people.find(p => p.isAssistant) ?? people[0]!;
  const lawyer    = find("Юрист") ?? assistant;
  const cfo       = find("Финдиректор") ?? assistant;

  const now = Date.now();

  const approvals = [
    {
      title: "Согласовать условия аренды нового офиса",
      body:  "Арендодатель предлагает контракт на 3 года с правом выкупа. Ставка: €45/м²/мес. Площадь: 320 м². Прошу одобрить финансовые условия и подписание.",
      assigneeId: lawyer.id,
      approverRole: "owner",
      requesterRole: lawyer.role,
      createdAt: new Date(now - 3 * 3600 * 1000),
    },
    {
      title: "Одобрить бюджет маркетинга Q3",
      body:  "Предлагаемый бюджет на Q3: €120 000. Распределение: 40% digital, 30% мероприятия, 20% PR, 10% прочее. ROI прогноз ×2.4. Требуется подтверждение собственника.",
      assigneeId: cfo.id,
      approverRole: "owner",
      requesterRole: cfo.role,
      createdAt: new Date(now - 30 * 60 * 1000),
    },
  ];

  console.log("Seeding approval requests for owner feed…");

  for (const a of approvals) {
    const { createdAt, requesterRole, ...rest } = a;

    const [task] = await db.insert(tasksTable).values({
      ...rest,
      kind: "approval",
      status: "sent",
      priority: "high",
      body: a.body,
      watchers: [],
      createdBy: requesterRole,
      createdAt,
      lastActivityAt: createdAt,
    }).returning();

    await db.insert(taskActivityTable).values({
      taskId: task!.id,
      type: "created",
      actorRole: requesterRole,
      at: createdAt,
    });

    await db.insert(newsItemsTable).values({
      taskId:        task!.id,
      type:          "approval",
      severity:      "attention",
      title:         "На согласование",
      body:          `${requesterRole} запрашивает согласование: ${a.title}`,
      recipientRole: "owner",
      sourceLabel:   "Согласование",
      isUrgentFlag:  false,
      actionable:    true,
      status:        "new",
    });

    console.log(`  #${task!.id} [approval] ${a.title}`);
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
