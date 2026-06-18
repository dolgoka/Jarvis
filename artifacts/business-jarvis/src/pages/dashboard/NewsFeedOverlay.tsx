import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Clock, AlertTriangle, ExternalLink, MessageSquare, ArrowRight, CheckCircle2, RotateCcw, Loader2, Stamp, XCircle, Mic, Play, UserCheck } from "lucide-react";
import { useGetFeed, useMarkFeedSeen, useSnoozeFeedItem, useAcceptTask, useReturnTask, useApproveTask, useRejectApproval, usePingTask, useEscalateTask, useRemindTask, useReassignTask, useListPeople } from "@workspace/api-client-react";
import type { NewsItem } from "@workspace/api-client-react";
import { VoiceCapture } from "@/components/ui/VoiceCapture";
import { useLocation } from "wouter";

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
  urgent:        "Срочно",
  hr:            "HR",
  corporate:     "Корп",
  task:          "Задача",
  external:      "Внешн",
  task_new:      "Задача→",
  task_accepted: "Принята",
  task_review:   "Проверка",
  task_returned:  "Возврат",
  approval:       "Согласование",
  task_stuck:     "Зависла",
  task_escalated: "Эскалация",
};

const TASK_TYPES = new Set(["task_new", "task_accepted", "task_review", "task_returned", "approval", "task_stuck", "task_escalated"]);

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1)  return "только что";
  if (diff < 60) return `${diff} мин назад`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AI_REC: Record<string, string> = {
  urgent:    "Созвать экстренное совещание и согласовать план действий в течение 24 часов.",
  hr:        "Назначить замену и провести knowledge transfer до выхода сотрудника.",
  corporate: "Инициировать рабочую группу и запросить детальный отчёт с дедлайном.",
  task:      "Эскалировать задачу и назначить ответственного с чётким дедлайном.",
  external:  "Поставить на мониторинг и уведомить профильного менеджера.",
  approval:  "Рассмотреть документы и вынести решение до истечения срока.",
};
function getAiRec(type: string): string {
  return AI_REC[type] ?? "Проверить статус и согласовать следующий шаг с командой.";
}

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface Props {
  onClose: () => void;
  onSelectBusiness?: (id: number) => void;
  onOpenTask?: (text: string) => void;
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function NewsFeedOverlay({ onClose, onSelectBusiness, onOpenTask }: Props) {
  const [, navigate] = useLocation();

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

  /* Reply zone */
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const replyRef = useRef<HTMLTextAreaElement>(null);

  /* Task action zone */
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnComment, setReturnComment] = useState("");
  const [returnCommentError, setReturnCommentError] = useState("");

  /* Approval action zone */
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectCommentError, setRejectCommentError] = useState("");

  /* Stable callback slot — filled after handleSeen is defined below */
  const onTaskSuccessRef = useRef<() => void>(() => {});

  const { mutate: acceptTask, isPending: isAccepting } = useAcceptTask({
    mutation: {
      onSuccess: () => { onTaskSuccessRef.current(); },
      onError: () => {},
    },
  });
  const { mutate: returnTask, isPending: isReturning } = useReturnTask({
    mutation: {
      onSuccess: () => { onTaskSuccessRef.current(); },
      onError: () => {},
    },
  });
  const { mutate: approveTask, isPending: isApproving } = useApproveTask({
    mutation: {
      onSuccess: () => { onTaskSuccessRef.current(); },
      onError: () => {},
    },
  });
  const { mutate: rejectApproval, isPending: isRejecting } = useRejectApproval({
    mutation: {
      onSuccess: () => { onTaskSuccessRef.current(); },
      onError: () => {},
    },
  });
  const { mutate: pingTask, isPending: isPinging } = usePingTask({
    mutation: {
      onSuccess: () => { onTaskSuccessRef.current(); },
      onError: () => {},
    },
  });
  const { mutate: escalateTask, isPending: isEscalating } = useEscalateTask({
    mutation: {
      onSuccess: () => { onTaskSuccessRef.current(); },
      onError: () => {},
    },
  });
  const { mutate: remindTask, isPending: isReminding } = useRemindTask({
    mutation: {
      onSuccess: () => { onTaskSuccessRef.current(); },
      onError: () => {},
    },
  });
  const { mutate: reassignTask, isPending: isReassigning } = useReassignTask({
    mutation: {
      onSuccess: () => { setReassignOpen(false); onTaskSuccessRef.current(); },
      onError: () => {},
    },
  });

  /* Reassign picker state */
  const [reassignOpen, setReassignOpen] = useState(false);
  const { data: people } = useListPeople();

  /* Touch swipe */
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  /* API */
  const { data, isLoading } = useGetFeed({
    severity:        severityFilter as any,
    includeExternal: includeExternal || undefined,
    role:            "owner",
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

  /* Reset reply + task + approval action zones when card changes */
  useEffect(() => {
    setReplyOpen(false);
    setReplyText("");
    setReturnOpen(false);
    setReturnComment("");
    setReturnCommentError("");
    setRejectOpen(false);
    setRejectComment("");
    setRejectCommentError("");
    setReassignOpen(false);
  }, [safeIdx]);

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

  /* Keep task success callback ref in sync with the latest handleSeen */
  onTaskSuccessRef.current = handleSeen;

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
              const label = s === "critical" ? "срочно" : s === "attention" ? "важно" : "инфо";
              const active = severityFilter === s;
              return (
                <button key={s} onClick={() => { setSeverityFilter(active ? undefined : s); }} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 999,
                  background: active ? `${SEV_COLOR[s]}20` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${active ? SEV_COLOR[s] : "rgba(255,255,255,0.09)"}`,
                  cursor: "pointer", transition: "all 150ms",
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: SEV_COLOR[s], boxShadow: `0 0 5px 2px ${SEV_COLOR[s]}88` }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: active ? SEV_COLOR[s] : "rgba(228,232,255,0.40)" }}>{label} {cnt}</span>
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

                {/* Actioned indicator */}
                {isActioned && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{
                      padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 600,
                      background: "rgba(255,255,255,0.04)", color: "rgba(228,232,255,0.28)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      {actionedType === "done" ? "✓ готово" : "⏰ позже"}
                    </span>
                  </div>
                )}

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
                    fontSize: 12.5, color: "rgba(228,232,255,0.78)", lineHeight: 1.65,
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
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {item?.authorName && (
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, #00d4ff33, #0099cc55)",
                      border: "1px solid rgba(0,212,255,0.35)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, fontWeight: 800, color: "#00d4ff", letterSpacing: "0.02em",
                    }}>
                      {getInitials(item.authorName)}
                    </div>
                  )}
                  {item?.authorName && (
                    <span style={{ fontSize: 11, color: "rgba(228,232,255,0.82)", fontWeight: 600 }}>{item.authorName}</span>
                  )}
                  <span style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(228,232,255,0.35)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "rgba(228,232,255,0.55)", fontWeight: 500 }}>{item?.sourceLabel}</span>
                  <span style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(228,232,255,0.35)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "rgba(228,232,255,0.45)" }}>{item ? timeAgo(item.createdAt) : ""}</span>
                </div>
              </div>

              {/* ── Action zone ── */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 22px 14px" }}>

                {/* ── AI Recommendation block (non-task items) ── */}
                {item && !TASK_TYPES.has(item.type) && !isActioned && (
                  <div style={{
                    borderRadius: 12, marginBottom: 10,
                    background: "rgba(0,212,255,0.06)",
                    border: "1px solid rgba(0,212,255,0.22)",
                    padding: "10px 13px",
                    display: "flex", flexDirection: "column", gap: 7,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ color: "#00d4ff", fontSize: 11 }}>✦</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#00d4ff", letterSpacing: "0.06em", textTransform: "uppercase" }}>Рекомендую</span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(228,232,255,0.78)", lineHeight: 1.55 }}>
                      {getAiRec(item.type)}
                    </div>

                    {/* Action buttons: Запустить план + Поручить */}
                    <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                      <button
                        onClick={() => {
                          const ctx = item
                            ? `По новости «${item.title}»${item.businessName ? ` (${item.businessName})` : ""}:\n\n${getAiRec(item.type)}`
                            : getAiRec(item.type);
                          onOpenTask?.(ctx);
                        }}
                        style={{
                          flex: 2, height: 38, borderRadius: 11,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          background: "linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)",
                          border: "none", cursor: "pointer",
                          fontSize: 12, fontWeight: 700, fontFamily: ff, color: "#fff",
                          boxShadow: "0 3px 14px rgba(0,212,255,0.32)",
                          transition: "all 150ms",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,212,255,0.50)")}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 3px 14px rgba(0,212,255,0.32)")}
                      >
                        <Play style={{ width: 12, height: 12, fill: "#fff" }} />
                        Запустить план
                      </button>
                      <button
                        onClick={() => { setReplyOpen(true); setTimeout(() => replyRef.current?.focus(), 80); }}
                        style={{
                          flex: 1, height: 38, borderRadius: 11,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.14)",
                          cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: ff,
                          color: "rgba(228,232,255,0.72)", transition: "all 150ms",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                      >
                        <UserCheck style={{ width: 13, height: 13 }} />
                        Поручить
                      </button>
                    </div>
                  </div>
                )}

                {/* Reply zone (expanded when Поручить clicked) */}
                {replyOpen && (
                  <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{
                      display: "flex", alignItems: "flex-start", gap: 6,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(0,212,255,0.28)",
                      borderRadius: 12, padding: "8px 10px 8px 12px",
                    }}>
                      <textarea
                        ref={replyRef}
                        rows={3}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Поручить: кому и что…"
                        style={{
                          flex: 1, resize: "none", background: "none", border: "none", outline: "none",
                          fontSize: 12, fontFamily: ff, lineHeight: 1.55,
                          color: "rgba(228,232,255,0.88)", caretColor: "#00d4ff",
                        }}
                      />
                      <VoiceCapture
                        onText={t => setReplyText(prev => prev ? `${prev} ${t}` : t)}
                        accentColor="rgba(0,212,255,0.7)"
                      />
                    </div>
                    <div style={{ display: "flex", gap: 7 }}>
                      <button
                        onClick={() => { setReplyOpen(false); setReplyText(""); }}
                        style={{
                          flex: 1, height: 34, borderRadius: 10,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.09)",
                          cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: ff,
                          color: "rgba(228,232,255,0.70)", transition: "all 150ms",
                        }}
                      >
                        Отмена
                      </button>
                      <button
                        onClick={() => {
                          if (!replyText.trim()) return;
                          const ctx = item
                            ? `По новости «${item.title}»${item.businessName ? ` (${item.businessName})` : ""}:\n\n${replyText.trim()}`
                            : replyText.trim();
                          onOpenTask?.(ctx);
                        }}
                        style={{
                          flex: 2, height: 34, borderRadius: 10,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                          background: replyText.trim()
                            ? "linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)"
                            : "rgba(255,255,255,0.06)",
                          border: "none",
                          cursor: replyText.trim() ? "pointer" : "not-allowed",
                          fontSize: 11, fontWeight: 700, fontFamily: ff,
                          color: replyText.trim() ? "#fff" : "rgba(228,232,255,0.28)",
                          boxShadow: replyText.trim() ? "0 3px 12px rgba(0,212,255,0.28)" : "none",
                          transition: "all 150ms",
                        }}
                      >
                        Оформить <ArrowRight style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Task action zone (only for task event cards) ── */}
                {item && TASK_TYPES.has(item.type) && !isActioned && (
                  <div style={{ marginBottom: 10 }}>

                    {/* task_review → inline Принять / Вернуть */}
                    {item.type === "task_review" && (item as any).taskId != null && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

                        {returnOpen && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <textarea
                              rows={2}
                              value={returnComment}
                              onChange={e => { setReturnComment(e.target.value); setReturnCommentError(""); }}
                              placeholder="Причина возврата…"
                              autoFocus
                              style={{
                                width: "100%", resize: "none", borderRadius: 10,
                                padding: "8px 12px", fontSize: 12, fontFamily: ff,
                                background: "rgba(255,255,255,0.04)",
                                border: returnCommentError ? "1px solid rgba(240,98,90,0.5)" : "1px solid rgba(255,255,255,0.09)",
                                color: "rgba(228,232,255,0.88)", outline: "none", caretColor: "#5b8bd0",
                              }}
                            />
                            {returnCommentError && (
                              <span style={{ fontSize: 11, color: "#f0625a", fontFamily: ff }}>{returnCommentError}</span>
                            )}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 8 }}>
                          {returnOpen && (
                            <button
                              onClick={() => { setReturnOpen(false); setReturnComment(""); setReturnCommentError(""); }}
                              disabled={isReturning}
                              style={{
                                flex: 1, height: 36, borderRadius: 10, cursor: "pointer",
                                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
                                fontSize: 11, fontWeight: 600, fontFamily: ff, color: "rgba(228,232,255,0.40)",
                              }}
                            >
                              Отмена
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (!returnOpen) { setReturnOpen(true); return; }
                              if (!returnComment.trim()) { setReturnCommentError("Укажите причину возврата"); return; }
                              returnTask({ params: { id: (item as any).taskId! }, data: { comment: returnComment.trim() } });
                            }}
                            disabled={isAccepting || isReturning}
                            style={{
                              flex: returnOpen ? 2 : 1, height: 36, borderRadius: 10,
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                              background: returnOpen ? "rgba(240,98,90,0.14)" : "rgba(255,255,255,0.05)",
                              border: returnOpen ? "1px solid rgba(240,98,90,0.40)" : "1px solid rgba(255,255,255,0.09)",
                              color: returnOpen ? "#f0625a" : "rgba(228,232,255,0.50)",
                              cursor: (isAccepting || isReturning) ? "not-allowed" : "pointer",
                              fontSize: 11, fontWeight: 700, fontFamily: ff,
                              opacity: isReturning ? 0.6 : 1, transition: "all 150ms",
                            }}
                          >
                            {isReturning
                              ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                              : <RotateCcw style={{ width: 13, height: 13 }} />
                            }
                            {returnOpen ? "Подтвердить" : "Вернуть"}
                          </button>
                          {!returnOpen && (
                            <button
                              onClick={() => { acceptTask({ params: { id: (item as any).taskId! } }); }}
                              disabled={isAccepting || isReturning}
                              style={{
                                flex: 2, height: 36, borderRadius: 10,
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                background: "linear-gradient(135deg, #3ed9a0 0%, #2ab87f 100%)",
                                border: "none", color: "#06111f",
                                fontFamily: ff, fontSize: 12, fontWeight: 700,
                                cursor: (isAccepting || isReturning) ? "not-allowed" : "pointer",
                                boxShadow: "0 4px 14px rgba(62,217,160,0.28)",
                                opacity: isAccepting ? 0.6 : 1, transition: "opacity 150ms",
                              }}
                            >
                              {isAccepting
                                ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                                : <CheckCircle2 style={{ width: 14, height: 14 }} />
                              }
                              Принять
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* approval → Согласовать / Отклонить */}
                    {item.type === "approval" && (item as any).taskId != null && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

                        {/* Who is requesting */}
                        {item.body && (
                          <div style={{
                            padding: "9px 12px", borderRadius: 10,
                            background: "rgba(240,181,74,0.06)", border: "1px solid rgba(240,181,74,0.18)",
                            fontSize: 12, color: "rgba(228,232,255,0.60)", fontFamily: ff, lineHeight: 1.55,
                          }}>
                            {item.body}
                          </div>
                        )}

                        {/* Rejection comment textarea */}
                        {rejectOpen && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            <textarea
                              rows={2}
                              value={rejectComment}
                              onChange={e => { setRejectComment(e.target.value); setRejectCommentError(""); }}
                              placeholder="Причина отклонения…"
                              autoFocus
                              style={{
                                width: "100%", resize: "none", borderRadius: 10,
                                padding: "8px 12px", fontSize: 12, fontFamily: ff,
                                background: "rgba(255,255,255,0.04)",
                                border: rejectCommentError ? "1px solid rgba(240,98,90,0.5)" : "1px solid rgba(255,255,255,0.09)",
                                color: "rgba(228,232,255,0.88)", outline: "none", caretColor: "#5b8bd0",
                              }}
                            />
                            {rejectCommentError && (
                              <span style={{ fontSize: 11, color: "#f0625a", fontFamily: ff }}>{rejectCommentError}</span>
                            )}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 8 }}>
                          {/* Cancel rejection */}
                          {rejectOpen && (
                            <button
                              onClick={() => { setRejectOpen(false); setRejectComment(""); setRejectCommentError(""); }}
                              disabled={isRejecting}
                              style={{
                                flex: 1, height: 38, borderRadius: 10, cursor: "pointer",
                                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
                                fontSize: 11, fontWeight: 600, fontFamily: ff, color: "rgba(228,232,255,0.40)",
                              }}
                            >
                              Отмена
                            </button>
                          )}

                          {/* Отклонить */}
                          <button
                            onClick={() => {
                              if (!rejectOpen) { setRejectOpen(true); return; }
                              if (!rejectComment.trim()) { setRejectCommentError("Укажите причину"); return; }
                              rejectApproval({
                                params: { id: (item as any).taskId! },
                                data: { comment: rejectComment.trim() },
                              });
                            }}
                            disabled={isApproving || isRejecting}
                            style={{
                              flex: rejectOpen ? 2 : 1, height: 38, borderRadius: 10,
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                              background: rejectOpen ? "rgba(240,98,90,0.14)" : "rgba(255,255,255,0.05)",
                              border: rejectOpen ? "1px solid rgba(240,98,90,0.40)" : "1px solid rgba(255,255,255,0.09)",
                              color: rejectOpen ? "#f0625a" : "rgba(228,232,255,0.50)",
                              cursor: (isApproving || isRejecting) ? "not-allowed" : "pointer",
                              fontSize: 12, fontWeight: 700, fontFamily: ff,
                              opacity: isRejecting ? 0.6 : 1, transition: "all 150ms",
                            }}
                          >
                            {isRejecting
                              ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                              : <XCircle style={{ width: 13, height: 13 }} />
                            }
                            {rejectOpen ? "Подтвердить отклонение" : "Отклонить"}
                          </button>

                          {/* Согласовать */}
                          {!rejectOpen && (
                            <button
                              onClick={() => {
                                approveTask({ params: { id: (item as any).taskId! } });
                              }}
                              disabled={isApproving || isRejecting}
                              style={{
                                flex: 2, height: 38, borderRadius: 10,
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                background: "linear-gradient(135deg, #3ed9a0 0%, #2ab87f 100%)",
                                border: "none", color: "#06111f",
                                fontFamily: ff, fontSize: 13, fontWeight: 700,
                                cursor: (isApproving || isRejecting) ? "not-allowed" : "pointer",
                                boxShadow: "0 4px 14px rgba(62,217,160,0.28)",
                                opacity: isApproving ? 0.6 : 1, transition: "opacity 150ms",
                              }}
                            >
                              {isApproving
                                ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                                : <Stamp style={{ width: 14, height: 14 }} />
                              }
                              Согласовать
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* task_new / task_accepted / task_returned → Открыть задачу */}
                    {(item.type === "task_new" || item.type === "task_accepted" || item.type === "task_returned") && (item as any).taskId != null && (
                      <button
                        onClick={() => { onClose(); navigate(`/tasks`); }}
                        style={{
                          width: "100%", height: 36, borderRadius: 10,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          background: "rgba(91,139,208,0.12)",
                          border: "1px solid rgba(91,139,208,0.35)",
                          color: "#5b8bd0", fontFamily: ff, fontSize: 12, fontWeight: 700,
                          cursor: "pointer", transition: "all 150ms",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(91,139,208,0.20)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(91,139,208,0.12)")}
                      >
                        Открыть задачи →
                      </button>
                    )}

                    {/* task_stuck → Пнуть + Открыть + Эскалировать */}
                    {item.type === "task_stuck" && (item as any).taskId != null && (
                      <div style={{ display: "flex", gap: 7 }}>
                        <button
                          onClick={() => { pingTask({ params: { id: (item as any).taskId! } }); }}
                          disabled={isPinging || isEscalating}
                          style={{
                            flex: 1, height: 36, borderRadius: 10,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                            background: "rgba(240,181,74,0.12)", border: "1px solid rgba(240,181,74,0.35)",
                            color: "#f0b54a", fontFamily: ff, fontSize: 11, fontWeight: 700,
                            cursor: isPinging ? "not-allowed" : "pointer",
                            opacity: isPinging ? 0.6 : 1, transition: "all 150ms",
                          }}
                        >
                          {isPinging
                            ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                            : "👊"
                          }
                          Пнуть
                        </button>
                        <button
                          onClick={() => { onClose(); navigate("/tasks"); }}
                          style={{
                            flex: 1, height: 36, borderRadius: 10,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                            background: "rgba(91,139,208,0.10)", border: "1px solid rgba(91,139,208,0.30)",
                            color: "#5b8bd0", fontFamily: ff, fontSize: 11, fontWeight: 700,
                            cursor: "pointer", transition: "all 150ms",
                          }}
                        >
                          Открыть →
                        </button>
                        <button
                          onClick={() => { escalateTask({ params: { id: (item as any).taskId! } }); }}
                          disabled={isPinging || isEscalating}
                          style={{
                            flex: 1.3, height: 36, borderRadius: 10,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                            background: "rgba(240,98,90,0.10)", border: "1px solid rgba(240,98,90,0.30)",
                            color: "#f0625a", fontFamily: ff, fontSize: 11, fontWeight: 700,
                            cursor: isEscalating ? "not-allowed" : "pointer",
                            opacity: isEscalating ? 0.6 : 1, transition: "all 150ms",
                          }}
                        >
                          {isEscalating
                            ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                            : "⬆"
                          }
                          Эскалировать
                        </button>
                      </div>
                    )}

                    {/* task_escalated → Напомнить лично + Переназначить + Открыть задачу */}
                    {item.type === "task_escalated" && (item as any).taskId != null && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

                        {/* AI context hint */}
                        <div style={{
                          fontSize: 10, color: "rgba(228,232,255,0.35)", fontFamily: ff,
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "4px 8px", borderRadius: 7,
                          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                        }}>
                          <span style={{ color: "#00d4ff", opacity: 0.6, fontSize: 9 }}>ИИ</span>
                          ИИ уже напомнил исполнителю автоматически
                        </div>

                        {/* Action buttons row */}
                        <div style={{ display: "flex", gap: 7 }}>
                          {/* Напомнить лично */}
                          <button
                            onClick={() => { remindTask({ params: { id: (item as any).taskId! } }); }}
                            disabled={isReminding || isReassigning}
                            style={{
                              flex: 1.2, height: 36, borderRadius: 10,
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                              background: "rgba(240,181,74,0.12)", border: "1px solid rgba(240,181,74,0.35)",
                              color: "#f0b54a", fontFamily: ff, fontSize: 11, fontWeight: 700,
                              cursor: isReminding ? "not-allowed" : "pointer",
                              opacity: isReminding ? 0.6 : 1, transition: "all 150ms",
                            }}
                          >
                            {isReminding
                              ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                              : <MessageSquare style={{ width: 12, height: 12 }} />
                            }
                            Напомнить лично
                          </button>

                          {/* Переназначить */}
                          <button
                            onClick={() => setReassignOpen(v => !v)}
                            disabled={isReminding || isReassigning}
                            style={{
                              flex: 1, height: 36, borderRadius: 10,
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                              background: reassignOpen ? "rgba(167,139,250,0.18)" : "rgba(167,139,250,0.10)",
                              border: `1px solid ${reassignOpen ? "rgba(167,139,250,0.55)" : "rgba(167,139,250,0.30)"}`,
                              color: "#a78bfa", fontFamily: ff, fontSize: 11, fontWeight: 700,
                              cursor: "pointer", transition: "all 150ms",
                            }}
                          >
                            <RotateCcw style={{ width: 12, height: 12 }} />
                            Переназначить
                          </button>

                          {/* Открыть задачу */}
                          <button
                            onClick={() => { onClose(); navigate("/tasks"); }}
                            style={{
                              flex: 0.8, height: 36, borderRadius: 10,
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                              background: "rgba(91,139,208,0.10)", border: "1px solid rgba(91,139,208,0.30)",
                              color: "#5b8bd0", fontFamily: ff, fontSize: 11, fontWeight: 700,
                              cursor: "pointer", transition: "all 150ms",
                            }}
                          >
                            Открыть <ArrowRight style={{ width: 11, height: 11 }} />
                          </button>
                        </div>

                        {/* Reassign person picker (inline dropdown) */}
                        {reassignOpen && (
                          <div className="glass" style={{ padding: "8px 6px", display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(228,232,255,0.30)", padding: "0 6px 4px", fontFamily: ff }}>
                              Выберите нового исполнителя
                            </div>
                            {(people ?? []).filter(p => !p.isAssistant || (people?.length ?? 0) <= 1).map(person => (
                              <button
                                key={person.id}
                                onClick={() => reassignTask({ params: { id: (item as any).taskId!, assigneeId: person.id } })}
                                disabled={isReassigning}
                                style={{
                                  width: "100%", padding: "6px 10px", borderRadius: 8, textAlign: "left",
                                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                                  cursor: isReassigning ? "not-allowed" : "pointer",
                                  display: "flex", alignItems: "center", gap: 8,
                                  transition: "all 120ms",
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(167,139,250,0.12)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                              >
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", flexShrink: 0 }} />
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(228,232,255,0.80)", fontFamily: ff }}>{person.role}</div>
                                  {person.name && <div style={{ fontSize: 9, color: "rgba(228,232,255,0.35)", fontFamily: ff }}>{person.name}</div>}
                                </div>
                                {isReassigning && <Loader2 style={{ width: 10, height: 10, marginLeft: "auto", animation: "spin 1s linear infinite", color: "#a78bfa" }} />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 4-button row: Назад · Напомнить завтра · Далее · 🎤 */}
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>

                  {/* ← Назад */}
                  <button
                    onClick={handlePrev}
                    disabled={safeIdx === 0}
                    style={{
                      flex: 1, height: 36, borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      cursor: safeIdx === 0 ? "not-allowed" : "pointer",
                      opacity: safeIdx === 0 ? 0.30 : 1,
                      fontSize: 11, fontWeight: 600, fontFamily: ff,
                      color: "rgba(228,232,255,0.65)",
                      transition: "all 150ms",
                    }}
                  >
                    <ChevronLeft style={{ width: 13, height: 13 }} /> Назад
                  </button>

                  {/* Напомнить завтра */}
                  <button
                    onClick={handleSnooze}
                    style={{
                      flex: 1.5, height: 36, borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      cursor: "pointer",
                      fontSize: 10.5, fontWeight: 600, fontFamily: ff,
                      color: "rgba(228,232,255,0.65)",
                      transition: "all 150ms",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  >
                    <Clock style={{ width: 11, height: 11 }} /> Напомнить завтра
                  </button>

                  {/* Далее — secondary style */}
                  <button
                    onClick={handleSeen}
                    style={{
                      flex: 1, height: 36, borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      cursor: "pointer",
                      fontSize: 11, fontWeight: 700, fontFamily: ff,
                      color: "rgba(228,232,255,0.82)",
                      transition: "all 150ms",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.11)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                  >
                    Далее <ChevronRight style={{ width: 13, height: 13 }} />
                  </button>

                  {/* 🎤 Mic */}
                  <button
                    onClick={() => { setReplyOpen(v => !v); setTimeout(() => replyRef.current?.focus(), 80); }}
                    style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(0,212,255,0.10)",
                      border: "1px solid rgba(0,212,255,0.30)",
                      cursor: "pointer", transition: "all 150ms",
                      color: "#00d4ff",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,212,255,0.20)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,212,255,0.10)")}
                  >
                    <Mic style={{ width: 14, height: 14 }} />
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

      </div>
    </div>
  );
}
