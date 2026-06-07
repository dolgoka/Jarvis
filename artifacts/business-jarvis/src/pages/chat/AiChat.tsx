import { useState, useRef, useEffect, useCallback } from "react";
import { Shell } from "@/components/layout/Shell";
import { useAiChat } from "@workspace/api-client-react";
import { Send, Bot, User, Loader2, Zap, Mic, MicOff, Volume2, Square } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const SUGGESTED = [
  "Which business has the highest profit margin?",
  "Compare revenue across all businesses",
  "Which node needs attention right now?",
  "Give me a one-line status on each business",
];

function getMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "JARVIS online. I have full visibility across your global portfolio — financials, locations, performance metrics. Ask me anything about your businesses.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
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
          content: "Signal interference — unable to process request. Try again.",
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
    setMessages(prev => [...prev, { role: "user", content: msg, timestamp: new Date().toISOString() }]);
    sendMessage({ data: { message: msg } });
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
      <div className="h-full flex flex-col bg-[#020810]">
        {/* Header */}
        <div
          className="px-8 py-5 flex items-center gap-4 flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(0,0,0,0) 100%)',
            borderBottom: '1px solid rgba(0,212,255,0.1)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(0,212,255,0.1)',
              border: '1px solid rgba(0,212,255,0.25)',
              boxShadow: '0 0 16px rgba(0,212,255,0.15)',
            }}
          >
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-wide">JARVIS Intelligence</h1>
            <p className="text-xs text-primary/60 font-mono uppercase tracking-widest">Full portfolio access · Real-time data</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-mono text-green-400/80 uppercase tracking-widest">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
                style={msg.role === "assistant" ? {
                  background: 'rgba(0,212,255,0.12)',
                  border: '1px solid rgba(0,212,255,0.25)',
                  boxShadow: '0 0 10px rgba(0,212,255,0.1)',
                } : {
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {msg.role === "assistant"
                  ? <Bot className="w-4 h-4 text-primary" />
                  : <User className="w-4 h-4 text-white/60" />
                }
              </div>

              <div
                className="max-w-[75%] rounded-2xl px-4 py-3"
                style={msg.role === "assistant" ? {
                  background: 'linear-gradient(135deg, rgba(8,18,40,0.85) 0%, rgba(4,10,24,0.9) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0,212,255,0.1)',
                  boxShadow: 'inset 0 1px 0 rgba(0,212,255,0.06), 0 4px 16px rgba(0,0,0,0.3)',
                } : {
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.12) 0%, rgba(0,150,200,0.08) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0,212,255,0.2)',
                  boxShadow: 'inset 0 1px 0 rgba(0,212,255,0.1)',
                }}
              >
                <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <div className={`flex items-center mt-2 gap-2 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}>
                  <span className={`text-[10px] font-mono ${msg.role === "assistant" ? "text-primary/30" : "text-primary/40"}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => playMessage(i, msg.content)}
                      className="transition-colors"
                      style={{ color: playingIdx === i ? "rgba(0,212,255,0.9)" : "rgba(0,212,255,0.2)" }}
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

          {isPending && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)' }}
              >
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div
                className="rounded-2xl px-5 py-4 flex items-center gap-2"
                style={{
                  background: 'rgba(8,18,40,0.85)',
                  border: '1px solid rgba(0,212,255,0.1)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-xs font-mono text-primary/60 tracking-widest">Analyzing...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts */}
        {messages.length === 1 && (
          <div className="px-6 pb-3 flex gap-2 flex-wrap">
            {SUGGESTED.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="text-xs font-mono px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105"
                style={{
                  background: 'rgba(0,212,255,0.06)',
                  border: '1px solid rgba(0,212,255,0.16)',
                  color: 'rgba(0,212,255,0.75)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(0,212,255,0.08)' }}
        >
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-2"
            style={{
              background: 'linear-gradient(135deg, rgba(8,18,38,0.8) 0%, rgba(4,10,22,0.9) 100%)',
              backdropFilter: 'blur(24px)',
              border: `1px solid ${isRecording ? "rgba(239,68,68,0.5)" : "rgba(0,212,255,0.15)"}`,
              boxShadow: isRecording
                ? "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(239,68,68,0.1)"
                : "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.3)",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
          >
            <Zap className="w-4 h-4 text-primary/40 flex-shrink-0" />

            {isRecording ? (
              <span className="flex-1 text-sm font-mono text-red-400/80 animate-pulse py-2">
                Запись… {recordSeconds}с
              </span>
            ) : (
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={isTranscribing ? "Распознаю речь…" : "Ask about your businesses..."}
                disabled={isPending || isTranscribing}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none font-mono py-2"
              />
            )}

            <button
              onClick={startRecording}
              disabled={micBusy}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 disabled:opacity-30"
              style={{
                background: isRecording ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isRecording ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
              }}
              title={isRecording ? `Остановить (${recordSeconds}с)` : "Голосовой ввод"}
            >
              {isTranscribing
                ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                : isRecording
                ? <MicOff className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                : <Mic className="w-3.5 h-3.5 text-primary/50" />
              }
            </button>

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isPending || isRecording}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 disabled:opacity-30"
              style={{
                background: input.trim() && !isPending && !isRecording ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${input.trim() && !isPending && !isRecording ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <Send className="w-3.5 h-3.5 text-primary" />
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
