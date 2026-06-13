import { useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Clock, AlertTriangle, Mic, ExternalLink } from "lucide-react";
import { useGetFeed, useMarkFeedSeen, useSnoozeFeedItem } from "@workspace/api-client-react";
import type { NewsItem } from "@workspace/api-client-react";

const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444",
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
  if (diff < 60)  return `${diff} мин назад`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

interface Props {
  onClose: () => void;
  onSelectBusiness?: (id: number) => void;
}

export default function NewsFeedOverlay({ onClose, onSelectBusiness }: Props) {
  const [severityFilter, setSeverityFilter] = useState<string | undefined>(undefined);
  const [includeExternal, setIncludeExternal] = useState(false);
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, refetch } = useGetFeed({
    severity: severityFilter as any,
    includeExternal: includeExternal || undefined,
  });

  const { mutate: markSeen  } = useMarkFeedSeen({ mutation: { onSuccess: () => { refetch(); setExpanded(false); } } });
  const { mutate: snooze    } = useSnoozeFeedItem({ mutation: { onSuccess: () => { refetch(); setExpanded(false); } } });

  const items: NewsItem[] = data ?? [];

  const safeIndex = Math.min(index, Math.max(items.length - 1, 0));

  const handleNext = useCallback(() => {
    if (safeIndex < items.length - 1) { setIndex(safeIndex + 1); setExpanded(false); }
  }, [safeIndex, items.length]);

  const handlePrev = useCallback(() => {
    if (safeIndex > 0) { setIndex(safeIndex - 1); setExpanded(false); }
  }, [safeIndex]);

  const handleSeen = useCallback(() => {
    if (!items[safeIndex]) return;
    markSeen({ params: { id: items[safeIndex].id } });
    if (safeIndex >= items.length - 1 && safeIndex > 0) setIndex(safeIndex - 1);
  }, [items, safeIndex, markSeen]);

  const handleSnooze = useCallback(() => {
    if (!items[safeIndex]) return;
    snooze({ params: { id: items[safeIndex].id, hours: 8 } });
    if (safeIndex >= items.length - 1 && safeIndex > 0) setIndex(safeIndex - 1);
  }, [items, safeIndex, snooze]);

  const critCount = items.filter(i => i.severity === "critical").length;
  const attCount  = items.filter(i => i.severity === "attention").length;
  const infoCount = items.filter(i => i.severity === "info").length;

  const item = items[safeIndex];
  const sevColor = item ? SEV_COLOR[item.severity] : "#22c55e";

  const fontFamily = "'Hanken Grotesk', system-ui, sans-serif";

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none"
      style={{ fontFamily }}
    >
      {/* Semi-transparent backdrop (just for the panel area, globe stays visible) */}
      <div className="pointer-events-auto w-full max-w-lg mx-auto px-4 flex flex-col gap-3">

        {/* ── Header bar ── */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ background: "rgba(8,12,28,0.88)", borderRadius: 22, border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(228,232,255,0.55)", textTransform: "uppercase" }}>
              Лента новостей
            </span>

            {/* Severity chips */}
            {(["critical","attention","info"] as const).map(s => {
              const count = s === "critical" ? critCount : s === "attention" ? attCount : infoCount;
              const active = severityFilter === s;
              return (
                <button key={s} onClick={() => setSeverityFilter(active ? undefined : s)} style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999,
                  background: active ? `${SEV_COLOR[s]}22` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${active ? SEV_COLOR[s] : "rgba(255,255,255,0.1)"}`,
                  cursor: "pointer", transition: "all 150ms",
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: SEV_COLOR[s], boxShadow: `0 0 6px 2px ${SEV_COLOR[s]}88` }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: active ? SEV_COLOR[s] : "rgba(228,232,255,0.45)" }}>{count}</span>
                </button>
              );
            })}

            <button onClick={() => { setIncludeExternal(v => !v); setIndex(0); }} style={{
              padding: "3px 10px", borderRadius: 999, cursor: "pointer",
              background: includeExternal ? "rgba(0,212,255,0.12)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${includeExternal ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.1)"}`,
              fontSize: 11, fontWeight: 600,
              color: includeExternal ? "#00d4ff" : "rgba(228,232,255,0.4)",
              transition: "all 150ms",
            }}>
              <ExternalLink style={{ display: "inline", width: 10, height: 10, marginRight: 4 }} />
              Внешн
            </button>
          </div>

          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(228,232,255,0.5)", transition: "all 150ms",
          }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* ── Main card ── */}
        {isLoading ? (
          <div
            className="flex items-center justify-center"
            style={{ minHeight: 260, background: "rgba(8,12,28,0.88)", borderRadius: 22, border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}
          >
            <div className="flex gap-2 items-center" style={{ color: "rgba(228,232,255,0.35)", fontSize: 13 }}>
              <div className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: "#00d4ff", borderTopColor: "transparent" }} />
              Загрузка…
            </div>
          </div>
        ) : items.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-10"
            style={{ background: "rgba(8,12,28,0.88)", borderRadius: 22, border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}
          >
            <div style={{ fontSize: 32 }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(228,232,255,0.7)" }}>День разобран</div>
            <div style={{ fontSize: 12, color: "rgba(228,232,255,0.35)" }}>Нет активных уведомлений</div>
          </div>
        ) : (
          <div
            style={{
              background: "rgba(8,12,28,0.90)",
              borderRadius: 22,
              border: `1px solid rgba(255,255,255,0.08)`,
              backdropFilter: "blur(20px)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Left severity stripe */}
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
              background: sevColor,
              boxShadow: `0 0 14px 4px ${sevColor}66`,
              ...(item?.severity === "critical" ? {} : {}),
            }} />

            <div style={{ padding: "20px 24px 20px 28px" }}>
              {/* Top meta row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                {/* Severity badge */}
                <span style={{
                  padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                  background: `${sevColor}22`, color: sevColor, textTransform: "uppercase",
                  border: `1px solid ${sevColor}44`,
                }}>
                  {item ? SEV_LABEL[item.severity] : ""}
                </span>

                {/* Type badge */}
                {item && (
                  <span style={{
                    padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
                    background: "rgba(255,255,255,0.05)", color: "rgba(228,232,255,0.45)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}>
                    {TYPE_LABEL[item.type]}
                  </span>
                )}

                {/* URGENT badge */}
                {item?.isUrgentFlag && (
                  <span style={{
                    padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                    background: "rgba(239,68,68,0.15)", color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.4)",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <AlertTriangle style={{ width: 9, height: 9 }} /> URGENT
                  </span>
                )}

                <div style={{ flexGrow: 1 }} />

                {/* Counter */}
                <span style={{ fontSize: 11, color: "rgba(228,232,255,0.30)", fontVariantNumeric: "tabular-nums" }}>
                  {safeIndex + 1} / {items.length}
                </span>
              </div>

              {/* Business chip */}
              {item?.businessName && (
                <button
                  onClick={() => item.businessId != null && onSelectBusiness?.(item.businessId!)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 10px", borderRadius: 999, marginBottom: 10, cursor: "pointer",
                    background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)",
                    fontSize: 11, fontWeight: 600, color: "#00d4ff", transition: "all 150ms",
                  }}
                >
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00d4ff" }} />
                  {item.businessName}
                </button>
              )}

              {/* Title */}
              <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(228,232,255,0.92)", lineHeight: 1.35, marginBottom: 8 }}>
                {item?.title}
              </div>

              {/* Body (expandable) */}
              <div
                style={{
                  fontSize: 13, color: "rgba(228,232,255,0.55)", lineHeight: 1.6,
                  overflow: expanded ? undefined : "hidden",
                  display: expanded ? undefined : "-webkit-box",
                  WebkitLineClamp: expanded ? undefined : 2,
                  WebkitBoxOrient: "vertical" as any,
                  cursor: "pointer",
                  transition: "all 200ms",
                }}
                onClick={() => setExpanded(v => !v)}
              >
                {item?.body}
              </div>
              {!expanded && item?.body && item.body.length > 120 && (
                <button
                  onClick={() => setExpanded(true)}
                  style={{ fontSize: 11, color: "#00d4ff", marginTop: 4, cursor: "pointer", background: "none", border: "none", padding: 0 }}
                >
                  Читать далее →
                </button>
              )}

              {/* Source + time */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
                <span style={{ fontSize: 11, color: "rgba(228,232,255,0.28)" }}>{item?.sourceLabel}</span>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(228,232,255,0.2)" }} />
                <span style={{ fontSize: 11, color: "rgba(228,232,255,0.28)" }}>{item ? timeAgo(item.createdAt) : ""}</span>
              </div>
            </div>

            {/* ── Action bar ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "12px 24px 16px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}>
              {/* Voice (stub) */}
              <button title="Голосовой комментарий" style={{
                width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(228,232,255,0.4)",
              }}>
                <Mic style={{ width: 14, height: 14 }} />
              </button>

              {/* Prev */}
              <button onClick={handlePrev} disabled={safeIndex === 0} style={{
                width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)", cursor: safeIndex === 0 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: safeIndex === 0 ? "rgba(228,232,255,0.15)" : "rgba(228,232,255,0.5)",
              }}>
                <ChevronLeft style={{ width: 15, height: 15 }} />
              </button>

              <div style={{ flexGrow: 1 }} />

              {/* Snooze */}
              <button onClick={handleSnooze} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                fontSize: 12, fontWeight: 600, color: "rgba(228,232,255,0.45)",
                transition: "all 150ms", fontFamily,
              }}>
                <Clock style={{ width: 12, height: 12 }} />
                Позже
              </button>

              {/* Seen / Done */}
              <button onClick={handleSeen} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 16px", borderRadius: 999, cursor: "pointer",
                background: "linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)",
                border: "none",
                fontSize: 12, fontWeight: 700, color: "#fff",
                boxShadow: "0 4px 14px rgba(0,212,255,0.3)",
                transition: "all 150ms", fontFamily,
              }}>
                Ок
              </button>

              <div style={{ flexGrow: 1 }} />

              {/* Next */}
              <button onClick={handleNext} disabled={safeIndex >= items.length - 1} style={{
                width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)", cursor: safeIndex >= items.length - 1 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: safeIndex >= items.length - 1 ? "rgba(228,232,255,0.15)" : "rgba(228,232,255,0.5)",
              }}>
                <ChevronRight style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>
        )}

        {/* Progress dots */}
        {items.length > 1 && (
          <div className="flex justify-center gap-1.5">
            {items.slice(0, Math.min(items.length, 12)).map((it, i) => (
              <button key={it.id} onClick={() => { setIndex(i); setExpanded(false); }} style={{
                width: i === safeIndex ? 18 : 6,
                height: 6, borderRadius: 999, cursor: "pointer", border: "none",
                background: i === safeIndex
                  ? SEV_COLOR[it.severity]
                  : `${SEV_COLOR[it.severity]}44`,
                transition: "all 200ms",
                boxShadow: i === safeIndex ? `0 0 8px 2px ${SEV_COLOR[it.severity]}66` : "none",
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
