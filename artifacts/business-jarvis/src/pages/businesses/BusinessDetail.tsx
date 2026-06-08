import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Shell } from "@/components/layout/Shell";
import {
  useGetBusiness,
  getGetBusinessQueryKey,
  useListReports,
  getListReportsQueryKey,
  type ListReportsPeriod,
} from "@workspace/api-client-react";
import {
  Loader2, ArrowLeft, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, Users, Briefcase, Building2,
  MapPin, Flag,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

// ── Design tokens ─────────────────────────────────────────────────────────────
const HC = { green: "#3ed9a0", yellow: "#f0b54a", red: "#f0625a" };
const HF = "'Hanken Grotesk', system-ui, sans-serif";
const TEXT = { hi: "rgba(228,232,255,0.92)", mid: "rgba(228,232,255,0.65)", lo: "rgba(228,232,255,0.45)", dim: "rgba(228,232,255,0.30)" };

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Money helpers ──────────────────────────────────────────────────────────────
function formatMoney(value: number, currency: string, compact = false): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (currency === "RUB") {
    if (compact) {
      if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)} млрд ₽`;
      if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)} млн ₽`;
      if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)} тыс ₽`;
      return `${sign}${abs.toLocaleString("ru-RU")} ₽`;
    }
    return `${sign}${abs.toLocaleString("ru-RU")} ₽`;
  }
  if (compact) {
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
    return `${sign}$${abs.toLocaleString("en-US")}`;
  }
  return `${sign}$${abs.toLocaleString("en-US")}`;
}

function formatUnit(value: number, unit: string, currency: string, compact = false): string {
  if (unit === "%" || unit === "МВт" || unit === "шт") {
    return `${value % 1 === 0 ? value : value.toFixed(1)} ${unit}`;
  }
  if (unit === "€") {
    const abs = Math.abs(value);
    const sign = value < 0 ? "−" : "";
    if (compact) {
      if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${sign}€${(abs / 1_000).toFixed(0)}K`;
    }
    return `${sign}€${abs.toLocaleString("de-DE")}`;
  }
  return formatMoney(value, currency, compact);
}

// ── Health dot ────────────────────────────────────────────────────────────────
function HealthDot({ health, size = "md" }: { health: string; size?: "sm" | "md" | "lg" }) {
  const c = HC[health as keyof typeof HC] ?? HC.green;
  const sz = size === "lg" ? 16 : size === "sm" ? 8 : 12;
  return (
    <span
      className="animate-pulse flex-shrink-0 rounded-full"
      style={{ width: sz, height: sz, background: c, boxShadow: `0 0 10px 3px ${c}66`, display: "inline-block" }}
    />
  );
}

// ── Plan vs Fact card ─────────────────────────────────────────────────────────
function PlanFactCard({ item, currency }: { item: PlanFactItem; currency: string }) {
  const { metric, plan, actual, unit, lowerIsBetter = false } = item;
  const delta = actual - plan;
  const deltaPercent = plan !== 0 ? (delta / Math.abs(plan)) * 100 : 0;

  const isGood = lowerIsBetter ? actual <= plan : actual >= plan;
  const isBad  = lowerIsBetter ? actual > plan * 1.05 : actual < plan * 0.95;

  const statusColor = isGood ? HC.green : isBad ? HC.red : HC.yellow;
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const absDelta = Math.abs(delta);

  return (
    <div style={{
      borderRadius: 16, padding: "14px 16px",
      background: `${statusColor}08`,
      border: `1px solid ${statusColor}30`,
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: TEXT.lo, fontFamily: HF, lineHeight: 1.3 }}>{metric}</span>
        <span className="animate-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, boxShadow: `0 0 6px ${statusColor}`, flexShrink: 0, marginTop: 2, display: "inline-block" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", color: TEXT.dim, fontFamily: HF, marginBottom: 3 }}>план</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: TEXT.mid, fontFamily: HF }}>{formatUnit(plan, unit, currency, true)}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", color: TEXT.dim, fontFamily: HF, marginBottom: 3 }}>факт</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: TEXT.hi, fontFamily: HF }}>{formatUnit(actual, unit, currency, true)}</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: statusColor, fontFamily: HF }}>
        <DeltaIcon className="w-3 h-3 flex-shrink-0" />
        <span>
          {delta > 0 ? "+" : delta < 0 ? "−" : ""}{Math.abs(deltaPercent).toFixed(1)}%
          {" · "}
          {delta > 0 ? "+" : delta < 0 ? "−" : ""}{formatUnit(absDelta, unit, currency, true)}
        </span>
      </div>
    </div>
  );
}

// ── Form accordion ─────────────────────────────────────────────────────────────
function FormAccordion({ title, data, currency }: { title: string; data: Record<string, number>; currency: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", background: "rgba(255,255,255,0.025)" }}>
      <button
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", background: "transparent", cursor: "pointer",
          transition: "background 150ms",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(139,124,255,0.05)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT.mid, fontFamily: HF }}>{title}</span>
        {open
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: TEXT.dim }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: TEXT.dim }} />}
      </button>
      {open && (
        <div style={{ padding: "0 20px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {Object.entries(data).map(([key, val]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", gap: 16 }}>
              <span style={{ fontSize: 12, color: TEXT.lo, fontFamily: HF }}>{key}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: val < 0 ? HC.red : TEXT.hi, fontFamily: HF, flexShrink: 0 }}>
                {formatMoney(val, currency, true)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Structure block ────────────────────────────────────────────────────────────
function StructureBlock({ analytics }: { analytics: Analytics }) {
  const { contour, structure } = analytics;

  if (contour === "internal" && structure) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: TEXT.lo, fontFamily: HF }}>Структура</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }} className="md:grid-cols-3">
          {/* Partners */}
          <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: "20px 22px" }} className="md:col-span-2">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <Briefcase className="w-3.5 h-3.5" style={{ color: TEXT.dim }} />
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: TEXT.lo, fontFamily: HF }}>Партнёры и доли</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {structure.partners.map((p, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: TEXT.mid, fontFamily: HF, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{p.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#8b7cff", fontFamily: HF, flexShrink: 0 }}>{p.share}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #8b7cff 0%, #6c6bff 100%)", width: `${p.share}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Employees */}
            <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
              <Users className="w-5 h-5 flex-shrink-0" style={{ color: TEXT.dim }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: TEXT.dim, fontFamily: HF, marginBottom: 4 }}>Сотрудники</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: TEXT.hi, fontFamily: HF, lineHeight: 1 }}>{structure.employees.toLocaleString()}</div>
              </div>
            </div>

            {/* Projects */}
            <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <Building2 className="w-3.5 h-3.5" style={{ color: TEXT.dim }} />
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: TEXT.lo, fontFamily: HF }}>Проекты ({structure.projects.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {structure.projects.map((proj, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 12, color: TEXT.mid, fontFamily: HF, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proj.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, flexShrink: 0,
                      background: proj.status === "active" ? `${HC.green}18` : "rgba(255,255,255,0.06)",
                      color: proj.status === "active" ? HC.green : TEXT.dim,
                      border: `1px solid ${proj.status === "active" ? HC.green + "44" : "rgba(255,255,255,0.10)"}`,
                      fontFamily: HF,
                    }}>
                      {proj.status === "active" ? "активен" : proj.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 13, fontWeight: 600, color: TEXT.lo, fontFamily: HF }}>Структура</h2>
      <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", padding: "18px 22px" }}>
        <p style={{ fontSize: 13, color: TEXT.lo, fontFamily: HF, lineHeight: 1.65 }}>
          Компания работает во внешнем контуре холдинга. Детальная структура партнёров и
          проектов доступна в квартальном отчёте управляющего.
        </p>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: TEXT.dim, fontFamily: HF, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(139,124,255,0.35)", display: "inline-block" }} />
          Данные из квартального отчёта
        </div>
      </div>
    </section>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function BusinessDetail() {
  const [, params] = useRoute("/businesses/:id");
  const [, setLocation] = useLocation();
  const businessId = parseInt(params?.id || "0");

  const { data: business, isLoading } = useGetBusiness(businessId, {
    query: { enabled: !!businessId, queryKey: getGetBusinessQueryKey(businessId) },
  });

  const { data: reports } = useListReports(
    { businessId, period: "month" as ListReportsPeriod },
    { query: { enabled: !!businessId, queryKey: getListReportsQueryKey({ businessId, period: "month" }) } },
  );

  if (isLoading) {
    return (
      <Shell>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin" style={{ color: "#8b7cff" }} />
        </div>
      </Shell>
    );
  }

  if (!business) {
    return (
      <Shell>
        <div className="p-8 text-center font-mono" style={{ color: TEXT.lo }}>Узел не найден</div>
      </Shell>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analytics = (business as any).analytics as Analytics | null;
  const currency = business.currency ?? "USD";

  const health = business.health as keyof typeof HC;
  const healthColor = HC[health] ?? HC.green;
  const healthLabel = health === "green" ? "Норма" : health === "yellow" ? "Внимание" : "Критично";
  const stageLabel  = analytics?.stage === "investment" ? "Инвестиционная стадия" : "Операционная стадия";
  const contourLabel = analytics?.contour === "internal" ? "Внутренний" : "Внешний";

  const whyBg    = `${healthColor}0d`;
  const whyBorder = `${healthColor}30`;
  const whyText  = healthColor;

  return (
    <Shell>
      <div className="p-4 md:p-8 max-w-6xl mx-auto" style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Back */}
        <button
          onClick={() => setLocation("/businesses")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", cursor: "pointer",
            fontSize: 12, fontWeight: 600, color: TEXT.dim, fontFamily: HF,
            transition: "color 150ms",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#8b7cff")}
          onMouseLeave={e => (e.currentTarget.style.color = TEXT.dim)}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Назад к сети
        </button>

        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <HealthDot health={business.health} size="lg" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, color: TEXT.hi, fontFamily: HF, lineHeight: 1.1 }}>
                {business.name}
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {/* Health badge */}
                <span style={{
                  padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: HF,
                  background: `${healthColor}18`, color: healthColor, border: `1px solid ${healthColor}44`,
                }}>{healthLabel}</span>
                {analytics && (
                  <>
                    {/* Stage */}
                    <span style={{
                      padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: HF,
                      background: "rgba(139,124,255,0.12)", color: "#8b7cff", border: "1px solid rgba(139,124,255,0.30)",
                    }}>{stageLabel}</span>
                    {/* Contour */}
                    <span style={{
                      padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500, fontFamily: HF,
                      background: "rgba(255,255,255,0.05)", color: TEXT.mid, border: "1px solid rgba(255,255,255,0.10)",
                    }}>{contourLabel} контур</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Location + industry */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, paddingLeft: 30, fontSize: 13, color: TEXT.lo, fontFamily: HF }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MapPin className="w-3.5 h-3.5" /> {business.city}, {business.country}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Building2 className="w-3.5 h-3.5" /> {business.industry}
            </span>
          </div>

          {/* Responsible / flag */}
          {analytics && (
            analytics.responsible ? (
              <div style={{ paddingLeft: 30, display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: HF }}>
                <span style={{ color: TEXT.dim }}>Ответственный:</span>
                <span style={{ color: TEXT.mid, fontWeight: 600 }}>{analytics.responsible.name}</span>
                <span style={{ color: TEXT.dim }}>·</span>
                <span style={{ color: TEXT.lo }}>{analytics.responsible.role}</span>
              </div>
            ) : (
              <div style={{ paddingLeft: 30 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12,
                  border: `1px solid ${HC.red}44`, background: `${HC.red}12`,
                }}>
                  <Flag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: HC.red }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: HC.red, fontFamily: HF }}>
                    Нет ответственного — слепая зона
                  </span>
                </div>
              </div>
            )
          )}
        </div>

        {/* Why this color */}
        {analytics?.whyColor && (
          <div style={{ borderRadius: 16, border: `1px solid ${whyBorder}`, background: whyBg, padding: "14px 20px", fontSize: 14, fontFamily: HF, lineHeight: 1.6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: TEXT.lo, marginRight: 8 }}>Причина статуса:</span>
            <span style={{ color: whyText }}>{analytics.whyColor}</span>
          </div>
        )}

        {/* Plan vs Fact */}
        {analytics?.planFact && analytics.planFact.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: TEXT.lo, fontFamily: HF }}>
              {analytics.stage === "investment" ? "Инвестиционные показатели" : "План vs факт"}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {analytics.planFact.map((item, i) => (
                <PlanFactCard key={i} item={item} currency={currency} />
              ))}
            </div>
          </section>
        )}

        {/* Financial forms */}
        {analytics?.forms && (
          <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: TEXT.lo, fontFamily: HF }}>Финансовые формы</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <FormAccordion title="БДР — Бюджет доходов и расходов" data={analytics.forms.bdr} currency={currency} />
              <FormAccordion title="ОДДС — Отчёт о движении денежных средств" data={analytics.forms.odds} currency={currency} />
              <FormAccordion title="Баланс" data={analytics.forms.balance} currency={currency} />
            </div>
          </section>
        )}

        {/* Structure */}
        {analytics && <StructureBlock analytics={analytics} />}

        {/* Description */}
        {business.description && (
          <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", padding: "18px 22px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: TEXT.dim, fontFamily: HF, marginBottom: 10 }}>Описание узла</div>
            <p style={{ fontSize: 14, color: TEXT.lo, lineHeight: 1.7, fontFamily: HF }}>{business.description}</p>
          </div>
        )}

        {/* Telemetry chart */}
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: TEXT.lo, fontFamily: HF }}>Телеметрия: выручка и прибыль</h2>
          <div style={{ borderRadius: 22, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: "20px 8px 8px" }}>
            <div style={{ height: 280 }}>
              {reports?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...reports].reverse()} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,124,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(255,255,255,0.08)"
                      tick={{ fill: TEXT.lo, fontSize: 11, fontFamily: HF }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString("ru-RU", { month: "short", day: "numeric" })}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.08)"
                      tick={{ fill: TEXT.lo, fontSize: 11, fontFamily: HF }}
                      tickFormatter={(v) => formatMoney(v, currency, true)}
                      width={80}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "rgba(11,11,18,0.95)",
                        border: "1px solid rgba(255,255,255,0.09)",
                        borderRadius: 12,
                        fontSize: 13,
                        fontFamily: HF,
                      }}
                      itemStyle={{ fontFamily: HF }}
                      labelStyle={{ color: TEXT.lo, marginBottom: 6, fontFamily: HF }}
                      formatter={(v: number) => [formatMoney(v, currency, true), ""]}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#8b7cff" strokeWidth={2.5}
                      dot={{ fill: "#8b7cff", r: 3 }} activeDot={{ r: 5 }} name="Выручка" />
                    <Line type="monotone" dataKey="profit" stroke="#3ed9a0" strokeWidth={2.5}
                      dot={{ fill: "#3ed9a0", r: 3 }} activeDot={{ r: 5 }} name="Прибыль" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: TEXT.dim, fontSize: 13, fontFamily: HF }}>
                  Нет данных телеметрии
                </div>
              )}
            </div>
          </div>
        </section>

      </div>
    </Shell>
  );
}
