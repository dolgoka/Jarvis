import { useState, useRef } from "react";
import { X, AlertTriangle, Info, Zap, ChevronsRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useListEvents, getListEventsQueryKey, useDismissEvent, useDismissAllEvents } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

const SEVERITY_CONFIG = {
  critical: {
    border: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    dot: "#ef4444",
    dotGlow: "rgba(239,68,68,0.55)",
    label: "Критично",
    Icon: Zap,
  },
  warning: {
    border: "#eab308",
    bg: "rgba(234,179,8,0.07)",
    dot: "#eab308",
    dotGlow: "rgba(234,179,8,0.50)",
    label: "Внимание",
    Icon: AlertTriangle,
  },
  info: {
    border: "rgba(0,212,255,0.35)",
    bg: "rgba(0,212,255,0.05)",
    dot: "#67e8f9",
    dotGlow: "rgba(103,232,249,0.35)",
    label: "Инфо",
    Icon: Info,
  },
} as const;

type Severity = keyof typeof SEVERITY_CONFIG;

function relativeTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ru });
  } catch {
    return "";
  }
}

interface EventCardProps {
  id: number;
  businessName: string | null;
  text: string;
  severity: Severity;
  occurredAt: string;
  onDismiss: (id: number) => void;
  isDismissing: boolean;
}

function EventCard({ id, businessName, text, severity, occurredAt, onDismiss, isDismissing }: EventCardProps) {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
  const Icon = cfg.Icon;

  return (
    <div
      className="relative flex-shrink-0 flex flex-col gap-1.5 rounded-xl cursor-default select-none"
      style={{
        width: 268,
        padding: "12px 14px 12px 16px",
        background: cfg.bg,
        borderLeft: `3px solid ${cfg.border}`,
        border: `1px solid ${cfg.border}33`,
        borderLeftWidth: 3,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: `0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)`,
        opacity: isDismissing ? 0.4 : 1,
        transition: "opacity 0.2s",
        pointerEvents: isDismissing ? "none" : undefined,
      }}
    >
      {/* Top row: dot + company + time + close */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: cfg.dot, boxShadow: `0 0 6px 2px ${cfg.dotGlow}` }}
          />
          <span
            className="text-[10px] font-mono uppercase tracking-widest truncate"
            style={{ color: cfg.dot, opacity: 0.85 }}
          >
            {businessName ?? cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-mono text-white/25 tabular-nums whitespace-nowrap">
            {relativeTime(occurredAt)}
          </span>
          <button
            onClick={() => onDismiss(id)}
            className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
            title="Закрыть"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Text */}
      <div className="flex items-start gap-2 pr-1">
        <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: cfg.border, opacity: 0.7 }} />
        <p className="text-[12px] text-white/70 leading-snug line-clamp-2">{text}</p>
      </div>
    </div>
  );
}

export function EventsFeed() {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dismissingIds, setDismissingIds] = useState<Set<number>>(new Set());
  const [allDismissing, setAllDismissing] = useState(false);

  const { data: events } = useListEvents({
    query: { queryKey: getListEventsQueryKey(), refetchOnWindowFocus: false },
  });

  const { mutate: dismissOne } = useDismissEvent({
    mutation: {
      onMutate: ({ id }) => {
        setDismissingIds(prev => new Set(prev).add(id));
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
        setDismissingIds(new Set());
      },
    },
  });

  const { mutate: dismissAll } = useDismissAllEvents({
    mutation: {
      onMutate: () => setAllDismissing(true),
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
        setAllDismissing(false);
      },
    },
  });

  if (!events || events.length === 0) return null;

  return (
    <div
      className="absolute top-10 md:top-14 left-0 right-0 z-10 flex items-center gap-2 px-4 pt-1 pb-2"
      style={{
        background: "linear-gradient(to bottom, rgba(2,8,16,0.75) 60%, transparent 100%)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    >
      {/* Scrollable cards strip */}
      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto flex-1 pb-0.5"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {events.map((ev) => (
          <EventCard
            key={ev.id}
            id={ev.id}
            businessName={ev.businessName ?? null}
            text={ev.text}
            severity={(ev.severity as Severity) ?? "info"}
            occurredAt={ev.occurredAt}
            onDismiss={(id) => dismissOne({ id })}
            isDismissing={dismissingIds.has(ev.id)}
          />
        ))}
      </div>

      {/* Dismiss all button */}
      <button
        onClick={() => dismissAll()}
        disabled={allDismissing}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-xl text-[11px] font-mono uppercase tracking-widest transition-all hover:bg-white/10 disabled:opacity-40"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "rgba(255,255,255,0.40)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        title="Закрыть все"
      >
        <ChevronsRight className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Закрыть всё</span>
      </button>
    </div>
  );
}
