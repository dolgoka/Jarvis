import { useState } from "react";
import { useRoute } from "wouter";
import { Link } from "wouter";
import {
  ArrowLeft, Mic, Lock, AlertTriangle,
  Clock, Cake, Globe2, Star, ChevronDown, ChevronUp,
  ExternalLink,
} from "lucide-react";
import { BATOV_PEOPLE, type BatovPartner } from "@/data/batov-people";

/* ── Design tokens ──────────────────────────────────────────────────────── */
const HF = "'Hanken Grotesk', system-ui, sans-serif";
const T  = {
  hi:  "rgba(228,232,255,0.92)",
  mid: "rgba(228,232,255,0.60)",
  lo:  "rgba(228,232,255,0.38)",
  dim: "rgba(228,232,255,0.22)",
};
const DIVIDER = "rgba(255,255,255,0.07)";

/* ── Helpers ────────────────────────────────────────────────────────────── */
function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

function daysUntil(iso: string): number {
  const today  = new Date();
  const d      = new Date(iso);
  const target = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (target.getTime() <= today.setHours(0, 0, 0, 0)) target.setFullYear(today.getFullYear() + 1);
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000);
}

function contactColor(days: number): string {
  if (days > 30) return "#f0625a";
  if (days > 14) return "#f0b54a";
  return T.lo;
}

function bdayColor(daysLeft: number): string {
  if (daysLeft <= 7)  return "#f0625a";
  if (daysLeft <= 30) return "#f0b54a";
  return T.lo;
}

function initials(name: string): string {
  const p = name.trim().split(" ");
  return p.length >= 2 ? (p[0]![0]! + p[1]![0]!).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function fmtBirthday(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function findByName(name: string): BatovPartner | undefined {
  return BATOV_PEOPLE.find((p) => p.name === name);
}

function findIntroducer(introducedBy: string): BatovPartner | undefined {
  return BATOV_PEOPLE.find((p) => introducedBy.startsWith(p.name));
}

const THEME_STATUS: Record<BatovPartner["themes"][0]["status"], { label: string; dot: string }> = {
  active: { label: "В работе",  dot: "#00d4ff" },
  hold:   { label: "На холде",  dot: "#f0b54a" },
  done:   { label: "Готово",    dot: "#3ed9a0" },
};

/* ── Section wrapper ────────────────────────────────────────────────────── */
function Section({
  children, style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      padding: "16px 18px",
      borderRadius: 14,
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${DIVIDER}`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: HF, fontSize: 9, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.10em",
      color: T.dim, marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function DeskPersonDetail() {
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [, params] = useRoute<{ id: string }>("/people/:id");
  const p = BATOV_PEOPLE.find((x) => x.id === params?.id);

  if (!p) {
    return (
      <div style={{ padding: "32px 24px", fontFamily: HF, color: T.lo }}>
        <Link href="/people" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.dim, textDecoration: "none", fontSize: 13 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Люди
        </Link>
        <div style={{ marginTop: 40, fontSize: 16, color: T.mid }}>Партнёр не найден</div>
      </div>
    );
  }

  const onlineDays    = daysSince(p.lastContactOnline);
  const inPersonDays  = daysSince(p.lastContactInPerson);
  const bdLeft        = daysUntil(p.birthday);
  const introducer    = findIntroducer(p.introducedBy);

  /* Timeline: sort ASC (oldest → newest), collapse after 3 */
  const sortedTimeline = [...p.timeline].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const TIMELINE_PEEK = 3;
  const visibleTimeline = timelineExpanded
    ? sortedTimeline
    : sortedTimeline.slice(0, TIMELINE_PEEK);
  const hasMore = sortedTimeline.length > TIMELINE_PEEK;

  return (
    <div style={{
      maxWidth: 680,
      margin: "0 auto",
      padding: "20px 20px 48px",
      fontFamily: HF,
      color: T.hi,
    }}>

      {/* ── Back nav ── */}
      <Link href="/people" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 44, paddingRight: 12,
        fontSize: 13, fontWeight: 500, color: T.dim,
        textDecoration: "none",
        transition: "color 150ms",
      }}>
        <ArrowLeft style={{ width: 14, height: 14 }} />
        Люди
      </Link>

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div style={{ marginTop: 6, marginBottom: 16 }}>
        <Section>
          {/* Avatar row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
            {/* Large avatar */}
            <div style={{
              width: 56, height: 56, borderRadius: 14, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,212,255,0.10)",
              border: "2px solid rgba(0,212,255,0.28)",
              fontSize: 18, fontWeight: 700,
              color: "rgba(0,212,255,0.88)", letterSpacing: "0.04em",
            }}>
              {initials(p.name)}
            </div>

            {/* Name + company/role */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: T.hi, letterSpacing: "-0.01em" }}>
                  {p.name}
                </span>
                {p.isClosed && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "2px 8px", borderRadius: 6,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    fontSize: 10, fontWeight: 700, color: T.lo,
                    letterSpacing: "0.07em", textTransform: "uppercase",
                  }}>
                    <Lock style={{ width: 9, height: 9 }} />
                    Закрытый
                  </span>
                )}
                {p.avoidWith.length > 0 && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "2px 8px", borderRadius: 6,
                    background: "rgba(240,181,74,0.10)",
                    border: "1px solid rgba(240,181,74,0.28)",
                    fontSize: 10, fontWeight: 700, color: "#f0b54a",
                    letterSpacing: "0.07em", textTransform: "uppercase",
                  }}>
                    <AlertTriangle style={{ width: 9, height: 9 }} />
                    Не пересекать
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: T.lo, marginTop: 4, lineHeight: 1.4 }}>
                {p.role}
              </div>
              <div style={{ fontSize: 12, color: T.dim, marginTop: 2 }}>
                {p.company}
              </div>
            </div>
          </div>

          {/* Last contact row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            flexWrap: "wrap", marginBottom: 14,
          }}>
            <Clock style={{ width: 12, height: 12, color: T.dim, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: T.dim }}>Последний контакт:</span>
            <span style={{
              fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums",
              color: contactColor(onlineDays),
            }}>
              онлайн {onlineDays === 0 ? "сегодня" : `${onlineDays} дн`}
            </span>
            <span style={{ color: T.dim, fontSize: 11 }}>·</span>
            <span style={{
              fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums",
              color: contactColor(inPersonDays),
            }}>
              лично {inPersonDays === 0 ? "сегодня" : `${inPersonDays} дн`}
            </span>
          </div>

          {/* Primary CTA */}
          <button
            onClick={() => {/* stub */}}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              height: 44, padding: "0 18px", borderRadius: 11,
              width: "100%", justifyContent: "center",
              background: "rgba(0,212,255,0.10)",
              border: "1.5px solid rgba(0,212,255,0.28)",
              color: "rgba(0,212,255,0.88)",
              fontFamily: HF, fontSize: 14, fontWeight: 600,
              cursor: "pointer",
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,212,255,0.16)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,212,255,0.10)")}
          >
            <Mic style={{ width: 15, height: 15 }} />
            Обновить карточку голосом
          </button>
        </Section>
      </div>

      {/* ══ QUICK FACTS ═════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 12 }}>
        <Section>
          <SectionLabel>Быстрые факты</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Birthday */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <Cake style={{ width: 13, height: 13, color: T.dim, flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: T.mid, minWidth: 0 }}>
                {fmtBirthday(p.birthday)}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                color: bdayColor(bdLeft),
                marginLeft: "auto", flexShrink: 0,
              }}>
                {bdLeft <= 30
                  ? bdLeft <= 7
                    ? `🎂 через ${bdLeft} дн`
                    : `через ${bdLeft} дн`
                  : `через ${bdLeft} дн`
                }
              </span>
            </div>

            <div style={{ height: 1, background: DIVIDER }} />

            {/* Nation */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Globe2 style={{ width: 13, height: 13, color: T.dim, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: T.mid }}>{p.nation}</span>
            </div>

            <div style={{ height: 1, background: DIVIDER }} />

            {/* Religious note */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Star style={{ width: 13, height: 13, color: T.dim, flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: T.mid, lineHeight: 1.4 }}>
                {p.religiousNote}
              </span>
            </div>
          </div>
        </Section>
      </div>

      {/* ══ INTRODUCED BY ═══════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 12 }}>
        <Section>
          <SectionLabel>Познакомил</SectionLabel>
          {introducer ? (
            <Link href={`/people/${introducer.id}`} style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              textDecoration: "none",
            }}>
              {/* mini avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,212,255,0.08)",
                border: "1px solid rgba(0,212,255,0.22)",
                fontSize: 10, fontWeight: 700,
                color: "rgba(0,212,255,0.75)",
              }}>
                {initials(introducer.name)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(0,212,255,0.80)" }}>
                  {introducer.name}
                </div>
                <div style={{ fontSize: 11, color: T.dim, marginTop: 1 }}>
                  {introducer.role}
                </div>
              </div>
              <ExternalLink style={{ width: 11, height: 11, color: T.dim, marginLeft: 4 }} />
            </Link>
          ) : (
            <div style={{ fontSize: 13, color: T.mid }}>{p.introducedBy}</div>
          )}
        </Section>
      </div>

      {/* ══ AVOID WITH ══════════════════════════════════════════════════════ */}
      {p.avoidWith.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            padding: "14px 18px",
            borderRadius: 14,
            background: "rgba(240,98,90,0.08)",
            border: "1.5px solid rgba(240,98,90,0.32)",
          }}>
            {/* Alert header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 7, marginBottom: 10,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(240,98,90,0.20)",
              }}>
                <AlertTriangle style={{ width: 12, height: 12, color: "#f0625a" }} />
              </div>
              <span style={{
                fontFamily: HF, fontSize: 11, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: "0.10em",
                color: "#f0625a",
              }}>
                Не пересекать
              </span>
            </div>

            {/* List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {p.avoidWith.map((name) => {
                const found = findByName(name);
                return found ? (
                  <Link key={name} href={`/people/${found.id}`} style={{
                    display: "flex", alignItems: "center", gap: 9,
                    textDecoration: "none",
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(240,98,90,0.12)",
                      border: "1px solid rgba(240,98,90,0.28)",
                      fontSize: 10, fontWeight: 700, color: "#f0625a",
                    }}>
                      {initials(found.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f0625a" }}>
                        {found.name}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(240,98,90,0.55)", marginTop: 1 }}>
                        {found.role}
                      </div>
                    </div>
                    <ExternalLink style={{ width: 11, height: 11, color: "rgba(240,98,90,0.45)", marginLeft: "auto", flexShrink: 0 }} />
                  </Link>
                ) : (
                  <div key={name} style={{ fontSize: 13, color: "#f0625a", fontWeight: 600 }}>
                    {name}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ THEMES & PROJECTS ═══════════════════════════════════════════════ */}
      <div style={{ marginBottom: 12 }}>
        <Section>
          <SectionLabel>Темы и проекты</SectionLabel>

          {/* Themes */}
          {p.themes.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {p.themes.map((t, i) => {
                const meta = THEME_STATUS[t.status];
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${DIVIDER}`,
                  }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                      background: meta.dot,
                      boxShadow: `0 0 5px ${meta.dot}80`,
                    }} />
                    <span style={{
                      flex: 1, fontSize: 13, fontWeight: 500, color: T.mid,
                    }}>
                      {t.title}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      padding: "2px 7px", borderRadius: 5,
                      background: `${meta.dot}18`,
                      border: `1px solid ${meta.dot}40`,
                      color: meta.dot,
                      letterSpacing: "0.04em", whiteSpace: "nowrap",
                    }}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Projects */}
          {p.projects.length > 0 && (
            <>
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.10em", color: T.dim, marginBottom: 7,
              }}>
                Сделки
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {p.projects.map((proj, i) => (
                  <span key={i} style={{
                    padding: "4px 10px", borderRadius: 8,
                    background: "rgba(91,139,208,0.10)",
                    border: "1px solid rgba(91,139,208,0.22)",
                    fontSize: 12, fontWeight: 500,
                    color: "rgba(91,139,208,0.80)",
                  }}>
                    {proj}
                  </span>
                ))}
              </div>
            </>
          )}
        </Section>
      </div>

      {/* ══ TIMELINE ════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 12 }}>
        <Section>
          <SectionLabel>Хронология отношений</SectionLabel>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {visibleTimeline.map((entry, idx) => {
              const isLast = idx === visibleTimeline.length - 1 && !hasMore;
              return (
                <div key={idx} style={{ display: "flex", gap: 12, position: "relative" }}>
                  {/* Spine */}
                  <div style={{
                    display: "flex", flexDirection: "column",
                    alignItems: "center", flexShrink: 0, width: 14,
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0,
                      background: isLast ? "var(--jarvis-accent, #00d4ff)" : T.dim,
                      border: isLast ? "2px solid rgba(0,212,255,0.40)" : `2px solid ${DIVIDER}`,
                      boxShadow: isLast ? "0 0 6px rgba(0,212,255,0.40)" : "none",
                    }} />
                    {!isLast && (
                      <div style={{
                        width: 1.5, flex: 1, minHeight: 14, marginTop: 2,
                        background: DIVIDER,
                      }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ paddingBottom: isLast ? 0 : 14, flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 600, color: T.dim,
                      fontVariantNumeric: "tabular-nums",
                      marginBottom: 3, letterSpacing: "0.03em",
                    }}>
                      {fmtDate(entry.date)}
                    </div>
                    <div style={{ fontSize: 13, color: T.mid, lineHeight: 1.5 }}>
                      {entry.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expand / collapse */}
          {hasMore && (
            <button
              onClick={() => setTimelineExpanded((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                width: "100%", height: 38, justifyContent: "center",
                marginTop: 10, borderRadius: 9,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${DIVIDER}`,
                color: T.lo, fontFamily: HF, fontSize: 12, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {timelineExpanded ? (
                <><ChevronUp style={{ width: 13, height: 13 }} /> Свернуть</>
              ) : (
                <><ChevronDown style={{ width: 13, height: 13 }} /> Показать все ({sortedTimeline.length})</>
              )}
            </button>
          )}
        </Section>
      </div>

    </div>
  );
}
