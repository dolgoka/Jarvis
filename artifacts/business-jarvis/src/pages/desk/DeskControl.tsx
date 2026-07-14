import { useState } from "react";
import { Mic, CheckCircle, AlertTriangle, ChevronRight, RotateCcw, Edit2 } from "lucide-react";

const HF = "'Hanken Grotesk', system-ui, sans-serif";

const TRANSCRIPT = "Перевести КП по топливу на английский и отправить в Газпромнефть, срочно, поручить Николаю";

type LoadChoice = "keep" | "reassign" | "postpone";

export default function DeskControl() {
  const [step, setStep] = useState(0);
  const [loadChoice, setLoadChoice] = useState<LoadChoice>("keep");

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--jarvis-bg-screen)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "24px 20px 40px",
      boxSizing: "border-box",
      fontFamily: HF,
    }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 520, marginBottom: 28 }}>
        <h1 style={{
          margin: 0,
          fontWeight: 800, fontSize: 22,
          color: "var(--jarvis-text-primary)",
          letterSpacing: "-0.01em",
        }}>
          Пульт
        </h1>
        <p style={{
          margin: "4px 0 0",
          fontSize: 13,
          color: "var(--jarvis-text-secondary)",
        }}>
          Голосовая постановка задачи
        </p>
      </div>

      {/* Step indicator */}
      <StepDots current={step} total={4} />

      {/* Steps */}
      <div style={{ width: "100%", maxWidth: 520, marginTop: 28 }}>
        {step === 0 && <Step0 onNext={() => setStep(1)} />}
        {step === 1 && <Step1 onNext={() => setStep(2)} />}
        {step === 2 && <Step2 loadChoice={loadChoice} setLoadChoice={setLoadChoice} onConfirm={() => setStep(3)} />}
        {step === 3 && <Step3 onReset={() => { setStep(0); setLoadChoice("keep"); }} />}
      </div>
    </div>
  );
}

/* ── Step dots ──────────────────────────────────────────────────────────── */
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6,
          height: 6, borderRadius: 3,
          background: i === current
            ? "var(--jarvis-accent)"
            : i < current
            ? "rgba(0,212,255,0.30)"
            : "rgba(228,232,255,0.10)",
          transition: "all 250ms",
        }} />
      ))}
    </div>
  );
}

/* ── Step 0: big mic button ─────────────────────────────────────────────── */
function Step0({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
      <div style={{
        background: "var(--jarvis-bg-card)",
        border: "1px solid var(--jarvis-glass-border)",
        borderRadius: 20, padding: "48px 32px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
        width: "100%", boxSizing: "border-box",
      }}>
        {/* Mic pulse ring */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            position: "absolute",
            width: 100, height: 100, borderRadius: "50%",
            background: "rgba(0,212,255,0.06)",
            border: "1px solid rgba(0,212,255,0.15)",
            animation: "pulse 2s infinite",
          }} />
          <div style={{
            position: "absolute",
            width: 76, height: 76, borderRadius: "50%",
            background: "rgba(0,212,255,0.08)",
            border: "1px solid rgba(0,212,255,0.20)",
          }} />
          <button
            onClick={onNext}
            style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "var(--jarvis-accent)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative", zIndex: 1,
              boxShadow: "0 0 24px rgba(0,212,255,0.40)",
            }}
          >
            <Mic style={{ width: 24, height: 24, color: "#040810" }} />
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 8 }}>
          <div style={{
            fontSize: 16, fontWeight: 700,
            color: "var(--jarvis-text-primary)", marginBottom: 6,
          }}>
            Нажми и скажи
          </div>
          <div style={{ fontSize: 13, color: "var(--jarvis-text-secondary)", lineHeight: 1.5 }}>
            Скажи задачу вслух — кому, что сделать, срок.<br />
            ИИ структурирует поручение автоматически.
          </div>
        </div>

        <button
          onClick={onNext}
          style={{
            height: 44, padding: "0 28px", borderRadius: 22,
            background: "rgba(0,212,255,0.10)",
            border: "1px solid rgba(0,212,255,0.30)",
            color: "var(--jarvis-accent)",
            cursor: "pointer", fontFamily: HF, fontWeight: 600, fontSize: 14,
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <Mic style={{ width: 14, height: 14 }} />
          Нажми и скажи
        </button>
      </div>

      <p style={{ fontSize: 12, color: "var(--jarvis-text-muted)", textAlign: "center", margin: 0 }}>
        Пример: «Перевести КП по топливу, срочно, поручить Николаю»
      </p>
    </div>
  );
}

/* ── Step 1: transcript + type recognition ──────────────────────────────── */
const INTENT_TYPES = [
  { id: "task",     label: "Задача", selected: true },
  { id: "reminder", label: "Напомнить мне", selected: false },
  { id: "boss",     label: "Шефу", selected: false },
  { id: "card",     label: "В карточку", selected: false },
];

function Step1({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState("task");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Transcript block */}
      <Card>
        <SectionLabel>🎙 Расшифровка</SectionLabel>
        <div style={{
          marginTop: 10, padding: "12px 14px",
          background: "var(--jarvis-bg-card-inner, #0b1428)",
          borderRadius: 8, border: "1px solid var(--jarvis-glass-border)",
        }}>
          <p style={{
            margin: 0, fontSize: 14, fontWeight: 500,
            color: "var(--jarvis-text-primary)", lineHeight: 1.55,
            fontStyle: "italic",
          }}>
            «{TRANSCRIPT}»
          </p>
        </div>
      </Card>

      {/* Intent recognition */}
      <Card>
        <SectionLabel>ИИ распознал:</SectionLabel>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {INTENT_TYPES.map((t) => {
            const active = selected === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                style={{
                  height: 34, padding: "0 14px", borderRadius: 17,
                  background: active ? "rgba(0,212,255,0.12)" : "var(--jarvis-bg-screen)",
                  border: active
                    ? "1px solid rgba(0,212,255,0.50)"
                    : "1px solid var(--jarvis-glass-border)",
                  color: active ? "var(--jarvis-accent)" : "var(--jarvis-text-secondary)",
                  cursor: "pointer", fontFamily: HF, fontWeight: 600, fontSize: 12,
                  display: "flex", alignItems: "center", gap: 4,
                  transition: "all 140ms",
                }}
              >
                {t.label}
                {active && <span style={{ fontSize: 11 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </Card>

      <button
        onClick={onNext}
        style={primaryBtn}
      >
        Дальше
        <ChevronRight style={{ width: 15, height: 15 }} />
      </button>
    </div>
  );
}

/* ── Step 2: draft task ─────────────────────────────────────────────────── */
function Step2({
  loadChoice,
  setLoadChoice,
  onConfirm,
}: {
  loadChoice: LoadChoice;
  setLoadChoice: (c: LoadChoice) => void;
  onConfirm: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Draft card */}
      <Card>
        <SectionLabel>Черновик задачи</SectionLabel>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          {/* Assignee */}
          <Row label="Исполнитель">
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Avatar initials="НК" color="#00d4ff" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--jarvis-text-primary)" }}>Николай</div>
                <div style={{ fontSize: 11, color: "var(--jarvis-text-secondary)" }}>опер. директор</div>
              </div>
            </div>
          </Row>

          <Divider />

          {/* Deadline */}
          <Row label="Срок">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--jarvis-text-primary)" }}>Сегодня</span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: "rgba(240,98,90,0.12)",
                border: "1px solid rgba(240,98,90,0.30)",
                color: "#f0625a",
                padding: "2px 8px", borderRadius: 5,
              }}>
                🔴 Срочно
              </span>
            </div>
          </Row>

          <Divider />

          {/* Project */}
          <Row label="Проект">
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--jarvis-text-primary)" }}>
              Нефтетрейдинг ГПН
            </span>
          </Row>

          <Divider />

          {/* Add co-exec */}
          <button style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: HF, fontSize: 12, fontWeight: 600,
            color: "var(--jarvis-accent)",
            padding: "6px 0", textAlign: "left",
            display: "flex", alignItems: "center", gap: 5,
            opacity: 0.75,
          }}>
            + добавить соисполнителя
          </button>
        </div>
      </Card>

      {/* Load warning */}
      <div style={{
        background: "rgba(240,181,74,0.06)",
        border: "1px solid rgba(240,181,74,0.35)",
        borderRadius: 12, padding: "14px 16px",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          marginBottom: 10,
        }}>
          <AlertTriangle style={{ width: 14, height: 14, color: "#f0b54a", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: "#f0b54a", letterSpacing: "0.04em" }}>
            ПРОВЕРКА НАГРУЗКИ
          </span>
        </div>
        <p style={{
          margin: "0 0 12px",
          fontSize: 12, color: "var(--jarvis-text-secondary)", lineHeight: 1.5,
        }}>
          Николай сегодня загружен: <strong style={{ color: "var(--jarvis-text-primary)" }}>6 задач</strong>, <strong style={{ color: "#f0625a" }}>2 горящие</strong>
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {([ 
            { id: "keep",     label: "Оставить Николаю" },
            { id: "reassign", label: "Отдать Ане (свободна)" },
            { id: "postpone", label: "Перенести срок" },
          ] as { id: LoadChoice; label: string }[]).map((opt) => {
            const sel = loadChoice === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setLoadChoice(opt.id)}
                style={{
                  height: 44, padding: "0 14px", borderRadius: 10,
                  background: sel ? "rgba(240,181,74,0.14)" : "rgba(228,232,255,0.03)",
                  border: sel
                    ? "1px solid rgba(240,181,74,0.50)"
                    : "1px solid rgba(228,232,255,0.08)",
                  color: sel ? "#f0b54a" : "var(--jarvis-text-secondary)",
                  cursor: "pointer", fontFamily: HF, fontWeight: 600, fontSize: 13,
                  textAlign: "left", display: "flex", alignItems: "center", gap: 8,
                  transition: "all 130ms",
                }}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: "50%",
                  border: sel ? "4px solid #f0b54a" : "2px solid rgba(228,232,255,0.20)",
                  flexShrink: 0, boxSizing: "border-box",
                  background: sel ? "#f0b54a" : "transparent",
                  display: "inline-block",
                  transition: "all 130ms",
                }} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button style={secondaryBtn}>
          <Mic style={{ width: 13, height: 13 }} />
          Поправить
        </button>
        <button style={secondaryBtn}>
          <Edit2 style={{ width: 13, height: 13 }} />
          Изменить
        </button>
        <button
          onClick={onConfirm}
          style={{ ...primaryBtn, flex: 1 }}
        >
          ✅ Подтвердить
        </button>
      </div>
    </div>
  );
}

/* ── Step 3: success ────────────────────────────────────────────────────── */
function Step3({ onReset }: { onReset: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{
        background: "var(--jarvis-bg-card)",
        border: "1px solid rgba(62,217,160,0.30)",
        borderRadius: 20, padding: "48px 32px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        width: "100%", boxSizing: "border-box", textAlign: "center",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "rgba(62,217,160,0.12)",
          border: "1px solid rgba(62,217,160,0.30)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <CheckCircle style={{ width: 30, height: 30, color: "#3ed9a0" }} />
        </div>

        <div>
          <div style={{
            fontSize: 18, fontWeight: 800,
            color: "#3ed9a0", marginBottom: 10,
          }}>
            Задача улетела
          </div>
          <div style={{
            fontSize: 14, color: "var(--jarvis-text-secondary)",
            lineHeight: 1.6, maxWidth: 320,
          }}>
            Николай получил уведомление.<br />
            Появилась в разделе <span style={{ color: "var(--jarvis-text-primary)", fontWeight: 600 }}>Проекты</span>.
          </div>
        </div>

        {/* Task summary pill */}
        <div style={{
          background: "rgba(62,217,160,0.06)",
          border: "1px solid rgba(62,217,160,0.15)",
          borderRadius: 10, padding: "10px 16px",
          fontSize: 12, color: "var(--jarvis-text-secondary)",
          lineHeight: 1.5, maxWidth: 340,
          textAlign: "left", width: "100%", boxSizing: "border-box",
        }}>
          <span style={{ color: "var(--jarvis-text-muted)", fontSize: 11 }}>Задача</span><br />
          <span style={{ fontWeight: 600, color: "var(--jarvis-text-primary)" }}>
            Перевести КП по топливу на английский → Газпромнефть
          </span><br />
          <span style={{ color: "#f0625a", fontWeight: 600 }}>🔴 Срочно</span>
          {" · "}
          <span>Николай · сегодня</span>
        </div>
      </div>

      <button
        onClick={onReset}
        style={{
          height: 44, padding: "0 24px", borderRadius: 22,
          background: "var(--jarvis-bg-card)",
          border: "1px solid var(--jarvis-glass-border)",
          color: "var(--jarvis-text-secondary)",
          cursor: "pointer", fontFamily: HF, fontWeight: 600, fontSize: 14,
          display: "flex", alignItems: "center", gap: 7,
        }}
      >
        <RotateCcw style={{ width: 13, height: 13 }} />
        Поставить ещё
      </button>
    </div>
  );
}

/* ── Shared mini-components ─────────────────────────────────────────────── */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--jarvis-bg-card)",
      border: "1px solid var(--jarvis-glass-border)",
      borderRadius: 12, padding: "14px 16px",
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700,
      color: "var(--jarvis-text-muted)",
      letterSpacing: "0.07em", textTransform: "uppercase",
    }}>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 12, color: "var(--jarvis-text-muted)", flexShrink: 0 }}>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--jarvis-glass-border)" }} />;
}

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: `${color}18`,
      border: `1.5px solid ${color}50`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 800, color,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  height: 44, padding: "0 20px", borderRadius: 22,
  background: "var(--jarvis-accent)",
  border: "none",
  color: "#040810",
  cursor: "pointer", fontFamily: HF, fontWeight: 700, fontSize: 14,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
};

const secondaryBtn: React.CSSProperties = {
  height: 44, padding: "0 14px", borderRadius: 22,
  background: "var(--jarvis-bg-card)",
  border: "1px solid var(--jarvis-glass-border)",
  color: "var(--jarvis-text-secondary)",
  cursor: "pointer", fontFamily: HF, fontWeight: 600, fontSize: 13,
  display: "flex", alignItems: "center", gap: 6,
};
