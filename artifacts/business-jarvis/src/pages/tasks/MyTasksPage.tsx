import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, ChevronDown, ChevronUp,
  AlertTriangle, Calendar, Users, CheckCircle2,
  Send, RotateCcw, X, Bell, ClipboardList,
} from "lucide-react";
import {
  useListTasks, useListPeople, useStartTask, useSubmitTask,
  useGetFeed, useMarkFeedSeen, useGetTaskActivity,
} from "@workspace/api-client-react";
import { useAuthContext } from "@/hooks/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

const HF   = "'Hanken Grotesk', system-ui, sans-serif";
const ACCENT = "#5b8bd0";

/* ── Palette ────────────────────────────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  sent:        { label: "Принять",    color: "#5b8bd0", icon: "📩" },
  in_progress: { label: "В работе",  color: "#00d4ff", icon: "⚡" },
  returned:    { label: "Возвращено", color: "#f0625a", icon: "↩" },
  review:      { label: "На приёмке",color: "#f0b54a", icon: "📤" },
  done:        { label: "Готово",    color: "#3ed9a0", icon: "✅" },
};
const PRIORITY_META: Record<string, { icon: string; color: string; label: string }> = {
  high:   { icon: "🔴", color: "#f0625a", label: "Срочно" },
  medium: { icon: "🟡", color: "#f0b54a", label: "Средний" },
  low:    { icon: "🟢", color: "#3ed9a0", label: "Низкий" },
};
const ACTIVITY_META: Record<string, { label: string; dot: string }> = {
  created:        { label: "Поставлена",       dot: ACCENT },
  accepted:       { label: "Принята в работу", dot: "#3ed9a0" },
  submitted:      { label: "Сдана на приёмку", dot: "#f0b54a" },
  accepted_final: { label: "Принята",          dot: "#3ed9a0" },
  returned:       { label: "Возвращена",        dot: "#f0625a" },
  decomposed:     { label: "Разбита на части",  dot: "#a78bfa" },
  commented:      { label: "Комментарий",       dot: ACCENT },
  escalated:      { label: "Эскалация",         dot: "#f0625a" },
  pinged:         { label: "Напоминание",       dot: "#f0b54a" },
};

const TEXT = {
  hi:  "rgba(228,232,255,0.92)",
  mid: "rgba(228,232,255,0.60)",
  lo:  "rgba(228,232,255,0.38)",
  dim: "rgba(228,232,255,0.22)",
};
const DIVIDER = "rgba(255,255,255,0.07)";

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1)  return "только что";
  if (diff < 60) return `${diff} мин`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h} ч`;
  return `${Math.floor(h / 24)} дн`;
}

/* ── Activity timeline ──────────────────────────────────────────────────── */
function Timeline({ taskId }: { taskId: number }) {
  const { data = [], isLoading } = useGetTaskActivity({ id: taskId });
  if (isLoading) return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", color: TEXT.dim, fontSize: 11, fontFamily: HF, padding: "6px 0" }}>
      <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} /> Загрузка хроники…
    </div>
  );
  if (!data.length) return (
    <div style={{ fontSize: 11, color: TEXT.dim, fontFamily: HF, fontStyle: "italic" }}>Хроника пуста</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {data.map((entry, idx) => {
        const meta = ACTIVITY_META[entry.type] ?? { label: entry.type, dot: ACCENT };
        const isLast = idx === data.length - 1;
        const d = new Date(entry.at);
        const timeStr = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
        return (
          <div key={entry.id} style={{ display: "flex", gap: 10, position: "relative" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 4, background: meta.dot, border: `2px solid ${meta.dot}55`, boxShadow: isLast ? `0 0 6px 2px ${meta.dot}55` : "none" }} />
              {!isLast && <div style={{ width: 1.5, flex: 1, minHeight: 14, background: DIVIDER, marginTop: 2 }} />}
            </div>
            <div style={{ paddingBottom: isLast ? 0 : 12, minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: TEXT.mid, fontFamily: HF }}>{meta.label}</span>
                <span style={{ fontSize: 10, color: TEXT.dim, fontFamily: HF }}>{timeStr}</span>
              </div>
              {entry.text && (
                <div style={{ marginTop: 4, padding: "5px 9px", borderRadius: 7, background: "rgba(255,255,255,0.03)", border: `1px solid ${DIVIDER}`, fontSize: 11, color: TEXT.lo, fontFamily: HF, lineHeight: 1.5 }}>
                  {entry.text}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Task card ──────────────────────────────────────────────────────────── */
type Task = {
  id: number; title: string; body: string;
  assigneeId: number; assigneeName: string; assigneeRole: string;
  watchers: { id: number; name: string; role: string }[];
  priority: "high" | "medium" | "low";
  dueDate?: string | null; status: string;
  resultNote?: string | null; returnComment?: string | null;
  createdAt: string; lastActivityAt: string;
  createdBy?: string | null;
};

function TaskCard({
  task,
  expanded,
  onToggle,
  onRefresh,
}: {
  task: Task;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const [submitOpen, setSubmitOpen]   = useState(false);
  const [resultNote, setResultNote]   = useState("");
  const [noteError,  setNoteError]    = useState("");

  const sMeta = STATUS_META[task.status] ?? { label: task.status, color: ACCENT, icon: "•" };
  const pMeta = PRIORITY_META[task.priority] ?? PRIORITY_META.medium!;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  /* ── actions ── */
  const { mutate: startTask, isPending: isStarting } = useStartTask({
    mutation: {
      onSuccess: () => {
        toast.success("Задача принята в работу", { description: task.title, duration: 3000 });
        onRefresh();
      },
      onError: () => toast.error("Не удалось принять задачу"),
    },
  });
  const { mutate: submitTask, isPending: isSubmitting } = useSubmitTask({
    mutation: {
      onSuccess: () => {
        toast.success("Задача сдана на приёмку", { description: task.title, duration: 3000 });
        setSubmitOpen(false);
        setResultNote("");
        onRefresh();
      },
      onError: () => toast.error("Не удалось сдать задачу"),
    },
  });

  const busy = isStarting || isSubmitting;

  return (
    <div
      className="glass overflow-hidden"
      style={{
        borderRadius: 16,
        borderLeft: `3px solid ${sMeta.color}`,
      }}
    >
      {/* ── Collapsed header ── */}
      <button
        className="w-full text-left"
        onClick={onToggle}
        style={{ display: "block", padding: "13px 16px", background: "transparent", border: "none", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12 }}>{pMeta.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: HF, color: pMeta.color }}>{pMeta.label}</span>
              {task.dueDate && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontFamily: HF, color: isOverdue ? "#f0625a" : TEXT.lo }}>
                  <Calendar style={{ width: 9, height: 9 }} />
                  до {fmtShortDate(task.dueDate)}
                </span>
              )}
              {task.returnComment && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: "rgba(240,98,90,0.14)", color: "#f0625a", border: "1px solid rgba(240,98,90,0.30)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  возврат
                </span>
              )}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT.hi, fontFamily: HF, lineHeight: 1.3, paddingRight: 4 }}>
              {task.title}
            </div>
            {task.body && !expanded && (
              <div style={{ fontSize: 12, color: TEXT.lo, fontFamily: HF, marginTop: 4, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                {task.body}
              </div>
            )}
          </div>
          <div style={{ flexShrink: 0, paddingTop: 2 }}>
            {expanded
              ? <ChevronUp  style={{ width: 15, height: 15, color: TEXT.dim }} />
              : <ChevronDown style={{ width: 15, height: 15, color: TEXT.dim }} />
            }
          </div>
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${DIVIDER}`, padding: "16px 16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Body */}
          {task.body && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT.dim, fontFamily: HF, marginBottom: 5 }}>Суть задачи</div>
              <p style={{ fontSize: 13, color: TEXT.mid, lineHeight: 1.65, fontFamily: HF, margin: 0 }}>{task.body}</p>
            </div>
          )}

          {/* Return comment */}
          {task.returnComment && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(240,98,90,0.07)", border: "1px solid rgba(240,98,90,0.22)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f0625a", fontFamily: HF, marginBottom: 4 }}>Причина возврата</div>
              <p style={{ fontSize: 12, color: "rgba(240,98,90,0.80)", fontFamily: HF, margin: 0, lineHeight: 1.5 }}>{task.returnComment}</p>
            </div>
          )}

          {/* ResultNote (review/done) */}
          {task.resultNote && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(62,217,160,0.06)", border: "1px solid rgba(62,217,160,0.18)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#3ed9a0", fontFamily: HF, marginBottom: 4 }}>Что сделано</div>
              <p style={{ fontSize: 12, color: TEXT.mid, fontFamily: HF, margin: 0, lineHeight: 1.5 }}>{task.resultNote}</p>
            </div>
          )}

          {/* Meta: watchers + created by */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {task.createdBy && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: TEXT.lo, fontFamily: HF }}>
                <span style={{ color: TEXT.dim }}>Поставил:</span>
                <span style={{ fontWeight: 600, color: TEXT.mid }}>{task.createdBy}</span>
              </div>
            )}
            {task.watchers.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: TEXT.lo, fontFamily: HF }}>
                <Users style={{ width: 10, height: 10 }} />
                {task.watchers.map(w => w.role).join(", ")}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT.dim, fontFamily: HF, marginBottom: 8 }}>Хроника</div>
            <Timeline taskId={task.id} />
          </div>

          {/* ── Action zone ── */}

          {/* sent → start */}
          {task.status === "sent" && (
            <button
              onClick={() => startTask({ params: { id: task.id } })}
              disabled={busy}
              style={{
                width: "100%", minHeight: 44, borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                background: "linear-gradient(135deg, #5b8bd0 0%, #3a68b0 100%)",
                border: "none", color: "#fff", fontFamily: HF, fontSize: 14, fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(91,139,208,0.28)",
                opacity: isStarting ? 0.6 : 1, transition: "opacity 150ms",
              }}
            >
              {isStarting ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> : <CheckCircle2 style={{ width: 15, height: 15 }} />}
              Принять в работу
            </button>
          )}

          {/* returned → re-start */}
          {task.status === "returned" && (
            <button
              onClick={() => startTask({ params: { id: task.id } })}
              disabled={busy}
              style={{
                width: "100%", minHeight: 44, borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                background: "rgba(240,98,90,0.12)", border: "1px solid rgba(240,98,90,0.35)",
                color: "#f0625a", fontFamily: HF, fontSize: 14, fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
                opacity: isStarting ? 0.6 : 1, transition: "opacity 150ms",
              }}
            >
              {isStarting ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> : <RotateCcw style={{ width: 14, height: 14 }} />}
              Взять в работу снова
            </button>
          )}

          {/* in_progress → submit */}
          {task.status === "in_progress" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {submitOpen && (
                <div>
                  <textarea
                    value={resultNote}
                    onChange={e => { setResultNote(e.target.value); setNoteError(""); }}
                    rows={3}
                    placeholder="Что сделано, какой результат…"
                    autoFocus
                    style={{
                      width: "100%", resize: "none", borderRadius: 10, padding: "9px 12px",
                      fontSize: 12, fontFamily: HF, background: "rgba(255,255,255,0.04)",
                      border: noteError ? "1px solid rgba(240,98,90,0.5)" : `1px solid rgba(0,212,255,0.28)`,
                      color: TEXT.hi, outline: "none", caretColor: "#00d4ff", lineHeight: 1.55,
                    }}
                  />
                  {noteError && <p style={{ fontSize: 11, color: "#f0625a", fontFamily: HF, marginTop: 3 }}>{noteError}</p>}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                {submitOpen && (
                  <button
                    onClick={() => { setSubmitOpen(false); setResultNote(""); setNoteError(""); }}
                    disabled={busy}
                    style={{
                      flex: 1, minHeight: 42, borderRadius: 10, cursor: "pointer",
                      background: "rgba(255,255,255,0.04)", border: `1px solid ${DIVIDER}`,
                      color: TEXT.lo, fontFamily: HF, fontSize: 12, fontWeight: 600,
                    }}
                  >
                    Отмена
                  </button>
                )}
                <button
                  onClick={() => {
                    if (!submitOpen) { setSubmitOpen(true); return; }
                    submitTask({ params: { id: task.id }, data: { resultNote: resultNote.trim() || undefined } });
                  }}
                  disabled={busy}
                  style={{
                    flex: submitOpen ? 2 : 1, minHeight: 42, borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: submitOpen
                      ? "linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)"
                      : "rgba(0,212,255,0.10)",
                    border: submitOpen ? "none" : "1px solid rgba(0,212,255,0.30)",
                    color: submitOpen ? "#fff" : "#00d4ff",
                    fontFamily: HF, fontSize: 13, fontWeight: 700,
                    cursor: busy ? "not-allowed" : "pointer",
                    boxShadow: submitOpen ? "0 4px 14px rgba(0,212,255,0.25)" : "none",
                    opacity: isSubmitting ? 0.6 : 1, transition: "all 150ms",
                  }}
                >
                  {isSubmitting
                    ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                    : <Send style={{ width: 13, height: 13 }} />
                  }
                  {submitOpen ? "Подтвердить сдачу" : "Сдать на приёмку"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Section header ─────────────────────────────────────────────────────── */
function SectionHeader({ icon, label, count, color }: { icon: string; label: string; count: number; color: string }) {
  if (count === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: HF, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: `${color}25`, borderRadius: 1 }} />
      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: HF, color, background: `${color}18`, border: `1px solid ${color}35`, borderRadius: 8, padding: "1px 7px" }}>
        {count}
      </span>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function MyTasksPage() {
  const { personId, switchRole } = useAuthContext();
  const qc = useQueryClient();

  const { data: allPeople = [] } = useListPeople();
  const person = allPeople.find(p => p.id === personId);

  const { data: tasks = [], isLoading } = useListTasks(
    personId != null ? { assigneeId: personId } : {},
  );

  const { data: feedItems = [] } = useGetFeed({ role: "employee" });
  const { mutate: markSeen } = useMarkFeedSeen();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dismissedFeed, setDismissedFeed] = useState<Set<number>>(() => new Set());

  const inboxItems = feedItems.filter(
    f => (f.type === "task_new" || f.type === "task_returned") && !dismissedFeed.has(f.id),
  );

  const handleDismissFeed = useCallback((id: number) => {
    markSeen({ params: { id } });
    setDismissedFeed(prev => new Set(prev).add(id));
  }, [markSeen]);

  const handleRefresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["listTasks"] });
  }, [qc]);

  function toggleExpand(id: number) {
    setExpandedId(prev => prev === id ? null : id);
  }

  /* Group by status */
  const toAccept   = tasks.filter(t => t.status === "sent");
  const inProgress = tasks.filter(t => t.status === "in_progress");
  const returned   = tasks.filter(t => t.status === "returned");
  const inReview   = tasks.filter(t => t.status === "review");
  const done       = tasks.filter(t => t.status === "done");

  const totalActive = toAccept.length + inProgress.length + returned.length;

  return (
    <div
      style={{
        position: "fixed", inset: 0, overflowY: "auto",
        background: "#0b0b12", fontFamily: HF,
      }}
    >
      {/* ── Top bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(11,11,18,0.92)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={switchRole}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: "rgba(228,232,255,0.40)", cursor: "pointer",
            }}
          >
            <ArrowLeft style={{ width: 15, height: 15 }} />
          </button>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(228,232,255,0.88)", lineHeight: 1.2 }}>
              Мои задачи
            </div>
            {person && (
              <div style={{ fontSize: 11, color: "rgba(228,232,255,0.35)", marginTop: 1 }}>{person.role}</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Active tasks badge */}
          {totalActive > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 999,
              background: "rgba(91,139,208,0.12)",
              border: "1px solid rgba(91,139,208,0.30)",
            }}>
              <ClipboardList style={{ width: 12, height: 12, color: ACCENT }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT }}>{totalActive} активных</span>
            </div>
          )}
          {/* Inbox badge */}
          {inboxItems.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: "50%",
              background: "rgba(0,212,255,0.15)",
              border: "1px solid rgba(0,212,255,0.35)",
            }}>
              <Bell style={{ width: 11, height: 11, color: "#00d4ff" }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 40px" }}>

        {/* ── Employee inbox strip ── */}
        {inboxItems.length > 0 && (
          <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "rgba(0,212,255,0.55)", marginBottom: 2 }}>
              Инбокс
            </div>
            {inboxItems.map(item => (
              <div
                key={item.id}
                className="glass"
                style={{
                  borderRadius: 12, padding: "10px 14px",
                  display: "flex", alignItems: "flex-start", gap: 10,
                  borderLeft: `3px solid ${item.type === "task_returned" ? "#f0625a" : "#00d4ff"}`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(228,232,255,0.85)", fontFamily: HF, lineHeight: 1.25 }}>
                    {item.type === "task_returned" ? "↩ Возвращена: " : "📩 Новая задача: "}
                    <span style={{ fontWeight: 600, color: "rgba(228,232,255,0.65)" }}>{item.body.split(" — ")[0]}</span>
                  </div>
                  {item.body.includes(" — ") && (
                    <div style={{ fontSize: 11, color: "rgba(228,232,255,0.40)", marginTop: 2, fontFamily: HF }}>
                      {item.body.split(" — ").slice(1).join(" — ")}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "rgba(228,232,255,0.25)", marginTop: 3, fontFamily: HF }}>{timeAgo(item.createdAt)} назад</div>
                </div>
                <button
                  onClick={() => handleDismissFeed(item.id)}
                  style={{ flexShrink: 0, background: "none", border: "none", padding: 4, cursor: "pointer", color: "rgba(228,232,255,0.25)", display: "flex", alignItems: "center" }}
                >
                  <X style={{ width: 13, height: 13 }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 10, color: "rgba(228,232,255,0.30)", fontSize: 13 }}>
            <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite", color: ACCENT }} />
            Загрузка задач…
          </div>
        )}

        {/* ── No tasks ── */}
        {!isLoading && tasks.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 0" }}>
            <ClipboardList style={{ width: 36, height: 36, color: "rgba(228,232,255,0.12)" }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(228,232,255,0.30)", fontFamily: HF }}>Задач нет</div>
            <div style={{ fontSize: 12, color: "rgba(228,232,255,0.18)", fontFamily: HF }}>Ждём от заказчика</div>
          </div>
        )}

        {/* ── Sections ── */}
        {[
          { key: "sent",        items: toAccept },
          { key: "in_progress", items: inProgress },
          { key: "returned",    items: returned },
          { key: "review",      items: inReview },
          { key: "done",        items: done },
        ].map(({ key, items }) => {
          const meta = STATUS_META[key]!;
          if (items.length === 0) return null;
          return (
            <div key={key} style={{ marginBottom: 22 }}>
              <SectionHeader icon={meta.icon} label={meta.label} count={items.length} color={meta.color} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task as Task}
                    expanded={expandedId === task.id}
                    onToggle={() => toggleExpand(task.id)}
                    onRefresh={handleRefresh}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
