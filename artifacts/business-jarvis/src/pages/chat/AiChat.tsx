import { useState, useRef, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { useAiChat } from "@workspace/api-client-react";
import { Send, Bot, User, Loader2, Zap } from "lucide-react";

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
              {/* Avatar */}
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

              {/* Bubble */}
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
                <div className={`text-[10px] font-mono mt-2 ${msg.role === "assistant" ? "text-primary/30" : "text-primary/40 text-right"}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
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

        {/* Suggested prompts (only when no user messages yet) */}
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
              border: '1px solid rgba(0,212,255,0.15)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <Zap className="w-4 h-4 text-primary/40 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about your businesses..."
              disabled={isPending}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none font-mono py-2"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isPending}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 disabled:opacity-30"
              style={{
                background: input.trim() && !isPending ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${input.trim() && !isPending ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
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
