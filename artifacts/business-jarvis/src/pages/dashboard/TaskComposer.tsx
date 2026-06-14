import { useState, useRef } from "react";
import { X, Mic, Loader2, Check, Plus, ChevronDown } from "lucide-react";
import {
  useDraftTask, useCreateTask, useListPeople,
  type Person, type TaskDraftPriority,
} from "@workspace/api-client-react";
import { toast } from "sonner";

const HF = "'Hanken Grotesk', system-ui, sans-serif";
const ACCENT = "var(--jarvis-accent)";
const GREEN = "rgba(62,217,160,0.9)";

type Priority = TaskDraftPriority;

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
}

const PRIORITY_CFG: { value: Priority; label: string; color: string }[] = [
  { value: "high",   label: "🔴 Срочно",  color: "#f0625a" },
  { value: "medium", label: "🟡 Важно",   color: "#f0b54a" },
  { value: "low",    label: "🟢 Обычное", color: "#3ed9a0" },
];

export function TaskComposer({ onClose }: TaskComposerProps) {
  const [phase, setPhase] = useState<"input" | "draft">("input");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showWatcherPicker, setShowWatcherPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: people = [] } = useListPeople();

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
        toast.success(`Отправлено → ${data.assigneeRole}`, {
          description: data.title,
          duration: 4000,
        });
        onClose();
      },
      onError() {
        toast.error("Ошибка при отправке задачи");
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

  // ── Input phase ──────────────────────────────────────────────────────────
  if (phase === "input") {
    return (
      <div className="glass w-full mb-2 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0">
          <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: "rgba(228,232,255,0.30)", fontFamily: HF }}>
            Постановщик задач
          </span>
          <button onClick={onClose} className="p-1 rounded" style={{ color: "rgba(228,232,255,0.25)" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

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
          <button
            disabled
            className="flex-shrink-0 p-1.5 rounded opacity-20"
            style={{ color: "rgba(0,212,255,0.6)" }}
            title="Голос — Шаг 5"
          >
            <Mic className="w-4 h-4" />
          </button>
          <div className="flex-1" />
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
        </div>
      </div>
    );
  }

  // ── Draft phase ──────────────────────────────────────────────────────────
  if (!draft) return null;
  const prioConfig = PRIORITY_CFG.find(p => p.value === draft.priority) ?? PRIORITY_CFG[1]!;

  return (
    <div
      className="glass w-full mb-2 flex flex-col overflow-hidden"
      style={{ maxHeight: 480 }}
      onClick={e => { if (e.target === e.currentTarget) closePickers(); }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0">
        <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: "rgba(228,232,255,0.30)", fontFamily: HF }}>
          Черновик задачи
        </span>
        <button onClick={onClose} className="p-1 rounded" style={{ color: "rgba(228,232,255,0.25)" }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

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

// ── PeoplePicker ─────────────────────────────────────────────────────────────

interface PeoplePickerProps {
  people: Person[];
  search: string;
  onSearch: (s: string) => void;
  onSelect: (p: Person) => void;
  onClose: () => void;
}

function PeoplePicker({ people, search, onSearch, onSelect }: PeoplePickerProps) {
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
