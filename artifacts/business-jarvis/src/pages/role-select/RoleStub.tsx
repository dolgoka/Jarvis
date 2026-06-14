import { Globe } from "lucide-react";
import type { Role } from "@/hooks/useRole";

const ROLE_LABELS: Record<Role, string> = {
  client:   "Заказчика",
  director: "Директора / C-level",
  partner:  "Партнёра",
  staff:    "Сотрудника / офис-менеджера",
};

interface RoleStubProps {
  role: Role;
  onBack: () => void;
}

export default function RoleStub({ role, onBack }: RoleStubProps) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#0b0b12", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{
          position: "absolute", width: "55vw", height: "55vw",
          top: "-10%", left: "-5%", borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(139,124,255,0.14) 0%, transparent 70%)",
          animation: "glow-drift 20s ease-in-out infinite alternate",
        }} />
        <div style={{
          position: "absolute", width: "45vw", height: "45vw",
          bottom: "-5%", right: "-5%", borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(95,168,255,0.10) 0%, transparent 70%)",
          animation: "glow-drift-r 24s ease-in-out infinite alternate",
        }} />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center gap-6 px-6 text-center">
        <div
          className="w-12 h-12 flex items-center justify-center"
          style={{
            borderRadius: 14,
            background: "rgba(139,124,255,0.12)",
            border: "1.5px solid rgba(139,124,255,0.30)",
          }}
        >
          <Globe className="w-5 h-5" style={{ color: "#8b7cff" }} />
        </div>

        <div>
          <div
            className="font-bold text-xl mb-2"
            style={{ color: "rgba(228,232,255,0.88)", letterSpacing: "0.01em" }}
          >
            Кабинет {ROLE_LABELS[role]}
          </div>
          <div
            className="text-sm"
            style={{ color: "rgba(228,232,255,0.30)" }}
          >
            В разработке
          </div>
        </div>

        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all duration-200"
          style={{
            borderRadius: 12,
            background: "rgba(139,124,255,0.10)",
            border: "1px solid rgba(139,124,255,0.25)",
            color: "rgba(228,232,255,0.55)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(139,124,255,0.18)";
            e.currentTarget.style.color = "rgba(228,232,255,0.85)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(139,124,255,0.10)";
            e.currentTarget.style.color = "rgba(228,232,255,0.55)";
          }}
        >
          ← К выбору роли
        </button>
      </div>
    </div>
  );
}
