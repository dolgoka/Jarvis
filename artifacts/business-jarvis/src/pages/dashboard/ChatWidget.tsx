import { useRef, useState, useEffect } from "react";
import { useAiChat } from "@workspace/api-client-react";
import { MessageSquare, Send, X, ChevronUp, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function handleSend() {
    const text = input.trim();
    if (!text || isPending) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    if (!open) setOpen(true);
    sendMessage({ data: { message: text } });
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

  return (
    <div
      className="absolute bottom-6 left-6 z-20 flex flex-col"
      style={{
        width: "min(580px, calc(100% - 320px))",
        maxWidth: "580px",
      }}
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
          {/* Header */}
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

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
            {messages.length === 0 && !isPending && (
              <div className="flex items-center justify-center h-full">
                <p className="text-white/20 text-xs font-mono text-center leading-relaxed">
                  Спросите про любую компанию:<br />статус, финансы, ответственного
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
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

      {/* Input bar */}
      {open ? (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-2.5"
          style={{
            background: "rgba(4, 16, 32, 0.88)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(0,212,255,0.22)",
            boxShadow: "0 0 24px rgba(0,212,255,0.1)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Спросить про компанию…"
            disabled={isPending}
            className="flex-1 bg-transparent text-white/80 text-sm font-mono placeholder:text-white/20 outline-none min-w-0"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isPending}
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
