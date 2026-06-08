import { db, peopleTable, tasksTable } from "@workspace/db";

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
  // Always clear and re-seed so running the script repeatedly is safe
  console.log("Clearing tasks and people...");
  await db.delete(tasksTable);
  await db.delete(peopleTable);
  console.log("  Cleared.");

  console.log("Seeding people...");
  for (const p of PEOPLE) {
    const [ins] = await db.insert(peopleTable).values(p).returning();
    console.log(`  Person: ${ins!.name} — ${ins!.role} (id=${ins!.id})`);
  }

  const people = await db.select().from(peopleTable);
  const byName = (n: string) => {
    const p = people.find(p => p.name === n);
    if (!p) throw new Error(`Person not found: ${n}`);
    return p;
  };

  console.log("Seeding demo tasks...");

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  const demos = [
    // ── WAITING ─────────────────────────────────────────────────────────────
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
      title: "Уточнить статус лицензии TajEnergo",
      description: "Запросить у Фируза Рахимова актуальный статус регуляторной лицензии. Последний отчёт — 3 недели назад. Нужен письменный ответ.",
      assigneeId: byName("Аня").id,
      linkedPeopleIds: [],
      status: "waiting" as const,
      createdAt: daysAgo(2),
      acceptedAt: null,
      stuckDays: null,
    },
    // ── ACCEPTED ─────────────────────────────────────────────────────────────
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
      title: "Подготовить отчёт по SilkRoad для совещания",
      description: "Собрать оперативные данные по SilkRoad Logistics: статус контрактов, динамика выручки, риски. Слайд + короткий брифинг к понедельнику.",
      assigneeId: byName("Даша").id,
      linkedPeopleIds: [byName("Виктор").id, byName("Николай").id],
      status: "accepted" as const,
      createdAt: daysAgo(3),
      acceptedAt: daysAgo(2),
      stuckDays: null,
    },
    // ── STUCK ─────────────────────────────────────────────────────────────────
    {
      title: "Настроить дашборд KPI по операциям",
      description: "Добавить метрики по SilkRoad и TajEnergo в оперативный дашборд (выручка, маржа, заказы помесячно). Блокер: нет доступа к prod-БД — Николай ждёт токен от Никиты уже 3 дня.",
      assigneeId: byName("Николай").id,
      linkedPeopleIds: [],
      status: "stuck" as const,
      createdAt: daysAgo(3),
      acceptedAt: null,
      stuckDays: 3,
    },
    {
      title: "Согласовать условия пролонгации аренды офиса",
      description: "Переговорить с арендодателем о новых условиях: ставка, срок, индексация. Зафиксировать итог письмом. Блокер: арендодатель не выходит на связь 7 дней — нужно подключить юридическое давление через Алексея.",
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
