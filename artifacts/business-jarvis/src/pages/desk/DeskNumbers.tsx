import { useLocation } from "wouter";
import { AlertTriangle, TrendingUp, CheckCircle, Activity } from "lucide-react";
import { BATOV_DEALS, type DealStage } from "@/data/batov-deals";

const HF = "'Hanken Grotesk', system-ui, sans-serif";

/* ── stage dot color ─────────────────────────────────────────────────────── */
const STAGE_COLOR: Record<DealStage, string> = {
  active: "#00d4ff",
  hold:   "#f0b54a",
  won:    "#3ed9a0",
  lost:   "rgba(228,232,255,0.25)",
};

const STAGE_LABEL: Record<DealStage, string> = {
  active: "Активна",
  hold:   "На холде",
  won:    "Закрыта",
  lost:   "Потеряна",
};

/* ── DeskNumbers ─────────────────────────────────────────────────────────── */
export default function DeskNumbers() {
  const [, navigate] = useLocation();

  const active   = BATOV_DEALS.filter((d) => d.stage === "active");
  const won      = BATOV_DEALS.filter((d) => d.stage === "won");
  const stuck    = BATOV_DEALS.filter((d) => d.stuckDays != null);
  const withAmt  = active.filter((d) => d.amount != null);

  /* collect unique amount strings for active deals */
  const amountLines = withAmt.map((d) => d.amount!);

  const tiles = [
    {
      label:  "Активных сделок",
      value:  String(active.length),
      icon:   Activity,
      color:  "#00d4ff",
      bg:     "rgba(0,212,255,0.08)",
      border: "rgba(0,212,255,0.22)",
    },
    {
      label:  "С суммой в портфеле",
      value:  String(withAmt.length),
      sub:    amountLines.join("  ·  "),
      icon:   TrendingUp,
      color:  "#3ed9a0",
      bg:     "rgba(62,217,160,0.08)",
      border: "rgba(62,217,160,0.20)",
    },
    {
      label:  "Закрыто (won)",
      value:  String(won.length),
      icon:   CheckCircle,
      color:  "rgba(228,232,255,0.40)",
      bg:     "rgba(228,232,255,0.04)",
      border: "rgba(228,232,255,0.10)",
    },
    {
      label:  "Застряло",
      value:  String(stuck.length),
      icon:   AlertTriangle,
      color:  stuck.length > 0 ? "#f0625a" : "rgba(228,232,255,0.40)",
      bg:     stuck.length > 0 ? "rgba(240,98,90,0.08)"  : "rgba(228,232,255,0.04)",
      border: stuck.length > 0 ? "rgba(240,98,90,0.28)"  : "rgba(228,232,255,0.10)",
    },
  ];

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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: HF, fontWeight: 800, fontSize: 22,
          color: "var(--jarvis-text-primary)",
          margin: 0, letterSpacing: "-0.01em",
        }}>
          Цифры
        </h1>
        <p style={{
          fontFamily: HF, fontSize: 13,
          color: "var(--jarvis-text-secondary)",
          margin: "4px 0 0",
        }}>
          Общая картина по сделкам
        </p>
      </div>

      {/* ── Stat tiles ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 10, marginBottom: 24,
      }}>
        {tiles.map(({ label, value, sub, icon: Icon, color, bg, border }) => (
          <div key={label} style={{
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 12, padding: "16px 16px 14px",
          }}>
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 10,
            }}>
              <span style={{
                fontFamily: HF, fontSize: 11, fontWeight: 700,
                color: "var(--jarvis-text-muted)",
                textTransform: "uppercase", letterSpacing: "0.07em",
                lineHeight: 1.3,
              }}>
                {label}
              </span>
              <Icon style={{ width: 14, height: 14, color, flexShrink: 0 }} />
            </div>
            <div style={{
              fontFamily: HF, fontWeight: 800, fontSize: 32,
              color, fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}>
              {value}
            </div>
            {sub && (
              <div style={{
                fontFamily: HF, fontSize: 11,
                color: "var(--jarvis-text-muted)",
                marginTop: 6, lineHeight: 1.45,
                fontVariantNumeric: "tabular-nums",
              }}>
                {sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Deal list ── */}
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontFamily: HF, fontSize: 11, fontWeight: 700,
          color: "var(--jarvis-text-muted)",
          textTransform: "uppercase", letterSpacing: "0.09em",
          marginBottom: 10,
        }}>
          По трекам
        </div>

        <div style={{
          background: "var(--jarvis-bg-card)",
          border: "1px solid var(--jarvis-glass-border)",
          borderRadius: 12, overflow: "hidden",
        }}>
          {BATOV_DEALS.map((deal, i) => (
            <button
              key={deal.id}
              onClick={() => navigate(`/people/${deal.partnerId}`)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", minHeight: 52, padding: "12px 16px",
                background: "none",
                borderBottom: i < BATOV_DEALS.length - 1
                  ? "1px solid var(--jarvis-glass-border)"
                  : "none",
                border: "none",
                borderBottomColor: i < BATOV_DEALS.length - 1
                  ? "var(--jarvis-glass-border)"
                  : undefined,
                cursor: "pointer",
                textAlign: "left", fontFamily: HF,
                transition: "background 130ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(228,232,255,0.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
            >
              {/* Stage dot */}
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: STAGE_COLOR[deal.stage],
                flexShrink: 0, marginTop: 1,
                boxShadow: `0 0 6px ${STAGE_COLOR[deal.stage]}80`,
              }} />

              {/* Title + stuck marker */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: "var(--jarvis-text-primary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {deal.title}
                </div>
                <div style={{
                  fontSize: 11, color: "var(--jarvis-text-muted)",
                  marginTop: 2, display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span>{STAGE_LABEL[deal.stage]}</span>
                  {deal.stuckDays != null && (
                    <span style={{
                      color: "#f0625a", fontWeight: 700,
                      display: "inline-flex", alignItems: "center", gap: 3,
                    }}>
                      · ⚠ {deal.stuckDays} дн
                    </span>
                  )}
                </div>
              </div>

              {/* Amount */}
              {deal.amount && (
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: "var(--jarvis-text-primary)",
                  fontVariantNumeric: "tabular-nums",
                  flexShrink: 0,
                }}>
                  {deal.amount}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
