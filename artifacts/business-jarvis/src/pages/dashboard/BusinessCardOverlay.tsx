import { useState } from "react";
import { useGetBusinessCard, getGetBusinessCardQueryKey, useGetBusiness, getGetBusinessQueryKey } from "@workspace/api-client-react";
import type { Metric, RoadmapItem, CoverageItem, TopPerson, BusinessCard } from "@workspace/api-client-react";
import { X, MessageSquare, MapPin, Calendar, User, CheckCircle2, XCircle, ChevronRight, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

const HF = "'Hanken Grotesk', system-ui, sans-serif";
const HC: Record<string, string> = { green: "#3ed9a0", yellow: "#f0b54a", red: "#f0625a" };
const TEXT = {
  hi: "rgba(228,232,255,0.92)",
  mid: "rgba(228,232,255,0.65)",
  lo: "rgba(228,232,255,0.45)",
  dim: "rgba(228,232,255,0.28)",
};
const DIVIDER = "rgba(255,255,255,0.07)";
const PANEL_BG = "rgba(6,11,24,0.96)";
const GLASS_BG = "rgba(255,255,255,0.04)";
const GLASS_BORDER = "rgba(255,255,255,0.09)";

function devPct(plan: number, fact: number): number {
  if (plan === 0) return 0;
  return ((fact - plan) / Math.abs(plan)) * 100;
}

function metricRowColor(m: Metric): "green" | "yellow" | "red" {
  const abs = Math.abs(devPct(m.plan, m.fact));
  if (abs < m.thresholdYellow) return "green";
  if (abs < m.thresholdRed) return "yellow";
  return "red";
}

function buildWhySummary(metrics: Metric[]): string[] {
  return metrics
    .map(m => ({ m, color: metricRowColor(m), dev: Math.abs(devPct(m.plan, m.fact)) }))
    .filter(x => x.color !== "green")
    .sort((a, b) => {
      const ord: Record<string, number> = { red: 0, yellow: 1 };
      return (ord[a.color] - ord[b.color]) || b.dev - a.dev;
    })
    .slice(0, 3)
    .map(({ m }) => {
      const d = devPct(m.plan, m.fact);
      const dir = d < 0 ? "ниже плана" : "выше плана";
      return `${m.label}: ${Math.abs(d).toFixed(0)}% ${dir}`;
    });
}

const STAGE_LABELS: Record<string, string> = {
  investment: "Инвестиционная",
  operational: "Операционная",
};
const CIRCLE_LABELS: Record<string, string> = {
  internal: "Внутренний",
  external_passive: "Внешний инвестор",
};
const HEALTH_LABELS: Record<string, string> = {
  green: "Норма",
  yellow: "Требует внимания",
  red: "Критично",
};
const CLEVEL_LABELS: Record<string, string> = {
  gd: "ГД",
  executive: "Исп. директор",
  financial: "Фин. директор",
  commercial: "Комм. директор",
};

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 11px", borderRadius: 999,
      fontSize: 11, fontWeight: 700, fontFamily: HF,
      background: bg, color, border: `1px solid ${color}44`,
      letterSpacing: "0.03em",
    }}>{label}</span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.10em",
      textTransform: "uppercase", color: TEXT.dim, fontFamily: HF,
      marginBottom: 10,
    }}>{children}</div>
  );
}

function HealthDot({ color, size = 10, pulse }: { color: string; size?: number; pulse?: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color,
      boxShadow: `0 0 ${size}px ${Math.ceil(size * 0.5)}px ${color}55`,
      flexShrink: 0,
      animation: pulse ? "pulse-glow 1.6s ease-in-out infinite" : undefined,
    }} />
  );
}

/* ── Plan-Fact Table ─────────────────────────────────────────────────────────── */
function PlanFactTable({ metrics }: { metrics: Metric[] }) {
  if (!metrics.length) {
    return <div style={{ color: TEXT.dim, fontSize: 13, fontFamily: HF, padding: "12px 0" }}>Нет метрик</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: HF }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            {["Метрика", "План", "Факт", "Откл%", "Ответственный"].map(h => (
              <th key={h} style={{
                padding: "7px 10px", textAlign: h === "Метрика" ? "left" : "right",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
                textTransform: "uppercase", color: TEXT.dim,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map(m => {
            const rowColor = metricRowColor(m);
            const d = devPct(m.plan, m.fact);
            const dStr = (d >= 0 ? "+" : "") + d.toFixed(1) + "%";
            const c = HC[rowColor];
            return (
              <tr key={m.id} style={{
                background: `${c}09`,
                borderBottom: `1px solid ${DIVIDER}`,
                transition: "background 150ms",
              }}>
                <td style={{ padding: "9px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <HealthDot color={c} size={7} />
                    <span style={{ fontSize: 13, color: TEXT.hi, fontWeight: 500 }}>{m.label}</span>
                  </div>
                  {m.note && (
                    <div style={{ fontSize: 11, color: TEXT.dim, marginTop: 2, paddingLeft: 15, fontStyle: "italic" }}>{m.note}</div>
                  )}
                </td>
                <td style={{ padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13, color: TEXT.mid }}>
                  {m.plan.toLocaleString("ru")}<span style={{ color: TEXT.dim, fontSize: 11 }}>&nbsp;{m.unit}</span>
                </td>
                <td style={{ padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 600, color: TEXT.hi }}>
                  {m.fact.toLocaleString("ru")}<span style={{ color: TEXT.dim, fontSize: 11 }}>&nbsp;{m.unit}</span>
                </td>
                <td style={{ padding: "9px 10px", textAlign: "right" }}>
                  <span style={{
                    display: "inline-block", padding: "2px 8px", borderRadius: 6,
                    background: `${c}18`, color: c,
                    fontVariantNumeric: "tabular-nums", fontSize: 12, fontWeight: 700,
                  }}>{dStr}</span>
                </td>
                <td style={{ padding: "9px 10px", textAlign: "right", fontSize: 12, color: TEXT.lo }}>{m.ownerRole}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Roadmap Timeline ───────────────────────────────────────────────────────── */
function RoadmapTimeline({ items }: { items: RoadmapItem[] }) {
  if (!items.length) return null;
  const ordered = [...items].sort((a, b) => {
    const ord: Record<string, number> = { done: 0, current: 1, planned: 2 };
    return (ord[a.status] - ord[b.status]) || a.date.localeCompare(b.date);
  });
  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0, minWidth: "max-content", padding: "4px 0 8px" }}>
        {ordered.map((item, idx) => {
          const isDone = item.status === "done";
          const isCurrent = item.status === "current";
          const isPlanned = item.status === "planned";
          const dotColor = isDone ? HC.green : isCurrent ? "#00d4ff" : "rgba(255,255,255,0.18)";
          const lineColor = isDone ? `${HC.green}55` : "rgba(255,255,255,0.08)";
          return (
            <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 120, maxWidth: 140 }}>
                <div style={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "center", marginBottom: 8 }}>
                  {idx > 0 && (
                    <div style={{ flex: 1, height: 2, background: lineColor, borderRadius: 1 }} />
                  )}
                  <div style={{
                    width: isCurrent ? 16 : 12, height: isCurrent ? 16 : 12,
                    borderRadius: "50%", background: dotColor, flexShrink: 0,
                    border: isPlanned ? `2px dashed rgba(255,255,255,0.25)` : `2px solid ${dotColor}`,
                    boxShadow: isCurrent ? `0 0 10px 4px #00d4ff55` : isDone ? `0 0 6px 2px ${HC.green}44` : undefined,
                    animation: isCurrent ? "pulse-glow 1.8s ease-in-out infinite" : undefined,
                    position: "relative",
                  }}>
                    {isDone && (
                      <svg style={{ position: "absolute", inset: 0, margin: "auto", width: 7, height: 7 }} viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="#06111f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  {idx < ordered.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: lineColor, borderRadius: 1 }} />
                  )}
                </div>
                <div style={{ padding: "0 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? "#00d4ff" : isDone ? TEXT.mid : TEXT.dim, fontFamily: HF, lineHeight: 1.3 }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: TEXT.dim, fontFamily: HF, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
                    {new Date(item.date).toLocaleDateString("ru", { month: "short", year: "2-digit" })}
                  </div>
                  {item.note && (
                    <div style={{ fontSize: 10, color: TEXT.dim, fontFamily: HF, marginTop: 2, fontStyle: "italic" }}>{item.note}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Coverage Checklist ─────────────────────────────────────────────────────── */
function CoverageChecklist({ items }: { items: CoverageItem[] }) {
  if (!items.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
      {items.map(item => (
        <div key={item.id} className="glass" style={{
          padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10,
          background: item.closed ? `${HC.green}08` : `${HC.red}08`,
          border: `1px solid ${item.closed ? HC.green + "25" : HC.red + "22"}`,
        }}>
          {item.closed
            ? <CheckCircle2 style={{ width: 16, height: 16, color: HC.green, flexShrink: 0, marginTop: 1 }} />
            : <XCircle style={{ width: 16, height: 16, color: HC.red, flexShrink: 0, marginTop: 1 }} />
          }
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT.hi, fontFamily: HF }}>{item.area}</div>
            <div style={{ fontSize: 11, color: TEXT.lo, fontFamily: HF, marginTop: 2 }}>{item.ownerRole}</div>
            {item.note && <div style={{ fontSize: 10, color: TEXT.dim, fontFamily: HF, marginTop: 2, fontStyle: "italic" }}>{item.note}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Top Management ─────────────────────────────────────────────────────────── */
function TopManagementCards({ people }: { people: TopPerson[] }) {
  if (!people.length) {
    return (
      <div style={{
        padding: "16px 18px", borderRadius: 12, background: `${HC.red}0a`,
        border: `1px solid ${HC.red}25`, display: "flex", alignItems: "center", gap: 10,
      }}>
        <XCircle style={{ width: 16, height: 16, color: HC.red, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: TEXT.mid, fontFamily: HF }}>Топ-менеджмент не назначен</span>
      </div>
    );
  }
  const order: Record<string, number> = { gd: 0, executive: 1, financial: 2, commercial: 3 };
  const sorted = [...people].sort((a, b) => (order[a.cLevel] ?? 9) - (order[b.cLevel] ?? 9));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
      {sorted.map(p => {
        const eff = p.effectiveness ?? null;
        const effColor = eff ? HC[eff] : "rgba(255,255,255,0.18)";
        return (
          <div key={p.id} className="glass" style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
                textTransform: "uppercase", color: TEXT.dim, fontFamily: HF,
              }}>{CLEVEL_LABELS[p.cLevel] ?? p.cLevel}</span>
              {eff && <HealthDot color={effColor} size={9} />}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT.hi, fontFamily: HF, lineHeight: 1.3 }}>{p.name}</div>
            {p.role && <div style={{ fontSize: 11, color: TEXT.lo, fontFamily: HF, marginTop: 3 }}>{p.role}</div>}
            {eff && (
              <div style={{
                display: "inline-block", marginTop: 8, padding: "2px 8px", borderRadius: 6,
                background: `${effColor}18`, color: effColor, fontSize: 10, fontWeight: 700,
                fontFamily: HF, letterSpacing: "0.04em",
              }}>
                {eff === "green" ? "Эффективен" : eff === "yellow" ? "Требует роста" : "Низкая эфф."}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Partners Block ─────────────────────────────────────────────────────────── */
function PartnersBlock({ data }: { data: BusinessCard }) {
  const biz = data.business;
  const revenue = data.latestReport?.revenue;
  const partners = biz.partners ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {revenue !== undefined && revenue !== null && (
        <div className="glass" style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT.dim, fontFamily: HF, marginBottom: 6 }}>Выручка · последний период</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: TEXT.hi, fontFamily: HF, fontVariantNumeric: "tabular-nums" }}>
              {formatMoney(revenue, biz.currency)}
            </div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,212,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(0,212,255,0.2)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
        </div>
      )}
      {partners.length > 0 && (
        <div className="glass" style={{ padding: "16px 18px" }}>
          <SectionLabel>Структура владения</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {partners.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: TEXT.hi, fontFamily: HF, fontWeight: 500 }}>{p.label}</span>
                    <span style={{ fontSize: 13, color: TEXT.mid, fontFamily: HF, fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{p.share}%</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.07)" }}>
                    <div style={{ height: "100%", borderRadius: 2, width: `${Math.min(p.share, 100)}%`, background: `linear-gradient(90deg, #00d4ff, #0099cc)`, transition: "width 400ms ease" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Non-Financial Health ────────────────────────────────────────────────────── */
function NonFinancialSection({ data }: { data: BusinessCard }) {
  const nf = data.business.nonFinancial;
  if (!nf) return null;
  const items: Array<{ key: keyof typeof nf; label: string }> = [
    { key: "reputation", label: "Репутация" },
    { key: "concept", label: "Концепция" },
    { key: "media", label: "Медиа" },
  ];
  return (
    <div className="glass" style={{ padding: "18px 20px" }}>
      <SectionLabel>Нефинансовое здоровье</SectionLabel>
      <div style={{ display: "flex", gap: 20, marginBottom: nf.note ? 14 : 0 }}>
        {items.map(({ key, label }) => {
          const val = nf[key] as string;
          const c = HC[val] ?? HC.green;
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <HealthDot color={c} size={10} />
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT.dim, fontFamily: HF }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: c, fontFamily: HF, marginTop: 1 }}>
                  {val === "green" ? "Хорошо" : val === "yellow" ? "Внимание" : "Риск"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {nf.note && (
        <div style={{ fontSize: 12, color: TEXT.mid, fontFamily: HF, lineHeight: 1.6, fontStyle: "italic", paddingTop: 12, borderTop: `1px solid ${DIVIDER}` }}>
          {nf.note}
        </div>
      )}
    </div>
  );
}

// ── Analytics types ──────────────────────────────────────────────────────────
type OvFunding  = { date: string; amount: number; round: string };
type OvInvData  = { runwayMonths: number; burnRateMonthly: number; burnRatePrevious?: number; cashOnHand: number; fundingRounds?: OvFunding[] };
type OvPFItem   = { metric: string; plan: number; actual: number; unit: string };
type OvBalChange = { equity: { start: number; end: number }; debt: { start: number; end: number }; profit: { start: number; end: number; plan: number } };
type OvAnalytics = {
  stage?: "investment" | "operational";
  forms?: { bdr?: Record<string, number>; odds?: Record<string, number>; balance?: Record<string, number> };
  balanceChange?: OvBalChange;
  investmentData?: OvInvData;
  planFact?: OvPFItem[];
};

// ── Compact money formatter ───────────────────────────────────────────────────
function fmt(v: number, currency: string): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "RUB" ? "₽" : currency;
  if (abs >= 1_000_000_000) return `${sign}${sym}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000)     return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)         return `${sign}${sym}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${sym}${abs.toFixed(0)}`;
}

// ── Waterfall helpers ─────────────────────────────────────────────────────────
type WfStep = { label: string; value: number; rawValue: number; type: "inflow" | "deduction" | "result" };

function bdrFind(bdr: Record<string, number>, pat: RegExp) {
  const entry = Object.entries(bdr).find(([k]) => pat.test(k));
  return entry ? { key: entry[0], val: entry[1] } : null;
}

function buildWaterfallSteps(bdr: Record<string, number>): WfStep[] | null {
  const rev = bdrFind(bdr, /выручка/i);
  const net = bdrFind(bdr, /чистая прибыль/i) ?? bdrFind(bdr, /убыток/i);
  if (!rev || !net || rev.val <= 0) return null;
  const revenue = rev.val; const netProfit = net.val;
  const ebitda = bdrFind(bdr, /^ebitda$/i);
  const steps: WfStep[] = [];
  steps.push({ label: "Выручка", value: revenue, rawValue: revenue, type: "inflow" });
  if (ebitda !== null) {
    const preExp = revenue - ebitda.val;
    if (preExp > 0) steps.push({ label: "Операционные расходы", value: preExp, rawValue: -preExp, type: "deduction" });
    steps.push({ label: "EBITDA", value: Math.abs(ebitda.val), rawValue: ebitda.val, type: "result" });
    const postExp = ebitda.val - netProfit;
    if (postExp > 0) steps.push({ label: "Прочие расходы", value: postExp, rawValue: -postExp, type: "deduction" });
  } else {
    const cogs = bdrFind(bdr, /себестоимость/i);
    const totalExpenses = revenue - netProfit;
    if (cogs && cogs.val > 0 && cogs.val < totalExpenses) {
      steps.push({ label: "Себестоимость", value: cogs.val, rawValue: -cogs.val, type: "deduction" });
      const rem = totalExpenses - cogs.val;
      if (rem > 0) steps.push({ label: "Прочие расходы", value: rem, rawValue: -rem, type: "deduction" });
    } else if (totalExpenses > 0) {
      steps.push({ label: "Операционные расходы", value: totalExpenses, rawValue: -totalExpenses, type: "deduction" });
    }
  }
  const isLoss = netProfit < 0;
  steps.push({ label: isLoss ? "Убыток" : "Чистая прибыль", value: Math.abs(netProfit), rawValue: netProfit, type: "result" });
  return steps;
}

function WaterfallBlock({ bdr, currency }: { bdr: Record<string, number>; currency: string }) {
  const steps = buildWaterfallSteps(bdr);
  if (!steps || steps.length < 3) return null;
  const revenue = steps[0].value;
  const netStep = steps[steps.length - 1];
  const MAX_PCT = 88;
  let running = revenue;
  type Computed = { step: WfStep; barLeft: number; barWidth: number; color: string };
  const computed: Computed[] = steps.map(step => {
    let barLeft: number, barWidth: number, color: string;
    if (step.type === "inflow") { barLeft = 0; barWidth = MAX_PCT; color = "#5b8fff"; }
    else if (step.type === "deduction") {
      running -= step.value;
      barLeft = Math.max(0, (running / revenue) * MAX_PCT);
      barWidth = (step.value / revenue) * MAX_PCT; color = HC.red;
    } else {
      barLeft = 0; barWidth = Math.max(0.4, (Math.abs(step.value) / revenue) * MAX_PCT);
      const isLast = step === netStep;
      color = isLast ? (step.rawValue < 0 ? HC.red : step.rawValue < revenue * 0.05 ? HC.yellow : HC.green) : "#5b8bd0";
    }
    return { step, barLeft, barWidth, color };
  });
  const netProfit = netStep.rawValue;
  const summaryLabel = netProfit < 0
    ? `Убыток ${fmt(Math.abs(netProfit), currency)} при выручке ${fmt(revenue, currency)}`
    : `Из ${fmt(revenue, currency)} до прибыли доходит ${fmt(netProfit, currency)} (${((netProfit / revenue) * 100).toFixed(1)}%)`;
  return (
    <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT.lo, fontFamily: HF, marginBottom: 6 }}>Куда уходит выручка</div>
      {computed.map(({ step, barLeft, barWidth, color }, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 26 }}>
          <div style={{ fontSize: 11, color: step.type === "result" ? TEXT.mid : TEXT.lo, fontFamily: HF, fontWeight: step.type === "result" ? 600 : 400, width: 130, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{step.label}</div>
          <div style={{ flex: 1, position: "relative", height: step.type === "result" ? 14 : 10, borderRadius: 4, background: "rgba(255,255,255,0.05)" }}>
            <div style={{ position: "absolute", top: 0, height: "100%", left: `${barLeft}%`, width: `${Math.max(0.3, barWidth)}%`, borderRadius: 4, background: step.type === "inflow" ? "linear-gradient(90deg,#3a6aff,#5b8fff)" : step.type === "deduction" ? `linear-gradient(90deg,${color}cc,${color})` : `linear-gradient(90deg,${color}99,${color})`, boxShadow: step.type === "result" ? `0 0 8px ${color}44` : "none" }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: step.type === "result" ? 700 : 500, color: step.type === "deduction" ? HC.red : step.type === "result" ? color : TEXT.mid, fontFamily: HF, width: 80, flexShrink: 0, textAlign: "right" }}>
            {step.type === "deduction" ? "−" : ""}{fmt(step.value, currency)}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: 11, color: TEXT.lo, fontFamily: HF, lineHeight: 1.5 }}>{summaryLabel}</div>
    </div>
  );
}

// ── Margin Donut ──────────────────────────────────────────────────────────────
function MarginDonut({ bdr, planFact, currency }: { bdr: Record<string, number>; planFact: OvPFItem[]; currency: string }) {
  const rev = bdrFind(bdr, /выручка/i);
  const net = bdrFind(bdr, /чистая прибыль/i) ?? bdrFind(bdr, /убыток/i);
  if (!rev || !net || rev.val <= 0) return null;
  const marginPct = (net.val / rev.val) * 100;
  let planMarginPct: number | null = null;
  const planRevItem = planFact.find(m => /оборот|выручка/i.test(m.metric));
  const planProfitItem = planFact.find(m => /чистая прибыль/i.test(m.metric));
  if (planRevItem && planProfitItem && planRevItem.plan > 0) planMarginPct = (planProfitItem.plan / planRevItem.plan) * 100;
  let arcColor: string;
  if (planMarginPct !== null) arcColor = marginPct >= planMarginPct * 0.95 ? HC.green : marginPct >= planMarginPct * 0.80 ? HC.yellow : HC.red;
  else arcColor = marginPct >= 15 ? HC.green : marginPct >= 5 ? HC.yellow : HC.red;
  const R = 44; const cx = 58; const cy = 58;
  const circumference = 2 * Math.PI * R;
  const clampedPct = Math.max(0, Math.min(100, Math.abs(marginPct)));
  const dash = (clampedPct / 100) * circumference;
  const gap = circumference - dash;
  const planAngle = planMarginPct !== null ? ((Math.min(100, Math.abs(planMarginPct)) / 100) * 360) - 90 : null;
  const planX = planAngle !== null ? cx + (R + 6) * Math.cos((planAngle * Math.PI) / 180) : null;
  const planY = planAngle !== null ? cy + (R + 6) * Math.sin((planAngle * Math.PI) / 180) : null;
  const statusLabel = planMarginPct !== null
    ? (marginPct >= planMarginPct * 0.95 ? "В плане" : marginPct >= planMarginPct * 0.80 ? "Ниже плана" : "Критично")
    : (marginPct >= 15 ? "Норма" : marginPct >= 5 ? "Ниже нормы" : "Критично");
  void currency;
  return (
    <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: "18px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 140 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT.lo, fontFamily: HF }}>Чистая маржа</div>
      <svg width={116} height={116} viewBox="0 0 116 116">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={9} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={arcColor} strokeWidth={9} strokeDasharray={`${dash} ${gap}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} style={{ filter: `drop-shadow(0 0 6px ${arcColor}66)` }} />
        {planX !== null && planY !== null && <circle cx={planX} cy={planY} r={3} fill="rgba(228,232,255,0.8)" />}
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize={18} fontWeight={800} fill={arcColor} fontFamily="'Hanken Grotesk',system-ui,sans-serif">{marginPct.toFixed(marginPct < 1 ? 2 : 1)}%</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize={8.5} fontWeight={600} fill="rgba(228,232,255,0.4)" fontFamily="'Hanken Grotesk',system-ui,sans-serif" letterSpacing="0.05em">МАРЖА</text>
        {planMarginPct !== null && <text x={cx} y={cy + 24} textAnchor="middle" fontSize={8} fontWeight={500} fill="rgba(228,232,255,0.28)" fontFamily="'Hanken Grotesk',system-ui,sans-serif">цель {planMarginPct.toFixed(1)}%</text>}
      </svg>
      <div style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 600, fontFamily: HF, background: `${arcColor}18`, color: arcColor, border: `1px solid ${arcColor}44` }}>{statusLabel}</div>
    </div>
  );
}

// ── Balance Change Block ──────────────────────────────────────────────────────
function profitColor(factIncrement: number, planIncrement: number): string {
  if (planIncrement <= 0) return TEXT.mid;
  const r = factIncrement / planIncrement;
  return r >= 1 ? "#3ed9a0" : r >= 0.7 ? "#f0b54a" : "#f0625a";
}

function BalanceChangeBlock({ bc, currency }: { bc: OvBalChange; currency: string }) {
  const factIncrement = bc.profit.end - bc.profit.start;
  const color = profitColor(factIncrement, bc.profit.plan);
  const rows = [
    { label: "Собственный капитал", start: bc.equity.start, end: bc.equity.end, isProfit: false },
    { label: "Заёмные средства",    start: bc.debt.start,   end: bc.debt.end,   isProfit: false },
    { label: "Прибыль",             start: bc.profit.start, end: bc.profit.end, isProfit: true },
  ];
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <h3 style={{ fontSize: 12, fontWeight: 600, color: TEXT.lo, fontFamily: HF, marginBottom: 2 }}>Изменение баланса за квартал</h3>
      <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", overflow: "hidden" }}>
        {rows.map((row, i) => {
          const delta = row.end - row.start;
          const isUp = delta >= 0;
          const rowColor = row.isProfit ? color : TEXT.dim;
          return (
            <div key={row.label} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 18px", borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", background: row.isProfit ? "rgba(255,255,255,0.02)" : "transparent" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, marginTop: 5, background: row.isProfit ? color : "rgba(255,255,255,0.15)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", rowGap: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: row.isProfit ? 600 : 400, color: row.isProfit ? TEXT.mid : TEXT.lo, fontFamily: HF }}>{row.label}</span>
                  <span style={{ fontSize: 11, color: TEXT.dim, fontFamily: HF }}>{fmt(row.start, currency)}<span style={{ margin: "0 3px", opacity: 0.5 }}>→</span>{fmt(row.end, currency)}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, fontFamily: HF, color: rowColor }}>
                    {row.isProfit ? null : (isUp ? "↑" : "↓")}{" "}{delta >= 0 ? "+" : "−"}{fmt(Math.abs(delta), currency)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Investment Blocks ─────────────────────────────────────────────────────────
function RunwayBlock({ data, currency }: { data: OvInvData; currency: string }) {
  const { runwayMonths, cashOnHand } = data;
  const color = runwayMonths >= 12 ? HC.green : runwayMonths >= 6 ? HC.yellow : HC.red;
  const label = runwayMonths >= 12 ? "Устойчиво" : runwayMonths >= 6 ? "Внимание" : "Критично";
  const barPct = Math.min(100, (runwayMonths / 24) * 100);
  void currency;
  return (
    <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT.lo, fontFamily: HF }}>Runway</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
        <span style={{ fontSize: 44, fontWeight: 800, color, fontFamily: HF, lineHeight: 1, filter: `drop-shadow(0 0 12px ${color}55)` }}>{runwayMonths}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: TEXT.mid, fontFamily: HF, paddingBottom: 5 }}>мес.</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 4, width: `${barPct}%`, background: `linear-gradient(90deg,${color}88,${color})` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 10, fontWeight: 600, fontFamily: HF, background: `${color}18`, color, border: `1px solid ${color}44` }}>{label}</span>
        <span style={{ fontSize: 11, color: TEXT.lo, fontFamily: HF }}>{fmt(cashOnHand, currency)} на счетах</span>
      </div>
    </div>
  );
}

function BurnRateBlock({ data, currency }: { data: OvInvData; currency: string }) {
  const { burnRateMonthly, burnRatePrevious } = data;
  const delta = burnRatePrevious != null ? burnRateMonthly - burnRatePrevious : null;
  const deltaPct = delta != null && burnRatePrevious ? Math.abs((delta / burnRatePrevious) * 100).toFixed(1) : null;
  const trendColor = delta == null ? TEXT.mid : delta > 0 ? HC.red : HC.green;
  const TrendIcon = delta == null ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  return (
    <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT.lo, fontFamily: HF }}>Burn Rate / мес.</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: TEXT.hi, fontFamily: HF, lineHeight: 1 }}>{fmt(burnRateMonthly, currency)}</div>
      {delta != null && deltaPct != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontFamily: HF, color: trendColor }}>
          <TrendIcon style={{ width: 13, height: 13, flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>{delta > 0 ? "+" : "−"}{deltaPct}% к прошлому месяцу</span>
        </div>
      )}
      {burnRatePrevious != null && <div style={{ fontSize: 11, color: TEXT.dim, fontFamily: HF }}>Прошлый: {fmt(burnRatePrevious, currency)}</div>}
    </div>
  );
}

function FundingChartBlock({ data, currency }: { data: OvInvData; currency: string }) {
  const rounds = data.fundingRounds;
  if (!rounds || rounds.length === 0) return null;
  const chartData = rounds.map(r => ({ label: r.round, amount: r.amount }));
  const maxAmount = Math.max(...chartData.map(d => d.amount));
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <h3 style={{ fontSize: 12, fontWeight: 600, color: TEXT.lo, fontFamily: HF, marginBottom: 2 }}>История финансирования</h3>
      <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: "16px 6px 8px" }}>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 6, right: 14, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(91,139,208,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.08)" tick={{ fill: TEXT.lo, fontSize: 10, fontFamily: HF }} />
              <YAxis stroke="rgba(255,255,255,0.08)" tick={{ fill: TEXT.lo, fontSize: 10, fontFamily: HF }} tickFormatter={(v) => fmt(v, currency)} width={70} />
              <RechartsTooltip contentStyle={{ backgroundColor: "rgba(11,11,18,0.95)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, fontSize: 12, fontFamily: HF }} formatter={(v: number) => [fmt(v, currency), "Объём"]} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, idx) => <Cell key={idx} fill={entry.amount === maxAmount ? "#5b8bd0" : "rgba(91,139,208,0.45)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

// ── Form Accordion ────────────────────────────────────────────────────────────
function FormAccordion({ title, data, currency }: { title: string; data: Record<string, number>; currency: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", background: "rgba(255,255,255,0.025)" }}>
      <button style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", background: "transparent", cursor: "pointer", transition: "background 150ms" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(91,139,208,0.05)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        onClick={() => setOpen((o: boolean) => !o)}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT.mid, fontFamily: HF }}>{title}</span>
        {open ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: TEXT.dim }} /> : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: TEXT.dim }} />}
      </button>
      {open && (
        <div style={{ padding: "0 18px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {Object.entries(data).map(([key, val]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", gap: 14 }}>
              <span style={{ fontSize: 12, color: TEXT.lo, fontFamily: HF }}>{key}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: val < 0 ? HC.red : TEXT.hi, fontFamily: HF, flexShrink: 0 }}>{fmt(val, currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Overlay ───────────────────────────────────────────────────────────── */
export default function BusinessCardOverlay({
  businessId,
  onClose,
  onAskChat,
}: {
  businessId: number;
  onClose: () => void;
  onAskChat: (bizName: string) => void;
}) {
  const { data, isLoading } = useGetBusinessCard(
    { id: businessId },
    { query: { queryKey: getGetBusinessCardQueryKey({ id: businessId }) } },
  );

  const { data: bizDetail } = useGetBusiness(businessId, {
    query: { enabled: !!businessId, queryKey: getGetBusinessQueryKey(businessId) },
  });

  const biz = data?.business;
  const health = biz?.health ?? "green";
  const healthColor = HC[health] ?? HC.green;
  const isInternal = biz?.circle === "internal";
  const isExternal = biz?.circle === "external_passive";

  const stageMetrics = data?.metrics.filter(m => m.stageScope === biz?.stage) ?? [];
  const whySummary = stageMetrics.length ? buildWhySummary(stageMetrics) : [];

  const hasMgmt = (data?.topManagement?.length ?? 0) > 0;
  const noPmSeo = isInternal && !hasMgmt;

  const lastReportDate = data?.latestReport?.date
    ? new Date(data.latestReport.date).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const analytics = (bizDetail?.analytics as OvAnalytics | null | undefined) ?? null;
  const currency = biz?.currency ?? "USD";
  const bdr = analytics?.forms?.bdr;
  const showFinancialVisuals = analytics?.stage === "operational" && bdr && bdrFind(bdr, /выручка/i) && bdrFind(bdr, /чистая прибыль/i);

  function handleAskChat() {
    if (!biz) return;
    onAskChat(biz.name);
  }

  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 40,
        background: "rgba(2,6,14,0.72)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        style={{
          position: "absolute", inset: "0",
          background: PANEL_BG,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Sticky Header ── */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: `1px solid ${DIVIDER}`,
          background: "rgba(6,11,24,0.98)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Health + name */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <HealthDot color={healthColor} size={13} pulse={health === "red"} />
                <span style={{ fontSize: 11, fontWeight: 700, color: healthColor, fontFamily: HF, letterSpacing: "0.04em" }}>
                  {HEALTH_LABELS[health]}
                </span>
                {whySummary.length > 0 && (
                  <span style={{ fontSize: 11, color: TEXT.dim, fontFamily: HF }}>· {whySummary[0]}</span>
                )}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: TEXT.hi, fontFamily: HF, lineHeight: 1.2, marginBottom: 10 }}>
                {biz?.name ?? "…"}
              </h2>
              {/* Chips */}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                {biz?.stage && (
                  <Chip
                    label={STAGE_LABELS[biz.stage] ?? biz.stage}
                    color={biz.stage === "investment" ? "#f0b54a" : "#00d4ff"}
                    bg={biz.stage === "investment" ? "rgba(240,181,74,0.13)" : "rgba(0,212,255,0.11)"}
                  />
                )}
                {biz?.circle && (
                  <Chip
                    label={CIRCLE_LABELS[biz.circle] ?? biz.circle}
                    color={isInternal ? "#3ed9a0" : "#a78bfa"}
                    bg={isInternal ? "rgba(62,217,160,0.10)" : "rgba(167,139,250,0.12)"}
                  />
                )}
                {noPmSeo && (
                  <Chip label="Нет топ-менеджмента" color={HC.red} bg="rgba(240,98,90,0.12)" />
                )}
              </div>
              {/* Manager + date */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 10 }}>
                {biz?.managerName && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: TEXT.lo, fontSize: 12, fontFamily: HF }}>
                    <User style={{ width: 13, height: 13, flexShrink: 0 }} />
                    <span>{biz.managerName}</span>
                  </div>
                )}
                {lastReportDate && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: TEXT.dim, fontSize: 12, fontFamily: HF }}>
                    <Calendar style={{ width: 13, height: 13, flexShrink: 0 }} />
                    <span>Отчёт: {lastReportDate}</span>
                  </div>
                )}
                {biz?.city && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: TEXT.dim, fontSize: 12, fontFamily: HF }}>
                    <MapPin style={{ width: 13, height: 13, flexShrink: 0 }} />
                    <span>{biz.city}, {biz.country}</span>
                  </div>
                )}
              </div>
            </div>
            {/* Close */}
            <button
              onClick={onClose}
              style={{
                minWidth: 44, minHeight: 44, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
                color: TEXT.lo, cursor: "pointer", flexShrink: 0,
                transition: "background 150ms",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.10)")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)")}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

          {isLoading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
              <Loader2 style={{ width: 36, height: 36, color: "#00d4ff", animation: "spin 1s linear infinite" }} />
            </div>
          )}

          {!isLoading && data && (
            <>
              {/* ── "Почему такой цвет" alert ── */}
              {whySummary.length > 0 && (
                <div style={{
                  padding: "14px 18px", borderRadius: 12,
                  background: `${healthColor}0d`,
                  border: `1px solid ${healthColor}30`,
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: healthColor, fontFamily: HF, marginBottom: 2 }}>
                    Почему статус «{HEALTH_LABELS[health]}»
                  </div>
                  {whySummary.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: TEXT.mid, fontFamily: HF }}>
                      <ChevronRight style={{ width: 13, height: 13, color: healthColor, flexShrink: 0 }} />
                      {s}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Plan-fact section ── */}
              <div>
                <SectionLabel>
                  План-факт · {biz?.stage === "investment" ? "инвестиционные показатели" : "операционные показатели"}
                </SectionLabel>
                <div className="glass" style={{ padding: 0, overflow: "hidden" }}>
                  <PlanFactTable metrics={stageMetrics} />
                </div>
              </div>

              {/* ── INTERNAL blocks ── */}
              {isInternal && (
                <>
                  {/* Roadmap */}
                  {data.roadmap.length > 0 && (
                    <div>
                      <SectionLabel>Роадмап</SectionLabel>
                      <div className="glass" style={{ padding: "16px 20px" }}>
                        <RoadmapTimeline items={data.roadmap} />
                      </div>
                    </div>
                  )}

                  {/* Coverage */}
                  {data.coverage.length > 0 && (
                    <div>
                      <SectionLabel>Участки закрыты?</SectionLabel>
                      <CoverageChecklist items={data.coverage} />
                    </div>
                  )}

                  {/* Top management */}
                  <div>
                    <SectionLabel>Эффективность топ-менеджмента</SectionLabel>
                    <TopManagementCards people={data.topManagement} />
                  </div>
                </>
              )}

              {/* ── EXTERNAL block ── */}
              {isExternal && (
                <div>
                  <SectionLabel>Внешняя позиция</SectionLabel>
                  <PartnersBlock data={data} />
                </div>
              )}

              {/* ── Non-financial health ── */}
              {biz?.nonFinancial && (
                <NonFinancialSection data={data} />
              )}

              {/* ── Description ── */}
              {biz?.description && (
                <div className="glass" style={{ padding: "14px 18px" }}>
                  <SectionLabel>О компании</SectionLabel>
                  <p style={{ fontSize: 13, color: TEXT.mid, fontFamily: HF, lineHeight: 1.7 }}>{biz.description}</p>
                </div>
              )}

              {/* ── Financial visuals: Waterfall + Margin Donut ── */}
              {showFinancialVisuals && bdr && (
                <div>
                  <SectionLabel>Финансовый анализ</SectionLabel>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "stretch" }}>
                    <WaterfallBlock bdr={bdr} currency={currency} />
                    {analytics?.planFact && analytics.planFact.length > 0 && (
                      <MarginDonut bdr={bdr} planFact={analytics.planFact} currency={currency} />
                    )}
                  </div>
                </div>
              )}

              {/* ── Balance Change ── */}
              {analytics?.stage === "operational" && analytics.balanceChange && (
                <div>
                  <BalanceChangeBlock bc={analytics.balanceChange} currency={currency} />
                </div>
              )}

              {/* ── Investment Metrics ── */}
              {analytics?.stage === "investment" && analytics.investmentData && (
                <>
                  <div>
                    <SectionLabel>Инвестиционные метрики</SectionLabel>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "stretch" }}>
                      <RunwayBlock data={analytics.investmentData} currency={currency} />
                      <BurnRateBlock data={analytics.investmentData} currency={currency} />
                    </div>
                  </div>
                  <FundingChartBlock data={analytics.investmentData} currency={currency} />
                </>
              )}

              {/* ── Financial Forms (BDR / ODDS / Balance) ── */}
              {analytics?.forms && (
                <div>
                  <SectionLabel>Финансовые формы</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {analytics.forms.bdr && Object.keys(analytics.forms.bdr).length > 0 && (
                      <FormAccordion title="БДР — Бюджет доходов и расходов" data={analytics.forms.bdr} currency={currency} />
                    )}
                    {analytics.forms.odds && Object.keys(analytics.forms.odds).length > 0 && (
                      <FormAccordion title="ОДДС — Движение денежных средств" data={analytics.forms.odds} currency={currency} />
                    )}
                    {analytics.forms.balance && Object.keys(analytics.forms.balance).length > 0 && (
                      <FormAccordion title="Баланс" data={analytics.forms.balance} currency={currency} />
                    )}
                  </div>
                </div>
              )}

              {/* ── Ask AI button ── */}
              <div>
                <button
                  onClick={handleAskChat}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", minHeight: 48, borderRadius: 14,
                    background: "rgba(0,212,255,0.10)",
                    border: "1px solid rgba(0,212,255,0.28)",
                    color: "#00d4ff", fontFamily: HF, fontSize: 13, fontWeight: 700,
                    letterSpacing: "0.04em", cursor: "pointer",
                    transition: "background 200ms, border-color 200ms",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,255,0.17)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,212,255,0.45)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,255,0.10)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,212,255,0.28)";
                  }}
                >
                  <MessageSquare style={{ width: 16, height: 16 }} />
                  Спросить о компании
                </button>
              </div>
            </>
          )}

          {!isLoading && !data && (
            <div style={{ textAlign: "center", padding: "64px 0", color: TEXT.dim, fontSize: 14, fontFamily: HF }}>
              Нет данных для этой компании
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
