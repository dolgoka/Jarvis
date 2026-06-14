import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { Mic, MicOff, Loader2, Home, CheckCircle2, X, ChevronRight } from "lucide-react";
import { Link } from "wouter";

const HF = "'Hanken Grotesk', system-ui, sans-serif";

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
  status: string;
  createdAt: string;
};

type FeedDraft = {
  title: string;
  description: string;
  assigneeId: number;
  assigneeName: string;
  assigneeRole: string;
  linkedPeople: { id: number; name: string; role: string }[];
  businessId: number | null;
  businessName: string | null;
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
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 520, height: 520,
        borderRadius: "50%",
        background: "radial-gradient(circle at 38% 38%, rgba(0,220,255,0.07) 0%, rgba(0,160,255,0.04) 35%, transparent 70%)",
        border: "1px solid rgba(0,220,255,0.08)",
        animation: "orbPulse 8s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 320, height: 320,
        borderRadius: "50%",
        background: "radial-gradient(circle at 42% 42%, rgba(0,200,255,0.04) 0%, transparent 65%)",
        border: "1px solid rgba(0,200,255,0.05)",
        animation: "orbPulse 8s ease-in-out infinite 2s",
      }} />
      <style>{`
        @keyframes orbPulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
        }
        @keyframes critPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(240,98,90,0.35); }
          50% { box-shadow: 0 0 0 12px rgba(240,98,90,0); }
        }
      `}</style>
    </div>
  );
}

// ── Card component ────────────────────────────────────────────────────────────

function FeedCard({
  item, stackIdx, total,
}: { item: FeedItem; stackIdx: number; total: number }) {
  const sev = SEV[item.severity];
  const isCrit = item.severity === "critical";
  const behind = stackIdx > 0;

  const rotate = stackIdx === 1 ? "-2.5deg" : stackIdx === 2 ? "-5deg" : "0deg";
  const scale  = stackIdx === 1 ? 0.97 : stackIdx === 2 ? 0.94 : 1;
  const yOff   = stackIdx === 1 ? 12 : stackIdx === 2 ? 22 : 0;
  const opacity = stackIdx === 2 ? 0.55 : stackIdx === 1 ? 0.8 : 1;

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      transform: `rotate(${rotate}) scale(${scale}) translateY(${yOff}px)`,
      opacity,
      transition: "all 0.3s ease",
      zIndex: 10 - stackIdx,
      borderRadius: 20,
      background: "rgba(18,20,36,0.85)",
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
          <div style={{
            height: 4,
            background: `linear-gradient(90deg, ${sev.color}, ${sev.color}88)`,
          }} />
          <div style={{ padding: "24px 28px 28px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {item.businessName && (
                  <span style={{ fontFamily: HF, fontSize: 12, fontWeight: 600, color: "#6ee7f7", letterSpacing: "0.08em", textTransform: "uppercase" }}>
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

            <h2 style={{ fontFamily: HF, fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 12px", lineHeight: 1.3 }}>
              {item.title}
            </h2>

            <p style={{ fontFamily: HF, fontSize: 15, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.6 }}>
              {item.body}
            </p>

            {item.relatedPerson && (
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(110,231,247,0.15)",
                  border: "1px solid rgba(110,231,247,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: HF, fontSize: 11, fontWeight: 700, color: "#6ee7f7",
                }}>
                  {item.relatedPerson.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontFamily: HF, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                  {item.relatedPerson}
                </span>
              </div>
            )}
          </div>

          <div style={{ padding: "0 28px 10px", display: "flex", justifyContent: "flex-end" }}>
            <span style={{ fontFamily: HF, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
              {total > 1 ? `Осталось ${total}` : "Последняя"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Draft confirmation ─────────────────────────────────────────────────────────

function DraftCard({
  draft, onConfirm, onEdit, loading,
}: { draft: FeedDraft; onConfirm: () => void; onEdit: () => void; loading: boolean }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 20,
      borderRadius: 20,
      background: "rgba(12,24,36,0.96)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1.5px solid rgba(110,231,247,0.2)",
      boxShadow: "0 8px 48px rgba(0,200,255,0.1)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <div style={{ height: 4, background: "linear-gradient(90deg, #6ee7f7, #3b82f6)" }} />
      <div style={{ padding: "24px 28px", flex: 1, overflowY: "auto" }}>
        <p style={{ fontFamily: HF, fontSize: 12, fontWeight: 700, color: "#6ee7f7", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 20px" }}>
          Черновик задачи
        </p>

        <Row label="Кому" value={draft.assigneeName} accent />
        <Row label="Что" value={draft.title} />
        {draft.description && draft.description !== draft.title && (
          <Row label="Детали" value={draft.description} small />
        )}
        {draft.businessName && <Row label="Компания" value={draft.businessName} />}
        {draft.linkedPeople.length > 0 && (
          <Row label="Подключить" value={draft.linkedPeople.map(p => p.name).join(", ")} />
        )}
      </div>

      <div style={{ padding: "16px 28px 28px", display: "flex", gap: 12 }}>
        <button onClick={onEdit} disabled={loading} style={{
          flex: 1, height: 52, borderRadius: 14,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.7)",
          fontFamily: HF, fontSize: 15, fontWeight: 600, cursor: "pointer",
        }}>
          Изменить
        </button>
        <button onClick={onConfirm} disabled={loading} style={{
          flex: 2, height: 52, borderRadius: 14,
          background: loading ? "rgba(110,231,247,0.15)" : "linear-gradient(135deg, #22d3ee, #3b82f6)",
          border: "none",
          color: "#fff",
          fontFamily: HF, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={18} />}
          {loading ? "Отправка..." : "Отправить"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, accent, small }: { label: string; value: string; accent?: boolean; small?: boolean }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <span style={{ fontFamily: HF, fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
      <p style={{ fontFamily: HF, fontSize: small ? 13 : 16, fontWeight: accent ? 700 : 500, color: accent ? "#6ee7f7" : "rgba(255,255,255,0.9)", margin: "4px 0 0" }}>
        {value}
      </p>
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
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", margin: "0 0 40px" }}>
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
          <Home size={18} />
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
    queryFn: () => fetch("/api/feed/items").then(r => r.json()),
  });

  const [items, setItems] = useState<FeedItem[]>([]);
  const [draft, setDraft] = useState<FeedDraft | null>(null);
  const [input, setInput] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (initialItems) setItems(initialItems);
  }, [initialItems]);

  const { isRecording, isTranscribing, toggle: toggleVoice } = useVoiceRecorder({
    onTranscript: (text) => setInput(prev => prev ? `${prev} ${text}` : text),
    onError: (err) => toast({ title: err, variant: "destructive" }),
  });

  const currentItem = items[0] ?? null;

  function advanceCards(remove = false) {
    setAnimating(true);
    setTimeout(() => {
      setItems(prev => {
        if (prev.length === 0) return prev;
        if (remove) return prev.slice(1);
        const [first, ...rest] = prev;
        return [...rest, first!];
      });
      setDraft(null);
      setInput("");
      setAnimating(false);
    }, 280);
  }

  function handleNext() {
    if (items.length <= 1) return;
    advanceCards(false);
  }

  async function handleDismiss() {
    if (!currentItem) return;
    try {
      await fetch(`/api/feed/items/${currentItem.id}/dismiss`, { method: "PATCH" });
    } catch { /* ignore */ }
    advanceCards(true);
  }

  async function handleSubmitText() {
    if (!input.trim() || !currentItem) return;
    setDraftLoading(true);
    try {
      const res = await fetch("/api/feed/draft-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.trim(), feedItemId: currentItem.id }),
      });
      if (!res.ok) throw new Error("draft failed");
      const data = await res.json() as FeedDraft;
      setDraft(data);
    } catch {
      toast({ title: "Не удалось создать черновик", variant: "destructive" });
    } finally {
      setDraftLoading(false);
    }
  }

  async function handleConfirm() {
    if (!draft || !currentItem) return;
    setConfirmLoading(true);
    try {
      const res = await fetch("/api/feed/confirm-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          assigneeId: draft.assigneeId,
          linkedPeopleIds: draft.linkedPeople.map(p => p.id),
          feedItemId: currentItem.id,
          businessId: draft.businessId,
        }),
      });
      if (!res.ok) throw new Error("confirm failed");
      toast({
        title: `Задача для ${draft.assigneeName} отправлена`,
        description: draft.title,
      });
      advanceCards(true);
    } catch {
      toast({ title: "Ошибка при сохранении задачи", variant: "destructive" });
    } finally {
      setConfirmLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#0b0b16", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} color="#6ee7f7" style={{ animation: "spin 1s linear infinite" }} />
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

  if (items.length === 0) return <DoneScreen />;

  const visibleStack = items.slice(0, 3);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#0b0b16",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      fontFamily: HF,
    }}>
      <GlobeOrb />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", padding: "0 20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 16px" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Утренняя лента
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{
              fontFamily: HF, fontSize: 13, fontWeight: 600,
              background: "rgba(110,231,247,0.1)",
              border: "1px solid rgba(110,231,247,0.2)",
              color: "#6ee7f7",
              padding: "4px 12px", borderRadius: 20,
            }}>
              {items.length} {items.length === 1 ? "запись" : items.length < 5 ? "записи" : "записей"}
            </span>
            <Link href="/?role=client" style={{ display: "flex", alignItems: "center", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>
              <Home size={18} />
            </Link>
          </div>
        </div>

        {/* Card stack */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0 }}>
          <div style={{ position: "relative", height: 320, maxWidth: 480, width: "100%", margin: "0 auto" }}>
            {[...visibleStack].reverse().map((item, revIdx) => {
              const stackIdx = visibleStack.length - 1 - revIdx;
              return (
                <FeedCard key={item.id} item={item} stackIdx={stackIdx} total={items.length} />
              );
            })}
            {draft && (
              <DraftCard
                draft={draft}
                onConfirm={handleConfirm}
                onEdit={() => setDraft(null)}
                loading={confirmLoading}
              />
            )}
          </div>

          {/* Input area (shown when no draft) */}
          {!draft && (
            <div style={{ maxWidth: 480, width: "100%", margin: "20px auto 0" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16, padding: "10px 14px",
              }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && input.trim()) { e.preventDefault(); void handleSubmitText(); } }}
                  placeholder="Продиктуй или напиши ответ..."
                  rows={2}
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none", resize: "none",
                    fontFamily: HF, fontSize: 15, color: "#fff",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    onClick={toggleVoice}
                    style={{
                      width: 40, height: 40, borderRadius: 10, border: "none", cursor: "pointer",
                      background: isRecording ? "rgba(240,98,90,0.2)" : "rgba(255,255,255,0.08)",
                      color: isRecording ? "#f0625a" : "rgba(255,255,255,0.5)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s",
                    }}
                  >
                    {isTranscribing ? (
                      <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                    ) : isRecording ? (
                      <MicOff size={18} />
                    ) : (
                      <Mic size={18} />
                    )}
                  </button>
                  {input.trim() && (
                    <button
                      onClick={handleSubmitText}
                      disabled={draftLoading}
                      style={{
                        width: 40, height: 40, borderRadius: 10, border: "none", cursor: "pointer",
                        background: draftLoading ? "rgba(110,231,247,0.1)" : "rgba(110,231,247,0.2)",
                        color: "#6ee7f7",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s",
                      }}
                    >
                      {draftLoading
                        ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                        : <ChevronRight size={18} />
                      }
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!draft && (
          <div style={{ maxWidth: 480, width: "100%", margin: "16px auto 32px", display: "flex", gap: 12 }}>
            <button
              onClick={handleDismiss}
              style={{
                flex: 1, height: 54, borderRadius: 14,
                background: "rgba(240,98,90,0.08)",
                border: "1px solid rgba(240,98,90,0.2)",
                color: "#f0625a",
                fontFamily: HF, fontSize: 15, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s",
              }}
            >
              <X size={18} />
              Убрать
            </button>
            <button
              onClick={handleNext}
              disabled={items.length <= 1}
              style={{
                flex: 1, height: 54, borderRadius: 14,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: items.length <= 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
                fontFamily: HF, fontSize: 15, fontWeight: 600,
                cursor: items.length <= 1 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s",
              }}
            >
              Далее
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        textarea::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}
