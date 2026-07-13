/**
 * DeskPersonDetail — stub for /people/:id.
 * Full partner card is Task 4b.
 */
import { useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { BATOV_PEOPLE } from "@/data/batov-people";

const HF = "'Hanken Grotesk', system-ui, sans-serif";

export default function DeskPersonDetail() {
  const [, params] = useRoute<{ id: string }>("/people/:id");
  const person = BATOV_PEOPLE.find((p) => p.id === params?.id);

  return (
    <div style={{
      minHeight: "100dvh", padding: "32px 28px",
      fontFamily: HF, color: "rgba(228,232,255,0.88)",
    }}>
      <Link href="/people" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 13, color: "rgba(228,232,255,0.40)", textDecoration: "none",
        marginBottom: 28,
      }}>
        <ArrowLeft style={{ width: 14, height: 14 }} />
        Люди
      </Link>

      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        {person ? person.name : "Партнёр не найден"}
      </div>
      {person && (
        <div style={{ fontSize: 13, color: "rgba(228,232,255,0.40)" }}>
          {person.company} · {person.role}
        </div>
      )}

      <div style={{
        marginTop: 40, padding: "20px 24px", borderRadius: 14,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        fontSize: 13, color: "rgba(228,232,255,0.35)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>🚧</span>
        Карточка партнёра — Task 4b
      </div>
    </div>
  );
}
