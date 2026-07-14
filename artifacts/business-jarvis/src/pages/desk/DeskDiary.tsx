import { useState } from "react";
import { useLocation } from "wouter";
import {
  Mic,
  CheckSquare,
  Bell,
  Send,
  CreditCard,
  FileText,
  ArrowRight,
} from "lucide-react";
import { BATOV_DIARY, type DiaryEntryType } from "@/data/batov-diary";

const HF = "'Hanken Grotesk', system-ui, sans-serif";

/* ── type config ─────────────────────────────────────────────────────────── */
const TYPE_CONFIG: Record<
  DiaryEntryType,
  { label: string; color: string; bg: string; Icon: React.ElementType }
> = {
  task:     { label: "Задача",     color: "#00d4ff", bg: "rgba(0,212,255,0.10)",    Icon: CheckSquare },
  reminder: { label: "Напоминалка", color: "#f0b54a", bg: "rgba(240,181,74,0.11)",  Icon: Bell        },
  boss:     { label: "Шефу",       color: "#5b8bd0", bg: "rgba(91,139,208,0.11)",   Icon: Send        },
  card:     { label: "В карточку", color: "#3ed9a0", bg: "rgba(62,217,160,0.10)",   Icon: CreditCard  },
  note:     { label: "Заметка",    color: "rgba(228,232,255,0.35)", bg: "rgba(228,232,255,0.04)", Icon: FileText },
};

/* ── filter ──────────────────────────────────────────────────────────────── */
type Filter = "all" | DiaryEntryType;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all",      label: "Все"         },
  { id: "task",     label: "Задачи"      },
  { id: "reminder", label: "Напоминалки" },
  { id: "boss",     label: "Шефу"        },
  { id: "card",     label: "В карточку"  },
  { id: "note",     label: "Заметки"     },
];

/* ── DeskDiary ───────────────────────────────────────────────────────────── */
export default function DeskDiary() {
  const [filter, setFilter] = useState<Filter>("all");
  const [, navigate] = useLocation();

  const visible = BATOV_DIARY.filter(
    (e) => filter === "all" || e.type === filter
  );

  const counts: Record<Filter, number> = {
    all:      BATOV_DIARY.length,
    task:     BATOV_DIARY.filter((e) => e.type === "task").length,
    reminder: BATOV_DIARY.filter((e) => e.type === "reminder").length,
    boss:     BATOV_DIARY.filter((e) => e.type === "boss").length,
    card:     BATOV_DIARY.filter((e) => e.type === "card").length,
    note:     BATOV_DIARY.filter((e) => e.type === "note").length,
  };

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
            Дневник
          </h1>
          <span style={{
            fontFamily: HF, fontSize: 13, fontWeight: 600,
            color: "var(--jarvis-text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}>
            {BATOV_DIARY.length}
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
          Записать
        </button>
      </div>

      {/* ── Filter chips ── */}
      <div style={{
        display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 20,
      }}>
        {FILTERS.map(({ id, label }) => {
          const active = filter === id;
          const cfg = id !== "all" ? TYPE_CONFIG[id as DiaryEntryType] : null;
          const activeColor = cfg?.color ?? "var(--jarvis-accent)";
          return (
            <button
              key={id}
              onClick={() => setFilter(id)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                height: 32, padding: "0 11px", borderRadius: 16,
                background: active
                  ? (cfg ? `${cfg.color}18` : "rgba(0,212,255,0.12)")
                  : "var(--jarvis-bg-card)",
                border: active
                  ? `1px solid ${activeColor}45`
                  : "1px solid var(--jarvis-glass-border)",
                color: active ? activeColor : "var(--jarvis-text-secondary)",
                cursor: "pointer", fontFamily: HF, fontWeight: 600, fontSize: 12,
                transition: "all 140ms",
              }}
            >
              {label}
              <span style={{
                fontVariantNumeric: "tabular-nums",
                background: active
                  ? `${activeColor}20`
                  : "rgba(228,232,255,0.06)",
                borderRadius: 8, padding: "1px 5px", fontSize: 11,
              }}>
                {counts[id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Entries ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.length === 0 && (
          <p style={{
            fontFamily: HF, fontSize: 14,
            color: "var(--jarvis-text-secondary)",
            textAlign: "center", marginTop: 40,
          }}>
            Нет записей по этому фильтру
          </p>
        )}

        {visible.map((entry) => {
          const cfg = TYPE_CONFIG[entry.type];
          const clickable = entry.href != null;

          return (
            <div
              key={entry.id}
              onClick={() => clickable && navigate(entry.href!)}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (clickable && (e.key === "Enter" || e.key === " ")) {
                  navigate(entry.href!);
                }
              }}
              style={{
                background: "var(--jarvis-bg-card)",
                border: "1px solid var(--jarvis-glass-border)",
                borderRadius: 12, padding: "14px 16px",
                cursor: clickable ? "pointer" : "default",
                transition: "border-color 140ms",
                minHeight: 44,
              }}
              onMouseEnter={(e) => {
                if (clickable)
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    `${cfg.color}40`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "var(--jarvis-glass-border)";
              }}
            >
              {/* Top row: time + type badge */}
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: 10, marginBottom: 9,
                flexWrap: "wrap",
              }}>
                <span style={{
                  fontFamily: HF, fontSize: 11,
                  color: "var(--jarvis-text-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {entry.at}
                </span>

                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  height: 22, padding: "0 8px", borderRadius: 6,
                  background: cfg.bg,
                  border: `1px solid ${cfg.color}35`,
                  color: cfg.color,
                  fontFamily: HF, fontWeight: 700, fontSize: 11,
                  flexShrink: 0,
                }}>
                  <cfg.Icon style={{ width: 10, height: 10 }} />
                  {cfg.label}
                </span>
              </div>

              {/* Text */}
              <p style={{
                margin: "0 0 10px",
                fontFamily: HF, fontSize: 13,
                color: "var(--jarvis-text-primary)",
                lineHeight: 1.55,
              }}>
                {entry.text}
              </p>

              {/* Routed label */}
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                fontFamily: HF, fontSize: 12,
                color: clickable ? cfg.color : "var(--jarvis-text-muted)",
                fontWeight: clickable ? 600 : 400,
              }}>
                <ArrowRight style={{ width: 11, height: 11, flexShrink: 0 }} />
                {entry.routedLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
