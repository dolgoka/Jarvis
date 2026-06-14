import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import {
  LayoutGrid, Brain, Link as LinkIcon, ClipboardList,
  Sun, Moon, RefreshCcw, Menu, X,
} from "lucide-react";
import { useAuthContext } from "@/hooks/AuthContext";
import { useTheme } from "@/hooks/ThemeContext";

const HF = "'Hanken Grotesk', system-ui, sans-serif";

const NAV_ITEMS = [
  { href: "/businesses", label: "Сеть узлов",   icon: LayoutGrid },
  { href: "/ai-summary", label: "Сводка ИИ",    icon: Brain },
  { href: "/tasks",      label: "Задачи",        icon: ClipboardList },
  { href: "/connect",    label: "Подключения",   icon: LinkIcon },
];

export function CornerMenu() {
  const [open, setOpen] = useState(false);
  const { switchRole } = useAuthContext();
  const { theme, toggleTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div
      ref={menuRef}
      className="absolute bottom-5 right-5 z-30 flex flex-col items-end gap-2"
    >
      {/* Dropdown menu */}
      {open && (
        <div
          className="glass flex flex-col overflow-hidden mb-1"
          style={{ minWidth: 188 }}
        >
          {/* Nav section */}
          <div className="py-1.5">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 transition-colors"
                style={{
                  minHeight: 44,
                  color: "rgba(228,232,255,0.58)",
                  fontFamily: HF,
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "rgba(228,232,255,0.9)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(228,232,255,0.58)")}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(228,232,255,0.30)" }} />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "0 12px" }} />

          {/* Utilities */}
          <div className="py-1.5">
            <button
              onClick={() => { toggleTheme(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 transition-colors text-left"
              style={{
                minHeight: 44,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(228,232,255,0.40)",
                fontFamily: HF,
                fontSize: 13,
                fontWeight: 500,
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "rgba(228,232,255,0.75)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(228,232,255,0.40)")}
            >
              {theme === "dark"
                ? <Sun className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(228,232,255,0.25)" }} />
                : <Moon className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(228,232,255,0.25)" }} />
              }
              {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            </button>
            <button
              onClick={() => { switchRole(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 transition-colors text-left"
              style={{
                minHeight: 44,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(228,232,255,0.40)",
                fontFamily: HF,
                fontSize: 13,
                fontWeight: 500,
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "rgba(228,232,255,0.75)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(228,232,255,0.40)")}
            >
              <RefreshCcw className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(228,232,255,0.25)" }} />
              Сменить роль
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-center transition-all duration-150"
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: open ? "rgba(0,212,255,0.12)" : "rgba(12,20,36,0.55)",
          backdropFilter: "blur(22px) saturate(120%)",
          WebkitBackdropFilter: "blur(22px) saturate(120%)",
          border: open ? "1px solid rgba(0,212,255,0.30)" : "1px solid rgba(255,255,255,0.10)",
          color: open ? "var(--jarvis-accent)" : "rgba(228,232,255,0.38)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)",
          cursor: "pointer",
          transition: "background 200ms, border-color 200ms",
        }}
        aria-label={open ? "Закрыть меню" : "Навигация"}
        title={open ? "Закрыть" : "Навигация"}
      >
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>
    </div>
  );
}
