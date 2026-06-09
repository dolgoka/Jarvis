import { useState } from "react";
import { Globe, BarChart2, Users2, ClipboardList } from "lucide-react";
import type { Role } from "@/hooks/useRole";

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

interface RoleSelectProps {
  onSelect: (role: Role) => void;
}

export default function RoleSelect({ onSelect }: RoleSelectProps) {
  const [hovered, setHovered] = useState<Role | null>(null);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: "#0b0b12", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
    >
      {/* Ambient glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div style={{
          position: "absolute", width: "60vw", height: "60vw",
          top: "-10%", left: "-5%", borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(139,124,255,0.18) 0%, transparent 70%)",
          animation: "glow-drift 20s ease-in-out infinite alternate",
          willChange: "transform",
        }} />
        <div style={{
          position: "absolute", width: "50vw", height: "50vw",
          bottom: "-5%", right: "-5%", borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(95,168,255,0.14) 0%, transparent 70%)",
          animation: "glow-drift-r 24s ease-in-out infinite alternate",
          willChange: "transform",
        }} />
        <div style={{
          position: "absolute", width: "40vw", height: "40vw",
          top: "30%", right: "15%", borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(255,143,199,0.10) 0%, transparent 70%)",
          animation: "glow-drift 28s ease-in-out infinite alternate-reverse",
          willChange: "transform",
        }} />
        <div style={{
          position: "absolute", width: "35vw", height: "35vw",
          bottom: "20%", left: "10%", borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(62,217,160,0.09) 0%, transparent 70%)",
          animation: "glow-drift-r 22s ease-in-out infinite alternate-reverse",
          willChange: "transform",
        }} />
      </div>

      {/* Main layout */}
      <div className="relative w-full max-w-2xl mx-auto px-4 flex flex-col items-center gap-10">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 flex items-center justify-center"
            style={{
              borderRadius: 16,
              background: "rgba(139,124,255,0.18)",
              border: "1.5px solid rgba(139,124,255,0.40)",
              boxShadow: "0 4px 20px rgba(139,124,255,0.22)",
            }}
          >
            <Globe className="w-6 h-6" style={{ color: "#8b7cff" }} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span
              className="font-bold text-2xl tracking-widest"
              style={{ color: "rgba(228,232,255,0.92)" }}
            >
              JARVIS
            </span>
            <span
              className="text-sm"
              style={{ color: "rgba(228,232,255,0.35)", fontWeight: 400 }}
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
                className="relative text-left p-5 transition-all duration-200 focus:outline-none"
                style={{
                  borderRadius: 18,
                  background: isHovered
                    ? "rgba(139,124,255,0.12)"
                    : "rgba(255,255,255,0.035)",
                  border: isHovered
                    ? `1px solid rgba(139,124,255,${isClient ? "0.55" : "0.35"})`
                    : "1px solid rgba(255,255,255,0.07)",
                  backdropFilter: "blur(16px) saturate(140%)",
                  WebkitBackdropFilter: "blur(16px) saturate(140%)",
                  boxShadow: isHovered
                    ? "0 8px 32px rgba(139,124,255,0.18)"
                    : "0 2px 12px rgba(0,0,0,0.25)",
                  transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                  opacity: wip && !isHovered ? 0.72 : 1,
                }}
              >
                {/* WIP badge */}
                {wip && (
                  <span
                    className="absolute top-3.5 right-3.5 text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5"
                    style={{
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "rgba(228,232,255,0.28)",
                    }}
                  >
                    в разработке
                  </span>
                )}

                <div className="flex flex-col gap-3">
                  {/* Icon */}
                  <div
                    className="w-10 h-10 flex items-center justify-center"
                    style={{
                      borderRadius: 12,
                      background: isHovered
                        ? "rgba(139,124,255,0.20)"
                        : "rgba(139,124,255,0.10)",
                      border: "1px solid rgba(139,124,255,0.20)",
                      transition: "all 0.2s",
                    }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: isHovered ? "#a394ff" : "#8b7cff" }}
                    />
                  </div>

                  {/* Text */}
                  <div className="flex flex-col gap-0.5 pr-8">
                    <span
                      className="font-semibold text-[15px]"
                      style={{
                        color: isHovered ? "rgba(228,232,255,0.95)" : "rgba(228,232,255,0.72)",
                        transition: "color 0.2s",
                      }}
                    >
                      {title}
                    </span>
                    <span
                      className="text-xs"
                      style={{
                        color: isHovered ? "rgba(228,232,255,0.42)" : "rgba(228,232,255,0.28)",
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
          style={{ color: "rgba(255,255,255,0.10)" }}
        >
          Демо-навигатор · данные не сохраняются
        </div>
      </div>
    </div>
  );
}
