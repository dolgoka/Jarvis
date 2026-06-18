import { count, eq } from "drizzle-orm";
import {
  db,
  businessesTable,
  metricsTable,
  roadmapTable,
  coverageTable,
  peopleTable,
  reportsTable,
} from "@workspace/db";

const SEED_MARKER = "CARD_SEED_V1";

const BUSINESSES = [
  {
    name: "Прима Медиагрупп АО",
    city: "Москва",
    country: "Россия",
    lat: 55.7558,
    lng: 37.6173,
    industry: "Медиа / Реклама",
    status: "active" as const,
    health: "green" as const,
    currency: "RUB",
    managerName: "Денис Воронов",
    managerEmail: "d.voronov@example.com",
    description: "Медиахолдинг: 3 радиосети, 2 digital-издания, продакшн-студия. Выручка ₽2.8B, рост +18% г/г.",
    stage: "operational" as const,
    circle: "internal" as const,
    partners: null,
    nonFinancial: { reputation: "green", concept: "green", media: "green", note: "Охват аудитории рекордный — 12M уникальных в месяц" },
  },
  {
    name: "ИнвестВектор ГК",
    city: "Санкт-Петербург",
    country: "Россия",
    lat: 59.9343,
    lng: 30.3351,
    industry: "Венчур / PE",
    status: "active" as const,
    health: "yellow" as const,
    currency: "RUB",
    managerName: "Артём Белоусов",
    managerEmail: "a.belousov@example.com",
    description: "Фонд ранних стадий. AUM ₽8.4B, 22 портфельных компании, IRR 19% по закрытым позициям.",
    stage: "investment" as const,
    circle: "internal" as const,
    partners: [
      { label: "Белоусов А.Н.", share: 38 },
      { label: "Карпов Г.В.", share: 24 },
      { label: "Family Office LP", share: 28 },
      { label: "Прочие LP", share: 10 },
    ],
    nonFinancial: { reputation: "green", concept: "yellow", media: "yellow", note: "Задержка двух портфельных раундов создаёт репутационное давление" },
  },
  {
    name: "АльянсТрейд ООО",
    city: "Новосибирск",
    country: "Россия",
    lat: 54.9885,
    lng: 82.9207,
    industry: "Оптовая торговля",
    status: "pending" as const,
    health: "yellow" as const,
    currency: "RUB",
    managerName: "Павел Стрельцов",
    managerEmail: "p.streltsov@example.com",
    description: "Региональный дистрибьютор FMCG. Выручка ₽1.1B. Контур — внешний пассивный.",
    stage: "operational" as const,
    circle: "external_passive" as const,
    partners: [
      { label: "Стрельцов П.Е.", share: 51 },
      { label: "Денисова Т.А.", share: 30 },
      { label: "Прочие", share: 19 },
    ],
    nonFinancial: { reputation: "yellow", concept: "yellow", media: "red", note: "Негативные публикации в региональной прессе по итогам аудита" },
  },
  {
    name: "РегионСтрой ПАО",
    city: "Екатеринбург",
    country: "Россия",
    lat: 56.8389,
    lng: 60.6057,
    industry: "Строительство",
    status: "active" as const,
    health: "red" as const,
    currency: "RUB",
    managerName: "Олег Меркулов",
    managerEmail: "o.merkulov@example.com",
    description: "Жилой девелопер. Backlog ₽14.2B, 7 активных ЖК. Задержки по 2 объектам, кассовый разрыв.",
    stage: "investment" as const,
    circle: "internal" as const,
    partners: [
      { label: "Меркулов О.В.", share: 45 },
      { label: "Уральский Фонд", share: 35 },
      { label: "Миноритарии", share: 20 },
    ],
    nonFinancial: { reputation: "red", concept: "yellow", media: "red", note: "Задержка сдачи ЖК «Маяк» — публичный скандал с дольщиками" },
  },
] as const;

const TOP_MGMT: Record<string, Array<{ name: string; role: string; cLevel: string; effectiveness: "green" | "yellow" | "red"; email: string }>> = {
  "Прима Медиагрупп АО": [
    { name: "Денис Воронов",     role: "Генеральный директор",   cLevel: "gd",         effectiveness: "green",  email: "d.voronov@example.com" },
    { name: "Светлана Щепкина",  role: "Исполнительный директор",cLevel: "executive",  effectiveness: "green",  email: "s.shepkina@example.com" },
    { name: "Игорь Матвеев",     role: "Финансовый директор",    cLevel: "financial",  effectiveness: "yellow", email: "i.matveev@example.com" },
    { name: "Оксана Близнец",    role: "Коммерческий директор",  cLevel: "commercial", effectiveness: "green",  email: "o.bliznets@example.com" },
  ],
  "ИнвестВектор ГК": [
    { name: "Артём Белоусов",    role: "Генеральный директор",   cLevel: "gd",         effectiveness: "yellow", email: "a.belousov@example.com" },
    { name: "Наталья Кузина",    role: "Исполнительный директор",cLevel: "executive",  effectiveness: "green",  email: "n.kuzina@example.com" },
    { name: "Глеб Карпов",       role: "Финансовый директор",    cLevel: "financial",  effectiveness: "yellow", email: "g.karpov@example.com" },
    { name: "Роман Сидоренко",   role: "Коммерческий директор",  cLevel: "commercial", effectiveness: "green",  email: "r.sidorenko@example.com" },
  ],
  "РегионСтрой ПАО": [
    { name: "Олег Меркулов",     role: "Генеральный директор",   cLevel: "gd",         effectiveness: "red",    email: "o.merkulov@example.com" },
    { name: "Марина Зотова",     role: "Исполнительный директор",cLevel: "executive",  effectiveness: "yellow", email: "m.zotova@example.com" },
    { name: "Виктор Чернов",     role: "Финансовый директор",    cLevel: "financial",  effectiveness: "red",    email: "v.chernov@example.com" },
    { name: "Алексей Лукин",     role: "Коммерческий директор",  cLevel: "commercial", effectiveness: "yellow", email: "a.lukin@example.com" },
  ],
};

const METRICS: Record<string, Array<{ stageScope: "operational" | "investment"; key: string; label: string; unit: string; plan: number; fact: number; ownerRole: string; thresholdYellow?: number; thresholdRed?: number; note?: string }>> = {
  "Прима Медиагрупп АО": [
    { stageScope: "operational", key: "revenue",    label: "Выручка",           unit: "₽",  plan: 230_000_000, fact: 248_000_000, ownerRole: "Финансовый директор" },
    { stageScope: "operational", key: "opex",       label: "Операционные косты",unit: "₽",  plan: 170_000_000, fact: 165_000_000, ownerRole: "Финансовый директор", thresholdYellow: 8, thresholdRed: 15 },
    { stageScope: "operational", key: "ebitda",     label: "EBITDA",            unit: "₽",  plan: 60_000_000,  fact: 83_000_000,  ownerRole: "Финансовый директор" },
    { stageScope: "operational", key: "headcount",  label: "Штат (чел.)",       unit: "чел",plan: 320,         fact: 314,         ownerRole: "Исполнительный директор" },
    { stageScope: "operational", key: "audience",   label: "Охват аудитории",   unit: "M",  plan: 10,          fact: 12.1,        ownerRole: "Коммерческий директор" },
  ],
  "ИнвестВектор ГК": [
    { stageScope: "investment",  key: "aum",        label: "AUM",               unit: "₽B", plan: 9.0,   fact: 8.4,   ownerRole: "Финансовый директор",  thresholdYellow: 8, thresholdRed: 15, note: "Два закрытия раундов задержаны" },
    { stageScope: "investment",  key: "irr",        label: "IRR (закрытые)",    unit: "%",  plan: 22.0,  fact: 19.0,  ownerRole: "Генеральный директор", thresholdYellow: 10, thresholdRed: 20 },
    { stageScope: "investment",  key: "portfolio",  label: "Портфель (кол.)",   unit: "шт", plan: 25,    fact: 22,    ownerRole: "Исполнительный директор" },
    { stageScope: "investment",  key: "burn",       label: "Burn rate (мес.)",  unit: "₽M", plan: 42.0,  fact: 48.0,  ownerRole: "Финансовый директор",  thresholdYellow: 10, thresholdRed: 20, note: "Операционные расходы выросли" },
    { stageScope: "investment",  key: "runway",     label: "Runway",            unit: "мес",plan: 18,    fact: 14,    ownerRole: "Финансовый директор",  thresholdYellow: 15, thresholdRed: 25 },
  ],
  "АльянсТрейд ООО": [
    { stageScope: "operational", key: "revenue",    label: "Выручка",           unit: "₽",  plan: 95_000_000,  fact: 88_000_000,  ownerRole: "Генеральный директор", thresholdYellow: 7, thresholdRed: 15 },
    { stageScope: "operational", key: "margin",     label: "Маржа",             unit: "%",  plan: 12.0,        fact: 9.8,         ownerRole: "Генеральный директор", thresholdYellow: 10, thresholdRed: 20 },
  ],
  "РегионСтрой ПАО": [
    { stageScope: "investment",  key: "backlog",    label: "Backlog",           unit: "₽B", plan: 16.0,  fact: 14.2,  ownerRole: "Генеральный директор",  thresholdYellow: 10, thresholdRed: 20 },
    { stageScope: "investment",  key: "cashflow",   label: "Операционный CF",   unit: "₽M", plan: 120.0, fact: -18.0, ownerRole: "Финансовый директор",  thresholdYellow: 10, thresholdRed: 20, note: "Кассовый разрыв — задержка авансов от дольщиков" },
    { stageScope: "investment",  key: "delivery",   label: "Сдано в срок",      unit: "%",  plan: 100.0, fact: 71.0,  ownerRole: "Исполнительный директор", thresholdYellow: 10, thresholdRed: 20, note: "ЖК «Маяк» и «Рябина» — просрочка" },
    { stageScope: "investment",  key: "margin",     label: "Маржа проектов",    unit: "%",  plan: 18.0,  fact: 10.5,  ownerRole: "Финансовый директор",  thresholdYellow: 15, thresholdRed: 30 },
  ],
};

const ROADMAP: Record<string, Array<{ title: string; date: string; status: "done" | "current" | "planned"; note?: string }>> = {
  "Прима Медиагрупп АО": [
    { title: "Редизайн флагманского сайта",       date: "2026-01-15", status: "done",    note: "Запущен в срок, трафик +23%" },
    { title: "Запуск подкаст-платформы",          date: "2026-03-01", status: "done" },
    { title: "Интеграция с Яндекс Музыкой",       date: "2026-06-30", status: "current", note: "Тестирование API" },
    { title: "Открытие регионального бюро (Казань)",date: "2026-09-01",status: "planned" },
    { title: "Запуск стриминг-сервиса",           date: "2026-12-01", status: "planned" },
  ],
  "ИнвестВектор ГК": [
    { title: "Закрытие Фонда II — первый транш",  date: "2025-11-01", status: "done",    note: "₽3.2B привлечено" },
    { title: "Выход из PortCo «Цифра»",           date: "2026-02-15", status: "done",    note: "IRR 31% на сделке" },
    { title: "Закрытие раунда PortCo «АгроТех»", date: "2026-07-01", status: "current", note: "Переговоры в стадии term sheet" },
    { title: "Старт Фонда III — fundraising",     date: "2026-10-01", status: "planned" },
    { title: "Листинг PortCo «МедТех»",           date: "2027-02-01", status: "planned" },
  ],
  "РегионСтрой ПАО": [
    { title: "Завершение ЖК «Уральские огни»",    date: "2025-12-01", status: "done" },
    { title: "Получение РНС на ЖК «Горизонт»",   date: "2026-03-01", status: "done" },
    { title: "Сдача ЖК «Маяк» (просрочен)",       date: "2026-05-01", status: "current", note: "Задержка 3 месяца — устранение замечаний ГК" },
    { title: "Старт продаж ЖК «Весна»",           date: "2026-08-01", status: "planned", note: "Зависит от закрытия кассового разрыва" },
    { title: "Закрытие кредитной линии ₽2B",      date: "2026-09-01", status: "planned" },
  ],
};

const COVERAGE: Record<string, Array<{ area: string; closed: boolean; ownerRole: string; note?: string }>> = {
  "Прима Медиагрупп АО": [
    { area: "commerce",    closed: true,  ownerRole: "Коммерческий директор" },
    { area: "accounting",  closed: true,  ownerRole: "Финансовый директор" },
    { area: "legal",       closed: true,  ownerRole: "Юрист-партнёр" },
    { area: "financing",   closed: false, ownerRole: "Финансовый директор", note: "Рефинансирование облигаций — в процессе" },
  ],
  "ИнвестВектор ГК": [
    { area: "commerce",    closed: true,  ownerRole: "Коммерческий директор" },
    { area: "accounting",  closed: false, ownerRole: "Финансовый директор",  note: "Аудит Q2 не закрыт — ждём аудитора" },
    { area: "legal",       closed: false, ownerRole: "Юрист-партнёр",        note: "Юридическое оформление двух портфельных сделок" },
    { area: "financing",   closed: true,  ownerRole: "Финансовый директор" },
  ],
  "АльянсТрейд ООО": [
    { area: "commerce",    closed: true,  ownerRole: "Директор" },
    { area: "accounting",  closed: false, ownerRole: "Директор", note: "Нет штатного бухгалтера — аутсорс" },
    { area: "legal",       closed: false, ownerRole: "Директор", note: "Договор с юристом истёк" },
    { area: "financing",   closed: false, ownerRole: "Директор", note: "Нет привлечённого финансиста" },
  ],
  "РегионСтрой ПАО": [
    { area: "commerce",    closed: false, ownerRole: "Коммерческий директор", note: "Низкий темп продаж по новым ЖК" },
    { area: "accounting",  closed: true,  ownerRole: "Финансовый директор" },
    { area: "legal",       closed: false, ownerRole: "Юрист-партнёр",         note: "Претензии дольщиков ЖК «Маяк» — 14 исков" },
    { area: "financing",   closed: false, ownerRole: "Финансовый директор",   note: "Кассовый разрыв не закрыт" },
  ],
};

async function seedCard(): Promise<void> {
  const [existing] = await db
    .select({ n: count() })
    .from(businessesTable)
    .where(eq(businessesTable.managerEmail, "d.voronov@example.com"));
  if ((existing?.n ?? 0) > 0) {
    console.log("Card seed already applied — skipping.");
    return;
  }

  console.log("Seeding company card data for 4 businesses…");

  for (const biz of BUSINESSES) {
    const { nonFinancial, partners, ...rest } = biz;
    const [inserted] = await db
      .insert(businessesTable)
      .values({ ...rest, nonFinancial, partners })
      .returning();
    const bid = inserted!.id;
    console.log(`  [business] #${bid} ${inserted!.name}`);

    const metrics = METRICS[biz.name] ?? [];
    for (const m of metrics) {
      await db.insert(metricsTable).values({
        businessId: bid,
        stageScope: m.stageScope,
        key: m.key,
        label: m.label,
        unit: m.unit,
        plan: m.plan,
        fact: m.fact,
        period: "month",
        ownerRole: m.ownerRole,
        thresholdYellow: m.thresholdYellow ?? 10,
        thresholdRed: m.thresholdRed ?? 20,
        date: "2026-06",
        note: m.note ?? null,
      });
    }
    console.log(`    metrics: ${metrics.length}`);

    const roadmapItems = ROADMAP[biz.name] ?? [];
    for (const r of roadmapItems) {
      await db.insert(roadmapTable).values({ businessId: bid, ...r, note: r.note ?? null });
    }
    console.log(`    roadmap: ${roadmapItems.length}`);

    const coverageItems = COVERAGE[biz.name] ?? [];
    for (const c of coverageItems) {
      await db.insert(coverageTable).values({ businessId: bid, ...c, note: c.note ?? null });
    }
    console.log(`    coverage: ${coverageItems.length}`);

    const mgmt = TOP_MGMT[biz.name] ?? [];
    for (const p of mgmt) {
      await db.insert(peopleTable).values({ ...p, businessId: bid, isInnerCircle: false, isAssistant: false });
    }
    console.log(`    people: ${mgmt.length}`);

    await db.insert(reportsTable).values({
      businessId: bid,
      period: "month",
      revenue: biz.currency === "RUB" ? (biz.name === "Прима Медиагрупп АО" ? 248_000_000 : biz.name === "ИнвестВектор ГК" ? 112_000_000 : biz.name === "АльянсТрейд ООО" ? 88_000_000 : 95_000_000) : 0,
      orders: biz.name === "АльянсТрейд ООО" ? 840 : biz.name === "Прима Медиагрупп АО" ? 1 : 1,
      profit: biz.name === "Прима Медиагрупп АО" ? 83_000_000 : biz.name === "ИнвестВектор ГК" ? 24_000_000 : biz.name === "АльянсТрейд ООО" ? 8_624_000 : -18_000_000,
      date: "2026-06-15",
      notes: null,
    });
    console.log(`    report: seeded`);
  }

  console.log("Card seed done.");
}

seedCard()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => process.exit(0));
