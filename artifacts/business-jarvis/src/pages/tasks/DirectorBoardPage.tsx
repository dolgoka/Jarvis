import { useState, useCallback } from "react";
import { LazyTaskDistributionTree } from "@/components/tasks/TaskDistributionTree";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, ChevronDown, ChevronUp,
  Calendar, Users, Bell, Plus, Send,
  CheckCircle2, RotateCcw, X, ClipboardList, AlertTriangle,
} from "lucide-react";
import {
  useListTasks, useListPeople, useStartTask, useSubmitTask,
  useAcceptTask, useReturnTask, useCreateTask,
  useGetFeed, useMarkFeedSeen, useGetTaskActivity,
} from "@workspace/api-client-react";
import { useAuthContext } from "@/hooks/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

const HF     = "'Hanken Grotesk', system-ui, sans-serif";
const ACCENT = "#5b8bd0";

const TEXT = {
  hi:  "rgba(228,232,255,0.92)",
  mid: "rgba(228,232,255,0.60)",
  lo:  "rgba(228,232,255,0.38)",
  dim: "rgba(228,232,255,0.22)",
};
const DIVIDER = "rgba(255,255,255,0.07)";

const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  sent:        { label: "Входящая",    color: "#5b8bd0", icon: "📩" },
  in_progress: { label: "В работе",   color: "#00d4ff", icon: "⚡" },
  returned:    { label: "Возвращено",  color: "#f0625a", icon: "↩" },
  review:      { label: "На приёмке", color: "#f0b54a", icon: "🔍" },
  done:        { label: "Готово",     color: "#3ed9a0", icon: "✅" },
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

type Task = {
  id: number; title: string; body: string;
  assigneeId: number; assigneeName: string; assigneeRole: string;
  watchers: { id: number; name: string; role: string }[];
  priority: "high" | "medium" | "low";
  dueDate?: string | null; status: string;
  resultNote?: string | null; returnComment?: string | null;
  createdAt: string; lastActivityAt: string;
  createdBy?: string | null;
  createdByPersonId?: number | null;
  parentId?: number | null;
};

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
      <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} /> Загрузка…
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

/* ── Assignee picker dropdown ─────────────────────────────────────────── */
function AssigneeSelect({
  value, onChange,
  people,
}: {
  value: number;
  onChange: (id: number) => void;
  people: { id: number; name: string; role: string; groupLabel?: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const selected = people.find(p => p.id === value);
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          borderRadius: 10, padding: "9px 12px", fontFamily: HF, cursor: "pointer",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          color: TEXT.hi, fontSize: 13,
        }}
      >
        <span>{selected?.role ?? "Выбрать исполнителя…"}</span>
        <ChevronDown style={{ width: 13, height: 13, color: TEXT.dim, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", zIndex: 100, top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#08080c", border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 12, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          maxHeight: 240, overflowY: "auto",
        }}>
          {people.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange(p.id); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", textAlign: "left", background: "transparent",
                border: "none", cursor: "pointer", fontFamily: HF,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${ACCENT}18`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700,
                background: `${ACCENT}18`, color: ACCENT,
              }}>
                {p.role.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT.hi }}>{p.role}</div>
                {p.groupLabel && <div style={{ fontSize: 10, color: TEXT.dim }}>{p.groupLabel}</div>}
              </div>
              {p.id === value && <CheckCircle2 style={{ width: 13, height: 13, color: ACCENT, marginLeft: "auto" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Task composer modal ─────────────────────────────────────────────── */
function TaskComposer({
  directorPersonId,
  people,
  onClose,
  onCreated,
}: {
  directorPersonId: number;
  people: { id: number; name: string; role: string; groupLabel?: string | null }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [assigneeId, setAssigneeId] = useState(people[0]?.id ?? 0);
  const [titleErr, setTitleErr] = useState("");
  const [assignErr, setAssignErr] = useState("");

  const { mutateAsync: createTask, isPending } = useCreateTask();

  async function handleSend() {
    let ok = true;
    if (!title.trim()) { setTitleErr("Введите заголовок"); ok = false; }
    if (!assigneeId)   { setAssignErr("Выберите исполнителя"); ok = false; }
    if (!ok) return;

    try {
      const result = await createTask({
        data: {
          title: title.trim(),
          body: body.trim(),
          assigneeId,
          createdByPersonId: directorPersonId,
          createdBy: "director",
        },
      });
      toast.success(`Задача поставлена → ${result.assigneeRole}`, { description: result.title, duration: 4000 });
      onCreated();
      onClose();
    } catch (err) {
      toast.error("Не удалось создать задачу", { description: err instanceof Error ? err.message : String(err) });
    }
  }

  const fieldStyle: React.CSSProperties = {
    fontFamily: HF, fontSize: 13,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, padding: "9px 12px", color: TEXT.hi, outline: "none", caretColor: ACCENT, width: "100%",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.60)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="glass" style={{
        position: "relative", width: "100%", maxWidth: 520, margin: "0 16px 16px",
        borderRadius: 20, overflow: "hidden", maxHeight: "90dvh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderBottom: `1px solid ${DIVIDER}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ClipboardList style={{ width: 15, height: 15, color: ACCENT }} />
            <span style={{ fontFamily: HF, fontSize: 13, fontWeight: 700, color: TEXT.hi }}>Поставить задачу</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT.lo }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Title */}
          <div>
            <label style={{ display: "block", fontFamily: HF, fontSize: 10, fontWeight: 700, color: TEXT.lo, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>
              Заголовок
            </label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setTitleErr(""); }}
              placeholder="Краткое название задачи…"
              style={{ ...fieldStyle, borderColor: titleErr ? "rgba(240,98,90,0.5)" : "rgba(255,255,255,0.08)" }}
            />
            {titleErr && <p style={{ fontSize: 11, color: "#f0625a", fontFamily: HF, marginTop: 3 }}>{titleErr}</p>}
          </div>

          {/* Body */}
          <div>
            <label style={{ display: "block", fontFamily: HF, fontSize: 10, fontWeight: 700, color: TEXT.lo, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>
              Описание
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={3}
              placeholder="Контекст, ожидаемый результат…"
              style={{ ...fieldStyle, resize: "none" }}
            />
          </div>

          {/* Assignee */}
          <div>
            <label style={{ display: "block", fontFamily: HF, fontSize: 10, fontWeight: 700, color: TEXT.lo, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>
              Исполнитель
            </label>
            <AssigneeSelect value={assigneeId} onChange={id => { setAssigneeId(id); setAssignErr(""); }} people={people} />
            {assignErr && <p style={{ fontSize: 11, color: "#f0625a", fontFamily: HF, marginTop: 3 }}>{assignErr}</p>}
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={isPending}
            style={{
              width: "100%", minHeight: 44, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              background: `linear-gradient(135deg, ${ACCENT} 0%, #3a68b0 100%)`,
              border: "none", color: "#fff", fontFamily: HF, fontSize: 14, fontWeight: 700,
              cursor: isPending ? "not-allowed" : "pointer",
              boxShadow: `0 4px 14px ${ACCENT}40`,
              opacity: isPending ? 0.6 : 1, transition: "opacity 150ms",
            }}
          >
            {isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 13, height: 13 }} />}
            Поставить задачу
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Section header ─────────────────────────────────────────────────────── */
function SectionHeader({ icon, label, count, color }: { icon: string; label: string; count: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: HF, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: `${color}22`, borderRadius: 1 }} />
      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: HF, color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 8, padding: "1px 7px" }}>
        {count}
      </span>
    </div>
  );
}

/* ── Return modal ───────────────────────────────────────────────────────── */
function ReturnModal({ task, onClose, onRefresh }: { task: Task; onClose: () => void; onRefresh: () => void }) {
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  const { mutate: returnTask, isPending } = useReturnTask({
    mutation: {
      onSuccess: () => {
        toast.success("Задача возвращена", { description: task.title, duration: 3000 });
        onRefresh();
        onClose();
      },
      onError: () => toast.error("Не удалось вернуть задачу"),
    },
  });

  function handleReturn() {
    if (!comment.trim()) { setErr("Укажите причину возврата"); return; }
    returnTask({ params: { id: task.id }, data: { comment: comment.trim() } });
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="glass" style={{ position: "relative", width: "100%", maxWidth: 420, margin: "0 16px", borderRadius: 18, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${DIVIDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: HF, fontSize: 13, fontWeight: 700, color: "#f0625a" }}>Вернуть на доработку</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT.lo }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: TEXT.mid, fontFamily: HF }}>{task.title}</div>
          <textarea
            value={comment}
            onChange={e => { setComment(e.target.value); setErr(""); }}
            rows={3}
            placeholder="Причина возврата, что нужно доработать…"
            autoFocus
            style={{
              width: "100%", resize: "none", borderRadius: 10, padding: "9px 12px",
              fontSize: 12, fontFamily: HF, background: "rgba(255,255,255,0.04)",
              border: err ? "1px solid rgba(240,98,90,0.5)" : "1px solid rgba(255,255,255,0.09)",
              color: TEXT.hi, outline: "none", caretColor: "#f0625a",
            }}
          />
          {err && <p style={{ fontSize: 11, color: "#f0625a", fontFamily: HF, margin: 0 }}>{err}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, minHeight: 40, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${DIVIDER}`, color: TEXT.lo, fontFamily: HF, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Отмена
            </button>
            <button
              onClick={handleReturn}
              disabled={isPending}
              style={{
                flex: 2, minHeight: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: "rgba(240,98,90,0.15)", border: "1px solid rgba(240,98,90,0.40)",
                color: "#f0625a", fontFamily: HF, fontSize: 13, fontWeight: 700,
                cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <RotateCcw style={{ width: 13, height: 13 }} />}
              Вернуть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Task card ──────────────────────────────────────────────────────────── */
function TaskCard({
  task,
  mode,
  expanded,
  onToggle,
  onRefresh,
}: {
  task: Task;
  mode: "incoming" | "in_progress_mine" | "review_from_below" | "done" | "delegated_progress";
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const [submitOpen, setSubmitOpen]   = useState(false);
  const [resultNote, setResultNote]   = useState("");
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  const sMeta = STATUS_META[task.status] ?? { label: task.status, color: ACCENT, icon: "•" };
  const pMeta = PRIORITY_META[task.priority] ?? PRIORITY_META.medium!;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

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
        toast.success("Отчёт отправлен вверх", { description: task.title, duration: 3000 });
        setSubmitOpen(false);
        setResultNote("");
        onRefresh();
      },
      onError: () => toast.error("Не удалось отправить отчёт"),
    },
  });

  const { mutate: acceptTask, isPending: isAccepting } = useAcceptTask({
    mutation: {
      onSuccess: () => {
        toast.success("Задача принята ✓", { description: task.title, duration: 3000 });
        onRefresh();
      },
      onError: () => toast.error("Не удалось принять задачу"),
    },
  });

  const busy = isStarting || isSubmitting || isAccepting;

  return (
    <>
      {returnModalOpen && (
        <ReturnModal task={task} onClose={() => setReturnModalOpen(false)} onRefresh={onRefresh} />
      )}

      <div className="glass overflow-hidden" style={{ borderRadius: 14, borderLeft: `3px solid ${sMeta.color}` }}>
        {/* Collapsed header */}
        <button className="w-full text-left" onClick={onToggle} style={{ display: "block", padding: "12px 14px", background: "transparent", border: "none", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 4, alignItems: "center" }}>
                <span style={{ fontSize: 11 }}>{pMeta.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: HF, color: pMeta.color }}>{pMeta.label}</span>
                {task.dueDate && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontFamily: HF, color: isOverdue ? "#f0625a" : TEXT.lo }}>
                    <Calendar style={{ width: 8, height: 8 }} />
                    до {fmtShortDate(task.dueDate)}
                  </span>
                )}
                {/* Show assignee role for delegated tasks */}
                {(mode === "review_from_below" || mode === "delegated_progress") && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: `${ACCENT}14`, color: ACCENT, border: `1px solid ${ACCENT}28`, letterSpacing: "0.05em" }}>
                    {task.assigneeRole}
                  </span>
                )}
                {task.returnComment && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: "rgba(240,98,90,0.14)", color: "#f0625a", border: "1px solid rgba(240,98,90,0.30)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    возврат
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT.hi, fontFamily: HF, lineHeight: 1.3 }}>
                {task.title}
              </div>
              {task.body && !expanded && (
                <div style={{ fontSize: 11, color: TEXT.lo, fontFamily: HF, marginTop: 3, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                  {task.body}
                </div>
              )}
            </div>
            <div style={{ flexShrink: 0, paddingTop: 2 }}>
              {expanded
                ? <ChevronUp  style={{ width: 14, height: 14, color: TEXT.dim }} />
                : <ChevronDown style={{ width: 14, height: 14, color: TEXT.dim }} />
              }
            </div>
          </div>
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div style={{ borderTop: `1px solid ${DIVIDER}`, padding: "14px 14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

            {task.body && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT.dim, fontFamily: HF, marginBottom: 4 }}>Суть задачи</div>
                <p style={{ fontSize: 12, color: TEXT.mid, lineHeight: 1.65, fontFamily: HF, margin: 0 }}>{task.body}</p>
              </div>
            )}

            {task.returnComment && (
              <div style={{ padding: "9px 11px", borderRadius: 9, background: "rgba(240,98,90,0.07)", border: "1px solid rgba(240,98,90,0.22)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f0625a", fontFamily: HF, marginBottom: 3 }}>Причина возврата</div>
                <p style={{ fontSize: 12, color: "rgba(240,98,90,0.80)", fontFamily: HF, margin: 0, lineHeight: 1.5 }}>{task.returnComment}</p>
              </div>
            )}

            {task.resultNote && (
              <div style={{ padding: "9px 11px", borderRadius: 9, background: "rgba(62,217,160,0.06)", border: "1px solid rgba(62,217,160,0.18)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#3ed9a0", fontFamily: HF, marginBottom: 3 }}>Что сделано</div>
                <p style={{ fontSize: 12, color: TEXT.mid, fontFamily: HF, margin: 0, lineHeight: 1.5 }}>{task.resultNote}</p>
              </div>
            )}

            {/* Meta */}
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
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: TEXT.dim, fontFamily: HF, marginLeft: "auto" }}>
                {timeAgo(task.lastActivityAt)}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT.dim, fontFamily: HF, marginBottom: 7 }}>Хроника</div>
              <Timeline taskId={task.id} />
            </div>

            {/* Distribution tree (visible to director as creator) */}
            <LazyTaskDistributionTree taskId={task.id} createdBy={task.createdBy ?? undefined} />

            {/* ── Action zone ── */}

            {/* incoming: accept into work */}
            {mode === "incoming" && task.status === "sent" && (
              <button
                onClick={() => startTask({ params: { id: task.id } })}
                disabled={busy}
                style={{
                  width: "100%", minHeight: 42, borderRadius: 11,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  background: `linear-gradient(135deg, ${ACCENT} 0%, #3a68b0 100%)`,
                  border: "none", color: "#fff", fontFamily: HF, fontSize: 13, fontWeight: 700,
                  cursor: busy ? "not-allowed" : "pointer",
                  boxShadow: `0 4px 14px ${ACCENT}30`,
                  opacity: isStarting ? 0.6 : 1, transition: "opacity 150ms",
                }}
              >
                {isStarting ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <CheckCircle2 style={{ width: 14, height: 14 }} />}
                Принять в работу
              </button>
            )}

            {/* in_progress (my own task from above): submit upward */}
            {mode === "in_progress_mine" && task.status === "in_progress" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {submitOpen && (
                  <textarea
                    value={resultNote}
                    onChange={e => setResultNote(e.target.value)}
                    rows={3}
                    placeholder="Что сделано, какой результат…"
                    autoFocus
                    style={{
                      width: "100%", resize: "none", borderRadius: 10, padding: "9px 12px",
                      fontSize: 12, fontFamily: HF, background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(0,212,255,0.28)", color: TEXT.hi, outline: "none", caretColor: "#00d4ff",
                    }}
                  />
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  {submitOpen && (
                    <button
                      onClick={() => { setSubmitOpen(false); setResultNote(""); }}
                      disabled={busy}
                      style={{ flex: 1, minHeight: 40, borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.04)", border: `1px solid ${DIVIDER}`, color: TEXT.lo, fontFamily: HF, fontSize: 12, fontWeight: 600 }}
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
                      flex: submitOpen ? 2 : 1, minHeight: 40, borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      background: submitOpen ? "linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)" : "rgba(0,212,255,0.10)",
                      border: submitOpen ? "none" : "1px solid rgba(0,212,255,0.30)",
                      color: submitOpen ? "#fff" : "#00d4ff",
                      fontFamily: HF, fontSize: 13, fontWeight: 700,
                      cursor: busy ? "not-allowed" : "pointer",
                      boxShadow: submitOpen ? "0 4px 14px rgba(0,212,255,0.25)" : "none",
                      opacity: isSubmitting ? 0.6 : 1, transition: "all 150ms",
                    }}
                  >
                    {isSubmitting ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 12, height: 12 }} />}
                    {submitOpen ? "Подтвердить отчёт" : "Отчёт вверх"}
                  </button>
                </div>
              </div>
            )}

            {/* review from below: accept or return */}
            {mode === "review_from_below" && task.status === "review" && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setReturnModalOpen(true)}
                  disabled={busy}
                  style={{
                    flex: 1, minHeight: 42, borderRadius: 11,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: "rgba(240,98,90,0.10)", border: "1px solid rgba(240,98,90,0.30)",
                    color: "#f0625a", fontFamily: HF, fontSize: 12, fontWeight: 700,
                    cursor: busy ? "not-allowed" : "pointer",
                  }}
                >
                  <RotateCcw style={{ width: 12, height: 12 }} />
                  Вернуть
                </button>
                <button
                  onClick={() => acceptTask({ params: { id: task.id } })}
                  disabled={busy}
                  style={{
                    flex: 2, minHeight: 42, borderRadius: 11,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: "linear-gradient(135deg, #3ed9a0 0%, #28b882 100%)",
                    border: "none", color: "#0a1a14", fontFamily: HF, fontSize: 13, fontWeight: 700,
                    cursor: busy ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(62,217,160,0.25)",
                    opacity: isAccepting ? 0.6 : 1, transition: "opacity 150ms",
                  }}
                >
                  {isAccepting ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <CheckCircle2 style={{ width: 14, height: 14 }} />}
                  Принять
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function DirectorBoardPage() {
  const { personId, switchRole } = useAuthContext();
  const qc = useQueryClient();

  const { data: allPeople = [] } = useListPeople();
  const person = allPeople.find(p => p.id === personId);

  // Tasks assigned TO the director
  const { data: myTasks = [], isLoading: loadingMine } = useListTasks(
    personId != null ? { assigneeId: personId } : {},
  );

  // Tasks CREATED BY the director (delegated to staff)
  const { data: delegatedTasks = [], isLoading: loadingDelegated } = useListTasks(
    personId != null ? { createdByPersonId: personId } : {},
  );

  const { data: feedItems = [] } = useGetFeed({ role: "director" });
  const { mutate: markSeen } = useMarkFeedSeen();

  const [expandedId, setExpandedId]     = useState<number | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [dismissedFeed, setDismissedFeed] = useState<Set<number>>(() => new Set());

  const isLoading = loadingMine || loadingDelegated;

  // Feed inbox items relevant to director
  const inboxItems = feedItems.filter(
    f => (f.type === "task_new" || f.type === "task_review" || f.type === "task_accepted") && !dismissedFeed.has(f.id),
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

  // Column 1: Incoming from client (sent, assigned to director)
  const incoming = myTasks.filter(t => t.status === "sent");

  // Column 2a: My tasks in progress (from client, assigned to me)
  const myInProgress = myTasks.filter(t => t.status === "in_progress");

  // Column 2b: Delegated tasks being worked on by staff (in_progress or returned, created by me)
  const delegatedActive = delegatedTasks.filter(t => t.status === "in_progress" || t.status === "returned");

  // Column 3: Review from below (staff submitted to me)
  const reviewFromBelow = delegatedTasks.filter(t => t.status === "review");

  // Column 4: Done (my tasks completed)
  const done = myTasks.filter(t => t.status === "done");

  // Staff people (exclude self if in list)
  const staffPeople = allPeople.filter(p => p.id !== personId);

  const totalPending = incoming.length + reviewFromBelow.length;

  return (
    <>
      {composerOpen && personId != null && (
        <TaskComposer
          directorPersonId={personId}
          people={staffPeople}
          onClose={() => setComposerOpen(false)}
          onCreated={handleRefresh}
        />
      )}

      <div style={{ position: "fixed", inset: 0, overflowY: "auto", background: "#0b0b12", fontFamily: HF }}>

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
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(228,232,255,0.40)", cursor: "pointer",
              }}
            >
              <ArrowLeft style={{ width: 15, height: 15 }} />
            </button>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(228,232,255,0.88)", lineHeight: 1.2 }}>
                Доска директора
              </div>
              {person && (
                <div style={{ fontSize: 11, color: "rgba(228,232,255,0.35)", marginTop: 1 }}>{person.role}</div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {totalPending > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999,
                background: "rgba(240,181,74,0.12)", border: "1px solid rgba(240,181,74,0.28)",
              }}>
                <AlertTriangle style={{ width: 11, height: 11, color: "#f0b54a" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#f0b54a" }}>{totalPending} ожидает</span>
              </div>
            )}
            {inboxItems.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 22, height: 22, borderRadius: "50%",
                background: "rgba(0,212,255,0.15)", border: "1px solid rgba(0,212,255,0.35)",
              }}>
                <Bell style={{ width: 11, height: 11, color: "#00d4ff" }} />
              </div>
            )}
            <button
              onClick={() => setComposerOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10,
                background: `linear-gradient(135deg, ${ACCENT} 0%, #3a68b0 100%)`,
                border: "none", color: "#fff", fontFamily: HF, fontSize: 12, fontWeight: 700,
                cursor: "pointer", boxShadow: `0 2px 10px ${ACCENT}40`,
              }}
            >
              <Plus style={{ width: 13, height: 13 }} />
              Поставить задачу
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 48px" }}>

          {/* Inbox strip */}
          {inboxItems.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <SectionHeader icon="🔔" label="Уведомления" count={inboxItems.length} color="#00d4ff" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {inboxItems.map(item => (
                  <div key={item.id} className="glass" style={{
                    padding: "12px 14px", borderRadius: 12,
                    borderLeft: `3px solid ${item.type === "task_review" ? "#f0b54a" : item.type === "task_accepted" ? "#3ed9a0" : ACCENT}`,
                    display: "flex", alignItems: "flex-start", gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: TEXT.hi, fontFamily: HF, lineHeight: 1.3 }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: TEXT.lo, fontFamily: HF, marginTop: 3, lineHeight: 1.4 }}>{item.body}</div>
                    </div>
                    <button
                      onClick={() => handleDismissFeed(item.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: TEXT.dim, flexShrink: 0, marginTop: 1, padding: 2 }}
                    >
                      <X style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "48px 0", color: TEXT.lo, fontFamily: HF, fontSize: 13 }}>
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              Загрузка задач…
            </div>
          )}

          {!isLoading && (
            <>
              {/* ── Column 1: Входящие сверху ── */}
              {incoming.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <SectionHeader icon="📩" label="Входящие сверху" count={incoming.length} color="#5b8bd0" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {incoming.map(t => (
                      <TaskCard
                        key={t.id}
                        task={t as Task}
                        mode="incoming"
                        expanded={expandedId === t.id}
                        onToggle={() => toggleExpand(t.id)}
                        onRefresh={handleRefresh}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Column 2: В работе ── */}
              {(myInProgress.length > 0 || delegatedActive.length > 0) && (
                <div style={{ marginBottom: 28 }}>
                  <SectionHeader icon="⚡" label="В работе" count={myInProgress.length + delegatedActive.length} color="#00d4ff" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* My own in-progress tasks (from client above) */}
                    {myInProgress.map(t => (
                      <TaskCard
                        key={`mine-${t.id}`}
                        task={t as Task}
                        mode="in_progress_mine"
                        expanded={expandedId === t.id}
                        onToggle={() => toggleExpand(t.id)}
                        onRefresh={handleRefresh}
                      />
                    ))}
                    {/* Delegated tasks being worked by staff */}
                    {delegatedActive.map(t => (
                      <TaskCard
                        key={`del-${t.id}`}
                        task={t as Task}
                        mode="delegated_progress"
                        expanded={expandedId === t.id}
                        onToggle={() => toggleExpand(t.id)}
                        onRefresh={handleRefresh}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Column 3: На приёмке снизу ── */}
              {reviewFromBelow.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <SectionHeader icon="🔍" label="На приёмке снизу" count={reviewFromBelow.length} color="#f0b54a" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {reviewFromBelow.map(t => (
                      <TaskCard
                        key={t.id}
                        task={t as Task}
                        mode="review_from_below"
                        expanded={expandedId === t.id}
                        onToggle={() => toggleExpand(t.id)}
                        onRefresh={handleRefresh}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Column 4: Готово ── */}
              {done.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <SectionHeader icon="✅" label="Готово" count={done.length} color="#3ed9a0" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {done.map(t => (
                      <TaskCard
                        key={t.id}
                        task={t as Task}
                        mode="done"
                        expanded={expandedId === t.id}
                        onToggle={() => toggleExpand(t.id)}
                        onRefresh={handleRefresh}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {incoming.length === 0 && myInProgress.length === 0 && delegatedActive.length === 0 && reviewFromBelow.length === 0 && done.length === 0 && (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 12, padding: "72px 24px", textAlign: "center",
                }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: `${ACCENT}12`, border: `1px solid ${ACCENT}20` }}>
                    <ClipboardList style={{ width: 22, height: 22, color: ACCENT }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: TEXT.mid, fontFamily: HF }}>Доска пуста</div>
                    <div style={{ fontSize: 12, color: TEXT.lo, fontFamily: HF, marginTop: 5, lineHeight: 1.5 }}>
                      Новые задачи от заказчика появятся во «Входящих».<br />
                      Нажмите «Поставить задачу», чтобы делегировать вниз.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
