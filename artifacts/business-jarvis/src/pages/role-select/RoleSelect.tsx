import { useState } from "react";
import { Globe, BarChart2, Users2, ClipboardList, Sun, Moon } from "lucide-react";
import type { Role } from "@/hooks/useRole";
import { useTheme } from "@/hooks/ThemeContext";

interface Card {
  role: Role;
  icon: React.ElementType;
  title: string;
  desc: string;
  wip: boolean;
}

const CARDS: Card[] = [
  {
    role: "client",
    icon: Globe,
    title: "Заказчик",
    desc: "Полный обзор холдинга",
    wip: false,
  },
  {
    role: "director",
    icon: BarChart2,
    title: "Директор / C-level",
    desc: "Своё направление",
    wip: true,
  },
  {
    role: "partner",
    icon: Users2,
    title: "Партнёр",
    desc: "Внешний контур",
    wip: true,
  },
  {
    role: "staff",
    icon: ClipboardList,
    title: "Сотрудник / офис-менеджер",
    desc: "Задачи и инструменты",
    wip: true,
  },
];

const STARS = [
  { top: "10%",  left: "18%",  size: 1.5 },
  { top: "7%",   left: "64%",  size: 1   },
  { top: "25%",  left: "91%",  size: 2   },
  { top: "78%",  left: "5%",   size: 1.5 },
  { top: "82%",  left: "58%",  size: 1   },
  { top: "48%",  left: "85%",  size: 1.5 },
];

interface RoleSelectProps {
  onSelect: (role: Role) => void;
}

export default function RoleSelect({ onSelect }: RoleSelectProps) {
  const [hovered, setHovered] = useState<Role | null>(null);
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: "var(--jarvis-bg-screen)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
    >
      {/* Ambient glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div style={{
          position: "absolute", width: "60vw", height: "60vw",
          top: "-10%", left: "-5%", borderRadius: "50%",
          background: "var(--jarvis-blob-1-bg)",
          animation: "glow-drift 20s ease-in-out infinite alternate",
          willChange: "transform",
        }} />
        <div style={{
          position: "absolute", width: "50vw", height: "50vw",
          bottom: "-5%", right: "-5%", borderRadius: "50%",
          background: "var(--jarvis-blob-2-bg)",
          animation: "glow-drift-r 24s ease-in-out infinite alternate",
          willChange: "transform",
        }} />
        <div style={{
          position: "absolute", width: "40vw", height: "40vw",
          top: "30%", right: "15%", borderRadius: "50%",
          background: "var(--jarvis-blob-3-bg)",
          animation: "glow-drift 28s ease-in-out infinite alternate-reverse",
          willChange: "transform",
        }} />
        <div style={{
          position: "absolute", width: "35vw", height: "35vw",
          bottom: "20%", left: "10%", borderRadius: "50%",
          background: "var(--jarvis-blob-4-bg)",
          animation: "glow-drift-r 22s ease-in-out infinite alternate-reverse",
          willChange: "transform",
        }} />
      </div>

      {/* Star particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {STARS.map((star, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: star.size,
              height: star.size,
              borderRadius: "50%",
              background: "var(--jarvis-star-color)",
              top: star.top,
              left: star.left,
              boxShadow: `0 0 ${star.size * 3}px var(--jarvis-star-glow)`,
            }}
          />
        ))}
      </div>

      {/* Main layout */}
      <div className="relative w-full max-w-2xl mx-auto px-4 flex flex-col items-center gap-10">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            className="w-14 h-14 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 relative group"
            style={{
              borderRadius: 16,
              background: "var(--jarvis-accent-12)",
              border: "1.5px solid var(--jarvis-accent-35)",
              boxShadow: "0 4px 20px rgba(0,212,255,0.16)",
              cursor: "pointer",
            }}
          >
            <Globe
              className="w-6 h-6 transition-opacity duration-200 group-hover:opacity-0 absolute"
              style={{ color: "var(--jarvis-accent)" }}
            />
            {theme === "dark"
              ? <Sun className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ color: "var(--jarvis-accent)" }} />
              : <Moon className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ color: "var(--jarvis-accent)" }} />
            }
          </button>
          <div className="flex flex-col items-center gap-1">
            <span
              className="font-bold text-2xl tracking-widest"
              style={{ color: "var(--jarvis-text-primary)" }}
            >
              JARVIS
            </span>
            <span
              className="text-sm"
              style={{ color: "var(--jarvis-text-muted)", fontWeight: 400 }}
            >
              Выберите роль
            </span>
          </div>
        </div>

        {/* Role cards grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CARDS.map(({ role, icon: Icon, title, desc, wip }) => {
            const isHovered = hovered === role;
            const isClient = role === "client";

            return (
              <button
                key={role}
                onClick={() => onSelect(role)}
                onMouseEnter={() => setHovered(role)}
                onMouseLeave={() => setHovered(null)}
                className="jarvis-btn relative text-left p-5 transition-all duration-200 focus:outline-none"
                style={{
                  borderRadius: 18,
                  background: isHovered
                    ? "var(--jarvis-accent-08)"
                    : "var(--jarvis-glass-bg)",
                  border: isHovered
                    ? `1px solid var(--jarvis-${isClient ? "accent-35" : "accent-20"})`
                    : "1px solid var(--jarvis-glass-border)",
                  backdropFilter: "blur(16px) saturate(140%)",
                  WebkitBackdropFilter: "blur(16px) saturate(140%)",
                  boxShadow: isHovered
                    ? "0 8px 32px rgba(0,212,255,0.12)"
                    : "0 2px 12px rgba(0,0,0,0.35)",
                  transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                  opacity: wip && !isHovered ? 0.70 : 1,
                }}
              >
                {/* WIP badge */}
                {wip && (
                  <span
                    className="absolute top-3.5 right-3.5 text-[9px] font-semibold tracking-wide px-2 py-0.5"
                    style={{
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "rgba(220,235,255,0.40)",
                    }}
                  >
                    В разработке
                  </span>
                )}

                <div className="flex flex-col gap-3">
                  {/* Icon */}
                  <div
                    className="w-10 h-10 flex items-center justify-center"
                    style={{
                      borderRadius: 12,
                      background: isHovered
                        ? "var(--jarvis-accent-20)"
                        : "var(--jarvis-accent-12)",
                      border: "1px solid var(--jarvis-accent-20)",
                      transition: "all 0.2s",
                    }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: "var(--jarvis-accent)" }}
                    />
                  </div>

                  {/* Text */}
                  <div className="flex flex-col gap-0.5 pr-8">
                    <span
                      className="font-semibold text-[15px]"
                      style={{
                        color: isHovered ? "var(--jarvis-text-primary)" : "var(--jarvis-text-secondary)",
                        transition: "color 0.2s",
                      }}
                    >
                      {title}
                    </span>
                    <span
                      className="text-xs"
                      style={{
                        color: isHovered ? "var(--jarvis-text-secondary)" : "var(--jarvis-text-muted)",
                        transition: "color 0.2s",
                      }}
                    >
                      {desc}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div
          className="text-[11px] text-center"
          style={{ color: "var(--jarvis-text-muted)" }}
        >
          Демо-навигатор · данные не сохраняются
        </div>
      </div>
    </div>
  );
}
