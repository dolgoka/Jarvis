export type DealStage = "active" | "hold" | "won" | "lost";

export interface BatovDeal {
  id: string;
  title: string;
  stage: DealStage;
  owner: string | null;
  partnerId: string;
  amount: string | null;
  isClosed: boolean;
  stuckDays: number | null;
  lastActivity: string;
}

export const BATOV_DEALS: BatovDeal[] = [
  {
    id: "d1",
    title: "Нефтетрейдинг ГПН — поставка Q4 2026",
    stage: "active",
    owner: null,
    partnerId: "p1",
    amount: "≈ $18M",
    isClosed: true,
    stuckDays: null,
    lastActivity: "2 дня назад",
  },
  {
    id: "d2",
    title: "Авиакеросин Тбилиси — контракт Eagle Aviation",
    stage: "hold",
    owner: null,
    partnerId: "p8",
    amount: "≈ $4.2M",
    isClosed: true,
    stuckDays: 24,
    lastActivity: "24 дня назад",
  },
  {
    id: "d3",
    title: "ВЭД-аккредитив под Грузию — АКБ ВЭД-Капитал",
    stage: "active",
    owner: "Алибек Тураров · Зам. председателя",
    partnerId: "p5",
    amount: "лимит $4M",
    isClosed: false,
    stuckDays: null,
    lastActivity: "5 дней назад",
  },
  {
    id: "d4",
    title: "Концессия контейнерного терминала СПб",
    stage: "active",
    owner: "Денис Протасов · Управляющий партнёр",
    partnerId: "p2",
    amount: "≈ $120M",
    isClosed: false,
    stuckDays: null,
    lastActivity: "вчера",
  },
  {
    id: "d5",
    title: "UBA — спонсорство баскетбол-лиги 2026/27",
    stage: "active",
    owner: null,
    partnerId: "p4",
    amount: "₽180M",
    isClosed: false,
    stuckDays: null,
    lastActivity: "3 дня назад",
  },
  {
    id: "d6",
    title: "Танкерный фрахт Балтика Q3",
    stage: "active",
    owner: null,
    partnerId: "p6",
    amount: null,
    isClosed: false,
    stuckDays: 12,
    lastActivity: "12 дней назад",
  },
];
