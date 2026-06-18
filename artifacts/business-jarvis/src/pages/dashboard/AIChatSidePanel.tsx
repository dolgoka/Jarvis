import { useState, useRef, useEffect } from "react";
import { useAiChat } from "@workspace/api-client-react";
import { X, Send, Loader2, Sparkles } from "lucide-react";
import { AiAnswer } from "@/components/ui/AiAnswer";

const HF = "'Hanken Grotesk', system-ui, sans-serif";
const ACCENT = "var(--jarvis-accent)";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const QUICK = ["Сводка по портфелю", "Есть критичные узлы?", "Топ-3 по выручке"];

interface AIChatSidePanelProps {
  open: boolean;
  onClose: () => void;
}

export function AIChatSidePanel({ open, onClose }: AIChatSidePanelProps) {
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
        setMessages(prev => [...prev, { role: "assistant", text: "Ошибка соединения. Попробуйте ещё раз." }]);
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
    setMessages(prev => {
      const history = prev.map(m => ({ role: m.role, content: m.text }));
      sendMessage({ data: { message: msg, history } });
      return [...prev, { role: "user" as const, text: msg }];
    });
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="md:hidden fixed inset-0 z-40"
        style={{
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 320ms ease",
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-[100dvh] flex flex-col z-50"
        style={{
          width: "min(420px, 100vw)",
          background: "rgba(4,8,20,0.94)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          borderLeft: "1px solid rgba(0,212,255,0.12)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 320ms cubic-bezier(0.4,0,0.2,1)",
          boxShadow: open ? "-8px 0 40px rgba(0,0,0,0.5)" : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 flex-shrink-0"
          style={{
            height: 60,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.22)" }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide" style={{ color: "rgba(228,232,255,0.92)", fontFamily: HF }}>
                ИИ Ассистент
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 transition-colors"
            style={{
              borderRadius: 8,
              color: "rgba(228,232,255,0.30)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          style={{ scrollbarWidth: "none", minHeight: 0 }}
        >
          {messages.length === 0 && !isPending && (
            <div className="flex flex-col items-center justify-center h-full gap-5 pb-8">
              <div
                className="flex items-center justify-center w-14 h-14 rounded-2xl"
                style={{
                  background: "rgba(0,212,255,0.08)",
                  border: "1px solid rgba(0,212,255,0.18)",
                  boxShadow: "0 0 32px rgba(0,212,255,0.12)",
                }}
              >
                <Sparkles className="w-6 h-6" style={{ color: ACCENT }} />
              </div>
              <p className="text-xs text-center" style={{ color: "rgba(228,232,255,0.28)", fontFamily: HF, maxWidth: 220, lineHeight: 1.6 }}>
                Задайте вопрос по любому бизнесу или всему портфелю
              </p>
              <div className="flex flex-col gap-2 w-full">
                {QUICK.map(q => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="w-full text-left transition-all"
                    style={{
                      fontSize: 12,
                      fontFamily: HF,
                      fontWeight: 500,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(228,232,255,0.60)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,255,0.07)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,212,255,0.20)";
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,212,255,0.85)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)";
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(228,232,255,0.60)";
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
                        padding: "8px 12px",
                        fontSize: 13,
                        lineHeight: 1.5,
                        fontFamily: HF,
                      }
                    : {
                        maxWidth: "92%",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        padding: "10px 13px 8px",
                      }
                }
              >
                {m.role === "assistant" ? <AiAnswer markdown={m.text} compact /> : m.text}
              </div>
            </div>
          ))}

          {isPending && (
            <div className="flex justify-start">
              <div
                className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: ACCENT }} />
                <span className="text-xs font-mono" style={{ color: "rgba(228,232,255,0.25)", fontFamily: HF }}>
                  анализирую…
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.25)",
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
            className="flex-1 bg-transparent outline-none text-sm min-w-0"
            style={{ color: "rgba(228,232,255,0.85)", fontFamily: HF }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isPending}
            className="flex items-center justify-center w-8 h-8 flex-shrink-0 transition-all disabled:opacity-20"
            style={{
              borderRadius: 8,
              background: input.trim() ? "rgba(0,212,255,0.14)" : "transparent",
              border: input.trim() ? "1px solid rgba(0,212,255,0.30)" : "1px solid transparent",
              color: ACCENT,
              cursor: "pointer",
            }}
            aria-label="Отправить"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
