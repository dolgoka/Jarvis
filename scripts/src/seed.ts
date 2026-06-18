import { count } from "drizzle-orm";
import { db, businessesTable, reportsTable, eventsTable } from "@workspace/db";

type PlanFactItem = {
  metric: string;
  plan: number;
  actual: number;
  unit: string;
  lowerIsBetter?: boolean;
};

type MonthlyPoint = {
  month: string;
  revenuePlan: number; revenueFact: number;
  ebitdaPlan: number; ebitdaFact: number;
  netProfitPlan: number; netProfitFact: number;
  cashFlowPlan: number; cashFlowFact: number;
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
  monthlyHistory?: MonthlyPoint[];
  recommendation?: string;
  balanceChange?: {
    equity:  { start: number; end: number };
    debt:    { start: number; end: number };
    profit:  { start: number; end: number; plan: number };
  };
  investmentData?: {
    runwayMonths: number;
    burnRateMonthly: number;
    burnRatePrevious?: number;
    cashOnHand: number;
    fundingRounds: Array<{ date: string; amount: number; round: string }>;
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
    managerName: "Александр Вернер", managerEmail: "a.werner@example.com",
    description: "Диверсифицированная инвестиционная группа с AUM $2.1B. Фокус на PE, Real Estate и VC в регионе MENA и глобально.",
    revenue: 34700000, orders: 47, profit: 7634000,
    analytics: {
      ...minimalAnalytics("Александр Вернер", "Managing Partner", "green", 34700000, 7634000, "USD", "investment", "internal",
        "Все KPI в норме: AUM $2.1B, доходность портфеля 22% YoY, дивиденды выплачены в срок"),
      investmentData: {
        runwayMonths: 15,
        burnRateMonthly: 1850000,
        burnRatePrevious: 1920000,
        cashOnHand: 28500000,
        fundingRounds: [
          { date: "2021-06", amount: 45000000, round: "Fund I Close" },
          { date: "2022-03", amount: 120000000, round: "Fund II Close" },
          { date: "2023-09", amount: 85000000, round: "RE Fund Close" },
          { date: "2024-06", amount: 210000000, round: "Fund III Close" },
          { date: "2025-01", amount: 95000000, round: "Co-invest SPV" },
        ],
      },
    },
  },
  {
    name: "NovaTech Solutions Ltd",
    city: "London", country: "UK", lat: 51.5074, lng: -0.1278,
    industry: "IT / SaaS", status: "active", health: "green", currency: "USD",
    managerName: "Оливер Харрис", managerEmail: "o.harris@example.com",
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
      recommendation: "Ускорить EU-экспансию пока конкуренты не закрыли окно — квартальный рост +31% создаёт уникальный момент.",
      monthlyHistory: [
        { month: "Янв", revenuePlan: 6800000, revenueFact: 6950000, ebitdaPlan: 920000, ebitdaFact: 973000, netProfitPlan: 940000, netProfitFact: 960000, cashFlowPlan: 780000, cashFlowFact: 850000 },
        { month: "Фев", revenuePlan: 6900000, revenueFact: 7050000, ebitdaPlan: 935000, ebitdaFact: 987000, netProfitPlan: 950000, netProfitFact: 975000, cashFlowPlan: 790000, cashFlowFact: 860000 },
        { month: "Мар", revenuePlan: 7000000, revenueFact: 7150000, ebitdaPlan: 950000, ebitdaFact: 1001000, netProfitPlan: 980000, netProfitFact: 995000, cashFlowPlan: 800000, cashFlowFact: 875000 },
        { month: "Апр", revenuePlan: 7050000, revenueFact: 7200000, ebitdaPlan: 960000, ebitdaFact: 1008000, netProfitPlan: 985000, netProfitFact: 1010000, cashFlowPlan: 810000, cashFlowFact: 890000 },
        { month: "Май", revenuePlan: 7100000, revenueFact: 7320000, ebitdaPlan: 965000, ebitdaFact: 1025000, netProfitPlan: 990000, netProfitFact: 1025000, cashFlowPlan: 820000, cashFlowFact: 905000 },
        { month: "Июн", revenuePlan: 7000000, revenueFact: 7433333, ebitdaPlan: 950000, ebitdaFact: 1040000, netProfitPlan: 980000, netProfitFact: 1040666, cashFlowPlan: 800000, cashFlowFact: 920000 },
      ],
      balanceChange: {
        equity:  { start: 9_800_000, end: 11_300_000 },
        debt:    { start: 8_400_000, end: 7_200_000 },
        profit:  { start: 2_300_000, end: 5_375_700, plan: 2_940_000 },
      },
    },
  },
  {
    name: "Azure Hospitality Group",
    city: "Dubai", country: "UAE", lat: 25.1972, lng: 55.2796,
    industry: "Hospitality", status: "active", health: "green", currency: "USD",
    managerName: "Карим Эль-Хайям", managerEmail: "k.hayam@example.com",
    description: "Сеть бутик-отелей премиум-класса в Дубае. 4 объекта, 705 номеров, occupancy 84.3%.",
    revenue: 3983333, orders: 705, profit: 477999,
    analytics: {
      ...minimalAnalytics("Карим Эль-Хайям", "General Manager", "green", 3983333, 477999, "USD", "operational", "external",
        "Загрузка отелей 84.3% — рекорд квартала, выручка превышает план на 7%"),
      recommendation: "Запустить программу лояльности — удержать 84% загрузку в низкий сезон и повысить RevPAR.",
      monthlyHistory: [
        { month: "Янв", revenuePlan: 3700000, revenueFact: 3750000, ebitdaPlan: 440000, ebitdaFact: 450000, netProfitPlan: 420000, netProfitFact: 430000, cashFlowPlan: 360000, cashFlowFact: 380000 },
        { month: "Фев", revenuePlan: 3720000, revenueFact: 3800000, ebitdaPlan: 445000, ebitdaFact: 460000, netProfitPlan: 425000, netProfitFact: 440000, cashFlowPlan: 365000, cashFlowFact: 385000 },
        { month: "Мар", revenuePlan: 3750000, revenueFact: 3860000, ebitdaPlan: 450000, ebitdaFact: 465000, netProfitPlan: 430000, netProfitFact: 450000, cashFlowPlan: 370000, cashFlowFact: 395000 },
        { month: "Апр", revenuePlan: 3780000, revenueFact: 3900000, ebitdaPlan: 455000, ebitdaFact: 470000, netProfitPlan: 435000, netProfitFact: 460000, cashFlowPlan: 375000, cashFlowFact: 405000 },
        { month: "Май", revenuePlan: 3800000, revenueFact: 3950000, ebitdaPlan: 460000, ebitdaFact: 475000, netProfitPlan: 440000, netProfitFact: 468000, cashFlowPlan: 380000, cashFlowFact: 412000 },
        { month: "Июн", revenuePlan: 3700000, revenueFact: 3983333, ebitdaPlan: 450000, ebitdaFact: 480000, netProfitPlan: 430000, netProfitFact: 477999, cashFlowPlan: 380000, cashFlowFact: 420000 },
      ],
      balanceChange: {
        equity:  { start: 4_600_000, end: 4_900_000 },
        debt:    { start: 5_800_000, end: 6_200_000 },
        profit:  { start: 800_000, end: 2_206_000, plan: 1_290_000 },
      },
    },
  },
  {
    name: "Pacific Trade Partners Pte Ltd",
    city: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198,
    industry: "Commodities Trading", status: "pending", health: "yellow", currency: "USD",
    managerName: "Тан Вэй Минь", managerEmail: "tanwm@example.com",
    description: "Commodity trader: пальмовое масло, каучук, металлы. Выручка $156M, маржа сжата до 3.2%.",
    revenue: 13000000, orders: 28, profit: 416000,
    analytics: {
      ...minimalAnalytics("Тан Вэй Минь", "Managing Director", "yellow", 13000000, 416000, "USD", "operational", "external",
        "Маржа сжалась до 3.2% — ниже порогового значения 5%, волатильность сырьевых рынков давит на прибыль"),
      recommendation: "Пересмотреть контрактный портфель и зафиксировать цены по ключевым позициям — остановить дальнейшее сжатие маржи.",
      monthlyHistory: [
        { month: "Янв", revenuePlan: 14500000, revenueFact: 14200000, ebitdaPlan: 700000, ebitdaFact: 600000, netProfitPlan: 650000, netProfitFact: 560000, cashFlowPlan: 550000, cashFlowFact: 450000 },
        { month: "Фев", revenuePlan: 14200000, revenueFact: 13800000, ebitdaPlan: 680000, ebitdaFact: 520000, netProfitPlan: 630000, netProfitFact: 480000, cashFlowPlan: 540000, cashFlowFact: 400000 },
        { month: "Мар", revenuePlan: 14000000, revenueFact: 13600000, ebitdaPlan: 660000, ebitdaFact: 470000, netProfitPlan: 610000, netProfitFact: 440000, cashFlowPlan: 520000, cashFlowFact: 380000 },
        { month: "Апр", revenuePlan: 13800000, revenueFact: 13400000, ebitdaPlan: 640000, ebitdaFact: 445000, netProfitPlan: 590000, netProfitFact: 425000, cashFlowPlan: 510000, cashFlowFact: 365000 },
        { month: "Май", revenuePlan: 13500000, revenueFact: 13100000, ebitdaPlan: 620000, ebitdaFact: 425000, netProfitPlan: 570000, netProfitFact: 418000, cashFlowPlan: 500000, cashFlowFact: 355000 },
        { month: "Июн", revenuePlan: 14000000, revenueFact: 13000000, ebitdaPlan: 700000, ebitdaFact: 416000, netProfitPlan: 650000, netProfitFact: 416000, cashFlowPlan: 600000, cashFlowFact: 350000 },
      ],
      balanceChange: {
        equity:  { start: 3_400_000, end: 3_100_000 },
        debt:    { start: 8_800_000, end: 9_800_000 },
        profit:  { start: 1_700_000, end: 2_959_000, plan: 1_950_000 },
      },
    },
  },
  {
    name: "Helios Real Estate Ltd",
    city: "Limassol", country: "Cyprus", lat: 34.6841, lng: 33.0331,
    industry: "Real Estate", status: "active", health: "green", currency: "USD",
    managerName: "Николас Пападопулос", managerEmail: "n.papadopoulos@example.com",
    description: "Кипрский девелопер luxury недвижимости. AUM €185M, маржа 28%. Акцент на Лимассол.",
    revenue: 2583333, orders: 12, profit: 723333,
    analytics: {
      ...minimalAnalytics("Николас Пападопулос", "CEO", "green", 2583333, 723333, "USD", "investment", "external",
        "Маржа 28% стабильна, все сделки закрыты в срок, AUM €185M растёт"),
      investmentData: {
        runwayMonths: 13,
        burnRateMonthly: 620000,
        burnRatePrevious: 650000,
        cashOnHand: 8200000,
        fundingRounds: [
          { date: "2020-11", amount: 22000000, round: "Equity Raise" },
          { date: "2022-04", amount: 48000000, round: "Fund II" },
          { date: "2023-08", amount: 35000000, round: "Debt Facility" },
          { date: "2024-11", amount: 80000000, round: "Fund III" },
        ],
      },
    },
  },
  {
    name: "AutoDrive Systems GmbH",
    city: "Munich", country: "Germany", lat: 48.1351, lng: 11.582,
    industry: "Automotive Tech / AI", status: "pending", health: "red", currency: "USD",
    managerName: "Маркус Браун", managerEmail: "m.braun@example.com",
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
      investmentData: {
        runwayMonths: 14,
        burnRateMonthly: 650000,
        burnRatePrevious: 580000,
        cashOnHand: 9100000,
        fundingRounds: [
          { date: "2022-09", amount: 3500000, round: "Seed" },
          { date: "2023-06", amount: 5000000, round: "Pre-Series A" },
          { date: "2025-03", amount: 6500000, round: "Series A*" },
        ],
      },
    },
  },
  {
    name: "Atlas Digital Agency",
    city: "New York", country: "USA", lat: 40.7128, lng: -74.006,
    industry: "Digital Marketing", status: "active", health: "green", currency: "USD",
    managerName: "Michael Torres", managerEmail: "m.torres@example.com",
    description: "Performance digital агентство. Managed ad spend $180M/год, 67 клиентов, ROAS 4.2x.",
    revenue: 2366666, orders: 67, profit: 425999,
    analytics: {
      ...minimalAnalytics("Michael Torres", "CEO", "green", 2366666, 425999, "USD", "operational", "external",
        "ROAS 4.2x превышает бенчмарк, все 67 клиентов продлили контракты"),
      recommendation: "Нанять второго аккаунт-менеджера под рост managed spend — очередь из новых клиентов создаёт риск упущенной выручки.",
      monthlyHistory: [
        { month: "Янв", revenuePlan: 2100000, revenueFact: 2150000, ebitdaPlan: 360000, ebitdaFact: 375000, netProfitPlan: 350000, netProfitFact: 370000, cashFlowPlan: 300000, cashFlowFact: 320000 },
        { month: "Фев", revenuePlan: 2150000, revenueFact: 2200000, ebitdaPlan: 365000, ebitdaFact: 385000, netProfitPlan: 355000, netProfitFact: 380000, cashFlowPlan: 305000, cashFlowFact: 335000 },
        { month: "Мар", revenuePlan: 2180000, revenueFact: 2240000, ebitdaPlan: 370000, ebitdaFact: 395000, netProfitPlan: 360000, netProfitFact: 390000, cashFlowPlan: 310000, cashFlowFact: 350000 },
        { month: "Апр", revenuePlan: 2200000, revenueFact: 2300000, ebitdaPlan: 375000, ebitdaFact: 410000, netProfitPlan: 365000, netProfitFact: 405000, cashFlowPlan: 315000, cashFlowFact: 365000 },
        { month: "Май", revenuePlan: 2220000, revenueFact: 2340000, ebitdaPlan: 380000, ebitdaFact: 420000, netProfitPlan: 370000, netProfitFact: 415000, cashFlowPlan: 320000, cashFlowFact: 378000 },
        { month: "Июн", revenuePlan: 2200000, revenueFact: 2366666, ebitdaPlan: 380000, ebitdaFact: 430000, netProfitPlan: 370000, netProfitFact: 425999, cashFlowPlan: 320000, cashFlowFact: 390000 },
      ],
      balanceChange: {
        equity:  { start: 1_700_000, end: 2_000_000 },
        debt:    { start: 920_000, end: 800_000 },
        profit:  { start: 620_000, end: 1_866_000, plan: 1_110_000 },
      },
    },
  },
  {
    name: "SkyLine Construction LLC",
    city: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708,
    industry: "Construction", status: "active", health: "green", currency: "USD",
    managerName: "Abdullah Al-Maktoum", managerEmail: "a.almaktoum@example.com",
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
      investmentData: {
        runwayMonths: 13,
        burnRateMonthly: 3200000,
        burnRatePrevious: 3400000,
        cashOnHand: 42000000,
        fundingRounds: [
          { date: "2021-03", amount: 50000000, round: "Project Finance" },
          { date: "2022-08", amount: 120000000, round: "Syndicated Loan" },
          { date: "2023-11", amount: 85000000, round: "Equity Drawdown" },
          { date: "2024-05", amount: 200000000, round: "Project Finance II" },
          { date: "2025-02", amount: 150000000, round: "Bridge Facility" },
        ],
      },
    },
  },
  {
    name: "Северный Капитал АО",
    city: "Moscow", country: "Russia", lat: 55.7558, lng: 37.6173,
    industry: "Asset Management", status: "pending", health: "yellow", currency: "USD",
    managerName: "Андрей Киселёв", managerEmail: "a.kiselev@example.com",
    description: "Российская УК, AUM ₽142B. Работает в условиях санкционного давления с 2022 года.",
    revenue: 1533333, orders: 847, profit: 168666,
    analytics: {
      ...minimalAnalytics("Андрей Киселёв", "Генеральный директор", "yellow", 1533333, 168666, "USD", "investment", "external",
        "Задержка регуляторного одобрения нового фонда, санкционное давление ограничивает операции"),
      investmentData: {
        runwayMonths: 11,
        burnRateMonthly: 410000,
        burnRatePrevious: 380000,
        cashOnHand: 4800000,
        fundingRounds: [
          { date: "2021-07", amount: 8500000, round: "Привлечение LP" },
          { date: "2022-10", amount: 12000000, round: "Фонд II" },
          { date: "2023-05", amount: 6000000, round: "Co-invest" },
          { date: "2024-09", amount: 4200000, round: "Допфинансирование" },
        ],
      },
    },
  },
  {
    name: "Колымские Недра АО",
    city: "Magadan", country: "Russia", lat: 59.5635, lng: 150.8082,
    industry: "Mining", status: "active", health: "yellow", currency: "USD",
    managerName: "Виктор Морозов", managerEmail: "v.morozov@example.com",
    description: "Золото-серебряный добытчик. 4.2 т/год, AISC $980/oz, рентабельность 31%.",
    revenue: 650000, orders: 12, profit: 201500,
    analytics: {
      ...minimalAnalytics("Виктор Морозов", "Директор", "yellow", 650000, 201500, "USD", "operational", "external",
        "Задержка поставки оборудования замедляет добычу, AISC $980/oz выше планового $920/oz"),
      recommendation: "Форсировать поставку через альтернативного вендора — каждая неделя простоя стоит $25K недополученной добычи.",
      monthlyHistory: [
        { month: "Янв", revenuePlan: 750000, revenueFact: 740000, ebitdaPlan: 240000, ebitdaFact: 235000, netProfitPlan: 240000, netProfitFact: 235000, cashFlowPlan: 210000, cashFlowFact: 205000 },
        { month: "Фев", revenuePlan: 750000, revenueFact: 720000, ebitdaPlan: 240000, ebitdaFact: 228000, netProfitPlan: 240000, netProfitFact: 228000, cashFlowPlan: 210000, cashFlowFact: 198000 },
        { month: "Мар", revenuePlan: 750000, revenueFact: 700000, ebitdaPlan: 240000, ebitdaFact: 218000, netProfitPlan: 240000, netProfitFact: 218000, cashFlowPlan: 210000, cashFlowFact: 190000 },
        { month: "Апр", revenuePlan: 750000, revenueFact: 680000, ebitdaPlan: 240000, ebitdaFact: 210000, netProfitPlan: 240000, netProfitFact: 210000, cashFlowPlan: 210000, cashFlowFact: 183000 },
        { month: "Май", revenuePlan: 750000, revenueFact: 660000, ebitdaPlan: 240000, ebitdaFact: 205000, netProfitPlan: 240000, netProfitFact: 205000, cashFlowPlan: 210000, cashFlowFact: 177000 },
        { month: "Июн", revenuePlan: 750000, revenueFact: 650000, ebitdaPlan: 240000, ebitdaFact: 200000, netProfitPlan: 240000, netProfitFact: 201500, cashFlowPlan: 210000, cashFlowFact: 170000 },
      ],
      balanceChange: {
        equity:  { start: 680_000, end: 730_000 },
        debt:    { start: 490_000, end: 520_000 },
        profit:  { start: 380_000, end: 996_500, plan: 720_000 },
      },
    },
  },
  {
    name: "Siam Pacific Foods Co Ltd",
    city: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018,
    industry: "Food & Agriculture", status: "active", health: "green", currency: "USD",
    managerName: "Somchai Wattanaprapa", managerEmail: "s.wattanaprapa@example.com",
    description: "Тайский производитель и экспортёр. 28 экспортных рынков, 64% выручки — экспорт.",
    revenue: 5583333, orders: 412, profit: 446666,
    analytics: {
      ...minimalAnalytics("Somchai Wattanaprapa", "CEO", "green", 5583333, 446666, "USD", "operational", "external",
        "Экспорт +12% — открыт новый рынок в Европе, 28 рынков сбыта, все показатели в плане"),
      recommendation: "Удвоить квоту по новому европейскому рынку, пока конкуренты не перехватили полку.",
      monthlyHistory: [
        { month: "Янв", revenuePlan: 4800000, revenueFact: 4900000, ebitdaPlan: 360000, ebitdaFact: 370000, netProfitPlan: 340000, netProfitFact: 350000, cashFlowPlan: 290000, cashFlowFact: 305000 },
        { month: "Фев", revenuePlan: 4900000, revenueFact: 5050000, ebitdaPlan: 370000, ebitdaFact: 385000, netProfitPlan: 350000, netProfitFact: 365000, cashFlowPlan: 300000, cashFlowFact: 320000 },
        { month: "Мар", revenuePlan: 5000000, revenueFact: 5150000, ebitdaPlan: 380000, ebitdaFact: 400000, netProfitPlan: 360000, netProfitFact: 380000, cashFlowPlan: 310000, cashFlowFact: 335000 },
        { month: "Апр", revenuePlan: 5100000, revenueFact: 5300000, ebitdaPlan: 390000, ebitdaFact: 420000, netProfitPlan: 370000, netProfitFact: 400000, cashFlowPlan: 320000, cashFlowFact: 355000 },
        { month: "Май", revenuePlan: 5200000, revenueFact: 5450000, ebitdaPlan: 400000, ebitdaFact: 440000, netProfitPlan: 380000, netProfitFact: 425000, cashFlowPlan: 330000, cashFlowFact: 375000 },
        { month: "Июн", revenuePlan: 5100000, revenueFact: 5583333, ebitdaPlan: 380000, ebitdaFact: 450000, netProfitPlan: 370000, netProfitFact: 446666, cashFlowPlan: 330000, cashFlowFact: 400000 },
      ],
      balanceChange: {
        equity:  { start: 2_400_000, end: 2_700_000 },
        debt:    { start: 4_400_000, end: 4_200_000 },
        profit:  { start: 1_100_000, end: 2_371_700, plan: 1_110_000 },
      },
    },
  },
  {
    name: "TajEnergo JSC",
    city: "Dushanbe", country: "Tajikistan", lat: 38.5598, lng: 68.7737,
    industry: "Energy", status: "pending", health: "red", currency: "USD",
    managerName: "Фируз Рахимов", managerEmail: "f.rakhimov@example.com",
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
      recommendation: "Выйти на регулятора с обоснованием повышения тарифа и восстановить регулярную отчётность — узел слепой уже 3 недели.",
      monthlyHistory: [
        { month: "Янв", revenuePlan: 3200000, revenueFact: 3100000, ebitdaPlan: 400000, ebitdaFact: 300000, netProfitPlan: 350000, netProfitFact: 280000, cashFlowPlan: 300000, cashFlowFact: 220000 },
        { month: "Фев", revenuePlan: 3200000, revenueFact: 3000000, ebitdaPlan: 400000, ebitdaFact: 250000, netProfitPlan: 350000, netProfitFact: 230000, cashFlowPlan: 300000, cashFlowFact: 180000 },
        { month: "Мар", revenuePlan: 3200000, revenueFact: 2950000, ebitdaPlan: 400000, ebitdaFact: 200000, netProfitPlan: 350000, netProfitFact: 190000, cashFlowPlan: 300000, cashFlowFact: 150000 },
        { month: "Апр", revenuePlan: 3200000, revenueFact: 2900000, ebitdaPlan: 400000, ebitdaFact: 165000, netProfitPlan: 350000, netProfitFact: 155000, cashFlowPlan: 300000, cashFlowFact: 115000 },
        { month: "Май", revenuePlan: 3200000, revenueFact: 2870000, ebitdaPlan: 400000, ebitdaFact: 135000, netProfitPlan: 350000, netProfitFact: 130000, cashFlowPlan: 300000, cashFlowFact: 95000 },
        { month: "Июн", revenuePlan: 3200000, revenueFact: 2833333, ebitdaPlan: 400000, ebitdaFact: 113333, netProfitPlan: 400000, netProfitFact: 113333, cashFlowPlan: 350000, cashFlowFact: 85000 },
      ],
      balanceChange: {
        equity:  { start: 17_000_000, end: 17_200_000 },
        debt:    { start: 27_500_000, end: 28_000_000 },
        profit:  { start: 1_500_000, end: 1_898_300, plan: 1_050_000 },
      },
    },
  },
  {
    name: "SilkRoad Logistics LLC",
    city: "Tashkent", country: "Uzbekistan", lat: 41.2995, lng: 69.2401,
    industry: "Logistics", status: "active", health: "red", currency: "USD",
    managerName: "Бобур Юсупов", managerEmail: "b.yusupov@example.com",
    description: "Узбекский 3PL-оператор. 87 единиц флота, 24K sqm складов, рост +28% YoY.",
    revenue: 1583333, orders: 234, profit: 205833,
    analytics: {
      ...minimalAnalytics("Бобур Юсупов", "Генеральный директор", "red", 1583333, 205833, "USD", "operational", "external",
        "Ключевые контракты под угрозой: задержка поставок критична, клиент X запустил тендер на замену"),
      recommendation: "Лично встретиться с клиентом X этой неделей — предотвратить потерю контракта до завершения тендера.",
      monthlyHistory: [
        { month: "Янв", revenuePlan: 1800000, revenueFact: 1850000, ebitdaPlan: 290000, ebitdaFact: 310000, netProfitPlan: 265000, netProfitFact: 285000, cashFlowPlan: 240000, cashFlowFact: 260000 },
        { month: "Фев", revenuePlan: 1800000, revenueFact: 1780000, ebitdaPlan: 290000, ebitdaFact: 280000, netProfitPlan: 265000, netProfitFact: 260000, cashFlowPlan: 240000, cashFlowFact: 230000 },
        { month: "Мар", revenuePlan: 1800000, revenueFact: 1720000, ebitdaPlan: 290000, ebitdaFact: 250000, netProfitPlan: 265000, netProfitFact: 240000, cashFlowPlan: 240000, cashFlowFact: 210000 },
        { month: "Апр", revenuePlan: 1800000, revenueFact: 1680000, ebitdaPlan: 290000, ebitdaFact: 235000, netProfitPlan: 265000, netProfitFact: 225000, cashFlowPlan: 240000, cashFlowFact: 195000 },
        { month: "Май", revenuePlan: 1800000, revenueFact: 1620000, ebitdaPlan: 290000, ebitdaFact: 220000, netProfitPlan: 265000, netProfitFact: 210000, cashFlowPlan: 240000, cashFlowFact: 185000 },
        { month: "Июн", revenuePlan: 1800000, revenueFact: 1583333, ebitdaPlan: 290000, ebitdaFact: 210000, netProfitPlan: 265000, netProfitFact: 205833, cashFlowPlan: 240000, cashFlowFact: 180000 },
      ],
      balanceChange: {
        equity:  { start: 560_000, end: 610_000 },
        debt:    { start: 900_000, end: 960_000 },
        profit:  { start: 230_000, end: 870_800, plan: 960_000 },
      },
    },
  },
  {
    name: "Profimonsters",
    city: "Moscow", country: "Russia", lat: 55.7439, lng: 37.6207,
    industry: "Logistics / HRtech", status: "active", health: "yellow", currency: "RUB",
    managerName: "Дмитрий Горелов", managerEmail: "d.gorelov@example.com",
    description: "ООО «Деливери Солюшенс», торговая марка PROFIMONSTERS. Аутсорсинг персонала, курьерская доставка, логистика для e-commerce. Выручка 5,46 млрд ₽ (+111% YoY), рентабельность 0,3%.",
    revenue: 5460000000, orders: 0, profit: 17490000,
    analytics: {
      stage: "operational",
      contour: "external",
      responsible: { name: "Дмитрий Горелов", role: "Генеральный директор" },
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
          "Себестоимость (прямые операционные)": 2750000000,
          "Валовая прибыль": 2710000000,
          "Коммерческие расходы": 2400000000,
          "Административные расходы": 265000000,
          "EBITDA": 45000000,
          "Амортизация": 18000000,
          "EBIT": 27000000,
          "Налог + прочее": 9510000,
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
      recommendation: "Провести срочный cost review: при обороте ₽5.46 млрд и марже 0.3% нужно срезать операционные расходы на 5–8%.",
      monthlyHistory: [
        { month: "Янв", revenuePlan: 5200000000, revenueFact: 4800000000, ebitdaPlan: 120000000, ebitdaFact: 80000000, netProfitPlan: 50000000, netProfitFact: 32000000, cashFlowPlan: 30000000, cashFlowFact: 22000000 },
        { month: "Фев", revenuePlan: 5200000000, revenueFact: 5000000000, ebitdaPlan: 120000000, ebitdaFact: 70000000, netProfitPlan: 50000000, netProfitFact: 28000000, cashFlowPlan: 30000000, cashFlowFact: 18000000 },
        { month: "Мар", revenuePlan: 5200000000, revenueFact: 5150000000, ebitdaPlan: 120000000, ebitdaFact: 60000000, netProfitPlan: 50000000, netProfitFact: 24000000, cashFlowPlan: 30000000, cashFlowFact: 15000000 },
        { month: "Апр", revenuePlan: 5200000000, revenueFact: 5280000000, ebitdaPlan: 120000000, ebitdaFact: 52000000, netProfitPlan: 50000000, netProfitFact: 20000000, cashFlowPlan: 30000000, cashFlowFact: 13000000 },
        { month: "Май", revenuePlan: 5200000000, revenueFact: 5380000000, ebitdaPlan: 120000000, ebitdaFact: 48000000, netProfitPlan: 50000000, netProfitFact: 18500000, cashFlowPlan: 30000000, cashFlowFact: 12500000 },
        { month: "Июн", revenuePlan: 5200000000, revenueFact: 5460000000, ebitdaPlan: 120000000, ebitdaFact: 45000000, netProfitPlan: 50000000, netProfitFact: 17490000, cashFlowPlan: 30000000, cashFlowFact: 12000000 },
      ],
      balanceChange: {
        equity:  { start: 95_000_000, end: 110_000_000 },
        debt:    { start: 745_000_000, end: 780_000_000 },
        profit:  { start: 54_010_000, end: 110_000_000, plan: 150_000_000 },
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
  const [row] = await db.select({ n: count() }).from(businessesTable);
  if ((row?.n ?? 0) > 0) {
    console.log(`Businesses already seeded (${row!.n} rows) — skipping.`);
    process.exit(0);
  }

  console.log("Seeding fresh DB...");

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
