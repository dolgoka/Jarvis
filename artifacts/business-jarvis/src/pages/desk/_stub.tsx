/**
 * Shared stub component for desk pages not yet implemented.
 * Used by DeskToday, DeskPeople, DeskDeals, DeskControl, DeskDiary during Phase 0.
 */
import { type LucideIcon } from "lucide-react";

const HF = "'Hanken Grotesk', system-ui, sans-serif";

export function DeskStub({
  icon: Icon,
  title,
  description,
  phase,
  color = "rgba(0,212,255,0.60)",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: number;
  color?: string;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100dvh",
      padding: "60px 40px", gap: 20,
    }}>
      {/* Icon */}
      <div style={{
        width: 60, height: 60, borderRadius: 18, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,212,255,0.07)",
        border: "1.5px solid rgba(0,212,255,0.18)",
      }}>
        <Icon style={{ width: 26, height: 26, color }} />
      </div>

      {/* Text */}
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{
          fontFamily: HF, fontSize: 22, fontWeight: 700,
          color: "rgba(228,232,255,0.82)", marginBottom: 8,
        }}>
          {title}
        </div>
        <div style={{
          fontFamily: HF, fontSize: 13, lineHeight: 1.6,
          color: "rgba(228,232,255,0.35)",
        }}>
          {description}
        </div>
      </div>

      {/* Phase badge */}
      <span style={{
        fontSize: 10, fontWeight: 700,
        padding: "4px 12px", borderRadius: 8,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: "rgba(228,232,255,0.28)",
        letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: HF,
      }}>
        Фаза {phase} · В разработке
      </span>
    </div>
  );
}
