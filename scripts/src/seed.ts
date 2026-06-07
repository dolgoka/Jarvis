import { db, businessesTable, reportsTable, eventsTable } from "@workspace/db";

type PlanFactItem = {
  metric: string;
  plan: number;
  actual: number;
  unit: string;
  lowerIsBetter?: boolean;
};

type Analytics = {
  stage: "investment" | "operational";
  contour: "internal" | "external";
  responsible: { name: string; role: string } | null;
  whyColor: string;
  planFact: PlanFactItem[];
  forms: {
    bdr: Record<string, number>;
    odds: Record<string, number>;
    balance: Record<string, number>;
  };
  structure?: {
    partners: Array<{ name: string; share: number }>;
    employees: number;
    projects: Array<{ name: string; status: string }>;
  };
};

function minimalAnalytics(
  managerName: string,
  managerRole: string,
  health: "green" | "yellow" | "red",
  revenue: number,
  profit: number,
  currency: string,
  stage: "operational" | "investment",
  contour: "internal" | "external",
  whyColor: string,
): Analytics {
  const unit = currency === "RUB" ? "₽" : "$";
  const costs = revenue - profit;
  const planRevenue = Math.round(revenue * 0.93);
  const planCosts = Math.round(costs * 1.07);
  const planProfit = Math.round(profit * 0.85);
  return {
    stage,
    contour,
    responsible: { name: managerName, role: managerRole },
    whyColor,
    planFact: [
      { metric: "Оборот", plan: planRevenue, actual: revenue, unit },
      { metric: "Косты", plan: planCosts, actual: costs, unit, lowerIsBetter: true },
      { metric: "Чистая прибыль", plan: planProfit, actual: profit, unit },
    ],
    forms: {
      bdr: { "Выручка": revenue, "Себестоимость": costs, "Чистая прибыль": profit },
      odds: { "Операционный CF": Math.round(profit * 0.75), "Инвестиционный CF": Math.round(-revenue * 0.02), "Финансовый CF": Math.round(-profit * 0.15), "Итого": Math.round(profit * 0.6) },
      balance: { "Активы": Math.round(revenue * 2.2), "Обязательства": Math.round(revenue * 1.3), "Капитал": Math.round(revenue * 0.9) },
    },
  };
}

const BUSINESSES: Array<{
  name: string; city: string; country: string; lat: number; lng: number;
  industry: string; status: "active" | "inactive" | "pending"; health: "green" | "yellow" | "red";
  currency: string; managerName: string; managerEmail: string; description: string;
  revenue: number; orders: number; profit: number;
  analytics: Analytics;
}> = [
  {
    name: "Meridian Capital Group",
    city: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708,
    industry: "Investment Management", status: "active", health: "green", currency: "USD",
    managerName: "Александр Вернер", managerEmail: "a.werner@meridiancapital.ae",
    description: "Диверсифицированная инвестиционная группа с AUM $2.1B. Фокус на PE, Real Estate и VC в регионе MENA и глобально.",
    revenue: 34700000, orders: 47, profit: 7634000,
    analytics: minimalAnalytics("Александр Вернер", "Managing Partner", "green", 34700000, 7634000, "USD", "investment", "internal",
      "Все KPI в норме: AUM $2.1B, доходность портфеля 22% YoY, дивиденды выплачены в срок"),
  },
  {
    name: "NovaTech Solutions Ltd",
    city: "London", country: "UK", lat: 51.5074, lng: -0.1278,
    industry: "IT / SaaS", status: "active", health: "green", currency: "USD",
    managerName: "Оливер Харрис", managerEmail: "o.harris@novatech.io",
    description: "SaaS-платформа для автоматизации enterprise процессов. Выручка $89.2M, рост +31% YoY.",
    revenue: 7433333, orders: 1847, profit: 1040666,
    analytics: {
      stage: "operational",
      contour: "internal",
      responsible: { name: "Оливер Харрис", role: "CEO & Co-Founder" },
      whyColor: "Рост выручки +31% YoY, EBITDA margin 14%, все метрики превышают план",
      planFact: [
        { metric: "Оборот", plan: 7000000, actual: 7433333, unit: "$" },
        { metric: "Косты", plan: 5800000, actual: 5700000, unit: "$", lowerIsBetter: true },
        { metric: "EBITDA", plan: 950000, actual: 1040000, unit: "$" },
        { metric: "Чистая прибыль", plan: 980000, actual: 1040666, unit: "$" },
        { metric: "Кэш-флоу", plan: 800000, actual: 920000, unit: "$" },
      ],
      forms: {
        bdr: { "Выручка": 7433333, "Себестоимость": 5700000, "Валовая прибыль": 1733333, "Операционные расходы": 693333, "EBITDA": 1040000, "Чистая прибыль": 1040666 },
        odds: { "Операционный CF": 920000, "Инвестиционный CF": -380000, "Финансовый CF": -120000, "Итого": 420000 },
        balance: { "Активы": 18500000, "Обязательства": 7200000, "Капитал": 11300000 },
      },
      structure: {
        partners: [
          { name: "Oliver Harris", share: 42 },
          { name: "Sarah Chen", share: 31 },
          { name: "Sequoia Capital", share: 22 },
          { name: "Прочие", share: 5 },
        ],
        employees: 340,
        projects: [
          { name: "Enterprise AI Suite v3", status: "active" },
          { name: "EU Market Expansion", status: "active" },
          { name: "Mobile Platform", status: "завершён" },
        ],
      },
    },
  },
  {
    name: "Azure Hospitality Group",
    city: "Dubai", country: "UAE", lat: 25.1972, lng: 55.2796,
    industry: "Hospitality", status: "active", health: "green", currency: "USD",
    managerName: "Карим Эль-Хайям", managerEmail: "k.hayam@azure-hospitality.ae",
    description: "Сеть бутик-отелей премиум-класса в Дубае. 4 объекта, 705 номеров, occupancy 84.3%.",
    revenue: 3983333, orders: 705, profit: 477999,
    analytics: minimalAnalytics("Карим Эль-Хайям", "General Manager", "green", 3983333, 477999, "USD", "operational", "external",
      "Загрузка отелей 84.3% — рекорд квартала, выручка превышает план на 7%"),
  },
  {
    name: "Pacific Trade Partners Pte Ltd",
    city: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198,
    industry: "Commodities Trading", status: "pending", health: "yellow", currency: "USD",
    managerName: "Тан Вэй Минь", managerEmail: "tanwm@pacifictrade.sg",
    description: "Commodity trader: пальмовое масло, каучук, металлы. Выручка $156M, маржа сжата до 3.2%.",
    revenue: 13000000, orders: 28, profit: 416000,
    analytics: minimalAnalytics("Тан Вэй Минь", "Managing Director", "yellow", 13000000, 416000, "USD", "operational", "external",
      "Маржа сжалась до 3.2% — ниже порогового значения 5%, волатильность сырьевых рынков давит на прибыль"),
  },
  {
    name: "Helios Real Estate Ltd",
    city: "Limassol", country: "Cyprus", lat: 34.6841, lng: 33.0331,
    industry: "Real Estate", status: "active", health: "green", currency: "USD",
    managerName: "Николас Пападопулос", managerEmail: "n.papadopoulos@heliosre.cy",
    description: "Кипрский девелопер luxury недвижимости. AUM €185M, маржа 28%. Акцент на Лимассол.",
    revenue: 2583333, orders: 12, profit: 723333,
    analytics: minimalAnalytics("Николас Пападопулос", "CEO", "green", 2583333, 723333, "USD", "investment", "external",
      "Маржа 28% стабильна, все сделки закрыты в срок, AUM €185M растёт"),
  },
  {
    name: "AutoDrive Systems GmbH",
    city: "Munich", country: "Germany", lat: 48.1351, lng: 11.582,
    industry: "Automotive Tech / AI", status: "pending", health: "red", currency: "USD",
    managerName: "Маркус Браун", managerEmail: "m.braun@autodrive.de",
    description: "ADAS L3+ стартап. Burn rate €650K/мес, runway 14 мес. Series A на €15M в процессе.",
    revenue: 683333, orders: 3, profit: -287000,
    analytics: {
      stage: "investment",
      contour: "external",
      responsible: { name: "Маркус Браун", role: "CEO & Founder" },
      whyColor: "Burn rate €650K/мес, runway 14 месяцев — критический уровень. Series A €15M в процессе, но не закрыта",
      planFact: [
        { metric: "Объём бизнес-плана", plan: 15000000, actual: 15000000, unit: "€" },
        { metric: "Профинансировано (план)", plan: 8000000, actual: 6500000, unit: "€" },
        { metric: "% готовности продукта", plan: 65, actual: 58, unit: "%" },
        { metric: "Burn Rate (мес)", plan: 500000, actual: 650000, unit: "€", lowerIsBetter: true },
      ],
      forms: {
        bdr: { "Выручка": 683333, "R&D расходы": 4800000, "Операционные расходы": 3000000, "Убыток": -287000 },
        odds: { "Операционный CF": -650000, "Инвестиционный CF": -120000, "Финансовый CF": 780000, "Итого": 10000 },
        balance: { "Активы": 12000000, "Обязательства": 3500000, "Капитал": 8500000 },
      },
    },
  },
  {
    name: "Atlas Digital Agency",
    city: "New York", country: "USA", lat: 40.7128, lng: -74.006,
    industry: "Digital Marketing", status: "active", health: "green", currency: "USD",
    managerName: "Michael Torres", managerEmail: "m.torres@atlasdigital.com",
    description: "Performance digital агентство. Managed ad spend $180M/год, 67 клиентов, ROAS 4.2x.",
    revenue: 2366666, orders: 67, profit: 425999,
    analytics: minimalAnalytics("Michael Torres", "CEO", "green", 2366666, 425999, "USD", "operational", "external",
      "ROAS 4.2x превышает бенчмарк, все 67 клиентов продлили контракты"),
  },
  {
    name: "SkyLine Construction LLC",
    city: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708,
    industry: "Construction", status: "active", health: "green", currency: "USD",
    managerName: "Abdullah Al-Maktoum", managerEmail: "a.almaktoum@skylineconstruction.ae",
    description: "Ведущий генподрядчик в Дубае. Backlog $780M, 2847 сотрудников, 14 активных проектов.",
    revenue: 26000000, orders: 14, profit: 2340000,
    analytics: {
      stage: "investment",
      contour: "internal",
      responsible: { name: "Abdullah Al-Maktoum", role: "Managing Director" },
      whyColor: "Все объекты сданы в срок, backlog $780M стабилен, маржа 9% соответствует плану",
      planFact: [
        { metric: "Объём backlog", plan: 780000000, actual: 780000000, unit: "$" },
        { metric: "Выручка (месяц)", plan: 24000000, actual: 26000000, unit: "$" },
        { metric: "Косты проектов", plan: 22000000, actual: 21500000, unit: "$", lowerIsBetter: true },
        { metric: "Чистая прибыль", plan: 2000000, actual: 2340000, unit: "$" },
        { metric: "% сданных в срок", plan: 90, actual: 100, unit: "%" },
      ],
      forms: {
        bdr: { "Выручка": 26000000, "Себестоимость строительства": 21500000, "Валовая прибыль": 4500000, "Операционные расходы": 2160000, "Чистая прибыль": 2340000 },
        odds: { "Операционный CF": 3200000, "Инвестиционный CF": -28000000, "Финансовый CF": 25000000, "Итого": 200000 },
        balance: { "Активы": 420000000, "Обязательства": 280000000, "Капитал": 140000000 },
      },
      structure: {
        partners: [
          { name: "Al-Maktoum Holdings", share: 51 },
          { name: "Meridian Capital Group", share: 30 },
          { name: "Dubai Investment Authority", share: 19 },
        ],
        employees: 2847,
        projects: [
          { name: "Marina Tower Complex", status: "active" },
          { name: "Al Quoz Industrial Hub", status: "active" },
          { name: "Palm Jumeirah Residences", status: "active" },
          { name: "Business Bay Office Center", status: "завершён" },
          { name: "Deira Mixed-Use Development", status: "active" },
        ],
      },
    },
  },
  {
    name: "Северный Капитал АО",
    city: "Moscow", country: "Russia", lat: 55.7558, lng: 37.6173,
    industry: "Asset Management", status: "pending", health: "yellow", currency: "USD",
    managerName: "Андрей Северов", managerEmail: "a.severov@severkapital.ru",
    description: "Российская УК, AUM ₽142B. Работает в условиях санкционного давления с 2022 года.",
    revenue: 1533333, orders: 847, profit: 168666,
    analytics: minimalAnalytics("Андрей Северов", "Генеральный директор", "yellow", 1533333, 168666, "USD", "investment", "external",
      "Задержка регуляторного одобрения нового фонда, санкционное давление ограничивает операции"),
  },
  {
    name: "Колымские Недра АО",
    city: "Magadan", country: "Russia", lat: 59.5635, lng: 150.8082,
    industry: "Mining", status: "active", health: "yellow", currency: "USD",
    managerName: "Виктор Колымцев", managerEmail: "v.kolymtsev@kn-ao.ru",
    description: "Золото-серебряный добытчик. 4.2 т/год, AISC $980/oz, рентабельность 31%.",
    revenue: 650000, orders: 12, profit: 201500,
    analytics: minimalAnalytics("Виктор Колымцев", "Директор", "yellow", 650000, 201500, "USD", "operational", "external",
      "Задержка поставки оборудования замедляет добычу, AISC $980/oz выше планового $920/oz"),
  },
  {
    name: "Siam Pacific Foods Co Ltd",
    city: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018,
    industry: "Food & Agriculture", status: "active", health: "green", currency: "USD",
    managerName: "Somchai Wattanaprapa", managerEmail: "s.wattanaprapa@siampacific.th",
    description: "Тайский производитель и экспортёр. 28 экспортных рынков, 64% выручки — экспорт.",
    revenue: 5583333, orders: 412, profit: 446666,
    analytics: minimalAnalytics("Somchai Wattanaprapa", "CEO", "green", 5583333, 446666, "USD", "operational", "external",
      "Экспорт +12% — открыт новый рынок в Европе, 28 рынков сбыта, все показатели в плане"),
  },
  {
    name: "TajEnergo JSC",
    city: "Dushanbe", country: "Tajikistan", lat: 38.5598, lng: 68.7737,
    industry: "Energy", status: "pending", health: "red", currency: "USD",
    managerName: "Фируз Рахимов", managerEmail: "f.rakhimov@tajenergo.tj",
    description: "Таджикская энергетическая компания. 180 МВт, гидро 78%. Регулируемые тарифы.",
    revenue: 2833333, orders: 847, profit: 113333,
    analytics: {
      stage: "operational",
      contour: "external",
      responsible: null,
      whyColor: "Связь с узлом потеряна 3 недели — нет отчётности. Регулируемые тарифы не покрывают себестоимость при текущем курсе",
      planFact: [
        { metric: "Оборот", plan: 3200000, actual: 2833333, unit: "$" },
        { metric: "Косты", plan: 2400000, actual: 2720000, unit: "$", lowerIsBetter: true },
        { metric: "Чистая прибыль", plan: 400000, actual: 113333, unit: "$" },
        { metric: "Мощность (МВт)", plan: 200, actual: 180, unit: "МВт" },
      ],
      forms: {
        bdr: { "Выручка": 2833333, "Себестоимость": 2720000, "Чистая прибыль": 113333 },
        odds: { "Операционный CF": 85000, "Инвестиционный CF": -450000, "Финансовый CF": 400000, "Итого": 35000 },
        balance: { "Активы": 45000000, "Обязательства": 28000000, "Капитал": 17000000 },
      },
    },
  },
  {
    name: "SilkRoad Logistics LLC",
    city: "Tashkent", country: "Uzbekistan", lat: 41.2995, lng: 69.2401,
    industry: "Logistics", status: "active", health: "red", currency: "USD",
    managerName: "Бобур Юсупов", managerEmail: "b.yusupov@silkroadlogistics.uz",
    description: "Узбекский 3PL-оператор. 87 единиц флота, 24K sqm складов, рост +28% YoY.",
    revenue: 1583333, orders: 234, profit: 205833,
    analytics: minimalAnalytics("Бобур Юсупов", "Генеральный директор", "red", 1583333, 205833, "USD", "operational", "external",
      "Ключевые контракты под угрозой: задержка поставок критична, клиент X запустил тендер на замену"),
  },
  {
    name: "Profimonsters",
    city: "Moscow", country: "Russia", lat: 55.7439, lng: 37.6207,
    industry: "Logistics / HRtech", status: "active", health: "yellow", currency: "RUB",
    managerName: "Мурашов Виталий Владимирович", managerEmail: "v.murashov@profimonsters.ru",
    description: "ООО «Деливери Солюшенс», торговая марка PROFIMONSTERS. Аутсорсинг персонала, курьерская доставка, логистика для e-commerce. Выручка 5,46 млрд ₽ (+111% YoY), рентабельность 0,3%.",
    revenue: 5460000000, orders: 0, profit: 17490000,
    analytics: {
      stage: "operational",
      contour: "external",
      responsible: { name: "Мурашов Виталий Владимирович", role: "Генеральный директор" },
      whyColor: "Оборот растёт +111% YoY, но чистая рентабельность 0,3% — критически низкая. Косты опережают выручку",
      planFact: [
        { metric: "Оборот", plan: 5200000000, actual: 5460000000, unit: "₽" },
        { metric: "Косты", plan: 5100000000, actual: 5442510000, unit: "₽", lowerIsBetter: true },
        { metric: "EBITDA", plan: 120000000, actual: 45000000, unit: "₽" },
        { metric: "Чистая прибыль", plan: 50000000, actual: 17490000, unit: "₽" },
        { metric: "Кэш-флоу", plan: 30000000, actual: 12000000, unit: "₽" },
      ],
      forms: {
        bdr: {
          "Выручка": 5460000000,
          "Себестоимость услуг": 4980000000,
          "Валовая прибыль": 480000000,
          "Коммерческие расходы": 280000000,
          "Административные расходы": 155000000,
          "EBITDA": 45000000,
          "Амортизация": 18000000,
          "Чистая прибыль": 17490000,
        },
        odds: {
          "Операционный CF": 12000000,
          "Инвестиционный CF": -8000000,
          "Финансовый CF": -4000000,
          "Итого": 0,
        },
        balance: {
          "Оборотные активы": 620000000,
          "Внеоборотные активы": 270000000,
          "Итого активы": 890000000,
          "Краткосрочные обязательства": 580000000,
          "Долгосрочные обязательства": 200000000,
          "Капитал": 110000000,
        },
      },
    },
  },
];

const EVENT_SEEDS: Array<{
  businessName: string; text: string;
  severity: "critical" | "warning" | "info"; hoursAgo: number;
}> = [
  { businessName: "AutoDrive Systems GmbH",    text: "AutoDrive Systems: runway 14 мес, burn €650K/мес — узел на критическом уровне", severity: "critical", hoursAgo: 1 },
  { businessName: "TajEnergo JSC",             text: "TajEnergo не присылал отчёт 3 недели — связь с узлом потеряна", severity: "critical", hoursAgo: 3 },
  { businessName: "SilkRoad Logistics LLC",    text: "SilkRoad Logistics: ключевые контракты под угрозой — критическая задержка", severity: "critical", hoursAgo: 5 },
  { businessName: "Profimonsters",             text: "Profimonsters: оборот растёт (+111%), но рентабельность низкая — 0,3%", severity: "warning", hoursAgo: 2 },
  { businessName: "Колымские Недра АО",        text: "Колымские Недра: задержка поставки оборудования, добыча замедлена", severity: "warning", hoursAgo: 4 },
  { businessName: "Pacific Trade Partners Pte Ltd", text: "Pacific Trade Partners: маржа сжалась до 3.2% — ниже порогового значения", severity: "warning", hoursAgo: 8 },
  { businessName: "Северный Капитал АО",       text: "Северный Капитал: задержка регуляторного одобрения нового фонда", severity: "warning", hoursAgo: 14 },
  { businessName: "Meridian Capital Group",    text: "Meridian Capital: успешно закрыт квартальный аудит — всё в норме", severity: "info", hoursAgo: 6 },
  { businessName: "NovaTech Solutions Ltd",    text: "NovaTech Solutions: подписан новый контракт с enterprise-клиентом", severity: "info", hoursAgo: 9 },
  { businessName: "Azure Hospitality Group",   text: "Azure Hospitality: загрузка отелей достигла 84.3% — рекорд квартала", severity: "info", hoursAgo: 11 },
  { businessName: "Helios Real Estate Ltd",    text: "Helios Real Estate: сделка по объекту закрыта, маржа 28%", severity: "info", hoursAgo: 13 },
  { businessName: "Atlas Digital Agency",      text: "Atlas Digital Agency: ROAS 4.2x — клиент продлил контракт на год", severity: "info", hoursAgo: 15 },
  { businessName: "SkyLine Construction LLC",  text: "SkyLine Construction: сданы 3 объекта в срок, backlog $780M", severity: "info", hoursAgo: 18 },
  { businessName: "Siam Pacific Foods Co Ltd", text: "Siam Pacific Foods: экспорт +12% — открыт новый рынок в Европе", severity: "info", hoursAgo: 22 },
];

async function seed() {
  console.log("Clearing existing data...");
  await db.delete(eventsTable);
  await db.delete(reportsTable);
  await db.delete(businessesTable);
  console.log("  Cleared events, reports and businesses.");

  console.log("Seeding businesses...");
  const nameToId = new Map<string, number>();

  for (const biz of BUSINESSES) {
    const { revenue, orders, profit, analytics, ...bizRest } = biz;

    const [inserted] = await db
      .insert(businessesTable)
      .values({ ...bizRest, managerId: 0, analytics })
      .returning();

    if (!inserted) { console.log(`  Failed to insert: ${biz.name}`); continue; }

    nameToId.set(biz.name, inserted.id);
    console.log(`  Created: ${biz.name} (id=${inserted.id}, health=${inserted.health}, stage=${analytics.stage})`);

    const today = new Date().toISOString().slice(0, 10);
    await db.insert(reportsTable).values([
      { businessId: inserted.id, period: "month", revenue, orders, profit, date: today },
      { businessId: inserted.id, period: "week", revenue: Math.round(revenue * 0.25), orders: Math.round(orders * 0.25), profit: Math.round(profit * 0.25), date: today },
      { businessId: inserted.id, period: "day", revenue: Math.round(revenue * 0.04), orders: Math.round(orders * 0.04), profit: Math.round(profit * 0.04), date: today },
    ]);
  }

  console.log("Seeding events...");
  for (const ev of EVENT_SEEDS) {
    const businessId = nameToId.get(ev.businessName);
    if (!businessId) { console.log(`  Skipped event (business not found): ${ev.businessName}`); continue; }
    const occurredAt = new Date(Date.now() - ev.hoursAgo * 60 * 60 * 1000);
    await db.insert(eventsTable).values({ businessId, text: ev.text, severity: ev.severity, occurredAt });
    console.log(`  Event [${ev.severity}]: ${ev.text.slice(0, 60)}…`);
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
