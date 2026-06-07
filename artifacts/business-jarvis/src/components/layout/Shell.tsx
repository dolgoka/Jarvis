import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Globe, LayoutGrid, Brain, Link as LinkIcon, MessageSquare, ClipboardList } from "lucide-react";

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

  const isActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  return (
    <div className="flex h-[100dvh] bg-[#020810] text-foreground overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex w-64 flex-shrink-0 flex-col z-20"
        style={{
          background: 'linear-gradient(180deg, rgba(4,10,22,0.88) 0%, rgba(2,6,14,0.92) 100%)',
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
          borderRight: '1px solid rgba(0,212,255,0.1)',
          boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.04), 4px 0 24px rgba(0,0,0,0.4)',
        }}
      >
        <div className="h-16 flex items-center px-6" style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
          <div className="flex items-center gap-3 text-primary">
            <Globe className="w-6 h-6 animate-pulse" />
            <span className="font-mono font-bold tracking-widest text-lg">JARVIS</span>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5">
          <div className="text-[10px] font-mono text-primary/40 uppercase tracking-widest mb-3 px-2">Навигация</div>
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-mono text-sm transition-all duration-200 ${active ? 'text-primary' : 'text-white/40 hover:text-white/80'}`}
                style={active ? {
                  background: 'rgba(0,212,255,0.08)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(0,212,255,0.18)',
                  boxShadow: 'inset 0 1px 0 rgba(0,212,255,0.08), 0 0 12px rgba(0,212,255,0.06)',
                } : { background: 'transparent', border: '1px solid transparent' }}
              >
                <item.icon className={`w-4 h-4 ${active ? 'text-primary' : 'opacity-50'}`} />
                {item.fullLabel}
              </Link>
            );
          })}
        </nav>
        <div className="p-4" style={{ borderTop: '1px solid rgba(0,212,255,0.08)' }}>
          <div className="rounded-xl p-4 text-xs font-mono" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)' }}>
            <div className="text-primary/50 mb-2 uppercase tracking-widest text-[10px]">Статус системы</div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Канал связи</span>
              <span className="text-green-400">SECURE</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Content column (shared mobile + desktop) ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <div
          className="md:hidden h-14 flex items-center justify-between px-4 flex-shrink-0"
          style={{ background: 'rgba(2,8,16,0.97)', borderBottom: '1px solid rgba(0,212,255,0.12)', backdropFilter: 'blur(24px)' }}
        >
          <div className="flex items-center gap-2 text-primary">
            <Globe className="w-5 h-5 animate-pulse" />
            <span className="font-mono font-bold tracking-widest text-base">JARVIS</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            SECURE
          </div>
        </div>

        {/* Main scrollable content */}
        <main className="flex-1 overflow-auto relative z-10">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <div
          className="md:hidden flex-shrink-0"
          style={{
            background: 'rgba(2,8,16,0.97)',
            backdropFilter: 'blur(32px)',
            borderTop: '1px solid rgba(0,212,255,0.12)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="flex items-center justify-around h-16 relative">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className="flex flex-col items-center justify-center gap-1 w-full h-full relative transition-all duration-200"
                >
                  <item.icon
                    className={`w-5 h-5 transition-colors ${active ? 'text-primary' : 'text-white/30'}`}
                    style={active ? { filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.8))' } : {}}
                  />
                  <span className={`text-[10px] font-mono tracking-wide ${active ? 'text-primary' : 'text-white/25'}`}>
                    {item.label}
                  </span>
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full"
                      style={{ boxShadow: '0 0 8px rgba(0,212,255,0.8)' }} />
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
