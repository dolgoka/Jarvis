import { useEffect, useRef, useState, useMemo, Component, type ReactNode } from "react";
import Globe from "react-globe.gl";
import { useListBusinesses, getListBusinessesQueryKey, useGetDashboardStats, getGetDashboardStatsQueryKey, useGetTopBusinesses, getGetTopBusinessesQueryKey, useFetchLatestReport, getFetchLatestReportQueryKey, FetchLatestReportPeriod } from "@workspace/api-client-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Loader2, X, Activity, MapPin, TrendingUp, ShoppingCart, DollarSign, User, Mail, Building2, Zap } from "lucide-react";
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

const SECTOR_COLORS: Record<string, string> = {
  "Logistics":       "#f97316",
  "Agriculture":     "#22c55e",
  "Hospitality":     "#ec4899",
  "Energy":          "#facc15",
  "Real Estate":     "#fb923c",
  "Finance":         "#06b6d4",
  "Mining":          "#ef4444",
  "Technology":      "#6366f1",
  "Automotive":      "#a855f7",
  "Food & Beverage": "#10b981",
};

function getSectorColor(sector: string): string {
  for (const key of Object.keys(SECTOR_COLORS)) {
    if (sector?.toLowerCase().includes(key.toLowerCase())) return SECTOR_COLORS[key];
  }
  return "#00d4ff";
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
        background: 'linear-gradient(135deg, rgba(0,0,0,0.92) 0%, rgba(5,10,20,0.96) 100%)',
        borderLeft: `1px solid ${color}44`,
        boxShadow: `-12px 0 40px ${color}18`,
      }}
    >
      <div className="p-6 border-b flex justify-between items-start" style={{ borderColor: `${color}30` }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest font-bold"
              style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
            >
              {business?.sector || 'NODE'}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest"
              style={{
                background: business?.status === 'active' ? '#22c55e22' : '#ef444422',
                color: business?.status === 'active' ? '#22c55e' : '#ef4444',
                border: `1px solid ${business?.status === 'active' ? '#22c55e44' : '#ef444444'}`,
              }}
            >
              {business?.status || 'unknown'}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-white tracking-wide leading-tight">{business?.name || 'Loading...'}</h2>
          <div className="flex items-center gap-1.5 mt-1.5 text-sm" style={{ color: `${color}cc` }}>
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-mono">{business?.city}, {business?.country}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-4 p-1.5 rounded-full transition-colors hover:bg-white/10"
          style={{ color: `${color}88` }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {business?.managerName && (
        <div className="px-6 py-4 border-b" style={{ borderColor: `${color}18`, background: `${color}08` }}>
          <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: `${color}88` }}>Commander</div>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
            >
              {business.managerName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-white text-sm font-medium">
                <User className="w-3.5 h-3.5" style={{ color }} />
                {business.managerName}
              </div>
              {business.managerEmail && (
                <div className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: `${color}99` }}>
                  <Mail className="w-3 h-3" />
                  {business.managerEmail}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-4 flex items-center justify-between">
        <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: `${color}88` }}>
          Telemetry — {period && periodLabel[period]}
        </div>
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

      <div className="px-6 pb-2 flex-1 overflow-y-auto space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color }} /></div>
        ) : report ? (
          <>
            <div
              className="rounded-xl p-4 flex items-center justify-between"
              style={{ background: `${color}0d`, border: `1px solid ${color}25` }}
            >
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: `${color}88` }}>Revenue</div>
                <div className="text-2xl font-light text-white">{formatCurrency(report.revenue)}</div>
              </div>
              <DollarSign className="w-8 h-8 opacity-30" style={{ color }} />
            </div>

            <div
              className="rounded-xl p-4 flex items-center justify-between"
              style={{ background: `${color}0d`, border: `1px solid ${color}25` }}
            >
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: `${color}88` }}>Profit</div>
                <div className="text-2xl font-light text-white">{formatCurrency(report.profit)}</div>
                {margin && (
                  <div className="text-xs mt-1 font-mono" style={{ color: parseFloat(margin) > 0 ? '#22c55e' : '#ef4444' }}>
                    {parseFloat(margin) > 0 ? '+' : ''}{margin}% margin
                  </div>
                )}
              </div>
              <TrendingUp className="w-8 h-8 opacity-30" style={{ color }} />
            </div>

            <div
              className="rounded-xl p-4 flex items-center justify-between"
              style={{ background: `${color}0d`, border: `1px solid ${color}25` }}
            >
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: `${color}88` }}>Orders</div>
                <div className="text-2xl font-light text-white">{formatNumber(report.orders)}</div>
              </div>
              <ShoppingCart className="w-8 h-8 opacity-30" style={{ color }} />
            </div>

            {report.notes && (
              <div
                className="rounded-xl p-4"
                style={{ background: `${color}08`, border: `1px solid ${color}20` }}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: `${color}88` }}>Field Notes</div>
                <p className="text-sm text-white/70 leading-relaxed">{report.notes}</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-white/30 font-mono text-sm">No telemetry available</div>
        )}
      </div>

      <div className="px-6 py-5 border-t" style={{ borderColor: `${color}20` }}>
        <Link
          href={`/businesses/${businessId}`}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-lg font-mono text-xs uppercase tracking-widest transition-all"
          style={{
            background: `${color}18`,
            color,
            border: `1px solid ${color}40`,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = color; (e.currentTarget as HTMLElement).style.color = '#000'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${color}18`; (e.currentTarget as HTMLElement).style.color = color; }}
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
  const [hoveredLocation, setHoveredLocation] = useState<any | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<{ id: number; color: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { data: businesses } = useListBusinesses({ query: { queryKey: getListBusinessesQueryKey() } });
  const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats({ period: 'month' }, { query: { queryKey: getGetDashboardStatsQueryKey({ period: 'month' }) } });
  const { data: topBusinesses, isLoading: isLoadingTop } = useGetTopBusinesses({ period: 'month', limit: 5 }, { query: { queryKey: getGetTopBusinessesQueryKey({ period: 'month', limit: 5 }) } });

  const markersData = useMemo(() => {
    if (!businesses) return [];
    return businesses.map(b => ({
      lat: b.lat,
      lng: b.lng,
      color: getSectorColor(b.sector),
      business: b,
    }));
  }, [businesses]);

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'globe-beacon-styles';
    style.textContent = `
      @keyframes beacon-outer { 0%,100%{transform:scale(1);opacity:.9} 50%{transform:scale(1.3);opacity:.55} }
      @keyframes beacon-ring  { 0%{transform:scale(1);opacity:.75} 100%{transform:scale(3.2);opacity:0} }
      @keyframes beacon-ring2 { 0%{transform:scale(1);opacity:.55} 100%{transform:scale(3.2);opacity:0} }
      .globe-beacon  { animation: beacon-outer 2.2s ease-in-out infinite; }
      .globe-beacon-ring  { animation: beacon-ring  2.2s ease-out infinite; }
      .globe-beacon-ring2 { animation: beacon-ring2 2.2s ease-out infinite 0.8s; }
    `;
    if (!document.getElementById('globe-beacon-styles')) document.head.appendChild(style);
    return () => { document.getElementById('globe-beacon-styles')?.remove(); };
  }, []);

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
      <div className="relative w-full h-full bg-[#020810] overflow-hidden flex" ref={containerRef}>
        <div className="absolute inset-0 z-0 cursor-move">
          {dimensions.width > 0 && dimensions.height > 0 && (
            <GlobeErrorBoundary fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="relative w-[520px] h-[520px]">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 38% 32%, #0d3a6e 0%, #082040 35%, #041020 65%, #020810 100%)',
                      boxShadow: '0 0 140px 40px rgba(0,150,255,0.2), inset 0 0 80px rgba(0,80,180,0.25)',
                    }}
                  />
                  {markersData.map((p, i) => {
                    const angle = (i / markersData.length) * 2 * Math.PI;
                    const radius = 180 + Math.sin(i * 1.7) * 50;
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
                          <div className="absolute inset-0 rounded-full animate-ping" style={{ background: p.color, opacity: 0.25 }} />
                          <div
                            className="w-3.5 h-3.5 rounded-full"
                            style={{
                              background: `radial-gradient(circle at 35% 32%, #fff, ${p.color})`,
                              boxShadow: `0 0 10px 4px ${p.color}bb, 0 0 20px 8px ${p.color}44`,
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
                htmlElementsData={markersData}
                htmlLat="lat"
                htmlLng="lng"
                htmlElement={(d: any) => {
                  const c = d.color;
                  const el = document.createElement('div');
                  el.style.cssText = `width:32px;height:32px;position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;`;
                  el.innerHTML = `
                    <div class="globe-beacon-ring"  style="position:absolute;inset:0;border-radius:50%;border:2px solid ${c};pointer-events:none;"></div>
                    <div class="globe-beacon-ring2" style="position:absolute;inset:0;border-radius:50%;border:1.5px solid ${c};pointer-events:none;"></div>
                    <div class="globe-beacon" style="width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 32%,#ffffff,${c});box-shadow:0 0 16px 7px ${c}cc,0 0 32px 14px ${c}44;border:1.5px solid ${c};"></div>
                  `;
                  el.addEventListener('click', () => setSelectedBusiness({ id: d.business.id, color: c }));
                  el.addEventListener('mouseenter', () => setHoveredLocation(d));
                  el.addEventListener('mouseleave', () => setHoveredLocation(null));
                  return el;
                }}
                ringsData={markersData}
                ringLat="lat"
                ringLng="lng"
                ringColor={(d: any) => (t: number) => `${d.color}${Math.round((1 - t) * 170).toString(16).padStart(2, '0')}`}
                ringMaxRadius={4}
                ringPropagationSpeed={2.5}
                ringRepeatPeriod={850}
                atmosphereColor="#4db8ff"
                atmosphereAltitude={0.32}
              />
            </GlobeErrorBoundary>
          )}
        </div>

        {hoveredLocation && !selectedBusiness && (
          <div
            className="absolute z-10 pointer-events-none backdrop-blur-md text-white font-mono text-sm rounded-xl"
            style={{
              top: '50%', left: '50%', transform: 'translate(20px, -20px)',
              background: 'rgba(0,0,0,0.85)',
              border: `1px solid ${hoveredLocation.color}55`,
              padding: '12px 16px',
              boxShadow: `0 0 20px ${hoveredLocation.color}33`,
            }}
          >
            <div className="font-bold tracking-wider" style={{ color: hoveredLocation.color }}>{hoveredLocation.business.name}</div>
            <div className="text-white/50 mt-1 text-xs">{hoveredLocation.business.city}, {hoveredLocation.business.country}</div>
            <div
              className="mt-2 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded inline-block"
              style={{ background: `${hoveredLocation.color}20`, color: hoveredLocation.color }}
            >
              {hoveredLocation.business.sector}
            </div>
          </div>
        )}

        <div className="absolute top-6 left-6 z-10 flex flex-col gap-4 pointer-events-none">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-primary animate-pulse" />
            <h1 className="text-xl font-mono font-bold text-white tracking-widest">GLOBAL COMMAND</h1>
          </div>
        </div>

        <div
          className="absolute top-6 right-6 z-10 flex flex-col gap-4 w-72 pointer-events-auto transition-all duration-300"
          style={{ transform: selectedBusiness ? 'translateX(130%)' : 'translateX(0)', opacity: selectedBusiness ? 0 : 1 }}
        >
          <Card className="bg-black/70 border-primary/20 backdrop-blur-md shadow-[0_0_30px_rgba(0,212,255,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] text-primary/60 uppercase tracking-widest font-mono">Global Revenue (30D)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <div className="text-3xl font-light text-white font-mono">{formatCurrency(stats?.totalRevenue || 0)}</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black/70 border-primary/20 backdrop-blur-md shadow-[0_0_30px_rgba(0,212,255,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] text-primary/60 uppercase tracking-widest font-mono">Top Nodes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTop ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <div className="space-y-3">
                  {topBusinesses?.map((b, idx) => {
                    const bColor = getSectorColor(b.sector || '');
                    return (
                      <div
                        key={b.id}
                        className="flex justify-between items-center cursor-pointer group"
                        onClick={() => setSelectedBusiness({ id: b.id, color: bColor })}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-white/30 font-mono text-xs">{idx + 1}.</span>
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: bColor, boxShadow: `0 0 6px ${bColor}` }} />
                          <span className="text-white/80 text-sm group-hover:text-white transition-colors">{b.name}</span>
                        </div>
                        <span className="text-white/40 font-mono text-xs">{formatCurrency(b.revenue)}</span>
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
