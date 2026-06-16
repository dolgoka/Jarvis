import { useState } from "react";
import { Globe, BarChart2, Users2, ClipboardList, Sun, Moon, ArrowLeft, Loader2, Check } from "lucide-react";
import type { Role } from "@/hooks/useRole";
import { useTheme } from "@/hooks/ThemeContext";
import { useListPeople } from "@workspace/api-client-react";

interface Card {
  role: Role;
  icon: React.ElementType;
  title: string;
  desc: string;
  wip: boolean;
}

const CARDS: Card[] = [
  { role: "client",    icon: Globe,          title: "Заказчик",               desc: "Полный обзор холдинга",   wip: false },
  { role: "director",  icon: BarChart2,       title: "Директор / C-level",     desc: "Своё направление",        wip: true  },
  { role: "partner",   icon: Users2,          title: "Партнёр",                desc: "Внешний контур",          wip: true  },
  { role: "staff",     icon: ClipboardList,   title: "Сотрудник",              desc: "Мои задачи и инбокс",     wip: false },
];

const STARS = [
  { top: "10%",  left: "18%",  size: 1.5 },
  { top: "7%",   left: "64%",  size: 1   },
  { top: "25%",  left: "91%",  size: 2   },
  { top: "78%",  left: "5%",   size: 1.5 },
  { top: "82%",  left: "58%",  size: 1   },
  { top: "48%",  left: "85%",  size: 1.5 },
];

const HF = "'Hanken Grotesk', system-ui, sans-serif";

interface RoleSelectProps {
  onSelect: (role: Role, personId?: number) => void;
}

/* ── Person picker (second step for staff) ─────────────────────────────── */
function PersonPicker({
  onPick,
  onBack,
}: {
  onPick: (personId: number) => void;
  onBack: () => void;
}) {
  const { data: people = [], isLoading } = useListPeople();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 38, height: 38, borderRadius: 12, cursor: "pointer",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(228,232,255,0.55)",
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
        </button>
        <div>
          <div style={{ fontFamily: HF, fontWeight: 700, fontSize: 17, color: "rgba(228,232,255,0.88)" }}>
            Сотрудник
          </div>
          <div style={{ fontFamily: HF, fontSize: 12, color: "rgba(228,232,255,0.35)", marginTop: 1 }}>
            Выберите свою роль
          </div>
        </div>
      </div>

      {/* People list */}
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 10, color: "rgba(228,232,255,0.30)", fontFamily: HF, fontSize: 13 }}>
          <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
          Загрузка…
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
          {people.map(person => {
            const isHov = hovered === person.id;
            return (
              <button
                key={person.id}
                onClick={() => onPick(person.id)}
                onMouseEnter={() => setHovered(person.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "13px 16px", borderRadius: 14, textAlign: "left",
                  background: isHov ? "rgba(91,139,208,0.12)" : "rgba(255,255,255,0.04)",
                  border: isHov ? "1px solid rgba(91,139,208,0.35)" : "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer", transition: "all 150ms", fontFamily: HF,
                }}
              >
                {/* Avatar with initials */}
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isHov ? "rgba(91,139,208,0.20)" : "rgba(91,139,208,0.10)",
                  border: `1.5px solid ${isHov ? "rgba(91,139,208,0.50)" : "rgba(91,139,208,0.25)"}`,
                  fontSize: 12, fontWeight: 700, color: isHov ? "#5b8bd0" : "rgba(91,139,208,0.65)",
                }}>
                  {person.role.slice(0, 2).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isHov ? "rgba(228,232,255,0.92)" : "rgba(228,232,255,0.72)", lineHeight: 1.2 }}>
                    {person.role}
                  </div>
                  {person.groupLabel && (
                    <div style={{ fontSize: 11, color: "rgba(228,232,255,0.30)", marginTop: 2 }}>
                      {person.groupLabel}
                    </div>
                  )}
                </div>

                {person.isInnerCircle && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6,
                    background: "rgba(0,212,255,0.10)", color: "rgba(0,212,255,0.70)",
                    border: "1px solid rgba(0,212,255,0.20)", letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}>
                    Ближний круг
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main RoleSelect ────────────────────────────────────────────────────── */
export default function RoleSelect({ onSelect }: RoleSelectProps) {
  const [hovered, setHovered] = useState<Role | null>(null);
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  function handleCardClick(role: Role) {
    if (role === "staff") {
      setStaffPickerOpen(true);
    } else {
      onSelect(role);
    }
  }

  function handlePersonPick(personId: number) {
    onSelect("staff", personId);
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: "var(--jarvis-bg-screen)", fontFamily: HF }}
    >
      {/* Ambient glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div style={{ position: "absolute", width: "60vw", height: "60vw", top: "-10%", left: "-5%", borderRadius: "50%", background: "var(--jarvis-blob-1-bg)", animation: "glow-drift 20s ease-in-out infinite alternate", willChange: "transform" }} />
        <div style={{ position: "absolute", width: "50vw", height: "50vw", bottom: "-5%", right: "-5%", borderRadius: "50%", background: "var(--jarvis-blob-2-bg)", animation: "glow-drift-r 24s ease-in-out infinite alternate", willChange: "transform" }} />
        <div style={{ position: "absolute", width: "40vw", height: "40vw", top: "30%", right: "15%", borderRadius: "50%", background: "var(--jarvis-blob-3-bg)", animation: "glow-drift 28s ease-in-out infinite alternate-reverse", willChange: "transform" }} />
        <div style={{ position: "absolute", width: "35vw", height: "35vw", bottom: "20%", left: "10%", borderRadius: "50%", background: "var(--jarvis-blob-4-bg)", animation: "glow-drift-r 22s ease-in-out infinite alternate-reverse", willChange: "transform" }} />
      </div>

      {/* Star particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {STARS.map((star, i) => (
          <div key={i} style={{ position: "absolute", width: star.size, height: star.size, borderRadius: "50%", background: "var(--jarvis-star-color)", top: star.top, left: star.left, boxShadow: `0 0 ${star.size * 3}px var(--jarvis-star-glow)` }} />
        ))}
      </div>

      {/* Main layout */}
      <div className="relative w-full max-w-2xl mx-auto px-4 flex flex-col items-center gap-10">

        {/* Brand */}
        {!staffPickerOpen && (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              className="w-14 h-14 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 relative group"
              style={{ borderRadius: 16, background: "var(--jarvis-accent-12)", border: "1.5px solid var(--jarvis-accent-35)", boxShadow: "0 4px 20px rgba(0,212,255,0.16)", cursor: "pointer" }}
            >
              <Globe className="w-6 h-6 transition-opacity duration-200 group-hover:opacity-0 absolute" style={{ color: "var(--jarvis-accent)" }} />
              {theme === "dark"
                ? <Sun className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ color: "var(--jarvis-accent)" }} />
                : <Moon className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ color: "var(--jarvis-accent)" }} />
              }
            </button>
            <div className="flex flex-col items-center gap-1">
              <span className="font-bold text-2xl tracking-widest" style={{ color: "var(--jarvis-text-primary)" }}>JARVIS</span>
              <span className="text-sm" style={{ color: "var(--jarvis-text-muted)", fontWeight: 400 }}>Выберите роль</span>
            </div>
          </div>
        )}

        {/* Step 1: Role cards */}
        {!staffPickerOpen && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CARDS.map(({ role, icon: Icon, title, desc, wip }) => {
              const isHovered = hovered === role;
              const isClient = role === "client";
              return (
                <button
                  key={role}
                  onClick={() => handleCardClick(role)}
                  onMouseEnter={() => setHovered(role)}
                  onMouseLeave={() => setHovered(null)}
                  className="jarvis-btn relative text-left p-5 transition-all duration-200 focus:outline-none"
                  style={{
                    borderRadius: 18,
                    background: isHovered ? "var(--jarvis-accent-08)" : "var(--jarvis-glass-bg)",
                    border: isHovered ? `1px solid var(--jarvis-${isClient ? "accent-35" : "accent-20"})` : "1px solid var(--jarvis-glass-border)",
                    backdropFilter: "blur(16px) saturate(140%)",
                    WebkitBackdropFilter: "blur(16px) saturate(140%)",
                    boxShadow: isHovered ? "0 8px 32px rgba(0,212,255,0.12)" : "0 2px 12px rgba(0,0,0,0.35)",
                    transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                    opacity: wip && !isHovered ? 0.70 : 1,
                  }}
                >
                  {wip && (
                    <span className="absolute top-2 right-3.5 text-[9px] font-semibold tracking-wide px-2 py-0.5" style={{ borderRadius: 6, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(220,235,255,0.40)" }}>
                      В разработке
                    </span>
                  )}
                  <div className="flex flex-col gap-3">
                    <div className="w-10 h-10 flex items-center justify-center" style={{ borderRadius: 12, background: isHovered ? "var(--jarvis-accent-20)" : "var(--jarvis-accent-12)", border: "1px solid var(--jarvis-accent-20)", transition: "all 0.2s" }}>
                      <Icon className="w-5 h-5" style={{ color: "var(--jarvis-accent)" }} />
                    </div>
                    <div className="flex flex-col gap-0.5 pr-8">
                      <span className="font-semibold text-[15px]" style={{ color: isHovered ? "var(--jarvis-text-primary)" : "var(--jarvis-text-secondary)", transition: "color 0.2s" }}>
                        {title}
                      </span>
                      <span className="text-xs" style={{ color: isHovered ? "var(--jarvis-text-secondary)" : "var(--jarvis-text-muted)", transition: "color 0.2s" }}>
                        {desc}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Person picker (staff) */}
        {staffPickerOpen && (
          <PersonPicker
            onPick={handlePersonPick}
            onBack={() => setStaffPickerOpen(false)}
          />
        )}

        {/* Footer */}
        {!staffPickerOpen && (
          <div className="text-[11px] text-center" style={{ color: "var(--jarvis-text-muted)" }}>
            Демо-навигатор · данные не сохраняются
          </div>
        )}
      </div>
    </div>
  );
}
