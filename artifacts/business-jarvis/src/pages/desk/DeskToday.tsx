import { useLocation } from "wouter";
import { Mic } from "lucide-react";
import { BATOV_PEOPLE } from "@/data/batov-people";
import { BATOV_PRIORITIES, type Bucket } from "@/data/batov-today";

const HF = "'Hanken Grotesk', system-ui, sans-serif";

/* ── helpers ────────────────────────────────────────────────────────────── */
const TODAY = new Date("2026-07-14");

function daysSince(isoDate: string): number {
  const d = new Date(isoDate);
  return Math.floor((TODAY.getTime() - d.getTime()) / 86_400_000);
}

function lastContact(p: (typeof BATOV_PEOPLE)[0]): number {
  return Math.min(daysSince(p.lastContactOnline), daysSince(p.lastContactInPerson));
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/* ── Block 1: Вернуться к людям ──────────────────────────────────────────── */
function PeopleBlock() {
  const [, navigate] = useLocation();

  const overdue = BATOV_PEOPLE
    .map((p) => ({ ...p, days: lastContact(p) }))
    .filter((p) => p.days >= 7)
    .sort((a, b) => b.days - a.days);

  return (
    <section style={sCard}>
      <h2 style={sBlockTitle}>Вернуться к людям</h2>
      {overdue.length === 0 ? (
        <p style={{ color: "var(--jarvis-text-secondary)", fontFamily: HF, fontSize: 13 }}>
          Все касания свежие — отлично 👍
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {overdue.map((p) => {
            const warn = p.days > 30
              ? "var(--jarvis-alert)"
              : p.days > 14
              ? "var(--jarvis-warn)"
              : "var(--jarvis-text-secondary)";
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/people/${p.id}`)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "var(--jarvis-bg-card-inner)",
                  border: "1px solid var(--jarvis-glass-border)",
                  borderRadius: 10, padding: "10px 14px",
                  cursor: "pointer", textAlign: "left", width: "100%",
                  transition: "border-color 140ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--jarvis-accent-35)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--jarvis-glass-border)")}
              >
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(0,212,255,0.08)",
                  border: "1.5px solid rgba(0,212,255,0.20)",
                  fontSize: 11, fontWeight: 700, color: "rgba(0,212,255,0.80)",
                  fontFamily: HF, letterSpacing: "0.04em",
                }}>
                  {initials(p.name)}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: HF, fontWeight: 600, fontSize: 13,
                    color: "var(--jarvis-text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {p.name}
                  </div>
                  <div style={{
                    fontFamily: HF, fontSize: 11,
                    color: "var(--jarvis-text-secondary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    marginTop: 1,
                  }}>
                    {p.company}
                  </div>
                </div>
                {/* Days badge */}
                <div style={{
                  fontFamily: HF, fontSize: 11, fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: warn, flexShrink: 0, whiteSpace: "nowrap",
                }}>
                  {p.days} дн
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ── Block 2: Приоритеты ─────────────────────────────────────────────────── */
const BUCKET_LABELS: Record<Bucket, string> = {
  day: "Сегодня",
  week: "Неделя",
  month: "Месяц",
};

const IMP_COLOR: Record<string, string> = {
  high: "#f0625a",
  medium: "#f0b54a",
  low: "#3ed9a0",
};

function PrioritiesBlock() {
  const buckets: Bucket[] = ["day", "week", "month"];

  return (
    <section style={sCard}>
      <h2 style={sBlockTitle}>Приоритеты</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {buckets.map((bucket) => {
          const items = BATOV_PRIORITIES.filter((p) => p.bucket === bucket);
          if (items.length === 0) return null;
          return (
            <div key={bucket}>
              <div style={{
                fontFamily: HF, fontSize: 9, fontWeight: 700,
                letterSpacing: "0.10em", textTransform: "uppercase",
                color: "var(--jarvis-text-muted)", marginBottom: 8,
              }}>
                {BUCKET_LABELS[bucket]}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: "var(--jarvis-bg-card-inner)",
                      border: "1px solid var(--jarvis-glass-border)",
                      borderRadius: 8, padding: "9px 12px",
                    }}
                  >
                    {/* Status dot */}
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                      background: IMP_COLOR[item.importance],
                      boxShadow: `0 0 6px ${IMP_COLOR[item.importance]}88`,
                    }} />
                    {/* Title */}
                    <span style={{
                      flex: 1, fontFamily: HF, fontSize: 13,
                      color: "var(--jarvis-text-primary)",
                      fontWeight: 500,
                    }}>
                      {item.title}
                    </span>
                    {/* Due */}
                    <span style={{
                      fontFamily: HF, fontSize: 11,
                      color: "var(--jarvis-text-secondary)",
                      fontVariantNumeric: "tabular-nums",
                      flexShrink: 0, whiteSpace: "nowrap",
                    }}>
                      {item.due}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Block 3: Неделя (mini calendar) ────────────────────────────────────── */
const WEEK_EVENTS: Record<string, true> = {
  "2026-07-14": true,
  "2026-07-15": true,
  "2026-07-17": true,
  "2026-07-18": true,
};

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function WeekBlock() {
  const todayStr = "2026-07-14";

  // Build 7 days starting Monday 2026-07-13
  const monday = new Date("2026-07-13");
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return { iso, num: d.getDate(), dayName: DAY_NAMES[i], hasEvent: !!WEEK_EVENTS[iso] };
  });

  return (
    <section style={sCard}>
      <h2 style={sBlockTitle}>Неделя</h2>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 6,
      }}>
        {days.map(({ iso, num, dayName, hasEvent }) => {
          const isToday = iso === todayStr;
          return (
            <div key={iso} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 4, padding: "8px 4px",
              borderRadius: 8,
              background: isToday ? "rgba(0,212,255,0.12)" : "var(--jarvis-bg-card-inner)",
              border: isToday
                ? "1px solid rgba(0,212,255,0.40)"
                : "1px solid var(--jarvis-glass-border)",
            }}>
              <span style={{
                fontFamily: HF, fontSize: 9, fontWeight: 600,
                letterSpacing: "0.06em",
                color: isToday ? "var(--jarvis-accent)" : "var(--jarvis-text-muted)",
                textTransform: "uppercase",
              }}>
                {dayName}
              </span>
              <span style={{
                fontFamily: HF, fontSize: 15, fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: isToday ? "var(--jarvis-accent)" : "var(--jarvis-text-primary)",
              }}>
                {num}
              </span>
              {/* Event dot */}
              <span style={{
                width: 4, height: 4, borderRadius: "50%",
                background: hasEvent ? "var(--jarvis-accent)" : "transparent",
              }} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Shared styles ───────────────────────────────────────────────────────── */
const sCard: React.CSSProperties = {
  background: "var(--jarvis-bg-card)",
  border: "1px solid var(--jarvis-glass-border)",
  borderRadius: 14,
  padding: 20,
};

const sBlockTitle: React.CSSProperties = {
  fontFamily: HF,
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--jarvis-text-secondary)",
  marginBottom: 14,
  marginTop: 0,
};

/* ── DeskToday ───────────────────────────────────────────────────────────── */
export default function DeskToday() {
  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--jarvis-bg-screen)",
      padding: "24px 20px",
      paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
      boxSizing: "border-box",
      maxWidth: 680,
      margin: "0 auto",
      position: "relative",
    }}>
      {/* Page title */}
      <div style={{
        fontFamily: HF, fontWeight: 800, fontSize: 22,
        color: "var(--jarvis-text-primary)",
        marginBottom: 20, letterSpacing: "-0.01em",
      }}>
        Сегодня
        <span style={{
          display: "inline-block", marginLeft: 10,
          fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
          color: "var(--jarvis-text-muted)", verticalAlign: "middle",
        }}>
          14 июля 2026
        </span>
      </div>

      {/* Three blocks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <PeopleBlock />
        <PrioritiesBlock />
        <WeekBlock />
      </div>

      {/* 🎤 FAB */}
      <button
        onClick={() => {}}
        style={{
          position: "fixed",
          bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
          right: "calc(20px + env(safe-area-inset-right, 0px))",
          display: "flex", alignItems: "center", gap: 8,
          height: 48, padding: "0 20px",
          borderRadius: 24,
          background: "var(--jarvis-accent)",
          color: "#040810",
          border: "none", cursor: "pointer",
          fontFamily: HF, fontWeight: 700, fontSize: 14,
          boxShadow: "0 4px 20px rgba(0,212,255,0.35)",
          zIndex: 40,
          transition: "transform 120ms, box-shadow 120ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.04)";
          e.currentTarget.style.boxShadow = "0 6px 28px rgba(0,212,255,0.50)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,212,255,0.35)";
        }}
      >
        <Mic style={{ width: 16, height: 16 }} />
        Сказать
      </button>
    </div>
  );
}
