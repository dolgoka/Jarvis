import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Globe, LayoutGrid, Brain, Link as LinkIcon, MessageSquare, ClipboardList, LogOut } from "lucide-react";
import { useAuthContext } from "@/hooks/AuthContext";

const NAV = [
  { href: "/", label: "Центр", fullLabel: "Глобальный центр", icon: Globe },
  { href: "/businesses", label: "Сеть", fullLabel: "Сеть", icon: LayoutGrid },
  { href: "/tasks", label: "Задачи", fullLabel: "Задачи", icon: ClipboardList },
  { href: "/ai-summary", label: "Сводка", fullLabel: "Сводка ИИ", icon: Brain },
  { href: "/chat", label: "Чат", fullLabel: "Чат с ИИ", icon: MessageSquare },
  { href: "/connect", label: "Связь", fullLabel: "Подключения", icon: LinkIcon },
];

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuthContext();

  const isActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  return (
    <div className="flex h-[100dvh] bg-[#020810] text-foreground overflow-hidden">

      {/* ── Desktop sidebar ── */}
      {/* No SVG filter here — full-height = iPad perf hit */}
      <aside
        className="hidden md:flex w-64 flex-shrink-0 flex-col z-20"
        style={{
          background: "rgba(3, 8, 20, 0.94)",
          borderRight: "1px solid rgba(0,212,255,0.08)",
        }}
      >
        {/* Logo */}
        <div
          className="h-16 flex items-center px-6"
          style={{ borderBottom: "1px solid rgba(0,212,255,0.08)" }}
        >
          <div className="flex items-center gap-3 text-primary">
            <Globe className="w-5 h-5" />
            <span className="font-mono font-bold tracking-widest text-lg">JARVIS</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 flex flex-col gap-0.5">
          <div className="text-[10px] font-mono text-primary/30 uppercase tracking-widest mb-3 px-3">
            Навигация
          </div>
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 rounded-xl font-mono text-sm transition-colors duration-150 min-h-[48px] ${
                  active ? "text-primary" : "text-white/40 hover:text-white/75"
                }`}
                style={active ? {
                  background: "rgba(0,212,255,0.09)",
                  borderLeft: "3px solid rgba(0,212,255,0.65)",
                  paddingLeft: "calc(0.75rem - 1px)",
                } : {}}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-primary" : "opacity-40"}`} />
                {item.fullLabel}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 rounded-xl font-mono text-sm text-white/25 hover:text-red-400/70 transition-colors duration-150 min-h-[48px] group"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 opacity-40 group-hover:opacity-70" />
            Выход
          </button>
        </div>
      </aside>

      {/* ── Content column ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Mobile top bar — no SVG filter, full-width */}
        <div
          className="md:hidden h-14 flex items-center justify-between px-4 flex-shrink-0"
          style={{
            background: "rgba(2,8,16,0.97)",
            borderBottom: "1px solid rgba(0,212,255,0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center gap-2 text-primary">
            <Globe className="w-5 h-5" />
            <span className="font-mono font-bold tracking-widest text-base">JARVIS</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-mono text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </div>
            <button
              onClick={logout}
              className="flex items-center justify-center w-9 h-9 rounded-xl text-white/25 hover:text-red-400/60 transition-colors"
              title="Выход"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main */}
        <main className="flex-1 overflow-auto relative z-10">
          {children}
        </main>

        {/* Mobile bottom nav — no SVG filter, full-width */}
        <div
          className="md:hidden flex-shrink-0"
          style={{
            background: "rgba(2,8,16,0.97)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(0,212,255,0.08)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div className="flex items-center justify-around h-16 relative">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center gap-1 w-full h-full relative transition-all duration-150"
                >
                  <item.icon
                    className={`w-5 h-5 transition-colors ${active ? "text-primary" : "text-white/25"}`}
                    style={active ? { filter: "drop-shadow(0 0 5px rgba(0,212,255,0.7))" } : {}}
                  />
                  <span className={`text-[10px] font-mono tracking-wide ${active ? "text-primary" : "text-white/20"}`}>
                    {item.label}
                  </span>
                  {active && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full"
                      style={{ boxShadow: "0 0 8px rgba(0,212,255,0.8)" }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
