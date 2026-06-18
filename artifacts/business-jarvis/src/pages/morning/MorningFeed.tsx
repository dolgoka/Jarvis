import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import {
  Mic, MicOff, Loader2, CheckCircle2, X,
  ChevronLeft, ChevronRight, Bell, Play, Users,
} from "lucide-react";
import { Link } from "wouter";

const HF = "'Hanken Grotesk', system-ui, sans-serif";
const API_TOKEN = (import.meta.env.VITE_API_TOKEN as string) ?? "";

function apiFetch(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-token": API_TOKEN,
      ...options.headers,
    },
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

type FeedItem = {
  id: number;
  businessId: number | null;
  businessName: string | null;
  type: "task_stuck" | "staff" | "red_zone" | "routine";
  severity: "critical" | "important" | "info";
  title: string;
  body: string;
  relatedPerson: string | null;
  recommendation: string | null;
  defaultAssignee: string | null;
  status: string;
  createdAt: string;
};

// ── Severity config ───────────────────────────────────────────────────────────

const SEV = {
  critical:  { label: "Срочно",  color: "#f0625a", bg: "rgba(240,98,90,0.12)",  border: "#f0625a" },
  important: { label: "Важно",   color: "#f0b54a", bg: "rgba(240,181,74,0.10)", border: "#f0b54a" },
  info:      { label: "Инфо",    color: "#6ee7f7", bg: "rgba(110,231,247,0.08)", border: "#6ee7f7" },
};

const TYPE_LABEL: Record<string, string> = {
  task_stuck: "Задача зависла",
  staff:      "Персонал",
  red_zone:   "Красная зона",
  routine:    "Плановое",
};

// ── Background orb ────────────────────────────────────────────────────────────

function GlobeOrb() {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 520, height: 520, borderRadius: "50%",
        background: "radial-gradient(circle at 38% 38%, rgba(0,220,255,0.07) 0%, rgba(0,160,255,0.04) 35%, transparent 70%)",
        border: "1px solid rgba(0,220,255,0.08)",
        animation: "orbPulse 8s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 320, height: 320, borderRadius: "50%",
        background: "radial-gradient(circle at 42% 42%, rgba(0,200,255,0.04) 0%, transparent 65%)",
        border: "1px solid rgba(0,200,255,0.05)",
        animation: "orbPulse 8s ease-in-out infinite 2s",
      }} />
    </div>
  );
}

// ── Severity counter badge ────────────────────────────────────────────────────

function SevBadge({ color, count, label }: { color: string; count: number; label: string }) {
  if (count === 0) return null;
  return (
    <span style={{
      fontFamily: HF, fontSize: 11, fontWeight: 700,
      padding: "3px 8px", borderRadius: 20,
      background: `${color}18`,
      border: `1px solid ${color}44`,
      color,
      letterSpacing: "0.04em",
      display: "flex", alignItems: "center", gap: 4,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label} {count}
    </span>
  );
}

// ── Card component ────────────────────────────────────────────────────────────

function FeedCard({ item, stackIdx }: { item: FeedItem; stackIdx: number }) {
  const sev = SEV[item.severity];
  const isCrit = item.severity === "critical";
  const behind = stackIdx > 0;

  const rotate = stackIdx === 1 ? "-2.5deg" : stackIdx === 2 ? "-5deg" : "0deg";
  const scale  = stackIdx === 1 ? 0.97 : stackIdx === 2 ? 0.94 : 1;
  const yOff   = stackIdx === 1 ? 14 : stackIdx === 2 ? 26 : 0;
  const opacity = stackIdx === 2 ? 0.5 : stackIdx === 1 ? 0.75 : 1;

  return (
    <div style={{
      position: "absolute", inset: 0,
      transform: `rotate(${rotate}) scale(${scale}) translateY(${yOff}px)`,
      opacity, transition: "all 0.3s ease",
      zIndex: 10 - stackIdx,
      borderRadius: 20,
      background: "rgba(18,20,36,0.88)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: `1.5px solid ${behind ? "rgba(255,255,255,0.06)" : sev.border + "55"}`,
      boxShadow: isCrit && !behind
        ? `0 0 0 0 ${sev.color}55, 0 8px 40px rgba(0,0,0,0.5)`
        : "0 8px 40px rgba(0,0,0,0.4)",
      animation: isCrit && !behind ? "critPulse 2.5s ease-in-out infinite" : "none",
      overflow: "hidden",
    }}>
      {!behind && (
        <>
          <div style={{ height: 4, background: `linear-gradient(90deg, ${sev.color}, ${sev.color}88)` }} />
          <div style={{ padding: "20px 24px 20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {item.businessName && (
                  <span style={{ fontFamily: HF, fontSize: 11, fontWeight: 600, color: "#6ee7f7", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {item.businessName}
                  </span>
                )}
                <span style={{ fontFamily: HF, fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>
                  {TYPE_LABEL[item.type] ?? item.type}
                </span>
              </div>
              <span style={{
                fontFamily: HF, fontSize: 11, fontWeight: 700,
                color: sev.color, background: sev.bg,
                border: `1px solid ${sev.color}44`,
                padding: "3px 10px", borderRadius: 20,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
                {sev.label}
              </span>
            </div>

            <h2 style={{ fontFamily: HF, fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 10px", lineHeight: 1.3 }}>
              {item.title}
            </h2>

            <p style={{ fontFamily: HF, fontSize: 14, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>
              {item.body}
            </p>

            {item.relatedPerson && (
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: "rgba(110,231,247,0.12)",
                  border: "1px solid rgba(110,231,247,0.22)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: HF, fontSize: 11, fontWeight: 700, color: "#6ee7f7",
                }}>
                  {item.relatedPerson.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontFamily: HF, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                  {item.relatedPerson}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Delegate panel ────────────────────────────────────────────────────────────

type VoiceRecorderHandle = ReturnType<typeof useVoiceRecorder>;

function DelegatePanel({
  defaultAssignee, assigneeInput, setAssigneeInput,
  onConfirm, onCancel, loading, mic,
}: {
  defaultAssignee: string | null;
  assigneeInput: string;
  setAssigneeInput: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  mic: VoiceRecorderHandle;
}) {
  const canSubmit = assigneeInput.trim().length > 0 && !loading;
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 20,
      borderRadius: 20,
      background: "rgba(10,16,32,0.97)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      border: "1.5px solid rgba(110,231,247,0.2)",
      boxShadow: "0 8px 48px rgba(0,200,255,0.1)",
      display: "flex", flexDirection: "column",
      animation: "slideUp 0.22s ease",
      overflow: "hidden",
    }}>
      <div style={{ height: 4, background: "linear-gradient(90deg, #6ee7f7, #3b82f6)" }} />
      <div style={{ padding: "20px 22px", flex: 1 }}>
        <p style={{ fontFamily: HF, fontSize: 11, fontWeight: 700, color: "#6ee7f7", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 14px" }}>
          Кому поручить
        </p>

        {defaultAssignee && (
          <button
            onClick={() => setAssigneeInput(defaultAssignee)}
            style={{
              marginBottom: 12,
              padding: "5px 12px", borderRadius: 20, cursor: "pointer",
              background: assigneeInput === defaultAssignee ? "rgba(110,231,247,0.18)" : "rgba(110,231,247,0.07)",
              border: `1px solid ${assigneeInput === defaultAssignee ? "#6ee7f7" : "rgba(110,231,247,0.2)"}`,
              color: "#6ee7f7",
              fontFamily: HF, fontSize: 13, fontWeight: 600,
              transition: "all 0.18s",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6ee7f7" }} />
            {defaultAssignee}
          </button>
        )}

        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12, padding: "10px 14px",
        }}>
          <input
            type="text"
            value={assigneeInput}
            onChange={e => setAssigneeInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && canSubmit) onConfirm(); }}
            placeholder="Имя или роль исполнителя..."
            autoFocus
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontFamily: HF, fontSize: 15, color: "#fff",
            }}
          />
          {/* Delegate mic — dictation only into this field */}
          <button
            onClick={mic.toggle}
            title="Диктовать имя"
            style={{
              width: 34, height: 34, borderRadius: 8, border: "none",
              background: mic.isRecording ? "rgba(240,98,90,0.2)" : "rgba(255,255,255,0.07)",
              color: mic.isRecording ? "#f0625a" : "rgba(255,255,255,0.4)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.18s", flexShrink: 0,
            }}
          >
            {mic.isTranscribing
              ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              : mic.isRecording ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        </div>
      </div>

      <div style={{ padding: "0 22px 22px", display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{
          flex: 1, height: 46, borderRadius: 12,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.45)",
          fontFamily: HF, fontSize: 14, fontWeight: 600, cursor: "pointer",
          transition: "all 0.18s",
        }}>
          Отмена
        </button>
        <button
          onClick={onConfirm}
          disabled={!canSubmit}
          style={{
            flex: 2, height: 46, borderRadius: 12,
            background: canSubmit
              ? "linear-gradient(135deg, #22d3ee, #3b82f6)"
              : "rgba(110,231,247,0.08)",
            border: "none",
            color: canSubmit ? "#fff" : "rgba(255,255,255,0.25)",
            fontFamily: HF, fontSize: 14, fontWeight: 700,
            cursor: canSubmit ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 0.18s",
          }}
        >
          {loading
            ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            : <CheckCircle2 size={16} />}
          Оформить
        </button>
      </div>
    </div>
  );
}

// ── Done screen ───────────────────────────────────────────────────────────────

function DoneScreen() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "#0b0b16", fontFamily: HF,
    }}>
      <GlobeOrb />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "rgba(52,211,153,0.12)", border: "1.5px solid rgba(52,211,153,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 28px",
        }}>
          <CheckCircle2 size={36} color="#34d399" />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>
          Лента разобрана
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", margin: "0 0 40px" }}>
          Отличное начало дня
        </p>
        <Link href="/?role=client" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "14px 32px", borderRadius: 14,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.7)",
          textDecoration: "none", fontSize: 15, fontWeight: 600,
        }}>
          На главную
        </Link>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MorningFeed() {
  const { toast } = useToast();

  const { data: initialItems, isLoading, error } = useQuery<FeedItem[]>({
    queryKey: ["feedItems"],
    queryFn: () => apiFetch("/api/feed/items").then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
  });

  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState(0);
  const [showExtern, setShowExtern] = useState(true);
  const [mode, setMode] = useState<"idle" | "delegating">("idle");
  const [assigneeInput, setAssigneeInput] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (initialItems) setAllItems(initialItems);
  }, [initialItems]);

  // Two independent mic instances
  const globalMic = useVoiceRecorder({
    onTranscript: (text) => toast({ title: `🎙 ${text}` }),
    onError: (err) => toast({ title: err, variant: "destructive" }),
  });

  const delegateMic = useVoiceRecorder({
    onTranscript: (text) => setAssigneeInput(prev => prev ? `${prev} ${text}` : text),
    onError: (err) => toast({ title: err, variant: "destructive" }),
  });

  // Derived state
  const displayItems = useMemo(
    () => showExtern ? allItems : allItems.filter(i => i.businessId === null),
    [allItems, showExtern],
  );

  const safeCursor = displayItems.length > 0 ? Math.min(cursor, displayItems.length - 1) : 0;
  const currentItem = displayItems[safeCursor] ?? null;

  const critCount      = displayItems.filter(i => i.severity === "critical").length;
  const importantCount = displayItems.filter(i => i.severity === "important").length;
  const infoCount      = displayItems.filter(i => i.severity === "info").length;

  function removeItem(id: number) {
    setAllItems(prev => prev.filter(i => i.id !== id));
    setMode("idle");
    setAssigneeInput("");
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleStart() {
    if (!currentItem || acting) return;
    setActing(true);
    try {
      await apiFetch(`/api/feed/items/${currentItem.id}/start`, { method: "PATCH" });
      toast({ title: "✅ Задача создана — карточка в работе" });
      removeItem(currentItem.id);
    } catch {
      toast({ title: "Ошибка при запуске плана", variant: "destructive" });
    } finally {
      setActing(false);
    }
  }

  async function handleDelegate() {
    if (!currentItem || !assigneeInput.trim() || acting) return;
    setActing(true);
    try {
      await apiFetch(`/api/feed/items/${currentItem.id}/delegate`, {
        method: "PATCH",
        body: JSON.stringify({ assigneeName: assigneeInput.trim() }),
      });
      toast({ title: `👤 Поручено: ${assigneeInput.trim()}` });
      removeItem(currentItem.id);
    } catch {
      toast({ title: "Ошибка при поручении", variant: "destructive" });
    } finally {
      setActing(false);
    }
  }

  async function handleSnooze() {
    if (!currentItem || acting) return;
    setActing(true);
    try {
      await apiFetch(`/api/feed/items/${currentItem.id}/snooze`, { method: "PATCH" });
      toast({ title: "🔔 Отложено — вернётся завтра в 8:00" });
      removeItem(currentItem.id);
    } catch {
      toast({ title: "Ошибка при откладывании", variant: "destructive" });
    } finally {
      setActing(false);
    }
  }

  function handleNext() {
    if (displayItems.length <= 1) return;
    setCursor(c => (c + 1) % displayItems.length);
  }

  function handleBack() {
    if (displayItems.length <= 1) return;
    setCursor(c => (c - 1 + displayItems.length) % displayItems.length);
  }

  function openDelegate() {
    setAssigneeInput(currentItem?.defaultAssignee ?? "");
    setMode("delegating");
  }

  // ── Render: loading / error ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#0b0b16", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <GlobeOrb />
        <Loader2 size={32} color="#6ee7f7" style={{ animation: "spin 1s linear infinite", position: "relative", zIndex: 1 }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#0b0b16", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ fontFamily: HF, color: "#f0625a", fontSize: 16 }}>Не удалось загрузить ленту</p>
        <Link href="/?role=client" style={{ color: "#6ee7f7", fontFamily: HF, fontSize: 14, textDecoration: "none" }}>← На главную</Link>
      </div>
    );
  }

  if (displayItems.length === 0) return <DoneScreen />;

  // Visible stack: current + next 2
  const visibleStack = [0, 1, 2].map(offset => displayItems[(safeCursor + offset) % displayItems.length]).filter(Boolean) as FeedItem[];

  // ── Render: main ──────────────────────────────────────────────────────────

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#0b0b16",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      fontFamily: HF,
    }}>
      <GlobeOrb />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", padding: "0 18px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0 14px", gap: 8, flexWrap: "wrap" }}>
          {/* Severity counters */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <SevBadge color="#f0625a" count={critCount} label="срочно" />
            <SevBadge color="#f0b54a" count={importantCount} label="важно" />
            <SevBadge color="#6ee7f7" count={infoCount} label="инфо" />
            {critCount === 0 && importantCount === 0 && infoCount === 0 && (
              <span style={{ fontFamily: HF, fontSize: 11, color: "rgba(255,255,255,0.25)" }}>все обработаны</span>
            )}
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Внешн toggle */}
            <button
              onClick={() => setShowExtern(!showExtern)}
              style={{
                fontFamily: HF, fontSize: 11, fontWeight: 700,
                padding: "3px 10px", borderRadius: 20, cursor: "pointer",
                background: showExtern ? "rgba(110,231,247,0.13)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${showExtern ? "rgba(110,231,247,0.4)" : "rgba(255,255,255,0.1)"}`,
                color: showExtern ? "#6ee7f7" : "rgba(255,255,255,0.3)",
                transition: "all 0.18s",
                letterSpacing: "0.05em",
              }}
            >
              Внешн {showExtern ? "●" : "○"}
            </button>

            {/* Position indicator */}
            <span style={{ fontFamily: HF, fontSize: 12, color: "rgba(255,255,255,0.3)", minWidth: 32, textAlign: "right" }}>
              {safeCursor + 1}/{displayItems.length}
            </span>

            {/* Close */}
            <Link href="/?role=client" style={{ display: "flex", alignItems: "center", color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
              <X size={18} />
            </Link>
          </div>
        </div>

        {/* ── Card stack ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0 }}>
          <div style={{ position: "relative", height: 300, maxWidth: 480, width: "100%", margin: "0 auto" }}>
            {[...visibleStack].reverse().map((item, revIdx) => {
              const stackIdx = visibleStack.length - 1 - revIdx;
              return <FeedCard key={item.id} item={item} stackIdx={stackIdx} />;
            })}

            {/* Delegate panel slides over the card */}
            {mode === "delegating" && (
              <DelegatePanel
                defaultAssignee={currentItem?.defaultAssignee ?? null}
                assigneeInput={assigneeInput}
                setAssigneeInput={setAssigneeInput}
                onConfirm={handleDelegate}
                onCancel={() => { setMode("idle"); setAssigneeInput(""); }}
                loading={acting}
                mic={delegateMic}
              />
            )}
          </div>

          {/* ── Recommendation block ── */}
          {mode === "idle" && currentItem?.recommendation && (
            <div style={{
              maxWidth: 480, width: "100%", margin: "10px auto 0",
              background: "rgba(110,231,247,0.04)",
              border: "1px solid rgba(110,231,247,0.12)",
              borderRadius: 14, padding: "12px 16px",
            }}>
              <p style={{ fontFamily: HF, fontSize: 10, fontWeight: 700, color: "#6ee7f7", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 5px" }}>
                → Рекомендую
              </p>
              <p style={{ fontFamily: HF, fontSize: 13, color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.55 }}>
                {currentItem.recommendation}
              </p>
              {currentItem.defaultAssignee && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  marginTop: 8, padding: "3px 10px", borderRadius: 20,
                  background: "rgba(110,231,247,0.08)",
                  border: "1px solid rgba(110,231,247,0.18)",
                  fontFamily: HF, fontSize: 11, color: "#6ee7f7",
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#6ee7f7" }} />
                  {currentItem.defaultAssignee}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Action bar ── */}
        {mode === "idle" && (
          <div style={{ maxWidth: 480, width: "100%", margin: "14px auto 0", display: "flex", flexDirection: "column", gap: 8 }}>

            {/* Primary actions */}
            <div style={{ display: "flex", gap: 8 }}>
              {/* Запустить план */}
              <button
                onClick={handleStart}
                disabled={acting}
                style={{
                  flex: 2, height: 52, borderRadius: 14,
                  background: acting ? "rgba(52,211,153,0.06)" : "rgba(52,211,153,0.1)",
                  border: "1px solid rgba(52,211,153,0.28)",
                  color: "#34d399",
                  fontFamily: HF, fontSize: 14, fontWeight: 700,
                  cursor: acting ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.18s",
                  opacity: acting ? 0.6 : 1,
                }}
              >
                {acting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={16} />}
                Запустить план
              </button>

              {/* Поручить */}
              <button
                onClick={openDelegate}
                style={{
                  flex: 1, height: 52, borderRadius: 14,
                  background: "rgba(110,231,247,0.08)",
                  border: "1px solid rgba(110,231,247,0.22)",
                  color: "#6ee7f7",
                  fontFamily: HF, fontSize: 14, fontWeight: 700,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "all 0.18s",
                }}
              >
                <Users size={15} />
                Поручить
              </button>
            </div>

            {/* Navigation + snooze row */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* ← Назад (navigation only) */}
              <button
                onClick={handleBack}
                disabled={displayItems.length <= 1}
                title="Назад (не изменяет счётчик)"
                style={{
                  width: 44, height: 44, borderRadius: 12, border: "none",
                  background: "rgba(255,255,255,0.05)",
                  color: displayItems.length > 1 ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)",
                  cursor: displayItems.length > 1 ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.18s", flexShrink: 0,
                }}
              >
                <ChevronLeft size={18} />
              </button>

              {/* Напомнить завтра */}
              <button
                onClick={handleSnooze}
                disabled={acting}
                style={{
                  flex: 1, height: 44, borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  color: "rgba(255,255,255,0.45)",
                  fontFamily: HF, fontSize: 13, fontWeight: 600,
                  cursor: acting ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "all 0.18s",
                }}
              >
                <Bell size={14} />
                Напомнить завтра
              </button>

              {/* → Далее (navigation only) */}
              <button
                onClick={handleNext}
                disabled={displayItems.length <= 1}
                title="Далее (не изменяет счётчик)"
                style={{
                  width: 44, height: 44, borderRadius: 12, border: "none",
                  background: "rgba(255,255,255,0.05)",
                  color: displayItems.length > 1 ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)",
                  cursor: displayItems.length > 1 ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.18s", flexShrink: 0,
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        <div style={{ height: 28 }} />
      </div>


      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes orbPulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
        }
        @keyframes critPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(240,98,90,0.35); }
          50% { box-shadow: 0 0 0 12px rgba(240,98,90,0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input::placeholder { color: rgba(255,255,255,0.28); }
      `}</style>
    </div>
  );
}
