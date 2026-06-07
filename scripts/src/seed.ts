import { db, businessesTable, reportsTable, eventsTable } from "@workspace/db";

const BUSINESSES = [
  {
    name: "Meridian Capital Group",
    city: "Dubai",
    country: "UAE",
    lat: 25.2048,
    lng: 55.2708,
    industry: "Investment Management",
    status: "active" as const,
    health: "green" as const,
    currency: "USD",
    managerName: "Александр Вернер",
    managerEmail: "a.werner@meridiancapital.ae",
    description: "Диверсифицированная инвестиционная группа с AUM $2.1B. Фокус на PE, Real Estate и VC в регионе MENA и глобально.",
    revenue: 34700000,
    orders: 47,
    profit: 7634000,
  },
  {
    name: "NovaTech Solutions Ltd",
    city: "London",
    country: "UK",
    lat: 51.5074,
    lng: -0.1278,
    industry: "IT / SaaS",
    status: "active" as const,
    health: "green" as const,
    currency: "USD",
    managerName: "Оливер Харрис",
    managerEmail: "o.harris@novatech.io",
    description: "SaaS-платформа для автоматизации enterprise процессов. Выручка $89.2M, рост +31% YoY.",
    revenue: 7433333,
    orders: 1847,
    profit: 1040666,
  },
  {
    name: "Azure Hospitality Group",
    city: "Dubai",
    country: "UAE",
    lat: 25.1972,
    lng: 55.2796,
    industry: "Hospitality",
    status: "active" as const,
    health: "green" as const,
    currency: "USD",
    managerName: "Карим Эль-Хайям",
    managerEmail: "k.hayam@azure-hospitality.ae",
    description: "Сеть бутик-отелей премиум-класса в Дубае. 4 объекта, 705 номеров, occupancy 84.3%.",
    revenue: 3983333,
    orders: 705,
    profit: 477999,
  },
  {
    name: "Pacific Trade Partners Pte Ltd",
    city: "Singapore",
    country: "Singapore",
    lat: 1.3521,
    lng: 103.8198,
    industry: "Commodities Trading",
    status: "pending" as const,
    health: "yellow" as const,
    currency: "USD",
    managerName: "Тан Вэй Минь",
    managerEmail: "tanwm@pacifictrade.sg",
    description: "Commodity trader: пальмовое масло, каучук, металлы. Выручка $156M, маржа сжата до 3.2%.",
    revenue: 13000000,
    orders: 28,
    profit: 416000,
  },
  {
    name: "Helios Real Estate Ltd",
    city: "Limassol",
    country: "Cyprus",
    lat: 34.6841,
    lng: 33.0331,
    industry: "Real Estate",
    status: "active" as const,
    health: "green" as const,
    currency: "USD",
    managerName: "Николас Пападопулос",
    managerEmail: "n.papadopoulos@heliosre.cy",
    description: "Кипрский девелопер luxury недвижимости. AUM €185M, маржа 28%. Акцент на Лимассол.",
    revenue: 2583333,
    orders: 12,
    profit: 723333,
  },
  {
    name: "AutoDrive Systems GmbH",
    city: "Munich",
    country: "Germany",
    lat: 48.1351,
    lng: 11.582,
    industry: "Automotive Tech / AI",
    status: "pending" as const,
    health: "red" as const,
    currency: "USD",
    managerName: "Маркус Браун",
    managerEmail: "m.braun@autodrive.de",
    description: "ADAS L3+ стартап. Burn rate €650K/мес, runway 14 мес. Series A на €15M в процессе.",
    revenue: 683333,
    orders: 3,
    profit: -287000,
  },
  {
    name: "Atlas Digital Agency",
    city: "New York",
    country: "USA",
    lat: 40.7128,
    lng: -74.006,
    industry: "Digital Marketing",
    status: "active" as const,
    health: "green" as const,
    currency: "USD",
    managerName: "Michael Torres",
    managerEmail: "m.torres@atlasdigital.com",
    description: "Performance digital агентство. Managed ad spend $180M/год, 67 клиентов, ROAS 4.2x.",
    revenue: 2366666,
    orders: 67,
    profit: 425999,
  },
  {
    name: "SkyLine Construction LLC",
    city: "Dubai",
    country: "UAE",
    lat: 25.2048,
    lng: 55.2708,
    industry: "Construction",
    status: "active" as const,
    health: "green" as const,
    currency: "USD",
    managerName: "Abdullah Al-Maktoum",
    managerEmail: "a.almaktoum@skylineconstruction.ae",
    description: "Ведущий генподрядчик в Дубае. Backlog $780M, 2847 сотрудников, 14 активных проектов.",
    revenue: 26000000,
    orders: 14,
    profit: 2340000,
  },
  {
    name: "Северный Капитал АО",
    city: "Moscow",
    country: "Russia",
    lat: 55.7558,
    lng: 37.6173,
    industry: "Asset Management",
    status: "pending" as const,
    health: "yellow" as const,
    currency: "USD",
    managerName: "Андрей Северов",
    managerEmail: "a.severov@severkapital.ru",
    description: "Российская УК, AUM ₽142B. Работает в условиях санкционного давления с 2022 года.",
    revenue: 1533333,
    orders: 847,
    profit: 168666,
  },
  {
    name: "Колымские Недра АО",
    city: "Magadan",
    country: "Russia",
    lat: 59.5635,
    lng: 150.8082,
    industry: "Mining",
    status: "active" as const,
    health: "yellow" as const,
    currency: "USD",
    managerName: "Виктор Колымцев",
    managerEmail: "v.kolymtsev@kn-ao.ru",
    description: "Золото-серебряный добытчик. 4.2 т/год, AISC $980/oz, рентабельность 31%.",
    revenue: 650000,
    orders: 12,
    profit: 201500,
  },
  {
    name: "Siam Pacific Foods Co Ltd",
    city: "Bangkok",
    country: "Thailand",
    lat: 13.7563,
    lng: 100.5018,
    industry: "Food & Agriculture",
    status: "active" as const,
    health: "green" as const,
    currency: "USD",
    managerName: "Somchai Wattanaprapa",
    managerEmail: "s.wattanaprapa@siampacific.th",
    description: "Тайский производитель и экспортёр. 28 экспортных рынков, 64% выручки — экспорт.",
    revenue: 5583333,
    orders: 412,
    profit: 446666,
  },
  {
    name: "TajEnergo JSC",
    city: "Dushanbe",
    country: "Tajikistan",
    lat: 38.5598,
    lng: 68.7737,
    industry: "Energy",
    status: "pending" as const,
    health: "red" as const,
    currency: "USD",
    managerName: "Фируз Рахимов",
    managerEmail: "f.rakhimov@tajenergo.tj",
    description: "Таджикская энергетическая компания. 180 МВт, гидро 78%. Регулируемые тарифы.",
    revenue: 2833333,
    orders: 847,
    profit: 113333,
  },
  {
    name: "SilkRoad Logistics LLC",
    city: "Tashkent",
    country: "Uzbekistan",
    lat: 41.2995,
    lng: 69.2401,
    industry: "Logistics",
    status: "active" as const,
    health: "red" as const,
    currency: "USD",
    managerName: "Бобур Юсупов",
    managerEmail: "b.yusupov@silkroadlogistics.uz",
    description: "Узбекский 3PL-оператор. 87 единиц флота, 24K sqm складов, рост +28% YoY.",
    revenue: 1583333,
    orders: 234,
    profit: 205833,
  },
  {
    name: "Profimonsters",
    city: "Moscow",
    country: "Russia",
    lat: 55.7439,
    lng: 37.6207,
    industry: "Logistics / HRtech",
    status: "active" as const,
    health: "yellow" as const,
    currency: "RUB",
    managerName: "Мурашов Виталий Владимирович",
    managerEmail: "v.murashov@profimonsters.ru",
    description: "ООО «Деливери Солюшенс», торговая марка PROFIMONSTERS. Аутсорсинг персонала, курьерская доставка, логистика для e-commerce. Выручка 5,46 млрд ₽ (+111% YoY), рентабельность 0,3%.",
    revenue: 5460000000,
    orders: 0,
    profit: 17490000,
  },
];

// Events: keyed by business name for lookup after insert
const EVENT_SEEDS: Array<{
  businessName: string;
  text: string;
  severity: "critical" | "warning" | "info";
  hoursAgo: number;
}> = [
  // critical — red health: AutoDrive, TajEnergo, SilkRoad
  { businessName: "AutoDrive Systems GmbH",    text: "AutoDrive Systems: runway 14 мес, burn €650K/мес — узел на критическом уровне", severity: "critical", hoursAgo: 1 },
  { businessName: "TajEnergo JSC",             text: "TajEnergo не присылал отчёт 3 недели — связь с узлом потеряна", severity: "critical", hoursAgo: 3 },
  { businessName: "SilkRoad Logistics LLC",    text: "SilkRoad Logistics: ключевые контракты под угрозой — критическая задержка", severity: "critical", hoursAgo: 5 },
  // warning — yellow health: Pacific Trade, Северный Капитал, Колымские Недра, Profimonsters
  { businessName: "Profimonsters",             text: "Profimonsters: оборот растёт (+111%), но рентабельность низкая — 0,3%", severity: "warning", hoursAgo: 2 },
  { businessName: "Колымские Недра АО",        text: "Колымские Недра: задержка поставки оборудования, добыча замедлена", severity: "warning", hoursAgo: 4 },
  { businessName: "Pacific Trade Partners Pte Ltd", text: "Pacific Trade Partners: маржа сжалась до 3.2% — ниже порогового значения", severity: "warning", hoursAgo: 8 },
  { businessName: "Северный Капитал АО",       text: "Северный Капитал: задержка регуляторного одобрения нового фонда", severity: "warning", hoursAgo: 14 },
  // info — green health: Meridian, NovaTech, Azure, Helios, Atlas, SkyLine, Siam Pacific
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
    const { revenue, orders, profit, ...bizRest } = biz;

    const [inserted] = await db
      .insert(businessesTable)
      .values({ ...bizRest, managerId: 0 })
      .returning();

    if (!inserted) {
      console.log(`  Failed to insert: ${biz.name}`);
      continue;
    }

    nameToId.set(biz.name, inserted.id);
    console.log(`  Created: ${biz.name} (id=${inserted.id}, health=${inserted.health}, currency=${inserted.currency})`);

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
    if (!businessId) {
      console.log(`  Skipped event (business not found): ${ev.businessName}`);
      continue;
    }
    const occurredAt = new Date(Date.now() - ev.hoursAgo * 60 * 60 * 1000);
    await db.insert(eventsTable).values({ businessId, text: ev.text, severity: ev.severity, occurredAt });
    console.log(`  Event [${ev.severity}]: ${ev.text.slice(0, 60)}…`);
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
