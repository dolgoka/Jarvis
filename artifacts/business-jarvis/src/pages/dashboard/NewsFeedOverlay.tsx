import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Clock, AlertTriangle, Mic, ExternalLink } from "lucide-react";
import { useGetFeed, useMarkFeedSeen, useSnoozeFeedItem } from "@workspace/api-client-react";
import type { NewsItem } from "@workspace/api-client-react";

/* ─── CSS animations (injected once) ─────────────────────────────────────── */
const ANIM_ID = "nf-keyframes";
if (typeof document !== "undefined" && !document.getElementById(ANIM_ID)) {
  const s = document.createElement("style");
  s.id = ANIM_ID;
  s.textContent = `
    @keyframes nf-pulse-stripe {
      0%,100% { opacity:1; box-shadow:0 0 10px 3px #ef444455; }
      50%      { opacity:.65; box-shadow:0 0 20px 8px #ef444488; }
    }
    @keyframes nf-pulse-badge {
      0%,100% { transform:scale(1);   opacity:1;    box-shadow:0 0 0 0 #ef444440; }
      50%      { transform:scale(1.07); opacity:.9; box-shadow:0 0 0 6px #ef444400; }
    }
    @keyframes nf-card-in {
      from { opacity:0; transform:translateY(10px) scale(.98); }
      to   { opacity:1; transform:translateY(0)    scale(1);   }
    }
  `;
  document.head.appendChild(s);
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const SEV_COLOR: Record<string, string> = {
  critical:  "#ef4444",
  attention: "#f5b301",
  info:      "#22c55e",
};
const SEV_LABEL: Record<string, string> = {
  critical:  "Критично",
  attention: "Внимание",
  info:      "Инфо",
};
const TYPE_LABEL: Record<string, string> = {
  urgent:    "Срочно",
  hr:        "HR",
  corporate: "Корп",
  task:      "Задача",
  external:  "Внешн",
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1)  return "только что";
  if (diff < 60) return `${diff} мин назад`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface Props {
  onClose: () => void;
  onSelectBusiness?: (id: number) => void;
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function NewsFeedOverlay({ onClose, onSelectBusiness }: Props) {
  const prefersReducedMotion = useMemo(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  []);

  /* Filters */
  const [severityFilter, setSeverityFilter] = useState<string | undefined>(undefined);
  const [includeExternal, setIncludeExternal] = useState(false);

  /* Session deck — never cleared mid-session; resets only on filter change */
  const [deck,         setDeck]         = useState<NewsItem[]>([]);
  const [localActions, setLocalActions] = useState<Map<number, "done" | "snoozed">>(() => new Map());
  const [index,        setIndex]        = useState(0);
  const [expanded,     setExpanded]     = useState(false);
  const lastFilterRef = useRef<string | null>(null);

  /* Touch swipe */
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  /* API */
  const { data, isLoading } = useGetFeed({
    severity:        severityFilter as any,
    includeExternal: includeExternal || undefined,
  });
  const { mutate: markSeen } = useMarkFeedSeen();
  const { mutate: snooze   } = useSnoozeFeedItem();

  /* Initialize / reset deck when filter changes */
  useEffect(() => {
    if (!data) return;
    const fk = `${severityFilter ?? ""}|${includeExternal}`;
    if (lastFilterRef.current !== fk) {
      lastFilterRef.current = fk;
      setDeck(data);
      setIndex(0);
      setExpanded(false);
      setLocalActions(new Map());
    }
  }, [data, severityFilter, includeExternal]);

  /* Safe index */
  const safeIdx = Math.min(index, Math.max(deck.length - 1, 0));
  const item     = deck[safeIdx];
  const sevColor = item ? (SEV_COLOR[item.severity] ?? "#22c55e") : "#22c55e";

  /* Counts (deck totals — includes already-actioned for filter chips context) */
  const critCount = deck.filter(i => i.severity === "critical").length;
  const attCount  = deck.filter(i => i.severity === "attention").length;
  const infoCount = deck.filter(i => i.severity === "info").length;
  /* Remaining (not yet actioned) */
  const remaining = deck.filter(i => !localActions.has(i.id)).length;

  /* Navigation */
  const handlePrev = useCallback(() => {
    if (safeIdx > 0) { setIndex(safeIdx - 1); setExpanded(false); }
  }, [safeIdx]);

  const advanceDeck = useCallback(() => {
    if (safeIdx < deck.length - 1) { setIndex(safeIdx + 1); setExpanded(false); }
    else                            { onClose(); }
  }, [safeIdx, deck.length, onClose]);

  const handleSeen = useCallback(() => {
    if (!item) return;
    markSeen({ params: { id: item.id } });
    setLocalActions(prev => new Map(prev).set(item.id, "done"));
    advanceDeck();
  }, [item, markSeen, advanceDeck]);

  const handleSnooze = useCallback(() => {
    if (!item) return;
    snooze({ params: { id: item.id, hours: 8 } });
    setLocalActions(prev => new Map(prev).set(item.id, "snoozed"));
    advanceDeck();
  }, [item, snooze, advanceDeck]);

  /* Touch handlers */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    touchStartRef.current = null;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (prefersReducedMotion) return;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 48) {
      if (dx < 0) handleSeen();
      else         handlePrev();
    } else if (dy > 55 && Math.abs(dy) > Math.abs(dx)) {
      handleSnooze();
    }
  }, [prefersReducedMotion, handleSeen, handlePrev, handleSnooze]);

  const ff = "'Hanken Grotesk', system-ui, sans-serif";

  /* ── Empty / loading states ───────────────────────────────────────────── */
  const cardContent = () => {
    if (isLoading && deck.length === 0) {
      return (
        <div className="glass flex items-center justify-center" style={{ minHeight: 220 }}>
          <div className="flex gap-2 items-center" style={{ color: "rgba(228,232,255,0.35)", fontSize: 13, fontFamily: ff }}>
            <div className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: "#00d4ff", borderTopColor: "transparent" }} />
            Загрузка…
          </div>
        </div>
      );
    }
    if (remaining === 0 && deck.length > 0) {
      return (
        <div className="glass flex flex-col items-center justify-center gap-3 py-12">
          <div style={{ fontSize: 34 }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(228,232,255,0.75)", fontFamily: ff }}>День разобран</div>
          <div style={{ fontSize: 12, color: "rgba(228,232,255,0.32)", fontFamily: ff }}>Нет активных уведомлений</div>
        </div>
      );
    }
    if (deck.length === 0) {
      return (
        <div className="glass flex flex-col items-center justify-center gap-3 py-12">
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(228,232,255,0.55)", fontFamily: ff }}>Нет уведомлений</div>
        </div>
      );
    }
    return null; // render the main card
  };

  const emptyOrLoadingCard = cardContent();

  const isActioned = item ? localActions.has(item.id) : false;
  const actionedType = item ? localActions.get(item.id) : undefined;

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none"
      style={{ fontFamily: ff }}
    >
      <div
        className="pointer-events-auto w-full max-w-lg mx-auto px-4 flex flex-col gap-3"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

        {/* ── Header ── */}
        <div className="glass flex items-center justify-between px-4 py-2.5">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(228,232,255,0.45)", textTransform: "uppercase" }}>
              Лента
            </span>

            {/* Severity filter chips */}
            {(["critical","attention","info"] as const).map(s => {
              const cnt   = s === "critical" ? critCount : s === "attention" ? attCount : infoCount;
              const active = severityFilter === s;
              return (
                <button key={s} onClick={() => { setSeverityFilter(active ? undefined : s); }} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 999,
                  background: active ? `${SEV_COLOR[s]}20` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${active ? SEV_COLOR[s] : "rgba(255,255,255,0.09)"}`,
                  cursor: "pointer", transition: "all 150ms",
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: SEV_COLOR[s], boxShadow: `0 0 5px 2px ${SEV_COLOR[s]}88` }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: active ? SEV_COLOR[s] : "rgba(228,232,255,0.40)" }}>{cnt}</span>
                </button>
              );
            })}

            {/* External toggle */}
            <button onClick={() => { setIncludeExternal(v => !v); }} style={{
              display: "flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 999, cursor: "pointer",
              background: includeExternal ? "rgba(0,212,255,0.12)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${includeExternal ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.09)"}`,
              fontSize: 10, fontWeight: 600,
              color: includeExternal ? "#00d4ff" : "rgba(228,232,255,0.38)",
              transition: "all 150ms",
            }}>
              <ExternalLink style={{ width: 9, height: 9 }} /> Внешн
            </button>
          </div>

          {/* Counter + close */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {deck.length > 0 && (
              <span style={{ fontSize: 10, color: "rgba(228,232,255,0.28)", fontVariantNumeric: "tabular-nums" }}>
                {safeIdx + 1} / {deck.length}
              </span>
            )}
            <button onClick={onClose} style={{
              width: 26, height: 26, borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(228,232,255,0.45)",
            }}>
              <X style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>

        {/* ── Card area ── */}
        {emptyOrLoadingCard ?? (
          <div style={{ position: "relative" }}>

            {/* Ghost stack cards (behind) */}
            {deck.length > 1 && !prefersReducedMotion && (
              <>
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(8,12,28,0.70)",
                  borderRadius: 22, border: "1px solid rgba(255,255,255,0.05)",
                  transform: "translateY(12px) scaleX(0.92)",
                  opacity: 0.20, pointerEvents: "none",
                }} />
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(8,12,28,0.80)",
                  borderRadius: 22, border: "1px solid rgba(255,255,255,0.06)",
                  transform: "translateY(6px) scaleX(0.96)",
                  opacity: 0.35, pointerEvents: "none",
                }} />
              </>
            )}

            {/* Main card */}
            <div
              key={item?.id}
              className="glass overflow-hidden"
              style={{
                position: "relative",
                opacity: isActioned ? 0.55 : 1,
                animation: prefersReducedMotion ? undefined : "nf-card-in 220ms ease",
                transition: "opacity 300ms, background 200ms ease, border-color 200ms ease",
              }}
            >
              {/* Left severity stripe */}
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                background: sevColor,
                animation: (!prefersReducedMotion && item?.severity === "critical" && !isActioned)
                  ? "nf-pulse-stripe 2.4s ease-in-out infinite"
                  : undefined,
                boxShadow: `0 0 10px 3px ${sevColor}44`,
              }} />

              <div style={{ padding: "18px 22px 16px 26px" }}>

                {/* Meta row */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{
                    padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700,
                    letterSpacing: "0.07em", textTransform: "uppercase",
                    background: `${sevColor}20`, color: sevColor, border: `1px solid ${sevColor}40`,
                  }}>
                    {SEV_LABEL[item?.severity ?? "info"]}
                  </span>

                  {item && (
                    <span style={{
                      padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 600,
                      background: "rgba(255,255,255,0.05)", color: "rgba(228,232,255,0.40)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                      {TYPE_LABEL[item.type]}
                    </span>
                  )}

                  {/* СРОЧНО badge — pulsing, always red */}
                  {item?.isUrgentFlag && !isActioned && (
                    <span style={{
                      padding: "2px 8px", borderRadius: 5, fontSize: 9, fontWeight: 800,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      background: "rgba(239,68,68,0.18)", color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.45)",
                      display: "inline-flex", alignItems: "center", gap: 3,
                      animation: prefersReducedMotion ? undefined : "nf-pulse-badge 1.8s ease-in-out infinite",
                    }}>
                      <AlertTriangle style={{ width: 8, height: 8 }} /> СРОЧНО
                    </span>
                  )}

                  {/* Actioned indicator */}
                  {isActioned && (
                    <span style={{
                      padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 600,
                      background: "rgba(255,255,255,0.04)", color: "rgba(228,232,255,0.28)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      {actionedType === "done" ? "✓ готово" : "⏰ позже"}
                    </span>
                  )}

                  <div style={{ flexGrow: 1 }} />
                </div>

                {/* Business chip */}
                {item?.businessName && (
                  <button
                    onClick={() => item.businessId != null && onSelectBusiness?.(item.businessId!)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "2px 9px", borderRadius: 999, marginBottom: 8, cursor: "pointer",
                      background: "rgba(0,212,255,0.07)", border: "1px solid rgba(0,212,255,0.18)",
                      fontSize: 10, fontWeight: 600, color: "#00d4ff", transition: "all 150ms",
                    }}
                  >
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#00d4ff" }} />
                    {item.businessName}
                  </button>
                )}

                {/* Title */}
                <div style={{
                  fontSize: 14, fontWeight: 700, lineHeight: 1.35, marginBottom: 7,
                  color: isActioned ? "rgba(228,232,255,0.45)" : "rgba(228,232,255,0.92)",
                }}>
                  {item?.title}
                </div>

                {/* Body (expandable) */}
                <div
                  style={{
                    fontSize: 12.5, color: "rgba(228,232,255,0.52)", lineHeight: 1.65,
                    overflow: expanded ? undefined : "hidden",
                    display: expanded ? undefined : "-webkit-box",
                    WebkitLineClamp: expanded ? undefined : 3,
                    WebkitBoxOrient: "vertical" as any,
                    cursor: "pointer",
                  }}
                  onClick={() => setExpanded(v => !v)}
                >
                  {item?.body}
                </div>
                {!expanded && item?.body && item.body.length > 140 && (
                  <button
                    onClick={() => setExpanded(true)}
                    style={{ fontSize: 10, color: "#00d4ff", marginTop: 4, cursor: "pointer", background: "none", border: "none", padding: 0, fontFamily: ff }}
                  >
                    Читать далее →
                  </button>
                )}

                {/* Source + time */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10 }}>
                  <span style={{ fontSize: 10, color: "rgba(228,232,255,0.25)" }}>{item?.sourceLabel}</span>
                  <span style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(228,232,255,0.18)", flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: "rgba(228,232,255,0.25)" }}>{item ? timeAgo(item.createdAt) : ""}</span>
                </div>
              </div>

              {/* ── Action zone ── */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 22px 14px" }}>

                {/* Hero "Ответить" button — stub, full width */}
                <button
                  title="TODO: Шаг 5 — голосовой ответ"
                  style={{
                    width: "100%", height: 38, borderRadius: 12, marginBottom: 10,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    cursor: "pointer", transition: "all 150ms",
                    fontSize: 12, fontWeight: 700, fontFamily: ff,
                    color: "rgba(228,232,255,0.55)",
                    letterSpacing: "0.04em",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                >
                  <Mic style={{ width: 13, height: 13 }} />
                  ● Ответить
                  <span style={{ fontSize: 9, opacity: 0.45, fontWeight: 400 }}>(Шаг 5)</span>
                </button>

                {/* 3-button row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

                  {/* ← Назад */}
                  <button
                    onClick={handlePrev}
                    disabled={safeIdx === 0}
                    style={{
                      flex: 1, height: 34, borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      cursor: safeIdx === 0 ? "not-allowed" : "pointer",
                      opacity: safeIdx === 0 ? 0.35 : 1,
                      fontSize: 11, fontWeight: 600, fontFamily: ff,
                      color: "rgba(228,232,255,0.50)",
                      transition: "all 150ms",
                    }}
                  >
                    <ChevronLeft style={{ width: 13, height: 13 }} /> Назад
                  </button>

                  {/* Вернуться позже */}
                  <button
                    onClick={handleSnooze}
                    style={{
                      flex: 1.2, height: 34, borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      cursor: "pointer",
                      fontSize: 11, fontWeight: 600, fontFamily: ff,
                      color: "rgba(228,232,255,0.45)",
                      transition: "all 150ms",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  >
                    <Clock style={{ width: 12, height: 12 }} /> Позже
                  </button>

                  {/* Далее → */}
                  <button
                    onClick={handleSeen}
                    style={{
                      flex: 1, height: 34, borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      background: "linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 11, fontWeight: 700, fontFamily: ff,
                      color: "#fff",
                      boxShadow: "0 3px 12px rgba(0,212,255,0.28)",
                      transition: "all 150ms",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,212,255,0.45)")}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,212,255,0.28)")}
                  >
                    Далее <ChevronRight style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Progress dots + counter ── */}
        {deck.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {deck.slice(0, Math.min(deck.length, 14)).map((it, i) => {
              const actioned = localActions.has(it.id);
              const isCurrent = i === safeIdx;
              return (
                <button
                  key={it.id}
                  onClick={() => { setIndex(i); setExpanded(false); }}
                  style={{
                    width: isCurrent ? 20 : 6, height: 6, borderRadius: 999,
                    cursor: "pointer", border: "none",
                    background: actioned
                      ? "rgba(228,232,255,0.15)"
                      : isCurrent
                        ? SEV_COLOR[it.severity]
                        : `${SEV_COLOR[it.severity]}55`,
                    transition: "all 220ms",
                    boxShadow: isCurrent && !actioned
                      ? `0 0 8px 2px ${SEV_COLOR[it.severity]}66`
                      : "none",
                    opacity: actioned ? 0.5 : 1,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Swipe hint — fades out after first interaction */}
        {!prefersReducedMotion && deck.length > 1 && (
          <div style={{ textAlign: "center", pointerEvents: "none" }}>
            <span style={{ fontSize: 9, color: "rgba(228,232,255,0.18)", letterSpacing: "0.05em", fontFamily: ff }}>
              ← свайп: вперёд · → назад · ↓ позже
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
