import { useState } from "react";
import { useLocation } from "wouter";
import { Mic, Lock, AlertTriangle } from "lucide-react";
import { BATOV_DEALS, type DealStage } from "@/data/batov-deals";
import { BATOV_PEOPLE } from "@/data/batov-people";

const HF = "'Hanken Grotesk', system-ui, sans-serif";

/* ── stage config ─────────────────────────────────────────────────────────── */
const STAGE_LABEL: Record<DealStage, string> = {
  active: "Активна",
  hold:   "На холде",
  won:    "Закрыта ✓",
  lost:   "Потеряна",
};

const STAGE_COLOR: Record<DealStage, string> = {
  active: "#00d4ff",
  hold:   "#f0b54a",
  won:    "#3ed9a0",
  lost:   "rgba(228,232,255,0.28)",
};

const STAGE_BG: Record<DealStage, string> = {
  active: "rgba(0,212,255,0.10)",
  hold:   "rgba(240,181,74,0.12)",
  won:    "rgba(62,217,160,0.10)",
  lost:   "rgba(228,232,255,0.04)",
};

/* ── filter types ────────────────────────────────────────────────────────── */
type Filter = "all" | "active" | "hold" | "closed" | "stuck";

const FILTER_LABELS: Record<Filter, string> = {
  all:    "Все",
  active: "Активные",
  hold:   "На холде",
  closed: "Закрытые",
  stuck:  "Застряли",
};

/* ── DeskDeals ───────────────────────────────────────────────────────────── */
export default function DeskDeals() {
  const [filter, setFilter] = useState<Filter>("all");
  const [, navigate] = useLocation();

  const counts: Record<Filter, number> = {
    all:    BATOV_DEALS.length,
    active: BATOV_DEALS.filter((d) => d.stage === "active").length,
    hold:   BATOV_DEALS.filter((d) => d.stage === "hold").length,
    closed: BATOV_DEALS.filter((d) => d.isClosed).length,
    stuck:  BATOV_DEALS.filter((d) => d.stuckDays != null).length,
  };

  const visible = BATOV_DEALS.filter((d) => {
    if (filter === "all")    return true;
    if (filter === "active") return d.stage === "active";
    if (filter === "hold")   return d.stage === "hold";
    if (filter === "closed") return d.isClosed;
    if (filter === "stuck")  return d.stuckDays != null;
    return true;
  });

  const filters: Filter[] = ["all", "active", "hold", "closed", "stuck"];

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--jarvis-bg-screen)",
      padding: "24px 20px",
      paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
      boxSizing: "border-box",
      maxWidth: 680,
      margin: "0 auto",
    }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        marginBottom: 20, flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 10 }}>
          <h1 style={{
            fontFamily: HF, fontWeight: 800, fontSize: 22,
            color: "var(--jarvis-text-primary)",
            margin: 0, letterSpacing: "-0.01em",
          }}>
            Проекты-сделки
          </h1>
          <span style={{
            fontFamily: HF, fontSize: 13, fontWeight: 600,
            color: "var(--jarvis-text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}>
            {BATOV_DEALS.length}
          </span>
        </div>
        <button
          onClick={() => {}}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            height: 44, padding: "0 16px", borderRadius: 22,
            background: "var(--jarvis-bg-card)",
            border: "1px solid var(--jarvis-glass-border-accent)",
            color: "var(--jarvis-accent)",
            cursor: "pointer", fontFamily: HF, fontWeight: 600, fontSize: 13,
            flexShrink: 0,
          }}
        >
          <Mic style={{ width: 14, height: 14 }} />
          Добавить голосом
        </button>
      </div>

      {/* ── Filter chips ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {filters.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                height: 34, padding: "0 12px", borderRadius: 17,
                background: active ? "rgba(0,212,255,0.12)" : "var(--jarvis-bg-card)",
                border: active
                  ? "1px solid rgba(0,212,255,0.40)"
                  : "1px solid var(--jarvis-glass-border)",
                color: active ? "var(--jarvis-accent)" : "var(--jarvis-text-secondary)",
                cursor: "pointer", fontFamily: HF, fontWeight: 600, fontSize: 12,
                transition: "all 140ms",
              }}
            >
              {FILTER_LABELS[f]}
              <span style={{
                fontVariantNumeric: "tabular-nums",
                background: active ? "rgba(0,212,255,0.18)" : "rgba(228,232,255,0.06)",
                borderRadius: 8, padding: "1px 5px", fontSize: 11,
              }}>
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Deal cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.length === 0 && (
          <p style={{
            fontFamily: HF, fontSize: 14,
            color: "var(--jarvis-text-secondary)",
            textAlign: "center", marginTop: 40,
          }}>
            Нет сделок по этому фильтру
          </p>
        )}

        {visible.map((deal) => {
          const partner = BATOV_PEOPLE.find((p) => p.id === deal.partnerId);

          return (
            <button
              key={deal.id}
              onClick={() => navigate(`/people/${deal.partnerId}`)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: "var(--jarvis-bg-card)",
                border: deal.stuckDays != null
                  ? "1px solid rgba(240,98,90,0.40)"
                  : "1px solid var(--jarvis-glass-border)",
                borderRadius: 12, padding: "14px 16px",
                cursor: "pointer", transition: "border-color 140ms",
              }}
              onMouseEnter={(e) => {
                if (!deal.stuckDays)
                  e.currentTarget.style.borderColor = "var(--jarvis-accent-35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = deal.stuckDays != null
                  ? "rgba(240,98,90,0.40)"
                  : "var(--jarvis-glass-border)";
              }}
            >
              {/* Stuck banner */}
              {deal.stuckDays != null && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(240,98,90,0.08)",
                  border: "1px solid rgba(240,98,90,0.22)",
                  borderRadius: 6, padding: "5px 10px", marginBottom: 10,
                  color: "#f0625a",
                  fontFamily: HF, fontWeight: 700, fontSize: 11,
                }}>
                  <AlertTriangle style={{ width: 11, height: 11, flexShrink: 0 }} />
                  Застряла {deal.stuckDays} дн
                </div>
              )}

              {/* Title row + amount */}
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8,
              }}>
                <div style={{
                  flex: 1, minWidth: 0,
                  fontFamily: HF, fontWeight: 700, fontSize: 14,
                  color: "var(--jarvis-text-primary)", lineHeight: 1.35,
                }}>
                  {deal.title}
                </div>
                {deal.amount && (
                  <div style={{
                    fontFamily: HF, fontSize: 13, fontWeight: 700,
                    color: "var(--jarvis-text-primary)",
                    fontVariantNumeric: "tabular-nums",
                    flexShrink: 0, marginTop: 1,
                  }}>
                    {deal.amount}
                  </div>
                )}
              </div>

              {/* Stage badge + closed marker */}
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                marginBottom: 9, flexWrap: "wrap",
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center",
                  height: 22, padding: "0 9px", borderRadius: 6,
                  background: STAGE_BG[deal.stage],
                  border: `1px solid ${STAGE_COLOR[deal.stage]}40`,
                  color: STAGE_COLOR[deal.stage],
                  fontFamily: HF, fontWeight: 700, fontSize: 11,
                }}>
                  {STAGE_LABEL[deal.stage]}
                </span>

                {deal.isClosed && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    height: 22, padding: "0 9px", borderRadius: 6,
                    background: "rgba(228,232,255,0.04)",
                    border: "1px solid rgba(228,232,255,0.09)",
                    color: "rgba(228,232,255,0.30)",
                    fontFamily: HF, fontWeight: 600, fontSize: 11,
                  }}>
                    <Lock style={{ width: 9, height: 9 }} />
                    Закрытый трек
                  </span>
                )}
              </div>

              {/* Owner + partner link */}
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: 10, flexWrap: "wrap",
              }}>
                <div style={{
                  fontFamily: HF, fontSize: 12,
                  color: "var(--jarvis-text-secondary)",
                }}>
                  {deal.owner
                    ? <>Отдана:&nbsp;<span style={{ color: "var(--jarvis-text-primary)", fontWeight: 500 }}>{deal.owner}</span></>
                    : <span style={{ color: "var(--jarvis-text-muted)" }}>Веду сам</span>
                  }
                </div>
                {partner && (
                  <span
                    onClick={(e) => { e.stopPropagation(); navigate(`/people/${deal.partnerId}`); }}
                    style={{
                      fontFamily: HF, fontSize: 12, fontWeight: 600,
                      color: "var(--jarvis-accent)", cursor: "pointer",
                      textDecoration: "underline", textUnderlineOffset: 3,
                      textDecorationColor: "rgba(0,212,255,0.35)",
                      flexShrink: 0,
                    }}
                  >
                    {partner.name}
                  </span>
                )}
              </div>

              {/* Last activity */}
              <div style={{
                marginTop: 8,
                fontFamily: HF, fontSize: 11,
                color: "var(--jarvis-text-muted)",
              }}>
                Активность: {deal.lastActivity}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
