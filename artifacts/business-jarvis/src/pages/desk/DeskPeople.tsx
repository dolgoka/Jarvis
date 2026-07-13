import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, Mic, Lock, AlertTriangle, Clock } from "lucide-react";
import { BATOV_PEOPLE, type BatovPartner } from "@/data/batov-people";

const HF = "'Hanken Grotesk', system-ui, sans-serif";

/* ── Helpers ────────────────────────────────────────────────────────────── */

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

/** Most-recent contact across both channels (smallest days = most recent). */
function lastContactDays(p: BatovPartner): number {
  return Math.min(daysSince(p.lastContactOnline), daysSince(p.lastContactInPerson));
}

function contactColor(days: number): string {
  if (days > 30) return "#f0625a";
  if (days > 14) return "#f0b54a";
  return "rgba(228,232,255,0.38)";
}

function contactBg(days: number): string {
  if (days > 30) return "rgba(240,98,90,0.10)";
  if (days > 14) return "rgba(240,181,74,0.10)";
  return "transparent";
}

function initials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function daysLabel(days: number): string {
  if (days === 0) return "сегодня";
  if (days === 1) return "1 дн назад";
  return `${days} дн назад`;
}

const THEME_DOT: Record<BatovPartner["themes"][0]["status"], string> = {
  active: "#00d4ff",
  hold:   "#f0b54a",
  done:   "#3ed9a0",
};

type FilterKey = "all" | "hot" | "stale" | "closed";

const FILTER_LABELS: Record<FilterKey, string> = {
  all:    "Все",
  hot:    "Горячие",
  stale:  "Давно не касался",
  closed: "Закрытые",
};

/* ── Partner card ───────────────────────────────────────────────────────── */
function PartnerCard({ p }: { p: BatovPartner }) {
  const days  = lastContactDays(p);
  const color = contactColor(days);
  const bg    = contactBg(days);

  /* up to 2 non-done themes, preferring active */
  const visibleThemes = p.themes
    .filter((t) => t.status !== "done")
    .slice(0, 2);

  return (
    <Link
      href={`/people/${p.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          padding: "16px",
          borderRadius: 16,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          cursor: "pointer",
          transition: "border-color 150ms, background 150ms",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: 148,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,212,255,0.22)";
          (e.currentTarget as HTMLDivElement).style.background  = "rgba(255,255,255,0.06)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)";
          (e.currentTarget as HTMLDivElement).style.background  = "rgba(255,255,255,0.04)";
        }}
      >
        {/* Row 1: avatar + name + markers */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
          {/* Avatar */}
          <div style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,212,255,0.10)",
            border: "1.5px solid rgba(0,212,255,0.25)",
            fontSize: 12, fontWeight: 700,
            color: "rgba(0,212,255,0.85)", fontFamily: HF,
            letterSpacing: "0.04em",
          }}>
            {initials(p.name)}
          </div>

          {/* Name + company */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
            <div style={{
              fontFamily: HF, fontSize: 14, fontWeight: 700,
              color: "rgba(228,232,255,0.90)", lineHeight: 1.2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {p.name}
            </div>
            <div style={{
              fontFamily: HF, fontSize: 11, color: "rgba(228,232,255,0.38)",
              marginTop: 3, lineHeight: 1.3,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {p.company}
            </div>
          </div>

          {/* Markers */}
          <div style={{ display: "flex", gap: 5, flexShrink: 0, paddingTop: 2 }}>
            {p.isClosed && (
              <span title="Закрытый контакт" style={{ display: "flex" }}>
                <Lock style={{ width: 13, height: 13, color: "rgba(228,232,255,0.30)" }} />
              </span>
            )}
            {p.avoidWith.length > 0 && (
              <span title={`Не пересекать с: ${p.avoidWith.join(", ")}`} style={{ display: "flex" }}>
                <AlertTriangle style={{ width: 13, height: 13, color: "#f0b54a" }} />
              </span>
            )}
          </div>
        </div>

        {/* Row 2: last contact badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "4px 9px", borderRadius: 8,
          background: bg,
          border: days > 14 ? `1px solid ${color}30` : "1px solid transparent",
          alignSelf: "flex-start",
        }}>
          <Clock style={{ width: 11, height: 11, color, flexShrink: 0 }} />
          <span style={{
            fontFamily: HF, fontSize: 12, fontWeight: 600,
            color, fontVariantNumeric: "tabular-nums",
          }}>
            {daysLabel(days)}
          </span>
        </div>

        {/* Row 3: theme chips */}
        {visibleThemes.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {visibleThemes.map((t, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 9px", borderRadius: 7,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  fontFamily: HF, fontSize: 11, fontWeight: 500,
                  color: "rgba(228,232,255,0.55)",
                  maxWidth: "100%",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                <span style={{
                  width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                  background: THEME_DOT[t.status],
                  boxShadow: `0 0 4px ${THEME_DOT[t.status]}80`,
                }} />
                {t.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

/* ── DeskPeople ─────────────────────────────────────────────────────────── */
export default function DeskPeople() {
  const [query,  setQuery]  = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  /* chip counts — over all partners, not affected by search */
  const counts = useMemo<Record<FilterKey, number>>(() => ({
    all:    BATOV_PEOPLE.length,
    hot:    BATOV_PEOPLE.filter((p) => p.tags.includes("hot")).length,
    stale:  BATOV_PEOPLE.filter((p) => lastContactDays(p) > 30).length,
    closed: BATOV_PEOPLE.filter((p) => p.isClosed).length,
  }), []);

  const filtered = useMemo(() => {
    let result = [...BATOV_PEOPLE];

    /* search: name · company · theme titles */
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        p.themes.some((t) => t.title.toLowerCase().includes(q))
      );
    }

    /* filter chips */
    if (filter === "hot")    result = result.filter((p) => p.tags.includes("hot"));
    if (filter === "stale")  result = result.filter((p) => lastContactDays(p) > 30);
    if (filter === "closed") result = result.filter((p) => p.isClosed);

    /* sort: longest not contacted first */
    result.sort((a, b) => lastContactDays(b) - lastContactDays(a));

    return result;
  }, [query, filter]);

  const FILTER_KEYS: FilterKey[] = ["all", "hot", "stale", "closed"];

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      minHeight: "100dvh", maxWidth: "100%",
      fontFamily: HF, color: "rgba(228,232,255,0.9)",
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: "20px 20px 0",
        display: "flex", alignItems: "center",
        gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 10 }}>
          <h1 style={{
            margin: 0, fontFamily: HF, fontSize: 22, fontWeight: 800,
            color: "rgba(228,232,255,0.92)", letterSpacing: "-0.01em",
          }}>
            Люди
          </h1>
          <span style={{
            fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums",
            color: "rgba(228,232,255,0.28)",
          }}>
            {filtered.length}
          </span>
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => {/* stub */}}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            height: 44, padding: "0 16px", borderRadius: 12,
            background: "rgba(0,212,255,0.10)",
            border: "1.5px solid rgba(0,212,255,0.28)",
            color: "rgba(0,212,255,0.85)",
            fontFamily: HF, fontSize: 13, fontWeight: 600,
            cursor: "pointer", flexShrink: 0,
            transition: "background 150ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,212,255,0.16)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,212,255,0.10)")}
        >
          <Mic style={{ width: 14, height: 14 }} />
          Добавить голосом
        </button>
      </div>

      {/* ── Search ── */}
      <div style={{ padding: "14px 20px 0" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          height: 44, padding: "0 14px", borderRadius: 12,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.09)",
        }}>
          <Search style={{ width: 15, height: 15, color: "rgba(228,232,255,0.28)", flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Имя, компания, тема…"
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontFamily: HF, fontSize: 14, color: "rgba(228,232,255,0.88)",
              caretColor: "#00d4ff",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "4px", borderRadius: 6,
                color: "rgba(228,232,255,0.35)", fontSize: 16, lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Filter chips ── */}
      <div style={{
        padding: "12px 20px 0",
        display: "flex", gap: 6, flexWrap: "nowrap",
        overflowX: "auto",
        /* hide scrollbar */
        scrollbarWidth: "none",
      }}>
        {FILTER_KEYS.map((key) => {
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                height: 34, padding: "0 13px", borderRadius: 9, flexShrink: 0,
                background: active ? "rgba(0,212,255,0.14)" : "rgba(255,255,255,0.05)",
                border: active
                  ? "1px solid rgba(0,212,255,0.35)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: active ? "rgba(0,212,255,0.90)" : "rgba(228,232,255,0.45)",
                fontFamily: HF, fontSize: 12, fontWeight: 600,
                cursor: "pointer", transition: "all 150ms", whiteSpace: "nowrap",
              }}
            >
              {FILTER_LABELS[key]}
              <span style={{
                fontSize: 10, fontVariantNumeric: "tabular-nums",
                color: active ? "rgba(0,212,255,0.65)" : "rgba(228,232,255,0.25)",
              }}>
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Grid ── */}
      <div style={{ flex: 1, padding: "14px 20px 28px" }}>
        {filtered.length === 0 ? (
          <div style={{
            paddingTop: 48, textAlign: "center",
            fontSize: 13, color: "rgba(228,232,255,0.28)", fontFamily: HF,
          }}>
            Никого не найдено
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}>
            {filtered.map((p) => <PartnerCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
