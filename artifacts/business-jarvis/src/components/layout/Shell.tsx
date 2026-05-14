import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Globe, LayoutGrid, Brain, Link as LinkIcon, MessageSquare } from "lucide-react";

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const nav = [
    { href: "/", label: "Globe Command", icon: Globe },
    { href: "/businesses", label: "Network", icon: LayoutGrid },
    { href: "/ai-summary", label: "AI Briefing", icon: Brain },
    { href: "/chat", label: "AI Chat", icon: MessageSquare },
    { href: "/connect", label: "Establish Link", icon: LinkIcon },
  ];

  return (
    <div className="flex h-[100dvh] bg-[#020810] overflow-hidden text-foreground">
      {/* Sidebar — liquid glass */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col z-20"
        style={{
          background: 'linear-gradient(180deg, rgba(4,10,22,0.88) 0%, rgba(2,6,14,0.92) 100%)',
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
          borderRight: '1px solid rgba(0,212,255,0.1)',
          boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.04), 4px 0 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* Logo */}
        <div
          className="h-16 flex items-center px-6"
          style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}
        >
          <div className="flex items-center gap-3 text-primary">
            <Globe className="w-6 h-6 animate-pulse" />
            <span className="font-mono font-bold tracking-widest text-lg">JARVIS</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5">
          <div className="text-[10px] font-mono text-primary/40 uppercase tracking-widest mb-3 px-2">Navigation</div>
          {nav.map((item) => {
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-mono text-sm transition-all duration-200 ${
                  active ? 'text-primary' : 'text-white/40 hover:text-white/80'
                }`}
                style={active ? {
                  background: 'rgba(0,212,255,0.08)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(0,212,255,0.18)',
                  boxShadow: 'inset 0 1px 0 rgba(0,212,255,0.08), 0 0 12px rgba(0,212,255,0.06)',
                } : {
                  background: 'transparent',
                  border: '1px solid transparent',
                }}
              >
                <item.icon className={`w-4 h-4 ${active ? 'text-primary' : 'opacity-50'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid rgba(0,212,255,0.08)' }}>
          <div
            className="rounded-xl p-4 text-xs font-mono"
            style={{
              background: 'rgba(0,212,255,0.04)',
              border: '1px solid rgba(0,212,255,0.1)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="text-primary/50 mb-2 uppercase tracking-widest text-[10px]">System Status</div>
            <div className="flex items-center justify-between text-white">
              <span className="text-white/60">Uplink</span>
              <span className="text-green-400">SECURE</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto relative z-10">
        {children}
      </main>
    </div>
  );
}
