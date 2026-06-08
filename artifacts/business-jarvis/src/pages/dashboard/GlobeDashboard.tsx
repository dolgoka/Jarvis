import { useEffect, useRef, useState, useMemo, Component, type ReactNode } from "react";
import Globe from "react-globe.gl";
import { useListBusinesses, getListBusinessesQueryKey, useGetDashboardStats, getGetDashboardStatsQueryKey, useGetTopBusinesses, getGetTopBusinessesQueryKey, useFetchLatestReport, getFetchLatestReportQueryKey, FetchLatestReportPeriod } from "@workspace/api-client-react";
import { formatCurrency, formatMoney, formatNumber } from "@/lib/utils";
import { Loader2, X, Activity, MapPin, TrendingUp, ShoppingCart, User, Mail, Zap, ChevronDown, ClipboardList } from "lucide-react";
import { EventsFeed } from "./EventsFeed";
import { ChatWidget } from "./ChatWidget";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Shell } from "@/components/layout/Shell";

class GlobeErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

const HEALTH_COLORS: Record<string, string> = {
  green:  "#3ed9a0",
  yellow: "#f0b54a",
  red:    "#f0625a",
};

function getHealthColor(health: string | undefined): string {
  return HEALTH_COLORS[health ?? "green"] ?? "#3ed9a0";
}

const HEALTH_LABELS: Record<string, string> = {
  green:  "Норма",
  yellow: "Внимание",
  red:    "Критично",
};

const STATUS_LABELS: Record<string, string> = {
  active:   "Активен",
  pending:  "На рассмотрении",
  inactive: "Неактивен",
};

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function BusinessSlideOver({ businessId, color, onClose }: { businessId: number; color: string; onClose: () => void }) {
  const [period, setPeriod] = useState<FetchLatestReportPeriod>("month");
  const { data: report, isLoading } = useFetchLatestReport(
    { businessId, period },
    { query: { enabled: !!businessId, queryKey: getFetchLatestReportQueryKey({ businessId, period }) } }
  );
  const { data: businesses } = useListBusinesses({ query: { queryKey: getListBusinessesQueryKey() } });
  const business = businesses?.find(b => b.id === businessId);
  const margin = report && report.revenue > 0 ? ((report.profit / report.revenue) * 100).toFixed(1) : null;
  const periodLabel: Record<FetchLatestReportPeriod, string> = { day: "24 ч", week: "7 дней", month: "30 дней" };
  const health = business?.health ?? "green";
  const healthLabel = HEALTH_LABELS[health] ?? "Норма";
  const statusLabel = STATUS_LABELS[business?.status ?? ""] ?? (business?.status ?? "—");

  return (
    <>
      {/* Mobile: bottom sheet overlay */}
      <div
        className="md:hidden absolute inset-0 z-20 flex flex-col justify-end"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      >
        <div
          className="flex flex-col rounded-t-2xl overflow-hidden max-h-[85vh]"
          style={{
            background: "linear-gradient(180deg, rgba(4,10,22,0.98) 0%, rgba(2,6,14,1) 100%)",
            borderTop: `1px solid ${color}44`,
            boxShadow: `0 -16px 48px ${color}18`,
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="px-5 py-3 flex items-start justify-between" style={{ borderBottom: `1px solid ${color}22` }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-widest font-semibold"
                  style={{ background: `${color}18`, color, border: `1px solid ${color}38` }}>
                  {business?.industry || "—"}
                </span>
                {/* Health badge */}
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-widest font-semibold"
                  style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}>
                  {healthLabel}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-widest"
                  style={{
                    background: business?.status === "active" ? "#22c55e16" : "#ef444416",
                    color: business?.status === "active" ? "#22c55e" : "#ef4444",
                    border: `1px solid ${business?.status === "active" ? "#22c55e38" : "#ef444438"}`,
                  }}>
                  {statusLabel}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-white leading-tight">{business?.name ?? "…"}</h2>
              <div className="flex items-center gap-1 mt-1 text-[12px]" style={{ color: `${color}aa` }}>
                <MapPin className="w-3 h-3" />
                <span className="font-mono">{business?.city}, {business?.country}</span>
              </div>
            </div>
            <button onClick={onClose}
              className="ml-3 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center hover:bg-white/10"
              style={{ color: `${color}66` }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Period selector */}
          <div className="px-5 py-2.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${color}14` }}>
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: `${color}66` }}>
              Телеметрия — {periodLabel[period]}
            </span>
            <Select value={period} onValueChange={(val: FetchLatestReportPeriod) => setPeriod(val)}>
              <SelectTrigger className="w-24 h-10 text-xs font-mono border-white/10 bg-white/5 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">24ч</SelectItem>
                <SelectItem value="week">7д</SelectItem>
                <SelectItem value="month">30д</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="px-5 py-4 overflow-y-auto space-y-2.5">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-7 h-7 animate-spin" style={{ color }} /></div>
            ) : report ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Выручка", value: formatMoney(report.revenue, business?.currency ?? "USD"), icon: Activity },
                    { label: "Прибыль", value: formatMoney(report.profit, business?.currency ?? "USD"), icon: TrendingUp },
                    { label: "Заказы", value: formatNumber(report.orders), icon: ShoppingCart },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-xl p-3" style={{ background: `${color}0a`, border: `1px solid ${color}1e` }}>
                      <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: `${color}77` }}>{label}</div>
                      <div className="text-base font-light text-white tabular-nums">{value}</div>
                    </div>
                  ))}
                </div>
                {margin !== null && (
                  <div className="text-xs font-mono" style={{ color: parseFloat(margin) >= 0 ? "#22c55e" : "#ef4444" }}>
                    {parseFloat(margin) >= 0 ? "+" : ""}{margin}% маржа
                  </div>
                )}
                {report.notes && (
                  <div className="rounded-xl p-3" style={{ background: `${color}06`, border: `1px solid ${color}18` }}>
                    <div className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: `${color}66` }}>Заметки</div>
                    <p className="text-[12px] text-white/60 leading-relaxed">{report.notes}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-white/25 font-mono text-sm">Нет данных телеметрии</div>
            )}
          </div>

          {/* CTA */}
          <div className="px-5 py-4" style={{ borderTop: `1px solid ${color}18` }}>
            <Link href={`/businesses/${businessId}`}
              className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-xl font-mono text-xs uppercase tracking-widest transition-all"
              style={{ background: `${color}14`, color, border: `1px solid ${color}33` }}>
              <Zap className="w-3.5 h-3.5" />
              Полный анализ
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop: right slide-over */}
      <div
        className="hidden md:flex absolute top-0 right-0 h-full w-[420px] z-20 flex-col glass-panel"
        style={{ borderLeft: `1px solid ${color}44`, boxShadow: `-16px 0 48px ${color}14` }}
      >
        <div className="p-6 flex justify-between items-start" style={{ borderBottom: `1px solid ${color}22` }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-widest font-semibold"
                style={{ background: `${color}18`, color, border: `1px solid ${color}38` }}>
                {business?.industry || "—"}
              </span>
              {/* Health badge */}
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-widest font-semibold"
                style={{ background: `${color}26`, color, border: `1px solid ${color}55` }}>
                {healthLabel}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-widest"
                style={{
                  background: business?.status === "active" ? "#22c55e16" : "#ef444416",
                  color: business?.status === "active" ? "#22c55e" : "#ef4444",
                  border: `1px solid ${business?.status === "active" ? "#22c55e38" : "#ef444438"}`,
                }}>
                {statusLabel}
              </span>
            </div>
            <h2 className="text-[21px] font-semibold text-white leading-tight">{business?.name ?? "…"}</h2>
            <div className="flex items-center gap-1.5 mt-1.5 text-[13px]" style={{ color: `${color}aa` }}>
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-mono">{business?.city}, {business?.country}</span>
            </div>
          </div>
          <button onClick={onClose}
            className="ml-4 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ color: `${color}66` }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {business?.managerName && (
          <div className="px-6 py-4" style={{ borderBottom: `1px solid ${color}14`, background: `${color}06` }}>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-2.5" style={{ color: `${color}66` }}>Руководитель</div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold flex-shrink-0"
                style={{ background: `${color}18`, color, border: `1.5px solid ${color}38` }}>
                {business.managerName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-white text-sm font-medium">
                  <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                  <span className="truncate">{business.managerName}</span>
                </div>
                {business.managerEmail && (
                  <div className="flex items-center gap-1.5 text-[12px] mt-0.5 truncate" style={{ color: `${color}77` }}>
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{business.managerEmail}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${color}14` }}>
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: `${color}66` }}>
            Телеметрия — {periodLabel[period]}
          </span>
          <Select value={period} onValueChange={(val: FetchLatestReportPeriod) => setPeriod(val)}>
            <SelectTrigger className="w-24 h-10 text-xs font-mono border-white/10 bg-white/5 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">24ч</SelectItem>
              <SelectItem value="week">7д</SelectItem>
              <SelectItem value="month">30д</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color }} /></div>
          ) : report ? (
            <>
              {[
                { label: "Выручка", value: formatMoney(report.revenue, business?.currency ?? "USD"), icon: Activity, sub: null },
                { label: "Прибыль", value: formatMoney(report.profit, business?.currency ?? "USD"), icon: TrendingUp, sub: margin !== null ? `${parseFloat(margin) >= 0 ? "+" : ""}${margin}% маржа` : null },
                { label: "Заказы", value: formatNumber(report.orders), icon: ShoppingCart, sub: null },
              ].map(({ label, value, icon: Icon, sub }) => (
                <div key={label} className="rounded-xl p-4 flex items-center justify-between"
                  style={{ background: `${color}0a`, border: `1px solid ${color}1e` }}>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: `${color}77` }}>{label}</div>
                    <div className="text-[25px] font-light text-white tabular-nums">{value}</div>
                    {sub && <div className="text-xs mt-1 font-mono" style={{ color: sub.startsWith("+") ? "#22c55e" : "#ef4444" }}>{sub}</div>}
                  </div>
                  <Icon className="w-9 h-9 opacity-20" style={{ color }} />
                </div>
              ))}
              {report.notes && (
                <div className="rounded-xl p-4" style={{ background: `${color}06`, border: `1px solid ${color}18` }}>
                  <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: `${color}66` }}>Заметки</div>
                  <p className="text-[13px] text-white/60 leading-relaxed">{report.notes}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-white/25 font-mono text-sm">Нет данных телеметрии</div>
          )}
        </div>

        <div className="px-6 py-5" style={{ borderTop: `1px solid ${color}18` }}>
          <Link href={`/businesses/${businessId}`}
            className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-xl font-mono text-xs uppercase tracking-widest transition-all duration-200"
            style={{ background: `${color}14`, color, border: `1px solid ${color}33` }}>
            <Zap className="w-3.5 h-3.5" />
            Полный анализ
          </Link>
        </div>
      </div>
    </>
  );
}

export default function GlobeDashboard() {
  const globeEl = useRef<any>(null);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);
  const [hoveredPolygon, setHoveredPolygon] = useState<any | null>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<{ id: number; color: string } | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson")
      .then(r => r.json())
      .then(data => setCountries(data.features));
  }, []);

  const { data: businesses } = useListBusinesses({ query: { queryKey: getListBusinessesQueryKey() } });
  const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats({ period: "month" }, { query: { queryKey: getGetDashboardStatsQueryKey({ period: "month" }) } });
  const { data: topBusinesses, isLoading: isLoadingTop } = useGetTopBusinesses({ period: "month", limit: 5 }, { query: { queryKey: getGetTopBusinessesQueryKey({ period: "month", limit: 5 }) } });

  const colorMap = useMemo(() => {
    const map = new Map<number, string>();
    businesses?.forEach(b => map.set(b.id, getHealthColor(b.health)));
    return map;
  }, [businesses]);

  const markersData = useMemo(() => {
    if (!businesses) return [];
    return businesses.map(b => ({
      lat: b.lat, lng: b.lng,
      color: getHealthColor(b.health),
      health: b.health,
      alt: 0.022, radius: 0.26, business: b,
    }));
  }, [businesses]);

  // Traffic light counts
  const healthCounts = useMemo(() => {
    const counts = { green: 0, yellow: 0, red: 0 };
    businesses?.forEach(b => {
      if (b.health === "green" || b.health === "yellow" || b.health === "red") {
        counts[b.health]++;
      }
    });
    return counts;
  }, [businesses]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.4;
      globeEl.current.controls().enableZoom = true;
      globeEl.current.scene().background = null;
    }
  }, []);

  const Fallback2D = (
    <div className="w-full h-full flex items-center justify-center">
      <div className="relative" style={{ width: Math.min(dimensions.width * 0.85, 520), height: Math.min(dimensions.width * 0.85, 520) }}>
        {(() => {
          const size = Math.min(dimensions.width * 0.85, 520);
          const cx = size / 2;
          return (
            <>
              <div className="absolute inset-0 rounded-full" style={{
                background: "radial-gradient(circle at 38% 32%, #0d3a6e 0%, #082040 35%, #041020 65%, #020810 100%)",
                boxShadow: "0 0 140px 40px rgba(0,150,255,0.18), inset 0 0 80px rgba(0,80,180,0.22)",
              }} />
              {markersData.map((p, i) => {
                const angle = (i / markersData.length) * 2 * Math.PI;
                const rx = cx * 0.75 + Math.sin(i * 1.7) * cx * 0.21;
                const ry = rx * 0.55;
                const x = cx + rx * Math.cos(angle);
                const y = cx + ry * Math.sin(angle);
                return (
                  <div key={i} className="absolute cursor-pointer"
                    style={{ left: x - 8, top: y - 8 }}
                    onClick={() => setSelectedBusiness({ id: p.business.id, color: p.color })}>
                    <div className={p.health === "red" ? "beacon-red" : p.health === "yellow" ? "beacon-yellow" : undefined}
                      style={{
                        width: 16, height: 16, borderRadius: "50%",
                        background: `radial-gradient(circle at 35% 30%, #fff 0%, ${p.color} 60%)`,
                        boxShadow: `0 0 12px 5px ${p.color}cc, 0 0 28px 10px ${p.color}55`,
                      }} />
                  </div>
                );
              })}
            </>
          );
        })()}
      </div>
    </div>
  );

  return (
    <Shell>
      <div className="relative w-full h-full overflow-hidden" ref={containerRef} style={{ background: "#0b0b12" }}>

        {/* ── Цветные radial-glow пятна — дают цвет для преломления стекла ── */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div style={{
            position: "absolute", width: "55%", height: "55%", top: "5%", left: "5%",
            background: "radial-gradient(ellipse at center, rgba(139,124,255,0.20) 0%, transparent 70%)",
            animation: "glow-drift 20s ease-in-out infinite alternate",
          }} />
          <div style={{
            position: "absolute", width: "48%", height: "48%", top: "8%", right: "2%",
            background: "radial-gradient(ellipse at center, rgba(95,168,255,0.16) 0%, transparent 70%)",
            animation: "glow-drift-r 24s ease-in-out infinite alternate",
          }} />
          <div style={{
            position: "absolute", width: "42%", height: "42%", bottom: "5%", right: "12%",
            background: "radial-gradient(ellipse at center, rgba(255,143,199,0.13) 0%, transparent 70%)",
            animation: "glow-drift 28s ease-in-out infinite alternate-reverse",
          }} />
          <div style={{
            position: "absolute", width: "38%", height: "38%", bottom: "8%", left: "3%",
            background: "radial-gradient(ellipse at center, rgba(62,217,160,0.11) 0%, transparent 70%)",
            animation: "glow-drift-r 22s ease-in-out infinite alternate-reverse",
          }} />
        </div>

        <div className="absolute inset-0 z-1">
          {dimensions.width > 0 && dimensions.height > 0 && (
            <GlobeErrorBoundary fallback={Fallback2D}>
              <Globe
                ref={globeEl}
                width={dimensions.width}
                height={dimensions.height}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                atmosphereColor="#8b7cff"
                atmosphereAltitude={0.32}
                polygonsData={countries}
                polygonCapColor={(d: any) => d === hoveredPolygon ? "rgba(139,124,255,0.18)" : "rgba(255,255,255,0.02)"}
                polygonSideColor={() => "rgba(139,124,255,0.04)"}
                polygonStrokeColor={(d: any) => d === hoveredPolygon ? "#8b7cff" : "rgba(139,124,255,0.18)"}
                polygonAltitude={(d: any) => d === hoveredPolygon ? 0.015 : 0.001}
                onPolygonHover={(d: any) => setHoveredPolygon(d || null)}
                polygonsTransitionDuration={200}
                pointsData={markersData}
                pointLat="lat" pointLng="lng" pointAltitude="alt" pointRadius="radius" pointColor="color"
                pointResolution={12} pointsMerge={false}
                onPointClick={(d: any) => setSelectedBusiness({ id: d.business.id, color: d.color })}
                onPointHover={(d: any) => setHoveredPoint(d || null)}
                ringsData={prefersReducedMotion ? [] : markersData.filter((d: any) => d.health !== "green")}
                ringLat="lat" ringLng="lng"
                ringColor={(d: any) => (t: number) => `${d.color}${Math.round((1 - t * t) * 255).toString(16).padStart(2, "0")}`}
                ringMaxRadius={7}
                ringPropagationSpeed={(d: any) => d.health === "red" ? 6 : 2.8}
                ringRepeatPeriod={(d: any) => d.health === "red" ? 380 : 750}
                ringAltitude={0.001}
                htmlElementsData={markersData}
                htmlElement={(d: any) => {
                  const el = document.createElement("div");
                  const cls = d.health === "red" ? "beacon-red" : d.health === "yellow" ? "beacon-yellow" : "";
                  el.className = cls;
                  el.style.cssText = `width:9px;height:9px;border-radius:50%;background:${d.color};box-shadow:0 0 8px 4px ${d.color}cc,0 0 18px 7px ${d.color}44;border:1.5px solid rgba(255,255,255,0.7);cursor:pointer;pointer-events:auto;`;
                  el.addEventListener("click", (e) => { e.stopPropagation(); });
                  return el;
                }}
                htmlAltitude={(d: any) => d.alt + 0.005}
                onHtmlElementClick={(d: any) => setSelectedBusiness({ id: d.business.id, color: d.color })}
              />
            </GlobeErrorBoundary>
          )}
        </div>

        {/* Events feed */}
        <EventsFeed />

        {/* Country tooltip */}
        {hoveredPolygon && !hoveredPoint && !selectedBusiness && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none glass"
            style={{ padding: "8px 20px", borderRadius: 999 }}>
            <div className="text-[13px] font-semibold tracking-wide" style={{ color: "rgba(228,232,255,0.85)" }}>
              {hoveredPolygon.properties?.NAME || hoveredPolygon.properties?.name || ""}
            </div>
          </div>
        )}

        {/* Point hover tooltip (desktop) */}
        {hoveredPoint && !selectedBusiness && (
          <div className="hidden md:block absolute z-10 pointer-events-none glass"
            style={{ top: "50%", left: "50%", transform: "translate(20px, -28px)", padding: "12px 18px", borderRadius: 16 }}>
            <div className="font-semibold text-sm" style={{ color: hoveredPoint.color, fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>{hoveredPoint.business.name}</div>
            <div className="mt-0.5 text-[12px]" style={{ color: "rgba(228,232,255,0.38)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>{hoveredPoint.business.city}, {hoveredPoint.business.country}</div>
          </div>
        )}

        {/* Header */}
        <div className="absolute top-4 md:top-6 left-4 md:left-6 z-10 pointer-events-none">
          <h1 className="text-base md:text-xl font-bold leading-none" style={{ color: "rgba(228,232,255,0.92)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>Глобальный центр</h1>
          <div className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: "rgba(228,232,255,0.28)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>Командный центр</div>
        </div>

        {/* Quick task button */}
        <a
          href="/tasks"
          className="hidden md:flex absolute top-6 left-1/2 -translate-x-1/2 z-10 items-center gap-2 px-5 transition-all hover:scale-105 hover:opacity-90"
          style={{
            height: 36, borderRadius: 999,
            background: "linear-gradient(135deg, #8b7cff 0%, #6c6bff 100%)",
            color: "#fff", fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
            fontSize: 12, fontWeight: 600, letterSpacing: "0.05em",
            boxShadow: "0 4px 16px rgba(139,124,255,0.35)",
          }}
        >
          <ClipboardList className="w-3.5 h-3.5" /> Новая задача
        </a>

        {/* ── Desktop stats panel ── */}
        <div
          className="hidden md:flex absolute top-6 right-6 z-10 flex-col gap-3 w-72 pointer-events-auto transition-all duration-300"
          style={{ transform: selectedBusiness ? "translateX(130%)" : "translateX(0)", opacity: selectedBusiness ? 0 : 1 }}
        >
          {/* Revenue */}
          <div className="glass strong" style={{ borderRadius: 22, padding: "20px 24px" }}>
            <div className="uppercase tracking-widest font-semibold mb-3" style={{ fontSize: 11, color: "rgba(228,232,255,0.35)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
              Выручка · 30 дн
            </div>
            {isLoadingStats
              ? <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#8b7cff" }} />
              : (
                <>
                  <div className="tabular-nums" style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, color: "rgba(228,232,255,0.95)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </div>
                  <div className="inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(62,217,160,0.15)", color: "#3ed9a0", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
                    ↑ Активно
                  </div>
                </>
              )
            }
          </div>

          {/* Traffic light legend */}
          <div className="glass" style={{ borderRadius: 22, padding: "20px 24px" }}>
            <div className="uppercase tracking-widest font-semibold mb-4" style={{ fontSize: 11, color: "rgba(228,232,255,0.35)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
              Статус узлов
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {(["green", "yellow", "red"] as const).map(h => (
                <div key={h} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                      background: HEALTH_COLORS[h],
                      boxShadow: `0 0 8px 3px ${HEALTH_COLORS[h]}66`,
                    }} />
                    <span style={{ color: "rgba(228,232,255,0.70)", fontSize: 14, fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>{HEALTH_LABELS[h]}</span>
                  </div>
                  <span style={{ color: "rgba(228,232,255,0.50)", fontSize: 15, fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontWeight: 600 }}>{healthCounts[h]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top nodes */}
          <div className="glass" style={{ borderRadius: 22, padding: "20px 24px" }}>
            <div className="uppercase tracking-widest font-semibold mb-4" style={{ fontSize: 11, color: "rgba(228,232,255,0.35)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
              Топ узлов
            </div>
            {isLoadingTop ? <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#8b7cff" }} /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {topBusinesses?.map((b) => {
                  const bColor = colorMap.get(b.id) ?? "#3ed9a0";
                  return (
                    <div
                      key={b.id}
                      className="group"
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", minHeight: 46, borderRadius: 12, padding: "0 8px", margin: "0 -8px", transition: "background 150ms" }}
                      onClick={() => setSelectedBusiness({ id: b.id, color: bColor })}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                          background: bColor, boxShadow: `0 0 6px 2px ${bColor}66`,
                        }} />
                        <span style={{ color: "rgba(228,232,255,0.65)", fontSize: 14, fontFamily: "'Hanken Grotesk', system-ui, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
                      </div>
                      <span style={{ color: "rgba(228,232,255,0.38)", fontSize: 12, fontFamily: "'Hanken Grotesk', system-ui, sans-serif", marginLeft: 8, flexShrink: 0, tabularNums: "tabular-nums" } as any}>{formatCurrency(b.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile: revenue badge + collapsible nodes ── */}
        {!selectedBusiness && (
          <div className="md:hidden absolute top-10 right-3 z-10 pointer-events-auto flex flex-col items-end gap-2">
            {/* Revenue pill */}
            <div className="glass text-right" style={{ borderRadius: 18, padding: "10px 16px" }}>
              <div className="uppercase tracking-widest font-semibold" style={{ fontSize: 9, color: "rgba(228,232,255,0.38)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>Выручка 30Д</div>
              <div className="tabular-nums mt-0.5" style={{ fontSize: 14, fontWeight: 700, color: "rgba(228,232,255,0.90)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
                {isLoadingStats ? "…" : formatCurrency(stats?.totalRevenue || 0)}
              </div>
            </div>

            {/* Traffic light legend (mobile) */}
            <div className="glass flex items-center gap-3" style={{ borderRadius: 14, padding: "8px 12px" }}>
              {(["green", "yellow", "red"] as const).map(h => (
                <div key={h} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: HEALTH_COLORS[h], boxShadow: `0 0 6px 2px ${HEALTH_COLORS[h]}66` }} />
                  <span style={{ color: "rgba(228,232,255,0.55)", fontSize: 12, fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>{healthCounts[h]}</span>
                </div>
              ))}
            </div>

            {/* Collapsible node list */}
            <div className="glass overflow-hidden w-44" style={{ borderRadius: 18 }}>
              <button
                className="w-full flex items-center justify-between px-3 min-h-[48px] text-left"
                onClick={() => setStatsOpen(v => !v)}
              >
                <span className="uppercase tracking-widest font-semibold" style={{ fontSize: 10, color: "rgba(228,232,255,0.35)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>Узлы</span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform" style={{ color: "rgba(228,232,255,0.28)", transform: statsOpen ? "rotate(180deg)" : "none" }} />
              </button>
              {statsOpen && (
                <div className="px-3 pb-2 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  {businesses?.slice(0, 8).map(b => {
                    const bColor = getHealthColor(b.health);
                    return (
                      <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", minHeight: 44 }}
                        onClick={() => { setSelectedBusiness({ id: b.id, color: bColor }); setStatsOpen(false); }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: bColor, boxShadow: `0 0 5px ${bColor}` }} />
                        <span style={{ color: "rgba(228,232,255,0.55)", fontSize: 12, fontFamily: "'Hanken Grotesk', system-ui, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name.split(" ").slice(0, 2).join(" ")}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat widget */}
        <ChatWidget />

        {/* Slide-over / bottom sheet */}
        {selectedBusiness && (
          <BusinessSlideOver
            businessId={selectedBusiness.id}
            color={selectedBusiness.color}
            onClose={() => setSelectedBusiness(null)}
          />
        )}
      </div>
    </Shell>
  );
}
