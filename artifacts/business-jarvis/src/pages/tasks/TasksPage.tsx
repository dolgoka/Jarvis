import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { useListTasks, useListPeople, useCreateTask, useDraftTask } from "@workspace/api-client-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { LiquidFilters } from "@/components/liquid/LiquidFilters";
import {
  Loader2, Plus, Mic, MicOff, Send, X, ClipboardList,
  ChevronDown, Check,
} from "lucide-react";

const HF = "'Hanken Grotesk', system-ui, sans-serif";

// ── Types (inferred from codegen) ─────────────────────────────────────────────
type Person = { id: number; name: string; role: string; email?: string | null };
type Task = {
  id: number; title: string; description: string;
  assigneeId: number; assigneeName: string; assigneeRole: string;
  linkedPeople: Person[]; status: string;
  createdAt: string; acceptedAt?: string | null; stuckDays?: number | null;
};
type TaskDraft = {
  title: string; description: string;
  assigneeId: number; assigneeName: string; assigneeRole: string;
  linkedPeopleIds: number[]; linkedPeople: Person[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// Traffic-light status colours
const STATUS_COLORS = {
  stuck:    "#f0625a",
  waiting:  "#f0b54a",
  accepted: "#3ed9a0",
};

function statusPill(status: string, stuckDays?: number | null) {
  const color = status === "accepted" ? STATUS_COLORS.accepted
    : status === "stuck" ? STATUS_COLORS.stuck
    : STATUS_COLORS.waiting;
  const label = status === "accepted" ? "Принята"
    : status === "stuck" ? `Встала · ${stuckDays ?? 0} дн.`
    : "Ждёт принятия";
  return { color, label };
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-xs";
  return (
    <div
      className={`${sz} rounded-full flex-shrink-0 flex items-center justify-center font-semibold`}
      style={{
        fontFamily: HF,
        background: "rgba(139,124,255,0.18)",
        border: "1.5px solid rgba(139,124,255,0.40)",
        color: "#8b7cff",
      }}
    >
      {initials(name)}
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: Task }) {
  const { color, label } = statusPill(task.status, task.stuckDays);
  return (
    <div className="glass p-5 space-y-3">
      {/* Title + status pill */}
      <div className="flex items-start justify-between gap-3">
        <h3
          className="text-sm font-semibold leading-snug"
          style={{ fontFamily: HF, color: "rgba(228,232,255,0.90)" }}
        >
          {task.title}
        </h3>
        <span
          className="text-[11px] font-semibold whitespace-nowrap flex-shrink-0 px-2.5 py-0.5 rounded-full"
          style={{
            fontFamily: HF,
            background: `${color}1e`,
            border: `1px solid ${color}48`,
            color,
          }}
        >
          {label}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p
          className="text-xs leading-relaxed line-clamp-2"
          style={{ fontFamily: HF, color: "rgba(228,232,255,0.48)" }}
        >
          {task.description}
        </p>
      )}

      {/* Assignee + linked people */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Avatar name={task.assigneeName} />
          <div>
            <div
              className="text-xs font-medium"
              style={{ fontFamily: HF, color: "rgba(228,232,255,0.65)" }}
            >
              {task.assigneeName}
            </div>
            <div
              className="text-[10px]"
              style={{ fontFamily: HF, color: "rgba(228,232,255,0.32)" }}
            >
              {task.assigneeRole}
            </div>
          </div>
        </div>

        {task.linkedPeople && task.linkedPeople.length > 0 && (
          <div className="flex items-center gap-1">
            <span style={{ fontSize: 10, color: "rgba(228,232,255,0.25)", fontFamily: HF }}>+</span>
            {task.linkedPeople.slice(0, 3).map(p => (
              <Avatar key={p.id} name={p.name} size="sm" />
            ))}
            {task.linkedPeople.length > 3 && (
              <span
                className="ml-1 text-[10px]"
                style={{ fontFamily: HF, color: "rgba(228,232,255,0.32)" }}
              >
                +{task.linkedPeople.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Date */}
      <div
        className="text-[10px] pt-0.5"
        style={{ fontFamily: HF, color: "rgba(228,232,255,0.35)" }}
      >
        {new Date(task.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
      </div>
    </div>
  );
}

// ── Assignee selector ─────────────────────────────────────────────────────────

function AssigneeSelect({
  value, onChange, people,
}: { value: number; onChange: (id: number) => void; people: Person[] }) {
  const [open, setOpen] = useState(false);
  const selected = people.find(p => p.id === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-xl px-4 py-3 transition-all duration-200"
        style={{
          fontFamily: HF,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(228,232,255,0.85)",
        }}
        onFocus={e => { e.currentTarget.style.border = "1px solid rgba(139,124,255,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,124,255,0.12)"; }}
        onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
      >
        <div className="flex items-center gap-2">
          {selected && <Avatar name={selected.name} size="sm" />}
          <div className="text-left">
            <div className="text-sm font-medium" style={{ fontFamily: HF, color: "rgba(228,232,255,0.85)" }}>
              {selected?.name ?? "Выбрать..."}
            </div>
            {selected && (
              <div className="text-[10px]" style={{ fontFamily: HF, color: "rgba(228,232,255,0.35)" }}>
                {selected.role}
              </div>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "rgba(228,232,255,0.30)" }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 top-full mt-1 w-full rounded-xl overflow-hidden"
          style={{
            background: "#0f0f1a",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          }}
        >
          {people.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange(p.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors"
              style={{ fontFamily: HF }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,124,255,0.10)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <Avatar name={p.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: "rgba(228,232,255,0.85)" }}>{p.name}</div>
                <div className="text-[10px]" style={{ color: "rgba(228,232,255,0.35)" }}>{p.role}</div>
              </div>
              {p.id === value && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#8b7cff" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Composer panel ────────────────────────────────────────────────────────────

type ComposerState = "idle" | "input" | "draft" | "saving";

// Shared field style helpers
const fieldStyle = (error = false) => ({
  fontFamily: HF,
  background: "rgba(255,255,255,0.04)",
  border: error ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.08)",
  color: "rgba(228,232,255,0.88)",
  caretColor: "#8b7cff",
  outline: "none",
  transition: "border 0.2s, box-shadow 0.2s",
} as React.CSSProperties);

function TaskComposer({ people, onClose, onCreated }: {
  people: Person[];
  onClose: () => void;
  onCreated: () => void;
}) {
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
      setDraftDesc(typed.description);
      setDraftAssigneeId(typed.assigneeId);
      setState("draft");
    } catch {
      setError("Не удалось оформить черновик. Попробуйте ещё раз.");
    }
  }

  async function handleSend() {
    if (!draftTitle.trim() || !draftAssigneeId) return;
    setState("saving");
    try {
      await createTask({ data: { title: draftTitle, description: draftDesc, assigneeId: draftAssigneeId, linkedPeopleIds: draft?.linkedPeopleIds ?? [] } });
      onCreated();
      onClose();
    } catch {
      setError("Ошибка сохранения");
      setState("draft");
    }
  }

  const busy = isDrafting || isSaving || voice.isTranscribing;

  // Focus/blur handlers for fields
  function onFocusField(e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) {
    e.currentTarget.style.border = "1px solid rgba(139,124,255,0.5)";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,124,255,0.12)";
  }
  function onBlurField(e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) {
    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
    e.currentTarget.style.boxShadow = "none";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="glass relative w-full md:max-w-xl md:mx-6 rounded-t-3xl md:rounded-[22px] overflow-hidden"
        style={{ maxHeight: "90dvh", overflowY: "auto" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-4 h-4" style={{ color: "#8b7cff" }} />
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: HF, color: "rgba(228,232,255,0.85)" }}
            >
              {state === "draft" ? "Черновик — проверьте" : "Новая задача"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: "rgba(228,232,255,0.28)" }}
            onMouseEnter={e => { e.currentTarget.style.color = "rgba(228,232,255,0.65)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(228,232,255,0.28)"; }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* ── Input stage ── */}
          {state === "input" && (
            <>
              <div className="relative">
                <textarea
                  className="w-full rounded-xl px-4 py-3 text-sm resize-none"
                  style={{ ...fieldStyle(), minHeight: 100, placeholder: "color: rgba(228,232,255,0.25)" }}
                  rows={4}
                  placeholder="Надиктуйте или напишите задачу в свободной форме…"
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  disabled={busy}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                />
                {voice.isTranscribing && (
                  <div
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px]"
                    style={{ fontFamily: HF, color: "rgba(139,124,255,0.70)" }}
                  >
                    <Loader2 className="w-3 h-3 animate-spin" /> транскрипция…
                  </div>
                )}
              </div>

              {error && (
                <p className="text-xs" style={{ fontFamily: HF, color: "rgba(239,68,68,0.85)" }}>
                  {error}
                </p>
              )}

              <div className="flex items-center gap-3">
                {/* Mic button */}
                <button
                  type="button"
                  onClick={voice.toggle}
                  disabled={voice.isTranscribing || isDrafting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={{
                    fontFamily: HF,
                    background: voice.isRecording ? "rgba(240,98,90,0.12)" : "rgba(255,255,255,0.04)",
                    border: voice.isRecording ? "1px solid rgba(240,98,90,0.45)" : "1px solid rgba(255,255,255,0.10)",
                    color: voice.isRecording ? "#f0625a" : "rgba(228,232,255,0.50)",
                    animation: voice.isRecording ? "pulse 1.5s ease-in-out infinite" : "none",
                  }}
                >
                  {voice.isRecording
                    ? <><MicOff className="w-3.5 h-3.5" /> {voice.recordSeconds}с</>
                    : <><Mic className="w-3.5 h-3.5" /> Диктовать</>}
                </button>

                {/* Draft button */}
                <button
                  type="button"
                  onClick={handleDraft}
                  disabled={busy || !rawText.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: HF,
                    background: "linear-gradient(135deg, #8b7cff 0%, #6c6bff 100%)",
                    color: "#fff",
                    border: "none",
                    boxShadow: "0 4px 16px rgba(139,124,255,0.30)",
                  }}
                >
                  {isDrafting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Оформляю…</>
                    : "Оформить →"}
                </button>
              </div>
            </>
          )}

          {/* ── Draft edit stage ── */}
          {state === "draft" && draft && (
            <>
              {/* Title */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold"
                  style={{ fontFamily: HF, color: "rgba(228,232,255,0.38)" }}
                >
                  Заголовок
                </label>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm"
                  style={fieldStyle()}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold"
                  style={{ fontFamily: HF, color: "rgba(228,232,255,0.38)" }}
                >
                  Описание
                </label>
                <textarea
                  value={draftDesc}
                  onChange={e => setDraftDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl px-4 py-2.5 text-sm resize-none"
                  style={fieldStyle()}
                  onFocus={onFocusField}
                  onBlur={onBlurField}
                />
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold"
                  style={{ fontFamily: HF, color: "rgba(228,232,255,0.38)" }}
                >
                  Исполнитель
                </label>
                <AssigneeSelect value={draftAssigneeId} onChange={setDraftAssigneeId} people={people} />
              </div>

              {/* Linked people */}
              {draft.linkedPeople && draft.linkedPeople.length > 0 && (
                <div className="space-y-1.5">
                  <label
                    className="text-xs font-semibold"
                    style={{ fontFamily: HF, color: "rgba(228,232,255,0.38)" }}
                  >
                    Доп. участники
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {draft.linkedPeople.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                        style={{
                          background: "rgba(139,124,255,0.08)",
                          border: "1px solid rgba(139,124,255,0.20)",
                        }}
                      >
                        <Avatar name={p.name} size="sm" />
                        <span
                          className="text-xs"
                          style={{ fontFamily: HF, color: "rgba(228,232,255,0.58)" }}
                        >
                          {p.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs" style={{ fontFamily: HF, color: "rgba(239,68,68,0.85)" }}>
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => { setState("input"); setError(""); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={{
                    fontFamily: HF,
                    color: "rgba(228,232,255,0.40)",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "rgba(228,232,255,0.65)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.14)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(228,232,255,0.40)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; }}
                >
                  ← Изменить текст
                </button>

                {/* Send button */}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSaving || !draftTitle.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: HF,
                    background: "linear-gradient(135deg, #8b7cff 0%, #6c6bff 100%)",
                    color: "#fff",
                    border: "none",
                    boxShadow: "0 4px 16px rgba(139,124,255,0.30)",
                  }}
                >
                  {isSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Сохраняю…</>
                    : <><Send className="w-4 h-4" /> Отправить</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ color, pulse, label, count }: {
  color: string; pulse?: boolean; label: string; count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pulse ? "beacon-red" : ""}`}
        style={{ background: color }}
      />
      <span
        className="text-xs font-semibold"
        style={{ fontFamily: HF, color: `${color}99` }}
      >
        {label}
      </span>
      <span
        className="text-xs font-semibold"
        style={{ fontFamily: HF, color: `${color}55` }}
      >
        · {count}
      </span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [composerOpen, setComposerOpen] = useState(false);

  const { data: tasks, isLoading, refetch } = useListTasks({ query: {} });
  const { data: people } = useListPeople({ query: {} });

  const typedTasks = (tasks ?? []) as Task[];
  const typedPeople = (people ?? []) as Person[];

  const waiting  = typedTasks.filter(t => t.status === "waiting");
  const accepted = typedTasks.filter(t => t.status === "accepted");
  const stuck    = typedTasks.filter(t => t.status === "stuck");

  return (
    <Shell>
      <LiquidFilters />
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold"
              style={{ fontFamily: HF, color: "rgba(228,232,255,0.92)" }}
            >
              Задачи
            </h1>
            <p
              className="text-xs mt-1"
              style={{ fontFamily: HF, color: "rgba(228,232,255,0.32)" }}
            >
              {typedTasks.length} задач · {stuck.length > 0 ? `${stuck.length} встали` : "нет блокеров"}
            </p>
          </div>
          <button
            onClick={() => setComposerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0"
            style={{
              fontFamily: HF,
              background: "linear-gradient(135deg, #8b7cff 0%, #6c6bff 100%)",
              color: "#fff",
              border: "none",
              boxShadow: "0 4px 16px rgba(139,124,255,0.35)",
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(139,124,255,0.50)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(139,124,255,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <Plus className="w-4 h-4" /> Новая задача
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#8b7cff" }} />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && typedTasks.length === 0 && (
          <div
            className="glass p-10 text-center space-y-3"
          >
            <ClipboardList
              className="w-8 h-8 mx-auto"
              style={{ color: "rgba(228,232,255,0.18)" }}
            />
            <p
              className="text-sm"
              style={{ fontFamily: HF, color: "rgba(228,232,255,0.28)" }}
            >
              Задач пока нет
            </p>
            <button
              onClick={() => setComposerOpen(true)}
              className="text-xs font-medium underline underline-offset-2 transition-colors"
              style={{ fontFamily: HF, color: "#8b7cff" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#a89eff"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#8b7cff"; }}
            >
              Создать первую
            </button>
          </div>
        )}

        {/* Stuck */}
        {stuck.length > 0 && (
          <section className="space-y-3">
            <SectionHeader color={STATUS_COLORS.stuck} pulse label="Встали" count={stuck.length} />
            {stuck.map(t => <TaskCard key={t.id} task={t} />)}
          </section>
        )}

        {/* Waiting */}
        {waiting.length > 0 && (
          <section className="space-y-3">
            <SectionHeader color={STATUS_COLORS.waiting} label="Ждут принятия" count={waiting.length} />
            {waiting.map(t => <TaskCard key={t.id} task={t} />)}
          </section>
        )}

        {/* Accepted */}
        {accepted.length > 0 && (
          <section className="space-y-3">
            <SectionHeader color={STATUS_COLORS.accepted} label="Приняты" count={accepted.length} />
            {accepted.map(t => <TaskCard key={t.id} task={t} />)}
          </section>
        )}
      </div>

      {composerOpen && typedPeople.length > 0 && (
        <TaskComposer
          people={typedPeople}
          onClose={() => setComposerOpen(false)}
          onCreated={() => refetch()}
        />
      )}
    </Shell>
  );
}
