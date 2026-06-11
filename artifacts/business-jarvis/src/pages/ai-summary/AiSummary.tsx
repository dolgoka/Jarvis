import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { useGetAiSummary, getGetAiSummaryQueryKey, GetAiSummaryPeriod } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Sparkles, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const P = "#5b8bd0";
const HF = "'Hanken Grotesk', system-ui, sans-serif";

export default function AiSummary() {
  const [period, setPeriod] = useState<GetAiSummaryPeriod>("month");
  const queryClient = useQueryClient();
  const queryKey = getGetAiSummaryQueryKey({ period });
  const { data: summary, isLoading, isError, error } = useGetAiSummary(
    { period },
    { query: { queryKey, retry: 1, staleTime: 5 * 60 * 1000 } }
  );

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey });

  return (
    <Shell>
      <div style={{ fontFamily: HF }} className="p-8 space-y-8 max-w-5xl mx-auto">

        {/* ── Header ── */}
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: "rgba(91,139,208,0.12)",
                  border: "1px solid rgba(91,139,208,0.28)",
                }}
              >
                <Brain className="w-5 h-5" style={{ color: P }} />
              </div>
              <h1 className="text-2xl font-bold text-white">Сводка ИИ</h1>
            </div>
            <p className="text-sm ml-12" style={{ color: "rgba(255,255,255,0.4)" }}>
              Аналитический дайджест по всему портфелю
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(91,139,208,0.2)",
                color: "rgba(91,139,208,0.6)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = P;
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(91,139,208,0.4)";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(91,139,208,0.06)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(91,139,208,0.6)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(91,139,208,0.2)";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
              }}
              title="Обновить"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Select value={period} onValueChange={(val: GetAiSummaryPeriod) => setPeriod(val)}>
              <SelectTrigger
                className="w-32 text-white text-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontFamily: HF,
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">За сутки</SelectItem>
                <SelectItem value="week">За неделю</SelectItem>
                <SelectItem value="month">За месяц</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Loading ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-xl"
                style={{ background: "rgba(91,139,208,0.15)" }}
              />
              <Loader2 className="w-10 h-10 animate-spin relative z-10" style={{ color: P }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
              Синтезирую данные…
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
              Анализ может занять 5–10 секунд
            </p>
          </div>

        /* ── Error ── */
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-5">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-xl"
                style={{ background: "rgba(240,98,90,0.1)" }}
              />
              <AlertTriangle className="w-10 h-10 relative z-10" style={{ color: "rgba(240,98,90,0.75)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "rgba(240,98,90,0.8)" }}>
              Не удалось получить данные
            </p>
            <p
              className="text-xs text-center max-w-sm"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              {(error as any)?.message ?? "ИИ-анализ недоступен. Проверьте конфигурацию сервера."}
            </p>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "rgba(91,139,208,0.1)",
                border: "1px solid rgba(91,139,208,0.3)",
                color: P,
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Повторить
            </button>
          </div>

        /* ── Content ── */
        ) : summary ? (
          <div className="space-y-6">

            {/* Executive summary card */}
            <div
              className="glass relative overflow-hidden"
              style={{ padding: "28px 28px 24px" }}
            >
              <div
                className="absolute top-0 left-0 w-1 h-full rounded-l-[22px]"
                style={{
                  background: "linear-gradient(180deg, #5b8bd0 0%, #3d6aad 100%)",
                  boxShadow: "0 0 12px rgba(91,139,208,0.6)",
                }}
              />
              <div className="pl-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4" style={{ color: P }} />
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "rgba(91,139,208,0.8)" }}
                  >
                    Исполнительный синтез
                  </span>
                </div>
                <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.88)" }}>
                  {summary.summary}
                </p>
                <p
                  className="mt-5 text-xs"
                  style={{
                    color: "rgba(255,255,255,0.25)",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    paddingTop: "14px",
                  }}
                >
                  Сформировано {new Date(summary.generatedAt).toLocaleString("ru-RU")}
                </p>
              </div>
            </div>

            {/* Highlights grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {summary.highlights.map((highlight, idx) => (
                <div
                  key={idx}
                  className="glass flex items-start gap-4"
                  style={{ padding: "20px 22px" }}
                >
                  <span
                    className="text-sm font-bold tabular-nums flex-shrink-0 mt-0.5"
                    style={{ color: "rgba(91,139,208,0.55)", minWidth: "24px" }}
                  >
                    {(idx + 1).toString().padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.78)" }}>
                    {highlight}
                  </p>
                </div>
              ))}
            </div>
          </div>

        /* ── Empty ── */
        ) : (
          <div className="text-center py-20 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            Нет данных для отображения
          </div>
        )}
      </div>
    </Shell>
  );
}
