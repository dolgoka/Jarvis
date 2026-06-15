import { useState, useRef, useEffect, useCallback } from "react";
import { Shell } from "@/components/layout/Shell";
import { useAiChat } from "@workspace/api-client-react";
import { Send, Bot, User, Loader2, Mic, MicOff, Volume2, Square } from "lucide-react";
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

const P = "#5b8bd0";
const HF = "'Hanken Grotesk', system-ui, sans-serif";

function getMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export default function AiChat() {
  const initialMessage = (() => {
    try {
      const v = new URLSearchParams(window.location.search).get("message");
      return v ? decodeURIComponent(v) : "";
    } catch { return ""; }
  })();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "JARVIS активен. Полная видимость глобального портфеля — финансы, локации, метрики эффективности. Спрашивай о любом из бизнесов.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState(initialMessage);
  const bottomRef = useRef<HTMLDivElement>(null);
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

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
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

  return (
    <Shell>
      <div className="h-full flex flex-col" style={{ fontFamily: HF, background: "#08080c" }}>

        {/* ── Header ── */}
        <div
          className="px-6 py-4 flex items-center gap-3 flex-shrink-0"
          style={{
            background: "rgba(91,139,208,0.04)",
            borderBottom: "1px solid rgba(91,139,208,0.1)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(91,139,208,0.12)",
              border: "1px solid rgba(91,139,208,0.28)",
              boxShadow: "0 0 14px rgba(91,139,208,0.15)",
            }}
          >
            <Bot className="w-4 h-4" style={{ color: P }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">JARVIS</p>
            <p className="text-xs leading-tight" style={{ color: "rgba(91,139,208,0.6)" }}>
              Полный доступ к портфелю · Данные в реальном времени
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#3ed9a0" }} />
            <span className="text-xs font-medium" style={{ color: "rgba(62,217,160,0.8)" }}>
              Онлайн
            </span>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>

              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={msg.role === "assistant" ? {
                  background: "rgba(91,139,208,0.12)",
                  border: "1px solid rgba(91,139,208,0.25)",
                } : {
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {msg.role === "assistant"
                  ? <Bot className="w-4 h-4" style={{ color: P }} />
                  : <User className="w-4 h-4" style={{ color: "rgba(255,255,255,0.55)" }} />
                }
              </div>

              {/* Bubble */}
              <div
                className="rounded-2xl"
                style={msg.role === "assistant" ? {
                  maxWidth: "78%",
                  background: "linear-gradient(135deg, rgba(12,14,20,0.92) 0%, rgba(8,9,16,0.96) 100%)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(91,139,208,0.12)",
                  boxShadow: "inset 0 1px 0 rgba(91,139,208,0.06), 0 4px 16px rgba(0,0,0,0.3)",
                  padding: "14px 18px 10px",
                } : {
                  maxWidth: "70%",
                  background: "linear-gradient(135deg, rgba(91,139,208,0.13) 0%, rgba(61,106,173,0.08) 100%)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(91,139,208,0.25)",
                  boxShadow: "inset 0 1px 0 rgba(91,139,208,0.1)",
                  padding: "10px 14px",
                }}
              >
                {msg.role === "assistant" ? (
                  <AiAnswer markdown={msg.content} />
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.85)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
                    {msg.content}
                  </p>
                )}
                <div className={`flex items-center mt-2 gap-2 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}>
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.22)" }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => playMessage(i, msg.content)}
                      className="transition-colors"
                      style={{ color: playingIdx === i ? P : "rgba(91,139,208,0.25)" }}
                      title={playingIdx === i ? "Остановить" : "Прослушать"}
                    >
                      {playingIdx === i
                        ? <Square className="w-3 h-3" />
                        : <Volume2 className="w-3 h-3" />
                      }
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pending indicator */}
          {isPending && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(91,139,208,0.12)",
                  border: "1px solid rgba(91,139,208,0.25)",
                }}
              >
                <Bot className="w-4 h-4" style={{ color: P }} />
              </div>
              <div
                className="rounded-2xl px-4 py-3 flex items-center gap-2"
                style={{
                  background: "rgba(12,14,20,0.92)",
                  border: "1px solid rgba(91,139,208,0.12)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: P }} />
                <span className="text-xs" style={{ color: "rgba(91,139,208,0.6)" }}>
                  Анализирую…
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Suggested prompts ── */}
        {messages.length === 1 && (
          <div className="px-6 pb-3 flex gap-2 flex-wrap">
            {SUGGESTED.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="text-xs px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105"
                style={{
                  background: "rgba(91,139,208,0.07)",
                  border: "1px solid rgba(91,139,208,0.18)",
                  color: "rgba(91,139,208,0.8)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Input ── */}
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(91,139,208,0.08)" }}
        >
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-2 transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(24px)",
              border: `1px solid ${isRecording ? "rgba(240,98,90,0.5)" : "rgba(91,139,208,0.15)"}`,
              boxShadow: isRecording
                ? "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(240,98,90,0.08)"
                : "inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 20px rgba(0,0,0,0.25)",
            }}
          >
            {isRecording ? (
              <span className="flex-1 text-sm animate-pulse py-2" style={{ color: "rgba(240,98,90,0.85)" }}>
                Запись… {recordSeconds}с
              </span>
            ) : (
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={isTranscribing ? "Распознаю речь…" : "Спроси о своих бизнесах…"}
                disabled={isPending || isTranscribing}
                className="flex-1 bg-transparent text-sm text-white outline-none py-2"
                style={{
                  fontFamily: HF,
                  color: "rgba(255,255,255,0.9)",
                }}
              />
            )}

            {/* Mic */}
            <button
              onClick={startRecording}
              disabled={micBusy}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 disabled:opacity-30"
              style={{
                background: isRecording ? "rgba(240,98,90,0.18)" : "rgba(91,139,208,0.08)",
                border: `1px solid ${isRecording ? "rgba(240,98,90,0.4)" : "rgba(91,139,208,0.2)"}`,
              }}
              title={isRecording ? `Остановить (${recordSeconds}с)` : "Голосовой ввод"}
            >
              {isTranscribing
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: P }} />
                : isRecording
                ? <MicOff className="w-3.5 h-3.5 animate-pulse" style={{ color: "#f0625a" }} />
                : <Mic className="w-3.5 h-3.5" style={{ color: "rgba(91,139,208,0.6)" }} />
              }
            </button>

            {/* Send */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isPending || isRecording}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 disabled:opacity-30"
              style={{
                background: input.trim() && !isPending && !isRecording
                  ? "rgba(91,139,208,0.25)"
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${input.trim() && !isPending && !isRecording
                  ? "rgba(91,139,208,0.5)"
                  : "rgba(255,255,255,0.08)"}`,
              }}
            >
              <Send className="w-3.5 h-3.5" style={{ color: P }} />
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
