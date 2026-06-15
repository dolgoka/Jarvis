import { useState, useRef, useEffect } from "react";
import {
  X, Lightbulb, Pin, PinOff, Trash2, Pencil, Check, Sparkles, ClipboardList, Loader2,
} from "lucide-react";
import {
  useListNotes, useCreateNote, useUpdateNote, useDeleteNote,
  type Note,
} from "@workspace/api-client-react";
import { VoiceCapture } from "@/components/ui/VoiceCapture";

const HF = "'Hanken Grotesk', system-ui, sans-serif";
const ACCENT_NOTE = "rgba(149,165,245,0.9)";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ч назад`;
  return `${Math.floor(h / 24)}д назад`;
}

// ─── Note card ────────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: Note;
  onPin:    (id: number, val: boolean) => void;
  onSave:   (id: number, body: string)  => void;
  onDelete: (id: number) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

function NoteCard({ note, onPin, onSave, onDelete, isUpdating, isDeleting }: NoteCardProps) {
  const [expanded,  setExpanded]  = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [draft,     setDraft]     = useState(note.body);
  const [confirming, setConfirming] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // sync draft when note body changes externally
  useEffect(() => { setDraft(note.body); }, [note.body]);

  function startEdit() {
    setDraft(note.body);
    setEditing(true);
    setExpanded(true);
    setTimeout(() => {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }, 30);
  }

  function cancelEdit() {
    setDraft(note.body);
    setEditing(false);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== note.body) onSave(note.id, trimmed);
    setEditing(false);
  }

  function handleCardClick() {
    if (!editing) setExpanded(e => !e);
  }

  const isPinned = note.pinned;
  const isVoice  = note.source === "voice";

  return (
    <div
      className="rounded-xl flex flex-col transition-all"
      style={{
        background: isPinned ? "rgba(149,165,245,0.06)" : "rgba(255,255,255,0.03)",
        border: isPinned
          ? "1px solid rgba(149,165,245,0.2)"
          : "1px solid rgba(255,255,255,0.07)",
        marginBottom: 8,
        opacity: isDeleting ? 0.4 : 1,
      }}
    >
      {/* ── Card body ── */}
      <div
        className="px-3 pt-3 pb-1 cursor-pointer select-none"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleCardClick(); }}
        aria-expanded={expanded}
      >
        {/* top row: pin badge + time + voice badge */}
        <div className="flex items-center gap-1.5 mb-1.5">
          {isPinned && (
            <span
              className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest rounded-full px-1.5 py-0.5"
              style={{ background: "rgba(149,165,245,0.12)", color: "rgba(149,165,245,0.7)" }}
            >
              <Pin className="w-2.5 h-2.5" /> Закреплено
            </span>
          )}
          {isVoice && (
            <span
              className="text-[9px] font-mono uppercase tracking-widest rounded-full px-1.5 py-0.5"
              style={{ background: "rgba(0,212,255,0.08)", color: "rgba(0,212,255,0.5)" }}
            >
              🎙 голос
            </span>
          )}
          <span className="ml-auto text-[10px] font-mono" style={{ color: "rgba(228,232,255,0.25)" }}>
            {timeAgo(note.createdAt)}
          </span>
        </div>

        {/* body text / edit textarea */}
        {editing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Escape") { e.stopPropagation(); cancelEdit(); }
              if (e.key === "Enter" && e.metaKey) { e.stopPropagation(); commitEdit(); }
            }}
            onClick={e => e.stopPropagation()}
            rows={3}
            className="w-full bg-transparent outline-none resize-none text-[13px] leading-relaxed"
            style={{ color: "rgba(228,232,255,0.88)", fontFamily: HF }}
          />
        ) : (
          <p
            className="text-[13px] leading-relaxed"
            style={{
              color: "rgba(228,232,255,0.82)",
              fontFamily: HF,
              display: "-webkit-box",
              WebkitLineClamp: expanded ? undefined : 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: expanded ? "visible" : "hidden",
            }}
          >
            {note.body}
          </p>
        )}
      </div>

      {/* ── Actions (visible when expanded or editing) ── */}
      {(expanded || editing) && (
        <div
          className="flex items-center gap-1 px-2 pb-2 pt-1 flex-wrap"
          onClick={e => e.stopPropagation()}
        >
          {editing ? (
            <>
              <button
                onClick={commitEdit}
                disabled={!draft.trim() || isUpdating}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-30"
                style={{ background: "rgba(149,165,245,0.15)", color: ACCENT_NOTE, fontFamily: HF }}
              >
                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Сохранить
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] transition-all"
                style={{ color: "rgba(228,232,255,0.3)", fontFamily: HF }}
              >
                Отмена
              </button>
            </>
          ) : confirming ? (
            <>
              <span className="text-[11px] font-mono mr-1" style={{ color: "rgba(248,113,113,0.7)", fontFamily: HF }}>
                Удалить?
              </span>
              <button
                onClick={() => { setConfirming(false); onDelete(note.id); }}
                disabled={isDeleting}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-30"
                style={{ background: "rgba(248,113,113,0.15)", color: "rgba(248,113,113,0.85)", fontFamily: HF }}
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Да
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-2.5 py-1 rounded-lg text-[11px] transition-all"
                style={{ color: "rgba(228,232,255,0.3)", fontFamily: HF }}
              >
                Нет
              </button>
            </>
          ) : (
            <>
              {/* Stub: Разогнать */}
              <button
                title="TODO: Часть B — AI-разгон"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-all opacity-40 cursor-not-allowed"
                style={{ color: "rgba(149,165,245,0.8)", fontFamily: HF }}
                disabled
              >
                <Sparkles className="w-3 h-3" /> Разогнать
              </button>
              {/* Stub: В задачу */}
              <button
                title="TODO: Часть B — в задачу"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-all opacity-40 cursor-not-allowed"
                style={{ color: "rgba(62,217,160,0.8)", fontFamily: HF }}
                disabled
              >
                <ClipboardList className="w-3 h-3" /> В задачу
              </button>

              <div className="flex-1" />

              {/* Edit */}
              <button
                onClick={startEdit}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: "rgba(228,232,255,0.3)" }}
                title="Редактировать"
                aria-label="Редактировать мысль"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {/* Pin / Unpin */}
              <button
                onClick={() => onPin(note.id, !note.pinned)}
                disabled={isUpdating}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-30"
                style={{ color: isPinned ? "rgba(149,165,245,0.8)" : "rgba(228,232,255,0.3)" }}
                title={isPinned ? "Открепить" : "Закрепить"}
                aria-label={isPinned ? "Открепить мысль" : "Закрепить мысль"}
              >
                {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
              {/* Delete */}
              <button
                onClick={() => setConfirming(true)}
                className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                style={{ color: "rgba(248,113,113,0.45)" }}
                title="Удалить"
                aria-label="Удалить мысль"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── NotesDock ────────────────────────────────────────────────────────────────

interface NotesDockProps {
  onClose: () => void;
}

export function NotesDock({ onClose }: NotesDockProps) {
  const [inputText, setInputText]   = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceSource, setVoiceSource] = useState<"text" | "voice">("text");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: notes = [], refetch } = useListNotes();

  const { mutate: createNote, isPending: isSaving } = useCreateNote({
    mutation: {
      onSuccess() { setInputText(""); setVoiceSource("text"); void refetch(); },
    },
  });

  const updatingIds = useRef<Set<number>>(new Set());
  const [updatingSet, setUpdatingSet] = useState<Set<number>>(new Set());

  const deletingIds = useRef<Set<number>>(new Set());
  const [deletingSet, setDeletingSet] = useState<Set<number>>(new Set());

  const { mutate: updateNote } = useUpdateNote({
    mutation: {
      onMutate({ params }) {
        updatingIds.current.add(params.id);
        setUpdatingSet(new Set(updatingIds.current));
      },
      onSettled(_, __, { params }) {
        updatingIds.current.delete(params.id);
        setUpdatingSet(new Set(updatingIds.current));
        void refetch();
      },
    },
  });

  const { mutate: deleteNote } = useDeleteNote({
    mutation: {
      onMutate({ params }) {
        deletingIds.current.add(params.id);
        setDeletingSet(new Set(deletingIds.current));
      },
      onSettled(_, __, { params }) {
        deletingIds.current.delete(params.id);
        setDeletingSet(new Set(deletingIds.current));
        void refetch();
      },
    },
  });

  function handleSave() {
    const body = inputText.trim();
    if (!body) return;
    createNote({ data: { body, source: voiceSource } });
  }

  function handleVoiceText(text: string) {
    setInputText(text);
    setVoiceSource("voice");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handlePin(id: number, val: boolean) {
    updateNote({ data: { pinned: val }, params: { id } });
  }

  function handleSaveEdit(id: number, body: string) {
    updateNote({ data: { body }, params: { id } });
  }

  function handleDelete(id: number) {
    deleteNote({ params: { id } });
  }

  const isEmpty = notes.length === 0;

  return (
    <div className="glass w-full mb-2 flex flex-col" style={{ maxHeight: 460 }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-3.5 h-3.5" style={{ color: ACCENT_NOTE }} />
          <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: "rgba(228,232,255,0.35)", fontFamily: HF }}>
            Мысли
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded transition-colors"
          style={{ color: "rgba(228,232,255,0.25)" }}
          aria-label="Закрыть"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Input ── */}
      <div className="flex-shrink-0 px-3 pt-3 pb-0">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={e => { setInputText(e.target.value); setVoiceSource("text"); }}
          onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleSave(); }}
          placeholder="Запишите мысль…"
          rows={2}
          className="w-full bg-transparent outline-none resize-none text-[13px] leading-relaxed"
          style={{ color: "rgba(228,232,255,0.82)", fontFamily: HF }}
        />
        <div
          className="flex items-center gap-2 py-2 border-t border-white/5"
          style={{ background: "transparent" }}
        >
          <VoiceCapture
            onText={handleVoiceText}
            onActiveChange={setVoiceActive}
            accentColor={ACCENT_NOTE}
          />
          {!voiceActive && <div className="flex-1" />}
          {!voiceActive && (
            <button
              onClick={handleSave}
              disabled={!inputText.trim() || isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold disabled:opacity-30 transition-all"
              style={{
                background: "rgba(149,165,245,0.12)",
                border: "1px solid rgba(149,165,245,0.25)",
                color: ACCENT_NOTE,
                fontFamily: HF,
              }}
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              ↑ Сохранить
            </button>
          )}
        </div>
      </div>

      {/* ── Notes list ── */}
      <div
        className="flex-1 overflow-y-auto px-3 pb-3"
        style={{ scrollbarWidth: "none", minHeight: 0 }}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Lightbulb className="w-8 h-8" style={{ color: "rgba(149,165,245,0.15)" }} aria-hidden />
            <p className="text-[12px] text-center leading-relaxed" style={{ color: "rgba(228,232,255,0.22)", fontFamily: HF }}>
              Свалите сюда любую мысль —<br />голосом или текстом. Потом разгоним.
            </p>
          </div>
        ) : (
          notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onPin={handlePin}
              onSave={handleSaveEdit}
              onDelete={handleDelete}
              isUpdating={updatingSet.has(note.id)}
              isDeleting={deletingSet.has(note.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
