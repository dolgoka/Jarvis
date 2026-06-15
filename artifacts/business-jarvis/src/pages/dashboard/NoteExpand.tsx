import { useState } from "react";
import {
  ArrowLeft, Loader2, Save, ClipboardList, Sparkles,
} from "lucide-react";
import {
  useExpandNote, useUpdateNote,
  type Note, type NoteExpandInputMode,
} from "@workspace/api-client-react";
import { AiAnswer } from "@/components/ui/AiAnswer";

const HF = "'Hanken Grotesk', system-ui, sans-serif";
const ACCENT_NOTE = "rgba(149,165,245,0.9)";
const GREEN = "rgba(62,217,160,0.9)";

interface Chip {
  mode: NoteExpandInputMode;
  emoji: string;
  label: string;
}

const CHIPS: Chip[] = [
  { mode: "develop",   emoji: "💭", label: "Развить"       },
  { mode: "steps",     emoji: "🪜", label: "Шаги"          },
  { mode: "risks",     emoji: "⚠️", label: "Риски"         },
  { mode: "route",     emoji: "👤", label: "Кому"          },
  { mode: "summarize", emoji: "🧵", label: "Свести"        },
];

interface NoteExpandProps {
  note: Note;
  onBack: () => void;
  onCreateTask: (text: string) => void;
}

export function NoteExpand({ note, onBack, onCreateTask }: NoteExpandProps) {
  const [activeMode, setActiveMode] = useState<NoteExpandInputMode | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { mutate: expandNote, isPending: isExpanding } = useExpandNote({
    mutation: {
      onSuccess(data) {
        setResultText(data.text);
        setSaved(false);
      },
    },
  });

  const { mutate: updateNote, isPending: isSaving } = useUpdateNote({
    mutation: {
      onSuccess() { setSaved(true); },
    },
  });

  function handleChip(mode: NoteExpandInputMode) {
    setActiveMode(mode);
    setResultText(null);
    setSaved(false);
    expandNote({ data: { mode }, params: { id: note.id } });
  }

  function handleSaveResult() {
    if (!resultText) return;
    updateNote({ data: { aiSummary: resultText }, params: { id: note.id } });
  }

  function handleToTask() {
    const text = resultText ?? note.body;
    onCreateTask(text);
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-white/5 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[11px] font-mono transition-colors hover:opacity-80"
          style={{ color: "rgba(228,232,255,0.35)", fontFamily: HF }}
          aria-label="Назад к списку"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Назад
        </button>
        <div className="w-px h-3 bg-white/10 mx-0.5" />
        <div
          className="flex items-center gap-1.5"
          style={{ color: ACCENT_NOTE }}
        >
          <Sparkles className="w-3 h-3" />
          <span className="text-[11px] font-mono uppercase tracking-widest" style={{ fontFamily: HF }}>
            Разогнать
          </span>
        </div>
      </div>

      {/* ── Source note ── */}
      <div
        className="mx-3 mt-2.5 mb-0 px-3 py-2 rounded-xl flex-shrink-0"
        style={{
          background: "rgba(149,165,245,0.04)",
          border: "1px solid rgba(149,165,245,0.10)",
        }}
      >
        <p
          className="text-[12px] leading-relaxed"
          style={{
            color: "rgba(228,232,255,0.38)",
            fontFamily: HF,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}
        >
          {note.body}
        </p>
      </div>

      {/* ── Mode chips ── */}
      <div className="flex gap-1.5 px-3 py-2.5 flex-wrap flex-shrink-0">
        {CHIPS.map(chip => {
          const isActive = activeMode === chip.mode;
          return (
            <button
              key={chip.mode}
              onClick={() => handleChip(chip.mode)}
              disabled={isExpanding}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[12px] font-medium transition-all disabled:opacity-50"
              style={{
                background: isActive
                  ? "rgba(149,165,245,0.15)"
                  : "rgba(255,255,255,0.04)",
                border: isActive
                  ? "1px solid rgba(149,165,245,0.30)"
                  : "1px solid rgba(255,255,255,0.07)",
                color: isActive ? ACCENT_NOTE : "rgba(228,232,255,0.45)",
                fontFamily: HF,
                cursor: isExpanding ? "not-allowed" : "pointer",
              }}
            >
              <span>{chip.emoji}</span>
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* ── Result area ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-2" style={{ scrollbarWidth: "none", minHeight: 0 }}>
        {isExpanding && (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: ACCENT_NOTE }} />
            <span className="text-[12px] font-mono" style={{ color: "rgba(228,232,255,0.25)", fontFamily: HF }}>
              разгоняю…
            </span>
          </div>
        )}

        {!isExpanding && resultText && (
          <div
            className="rounded-xl p-3"
            style={{
              background: "rgba(149,165,245,0.04)",
              border: "1px solid rgba(149,165,245,0.12)",
            }}
          >
            <AiAnswer markdown={resultText} compact />
          </div>
        )}

        {!isExpanding && !resultText && !activeMode && (
          <p
            className="text-[12px] text-center py-6 leading-relaxed"
            style={{ color: "rgba(228,232,255,0.18)", fontFamily: HF }}
          >
            Выберите режим выше —<br />ИИ развернёт мысль за секунды
          </p>
        )}
      </div>

      {/* ── Action bar (only when result is ready) ── */}
      {resultText && !isExpanding && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 border-t border-white/5 flex-shrink-0"
          style={{ background: "rgba(0,0,0,0.15)" }}
        >
          <button
            onClick={handleSaveResult}
            disabled={isSaving || saved}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold disabled:opacity-40 transition-all"
            style={{
              background: saved ? "rgba(149,165,245,0.06)" : "rgba(149,165,245,0.12)",
              border: "1px solid rgba(149,165,245,0.22)",
              color: saved ? "rgba(149,165,245,0.4)" : ACCENT_NOTE,
              fontFamily: HF,
            }}
          >
            {isSaving
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Save className="w-3 h-3" />
            }
            {saved ? "Сохранено" : "Сохранить итог"}
          </button>

          <button
            onClick={handleToTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
            style={{
              background: "rgba(62,217,160,0.08)",
              border: "1px solid rgba(62,217,160,0.22)",
              color: GREEN,
              fontFamily: HF,
            }}
          >
            <ClipboardList className="w-3 h-3" />
            В задачу
          </button>
        </div>
      )}
    </div>
  );
}
