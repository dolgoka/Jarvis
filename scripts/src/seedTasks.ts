import { count, eq } from "drizzle-orm";
import { db, peopleTable, tasksTable } from "@workspace/db";

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
  const [row] = await db.select({ n: count() }).from(tasksTable).where(eq(tasksTable.status, "review"));
  if ((row?.n ?? 0) > 0) {
    console.log(`Demo tasks already seeded (${row!.n} review rows) — skipping.`);
    return;
  }

  const findRole = (role: string) => people.find(p => p.role === role);
  const assistant = people.find(p => p.isAssistant) ?? people[0]!;
  const lawyer = findRole("Юрист") ?? assistant;
  const cfo = findRole("Финдиректор") ?? assistant;
  const itDir = findRole("IT-директор") ?? assistant;
  const security = findRole("Безопасность") ?? assistant;

  const staleDate = new Date(Date.now() - 26 * 60 * 60 * 1000);

  const demos = [
    {
      title: "Подготовить отчёт Q2 для совета",
      body: "Сформировать итоговый отчёт по второму кварталу с разбивкой по направлениям и прогнозом на Q3.",
      assigneeId: cfo.id,
      watchers: [assistant.id],
      priority: "high" as const,
      status: "review" as const,
      dueDate: "2026-06-18",
      lastActivityAt: staleDate,
    },
    {
      title: "Согласовать NDA с партнёром",
      body: "Проверить и согласовать соглашение о неразглашении с сингапурским партнёром. Внести правки в разделы 4 и 7.",
      assigneeId: lawyer.id,
      watchers: [security.id],
      priority: "high" as const,
      status: "review" as const,
      dueDate: "2026-06-16",
      lastActivityAt: new Date(),
    },
    {
      title: "Аудит доступов к продакшн-серверам",
      body: "Провести ревизию прав доступа всех сотрудников к производственной инфраструктуре. Закрыть устаревшие учётные записи.",
      assigneeId: itDir.id,
      watchers: [security.id],
      priority: "medium" as const,
      status: "in_progress" as const,
      dueDate: "2026-06-20",
      lastActivityAt: new Date(),
    },
  ];

  console.log("Seeding demo tasks...");
  for (const d of demos) {
    const { lastActivityAt, ...rest } = d;
    const [ins] = await db.insert(tasksTable).values({
      ...rest,
      createdBy: "owner",
    }).returning();

    if (lastActivityAt < new Date(Date.now() - 1000 * 60)) {
      await db.update(tasksTable)
        .set({ lastActivityAt })
        .where(eq(tasksTable.id, ins!.id));
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
