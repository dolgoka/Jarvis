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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, ArrowLeft, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, Users, Briefcase, Building2,
  MapPin, Flag,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Money helpers ─────────────────────────────────────────────────────────────

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

// ── Health dot ───────────────────────────────────────────────────────────────

function HealthDot({ health, size = "md" }: { health: string; size?: "sm" | "md" | "lg" }) {
  const color =
    health === "green"
      ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.7)]"
      : health === "yellow"
      ? "bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.7)]"
      : "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]";
  const sz = size === "lg" ? "w-4 h-4" : size === "sm" ? "w-2 h-2" : "w-3 h-3";
  return <span className={`${sz} rounded-full flex-shrink-0 animate-pulse ${color}`} />;
}

// ── Plan vs Fact card ─────────────────────────────────────────────────────────

function PlanFactCard({ item, currency }: { item: PlanFactItem; currency: string }) {
  const { metric, plan, actual, unit, lowerIsBetter = false } = item;
  const delta = actual - plan;
  const deltaPercent = plan !== 0 ? (delta / Math.abs(plan)) * 100 : 0;

  // Traffic light logic:
  // Default (lowerIsBetter=false): green when fact >= plan (more = better)
  // Inverted (lowerIsBetter=true): green when fact <= plan (stayed within budget = better)
  const isGood = lowerIsBetter ? actual <= plan : actual >= plan;
  const isBad = lowerIsBetter ? actual > plan * 1.05 : actual < plan * 0.95;

  const borderClass = isGood
    ? "border-green-500/30 bg-green-500/5"
    : isBad
    ? "border-red-500/30 bg-red-500/5"
    : "border-yellow-500/30 bg-yellow-500/5";

  const dotClass = isGood
    ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
    : isBad
    ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
    : "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]";

  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor = isGood ? "text-green-400" : isBad ? "text-red-400" : "text-yellow-400";
  const absDelta = Math.abs(delta);

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${borderClass}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 leading-tight">{metric}</span>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 animate-pulse ${dotClass}`} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[9px] font-mono uppercase text-white/25 mb-0.5">план</div>
          <div className="text-xs font-mono text-white/50">{formatUnit(plan, unit, currency, true)}</div>
        </div>
        <div>
          <div className="text-[9px] font-mono uppercase text-white/25 mb-0.5">факт</div>
          <div className="text-sm font-mono text-white font-medium">{formatUnit(actual, unit, currency, true)}</div>
        </div>
      </div>

      <div className={`flex items-center gap-1 text-[10px] font-mono ${deltaColor}`}>
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

// ── Form accordion ────────────────────────────────────────────────────────────

function FormAccordion({
  title, data, currency,
}: { title: string; data: Record<string, number>; currency: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-primary/15 bg-black/30 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-primary/5 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-xs font-mono uppercase tracking-widest text-primary/70">{title}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-primary/40 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-primary/40 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 divide-y divide-primary/10">
          {Object.entries(data).map(([key, val]) => (
            <div key={key} className="flex justify-between items-center py-2.5 gap-4">
              <span className="text-xs text-white/40 font-mono">{key}</span>
              <span className={`text-sm font-mono font-medium tabular-nums ${val < 0 ? "text-red-400" : "text-white"}`}>
                {formatMoney(val, currency, true)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Structure block ───────────────────────────────────────────────────────────

function StructureBlock({ analytics }: { analytics: Analytics }) {
  const { contour, structure } = analytics;

  if (contour === "internal" && structure) {
    return (
      <section className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-widest text-primary/60">Структура</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-black/40 border-primary/15 md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-primary/50 flex items-center gap-1.5">
                <Briefcase className="w-3 h-3" /> Партнёры и доли
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {structure.partners.map((p, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/70 font-mono truncate pr-2">{p.name}</span>
                    <span className="text-xs font-mono text-primary flex-shrink-0">{p.share}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary/70 to-primary/40 rounded-full"
                      style={{ width: `${p.share}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-black/40 border-primary/15">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="w-5 h-5 text-primary/50 flex-shrink-0" />
                <div>
                  <div className="text-[9px] font-mono uppercase text-white/25 mb-0.5">Сотрудники</div>
                  <div className="text-2xl font-light font-mono text-white">
                    {structure.employees.toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-primary/15">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-primary/50 flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" /> Проекты ({structure.projects.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 px-4 pb-3 pt-0">
                {structure.projects.map((proj, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-white/60 font-mono truncate">{proj.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 flex-shrink-0 ${
                        proj.status === "active"
                          ? "border-green-500/30 text-green-400"
                          : "border-white/10 text-white/25"
                      }`}
                    >
                      {proj.status === "active" ? "активен" : proj.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  // External contour
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-mono uppercase tracking-widest text-primary/60">Контур: Внешний</h2>
      <div className="rounded-xl border border-white/5 bg-black/20 px-5 py-4">
        <p className="text-xs text-white/40 font-mono leading-relaxed">
          Компания работает во внешнем контуре холдинга. Детальная структура партнёров и
          проектов доступна в квартальном отчёте управляющего.
        </p>
        <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-primary/30 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/25" />
          Данные из квартального отчёта
        </div>
      </div>
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

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
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (!business) {
    return (
      <Shell>
        <div className="p-8 text-center text-muted-foreground font-mono">Узел не найден</div>
      </Shell>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analytics = (business as any).analytics as Analytics | null;
  const currency = business.currency ?? "USD";

  const healthLabel =
    business.health === "green" ? "Норма" :
    business.health === "yellow" ? "Внимание" : "Критично";

  const stageLabel = analytics?.stage === "investment" ? "Инвестиционная" : "Операционная";
  const contourLabel = analytics?.contour === "internal" ? "Внутренний" : "Внешний";

  const whyBgClass =
    business.health === "red"
      ? "border-red-500/30 bg-red-500/8 text-red-200"
      : business.health === "yellow"
      ? "border-yellow-500/30 bg-yellow-500/8 text-yellow-200"
      : "border-green-500/20 bg-green-500/5 text-green-200";

  return (
    <Shell>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-6xl mx-auto">

        {/* Back */}
        <button
          onClick={() => setLocation("/businesses")}
          className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-white/25 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Назад к сети
        </button>

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <HealthDot health={business.health} size="lg" />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-4xl font-light text-white tracking-tight leading-tight">
                {business.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={`text-xs font-mono ${
                    business.health === "green"
                      ? "border-green-500/40 text-green-400"
                      : business.health === "yellow"
                      ? "border-yellow-500/40 text-yellow-400"
                      : "border-red-500/40 text-red-400"
                  }`}
                >
                  {healthLabel}
                </Badge>
                {analytics && (
                  <>
                    <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary/70">
                      {stageLabel}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-mono border-white/10 text-white/35">
                      {contourLabel} контур
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-mono text-white/35 pl-7">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> {business.city}, {business.country}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> {business.industry}
            </span>
          </div>

          {analytics && (
            analytics.responsible ? (
              <div className="pl-7 flex items-center gap-2 text-xs font-mono">
                <span className="text-white/25">Ответственный:</span>
                <span className="text-white/70">{analytics.responsible.name}</span>
                <span className="text-white/20">·</span>
                <span className="text-white/40">{analytics.responsible.role}</span>
              </div>
            ) : (
              <div className="pl-7">
                <div className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2">
                  <Flag className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <span className="text-xs font-mono text-red-300 uppercase tracking-wide">
                    Нет ответственного — слепая зона
                  </span>
                </div>
              </div>
            )
          )}
        </div>

        {/* Why this color */}
        {analytics?.whyColor && (
          <div className={`rounded-xl border px-5 py-3.5 text-sm font-mono leading-relaxed ${whyBgClass}`}>
            <span className="text-white/25 mr-2 text-[10px] uppercase tracking-wider">Причина статуса:</span>
            {analytics.whyColor}
          </div>
        )}

        {/* Plan vs Fact */}
        {analytics?.planFact && analytics.planFact.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-primary/60">
              {analytics.stage === "investment" ? "Инвестиционные показатели" : "План vs Факт"}
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
          <section className="space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-primary/60">Финансовые формы</h2>
            <div className="space-y-2">
              <FormAccordion
                title="БДР — Бюджет доходов и расходов"
                data={analytics.forms.bdr}
                currency={currency}
              />
              <FormAccordion
                title="ОДДС — Отчёт о движении денежных средств"
                data={analytics.forms.odds}
                currency={currency}
              />
              <FormAccordion title="Баланс" data={analytics.forms.balance} currency={currency} />
            </div>
          </section>
        )}

        {/* Structure */}
        {analytics && <StructureBlock analytics={analytics} />}

        {/* Description */}
        {business.description && (
          <div className="rounded-xl border border-primary/10 bg-black/20 px-5 py-4">
            <div className="text-[9px] font-mono uppercase tracking-widest text-primary/30 mb-2">Описание узла</div>
            <p className="text-sm text-white/50 leading-relaxed">{business.description}</p>
          </div>
        )}

        {/* Telemetry chart */}
        <section className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-primary/60">
            Телеметрия: Выручка и Прибыль
          </h2>
          <Card className="bg-black/40 border-primary/15">
            <CardContent className="h-[220px] md:h-[280px] px-2 md:px-6 pt-4">
              {reports?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...reports].reverse()} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(0,212,255,0.07)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(255,255,255,0.1)"
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace" }}
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString("ru-RU", { month: "short", day: "numeric" })
                      }
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.1)"
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace" }}
                      tickFormatter={(v) => formatMoney(v, currency, true)}
                      width={80}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.9)",
                        border: "1px solid rgba(0,212,255,0.2)",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      itemStyle={{ fontFamily: "monospace" }}
                      labelStyle={{
                        color: "rgba(255,255,255,0.4)",
                        marginBottom: 4,
                        fontFamily: "monospace",
                      }}
                      formatter={(v: number) => [formatMoney(v, currency, true), ""]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#00d4ff"
                      strokeWidth={2}
                      dot={{ fill: "#00d4ff", r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Выручка"
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: "#22c55e", r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Прибыль"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/15 font-mono text-xs">
                  НЕТ ДАННЫХ ТЕЛЕМЕТРИИ
                </div>
              )}
            </CardContent>
          </Card>
        </section>

      </div>
    </Shell>
  );
}
