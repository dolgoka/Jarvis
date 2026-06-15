import { useGetBusinessCard, getGetBusinessCardQueryKey } from "@workspace/api-client-react";
import type { Metric, RoadmapItem, CoverageItem, TopPerson, BusinessCard } from "@workspace/api-client-react";
import { X, MessageSquare, MapPin, Calendar, User, CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";

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

/* ── Main Overlay ───────────────────────────────────────────────────────────── */
export default function BusinessCardOverlay({
  businessId,
  onClose,
}: {
  businessId: number;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const { data, isLoading } = useGetBusinessCard(
    { id: businessId },
    { query: { queryKey: getGetBusinessCardQueryKey({ id: businessId }) } },
  );

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

  function handleAskChat() {
    if (!biz) return;
    const msg = encodeURIComponent(`Расскажи подробнее о компании «${biz.name}»`);
    navigate(`/chat?message=${msg}`);
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
