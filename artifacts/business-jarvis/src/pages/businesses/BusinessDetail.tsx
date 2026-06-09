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

// Plan marker sits at 80% of track width → 20% buffer for overperformance
const GOAL_PCT = 80;

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Plan-Fact Horizontal Bar ───────────────────────────────────────────────────
function PlanFactBar({ item, currency }: { item: PlanFactItem; currency: string }) {
  const { metric, plan, actual, unit, lowerIsBetter = false } = item;

  const delta = actual - plan;
  const deltaPercent = plan !== 0 ? (delta / Math.abs(plan)) * 100 : 0;
  const isGood = lowerIsBetter ? actual <= plan : actual >= plan;
  const isBad  = lowerIsBetter ? actual > plan * 1.05 : actual < plan * 0.95;
  const statusColor = isGood ? HC.green : isBad ? HC.red : HC.yellow;

  // Clamp fill at 125% of plan so the bar never fully escapes the track
  // Plan marker sits at GOAL_PCT% → overperformance visible as fill past the marker
  const fillPct = Math.min(actual / plan, 1.25) * GOAL_PCT;

  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 0" }}>
      {/* Metric label + status dot */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.05em", color: TEXT.lo, fontFamily: HF,
        }}>{metric}</span>
        <span className="animate-pulse" style={{
          width: 7, height: 7, borderRadius: "50%", display: "inline-block",
          background: statusColor, boxShadow: `0 0 6px ${statusColor}`, flexShrink: 0,
        }} />
      </div>

      {/* Track */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          flex: 1, position: "relative", height: 10, borderRadius: 6,
          background: "rgba(255,255,255,0.07)",
        }}>
          {/* Fill — actual value */}
          <div style={{
            position: "absolute", left: 0, top: 0, height: "100%",
            width: `${Math.max(0, fillPct)}%`,
            borderRadius: 6,
            background: `linear-gradient(90deg, ${statusColor}99, ${statusColor})`,
            transition: "width 0.6s ease",
          }} />
          {/* Goal marker — plan position at GOAL_PCT% */}
          <div style={{
            position: "absolute", top: -3, bottom: -3,
            left: `${GOAL_PCT}%`,
            width: 2, borderRadius: 2,
            background: "rgba(228,232,255,0.55)",
            boxShadow: "0 0 4px rgba(228,232,255,0.3)",
          }}>
            <div style={{
              position: "absolute", bottom: "calc(100% + 3px)", left: "50%",
              transform: "translateX(-50%)",
              fontSize: 8, color: TEXT.dim, fontFamily: HF, fontWeight: 600,
              whiteSpace: "nowrap",
            }}>план</div>
          </div>
        </div>

        {/* Values */}
        <div style={{ flexShrink: 0, textAlign: "right", minWidth: 100 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: TEXT.hi, fontFamily: HF, lineHeight: 1 }}>
            {formatUnit(actual, unit, currency, true)}
          </div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            gap: 3, marginTop: 3, fontSize: 11, fontWeight: 600, color: statusColor, fontFamily: HF,
          }}>
            <DeltaIcon style={{ width: 10, height: 10, flexShrink: 0 }} />
            <span>{delta > 0 ? "+" : ""}{deltaPercent.toFixed(1)}%</span>
          </div>
          <div style={{ fontSize: 10, color: TEXT.dim, fontFamily: HF, marginTop: 2 }}>
            план {formatUnit(plan, unit, currency, true)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Waterfall helpers ──────────────────────────────────────────────────────────
type WfStep = {
  label: string;
  value: number;     // always positive
  rawValue: number;  // signed (negative = loss)
  type: "inflow" | "deduction" | "result";
};

function bdrFind(bdr: Record<string, number>, pat: RegExp) {
  const entry = Object.entries(bdr).find(([k]) => pat.test(k));
  return entry ? { key: entry[0], val: entry[1] } : null;
}

function buildWaterfallSteps(bdr: Record<string, number>): WfStep[] | null {
  const rev  = bdrFind(bdr, /выручка/i);
  const net  = bdrFind(bdr, /чистая прибыль/i) ?? bdrFind(bdr, /убыток/i);
  if (!rev || !net) return null;

  const revenue   = rev.val;
  const netProfit = net.val;
  if (revenue <= 0) return null;

  const ebitda = bdrFind(bdr, /^ebitda$/i);
  const steps: WfStep[] = [];

  steps.push({ label: "Выручка", value: revenue, rawValue: revenue, type: "inflow" });

  if (ebitda !== null) {
    // Collapse everything between Выручка and EBITDA into one "Операционные расходы"
    const preExp = revenue - ebitda.val;
    if (preExp > 0) {
      steps.push({ label: "Операционные расходы", value: preExp, rawValue: -preExp, type: "deduction" });
    }
    steps.push({ label: "EBITDA", value: Math.abs(ebitda.val), rawValue: ebitda.val, type: "result" });

    // Collapse everything between EBITDA and Чистая прибыль
    const postExp = ebitda.val - netProfit;
    if (postExp > 0) {
      steps.push({ label: "Прочие расходы", value: postExp, rawValue: -postExp, type: "deduction" });
    }
  } else {
    // No EBITDA anchor — try to show Себестоимость separately, collapse the rest
    const cogs = bdrFind(bdr, /себестоимость/i);
    const totalExpenses = revenue - netProfit;

    if (cogs && cogs.val > 0 && cogs.val < totalExpenses) {
      steps.push({ label: "Себестоимость", value: cogs.val, rawValue: -cogs.val, type: "deduction" });
      const remainder = totalExpenses - cogs.val;
      if (remainder > 0) {
        steps.push({ label: "Прочие расходы", value: remainder, rawValue: -remainder, type: "deduction" });
      }
    } else if (totalExpenses > 0) {
      steps.push({ label: "Операционные расходы", value: totalExpenses, rawValue: -totalExpenses, type: "deduction" });
    }
  }

  const isLoss = netProfit < 0;
  steps.push({
    label: isLoss ? "Убыток" : "Чистая прибыль",
    value: Math.abs(netProfit),
    rawValue: netProfit,
    type: "result",
  });

  return steps;
}

// ── Waterfall Block ────────────────────────────────────────────────────────────
function WaterfallBlock({ bdr, currency }: { bdr: Record<string, number>; currency: string }) {
  const steps = buildWaterfallSteps(bdr);
  if (!steps || steps.length < 3) return null;

  const revenue   = steps[0].value;
  const netStep   = steps[steps.length - 1];
  const netProfit = netStep.rawValue;
  const MAX_PCT   = 88; // Leave 12% right breathing room

  // Pre-compute bar geometry while tracking running total
  let running = revenue;
  type Computed = { step: WfStep; barLeft: number; barWidth: number; color: string };
  const computed: Computed[] = steps.map(step => {
    let barLeft: number;
    let barWidth: number;
    let color: string;

    if (step.type === "inflow") {
      barLeft  = 0;
      barWidth = MAX_PCT;
      color    = "#5b8fff";
    } else if (step.type === "deduction") {
      running -= step.value;
      barLeft  = Math.max(0, (running / revenue) * MAX_PCT);
      barWidth = (step.value / revenue) * MAX_PCT;
      color    = HC.red;
    } else {
      // result — bar from 0 to current running (= step.value for subtotals)
      barLeft  = 0;
      barWidth = Math.max(0.4, (Math.abs(step.value) / revenue) * MAX_PCT);
      const isLast = step === netStep;
      if (isLast) {
        color = step.rawValue < 0 ? HC.red : step.rawValue < revenue * 0.05 ? HC.yellow : HC.green;
      } else {
        color = "#8b7cff"; // EBITDA — violet
      }
    }

    return { step, barLeft, barWidth, color };
  });

  const summaryLabel = netProfit < 0
    ? `Убыток ${formatMoney(Math.abs(netProfit), currency, true)} при выручке ${formatMoney(revenue, currency, true)}`
    : `из ${formatMoney(revenue, currency, true)} выручки до прибыли доходит ${formatMoney(netProfit, currency, true)} (${((netProfit / revenue) * 100).toFixed(2)}%)`;

  return (
    <div style={{
      borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.025)", padding: "20px 22px",
      display: "flex", flexDirection: "column", gap: 4, flex: 1,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT.lo, fontFamily: HF, marginBottom: 8 }}>
        Куда уходит выручка
      </div>

      {computed.map(({ step, barLeft, barWidth, color }, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 28 }}>
          {/* Label */}
          <div style={{
            fontSize: 11, color: step.type === "result" ? TEXT.mid : TEXT.lo,
            fontFamily: HF, fontWeight: step.type === "result" ? 600 : 400,
            width: 150, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{step.label}</div>

          {/* Bar track */}
          <div style={{ flex: 1, position: "relative", height: step.type === "result" ? 16 : 12, borderRadius: 4, background: "rgba(255,255,255,0.05)" }}>
            <div style={{
              position: "absolute", top: 0, height: "100%",
              left: `${barLeft}%`,
              width: `${Math.max(0.3, barWidth)}%`,
              borderRadius: 4,
              background: step.type === "inflow"
                ? `linear-gradient(90deg, #3a6aff, #5b8fff)`
                : step.type === "deduction"
                  ? `linear-gradient(90deg, ${color}cc, ${color})`
                  : `linear-gradient(90deg, ${color}99, ${color})`,
              boxShadow: step.type === "result" ? `0 0 10px ${color}44` : "none",
            }} />
          </div>

          {/* Value */}
          <div style={{
            fontSize: 11, fontWeight: step.type === "result" ? 700 : 500,
            color: step.type === "deduction" ? HC.red : step.type === "result" ? color : TEXT.mid,
            fontFamily: HF, width: 100, flexShrink: 0, textAlign: "right",
          }}>
            {step.type === "deduction" ? "−" : ""}{formatMoney(step.value, currency, true)}
          </div>
        </div>
      ))}

      {/* Summary */}
      <div style={{
        marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)",
        fontSize: 11, color: TEXT.lo, fontFamily: HF, lineHeight: 1.5,
      }}>
        {summaryLabel}
      </div>
    </div>
  );
}

// ── Margin Donut ───────────────────────────────────────────────────────────────
function MarginDonut({ bdr, planFact, currency }: {
  bdr: Record<string, number>;
  planFact: PlanFactItem[];
  currency: string;
}) {
  const rev = bdrFind(bdr, /выручка/i);
  const net = bdrFind(bdr, /чистая прибыль/i) ?? bdrFind(bdr, /убыток/i);
  if (!rev || !net || rev.val <= 0) return null;

  const marginPct = (net.val / rev.val) * 100;

  // Derive plan margin: prefer explicit planFact item, else compute from plan revenue/profit
  let planMarginPct: number | null = null;
  const explicitMarginItem = planFact.find(m => /маржа|рентабельность/i.test(m.metric));
  if (explicitMarginItem) {
    planMarginPct = explicitMarginItem.plan;
  } else {
    const planRevItem    = planFact.find(m => /оборот|выручка/i.test(m.metric));
    const planProfitItem = planFact.find(m => /чистая прибыль/i.test(m.metric));
    if (planRevItem && planProfitItem && planRevItem.plan > 0) {
      planMarginPct = (planProfitItem.plan / planRevItem.plan) * 100;
    }
  }

  // Determine color
  let arcColor: string;
  if (planMarginPct !== null) {
    if (marginPct >= planMarginPct * 0.95) arcColor = HC.green;
    else if (marginPct >= planMarginPct * 0.80) arcColor = HC.yellow;
    else arcColor = HC.red;
  } else {
    // Fixed thresholds fallback
    arcColor = marginPct >= 15 ? HC.green : marginPct >= 5 ? HC.yellow : HC.red;
  }

  // SVG donut
  const R = 46;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * R;
  const clampedPct = Math.max(0, Math.min(100, Math.abs(marginPct)));
  const dash = (clampedPct / 100) * circumference;
  const gap  = circumference - dash;

  // Plan marker angle on arc
  const planAngle = planMarginPct !== null
    ? ((Math.min(100, Math.abs(planMarginPct)) / 100) * 360) - 90
    : null;
  const planX = planAngle !== null ? cx + (R + 6) * Math.cos((planAngle * Math.PI) / 180) : null;
  const planY = planAngle !== null ? cy + (R + 6) * Math.sin((planAngle * Math.PI) / 180) : null;

  return (
    <div style={{
      borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.025)", padding: "20px 22px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
      minWidth: 160,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT.lo, fontFamily: HF }}>
        Чистая маржа
      </div>

      <svg width={120} height={120} viewBox="0 0 120 120">
        {/* Track */}
        <circle cx={cx} cy={cy} r={R}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={10}
        />
        {/* Arc — starts at top (-90°) */}
        <circle cx={cx} cy={cy} r={R}
          fill="none"
          stroke={arcColor}
          strokeWidth={10}
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ filter: `drop-shadow(0 0 6px ${arcColor}66)` }}
        />
        {/* Plan marker dot */}
        {planX !== null && planY !== null && (
          <circle cx={planX} cy={planY} r={3.5}
            fill="rgba(228,232,255,0.8)"
            style={{ filter: "drop-shadow(0 0 3px rgba(228,232,255,0.5))" }}
          />
        )}
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle"
          fontSize={20} fontWeight={800}
          fill={arcColor}
          fontFamily="'Hanken Grotesk', system-ui, sans-serif"
        >
          {marginPct.toFixed(marginPct < 1 ? 2 : 1)}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle"
          fontSize={9} fontWeight={600}
          fill="rgba(228,232,255,0.4)"
          fontFamily="'Hanken Grotesk', system-ui, sans-serif"
          letterSpacing="0.05em"
        >
          МАРЖА
        </text>
        {planMarginPct !== null && (
          <text x={cx} y={cy + 26} textAnchor="middle"
            fontSize={8.5} fontWeight={500}
            fill="rgba(228,232,255,0.28)"
            fontFamily="'Hanken Grotesk', system-ui, sans-serif"
          >
            цель {planMarginPct.toFixed(planMarginPct < 1 ? 2 : 1)}%
          </text>
        )}
      </svg>

      {/* Status label */}
      <div style={{
        padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 600, fontFamily: HF,
        background: `${arcColor}18`, color: arcColor, border: `1px solid ${arcColor}44`,
      }}>
        {planMarginPct !== null
          ? marginPct >= planMarginPct * 0.95 ? "В плане" : marginPct >= planMarginPct * 0.80 ? "Ниже плана" : "Критично"
          : marginPct >= 15 ? "Норма" : marginPct >= 5 ? "Ниже нормы" : "Критично"
        }
      </div>
      {planMarginPct !== null && (
        <div style={{ fontSize: 9, color: TEXT.dim, fontFamily: HF, textAlign: "center" }}>
          факт {marginPct.toFixed(2)}% · план {planMarginPct.toFixed(2)}%
        </div>
      )}
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

// ── Dynamics block ─────────────────────────────────────────────────────────────
type MetricKey = "revenue" | "ebitda" | "netProfit" | "cashFlow";
const METRIC_LABELS: Record<MetricKey, string> = {
  revenue: "Оборот", ebitda: "EBITDA", netProfit: "Чистая прибыль", cashFlow: "Кэш-флоу",
};
const METRIC_FIELDS: Record<MetricKey, [keyof MonthlyPoint, keyof MonthlyPoint]> = {
  revenue:   ["revenuePlan",   "revenueFact"],
  ebitda:    ["ebitdaPlan",    "ebitdaFact"],
  netProfit: ["netProfitPlan", "netProfitFact"],
  cashFlow:  ["cashFlowPlan",  "cashFlowFact"],
};

function DynamicsBlock({ history, health, currency }: { history: MonthlyPoint[]; health: string; currency: string }) {
  const [metric, setMetric] = useState<MetricKey>("revenue");
  const factColor = HC[health as keyof typeof HC] ?? HC.green;
  const [planKey, factKey] = METRIC_FIELDS[metric];
  const chartData = history.map(p => ({
    month: p.month,
    plan: p[planKey] as unknown as number,
    fact: p[factKey] as unknown as number,
  }));

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: TEXT.lo, fontFamily: HF }}>Динамика за 6 месяцев</h2>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {(Object.keys(METRIC_LABELS) as MetricKey[]).map(k => (
            <button key={k} onClick={() => setMetric(k)} style={{
              padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: HF, cursor: "pointer",
              background: metric === k ? "rgba(139,124,255,0.18)" : "rgba(255,255,255,0.04)",
              color: metric === k ? "#8b7cff" : TEXT.lo,
              border: metric === k ? "1px solid rgba(139,124,255,0.40)" : "1px solid rgba(255,255,255,0.08)",
              transition: "all 150ms",
            }}>{METRIC_LABELS[k]}</button>
          ))}
        </div>
      </div>
      <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: "20px 8px 8px" }}>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,124,255,0.08)" vertical={false} />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.08)" tick={{ fill: TEXT.lo, fontSize: 11, fontFamily: HF }} />
              <YAxis stroke="rgba(255,255,255,0.08)" tick={{ fill: TEXT.lo, fontSize: 11, fontFamily: HF }}
                tickFormatter={(v) => formatMoney(v, currency, true)} width={80} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "rgba(11,11,18,0.95)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, fontSize: 13, fontFamily: HF }}
                itemStyle={{ fontFamily: HF }}
                labelStyle={{ color: TEXT.lo, marginBottom: 6, fontFamily: HF }}
                formatter={(v: number) => [formatMoney(v, currency, true), ""]}
              />
              <Line type="monotone" dataKey="plan" stroke="rgba(228,232,255,0.28)" strokeWidth={1.5}
                strokeDasharray="5 3" dot={false} name="План" />
              <Line type="monotone" dataKey="fact" stroke={factColor} strokeWidth={2.5}
                dot={{ fill: factColor, r: 3 }} activeDot={{ r: 5 }} name="Факт" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", gap: 16, paddingLeft: 16, paddingBottom: 4, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: TEXT.lo, fontFamily: HF }}>
            <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={factColor} strokeWidth="2.5" /></svg>
            Факт
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: TEXT.lo, fontFamily: HF }}>
            <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="rgba(228,232,255,0.28)" strokeWidth="1.5" strokeDasharray="5 3" /></svg>
            План
          </div>
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

  // Determine whether to show waterfall + donut:
  // Only for operational stage where revenue AND net profit exist in bdr
  const bdr = analytics?.forms?.bdr ?? {};
  const hasRevenue  = !!bdrFind(bdr, /выручка/i);
  const hasNetProfit = !!(bdrFind(bdr, /чистая прибыль/i) ?? bdrFind(bdr, /убыток/i));
  const showFinancialVisuals = analytics?.stage === "operational" && hasRevenue && hasNetProfit;

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
                <span style={{
                  padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: HF,
                  background: `${healthColor}18`, color: healthColor, border: `1px solid ${healthColor}44`,
                }}>{healthLabel}</span>
                {analytics && (
                  <>
                    <span style={{
                      padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: HF,
                      background: "rgba(139,124,255,0.12)", color: "#8b7cff", border: "1px solid rgba(139,124,255,0.30)",
                    }}>{stageLabel}</span>
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

        {/* Recommendation */}
        {analytics?.recommendation && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "10px 16px", borderRadius: 12, background: "rgba(139,124,255,0.06)", border: "1px solid rgba(139,124,255,0.18)", fontSize: 13, fontFamily: HF, lineHeight: 1.5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#8b7cff", flexShrink: 0 }}>Рекомендация:</span>
            <span style={{ color: "rgba(180,175,255,0.80)" }}>{analytics.recommendation}</span>
          </div>
        )}

        {/* ── Plan vs Fact — horizontal bars ── */}
        {analytics?.planFact && analytics.planFact.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: TEXT.lo, fontFamily: HF, marginBottom: 4 }}>
              {analytics.stage === "investment" ? "Инвестиционные показатели" : "План vs факт"}
            </h2>
            <div style={{
              borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.025)", padding: "8px 22px",
            }}>
              {analytics.planFact.map((item, i) => (
                <div key={i} style={{
                  borderBottom: i < analytics.planFact.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}>
                  <PlanFactBar item={item} currency={currency} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Monthly Dynamics ── */}
        {analytics?.monthlyHistory && analytics.monthlyHistory.length > 0 && analytics.stage === "operational" && (
          <DynamicsBlock history={analytics.monthlyHistory} health={health} currency={currency} />
        )}

        {/* ── Waterfall + Donut — only for operational with revenue data ── */}
        {showFinancialVisuals && (
          <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: TEXT.lo, fontFamily: HF, marginBottom: 4 }}>
              Финансовый анализ
            </h2>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "stretch" }}>
              <WaterfallBlock bdr={bdr} currency={currency} />
              {analytics?.planFact && (
                <MarginDonut bdr={bdr} planFact={analytics.planFact} currency={currency} />
              )}
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
