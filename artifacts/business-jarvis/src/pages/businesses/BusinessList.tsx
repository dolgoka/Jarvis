import { useListBusinesses, getListBusinessesQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Loader2, MapPin, Building2, ChevronRight } from "lucide-react";
import { Shell } from "@/components/layout/Shell";

const HF = "'Hanken Grotesk', system-ui, sans-serif";

function statusLabel(status: string) {
  if (status === "active") return "Активно";
  if (status === "inactive") return "Неактивно";
  return "Ожидание";
}

function statusStyle(status: string) {
  if (status === "active") return "border-green-500/40 text-green-400 bg-transparent";
  if (status === "inactive") return "border-red-500/40 text-red-400 bg-transparent";
  return "border-yellow-500/40 text-yellow-400 bg-transparent";
}

export default function BusinessList() {
  const [, setLocation] = useLocation();
  const { data: businesses, isLoading } = useListBusinesses({ query: { queryKey: getListBusinessesQueryKey() } });

  return (
    <Shell>
      <div className="p-4 md:p-8 space-y-4 md:space-y-8" style={{ fontFamily: HF }}>
        {/* Заголовок */}
        <div>
          <h1
            className="text-2xl md:text-3xl font-semibold tracking-tight"
            style={{ color: "var(--jarvis-text-primary)", fontFamily: HF }}
          >
            Сеть
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--jarvis-text-muted)", fontFamily: HF }}>
            Компании холдинга
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#5b8bd0" }} />
          </div>
        ) : businesses?.length === 0 ? (
          <div className="text-center py-24 text-sm" style={{ color: "var(--jarvis-text-muted)", fontFamily: HF }}>
            Узлы сети не зарегистрированы.
          </div>
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div
              className="hidden md:block rounded-xl overflow-hidden"
              style={{
                border: "1px solid var(--jarvis-glass-border)",
                background: "rgba(8,12,24,0.80)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <table className="w-full">
                <thead style={{ background: "rgba(5,9,20,0.95)" }}>
                  <tr style={{ borderBottom: "1px solid var(--jarvis-border)" }}>
                    <th
                      className="text-left px-6 py-3 text-xs font-semibold"
                      style={{ color: "#5b8bd0", fontFamily: HF }}
                    >
                      Компания
                    </th>
                    <th
                      className="text-left px-6 py-3 text-xs font-semibold"
                      style={{ color: "#5b8bd0", fontFamily: HF }}
                    >
                      Местоположение
                    </th>
                    <th
                      className="text-left px-6 py-3 text-xs font-semibold"
                      style={{ color: "#5b8bd0", fontFamily: HF }}
                    >
                      Отрасль
                    </th>
                    <th
                      className="text-right px-6 py-3 text-xs font-semibold"
                      style={{ color: "#5b8bd0", fontFamily: HF }}
                    >
                      Статус
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {businesses?.map((business, i) => (
                    <tr
                      key={business.id}
                      className="cursor-pointer transition-colors"
                      style={{
                        borderTop: i === 0 ? undefined : "1px solid rgba(255,255,255,0.04)",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      onClick={() => setLocation(`/businesses/${business.id}`)}
                    >
                      <td className="px-6 py-4 text-sm font-medium" style={{ color: "var(--jarvis-text-primary)", fontFamily: HF }}>
                        {business.name}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: "var(--jarvis-text-muted)", fontFamily: HF }}>
                        {business.city}, {business.country}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: "var(--jarvis-text-muted)", fontFamily: HF }}>
                        {business.industry}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Badge variant="outline" className={statusStyle(business.status)} style={{ fontFamily: HF }}>
                          {statusLabel(business.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ── */}
            <div
              className="md:hidden rounded-xl overflow-hidden"
              style={{
                border: "1px solid var(--jarvis-glass-border)",
                background: "rgba(8,12,24,0.80)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              {businesses?.map((business, i) => (
                <button
                  key={business.id}
                  className="w-full text-left px-4 py-4 flex items-center gap-3 transition-colors"
                  style={{
                    borderTop: i === 0 ? undefined : "1px solid rgba(255,255,255,0.04)",
                    fontFamily: HF,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  onClick={() => setLocation(`/businesses/${business.id}`)}
                >
                  {/* Статус-точка — светофор, не трогаем */}
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    business.status === "active" ? "bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]" :
                    business.status === "inactive" ? "bg-red-400" : "bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.6)]"
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--jarvis-text-primary)", fontFamily: HF }}
                    >
                      {business.name}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "var(--jarvis-text-muted)" }}>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{business.city}, {business.country}</span>
                      </span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <Building2 className="w-3 h-3" />
                        <span className="truncate">{business.industry}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${statusStyle(business.status)}`} style={{ fontFamily: HF }}>
                      {statusLabel(business.status)}
                    </Badge>
                    <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.20)" }} />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
