import { useState, useRef, useEffect, useCallback } from "react";
import { Shell } from "@/components/layout/Shell";
import { useAiChat } from "@workspace/api-client-react";
import { Loader2, Mic, MicOff, Volume2, Square, Plus, ArrowUp } from "lucide-react";
import { AiAnswer } from "@/components/ui/AiAnswer";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const SUGGESTED = [
  "У какого бизнеса самая высокая маржа?",
  "Сравни выручку по всем компаниям",
  "Какой узел требует внимания прямо сейчас?",
  "Дай краткий статус по каждому бизнесу",
];

const HF = "'Hanken Grotesk', system-ui, sans-serif";

function getMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

/* Waveform SVG icon (like ChatGPT voice button) */
function WaveformIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2"  y="9"  width="2.5" height="6"  rx="1.25" fill="currentColor" opacity="0.5"/>
      <rect x="6"  y="5"  width="2.5" height="14" rx="1.25" fill="currentColor" opacity="0.7"/>
      <rect x="10" y="2"  width="2.5" height="20" rx="1.25" fill="currentColor"/>
      <rect x="14" y="5"  width="2.5" height="14" rx="1.25" fill="currentColor" opacity="0.7"/>
      <rect x="18" y="9"  width="2.5" height="6"  rx="1.25" fill="currentColor" opacity="0.5"/>
    </svg>
  );
}

export default function AiChat() {
  const initialMessage = (() => {
    try {
      const v = new URLSearchParams(window.location.search).get("message");
      return v ? decodeURIComponent(v) : "";
    } catch { return ""; }
  })();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialMessage);
  const [focused, setFocused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      onSuccess: (data) => {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.reply,
          timestamp: data.timestamp,
        }]);
      },
      onError: () => {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "Ошибка связи — не удалось обработать запрос. Попробуй ещё раз.",
          timestamp: new Date().toISOString(),
        }]);
      },
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  /* Auto-resize textarea */
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isPending) return;
    setInput("");
    setMessages(prev => {
      const history = prev.map(m => ({ role: m.role, content: m.content }));
      sendMessage({ data: { message: msg, history } });
      return [...prev, { role: "user" as const, content: msg, timestamp: new Date().toISOString() }];
    });
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecordSeconds(0);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
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
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: b64 }),
          });
          const data = await resp.json();
          if (data.text?.trim()) handleSend(data.text.trim());
        } catch {
          console.error("transcribe error");
        } finally {
          setIsTranscribing(false);
        }
      };
      mr.start(200);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds(s => {
        if (s >= 59) { stopRecording(); return 0; }
        return s + 1;
      }), 1000);
    } catch {
      console.error("mic access denied");
    }
  }

  async function playMessage(idx: number, text: string) {
    if (playingIdx === idx) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingIdx(null);
      return;
    }
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingIdx(idx);
    try {
      const resp = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await resp.json();
      if (!data.audio) { setPlayingIdx(null); return; }
      const binary = atob(data.audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/mp3" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlayingIdx(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlayingIdx(null); URL.revokeObjectURL(url); };
      await audio.play();
    } catch {
      setPlayingIdx(null);
    }
  }

  const micBusy = isTranscribing || isPending;
  const isEmpty = messages.length === 0;
  const hasInput = input.trim().length > 0;

  return (
    <Shell>
      <div
        className="h-full flex flex-col"
        style={{ fontFamily: HF, background: "#0d0d10" }}
      >

        {/* ── Messages (only when there are messages) ── */}
        {!isEmpty && (
          <div
            className="flex-1 overflow-y-auto py-8"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.07) transparent" }}
          >
            <div className="max-w-[720px] mx-auto px-4 space-y-6">
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "user" ? (
                    /* User bubble — right-aligned pill */
                    <div className="flex justify-end">
                      <div
                        className="rounded-[22px] px-5 py-3 text-sm leading-relaxed"
                        style={{
                          maxWidth: "72%",
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.09)",
                          color: "rgba(255,255,255,0.9)",
                          fontFamily: HF,
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    /* Assistant — left-aligned, no bubble */
                    <div className="flex gap-3">
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5"
                        style={{
                          background: "linear-gradient(135deg, #0dd4ff 0%, #1a6bff 100%)",
                          color: "#000",
                          letterSpacing: "-0.03em",
                        }}
                      >
                        J
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <AiAnswer markdown={msg.content} />
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.18)" }}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <button
                            onClick={() => playMessage(i, msg.content)}
                            className="transition-opacity hover:opacity-100"
                            style={{ color: playingIdx === i ? "#0dd4ff" : "rgba(255,255,255,0.20)", opacity: 0.7 }}
                            title={playingIdx === i ? "Остановить" : "Прослушать"}
                          >
                            {playingIdx === i
                              ? <Square className="w-3 h-3" />
                              : <Volume2 className="w-3 h-3" />
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isPending && (
                <div className="flex gap-3">
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{
                      background: "linear-gradient(135deg, #0dd4ff 0%, #1a6bff 100%)",
                      color: "#000",
                    }}
                  >
                    J
                  </div>
                  <div className="flex items-center gap-1.5 pt-1.5">
                    {[0, 150, 300].map(d => (
                      <span
                        key={d}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: "rgba(255,255,255,0.30)", animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        )}

        {/* ── Empty state: centered heading ── */}
        {isEmpty && (
          <div className="flex-1 flex flex-col items-center justify-end pb-8 px-4">
            <div className="max-w-[600px] w-full text-center mb-8">
              <h1
                className="text-3xl font-semibold mb-1"
                style={{ color: "rgba(255,255,255,0.88)", letterSpacing: "-0.02em", fontFamily: HF }}
              >
                Чем могу помочь?
              </h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.28)", fontFamily: HF }}>
                JARVIS · полный доступ к портфелю
              </p>
            </div>
          </div>
        )}

        {/* ── Suggested prompts (only when empty) ── */}
        {isEmpty && (
          <div className="px-4 pb-4">
            <div className="max-w-[720px] mx-auto grid grid-cols-2 gap-2">
              {SUGGESTED.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="text-left text-sm px-4 py-3 transition-all duration-150"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14,
                    color: "rgba(255,255,255,0.55)",
                    fontFamily: HF,
                    lineHeight: 1.4,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.75)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input bar ── */}
        <div className="px-4 pb-5 flex-shrink-0">
          <div className="max-w-[720px] mx-auto">
            <div
              className="flex items-end gap-2 px-3 py-2.5 transition-all duration-150"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${focused ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 26,
                boxShadow: focused ? "0 0 0 3px rgba(255,255,255,0.03)" : "none",
              }}
            >
              {/* "+" button */}
              <button
                className="flex items-center justify-center w-8 h-8 flex-shrink-0 transition-all duration-150 mb-0.5"
                style={{
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.50)",
                  cursor: "pointer",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                title="Прикрепить файл"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Textarea */}
              {isRecording ? (
                <div
                  className="flex-1 flex items-center gap-2 py-1.5 animate-pulse"
                  style={{ color: "rgba(240,98,90,0.85)", fontSize: 14, fontFamily: HF }}
                >
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                  Запись… {recordSeconds}с
                </div>
              ) : (
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={isTranscribing ? "Распознаю речь…" : "Спросите JARVIS"}
                  disabled={isPending || isTranscribing}
                  className="flex-1 bg-transparent outline-none resize-none overflow-hidden text-sm leading-relaxed py-1.5"
                  style={{
                    color: "rgba(255,255,255,0.88)",
                    fontFamily: HF,
                    caretColor: "#0dd4ff",
                    minHeight: 28,
                    maxHeight: 160,
                  }}
                />
              )}

              {/* Right side controls */}
              <div className="flex items-center gap-1.5 flex-shrink-0 mb-0.5">
                {/* Mic icon button */}
                <button
                  onClick={startRecording}
                  disabled={micBusy && !isRecording}
                  className="flex items-center justify-center w-8 h-8 transition-all duration-150 disabled:opacity-30"
                  style={{
                    borderRadius: "50%",
                    background: isRecording ? "rgba(240,98,90,0.15)" : "transparent",
                    border: isRecording ? "1px solid rgba(240,98,90,0.35)" : "1px solid transparent",
                    color: isRecording ? "#f0625a" : "rgba(255,255,255,0.35)",
                    cursor: "pointer",
                  }}
                  title={isRecording ? `Остановить (${recordSeconds}с)` : "Голосовой ввод"}
                >
                  {isTranscribing
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : isRecording
                    ? <MicOff className="w-4 h-4 animate-pulse" />
                    : <Mic className="w-4 h-4" />
                  }
                </button>

                {/* "Голос" pill button OR Send button */}
                {hasInput || isPending ? (
                  /* Send button when there's text */
                  <button
                    onClick={() => handleSend()}
                    disabled={!hasInput || isPending}
                    className="flex items-center justify-center w-8 h-8 transition-all duration-150 disabled:opacity-30"
                    style={{
                      borderRadius: "50%",
                      background: hasInput && !isPending ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.12)",
                      border: "none",
                      color: "#0d0d10",
                      cursor: "pointer",
                    }}
                    title="Отправить"
                  >
                    {isPending
                      ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#0d0d10" }} />
                      : <ArrowUp className="w-4 h-4" />
                    }
                  </button>
                ) : (
                  /* Voice pill button when input is empty */
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-1.5 px-3 h-8 transition-all duration-150"
                    style={{
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "rgba(255,255,255,0.55)",
                      cursor: "pointer",
                      fontSize: 13,
                      fontFamily: HF,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.11)";
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.75)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)";
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)";
                    }}
                    title="Голосовой ввод"
                  >
                    <WaveformIcon size={14} />
                    Голос
                  </button>
                )}
              </div>
            </div>

            <p
              className="text-center text-[11px] mt-2"
              style={{ color: "rgba(255,255,255,0.15)", fontFamily: HF }}
            >
              JARVIS может допускать ошибки. Проверяйте важную информацию.
            </p>
          </div>
        </div>

      </div>
    </Shell>
  );
}
