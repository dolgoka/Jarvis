import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAcceptTask, useReturnTask, useGetTaskActivity } from "@workspace/api-client-react";
import {
  X, AlertTriangle, Calendar, Clock, Loader2, Sparkles, RotateCcw,
  CheckCircle2, ChevronDown, ChevronUp, Check, FileText, ExternalLink,
} from "lucide-react";

const HF = "'Hanken Grotesk', system-ui, sans-serif";
const ACCENT = "#5b8bd0";
const GREEN  = "#3ed9a0";
const YELLOW = "#f0b54a";
const RED    = "#f0625a";
const TEXT   = {
  hi:  "rgba(228,232,255,0.92)",
  mid: "rgba(228,232,255,0.60)",
  lo:  "rgba(228,232,255,0.40)",
  dim: "rgba(228,232,255,0.25)",
};
const DIVIDER = "rgba(255,255,255,0.07)";

// ── Types ────────────────────────────────────────────────────────────────────
export type Person = { id: number; name: string; role: string; email?: string | null };

export type ReviewTask = {
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
  submittedAt?: string | null;
  returnCount?: number;
  createdAt: string;
  lastActivityAt: string;
};

type TreeNode = {
  id: number;
  title: string;
  assigneeRole: string;
  assigneeName: string;
  status: string;
  lastActivityAt: string;
  parentId?: number | null;
};

type ChecklistItem = { item: string; status: "ok" | "partial" };
type ActivityEntry = { id: number; type: string; actorRole: string; text?: string | null; at: string };

// ── Helpers ──────────────────────────────────────────────────────────────────
const TOKEN = import.meta.env["VITE_API_TOKEN"] as string | undefined;
const AUTH: Record<string, string> = TOKEN ? { "x-api-token": TOKEN } : {};

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) +
    ", " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function waitingDays(submittedAt?: string | null) {
  if (!submittedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(submittedAt).getTime()) / 86_400_000));
}

function isBottleneck(node: TreeNode) {
  const diffH = (Date.now() - new Date(node.lastActivityAt).getTime()) / 3_600_000;
  return node.status === "sent" || node.status === "returned" || diffH > 24;
}

function staleDays(lastActivityAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / 86_400_000));
}

const PRIORITY_META: Record<string, { color: string; label: string }> = {
  high:   { color: RED,    label: "Срочно"  },
  medium: { color: YELLOW, label: "Средний" },
  low:    { color: GREEN,  label: "Низкий"  },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  sent:        { label: "не приняли",  color: YELLOW },
  in_progress: { label: "в работе",   color: ACCENT  },
  review:      { label: "на приёмке", color: YELLOW  },
  done:        { label: "готово",     color: GREEN   },
  returned:    { label: "возврат",    color: RED     },
};

// Локализация типов активности
const ACTIVITY_LABEL: Record<string, string> = {
  created:        "Поставлена",
  accepted:       "Принята в работу",
  submitted:      "Сдана на приёмку",
  accepted_final: "Принята владельцем",
  returned:       "Возвращена на доработку",
  decomposed:     "Разбита на части",
  commented:      "Комментарий",
  escalated:      "Эскалация",
  pinged:         "Напоминание",
  owner:          "Заказчик",
  owner_reminded: "Заказчик напомнил",
};

function actorLabel(raw: string): string {
  return ACTIVITY_LABEL[raw] ?? raw;
}

// ── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? 26 : 34;
  const fs = size === "sm" ? 9 : 12;
  return (
    <div style={{
      width: sz, height: sz, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: fs, fontFamily: HF,
      background: `${ACCENT}22`, border: `1.5px solid ${ACCENT}40`, color: ACCENT,
    }}>
      {initials(name)}
    </div>
  );
}

function Chip({ label, color, icon }: { label: string; color: string; icon?: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 700, fontFamily: HF,
      background: `${color}18`, color, border: `1px solid ${color}38`,
      flexShrink: 0, whiteSpace: "nowrap",
    }}>
      {icon}{label}
    </span>
  );
}

// ── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.09em",
      textTransform: "uppercase", color: TEXT.dim, fontFamily: HF,
      marginBottom: 10,
    }}>
      {label}
    </div>
  );
}

// ── Checklist ─────────────────────────────────────────────────────────────────
function ChecklistSection({ taskId, taskBody, resultNote }: {
  taskId: number;
  taskBody: string;
  resultNote?: string | null;
}) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [verdict, setVerdict]     = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [err, setErr]             = useState("");

  // Auto-run when overlay opens
  useEffect(() => {
    if (!taskBody?.trim()) return;
    setLoading(true);
    fetch("/api/tasks/ai-check", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...AUTH },
      body: JSON.stringify({ taskBody, resultNote }),
    })
      .then(r => r.ok ? r.json() : Promise.reject("err"))
      .then((d: { verdict?: string; checklist?: ChecklistItem[] }) => {
        setVerdict(d.verdict ?? null);
        setChecklist(d.checklist ?? []);
        setDone(true);
      })
      .catch(() => setErr("Не удалось загрузить проверку"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function rerun() {
    setLoading(true); setErr(""); setDone(false);
    try {
      const r = await fetch("/api/tasks/ai-check", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH },
        body: JSON.stringify({ taskBody, resultNote }),
      });
      const d = await r.json() as { verdict?: string; checklist?: ChecklistItem[] };
      setVerdict(d.verdict ?? null);
      setChecklist(d.checklist ?? []);
      setDone(true);
    } catch { setErr("Ошибка ИИ-проверки"); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <SectionLabel label="Соответствие задаче" />
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: TEXT.dim, fontSize: 12, fontFamily: HF }}>
          <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
          ИИ анализирует…
        </div>
      )}
      {!loading && err && (
        <div style={{ fontSize: 12, color: RED, fontFamily: HF }}>{err}</div>
      )}
      {!loading && done && checklist.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {checklist.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{
                flexShrink: 0, marginTop: 1,
                width: 18, height: 18, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: c.status === "ok" ? `${GREEN}18` : `${YELLOW}18`,
                border: `1.5px solid ${c.status === "ok" ? GREEN : YELLOW}50`,
                color: c.status === "ok" ? GREEN : YELLOW,
                fontSize: 10, fontWeight: 800,
              }}>
                {c.status === "ok" ? <Check style={{ width: 10, height: 10 }} /> : "?"}
              </div>
              <span style={{ fontSize: 13, color: TEXT.mid, fontFamily: HF, lineHeight: 1.45 }}>{c.item}</span>
            </div>
          ))}
          {verdict && (
            <div style={{
              marginTop: 4, padding: "6px 10px", borderRadius: 8,
              background: verdict.includes("⚠") ? `${YELLOW}0d` : `${GREEN}0d`,
              border: `1px solid ${verdict.includes("⚠") ? YELLOW : GREEN}28`,
              fontSize: 11, color: verdict.includes("⚠") ? YELLOW : GREEN,
              fontFamily: HF, lineHeight: 1.5,
            }}>
              {verdict}
            </div>
          )}
          <button onClick={rerun} style={{
            marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
            fontFamily: HF, background: "rgba(167,139,250,0.08)",
            color: "#a78bfa", border: "1px solid rgba(167,139,250,0.22)",
            cursor: "pointer", alignSelf: "flex-start",
          }}>
            <Sparkles style={{ width: 10, height: 10 }} /> Проверить снова
          </button>
        </div>
      )}
      {!loading && !done && !err && (
        <button onClick={rerun} style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          fontFamily: HF, background: "rgba(167,139,250,0.10)",
          color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)",
          cursor: "pointer",
        }}>
          <Sparkles style={{ width: 11, height: 11 }} /> ИИ-проверка
        </button>
      )}
    </div>
  );
}

// ── Distribution tree ─────────────────────────────────────────────────────────
function DistributionSection({ taskId }: { taskId: number }) {
  const [data, setData]     = useState<{ root: TreeNode; children: TreeNode[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tasks/tree?id=${taskId}`, { headers: AUTH })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [taskId]);

  if (loading) return (
    <div style={{ fontSize: 12, color: TEXT.dim, fontFamily: HF, display: "flex", alignItems: "center", gap: 6 }}>
      <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />Загрузка…
    </div>
  );
  if (!data || data.children.length === 0) return null;

  return (
    <div>
      <SectionLabel label="Распределение" />
      <div style={{
        background: "rgba(255,255,255,0.025)", border: `1px solid ${DIVIDER}`,
        borderRadius: 12, overflow: "hidden",
      }}>
        {data.children.map((child, idx) => {
          const isLast = idx === data.children.length - 1;
          const bneck = isBottleneck(child);
          const sd = staleDays(child.lastActivityAt);
          const sm = STATUS_META[child.status] ?? { label: child.status, color: TEXT.dim };
          const depth = child.parentId === data.root.id ? 0 : 1;

          return (
            <div key={child.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 14px",
              paddingLeft: 14 + depth * 14,
              borderBottom: isLast ? "none" : `1px solid ${DIVIDER}`,
              background: bneck ? `${YELLOW}07` : "transparent",
            }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: TEXT.dim, flexShrink: 0 }}>
                {isLast ? "└" : "├"}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, color: TEXT.mid, fontFamily: HF,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {child.title}
              </span>
              {/* bottleneck badge */}
              {bneck && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: YELLOW,
                  background: `${YELLOW}12`, border: `1px solid ${YELLOW}30`,
                  borderRadius: 999, padding: "1px 6px", flexShrink: 0, whiteSpace: "nowrap",
                }}>
                  узкое место{sd > 0 ? `, +${sd}д` : ""}
                </span>
              )}
              {/* status */}
              <span style={{
                fontSize: 10, fontWeight: 700, color: sm.color,
                background: `${sm.color}15`, border: `1px solid ${sm.color}30`,
                borderRadius: 999, padding: "1px 6px", flexShrink: 0, whiteSpace: "nowrap",
              }}>
                {sm.label}
              </span>
              {/* assignee name */}
              <span style={{
                fontSize: 11, color: bneck ? YELLOW : TEXT.dim, fontFamily: HF,
                flexShrink: 0, whiteSpace: "nowrap", fontWeight: bneck ? 600 : 400,
              }}>
                {child.assigneeName !== "—" ? child.assigneeName : child.assigneeRole}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Хроника ───────────────────────────────────────────────────────────────────
function ChronicleSection({ taskId }: { taskId: number }) {
  const [open, setOpen] = useState(false);
  const { data: activity = [], isLoading } = useGetTaskActivity({ id: taskId });

  const count = activity.length;
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", padding: "10px 14px", borderRadius: 10,
          background: "rgba(255,255,255,0.025)", border: `1px solid ${DIVIDER}`,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: TEXT.lo, fontFamily: HF }}>
          Хроника пути задачи{count > 0 ? ` · ${count} событ${count === 1 ? "ие" : count < 5 ? "ия" : "ий"}` : ""}
        </span>
        {open
          ? <ChevronUp style={{ width: 14, height: 14, color: TEXT.dim }} />
          : <ChevronDown style={{ width: 14, height: 14, color: TEXT.dim }} />
        }
      </button>

      {open && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 0 }}>
          {isLoading && (
            <div style={{ fontSize: 12, color: TEXT.dim, fontFamily: HF, display: "flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
              <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />Загрузка…
            </div>
          )}
          {!isLoading && activity.map((entry: ActivityEntry, idx: number) => {
            const isLast = idx === activity.length - 1;
            const dot = entry.type === "accepted_final" || entry.type === "accepted" ? GREEN
              : entry.type === "returned" ? RED
              : entry.type === "submitted" ? YELLOW
              : ACCENT;
            const d = new Date(entry.at);
            const timeStr = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
              + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

            return (
              <div key={entry.id} style={{ display: "flex", gap: 12, position: "relative" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 20 }}>
                  <div style={{
                    width: 9, height: 9, borderRadius: "50%", marginTop: 4, flexShrink: 0,
                    background: dot, boxShadow: isLast ? `0 0 6px 2px ${dot}44` : "none",
                    border: `2px solid ${dot}44`,
                  }} />
                  {!isLast && <div style={{ width: 1.5, flex: 1, minHeight: 14, background: "rgba(255,255,255,0.07)", marginTop: 2 }} />}
                </div>
                <div style={{ paddingBottom: isLast ? 0 : 12, flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: TEXT.mid, fontFamily: HF }}>
                      {ACTIVITY_LABEL[entry.type] ?? entry.type}
                    </span>
                    <span style={{ fontSize: 10, color: TEXT.dim, fontFamily: HF }}>{timeStr}</span>
                  </div>
                  <div style={{ fontSize: 11, color: TEXT.dim, fontFamily: HF, marginTop: 1 }}>
                    {actorLabel(entry.actorRole)}
                  </div>
                  {entry.type !== "submitted" && entry.text && (
                    <div style={{
                      marginTop: 5, padding: "5px 9px", borderRadius: 7,
                      background: "rgba(255,255,255,0.03)", border: `1px solid ${DIVIDER}`,
                      fontSize: 11, color: TEXT.lo, fontFamily: HF, lineHeight: 1.5,
                    }}>
                      {entry.text}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Return form ───────────────────────────────────────────────────────────────
function ReturnForm({
  task, people, onCancel, onDone,
}: {
  task: ReviewTask;
  people: Person[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const [comment, setComment] = useState("");
  const [commentErr, setCommentErr] = useState("");
  const [recipientId, setRecipientId] = useState(task.assigneeId);

  const { mutate: returnTask, isPending } = useReturnTask({
    mutation: {
      onSuccess: () => {
        toast.success("Задача возвращена исполнителю", { description: task.title, duration: 3500 });
        onDone();
      },
      onError: () => toast.error("Не удалось вернуть задачу"),
    },
  });

  function submit() {
    if (!comment.trim()) { setCommentErr("Укажите причину возврата"); return; }
    setCommentErr("");
    returnTask({ params: { id: task.id }, data: { comment: comment.trim() } });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px 0" }}>
      {/* Recipient */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT.dim, fontFamily: HF, marginBottom: 6 }}>
          Получатель
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {people.filter(p => p.id === task.assigneeId || task.watchers.some(w => w.id === p.id)).map(p => (
            <label key={p.id} style={{
              display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
              padding: "7px 10px", borderRadius: 8,
              background: recipientId === p.id ? `${ACCENT}10` : "rgba(255,255,255,0.02)",
              border: `1px solid ${recipientId === p.id ? ACCENT + "30" : DIVIDER}`,
            }}>
              <input type="radio" name="recipient" checked={recipientId === p.id}
                onChange={() => setRecipientId(p.id)}
                style={{ accentColor: ACCENT, width: 13, height: 13, flexShrink: 0 }}
              />
              <Avatar name={p.name} size="sm" />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: TEXT.hi, fontFamily: HF }}>{p.name}</div>
                <div style={{ fontSize: 10, color: TEXT.dim, fontFamily: HF }}>{p.role}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT.dim, fontFamily: HF, marginBottom: 6 }}>
          Причина возврата
        </div>
        <textarea
          value={comment}
          onChange={e => { setComment(e.target.value); setCommentErr(""); }}
          rows={3}
          placeholder="Укажите, что нужно доработать…"
          disabled={isPending}
          autoFocus
          style={{
            width: "100%", resize: "none", borderRadius: 10,
            padding: "10px 14px", fontSize: 13, fontFamily: HF,
            background: "rgba(255,255,255,0.04)",
            border: commentErr ? `1px solid ${RED}50` : "1px solid rgba(255,255,255,0.09)",
            color: TEXT.hi, outline: "none", caretColor: ACCENT, boxSizing: "border-box",
          }}
          onFocus={e => { e.currentTarget.style.border = `1px solid ${ACCENT}60`; }}
          onBlur={e => { e.currentTarget.style.border = commentErr ? `1px solid ${RED}50` : "1px solid rgba(255,255,255,0.09)"; }}
        />
        {commentErr && <p style={{ fontSize: 11, color: RED, fontFamily: HF, marginTop: 3 }}>{commentErr}</p>}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} disabled={isPending} style={{
          flex: 1, height: 44, borderRadius: 10,
          background: "rgba(255,255,255,0.04)", border: `1px solid ${DIVIDER}`,
          color: TEXT.lo, fontFamily: HF, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          Отмена
        </button>
        <button onClick={submit} disabled={isPending} style={{
          flex: 2, height: 44, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          background: `${RED}18`, border: `1px solid ${RED}40`,
          color: RED, fontFamily: HF, fontSize: 13, fontWeight: 700,
          cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
        }}>
          {isPending
            ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
            : <RotateCcw style={{ width: 14, height: 14 }} />
          }
          Подтвердить возврат
        </button>
      </div>
    </div>
  );
}

// ── Main overlay ──────────────────────────────────────────────────────────────
interface Props {
  task: ReviewTask;
  people: Person[];
  onClose: () => void;
  onDone: () => void;
}

export function ReviewOverlay({ task, people, onClose, onDone }: Props) {
  const [returning, setReturning] = useState(false);

  const { mutate: accept, isPending: isAccepting } = useAcceptTask({
    mutation: {
      onSuccess: () => {
        toast.success("Задача принята — уходит в архив", { description: task.title, duration: 3500 });
        onDone();
      },
      onError: () => toast.error("Не удалось принять задачу"),
    },
  });

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pMeta = PRIORITY_META[task.priority] ?? PRIORITY_META.medium!;
  const waitDays = waitingDays(task.submittedAt);
  const waitLabel = waitDays >= 1
    ? `ждёт вашего решения ${waitDays} ${waitDays === 1 ? "день" : waitDays < 5 ? "дня" : "дней"}`
    : "ждёт вашего решения";

  // Find file url from resultNote
  const fileUrl = task.resultNote?.match(/https?:\/\/[^\s]+/)?.[0] ?? null;
  const fileLabel = fileUrl
    ? (fileUrl.split("/").pop()?.split("?")[0] ?? "Файл результата")
    : null;

  // Stale: how long waiting
  const diffH = task.submittedAt
    ? (Date.now() - new Date(task.submittedAt).getTime()) / 3_600_000
    : 0;
  const staleD = Math.floor(diffH / 24);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 900,
          background: "rgba(4,8,18,0.75)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", zIndex: 901,
        top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: "min(560px, calc(100vw - 32px))",
        maxHeight: "min(88vh, 820px)",
        display: "flex", flexDirection: "column",
        borderRadius: 20,
        background: "rgba(10,16,30,0.97)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
        overflow: "hidden",
      }}>

        {/* ── Fixed header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px 13px",
          borderBottom: `1px solid ${DIVIDER}`,
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
            textTransform: "uppercase", color: TEXT.dim, fontFamily: HF,
          }}>
            Задача · Решение
          </span>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.05)", border: `1px solid ${DIVIDER}`,
            borderRadius: 8, padding: "4px 7px", cursor: "pointer", color: TEXT.lo,
            display: "flex", alignItems: "center",
          }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 18px 4px" }}>

          {/* 1. Verdict header */}
          <div style={{ marginBottom: 18 }}>
            {/* Chips row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 11 }}>
              <Chip label={pMeta.label} color={pMeta.color} />
              {staleD >= 1 && (
                <Chip
                  label={`Зависла · ${staleD}д`}
                  color={YELLOW}
                  icon={<AlertTriangle style={{ width: 10, height: 10 }} />}
                />
              )}
              {task.dueDate && (
                <Chip
                  label={`до ${fmtShortDate(task.dueDate)}`}
                  color={TEXT.lo}
                  icon={<Calendar style={{ width: 10, height: 10 }} />}
                />
              )}
            </div>

            {/* Title */}
            <h2 style={{
              fontFamily: HF, fontSize: 18, fontWeight: 700,
              color: TEXT.hi, lineHeight: 1.3, margin: 0, marginBottom: 12,
            }}>
              {task.title}
            </h2>

            {/* Submitter row */}
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "10px 12px", borderRadius: 10,
              background: `${ACCENT}08`, border: `1px solid ${ACCENT}18`,
            }}>
              <Avatar name={task.assigneeName} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: TEXT.hi, fontFamily: HF }}>
                  Сдал: {task.assigneeName} · {task.assigneeRole}
                </div>
                <div style={{ fontSize: 11, color: TEXT.dim, fontFamily: HF, marginTop: 2 }}>
                  {task.submittedAt ? fmtDateTime(task.submittedAt) : fmtDateTime(task.lastActivityAt)}
                  {" "}· {waitLabel}
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: DIVIDER, marginBottom: 18 }} />

          {/* 2. Что сделано */}
          <div style={{ marginBottom: 18 }}>
            <SectionLabel label="Что сделано" />
            {task.resultNote ? (
              <p style={{ fontSize: 13, color: TEXT.mid, lineHeight: 1.65, fontFamily: HF, margin: 0, marginBottom: 12 }}>
                {task.resultNote}
              </p>
            ) : (
              <p style={{ fontSize: 12, color: TEXT.dim, fontFamily: HF, fontStyle: "italic", margin: 0, marginBottom: 12 }}>
                Исполнитель не оставил отчёт о выполнении
              </p>
            )}
            {/* File + AI check buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 8,
                    fontSize: 12, fontWeight: 600, fontFamily: HF,
                    background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30`,
                    textDecoration: "none",
                  }}
                >
                  <FileText style={{ width: 12, height: 12 }} />
                  {fileLabel}
                  <ExternalLink style={{ width: 10, height: 10, opacity: 0.6 }} />
                </a>
              )}
              {!fileUrl && task.resultNote && (
                <button
                  onClick={() => toast.info("Ссылка на файл не найдена в отчёте")}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 8,
                    fontSize: 12, fontWeight: 600, fontFamily: HF,
                    background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30`,
                    cursor: "pointer",
                  }}
                >
                  <FileText style={{ width: 12, height: 12 }} />
                  Открыть результат
                </button>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: DIVIDER, marginBottom: 18 }} />

          {/* 3. Соответствие задаче */}
          <div style={{ marginBottom: 18 }}>
            <ChecklistSection
              taskId={task.id}
              taskBody={task.body}
              resultNote={task.resultNote}
            />
          </div>

          <div style={{ height: 1, background: DIVIDER, marginBottom: 18 }} />

          {/* 4. Распределение */}
          <div style={{ marginBottom: 18 }}>
            <DistributionSection taskId={task.id} />
          </div>

          {/* 5. Хроника */}
          <div style={{ marginBottom: 18 }}>
            <ChronicleSection taskId={task.id} />
          </div>
        </div>

        {/* ── Fixed footer ── */}
        <div style={{
          flexShrink: 0,
          borderTop: `1px solid ${DIVIDER}`,
          background: "rgba(8,14,26,0.95)",
        }}>
          {/* Return form (shown when returning) */}
          {returning && (
            <ReturnForm
              task={task}
              people={people}
              onCancel={() => setReturning(false)}
              onDone={onDone}
            />
          )}

          {/* Action buttons */}
          {!returning && (
            <div style={{ display: "flex", gap: 10, padding: "14px 16px" }}>
              {/* Вернуть */}
              <button
                onClick={() => setReturning(true)}
                style={{
                  flex: 1, minHeight: 52, borderRadius: 12,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${DIVIDER}`,
                  color: TEXT.lo, fontFamily: HF, cursor: "pointer",
                  transition: "all 150ms",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${RED}10`;
                  e.currentTarget.style.border = `1px solid ${RED}30`;
                  e.currentTarget.style.color = RED;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.border = `1px solid ${DIVIDER}`;
                  e.currentTarget.style.color = TEXT.lo;
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700 }}>
                  <RotateCcw style={{ width: 14, height: 14 }} />
                  Вернуть
                </div>
                <div style={{ fontSize: 10, marginTop: 2, opacity: 0.65 }}>нужна причина</div>
              </button>

              {/* Принять */}
              <button
                onClick={() => accept({ params: { id: task.id } })}
                disabled={isAccepting}
                style={{
                  flex: 1, minHeight: 52, borderRadius: 12,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: "linear-gradient(135deg,#3ed9a0 0%,#2ab87f 100%)",
                  border: "none", color: "#05100f", fontFamily: HF,
                  cursor: isAccepting ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 16px rgba(62,217,160,0.30)",
                  opacity: isAccepting ? 0.7 : 1, transition: "opacity 150ms",
                }}
              >
                {isAccepting ? (
                  <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700 }}>
                      <CheckCircle2 style={{ width: 15, height: 15 }} />
                      Принять
                    </div>
                    <div style={{ fontSize: 10, marginTop: 2, opacity: 0.65 }}>уйдёт в архив</div>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
