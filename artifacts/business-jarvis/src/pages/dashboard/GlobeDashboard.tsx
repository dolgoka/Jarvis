import { useEffect, useRef, useState, useMemo, Component, type ReactNode } from "react";
import Globe from "react-globe.gl";
import { useListBusinesses, getListBusinessesQueryKey, useGetDashboardStats, getGetDashboardStatsQueryKey, useGetTopBusinesses, getGetTopBusinessesQueryKey, useFetchLatestReport, getFetchLatestReportQueryKey, FetchLatestReportPeriod } from "@workspace/api-client-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Loader2, X, Activity, MapPin, TrendingUp, ShoppingCart, DollarSign, User, Mail, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const BEACON_PALETTE = [
  "#00d4ff", // cyan
  "#ff4d6d", // red-pink
  "#7fff00", // chartreuse
  "#ff9500", // orange
  "#bf5fff", // violet
  "#ffdd00", // yellow
  "#00ff9f", // mint
  "#ff6b35", // coral
  "#4fc3f7", // sky blue
  "#ff69b4", // hot pink
];

function getBeaconColor(index: number): string {
  return BEACON_PALETTE[index % BEACON_PALETTE.length];
}

function BusinessSlideOver({ businessId, color, onClose }: { businessId: number; color: string; onClose: () => void }) {
  const [period, setPeriod] = useState<FetchLatestReportPeriod>('month');
  const { data: report, isLoading } = useFetchLatestReport(
    { businessId, period },
    { query: { enabled: !!businessId, queryKey: getFetchLatestReportQueryKey({ businessId, period }) } }
  );
  const { data: businesses } = useListBusinesses({ query: { queryKey: getListBusinessesQueryKey() } });
  const business = businesses?.find(b => b.id === businessId);

  const margin = report && report.revenue > 0
    ? ((report.profit / report.revenue) * 100).toFixed(1)
    : null;

  const periodLabel: Record<FetchLatestReportPeriod, string> = { day: '24 hrs', week: '7 days', month: '30 days' };

  return (
    <div
      className="absolute top-0 right-0 h-full w-[420px] backdrop-blur-xl z-20 flex flex-col"
      style={{
        background: 'linear-gradient(160deg, rgba(5,12,26,0.97) 0%, rgba(2,6,15,0.99) 100%)',
        borderLeft: `1px solid ${color}50`,
        boxShadow: `-16px 0 48px ${color}1a`,
      }}
    >
      <div className="p-6 border-b flex justify-between items-start" style={{ borderColor: `${color}28` }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-widest font-semibold"
              style={{ background: `${color}1a`, color, border: `1px solid ${color}40` }}
            >
              {business?.sector || '—'}
            </span>
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-widest"
              style={{
                background: business?.status === 'active' ? '#22c55e1a' : '#ef44441a',
                color: business?.status === 'active' ? '#22c55e' : '#ef4444',
                border: `1px solid ${business?.status === 'active' ? '#22c55e40' : '#ef444440'}`,
              }}
            >
              {business?.status ?? 'unknown'}
            </span>
          </div>
          <h2 className="text-[22px] font-semibold text-white leading-tight">{business?.name ?? 'Loading...'}</h2>
          <div className="flex items-center gap-1.5 mt-2 text-[13px]" style={{ color: `${color}bb` }}>
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-mono">{business?.city}, {business?.country}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ color: `${color}77` }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {business?.managerName && (
        <div className="px-6 py-4 border-b" style={{ borderColor: `${color}18`, background: `${color}07` }}>
          <div className="text-[10px] font-mono uppercase tracking-widest mb-2.5" style={{ color: `${color}77` }}>Commander</div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold flex-shrink-0"
              style={{ background: `${color}1f`, color, border: `1.5px solid ${color}44` }}
            >
              {business.managerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-white text-sm font-medium">
                <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                <span className="truncate">{business.managerName}</span>
              </div>
              {business.managerEmail && (
                <div className="flex items-center gap-1.5 text-[12px] mt-0.5 truncate" style={{ color: `${color}88` }}>
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{business.managerEmail}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-3.5 flex items-center justify-between border-b" style={{ borderColor: `${color}18` }}>
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: `${color}77` }}>
          Telemetry — {period && periodLabel[period]}
        </span>
        <Select value={period} onValueChange={(val: FetchLatestReportPeriod) => setPeriod(val)}>
          <SelectTrigger className="w-24 h-7 text-xs font-mono border-white/10 bg-white/5 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">24h</SelectItem>
            <SelectItem value="week">7d</SelectItem>
            <SelectItem value="month">30d</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="px-6 py-4 flex-1 overflow-y-auto space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color }} /></div>
        ) : report ? (
          <>
            <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: `${color}0c`, border: `1px solid ${color}22` }}>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: `${color}88` }}>Revenue</div>
                <div className="text-[26px] font-light text-white tabular-nums">{formatCurrency(report.revenue)}</div>
              </div>
              <DollarSign className="w-9 h-9 opacity-20" style={{ color }} />
            </div>

            <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: `${color}0c`, border: `1px solid ${color}22` }}>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: `${color}88` }}>Profit</div>
                <div className="text-[26px] font-light text-white tabular-nums">{formatCurrency(report.profit)}</div>
                {margin !== null && (
                  <div className="text-xs mt-1 font-mono" style={{ color: parseFloat(margin) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {parseFloat(margin) >= 0 ? '+' : ''}{margin}% margin
                  </div>
                )}
              </div>
              <TrendingUp className="w-9 h-9 opacity-20" style={{ color }} />
            </div>

            <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: `${color}0c`, border: `1px solid ${color}22` }}>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: `${color}88` }}>Orders</div>
                <div className="text-[26px] font-light text-white tabular-nums">{formatNumber(report.orders)}</div>
              </div>
              <ShoppingCart className="w-9 h-9 opacity-20" style={{ color }} />
            </div>

            {report.notes && (
              <div className="rounded-xl p-4" style={{ background: `${color}07`, border: `1px solid ${color}1c` }}>
                <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: `${color}77` }}>Field Notes</div>
                <p className="text-[13px] text-white/65 leading-relaxed">{report.notes}</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-white/25 font-mono text-sm">No telemetry available</div>
        )}
      </div>

      <div className="px-6 py-5 border-t" style={{ borderColor: `${color}1c` }}>
        <Link
          href={`/businesses/${businessId}`}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-lg font-mono text-xs uppercase tracking-widest transition-all duration-200"
          style={{ background: `${color}16`, color, border: `1px solid ${color}3a` }}
        >
          <Zap className="w-3.5 h-3.5" />
          Full Node Analysis
        </Link>
      </div>
    </div>
  );
}

export default function GlobeDashboard() {
  const globeEl = useRef<any>();
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<{ id: number; color: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { data: businesses } = useListBusinesses({ query: { queryKey: getListBusinessesQueryKey() } });
  const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats({ period: 'month' }, { query: { queryKey: getGetDashboardStatsQueryKey({ period: 'month' }) } });
  const { data: topBusinesses, isLoading: isLoadingTop } = useGetTopBusinesses({ period: 'month', limit: 5 }, { query: { queryKey: getGetTopBusinessesQueryKey({ period: 'month', limit: 5 }) } });

  const colorMap = useMemo(() => {
    const map = new Map<number, string>();
    businesses?.forEach((b, i) => map.set(b.id, getBeaconColor(i)));
    return map;
  }, [businesses]);

  const pointsData = useMemo(() => {
    if (!businesses) return [];
    return businesses.map((b, i) => ({
      lat: b.lat,
      lng: b.lng,
      color: getBeaconColor(i),
      size: 0.6,
      business: b,
      idx: i,
    }));
  }, [businesses]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.4;
      globeEl.current.controls().enableZoom = true;
      globeEl.current.scene().background = null;
    }
  }, []);

  return (
    <Shell>
      <div className="relative w-full h-full bg-[#020810] overflow-hidden" ref={containerRef}>
        <div className="absolute inset-0 z-0 cursor-move">
          {dimensions.width > 0 && dimensions.height > 0 && (
            <GlobeErrorBoundary fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="relative w-[520px] h-[520px]">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 38% 32%, #0d3a6e 0%, #082040 35%, #041020 65%, #020810 100%)',
                      boxShadow: '0 0 140px 40px rgba(0,150,255,0.18), inset 0 0 80px rgba(0,80,180,0.22)',
                    }}
                  />
                  {pointsData.map((p, i) => {
                    const angle = (i / pointsData.length) * 2 * Math.PI;
                    const radius = 185 + Math.sin(i * 1.7) * 50;
                    const x = 260 + radius * Math.cos(angle);
                    const y = 260 + radius * Math.sin(angle) * 0.55;
                    return (
                      <div
                        key={i}
                        className="absolute cursor-pointer"
                        style={{ left: x - 12, top: y - 12 }}
                        onClick={() => setSelectedBusiness({ id: p.business.id, color: p.color })}
                      >
                        <div className="w-6 h-6 relative flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full animate-ping" style={{ background: p.color, opacity: 0.22 }} />
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{
                              background: `radial-gradient(circle at 32% 28%, #fff 0%, ${p.color} 60%)`,
                              boxShadow: `0 0 12px 5px ${p.color}bb, 0 0 24px 10px ${p.color}44`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            }>
              <Globe
                ref={globeEl}
                width={dimensions.width}
                height={dimensions.height}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                pointsData={pointsData}
                pointLat="lat"
                pointLng="lng"
                pointColor="color"
                pointAltitude="size"
                pointRadius={0.55}
                pointsMerge={false}
                pointResolution={12}
                onPointClick={(point: any) => setSelectedBusiness({ id: point.business.id, color: point.color })}
                onPointHover={(point: any) => setHoveredPoint(point)}
                ringsData={pointsData}
                ringLat="lat"
                ringLng="lng"
                ringColor={(d: any) => (t: number) => `${d.color}${Math.round((1 - t) * 200).toString(16).padStart(2, '0')}`}
                ringMaxRadius={4.5}
                ringPropagationSpeed={2.5}
                ringRepeatPeriod={900}
                atmosphereColor="#4db8ff"
                atmosphereAltitude={0.32}
              />
            </GlobeErrorBoundary>
          )}
        </div>

        {hoveredPoint && !selectedBusiness && (
          <div
            className="absolute z-10 pointer-events-none rounded-xl font-mono text-sm"
            style={{
              top: '50%', left: '50%', transform: 'translate(20px, -28px)',
              background: 'rgba(2,6,18,0.92)',
              border: `1px solid ${hoveredPoint.color}50`,
              padding: '12px 16px',
              boxShadow: `0 0 24px ${hoveredPoint.color}30`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="font-semibold text-sm" style={{ color: hoveredPoint.color }}>{hoveredPoint.business.name}</div>
            <div className="text-white/45 mt-1 text-[12px]">{hoveredPoint.business.city}, {hoveredPoint.business.country}</div>
            <div
              className="mt-1.5 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full inline-block"
              style={{ background: `${hoveredPoint.color}18`, color: hoveredPoint.color }}
            >
              {hoveredPoint.business.sector}
            </div>
          </div>
        )}

        <div className="absolute top-6 left-6 z-10 flex items-center gap-3 pointer-events-none">
          <Activity className="w-5 h-5 text-primary animate-pulse" />
          <h1 className="text-xl font-mono font-bold text-white tracking-widest">GLOBAL COMMAND</h1>
        </div>

        <div
          className="absolute top-6 right-6 z-10 flex flex-col gap-4 w-72 pointer-events-auto transition-all duration-300"
          style={{ transform: selectedBusiness ? 'translateX(130%)' : 'translateX(0)', opacity: selectedBusiness ? 0 : 1 }}
        >
          <Card className="bg-black/75 border-white/8 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Global Revenue (30D)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <div className="text-3xl font-light text-white font-mono tabular-nums">{formatCurrency(stats?.totalRevenue || 0)}</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black/75 border-white/8 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Top Nodes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTop ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <div className="space-y-3">
                  {topBusinesses?.map((b) => {
                    const bColor = colorMap.get(b.id) ?? '#00d4ff';
                    return (
                      <div
                        key={b.id}
                        className="flex justify-between items-center cursor-pointer group"
                        onClick={() => setSelectedBusiness({ id: b.id, color: bColor })}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: bColor, boxShadow: `0 0 8px 2px ${bColor}99` }}
                          />
                          <span className="text-white/70 text-sm group-hover:text-white transition-colors truncate">{b.name}</span>
                        </div>
                        <span className="text-white/35 font-mono text-xs ml-2 flex-shrink-0 tabular-nums">{formatCurrency(b.revenue)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
