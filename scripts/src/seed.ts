import { db, businessesTable, reportsTable } from "@workspace/db";

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
    managerName: "Бобур Юсупов",
    managerEmail: "b.yusupov@silkroadlogistics.uz",
    description: "Узбекский 3PL-оператор. 87 единиц флота, 24K sqm складов, рост +28% YoY.",
    revenue: 1583333,
    orders: 234,
    profit: 205833,
  },
];

async function seed() {
  console.log("Clearing existing data...");
  await db.delete(reportsTable);
  await db.delete(businessesTable);
  console.log("  Cleared reports and businesses.");

  console.log("Seeding businesses...");

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

    console.log(`  Created: ${biz.name} (id=${inserted.id}, health=${inserted.health})`);

    const today = new Date().toISOString().slice(0, 10);

    await db.insert(reportsTable).values([
      { businessId: inserted.id, period: "month", revenue, orders, profit, date: today },
      { businessId: inserted.id, period: "week", revenue: Math.round(revenue * 0.25), orders: Math.round(orders * 0.25), profit: Math.round(profit * 0.25), date: today },
      { businessId: inserted.id, period: "day", revenue: Math.round(revenue * 0.04), orders: Math.round(orders * 0.04), profit: Math.round(profit * 0.04), date: today },
    ]);
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
