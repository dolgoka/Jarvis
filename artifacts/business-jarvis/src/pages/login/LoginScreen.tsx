import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";

interface LoginScreenProps {
  onLogin: (code: string) => boolean;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    codeRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || loading) return;

    setLoading(true);
    setError(false);

    setTimeout(() => {
      const ok = onLogin(code.trim());
      if (!ok) {
        setError(true);
        setShake(true);
        setCode("");
        setTimeout(() => setShake(false), 600);
      }
      setLoading(false);
    }, 600);
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: "#020810" }}
    >
      {/* Ambient glow blobs */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,212,255,0.07) 0%, transparent 70%)," +
            "radial-gradient(ellipse 40% 60% at 80% 100%, rgba(0,100,255,0.05) 0%, transparent 70%)," +
            "radial-gradient(ellipse 40% 40% at 10% 60%, rgba(0,212,255,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,255,1) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Horizontal scan line */}
      <div
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{
          top: "30%",
          background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.15), transparent)",
        }}
      />

      {/* Card */}
      <div
        className={`relative w-full mx-4 max-w-[480px] rounded-2xl p-8 md:p-10 transition-all duration-150 ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
        style={{
          background: "linear-gradient(160deg, rgba(4,14,32,0.97) 0%, rgba(2,8,18,0.99) 100%)",
          border: "1px solid rgba(0,212,255,0.18)",
          boxShadow:
            "0 0 0 1px rgba(0,212,255,0.06) inset," +
            "0 32px 80px rgba(0,0,0,0.7)," +
            "0 0 60px rgba(0,212,255,0.06)",
          backdropFilter: "blur(40px)",
        }}
      >
        {/* Corner accents */}
        <span className="absolute top-0 left-0 w-6 h-6 border-t border-l border-cyan-400/40 rounded-tl-2xl" />
        <span className="absolute top-0 right-0 w-6 h-6 border-t border-r border-cyan-400/40 rounded-tr-2xl" />
        <span className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-cyan-400/40 rounded-bl-2xl" />
        <span className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-cyan-400/40 rounded-br-2xl" />

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: "radial-gradient(circle at 40% 35%, rgba(0,212,255,0.18), rgba(0,80,180,0.08))",
              border: "1px solid rgba(0,212,255,0.25)",
              boxShadow: "0 0 30px rgba(0,212,255,0.15), inset 0 1px 0 rgba(0,212,255,0.2)",
            }}
          >
            <Globe className="w-8 h-8 text-cyan-400" style={{ filter: "drop-shadow(0 0 8px rgba(0,212,255,0.8))" }} />
          </div>

          <div
            className="font-mono font-bold tracking-[0.35em] text-3xl mb-1"
            style={{
              color: "#00d4ff",
              textShadow: "0 0 20px rgba(0,212,255,0.6), 0 0 40px rgba(0,212,255,0.3)",
            }}
          >
            JARVIS
          </div>

          <div
            className="font-mono text-[10px] tracking-[0.25em] uppercase"
            style={{ color: "rgba(0,212,255,0.45)" }}
          >
            ГЛОБАЛЬНЫЙ ЦЕНТР УПРАВЛЕНИЯ
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-2 mt-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: "0 0 6px rgba(74,222,128,0.8)" }} />
            <span className="font-mono text-[10px] text-green-400/70 tracking-widest">КАНАЛ ЗАЩИЩЁН</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "rgba(0,212,255,0.5)" }}>
              Идентификатор
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="введите логин"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl px-4 py-3 font-mono text-sm outline-none transition-all duration-200"
              style={{
                background: "rgba(0,212,255,0.04)",
                border: "1px solid rgba(0,212,255,0.15)",
                color: "rgba(255,255,255,0.8)",
                caretColor: "#00d4ff",
              }}
              onFocus={e => { e.currentTarget.style.border = "1px solid rgba(0,212,255,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0,212,255,0.08)"; }}
              onBlur={e => { e.currentTarget.style.border = "1px solid rgba(0,212,255,0.15)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "rgba(0,212,255,0.5)" }}>
              Код доступа
            </label>
            <input
              ref={codeRef}
              type="password"
              value={code}
              onChange={e => { setCode(e.target.value); setError(false); }}
              placeholder="••••"
              autoComplete="current-password"
              className="w-full rounded-xl px-4 py-3 font-mono text-sm outline-none tracking-[0.4em] transition-all duration-200"
              style={{
                background: "rgba(0,212,255,0.04)",
                border: error ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(0,212,255,0.15)",
                color: "rgba(255,255,255,0.9)",
                caretColor: "#00d4ff",
                boxShadow: error ? "0 0 0 2px rgba(239,68,68,0.08)" : "none",
              }}
              onFocus={e => {
                if (!error) {
                  e.currentTarget.style.border = "1px solid rgba(0,212,255,0.4)";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0,212,255,0.08)";
                }
              }}
              onBlur={e => {
                if (!error) {
                  e.currentTarget.style.border = "1px solid rgba(0,212,255,0.15)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            />
            <div className="h-4">
              {error && (
                <p className="font-mono text-[11px] text-red-400" style={{ textShadow: "0 0 8px rgba(239,68,68,0.5)" }}>
                  ⚠ Неверный код доступа
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="mt-2 w-full rounded-xl py-3.5 font-mono text-sm font-bold tracking-[0.2em] uppercase transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: loading
                ? "rgba(0,212,255,0.08)"
                : "linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(0,100,255,0.1) 100%)",
              border: "1px solid rgba(0,212,255,0.35)",
              color: "#00d4ff",
              boxShadow: loading ? "none" : "0 0 20px rgba(0,212,255,0.12), inset 0 1px 0 rgba(0,212,255,0.15)",
            }}
            onMouseEnter={e => {
              if (!loading && code.trim()) {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,212,255,0.22) 0%, rgba(0,100,255,0.15) 100%)";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(0,212,255,0.2), inset 0 1px 0 rgba(0,212,255,0.2)";
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(0,100,255,0.1) 100%)";
              e.currentTarget.style.boxShadow = "0 0 20px rgba(0,212,255,0.12), inset 0 1px 0 rgba(0,212,255,0.15)";
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin inline-block" />
                Проверка...
              </span>
            ) : "Войти"}
          </button>
        </form>

        {/* Bottom hint */}
        <div className="mt-8 text-center font-mono text-[10px] tracking-widest" style={{ color: "rgba(255,255,255,0.12)" }}>
          АВТОРИЗОВАННЫЙ ДОСТУП · ТОЛЬКО ДЛЯ УПОЛНОМОЧЕННЫХ ЛИЦ
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
