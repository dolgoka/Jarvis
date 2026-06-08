import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { LiquidFilters } from "@/components/liquid/LiquidFilters";

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
      style={{ background: "#0b0b12" }}
    >
      <LiquidFilters />

      {/* Ambient pastel glow blobs — same recipe as GlobeDashboard */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 0,
          overflow: "hidden",
        }}
      >
        <div
          className="absolute"
          style={{
            width: "60vw", height: "60vw",
            top: "-10%", left: "-5%",
            borderRadius: "50%",
            background: "radial-gradient(ellipse at center, rgba(139,124,255,0.18) 0%, transparent 70%)",
            animation: "glow-drift 20s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute"
          style={{
            width: "50vw", height: "50vw",
            bottom: "-5%", right: "-5%",
            borderRadius: "50%",
            background: "radial-gradient(ellipse at center, rgba(95,168,255,0.14) 0%, transparent 70%)",
            animation: "glow-drift-r 24s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute"
          style={{
            width: "40vw", height: "40vw",
            top: "30%", right: "15%",
            borderRadius: "50%",
            background: "radial-gradient(ellipse at center, rgba(255,143,199,0.10) 0%, transparent 70%)",
            animation: "glow-drift 28s ease-in-out infinite alternate-reverse",
          }}
        />
        <div
          className="absolute"
          style={{
            width: "35vw", height: "35vw",
            bottom: "20%", left: "10%",
            borderRadius: "50%",
            background: "radial-gradient(ellipse at center, rgba(62,217,160,0.09) 0%, transparent 70%)",
            animation: "glow-drift-r 22s ease-in-out infinite alternate-reverse",
          }}
        />
      </div>

      {/* Card */}
      <div
        className={`glass relative w-full mx-4 max-w-[400px] p-8 ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
      >
        {/* Logo block */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 flex items-center justify-center mb-4"
            style={{
              borderRadius: 14,
              background: "rgba(139,124,255,0.18)",
              border: "1.5px solid rgba(139,124,255,0.40)",
              boxShadow: "0 4px 16px rgba(139,124,255,0.20)",
            }}
          >
            <Globe className="w-5 h-5" style={{ color: "#8b7cff" }} />
          </div>

          <div
            className="font-bold text-2xl mb-1"
            style={{
              fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
              color: "rgba(228,232,255,0.92)",
              letterSpacing: "0.08em",
            }}
          >
            JARVIS
          </div>

          <div
            className="text-xs"
            style={{
              fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
              color: "rgba(228,232,255,0.32)",
              fontWeight: 400,
            }}
          >
            Командный центр
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-semibold"
              style={{
                fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                color: "rgba(228,232,255,0.38)",
              }}
            >
              Логин
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="введите логин"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
              style={{
                fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(228,232,255,0.85)",
                caretColor: "#8b7cff",
              }}
              onFocus={e => {
                e.currentTarget.style.border = "1px solid rgba(139,124,255,0.5)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,124,255,0.12)";
              }}
              onBlur={e => {
                e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-semibold"
              style={{
                fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                color: "rgba(228,232,255,0.38)",
              }}
            >
              Код доступа
            </label>
            <input
              ref={codeRef}
              type="password"
              value={code}
              onChange={e => { setCode(e.target.value); setError(false); }}
              placeholder="••••"
              autoComplete="current-password"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
              style={{
                fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                background: "rgba(255,255,255,0.04)",
                border: error ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.08)",
                color: "rgba(228,232,255,0.9)",
                caretColor: "#8b7cff",
                letterSpacing: "0.3em",
                boxShadow: error ? "0 0 0 3px rgba(239,68,68,0.10)" : "none",
              }}
              onFocus={e => {
                if (!error) {
                  e.currentTarget.style.border = "1px solid rgba(139,124,255,0.5)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,124,255,0.12)";
                }
              }}
              onBlur={e => {
                if (!error) {
                  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            />
            <div className="h-4">
              {error && (
                <p
                  className="text-[11px]"
                  style={{
                    fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                    color: "rgba(239,68,68,0.85)",
                  }}
                >
                  Неверный код доступа
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="mt-1 w-full rounded-xl py-3.5 text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
              background: loading
                ? "rgba(139,124,255,0.25)"
                : "linear-gradient(135deg, #8b7cff 0%, #6c6bff 100%)",
              color: "#fff",
              boxShadow: loading ? "none" : "0 4px 16px rgba(139,124,255,0.35)",
              border: "none",
            }}
            onMouseEnter={e => {
              if (!loading && code.trim()) {
                e.currentTarget.style.boxShadow = "0 6px 24px rgba(139,124,255,0.50)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(139,124,255,0.35)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border-2 animate-spin inline-block"
                  style={{ borderColor: "rgba(255,255,255,0.25)", borderTopColor: "#fff" }}
                />
                Проверка...
              </span>
            ) : "Войти"}
          </button>
        </form>

        {/* Quiet footer hint */}
        <div
          className="mt-7 text-center text-[11px]"
          style={{
            fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
            color: "rgba(255,255,255,0.10)",
          }}
        >
          Только для уполномоченных
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
