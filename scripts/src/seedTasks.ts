import { db, peopleTable, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const PEOPLE = [
  { name: "Аня",        role: "Ассистент",                    email: null },
  { name: "Саша Батов", role: "Зам. директора по развитию",   email: null },
  { name: "Николай",    role: "Операционка / Метрики",        email: null },
  { name: "Татьяна",    role: "Юридические проекты",          email: null },
  { name: "Алексей",    role: "Юридическая часть",            email: null },
  { name: "Виктор",     role: "Безопасность",                 email: null },
  { name: "Никита",     role: "Новый участник",               email: null },
  { name: "Даша",       role: "ИО коммерческого директора",   email: null },
];

async function seed() {
  console.log("Seeding people...");

  const existing = await db.select().from(peopleTable);
  if (existing.length > 0) {
    console.log(`  People already seeded (${existing.length} records) — skipping insert.`);
  } else {
    for (const p of PEOPLE) {
      const [ins] = await db.insert(peopleTable).values(p).returning();
      console.log(`  Person: ${ins!.name} — ${ins!.role} (id=${ins!.id})`);
    }
  }

  const people = await db.select().from(peopleTable);
  const byName = (n: string) => people.find(p => p.name === n)!;

  const existingTasks = await db.select().from(tasksTable);
  if (existingTasks.length > 0) {
    console.log(`  Tasks already seeded (${existingTasks.length} records) — skipping insert.`);
    process.exit(0);
  }

  console.log("Seeding demo tasks...");

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  const demos: Parameters<typeof db.insert<typeof tasksTable>>[0] extends infer _R ? any[] : any[] = [
    {
      title: "Аналитика по Q2 для инвесторов",
      description: "Подготовить сводку ключевых показателей за второй квартал: выручка, EBITDA, ТОП-компании. Формат — 1 слайд + таблица.",
      assigneeId: byName("Саша Батов").id,
      linkedPeopleIds: [byName("Николай").id],
      status: "accepted" as const,
      createdAt: daysAgo(5),
      acceptedAt: daysAgo(4),
      stuckDays: null,
    },
    {
      title: "Оформить NDA с новым контрагентом",
      description: "Проверить и подписать соглашение о неразглашении с партнёром из Сингапура. Срок — до конца недели.",
      assigneeId: byName("Алексей").id,
      linkedPeopleIds: [byName("Татьяна").id],
      status: "waiting" as const,
      createdAt: daysAgo(1),
      acceptedAt: null,
      stuckDays: null,
    },
    {
      title: "Настроить дашборд KPI по операциям",
      description: "Добавить метрики по SilkRoad и TajEnergo в оперативный дашборд. Показатели: выручка, маржа, кол-во заказов — помесячно.",
      assigneeId: byName("Николай").id,
      linkedPeopleIds: [],
      status: "stuck" as const,
      createdAt: daysAgo(3),
      acceptedAt: null,
      stuckDays: 3,
    },
    {
      title: "Согласовать условия пролонгации аренды офиса",
      description: "Переговорить с арендодателем о новых условиях: ставка, срок, индексация. Зафиксировать итог письмом.",
      assigneeId: byName("Татьяна").id,
      linkedPeopleIds: [byName("Аня").id],
      status: "stuck" as const,
      createdAt: daysAgo(7),
      acceptedAt: null,
      stuckDays: 7,
    },
  ];

  for (const task of demos) {
    const [ins] = await db.insert(tasksTable).values(task).returning();
    console.log(`  Task [${ins!.status}]: ${ins!.title} (id=${ins!.id})`);
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
