import { useRef, useState, useEffect, useCallback } from "react";
import { useAiChat } from "@workspace/api-client-react";
import {
  Send, X, Loader2, Mic, MicOff, Volume2, Square,
  MessageSquare, Lightbulb, ClipboardList,
} from "lucide-react";
import { Link } from "wouter";
import { AiAnswer } from "@/components/ui/AiAnswer";

const HF = "'Hanken Grotesk', system-ui, sans-serif";
const ACCENT = "var(--jarvis-accent)";
const GLASS_BG = "rgba(4, 10, 22, 0.84)";
const GLASS_BLUR = "blur(24px) saturate(170%)";
const GLASS_BORDER = "rgba(0,212,255,0.15)";

interface Message {
  role: "user" | "assistant";
  text: string;
}

function getMimeType(): string {
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"])
    if (MediaRecorder.isTypeSupported(t)) return t;
  return "";
}

const QUICK = [
  "Сводка по портфелю",
  "Есть критичные узлы?",
  "Топ-3 по выручке",
];

export type DockPanel = "chat" | "thought" | null;

interface BottomDockProps {
  activePanel: DockPanel;
  onPanelChange: (p: DockPanel) => void;
}

export function BottomDock({ activePanel, onPanelChange }: BottomDockProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { mutate: sendMessage, isPending } = useAiChat({
    mutation: {
      onSuccess(data) {
        setMessages(prev => [...prev, { role: "assistant", text: data.reply }]);
      },
      onError() {
        setMessages(prev => [...prev, { role: "assistant", text: "Ошибка соединения. Попробуйте ещё раз." }]);
      },
    },
  });

  useEffect(() => {
    if (activePanel === "chat") setTimeout(() => inputRef.current?.focus(), 80);
  }, [activePanel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isPending) return;
    setInput("");
    if (activePanel !== "chat") onPanelChange("chat");
    setMessages(prev => {
      const history = prev.map(m => ({ role: m.role, content: m.text }));
      sendMessage({ data: { message: msg, history } });
      return [...prev, { role: "user" as const, text: msg }];
    });
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecordSeconds(0);
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  async function startRecording() {
    if (isRecording) { stopRecording(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = getMimeType();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/mp4" });
        if (blob.size < 1000) return;
        setIsTranscribing(true);
        try {
          const buf = await blob.arrayBuffer();
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          const resp = await fetch("/api/voice/transcribe", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: b64 }),
          });
          const data = await resp.json();
          if (data.text?.trim()) handleSend(data.text.trim());
        } catch { /* ignore */ }
        finally { setIsTranscribing(false); }
      };
      mr.start(200);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordSeconds(s => {
        if (s >= 59) { stopRecording(); return 0; }
        return s + 1;
      }), 1000);
    } catch { /* mic denied */ }
  }

  async function playMessage(idx: number, text: string) {
    if (playingIdx === idx) {
      audioRef.current?.pause(); audioRef.current = null; setPlayingIdx(null); return;
    }
    audioRef.current?.pause(); audioRef.current = null; setPlayingIdx(idx);
    try {
      const resp = await fetch("/api/voice/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await resp.json();
      if (!data.audio) { setPlayingIdx(null); return; }
      const binary = atob(data.audio);
      const bytes = new Uint8Array(binary.length).map((_, i) => binary.charCodeAt(i));
      const blob = new Blob([bytes], { type: "audio/mp3" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlayingIdx(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlayingIdx(null); URL.revokeObjectURL(url); };
      await audio.play();
    } catch { setPlayingIdx(null); }
  }

  const micBusy = isTranscribing || isPending;
  const chatOpen = activePanel === "chat";
  const thoughtOpen = activePanel === "thought";

  function togglePanel(panel: DockPanel) {
    onPanelChange(activePanel === panel ? null : panel);
  }

  return (
    <div
      className="absolute bottom-5 left-1/2 z-30 flex flex-col items-center"
      style={{
        transform: "translateX(-50%)",
        width: "min(560px, calc(100vw - 32px))",
      }}
    >
      {/* ── Chat panel (expands upward) ── */}
      {chatOpen && (
        <div
          className="w-full mb-2 flex flex-col rounded-2xl overflow-hidden"
          style={{
            background: GLASS_BG,
            backdropFilter: GLASS_BLUR,
            WebkitBackdropFilter: GLASS_BLUR,
            border: `1px solid ${isRecording ? "rgba(239,68,68,0.4)" : GLASS_BORDER}`,
            boxShadow: "0 0 48px rgba(0,212,255,0.07), 0 8px 32px rgba(0,0,0,0.55)",
            height: 360,
          }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" style={{ color: ACCENT }} />
              <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: "rgba(228,232,255,0.35)", fontFamily: HF }}>
                Ассистент
              </span>
            </div>
            <button
              onClick={() => onPanelChange(null)}
              className="p-1 rounded transition-colors"
              style={{ color: "rgba(228,232,255,0.25)" }}
              aria-label="Закрыть"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollbarWidth: "none" }}>
            {messages.length === 0 && !isPending && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-[11px] font-mono text-center" style={{ color: "rgba(228,232,255,0.18)", fontFamily: HF }}>
                  Спросите про любую компанию
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK.map(q => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="transition-all"
                      style={{
                        fontSize: 11, fontFamily: HF, fontWeight: 500,
                        padding: "5px 12px", borderRadius: 999,
                        background: "rgba(0,212,255,0.07)",
                        border: "1px solid rgba(0,212,255,0.18)",
                        color: "rgba(0,212,255,0.7)",
                        cursor: "pointer",
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="rounded-xl"
                  style={
                    m.role === "user"
                      ? {
                          maxWidth: "82%",
                          background: "rgba(0,212,255,0.10)",
                          border: "1px solid rgba(0,212,255,0.18)",
                          color: "rgba(255,255,255,0.9)",
                          padding: "7px 12px",
                          fontSize: 13, lineHeight: 1.5, fontFamily: HF,
                        }
                      : {
                          maxWidth: "90%",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          padding: "10px 13px 8px",
                        }
                  }
                >
                  {m.role === "assistant" ? <AiAnswer markdown={m.text} compact /> : m.text}
                  {m.role === "assistant" && (
                    <div className="mt-1.5 flex justify-end">
                      <button
                        onClick={() => playMessage(i, m.text)}
                        className="flex items-center gap-1 transition-colors"
                        style={{ fontSize: 10, fontFamily: HF, color: playingIdx === i ? "rgba(0,212,255,0.9)" : "rgba(255,255,255,0.18)" }}
                        title={playingIdx === i ? "Стоп" : "Прослушать"}
                      >
                        {playingIdx === i ? <Square className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: ACCENT }} />
                  <span className="text-xs font-mono" style={{ color: "rgba(228,232,255,0.25)", fontFamily: HF }}>анализирую…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input row */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 border-t border-white/5 flex-shrink-0"
            style={{ background: "rgba(0,0,0,0.2)" }}
          >
            <button
              onClick={startRecording}
              disabled={micBusy}
              className="flex-shrink-0 p-1 rounded transition-colors disabled:opacity-40"
              style={{ color: isRecording ? "rgb(239,68,68)" : "rgba(0,212,255,0.45)" }}
              title={isRecording ? `Стоп (${recordSeconds}с)` : "Голос"}
            >
              {isTranscribing
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isRecording
                ? <MicOff className="w-4 h-4 animate-pulse" />
                : <Mic className="w-4 h-4" />}
            </button>
            {isRecording
              ? <span className="flex-1 text-xs font-mono animate-pulse" style={{ color: "rgba(239,68,68,0.8)", fontFamily: HF }}>Запись… {recordSeconds}с</span>
              : (
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={isTranscribing ? "Распознаю речь…" : "Спросить про компанию…"}
                  disabled={isPending || isTranscribing}
                  className="flex-1 bg-transparent outline-none text-sm font-mono min-w-0"
                  style={{ color: "rgba(228,232,255,0.82)", fontFamily: HF }}
                />
              )}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isPending || isRecording}
              className="flex-shrink-0 p-1 transition-colors disabled:opacity-20"
              style={{ color: ACCENT }}
              aria-label="Отправить"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Thought panel (stub) ── */}
      {thoughtOpen && (
        <div
          className="w-full mb-2 flex flex-col items-center justify-center rounded-2xl"
          style={{
            height: 160,
            background: GLASS_BG,
            backdropFilter: GLASS_BLUR,
            WebkitBackdropFilter: GLASS_BLUR,
            border: `1px solid rgba(149,165,245,0.14)`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          }}
        >
          <button
            onClick={() => onPanelChange(null)}
            className="absolute top-3 right-3 p-1 rounded"
            style={{ color: "rgba(228,232,255,0.2)" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <Lightbulb className="w-6 h-6 mb-3" style={{ color: "rgba(149,165,245,0.35)" }} />
          <span className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: "rgba(149,165,245,0.35)", fontFamily: HF, letterSpacing: "0.1em" }}>
            Скоро
          </span>
          <span className="text-[11px] mt-1.5" style={{ color: "rgba(228,232,255,0.18)", fontFamily: HF }}>
            Фиксация мыслей — в следующем шаге
          </span>
        </div>
      )}

      {/* ── Pill row ── */}
      <div
        className="flex items-center gap-1.5 rounded-2xl p-1.5"
        style={{
          background: GLASS_BG,
          backdropFilter: GLASS_BLUR,
          WebkitBackdropFilter: GLASS_BLUR,
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* Спросить */}
        <DockPill
          icon={<MessageSquare className="w-4 h-4" />}
          label="Спросить"
          active={chatOpen}
          accentColor={ACCENT}
          onClick={() => togglePanel("chat")}
        />

        {/* Мысль */}
        <DockPill
          icon={<Lightbulb className="w-4 h-4" />}
          label="Мысль"
          active={thoughtOpen}
          accentColor="rgba(149,165,245,0.9)"
          onClick={() => togglePanel("thought")}
        />

        {/* Задача → navigates to /tasks */}
        <Link href="/tasks">
          <DockPill
            icon={<ClipboardList className="w-4 h-4" />}
            label="Задача"
            active={false}
            accentColor="rgba(62,217,160,0.9)"
            onClick={() => {}}
            isLink
          />
        </Link>
      </div>
    </div>
  );
}

interface DockPillProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  accentColor: string;
  onClick: () => void;
  isLink?: boolean;
}

function DockPill({ icon, label, active, accentColor, onClick, isLink }: DockPillProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 transition-all duration-200"
      style={{
        height: 40,
        padding: "0 16px",
        borderRadius: 14,
        background: active ? `${accentColor}18` : "transparent",
        border: `1px solid ${active ? `${accentColor}40` : "transparent"}`,
        color: active ? accentColor : "rgba(228,232,255,0.40)",
        fontFamily: HF,
        fontSize: 13,
        fontWeight: 500,
        cursor: isLink ? "pointer" : "pointer",
        whiteSpace: "nowrap",
        transition: "background 150ms, border-color 150ms, color 150ms",
      }}
    >
      <span style={{ opacity: active ? 1 : 0.6, transition: "opacity 150ms" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
