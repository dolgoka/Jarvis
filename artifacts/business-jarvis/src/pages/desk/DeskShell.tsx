import { lazy, Suspense } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import {
  Sun, Users, Briefcase, ClipboardList,
  Radio, BookOpen, RefreshCcw, CalendarDays, Loader2, BarChart2,
} from "lucide-react";
import { useAuthContext } from "@/hooks/AuthContext";
import { useListPeople } from "@workspace/api-client-react";

const DeskToday        = lazy(() => import("./DeskToday"));
const DeskPeople       = lazy(() => import("./DeskPeople"));
const DeskPersonDetail = lazy(() => import("./DeskPersonDetail"));
const DeskDeals        = lazy(() => import("./DeskDeals"));
const DeskTasks        = lazy(() => import("./DeskTasks"));
const DeskControl      = lazy(() => import("./DeskControl"));
const DeskDiary        = lazy(() => import("./DeskDiary"));
const DeskNumbers      = lazy(() => import("./DeskNumbers"));

const HF = "'Hanken Grotesk', system-ui, sans-serif";

const NAV = [
  { href: "/",        label: "Сегодня",    icon: Sun,          phase: 1 },
  { href: "/people",  label: "Люди",       icon: Users,        phase: 1 },
  { href: "/deals",   label: "Проекты",    icon: Briefcase,    phase: 2 },
  { href: "/tasks",   label: "Задачи",     icon: ClipboardList,phase: 2 },
  { href: "/control", label: "Пульт",      icon: Radio,        phase: 3 },
  { href: "/diary",   label: "Дневник",    icon: BookOpen,     phase: 3 },
];

/* ── Persona card ───────────────────────────────────────────────────────── */
function PersonaCard({ personId }: { personId: number | null }) {
  const { data: people = [], isLoading } = useListPeople();
  const person = personId ? people.find((p) => p.id === personId) : null;

  if (isLoading) {
    return (
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 8, color: "rgba(228,232,255,0.25)" }}>
        <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const initials = (person?.name ?? "??").slice(0, 2).toUpperCase();
  const name     = person?.name ?? "Директор";
  const role     = person?.role ?? "";

  return (
    <div style={{ padding: "14px 16px 12px", display: "flex", alignItems: "center", gap: 10 }}>
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,212,255,0.10)", border: "1.5px solid rgba(0,212,255,0.28)",
        fontSize: 11, fontWeight: 700, color: "rgba(0,212,255,0.85)", fontFamily: HF,
        letterSpacing: "0.04em",
      }}>
        {initials}
      </div>
      {/* Info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontFamily: HF, fontWeight: 700, fontSize: 13,
          color: "rgba(228,232,255,0.92)", lineHeight: 1.2,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {name}
        </div>
        {role && (
          <div style={{
            fontFamily: HF, fontSize: 9, color: "rgba(0,212,255,0.65)",
            marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700,
          }}>
            {role}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── DeskShell ──────────────────────────────────────────────────────────── */
export function DeskShell() {
  const [location] = useLocation();
  const { switchRole, personId } = useAuthContext();

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const PageFallback = (
    <div style={{ width: "100%", height: "100dvh", background: "#0b0b12" }} />
  );

  return (
    <div style={{
      display: "flex", height: "100dvh", overflow: "hidden",
      background: "var(--jarvis-bg-screen)",
      color: "rgba(228,232,255,0.9)",
      fontFamily: HF,
    }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        display: "flex", flexDirection: "column",
        background: "var(--jarvis-nav-bg)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        borderRight: "1px solid var(--jarvis-nav-border)",
        zIndex: 20,
      }}>

        {/* Logo */}
        <div style={{
          height: 56, display: "flex", alignItems: "center",
          padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarDays style={{ width: 16, height: 16, color: "var(--jarvis-accent)" }} />
            <span style={{
              fontWeight: 700, letterSpacing: "0.14em", fontSize: 13,
              color: "var(--jarvis-text-primary)", fontFamily: HF,
            }}>
              СТОЛ
            </span>
          </div>
        </div>

        {/* Persona card */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <PersonaCard personId={personId} />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.10em", color: "rgba(228,232,255,0.22)",
            padding: "0 8px", marginBottom: 6,
          }}>
            Навигация
          </div>

          {NAV.map(({ href, label, icon: Icon, phase }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "0 10px", height: 44, borderRadius: 10,
                  color: active ? "var(--jarvis-accent)" : "rgba(228,232,255,0.42)",
                  background: active ? "rgba(0,60,100,0.32)" : "transparent",
                  border: active ? "1px solid rgba(0,212,255,0.20)" : "1px solid transparent",
                  textDecoration: "none", transition: "all 150ms",
                  fontSize: 13, fontWeight: 500, fontFamily: HF,
                  cursor: "pointer",
                }}
              >
                <Icon style={{
                  width: 14, height: 14, flexShrink: 0,
                  color: active ? "var(--jarvis-accent)" : "rgba(228,232,255,0.28)",
                }} />
                <span style={{ flex: 1 }}>{label}</span>
                {phase > 1 && !active && (
                  <span style={{
                    fontSize: 8, fontWeight: 700,
                    padding: "1px 5px", borderRadius: 4,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    color: "rgba(228,232,255,0.20)",
                    letterSpacing: "0.05em", textTransform: "uppercase",
                  }}>
                    Ф{phase}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Numbers shortcut + Switch role */}
        <div style={{ padding: "8px 10px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <Link
            href="/numbers"
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "0 10px", height: 38, borderRadius: 10,
              color: "rgba(228,232,255,0.32)", background: "none",
              border: "none", cursor: "pointer",
              fontSize: 12, fontFamily: HF, fontWeight: 500,
              textDecoration: "none", marginBottom: 2,
            }}
          >
            <BarChart2 style={{ width: 13, height: 13 }} />
            Цифры
          </Link>
          <button
            onClick={switchRole}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "0 10px", height: 44, borderRadius: 10,
              color: "rgba(228,232,255,0.22)", background: "none",
              border: "none", cursor: "pointer",
              fontSize: 12, fontFamily: HF, fontWeight: 500,
            }}
          >
            <RefreshCcw style={{ width: 13, height: 13 }} />
            Сменить роль
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <main style={{ flex: 1, minWidth: 0, overflow: "auto", position: "relative" }}>
        <Suspense fallback={PageFallback}>
          <Switch>
            <Route path="/"           component={DeskToday}        />
            <Route path="/people"     component={DeskPeople}       />
            <Route path="/people/:id" component={DeskPersonDetail} />
            <Route path="/deals"      component={DeskDeals}        />
            <Route path="/tasks"      component={DeskTasks}        />
            <Route path="/control"    component={DeskControl}      />
            <Route path="/diary"      component={DeskDiary}        />
            <Route path="/numbers"    component={DeskNumbers}      />
          </Switch>
        </Suspense>
      </main>
    </div>
  );
}
