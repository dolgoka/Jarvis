import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Globe, LayoutGrid, Brain, Link as LinkIcon, MessageSquare, ClipboardList, RefreshCcw } from "lucide-react";
import { useAuthContext } from "@/hooks/AuthContext";

const NAV = [
  { href: "/",            label: "Центр",   fullLabel: "Глобальный центр", icon: Globe },
  { href: "/businesses",  label: "Сеть",    fullLabel: "Сеть",             icon: LayoutGrid },
  { href: "/tasks",       label: "Задачи",  fullLabel: "Задачи",           icon: ClipboardList },
  { href: "/ai-summary",  label: "Сводка",  fullLabel: "Сводка ИИ",        icon: Brain },
  { href: "/chat",        label: "Чат",     fullLabel: "Чат с ИИ",         icon: MessageSquare },
  { href: "/connect",     label: "Связь",   fullLabel: "Подключения",      icon: LinkIcon },
];

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { switchRole } = useAuthContext();

  const isActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: "var(--jarvis-bg-screen)", color: "rgba(228,232,255,0.9)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>

      {/* ── Desktop sidebar — blur+sat glass, no SVG filter (full-height perf) ── */}
      <aside
        className="hidden md:flex w-60 flex-shrink-0 flex-col z-20"
        style={{
          background: "var(--jarvis-nav-bg)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          borderRight: "1px solid var(--jarvis-nav-border)",
        }}
      >
        {/* Logo */}
        <div
          className="h-16 flex items-center px-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5" style={{ color: "var(--jarvis-accent)" }} />
            <span className="font-bold tracking-widest text-base" style={{ color: "var(--jarvis-text-primary)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>JARVIS</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 flex flex-col gap-0.5">
          <div
            className="text-[10px] font-semibold uppercase tracking-widest mb-3 px-3"
            style={{ color: "rgba(228,232,255,0.3)" }}
          >
            Навигация
          </div>
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 font-medium text-sm transition-colors duration-150 min-h-[46px]"
                style={{
                  borderRadius: 12,
                  color: active ? "var(--jarvis-accent)" : "rgba(228,232,255,0.38)",
                  background: active ? "var(--jarvis-accent-12)" : "transparent",
                  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                }}
              >
                <item.icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: active ? "var(--jarvis-accent)" : "rgba(228,232,255,0.3)" }}
                />
                {item.fullLabel}
              </Link>
            );
          })}
        </nav>

        {/* Switch role */}
        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button
            onClick={switchRole}
            className="flex items-center gap-3 w-full px-3 text-sm transition-colors duration-150 min-h-[46px] group"
            style={{ borderRadius: 12, color: "rgba(228,232,255,0.25)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            <RefreshCcw className="w-4 h-4 flex-shrink-0 opacity-40 group-hover:opacity-60" />
            Сменить роль
          </button>
        </div>
      </aside>

      {/* ── Content column ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Mobile top bar — blur+sat glass, no SVG filter */}
        <div
          className="md:hidden h-14 flex items-center justify-between px-4 flex-shrink-0"
          style={{
            background: "var(--jarvis-nav-bg)",
            borderBottom: "1px solid var(--jarvis-nav-border)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
          }}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5" style={{ color: "var(--jarvis-accent)" }} />
            <span className="font-bold tracking-widest text-base" style={{ color: "var(--jarvis-text-primary)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>JARVIS</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#3ed9a0", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#3ed9a0" }} />
              LIVE
            </div>
            <button
              onClick={switchRole}
              className="flex items-center justify-center w-9 h-9 transition-colors"
              style={{ borderRadius: 10, color: "rgba(228,232,255,0.25)" }}
              title="Сменить роль"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main */}
        <main className="flex-1 overflow-auto relative z-10">
          {children}
        </main>

        {/* Mobile bottom nav — blur+sat glass, no SVG filter */}
        <div
          className="md:hidden flex-shrink-0"
          style={{
            background: "var(--jarvis-nav-bg)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            borderTop: "1px solid var(--jarvis-nav-border)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div className="flex items-center justify-around h-16">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center gap-1 w-full h-full relative transition-all duration-150"
                >
                  <item.icon
                    className="w-5 h-5"
                    style={{ color: active ? "var(--jarvis-accent)" : "rgba(228,232,255,0.25)" }}
                  />
                  <span
                    className="text-[10px] font-semibold tracking-wide"
                    style={{ color: active ? "var(--jarvis-accent)" : "rgba(228,232,255,0.22)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                  >
                    {item.label}
                  </span>
                  {active && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                      style={{ background: "var(--jarvis-accent)" }}
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
