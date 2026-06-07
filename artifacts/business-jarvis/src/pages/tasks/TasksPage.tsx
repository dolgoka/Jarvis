import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { useListTasks, useListPeople, useCreateTask, useDraftTask } from "@workspace/api-client-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, Mic, MicOff, Send, X, ClipboardList,
  ChevronDown, Check,
} from "lucide-react";

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

function statusConfig(status: string, stuckDays?: number | null) {
  if (status === "accepted") return { label: "Принята", cls: "border-green-500/40 text-green-400 bg-green-500/8" };
  if (status === "stuck") return { label: `Встала · ${stuckDays ?? 0} дн.`, cls: "border-red-500/40 text-red-400 bg-red-500/8" };
  return { label: "Ждёт принятия", cls: "border-yellow-500/40 text-yellow-400 bg-yellow-500/8" };
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-xs";
  return (
    <div className={`${sz} rounded-full flex-shrink-0 flex items-center justify-center font-mono font-bold`}
      style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)", color: "rgba(0,212,255,0.8)" }}>
      {initials(name)}
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: Task }) {
  const { label, cls } = statusConfig(task.status, task.stuckDays);
  return (
    <div className="rounded-2xl border border-primary/12 bg-black/40 p-5 space-y-3 hover:border-primary/25 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-mono text-white leading-snug">{task.title}</h3>
        <Badge variant="outline" className={`text-[10px] font-mono whitespace-nowrap flex-shrink-0 ${cls}`}>
          {label}
        </Badge>
      </div>

      {task.description && (
        <p className="text-xs text-white/40 font-mono leading-relaxed line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Avatar name={task.assigneeName} />
          <div>
            <div className="text-xs font-mono text-white/70">{task.assigneeName}</div>
            <div className="text-[10px] font-mono text-white/30">{task.assigneeRole}</div>
          </div>
        </div>

        {task.linkedPeople && task.linkedPeople.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-white/25">+</span>
            {task.linkedPeople.slice(0, 3).map(p => (
              <Avatar key={p.id} name={p.name} size="sm" />
            ))}
            {task.linkedPeople.length > 3 && (
              <span className="text-[10px] font-mono text-white/30 ml-1">+{task.linkedPeople.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="text-[9px] font-mono text-white/20 pt-0.5">
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
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-black/30 px-4 py-3 hover:border-primary/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          {selected && <Avatar name={selected.name} size="sm" />}
          <div className="text-left">
            <div className="text-sm font-mono text-white">{selected?.name ?? "Выбрать..."}</div>
            {selected && <div className="text-[10px] font-mono text-white/35">{selected.role}</div>}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-primary/40 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-xl border border-primary/20 bg-[#0a1628] shadow-2xl overflow-hidden">
          {people.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange(p.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-primary/10 transition-colors text-left"
            >
              <Avatar name={p.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-mono text-white">{p.name}</div>
                <div className="text-[10px] font-mono text-white/35">{p.role}</div>
              </div>
              {p.id === value && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Composer panel ────────────────────────────────────────────────────────────

type ComposerState = "idle" | "input" | "draft" | "saving";

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

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full md:max-w-xl md:mx-6 rounded-t-3xl md:rounded-2xl overflow-hidden"
        style={{ background: "rgba(4,10,22,0.97)", border: "1px solid rgba(0,212,255,0.18)", boxShadow: "0 0 60px rgba(0,212,255,0.08)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/12">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono uppercase tracking-widest text-primary/80">
              {state === "draft" ? "Черновик — проверьте" : "Новая задача"}
            </span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* ── Input stage ── */}
          {state === "input" && (
            <>
              <div className="relative">
                <textarea
                  className="w-full rounded-xl border border-primary/20 bg-black/30 px-4 py-3 text-sm font-mono text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-primary/50 transition-colors"
                  rows={4}
                  placeholder="Надиктуйте или напишите задачу в свободной форме…"
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  disabled={busy}
                />
                {voice.isTranscribing && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] font-mono text-primary/60">
                    <Loader2 className="w-3 h-3 animate-spin" /> транскрипция…
                  </div>
                )}
              </div>

              {error && <p className="text-xs font-mono text-red-400">{error}</p>}

              <div className="flex items-center gap-3">
                {/* Mic button */}
                <button
                  type="button"
                  onClick={voice.toggle}
                  disabled={voice.isTranscribing || isDrafting}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-mono text-xs transition-all ${
                    voice.isRecording
                      ? "border-red-500/60 bg-red-500/10 text-red-400 animate-pulse"
                      : "border-primary/20 bg-black/30 text-white/50 hover:border-primary/40 hover:text-white/80"
                  }`}
                >
                  {voice.isRecording
                    ? <><MicOff className="w-3.5 h-3.5" /> {voice.recordSeconds}с</>
                    : <><Mic className="w-3.5 h-3.5" /> Диктовать</>}
                </button>

                <button
                  type="button"
                  onClick={handleDraft}
                  disabled={busy || !rawText.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-mono text-sm transition-all"
                  style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)", color: "rgba(0,212,255,0.9)" }}
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
                <label className="text-[10px] font-mono uppercase tracking-widest text-primary/50">Заголовок</label>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                  className="w-full rounded-xl border border-primary/20 bg-black/30 px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-primary/50">Описание</label>
                <textarea
                  value={draftDesc}
                  onChange={e => setDraftDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-primary/20 bg-black/30 px-4 py-2.5 text-sm font-mono text-white resize-none focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-primary/50">Исполнитель</label>
                <AssigneeSelect value={draftAssigneeId} onChange={setDraftAssigneeId} people={people} />
              </div>

              {/* Linked people */}
              {draft.linkedPeople && draft.linkedPeople.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-primary/50">Доп. участники</label>
                  <div className="flex flex-wrap gap-2">
                    {draft.linkedPeople.map(p => (
                      <div key={p.id} className="flex items-center gap-1.5 rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-1.5">
                        <Avatar name={p.name} size="sm" />
                        <span className="text-xs font-mono text-white/60">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-xs font-mono text-red-400">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setState("input"); setError(""); }}
                  className="flex-1 py-2.5 rounded-xl font-mono text-xs text-white/40 border border-white/10 hover:border-white/20 hover:text-white/60 transition-colors"
                >
                  ← Изменить текст
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSaving || !draftTitle.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-mono text-sm transition-all"
                  style={{ background: "rgba(0,212,255,0.15)", border: "1px solid rgba(0,212,255,0.35)", color: "rgba(0,212,255,1)" }}
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
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-light text-white tracking-tight">Задачи</h1>
            <p className="text-xs font-mono text-white/30 mt-1">
              {typedTasks.length} задач · {stuck.length > 0 ? `${stuck.length} встали` : "нет блокеров"}
            </p>
          </div>
          <button
            onClick={() => setComposerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-sm transition-all"
            style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.28)", color: "rgba(0,212,255,0.9)" }}
          >
            <Plus className="w-4 h-4" /> Новая задача
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && typedTasks.length === 0 && (
          <div className="rounded-2xl border border-primary/10 bg-black/20 p-10 text-center space-y-3">
            <ClipboardList className="w-8 h-8 text-primary/20 mx-auto" />
            <p className="text-sm font-mono text-white/25">Задач пока нет</p>
            <button
              onClick={() => setComposerOpen(true)}
              className="text-xs font-mono text-primary/60 hover:text-primary transition-colors underline underline-offset-2"
            >
              Создать первую
            </button>
          </div>
        )}

        {/* Stuck */}
        {stuck.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-red-400/60">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Встали · {stuck.length}
            </div>
            {stuck.map(t => <TaskCard key={t.id} task={t} />)}
          </section>
        )}

        {/* Waiting */}
        {waiting.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-yellow-400/60">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              Ждут принятия · {waiting.length}
            </div>
            {waiting.map(t => <TaskCard key={t.id} task={t} />)}
          </section>
        )}

        {/* Accepted */}
        {accepted.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-green-400/60">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Приняты · {accepted.length}
            </div>
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
