import { useState, useRef } from "react";
import { X, Loader2, Check, Plus, ChevronDown, RotateCcw, CheckCircle2 } from "lucide-react";
import { VoiceCapture } from "@/components/ui/VoiceCapture";
import {
  useDraftTask, useCreateTask, useListPeople, useListTasks,
  useAcceptTask, useReturnTask,
  type Person, type TaskDraftPriority, type Task,
} from "@workspace/api-client-react";
import { toast } from "sonner";

const HF = "'Hanken Grotesk', system-ui, sans-serif";
const ACCENT = "var(--jarvis-accent)";
const GREEN = "rgba(62,217,160,0.9)";
const AMBER = "rgba(240,181,74,0.9)";

type Priority = TaskDraftPriority;
type Tab = "new" | "review";

interface Draft {
  title: string;
  body: string;
  assigneeId: number;
  assigneeName: string;
  assigneeRole: string;
  watchers: Person[];
  priority: Priority;
  dueDate: string | null;
  rationale: string;
}

interface TaskComposerProps {
  onClose: () => void;
  prefillText?: string;
}

const PRIORITY_CFG: { value: Priority; label: string; color: string }[] = [
  { value: "high",   label: "🔴 Срочно",  color: "#f0625a" },
  { value: "medium", label: "🟡 Важно",   color: "#f0b54a" },
  { value: "low",    label: "🟢 Обычное", color: "#3ed9a0" },
];

function isStale(lastActivityAt: string): boolean {
  return Date.now() - new Date(lastActivityAt).getTime() > 24 * 60 * 60 * 1000;
}

function formatAge(lastActivityAt: string): string {
  const diff = Date.now() - new Date(lastActivityAt).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин. назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}ч. назад`;
  return `${Math.floor(hrs / 24)}д. назад`;
}

export function TaskComposer({ onClose, prefillText }: TaskComposerProps) {
  const [tab, setTab]   = useState<Tab>("new");
  const [phase, setPhase] = useState<"input" | "draft">("input");
  const [text, setText]   = useState(prefillText ?? "");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showWatcherPicker, setShowWatcherPicker]   = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [returnState, setReturnState] = useState<Record<number, { open: boolean; comment: string }>>({});

  const { data: people = [] } = useListPeople();
  const { data: reviewTasks = [], refetch: refetchReview } = useListTasks({ box: "review" });

  const { mutate: acceptTaskMutate, isPending: isAccepting } = useAcceptTask({
    mutation: {
      onSuccess(data) {
        toast.success("Принято", { description: data.title, duration: 3000 });
        void refetchReview();
      },
      onError() {
        toast.error("Не удалось принять задачу");
      },
    },
  });

  const { mutate: returnTaskMutate, isPending: isReturning } = useReturnTask({
    mutation: {
      onSuccess(data) {
        toast.success("Возвращено на доработку", { description: data.title, duration: 3000 });
        setReturnState({});
        void refetchReview();
      },
      onError() {
        toast.error("Не удалось вернуть задачу");
      },
    },
  });

  const { mutate: draftTask, isPending: isDrafting } = useDraftTask({
    mutation: {
      onSuccess(data) {
        setDraft({
          title: data.title,
          body: data.body,
          assigneeId: data.assigneeId,
          assigneeName: data.assigneeName,
          assigneeRole: data.assigneeRole,
          watchers: data.watchers ?? [],
          priority: data.priority ?? "medium",
          dueDate: data.dueDate ?? null,
          rationale: data.rationale ?? "",
        });
        setPhase("draft");
      },
      onError() {
        toast.error("Не удалось оформить задачу — попробуйте ещё раз");
      },
    },
  });

  const { mutate: createTask, isPending: isSending } = useCreateTask({
    mutation: {
      onSuccess(data) {
        toast.success(`Отправлено → ${data.assigneeRole}`, { description: data.title, duration: 4000 });
        onClose();
      },
      onError(err) {
        console.error("[TaskComposer] createTask failed:", err);
        toast.error("Не удалось отправить задачу", {
          description: err instanceof Error ? err.message : String(err),
        });
      },
    },
  });

  function handleDraft() {
    if (!text.trim() || isDrafting) return;
    draftTask({ data: { text: text.trim() } });
  }

  function handleSend() {
    if (!draft || isSending) return;
    createTask({
      data: {
        title: draft.title,
        body: draft.body,
        assigneeId: draft.assigneeId,
        watchers: draft.watchers.map(w => w.id),
        priority: draft.priority,
        dueDate: draft.dueDate ?? null,
      },
    });
  }

  function handleAccept(taskId: number) {
    acceptTaskMutate({ params: { id: taskId } });
  }

  function handleReturn(taskId: number) {
    const st = returnState[taskId];
    if (!st?.comment?.trim()) return;
    returnTaskMutate({ data: { comment: st.comment.trim() }, params: { id: taskId } });
  }

  function toggleReturn(taskId: number) {
    setReturnState(prev => ({
      ...prev,
      [taskId]: prev[taskId]
        ? { ...prev[taskId]!, open: !prev[taskId]!.open }
        : { open: true, comment: "" },
    }));
  }

  function setReturnComment(taskId: number, comment: string) {
    setReturnState(prev => ({
      ...prev,
      [taskId]: { ...(prev[taskId] ?? { open: true }), comment },
    }));
  }

  function selectAssignee(person: Person) {
    if (!draft) return;
    setDraft({ ...draft, assigneeId: person.id, assigneeName: person.name, assigneeRole: person.role });
    setShowAssigneePicker(false);
    setPickerSearch("");
  }

  function addWatcher(person: Person) {
    if (!draft) return;
    if (draft.watchers.some(w => w.id === person.id) || person.id === draft.assigneeId) return;
    setDraft({ ...draft, watchers: [...draft.watchers, person] });
    setShowWatcherPicker(false);
    setPickerSearch("");
  }

  function removeWatcher(id: number) {
    if (!draft) return;
    setDraft({ ...draft, watchers: draft.watchers.filter(w => w.id !== id) });
  }

  function filteredPeople(excludeIds: number[]) {
    return people
      .filter(p => !excludeIds.includes(p.id))
      .filter(p => !pickerSearch || p.role.toLowerCase().includes(pickerSearch.toLowerCase()))
      .sort((a, b) => (b.isInnerCircle ? 1 : 0) - (a.isInnerCircle ? 1 : 0));
  }

  function closePickers() {
    setShowAssigneePicker(false);
    setShowWatcherPicker(false);
    setPickerSearch("");
  }

  const reviewCount = reviewTasks.length;

  // ── Shared header (tabs + close) ────────────────────────────────────────────
  const sharedHeader = (
    <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 flex-shrink-0">
      <div className="flex items-center gap-0.5">
        <TabBtn active={tab === "new"} onClick={() => setTab("new")}>Новая</TabBtn>
        <TabBtn active={tab === "review"} onClick={() => setTab("review")}>
          <span className="flex items-center gap-1.5">
            На приёмке
            {reviewCount > 0 && (
              <span
                className="inline-flex items-center justify-center rounded-full font-semibold"
                style={{
                  background: "rgba(240,181,74,0.18)",
                  border: "1px solid rgba(240,181,74,0.30)",
                  color: AMBER,
                  fontFamily: HF,
                  fontSize: 9,
                  minWidth: 16,
                  height: 16,
                  paddingInline: 4,
                }}
              >
                {reviewCount}
              </span>
            )}
          </span>
        </TabBtn>
      </div>
      <button onClick={onClose} className="p-1 rounded" style={{ color: "rgba(228,232,255,0.25)" }}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // ── Review tab ───────────────────────────────────────────────────────────────
  if (tab === "review") {
    return (
      <div className="glass w-full mb-2 flex flex-col" style={{ maxHeight: 480 }}>
        {sharedHeader}

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {reviewTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <CheckCircle2 className="w-7 h-7" style={{ color: "rgba(62,217,160,0.30)" }} />
              <p style={{ color: "rgba(228,232,255,0.25)", fontFamily: HF, fontSize: 12 }}>
                Нет задач на приёмке
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-3">
              {reviewTasks.map((task: Task) => {
                const st = returnState[task.id];
                const returnOpen = st?.open ?? false;
                const returnComment = st?.comment ?? "";
                const stale = isStale(task.lastActivityAt);
                const acting = isAccepting || isReturning;

                return (
                  <div
                    key={task.id}
                    className="rounded-xl flex flex-col gap-2.5 p-3"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.065)",
                    }}
                  >
                    {/* Task header */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-semibold leading-snug truncate"
                          style={{ color: "rgba(228,232,255,0.88)", fontFamily: HF, fontSize: 13 }}
                        >
                          {task.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span style={{ color: ACCENT, fontFamily: HF, fontSize: 11 }}>
                            {task.assigneeRole}
                          </span>
                          <span style={{ color: "rgba(228,232,255,0.20)", fontSize: 10 }}>·</span>
                          <span style={{ color: "rgba(228,232,255,0.28)", fontFamily: HF, fontSize: 11 }}>
                            {formatAge(task.lastActivityAt)}
                          </span>
                          {stale && (
                            <span
                              className="inline-flex items-center rounded-full px-1.5 py-0.5"
                              style={{
                                background: "rgba(240,181,74,0.10)",
                                border: "1px solid rgba(240,181,74,0.25)",
                                color: AMBER,
                                fontFamily: HF,
                                fontSize: 9,
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                              }}
                            >
                              зависла
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAccept(task.id)}
                        disabled={acting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-30 transition-all"
                        style={{
                          background: "rgba(62,217,160,0.08)",
                          border: "1px solid rgba(62,217,160,0.25)",
                          color: GREEN,
                          fontFamily: HF,
                          fontSize: 12,
                        }}
                      >
                        {isAccepting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Принять
                      </button>
                      <button
                        onClick={() => toggleReturn(task.id)}
                        disabled={acting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-30 transition-all"
                        style={{
                          background: returnOpen ? "rgba(240,181,74,0.12)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${returnOpen ? "rgba(240,181,74,0.30)" : "rgba(255,255,255,0.07)"}`,
                          color: returnOpen ? AMBER : "rgba(228,232,255,0.38)",
                          fontFamily: HF,
                          fontSize: 12,
                        }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Вернуть
                      </button>
                    </div>

                    {/* Return comment field */}
                    {returnOpen && (
                      <div className="flex flex-col gap-1.5">
                        <textarea
                          autoFocus
                          rows={2}
                          value={returnComment}
                          onChange={e => setReturnComment(task.id, e.target.value)}
                          placeholder="Причина возврата…"
                          className="w-full bg-transparent outline-none resize-none rounded-lg px-2.5 py-2 text-xs"
                          style={{
                            background: "rgba(240,181,74,0.04)",
                            border: "1px solid rgba(240,181,74,0.18)",
                            color: "rgba(228,232,255,0.75)",
                            fontFamily: HF,
                            lineHeight: 1.5,
                            fontSize: 12,
                          }}
                        />
                        <button
                          onClick={() => handleReturn(task.id)}
                          disabled={!returnComment.trim() || acting}
                          className="self-end flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold disabled:opacity-30 transition-all"
                          style={{
                            background: "rgba(240,181,74,0.10)",
                            border: "1px solid rgba(240,181,74,0.28)",
                            color: AMBER,
                            fontFamily: HF,
                            fontSize: 12,
                          }}
                        >
                          {isReturning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          Отправить
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── New tab — input phase ────────────────────────────────────────────────────
  if (phase === "input") {
    return (
      <div className="glass w-full mb-2 flex flex-col">
        {sharedHeader}

        <div className="px-4 pt-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleDraft(); }}
            placeholder="Опишите задачу обычными словами…"
            rows={3}
            autoFocus
            className="w-full bg-transparent outline-none resize-none"
            style={{
              color: "rgba(228,232,255,0.88)",
              fontFamily: HF,
              lineHeight: 1.6,
              fontSize: 13,
            }}
          />
          <p className="text-[11px] pb-3" style={{ color: "rgba(228,232,255,0.18)", fontFamily: HF }}>
            Пример: Срочно согласовать NDA с Сингапуром — до пятницы
          </p>
        </div>

        <div
          className="flex items-center gap-2 px-3 py-2.5 border-t border-white/5 flex-shrink-0"
          style={{ background: "rgba(0,0,0,0.15)" }}
        >
          <VoiceCapture
            onText={t => {
              setText(prev => prev ? prev + " " + t : t);
              textareaRef.current?.focus();
            }}
            onActiveChange={setVoiceActive}
            accentColor="rgba(0,212,255,0.6)"
          />
          {!voiceActive && <div className="flex-1" />}
          {!voiceActive && (
            <button
              onClick={handleDraft}
              disabled={!text.trim() || isDrafting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-30 transition-all"
              style={{
                background: ACCENT + "18",
                border: `1px solid ${ACCENT}40`,
                color: ACCENT,
                fontFamily: HF,
                fontSize: 13,
              }}
            >
              {isDrafting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Оформить
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── New tab — draft phase ────────────────────────────────────────────────────
  if (!draft) return null;
  const prioConfig = PRIORITY_CFG.find(p => p.value === draft.priority) ?? PRIORITY_CFG[1]!;
  void prioConfig;

  return (
    <div
      className="glass w-full mb-2 flex flex-col overflow-hidden"
      style={{ maxHeight: 480 }}
      onClick={e => { if (e.target === e.currentTarget) closePickers(); }}
    >
      {sharedHeader}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5" style={{ scrollbarWidth: "none" }}>
        {/* Title */}
        <input
          value={draft.title}
          onChange={e => setDraft({ ...draft, title: e.target.value })}
          className="w-full bg-transparent outline-none font-semibold"
          style={{ color: "rgba(228,232,255,0.92)", fontFamily: HF, fontSize: 14 }}
        />

        {/* Body */}
        <textarea
          value={draft.body}
          onChange={e => setDraft({ ...draft, body: e.target.value })}
          rows={3}
          className="w-full bg-transparent outline-none resize-none text-xs"
          style={{
            color: "rgba(228,232,255,0.50)",
            fontFamily: HF,
            lineHeight: 1.6,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: 10,
          }}
        />

        {/* Assignee */}
        <div className="relative">
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: "rgba(228,232,255,0.20)", fontFamily: HF }}>
            Исполнитель
          </div>
          <button
            onClick={() => { setShowAssigneePicker(v => !v); setShowWatcherPicker(false); setPickerSearch(""); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
            style={{
              background: "rgba(0,212,255,0.07)",
              border: "1px solid rgba(0,212,255,0.20)",
              color: ACCENT,
              fontFamily: HF,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {draft.assigneeRole}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>
          {draft.rationale && (
            <p className="text-[10px] leading-relaxed mt-1.5" style={{ color: "rgba(228,232,255,0.22)", fontFamily: HF }}>
              {draft.rationale}
            </p>
          )}
          {showAssigneePicker && (
            <PeoplePicker
              people={filteredPeople([draft.assigneeId])}
              search={pickerSearch}
              onSearch={setPickerSearch}
              onSelect={selectAssignee}
              onClose={() => { setShowAssigneePicker(false); setPickerSearch(""); }}
            />
          )}
        </div>

        {/* Watchers */}
        <div className="relative">
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: "rgba(228,232,255,0.20)", fontFamily: HF }}>
            Подключить
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {draft.watchers.map(w => (
              <span
                key={w.id}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(149,165,245,0.07)",
                  border: "1px solid rgba(149,165,245,0.18)",
                  color: "rgba(149,165,245,0.75)",
                  fontFamily: HF,
                  fontSize: 11,
                }}
              >
                {w.role}
                <button onClick={() => removeWatcher(w.id)} className="opacity-40 hover:opacity-80 transition-opacity ml-0.5">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <button
              onClick={() => { setShowWatcherPicker(v => !v); setShowAssigneePicker(false); setPickerSearch(""); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full transition-all"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px dashed rgba(255,255,255,0.10)",
                color: "rgba(228,232,255,0.30)",
                fontFamily: HF,
                fontSize: 11,
              }}
            >
              <Plus className="w-3 h-3" />
              Добавить
            </button>
          </div>
          {showWatcherPicker && (
            <PeoplePicker
              people={filteredPeople([draft.assigneeId, ...draft.watchers.map(w => w.id)])}
              search={pickerSearch}
              onSearch={setPickerSearch}
              onSelect={addWatcher}
              onClose={() => { setShowWatcherPicker(false); setPickerSearch(""); }}
            />
          )}
        </div>

        {/* Priority segment */}
        <div>
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: "rgba(228,232,255,0.20)", fontFamily: HF }}>
            Приоритет
          </div>
          <div className="flex gap-1.5">
            {PRIORITY_CFG.map(p => (
              <button
                key={p.value}
                onClick={() => setDraft({ ...draft, priority: p.value })}
                className="flex-1 py-1.5 rounded-xl font-medium transition-all"
                style={{
                  background: draft.priority === p.value ? `${p.color}15` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${draft.priority === p.value ? `${p.color}50` : "rgba(255,255,255,0.06)"}`,
                  color: draft.priority === p.value ? p.color : "rgba(228,232,255,0.30)",
                  fontFamily: HF,
                  fontSize: 11,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div>
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: "rgba(228,232,255,0.20)", fontFamily: HF }}>
            Срок
          </div>
          <input
            type="date"
            value={draft.dueDate ?? ""}
            onChange={e => setDraft({ ...draft, dueDate: e.target.value || null })}
            className="bg-transparent outline-none rounded-full px-3 py-1.5"
            style={{
              border: "1px solid rgba(255,255,255,0.09)",
              color: draft.dueDate ? "rgba(228,232,255,0.65)" : "rgba(228,232,255,0.22)",
              fontFamily: HF,
              fontSize: 12,
              colorScheme: "dark",
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-t border-white/5 flex-shrink-0"
        style={{ background: "rgba(0,0,0,0.15)" }}
      >
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-xl transition-all"
          style={{
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(228,232,255,0.30)",
            fontFamily: HF,
            fontSize: 12,
          }}
        >
          Отмена
        </button>
        <button
          onClick={() => { setPhase("input"); setDraft(null); closePickers(); }}
          className="px-3 py-1.5 rounded-xl transition-all"
          style={{
            border: "1px solid rgba(255,255,255,0.05)",
            color: "rgba(228,232,255,0.20)",
            fontFamily: HF,
            fontSize: 12,
          }}
        >
          ← Изменить
        </button>
        <div className="flex-1" />
        <button
          onClick={handleSend}
          disabled={isSending}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40 transition-all"
          style={{
            background: "rgba(62,217,160,0.10)",
            border: "1px solid rgba(62,217,160,0.32)",
            color: GREEN,
            fontFamily: HF,
            fontSize: 13,
          }}
        >
          {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Отправить
        </button>
      </div>
    </div>
  );
}

// ── TabBtn ────────────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg transition-all"
      style={{
        background: active ? "rgba(0,212,255,0.09)" : "transparent",
        border: `1px solid ${active ? "rgba(0,212,255,0.22)" : "transparent"}`,
        color: active ? "rgba(0,212,255,0.90)" : "rgba(228,232,255,0.30)",
        fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
        fontSize: 11,
        fontWeight: active ? 600 : 400,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </button>
  );
}

// ── PeoplePicker ─────────────────────────────────────────────────────────────

interface PeoplePickerProps {
  people: Person[];
  search: string;
  onSearch: (s: string) => void;
  onSelect: (p: Person) => void;
  onClose: () => void;
}

function PeoplePicker({ people, search, onSearch, onSelect }: PeoplePickerProps) {
  const HF = "'Hanken Grotesk', system-ui, sans-serif";
  return (
    <div
      className="glass absolute left-0 right-0 z-50 mt-1"
      style={{ maxHeight: 180, display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <input
        autoFocus
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="Поиск по роли…"
        className="flex-shrink-0 bg-transparent outline-none px-3 py-2 border-b border-white/5"
        style={{ color: "rgba(228,232,255,0.75)", fontFamily: HF, fontSize: 12 }}
      />
      <div className="overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {people.length === 0 && (
          <div className="px-3 py-3 text-center" style={{ color: "rgba(228,232,255,0.22)", fontFamily: HF, fontSize: 11 }}>
            Нет результатов
          </div>
        )}
        {people.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
            style={{ background: "transparent" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <span style={{ color: "rgba(228,232,255,0.75)", fontFamily: HF, fontSize: 12 }}>
              {p.role}
            </span>
            {p.isInnerCircle && (
              <span style={{ color: "rgba(0,212,255,0.45)", fontSize: 9 }}>★</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
