import { useRef, useState, useEffect, useCallback } from "react";
import { useAiChat } from "@workspace/api-client-react";
import { MessageSquare, Send, X, ChevronUp, Loader2, Mic, MicOff, Volume2, Square } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

function getMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function mimeToExt(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  return "wav";
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
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
        setMessages(prev => [...prev, { role: "assistant", text: "Ошибка соединения с ассистентом. Попробуйте ещё раз." }]);
      },
    },
  });

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isPending) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    if (!open) setOpen(true);
    sendMessage({ data: { message: msg } });
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 80);
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
          if (data.text?.trim()) {
            handleSend(data.text.trim());
          }
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
    <div
      className="absolute bottom-6 left-6 z-20 flex flex-col"
      style={{ width: "min(580px, calc(100% - 320px))", maxWidth: "580px" }}
    >
      {open && (
        <div
          className="mb-2 flex flex-col rounded-2xl overflow-hidden"
          style={{
            background: "rgba(4, 16, 32, 0.82)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(0,212,255,0.18)",
            boxShadow: "0 0 48px rgba(0,212,255,0.08), 0 8px 32px rgba(0,0,0,0.6)",
            height: "360px",
          }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-white/40">Ассистент</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/30 hover:text-white/70 transition-colors p-1 rounded"
              aria-label="Закрыть чат"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
            {messages.length === 0 && !isPending && (
              <div className="flex items-center justify-center h-full">
                <p className="text-white/20 text-xs font-mono text-center leading-relaxed">
                  Спросите про любую компанию:<br />статус, финансы, ответственного
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="rounded-xl px-3 py-2 max-w-[85%] text-sm leading-relaxed font-mono"
                  style={
                    m.role === "user"
                      ? {
                          background: "rgba(0,212,255,0.12)",
                          border: "1px solid rgba(0,212,255,0.2)",
                          color: "rgba(255,255,255,0.9)",
                        }
                      : {
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.75)",
                        }
                  }
                >
                  {m.text}
                  {m.role === "assistant" && (
                    <div className="mt-1.5 flex justify-end">
                      <button
                        onClick={() => playMessage(i, m.text)}
                        className="flex items-center gap-1 text-[10px] font-mono transition-colors"
                        style={{ color: playingIdx === i ? "rgba(0,212,255,0.9)" : "rgba(255,255,255,0.2)" }}
                        title={playingIdx === i ? "Остановить" : "Прослушать"}
                      >
                        {playingIdx === i
                          ? <Square className="w-2.5 h-2.5" />
                          : <Volume2 className="w-2.5 h-2.5" />
                        }
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div
                  className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span className="text-white/30 text-xs font-mono">анализирую…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {open ? (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{
            background: "rgba(4, 16, 32, 0.88)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: `1px solid ${isRecording ? "rgba(239,68,68,0.5)" : "rgba(0,212,255,0.22)"}`,
            boxShadow: isRecording ? "0 0 24px rgba(239,68,68,0.15)" : "0 0 24px rgba(0,212,255,0.1)",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
        >
          <button
            onClick={startRecording}
            disabled={micBusy}
            className="flex-shrink-0 p-1 rounded transition-colors disabled:opacity-40"
            style={{ color: isRecording ? "rgb(239,68,68)" : "rgba(0,212,255,0.5)" }}
            title={isRecording ? `Остановить (${recordSeconds}с)` : "Голосовой ввод"}
          >
            {isTranscribing
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : isRecording
              ? <MicOff className="w-4 h-4 animate-pulse" />
              : <Mic className="w-4 h-4" />
            }
          </button>

          {isRecording ? (
            <span className="flex-1 text-xs font-mono text-red-400/80 animate-pulse">
              Запись… {recordSeconds}с
            </span>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={isTranscribing ? "Распознаю речь…" : "Спросить про компанию…"}
              disabled={isPending || isTranscribing}
              className="flex-1 bg-transparent text-white/80 text-sm font-mono placeholder:text-white/20 outline-none min-w-0"
            />
          )}

          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isPending || isRecording}
            className="flex-shrink-0 text-cyan-400 hover:text-cyan-300 disabled:text-white/15 transition-colors p-1"
            aria-label="Отправить"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleOpen}
          className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all hover:border-cyan-400/40 group"
          style={{
            background: "rgba(4, 16, 32, 0.75)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(0,212,255,0.16)",
            boxShadow: "0 0 20px rgba(0,212,255,0.06)",
          }}
        >
          <MessageSquare className="w-4 h-4 text-cyan-400/70 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
          <span className="text-white/35 group-hover:text-white/55 text-sm font-mono transition-colors">
            Спросить про компании
          </span>
          <ChevronUp className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors ml-auto flex-shrink-0" />
        </button>
      )}
    </div>
  );
}
