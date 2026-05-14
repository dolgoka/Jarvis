import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Globe, LayoutGrid, Brain, Link as LinkIcon } from "lucide-react";

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const nav = [
    { href: "/", label: "Globe Command", icon: Globe },
    { href: "/businesses", label: "Network", icon: LayoutGrid },
    { href: "/ai-summary", label: "AI Briefing", icon: Brain },
    { href: "/connect", label: "Establish Link", icon: LinkIcon },
  ];

  return (
    <div className="flex h-[100dvh] bg-[#050a14] overflow-hidden text-foreground">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-primary/20 bg-black/40 backdrop-blur-xl flex flex-col z-20">
        <div className="h-16 flex items-center px-6 border-b border-primary/20">
          <div className="flex items-center gap-3 text-primary">
            <Globe className="w-6 h-6 animate-pulse" />
            <span className="font-mono font-bold tracking-widest text-lg">JARVIS</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
          <div className="text-xs font-mono text-primary/50 uppercase tracking-widest mb-4 px-2">Navigation</div>
          {nav.map((item) => {
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md font-mono text-sm transition-all
                  ${active 
                    ? 'bg-primary/10 text-primary border border-primary/30 shadow-[inset_0_0_10px_rgba(0,212,255,0.1)]' 
                    : 'text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <item.icon className={`w-4 h-4 ${active ? 'text-primary' : 'opacity-70'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-primary/20">
          <div className="bg-primary/5 border border-primary/20 rounded-md p-4 text-xs font-mono">
            <div className="text-primary/70 mb-2">SYSTEM STATUS</div>
            <div className="flex items-center justify-between text-white">
              <span>Uplink</span>
              <span className="text-green-400">SECURE</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative z-10">
        {/* CRT Scanline effect overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50 opacity-20"></div>
        {children}
      </main>
    </div>
  );
}
