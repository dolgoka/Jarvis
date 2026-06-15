import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/layout/Shell";
import {
  useListTasks, useListPeople, useCreateTask, useDraftTask,
  useAcceptTask, useReturnTask, useGetTaskActivity,
} from "@workspace/api-client-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { LiquidFilters } from "@/components/liquid/LiquidFilters";
import {
  Loader2, Plus, Mic, MicOff, Send, X, ClipboardList,
  ChevronDown, ChevronUp, Check, CheckCircle2, RotateCcw,
  AlertTriangle, Calendar, User, Users, Flag, Clock,
} from "lucide-react";

const HF = "'Hanken Grotesk', system-ui, sans-serif";
const ACCENT = "#5b8bd0";

// ── Types ─────────────────────────────────────────────────────────────────────
type Person = { id: number; name: string; role: string; email?: string | null };
type Task = {
  id: number;
  title: string;
  body: string;
  assigneeId: number;
  assigneeName: string;
  assigneeRole: string;
  watchers: Person[];
  priority: "high" | "medium" | "low";
  dueDate?: string | null;
  status: string;
  resultNote?: string | null;
  returnComment?: string | null;
  createdAt: string;
  lastActivityAt: string;
};
type TaskDraft = {
  title: string; body: string;
  assigneeId: number; assigneeName: string; assigneeRole: string;
  watchers: Person[]; linkedPeople?: Person[];
  priority: "high" | "medium" | "low";
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function staleInfo(lastActivityAt: string) {
  const diffMs = Date.now() - new Date(lastActivityAt).getTime();
  const hours = diffMs / 3_600_000;
  const days = Math.floor(hours / 24);
  return { isStale: hours > 24, days };
}

const PRIORITY_META: Record<string, { icon: string; color: string; label: string }> = {
  high:   { icon: "🔴", color: "#f0625a", label: "Срочно" },
  medium: { icon: "🟡", color: "#f0b54a", label: "Средний" },
  low:    { icon: "🟢", color: "#3ed9a0", label: "Низкий" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}
function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

const STATUS_COLORS = { review: "#f0b54a", done: "#3ed9a0", returned: "#f0625a", active: ACCENT };
const DIVIDER = "rgba(255,255,255,0.07)";
const TEXT = {
  hi: "rgba(228,232,255,0.92)",
  mid: "rgba(228,232,255,0.60)",
  lo: "rgba(228,232,255,0.40)",
  dim: "rgba(228,232,255,0.25)",
};

// ── Activity timeline helpers ─────────────────────────────────────────────────
const ACTIVITY_META: Record<string, { label: string; dot: string; icon: string }> = {
  created:       { label: "Поставлена",      dot: "#5b8bd0", icon: "📋" },
  accepted:      { label: "Принята в работу", dot: "#3ed9a0", icon: "✅" },
  submitted:     { label: "Сдана на приёмку", dot: "#f0b54a", icon: "📤" },
  accepted_final:{ label: "Принята",          dot: "#3ed9a0", icon: "🏆" },
  returned:      { label: "Возвращена",       dot: "#f0625a", icon: "↩️" },
  decomposed:    { label: "Разбита на части", dot: "#a78bfa", icon: "🔀" },
  commented:     { label: "Комментарий",      dot: "#5b8bd0", icon: "💬" },
  escalated:     { label: "Эскалация",        dot: "#f0625a", icon: "🚨" },
  pinged:        { label: "Напоминание",      dot: "#f0b54a", icon: "🔔" },
};

function ActivityTimeline({ taskId }: { taskId: number }) {
  const { data: activity, isLoading } = useGetTaskActivity({ id: taskId });

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", color: "rgba(228,232,255,0.30)", fontSize: 11, fontFamily: HF }}>
        <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
        Загрузка хроники…
      </div>
    );
  }

  if (!activity || activity.length === 0) {
    return (
      <div style={{ fontSize: 11, color: "rgba(228,232,255,0.28)", fontFamily: HF, fontStyle: "italic" }}>
        Хроника пуста
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {activity.map((entry, idx) => {
        const meta = ACTIVITY_META[entry.type] ?? { label: entry.type, dot: ACCENT, icon: "•" };
        const isLast = idx === activity.length - 1;
        const date = new Date(entry.at);
        const timeStr = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
          + " " + date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

        return (
          <div key={entry.id} style={{ display: "flex", gap: 12, position: "relative" }}>
            {/* Dot + vertical line */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 20 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%", flexShrink: 0, marginTop: 3,
                background: meta.dot,
                boxShadow: isLast ? `0 0 7px 2px ${meta.dot}55` : "none",
                border: `2px solid ${meta.dot}55`,
              }} />
              {!isLast && (
                <div style={{ width: 1.5, flex: 1, minHeight: 16, background: "rgba(255,255,255,0.08)", marginTop: 2 }} />
              )}
            </div>

            {/* Content */}
            <div style={{ paddingBottom: isLast ? 0 : 14, minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(228,232,255,0.80)", fontFamily: HF }}>
                  {meta.icon} {meta.label}
                </span>
                <span style={{ fontSize: 10, color: "rgba(228,232,255,0.35)", fontFamily: HF, fontVariantNumeric: "tabular-nums" }}>
                  {timeStr}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(228,232,255,0.45)", fontFamily: HF, marginTop: 1 }}>
                {entry.actorRole}
              </div>
              {entry.text && (
                <div style={{
                  marginTop: 6, padding: "7px 10px", borderRadius: 8,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  fontSize: 11, color: "rgba(228,232,255,0.55)", fontFamily: HF, lineHeight: 1.5,
                }}>
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

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-xs";
  return (
    <div className={`${sz} rounded-full flex-shrink-0 flex items-center justify-center font-semibold`}
      style={{ fontFamily: HF, background: `${ACCENT}20`, border: `1.5px solid ${ACCENT}45`, color: ACCENT }}>
      {initials(name)}
    </div>
  );
}

// ── Review card (expandable) ──────────────────────────────────────────────────
function ReviewCard({
  task, expanded, onToggle, onDone,
}: {
  task: Task;
  expanded: boolean;
  onToggle: () => void;
  onDone: () => void;
}) {
  const [returning, setReturning] = useState(false);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");

  const { mutate: accept, isPending: isAccepting } = useAcceptTask({
    mutation: {
      onSuccess: () => {
        toast.success("Задача принята", { description: task.title, duration: 3500 });
        onDone();
      },
      onError: () => toast.error("Не удалось принять задачу"),
    },
  });
  const { mutate: returnTask, isPending: isReturning } = useReturnTask({
    mutation: {
      onSuccess: () => {
        toast.success("Задача возвращена исполнителю", { description: task.title, duration: 3500 });
        onDone();
      },
      onError: () => toast.error("Не удалось вернуть задачу"),
    },
  });

  const { isStale, days } = staleInfo(task.lastActivityAt);
  const pMeta = PRIORITY_META[task.priority] ?? PRIORITY_META.medium!;
  const busy = isAccepting || isReturning;

  function handleAccept() {
    accept({ params: { id: task.id } });
  }
  function handleReturn() {
    if (!returning) { setReturning(true); return; }
    if (!comment.trim()) { setCommentError("Укажите причину возврата"); return; }
    setCommentError("");
    returnTask({ params: { id: task.id }, data: { comment: comment.trim() } });
  }

  return (
    <div className="glass overflow-hidden" style={{ borderRadius: 16 }}>
      {/* ── Collapsed summary ── */}
      <button
        className="w-full text-left"
        onClick={onToggle}
        style={{ display: "block", padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Priority + stale badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 7 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                fontFamily: HF, background: `${pMeta.color}18`,
                color: pMeta.color, border: `1px solid ${pMeta.color}38`,
              }}>
                {pMeta.icon} {pMeta.label}
              </span>
              {isStale && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  fontFamily: HF, background: "rgba(240,98,90,0.12)",
                  color: "#f0625a", border: "1px solid rgba(240,98,90,0.30)",
                }}>
                  <AlertTriangle style={{ width: 11, height: 11 }} />
                  Зависла · {days}д
                </span>
              )}
              {task.dueDate && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  fontFamily: HF, background: "rgba(255,255,255,0.05)",
                  color: TEXT.lo, border: `1px solid ${DIVIDER}`,
                }}>
                  <Calendar style={{ width: 11, height: 11 }} />
                  до {fmtShortDate(task.dueDate)}
                </span>
              )}
            </div>
            {/* Title */}
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT.hi, fontFamily: HF, lineHeight: 1.35 }}>
              {task.title}
            </div>
            {/* Assignee */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7, color: TEXT.lo, fontSize: 12, fontFamily: HF }}>
              <User style={{ width: 12, height: 12, flexShrink: 0 }} />
              {task.assigneeRole}
              {task.watchers.length > 0 && (
                <span style={{ color: TEXT.dim }}>
                  · {task.watchers.map(w => w.role).join(", ")}
                </span>
              )}
            </div>
          </div>
          <div style={{ flexShrink: 0, paddingTop: 2 }}>
            {expanded
              ? <ChevronUp style={{ width: 16, height: 16, color: TEXT.dim }} />
              : <ChevronDown style={{ width: 16, height: 16, color: TEXT.dim }} />
            }
          </div>
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${DIVIDER}`, padding: "18px 18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Body */}
          {task.body && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT.dim, fontFamily: HF, marginBottom: 6 }}>
                Суть задачи
              </div>
              <p style={{ fontSize: 13, color: TEXT.mid, lineHeight: 1.65, fontFamily: HF }}>{task.body}</p>
            </div>
          )}

          {/* Assignee + watchers */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar name={task.assigneeName} size="sm" />
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT.dim, fontFamily: HF }}>Исполнитель</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: TEXT.hi, fontFamily: HF }}>{task.assigneeRole}</div>
              </div>
            </div>
            {task.watchers.map(w => (
              <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar name={w.name} size="sm" />
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT.dim, fontFamily: HF }}>Соисполнитель</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT.mid, fontFamily: HF }}>{w.role}</div>
                </div>
              </div>
            ))}
          </div>

          {/* What was done (resultNote) */}
          {task.resultNote ? (
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(62,217,160,0.06)", border: "1px solid rgba(62,217,160,0.16)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#3ed9a0", fontFamily: HF, marginBottom: 6 }}>
                Что сделано
              </div>
              <p style={{ fontSize: 13, color: TEXT.mid, lineHeight: 1.65, fontFamily: HF }}>{task.resultNote}</p>
            </div>
          ) : (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${DIVIDER}` }}>
              <div style={{ fontSize: 12, color: TEXT.dim, fontFamily: HF, fontStyle: "italic" }}>Исполнитель не оставил отчёт о выполнении</div>
            </div>
          )}

          {/* Activity timeline */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT.dim, fontFamily: HF, marginBottom: 10 }}>
              Хроника пути задачи
            </div>
            <ActivityTimeline taskId={task.id} />
            {isStale && (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#f0625a", fontFamily: HF }}>
                <AlertTriangle style={{ width: 12, height: 12 }} />
                Ждёт вашего решения {days} {days === 1 ? "день" : days < 5 ? "дня" : "дней"}
              </div>
            )}
          </div>

          {/* Return comment textarea */}
          {returning && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT.dim, fontFamily: HF }}>
                Причина возврата
              </label>
              <textarea
                value={comment}
                onChange={e => { setComment(e.target.value); setCommentError(""); }}
                rows={3}
                placeholder="Укажите, что нужно доработать…"
                style={{
                  width: "100%", resize: "none", borderRadius: 10,
                  padding: "10px 14px", fontSize: 13, fontFamily: HF,
                  background: "rgba(255,255,255,0.04)",
                  border: commentError ? "1px solid rgba(240,98,90,0.5)" : "1px solid rgba(255,255,255,0.09)",
                  color: TEXT.hi, outline: "none",
                  caretColor: ACCENT,
                }}
                onFocus={e => { e.currentTarget.style.border = `1px solid ${ACCENT}60`; }}
                onBlur={e => { e.currentTarget.style.border = commentError ? "1px solid rgba(240,98,90,0.5)" : "1px solid rgba(255,255,255,0.09)"; }}
                disabled={busy}
                autoFocus
              />
              {commentError && (
                <p style={{ fontSize: 11, color: "#f0625a", fontFamily: HF }}>{commentError}</p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            {returning && (
              <button
                onClick={() => { setReturning(false); setComment(""); setCommentError(""); }}
                disabled={busy}
                style={{
                  flex: 1, minHeight: 42, borderRadius: 10,
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${DIVIDER}`,
                  color: TEXT.lo, fontFamily: HF, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", transition: "background 150ms",
                }}
              >
                Отмена
              </button>
            )}
            <button
              onClick={handleReturn}
              disabled={busy}
              style={{
                flex: returning ? 2 : 1, minHeight: 42, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: returning ? "rgba(240,98,90,0.14)" : "rgba(255,255,255,0.05)",
                border: returning ? "1px solid rgba(240,98,90,0.40)" : `1px solid ${DIVIDER}`,
                color: returning ? "#f0625a" : TEXT.lo,
                fontFamily: HF, fontSize: 12, fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer", transition: "all 150ms",
                opacity: busy && isReturning ? 0.6 : 1,
              }}
            >
              {isReturning
                ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                : <RotateCcw style={{ width: 14, height: 14 }} />
              }
              {returning ? "Подтвердить возврат" : "Вернуть"}
            </button>
            {!returning && (
              <button
                onClick={handleAccept}
                disabled={busy}
                style={{
                  flex: 2, minHeight: 42, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  background: "linear-gradient(135deg, #3ed9a0 0%, #2ab87f 100%)",
                  border: "none", color: "#06111f",
                  fontFamily: HF, fontSize: 13, fontWeight: 700,
                  cursor: busy ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(62,217,160,0.28)",
                  opacity: isAccepting ? 0.6 : 1, transition: "opacity 150ms",
                }}
              >
                {isAccepting
                  ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                  : <CheckCircle2 style={{ width: 15, height: 15 }} />
                }
                Принять
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Plain task card (non-review) ──────────────────────────────────────────────
function TaskCard({ task }: { task: Task }) {
  const pMeta = PRIORITY_META[task.priority] ?? PRIORITY_META.medium!;
  const statusColor =
    task.status === "done" ? STATUS_COLORS.done
    : task.status === "returned" ? STATUS_COLORS.returned
    : ACCENT;
  const statusLabel =
    task.status === "done" ? "Принята"
    : task.status === "returned" ? "Возвращена"
    : task.status === "in_progress" ? "В работе"
    : task.status === "sent" ? "Отправлена"
    : task.status;

  return (
    <div className="glass p-4 space-y-2.5">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <h3 style={{ fontFamily: HF, color: TEXT.hi, fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{task.title}</h3>
        <span style={{
          flexShrink: 0, padding: "2px 9px", borderRadius: 999,
          fontSize: 11, fontWeight: 700, fontFamily: HF,
          background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}38`,
          whiteSpace: "nowrap",
        }}>{statusLabel}</span>
      </div>
      {task.body && (
        <p style={{ fontFamily: HF, color: TEXT.lo, fontSize: 12, lineHeight: 1.55 }} className="line-clamp-2">{task.body}</p>
      )}
      {task.returnComment && (
        <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(240,98,90,0.07)", border: "1px solid rgba(240,98,90,0.20)", fontSize: 12, color: "#f0625a", fontFamily: HF }}>
          ↩ {task.returnComment}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar name={task.assigneeName} size="sm" />
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: TEXT.mid, fontFamily: HF }}>{task.assigneeRole}</div>
            <div style={{ fontSize: 10, color: TEXT.dim, fontFamily: HF }}>{fmtDate(task.createdAt)}</div>
          </div>
        </div>
        <span style={{ fontSize: 11, fontFamily: HF }}>{pMeta.icon}</span>
      </div>
    </div>
  );
}

// ── Assignee selector ─────────────────────────────────────────────────────────
function AssigneeSelect({ value, onChange, people }: { value: number; onChange: (id: number) => void; people: Person[] }) {
  const [open, setOpen] = useState(false);
  const selected = people.find(p => p.id === value);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-xl px-4 py-3 transition-all"
        style={{ fontFamily: HF, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: TEXT.hi }}
        onFocus={e => { e.currentTarget.style.border = `1px solid ${ACCENT}60`; e.currentTarget.style.boxShadow = `0 0 0 3px ${ACCENT}18`; }}
        onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
      >
        <div className="flex items-center gap-2">
          {selected && <Avatar name={selected.name} size="sm" />}
          <div className="text-left">
            <div className="text-sm font-medium" style={{ fontFamily: HF, color: TEXT.hi }}>{selected?.name ?? "Выбрать..."}</div>
            {selected && <div className="text-[10px]" style={{ fontFamily: HF, color: TEXT.dim }}>{selected.role}</div>}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: TEXT.dim }} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-xl overflow-hidden"
          style={{ background: "#08080c", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
          {people.map(p => (
            <button key={p.id} type="button" onClick={() => { onChange(p.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors"
              style={{ fontFamily: HF }}
              onMouseEnter={e => { e.currentTarget.style.background = `${ACCENT}18`; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <Avatar name={p.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: TEXT.hi }}>{p.name}</div>
                <div className="text-[10px]" style={{ color: TEXT.dim }}>{p.role}</div>
              </div>
              {p.id === value && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ACCENT }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Composer ──────────────────────────────────────────────────────────────────
type ComposerState = "idle" | "input" | "draft" | "saving";

const fieldStyle = (error = false): React.CSSProperties => ({
  fontFamily: HF,
  background: "rgba(255,255,255,0.04)",
  border: error ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.08)",
  color: TEXT.hi,
  caretColor: ACCENT,
  outline: "none",
  transition: "border 0.2s, box-shadow 0.2s",
});

function TaskComposer({ people, onClose, onCreated }: { people: Person[]; onClose: () => void; onCreated: () => void }) {
  const [state, setState] = useState<ComposerState>("input");
  const [rawText, setRawText] = useState("");
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftAssigneeId, setDraftAssigneeId] = useState(0);
  const [error, setError] = useState("");

  const { mutateAsync: getDraft, isPending: isDrafting } = useDraftTask();
  const { mutateAsync: createTask, isPending: isSaving } = useCreateTask();

  const voice = useVoiceRecorder({
    onTranscript: (text) => setRawText(prev => prev ? prev + " " + text : text),
    onError: (e) => setError(e),
  });

  async function handleDraft() {
    if (!rawText.trim()) { setError("Введите текст задачи"); return; }
    setError("");
    try {
      const d = await getDraft({ data: { text: rawText } });
      const typed = d as unknown as TaskDraft;
      setDraft(typed);
      setDraftTitle(typed.title);
      setDraftDesc(typed.body);
      setDraftAssigneeId(typed.assigneeId);
      setState("draft");
    } catch {
      setError("Не удалось оформить черновик. Попробуйте ещё раз.");
    }
  }

  async function handleSend() {
    if (!draftTitle.trim() || !draftAssigneeId) return;
    setState("saving");
    setError("");
    try {
      const watcherIds = (draft?.watchers ?? []).map(w => w.id);
      const result = await createTask({ data: { title: draftTitle, body: draftDesc, assigneeId: draftAssigneeId, watchers: watcherIds } });
      toast.success(`Отправлено → ${result.assigneeRole}`, { description: result.title, duration: 4000 });
      onCreated();
      onClose();
    } catch (err) {
      toast.error("Не удалось отправить задачу", { description: err instanceof Error ? err.message : String(err) });
      setError("Ошибка сохранения");
      setState("draft");
    }
  }

  const busy = isDrafting || isSaving || voice.isTranscribing;

  function onFocusField(e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) {
    e.currentTarget.style.border = `1px solid ${ACCENT}60`;
    e.currentTarget.style.boxShadow = `0 0 0 3px ${ACCENT}18`;
  }
  function onBlurField(e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) {
    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
    e.currentTarget.style.boxShadow = "none";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass relative w-full md:max-w-xl md:mx-6 rounded-t-3xl md:rounded-[22px] overflow-hidden" style={{ maxHeight: "90dvh", overflowY: "auto" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-4 h-4" style={{ color: ACCENT }} />
            <span className="text-sm font-semibold" style={{ fontFamily: HF, color: TEXT.hi }}>
              {state === "draft" ? "Черновик — проверьте" : "Новая задача"}
            </span>
          </div>
          <button onClick={onClose} style={{ color: TEXT.dim }} onMouseEnter={e => { e.currentTarget.style.color = TEXT.mid; }} onMouseLeave={e => { e.currentTarget.style.color = TEXT.dim; }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {state === "input" && (
            <>
              <div className="relative">
                <textarea className="w-full rounded-xl px-4 py-3 text-sm resize-none" style={{ ...fieldStyle(), minHeight: 100 }} rows={4}
                  placeholder="Надиктуйте или напишите задачу в свободной форме…"
                  value={rawText} onChange={e => setRawText(e.target.value)} disabled={busy} onFocus={onFocusField} onBlur={onBlurField} />
                {voice.isTranscribing && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px]" style={{ fontFamily: HF, color: `${ACCENT}b0` }}>
                    <Loader2 className="w-3 h-3 animate-spin" /> транскрипция…
                  </div>
                )}
              </div>
              {error && <p className="text-xs" style={{ fontFamily: HF, color: "rgba(239,68,68,0.85)" }}>{error}</p>}
              <div className="flex items-center gap-3">
                <button type="button" onClick={voice.toggle} disabled={voice.isTranscribing || isDrafting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={{ fontFamily: HF, background: voice.isRecording ? "rgba(240,98,90,0.12)" : "rgba(255,255,255,0.04)", border: voice.isRecording ? "1px solid rgba(240,98,90,0.45)" : "1px solid rgba(255,255,255,0.10)", color: voice.isRecording ? "#f0625a" : TEXT.lo }}>
                  {voice.isRecording ? <><MicOff className="w-3.5 h-3.5" /> {voice.recordSeconds}с</> : <><Mic className="w-3.5 h-3.5" /> Диктовать</>}
                </button>
                <button type="button" onClick={handleDraft} disabled={busy || !rawText.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ fontFamily: HF, background: `linear-gradient(135deg, ${ACCENT} 0%, #3d6aad 100%)`, color: "#fff", border: "none", boxShadow: `0 4px 16px ${ACCENT}50` }}>
                  {isDrafting ? <><Loader2 className="w-4 h-4 animate-spin" /> Оформляю…</> : "Оформить →"}
                </button>
              </div>
            </>
          )}
          {state === "draft" && draft && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ fontFamily: HF, color: TEXT.lo }}>Заголовок</label>
                <input type="text" value={draftTitle} onChange={e => setDraftTitle(e.target.value)} className="w-full rounded-xl px-4 py-2.5 text-sm" style={fieldStyle()} onFocus={onFocusField} onBlur={onBlurField} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ fontFamily: HF, color: TEXT.lo }}>Описание</label>
                <textarea value={draftDesc} onChange={e => setDraftDesc(e.target.value)} rows={3} className="w-full rounded-xl px-4 py-2.5 text-sm resize-none" style={fieldStyle()} onFocus={onFocusField} onBlur={onBlurField} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ fontFamily: HF, color: TEXT.lo }}>Исполнитель</label>
                <AssigneeSelect value={draftAssigneeId} onChange={setDraftAssigneeId} people={people} />
              </div>
              {draft.linkedPeople && draft.linkedPeople.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ fontFamily: HF, color: TEXT.lo }}>Доп. участники</label>
                  <div className="flex flex-wrap gap-2">
                    {draft.linkedPeople.map(p => (
                      <div key={p.id} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}30` }}>
                        <Avatar name={p.name} size="sm" />
                        <span className="text-xs" style={{ fontFamily: HF, color: TEXT.mid }}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {error && <p className="text-xs" style={{ fontFamily: HF, color: "rgba(239,68,68,0.85)" }}>{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setState("input"); setError(""); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={{ fontFamily: HF, color: TEXT.lo, background: "rgba(255,255,255,0.03)", border: `1px solid ${DIVIDER}` }}
                  onMouseEnter={e => { e.currentTarget.style.color = TEXT.mid; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.14)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = TEXT.lo; e.currentTarget.style.border = `1px solid ${DIVIDER}`; }}>
                  ← Изменить текст
                </button>
                <button type="button" onClick={handleSend} disabled={isSaving || !draftTitle.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ fontFamily: HF, background: `linear-gradient(135deg, ${ACCENT} 0%, #3d6aad 100%)`, color: "#fff", border: "none", boxShadow: `0 4px 16px ${ACCENT}50` }}>
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Сохраняю…</> : <><Send className="w-4 h-4" /> Отправить</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ color, pulse, label, count, hint }: {
  color: string; pulse?: boolean; label: string; count: number; hint?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pulse ? "beacon-red" : ""}`} style={{ background: color }} />
      <span className="text-xs font-semibold" style={{ fontFamily: HF, color: `${color}bb` }}>{label}</span>
      <span className="text-xs font-semibold" style={{ fontFamily: HF, color: `${color}55` }}>· {count}</span>
      {hint && <span className="text-[10px]" style={{ fontFamily: HF, color: "rgba(228,232,255,0.22)" }}>{hint}</span>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: tasks, isLoading, refetch } = useListTasks();
  const { data: people } = useListPeople();

  const typedTasks = (tasks ?? []) as unknown as Task[];
  const typedPeople = (people ?? []) as Person[];

  const review   = typedTasks.filter(t => t.status === "review");
  const active   = typedTasks.filter(t => t.status === "sent" || t.status === "in_progress");
  const returned = typedTasks.filter(t => t.status === "returned");
  const done     = typedTasks.filter(t => t.status === "done");

  const staleCount = review.filter(t => staleInfo(t.lastActivityAt).isStale).length;

  return (
    <Shell>
      <LiquidFilters />
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: HF, color: TEXT.hi }}>Задачи</h1>
            <p className="text-xs mt-1" style={{ fontFamily: HF, color: TEXT.dim }}>
              {typedTasks.length} задач · {staleCount > 0 ? `${staleCount} зависли на приёмке` : review.length > 0 ? `${review.length} на приёмке` : "нет задач на приёмке"}
            </p>
          </div>
          <button onClick={() => setComposerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0"
            style={{ fontFamily: HF, background: `linear-gradient(135deg, ${ACCENT} 0%, #3d6aad 100%)`, color: "#fff", border: "none", boxShadow: `0 4px 16px ${ACCENT}55` }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 6px 24px ${ACCENT}80`; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 4px 16px ${ACCENT}55`; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <Plus className="w-4 h-4" /> Новая задача
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT }} />
          </div>
        )}

        {!isLoading && typedTasks.length === 0 && (
          <div className="glass p-10 text-center space-y-3">
            <ClipboardList className="w-8 h-8 mx-auto" style={{ color: TEXT.dim }} />
            <p className="text-sm" style={{ fontFamily: HF, color: TEXT.dim }}>Задач пока нет</p>
            <button onClick={() => setComposerOpen(true)} className="text-xs font-medium underline underline-offset-2 transition-colors"
              style={{ fontFamily: HF, color: ACCENT }}
              onMouseEnter={e => { e.currentTarget.style.color = "#7aaae8"; }} onMouseLeave={e => { e.currentTarget.style.color = ACCENT; }}>
              Создать первую
            </button>
          </div>
        )}

        {/* На приёмке */}
        {review.length > 0 && (
          <section className="space-y-2">
            <SectionHeader
              color={STATUS_COLORS.review}
              label="На приёмке"
              count={review.length}
              hint={staleCount > 0 ? `· ${staleCount} зависли` : undefined}
            />
            <p style={{ fontSize: 11, fontFamily: HF, color: TEXT.dim, marginBottom: 4, paddingLeft: 18 }}>
              Нажмите на задачу, чтобы увидеть что сделано и принять решение
            </p>
            {review.map(t => (
              <ReviewCard
                key={t.id}
                task={t}
                expanded={expandedId === t.id}
                onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
                onDone={() => { setExpandedId(null); refetch(); }}
              />
            ))}
          </section>
        )}

        {/* В работе */}
        {active.length > 0 && (
          <section className="space-y-2">
            <SectionHeader color={ACCENT} label="В работе" count={active.length} />
            {active.map(t => <TaskCard key={t.id} task={t} />)}
          </section>
        )}

        {/* Возвращены */}
        {returned.length > 0 && (
          <section className="space-y-2">
            <SectionHeader color={STATUS_COLORS.returned} label="Возвращены" count={returned.length} />
            {returned.map(t => <TaskCard key={t.id} task={t} />)}
          </section>
        )}

        {/* Приняты */}
        {done.length > 0 && (
          <section className="space-y-2">
            <SectionHeader color={STATUS_COLORS.done} label="Приняты" count={done.length} />
            {done.map(t => <TaskCard key={t.id} task={t} />)}
          </section>
        )}
      </div>

      {composerOpen && typedPeople.length > 0 && (
        <TaskComposer people={typedPeople} onClose={() => setComposerOpen(false)} onCreated={() => refetch()} />
      )}
    </Shell>
  );
}
