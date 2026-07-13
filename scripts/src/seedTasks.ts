import { count, eq } from "drizzle-orm";
import { db, peopleTable, tasksTable, taskActivityTable } from "@workspace/db";

const PEOPLE = [
  {
    name: "Ассистент",
    role: "Ассистент",
    groupLabel: "Операционный штаб",
    isInnerCircle: true,
    isAssistant: true,
  },
  {
    name: "Зам / развитие",
    role: "Зам / развитие",
    groupLabel: "Операционный штаб",
    isInnerCircle: true,
    isAssistant: false,
  },
  {
    name: "Методолог",
    role: "Методолог",
    groupLabel: "Операционный штаб",
    isInnerCircle: true,
    isAssistant: false,
  },
  {
    name: "Юрист",
    role: "Юрист",
    groupLabel: "Правовое поле",
    isInnerCircle: false,
    isAssistant: false,
  },
  {
    name: "Юрист-партнёр",
    role: "Юрист-партнёр",
    groupLabel: "Правовое поле",
    isInnerCircle: false,
    isAssistant: false,
  },
  {
    name: "Безопасность",
    role: "Безопасность",
    groupLabel: "Безопасность",
    isInnerCircle: true,
    isAssistant: false,
  },
  {
    name: "IT-директор",
    role: "IT-директор",
    groupLabel: "Технологии",
    isInnerCircle: false,
    isAssistant: false,
  },
  {
    name: "ИО коммерческого",
    role: "ИО коммерческого",
    groupLabel: "Коммерция",
    isInnerCircle: true,
    isAssistant: false,
  },
  {
    name: "Финдиректор",
    role: "Финдиректор",
    groupLabel: "Финансы",
    isInnerCircle: true,
    isAssistant: false,
  },
  {
    name: "Внешний партнёр",
    role: "Внешний партнёр",
    groupLabel: "Внешние",
    isInnerCircle: false,
    isAssistant: false,
  },
  {
    name: "Александр",
    role: "GR-директор",
    groupLabel: "Внешние связи",
    isInnerCircle: true,
    isAssistant: false,
    cLevel: "GR",
  },
];

async function seedPeople(): Promise<typeof peopleTable.$inferSelect[]> {
  const [row] = await db.select({ n: count() }).from(peopleTable);
  if ((row?.n ?? 0) > 0) {
    console.log(`People already seeded (${row!.n} rows) — skipping.`);
    return db.select().from(peopleTable);
  }

  console.log("Seeding people (roles only, no real names)...");
  const inserted: typeof peopleTable.$inferSelect[] = [];
  for (const p of PEOPLE) {
    const [ins] = await db.insert(peopleTable).values(p).returning();
    const ic = ins!.isInnerCircle ? " ★" : "";
    const ast = ins!.isAssistant ? " [default]" : "";
    console.log(`  ${ins!.id}: ${ins!.role}${ic}${ast}`);
    inserted.push(ins!);
  }
  return inserted;
}

async function seedDemoTasks(people: typeof peopleTable.$inferSelect[]): Promise<void> {
  const findRole = (role: string) => people.find(p => p.role === role);
  const assistant = people.find(p => p.isAssistant) ?? people[0]!;
  const lawyer = findRole("Юрист") ?? assistant;
  const cfo = findRole("Финдиректор") ?? assistant;
  const itDir = findRole("IT-директор") ?? assistant;
  const security = findRole("Безопасность") ?? assistant;
  const zamDev = findRole("Зам / развитие") ?? assistant;

  const [row] = await db.select({ n: count() }).from(tasksTable).where(eq(tasksTable.status, "review"));
  if ((row?.n ?? 0) > 0) {
    console.log(`Demo tasks already seeded (${row!.n} review rows) — patching resultNote if needed...`);
    const existing = await db.select().from(tasksTable).where(eq(tasksTable.status, "review"));
    const RESULT_NOTES: Record<string, string> = {
      "Подготовить отчёт Q2 для совета":
        "Отчёт подготовлен и сверстан. Включены все 4 направления, динамика выручки EBITDA по месяцам, прогноз Q3 с двумя сценариями. Файл загружен в общую папку /reports/Q2-2026, ссылка отправлена совету.",
      "Согласовать NDA с партнёром":
        "NDA согласован. Правки в разделы 4 и 7 внесены совместно с юрист-партнёром. Сингапурская сторона подтвердила принятие версии v3.2. Подписанный документ передан в архив.",
    };
    for (const t of existing) {
      if (t.resultNote === null && RESULT_NOTES[t.title]) {
        await db.update(tasksTable)
          .set({ resultNote: RESULT_NOTES[t.title]! })
          .where(eq(tasksTable.id, t.id));
        console.log(`  Patched resultNote for #${t.id}: ${t.title}`);
      }
    }
    return;
  }

  const staleDate = new Date(Date.now() - 26 * 60 * 60 * 1000);

  const demos = [
    {
      title: "Подготовить отчёт Q2 для совета",
      body: "Сформировать итоговый отчёт по второму кварталу с разбивкой по направлениям и прогнозом на Q3.",
      assigneeId: cfo.id,
      assigneeRole: cfo.role,
      watchers: [assistant.id],
      priority: "high" as const,
      status: "review" as const,
      dueDate: "2026-06-18",
      resultNote: "Отчёт подготовлен и сверстан. Включены все 4 направления, динамика выручки EBITDA по месяцам, прогноз Q3 с двумя сценариями. Файл загружен в общую папку /reports/Q2-2026, ссылка отправлена совету.",
      lastActivityAt: staleDate,
      activityOffsets: { created: -48 * 3600, accepted: -36 * 3600, submitted: -26 * 3600 },
    },
    {
      title: "Согласовать NDA с партнёром",
      body: "Проверить и согласовать соглашение о неразглашении с сингапурским партнёром. Внести правки в разделы 4 и 7.",
      assigneeId: lawyer.id,
      assigneeRole: lawyer.role,
      watchers: [security.id],
      priority: "high" as const,
      status: "review" as const,
      dueDate: "2026-06-16",
      resultNote: "NDA согласован. Правки в разделы 4 и 7 внесены совместно с юрист-партнёром. Сингапурская сторона подтвердила принятие версии v3.2. Подписанный документ передан в архив.",
      lastActivityAt: new Date(),
      activityOffsets: { created: -72 * 3600, accepted: -60 * 3600, submitted: -1 * 3600 },
    },
    {
      title: "Провести ревью конкурентов — Q2",
      body: "Собрать данные по 5 ключевым конкурентам: цены, новые продукты, рекламные кампании, изменения в команде. Оформить в сравнительную таблицу.",
      assigneeId: zamDev.id,
      assigneeRole: zamDev.role,
      watchers: [assistant.id, cfo.id],
      priority: "medium" as const,
      status: "review" as const,
      dueDate: "2026-06-19",
      resultNote: "Ревью завершено. Проанализировано 5 конкурентов. Главное: Конкурент А снизил цены на 8%, Конкурент Б запустил мобильное приложение. Сравнительная таблица в /analytics/competitors-Q2-2026.xlsx.",
      lastActivityAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      activityOffsets: { created: -96 * 3600, accepted: -80 * 3600, submitted: -4 * 3600 },
    },
    {
      title: "Аудит доступов к продакшн-серверам",
      body: "Провести ревизию прав доступа всех сотрудников к производственной инфраструктуре. Закрыть устаревшие учётные записи.",
      assigneeId: itDir.id,
      assigneeRole: itDir.role,
      watchers: [security.id],
      priority: "medium" as const,
      status: "in_progress" as const,
      dueDate: "2026-06-20",
      resultNote: null,
      lastActivityAt: new Date(),
      activityOffsets: { created: -12 * 3600, accepted: -10 * 3600, submitted: null },
    },
  ];

  console.log("Seeding demo tasks...");
  for (const d of demos) {
    const { lastActivityAt, resultNote, activityOffsets, assigneeRole, ...rest } = d;
    const now = Date.now();
    const createdAt = new Date(now + activityOffsets.created * 1000);

    const [ins] = await db.insert(tasksTable).values({
      ...rest,
      resultNote: resultNote ?? null,
      createdBy: "owner",
      createdAt,
    }).returning();

    if (lastActivityAt < new Date(Date.now() - 1000 * 60)) {
      await db.update(tasksTable)
        .set({ lastActivityAt })
        .where(eq(tasksTable.id, ins!.id));
    }

    const taskId = ins!.id;

    await db.insert(taskActivityTable).values({
      taskId,
      type: "created",
      actorRole: "owner",
      at: createdAt,
    });

    const acceptedAt = new Date(now + activityOffsets.accepted * 1000);
    await db.insert(taskActivityTable).values({
      taskId,
      type: "accepted",
      actorRole: assigneeRole,
      at: acceptedAt,
    });

    if (activityOffsets.submitted !== null) {
      const submittedAt = new Date(now + activityOffsets.submitted * 1000);
      await db.insert(taskActivityTable).values({
        taskId,
        type: "submitted",
        actorRole: assigneeRole,
        text: resultNote ?? null,
        at: submittedAt,
      });
    }

    console.log(`  #${ins!.id} [${d.status}] ${d.title}`);
  }
}

async function seed() {
  const people = await seedPeople();
  await seedDemoTasks(people);
  console.log("Done.");
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
