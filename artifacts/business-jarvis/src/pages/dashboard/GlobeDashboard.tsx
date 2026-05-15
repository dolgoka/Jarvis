import { useEffect, useRef, useState, useMemo, Component, type ReactNode } from "react";
import Globe from "react-globe.gl";
import { useListBusinesses, getListBusinessesQueryKey, useGetDashboardStats, getGetDashboardStatsQueryKey, useGetTopBusinesses, getGetTopBusinessesQueryKey, useFetchLatestReport, getFetchLatestReportQueryKey, FetchLatestReportPeriod } from "@workspace/api-client-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Loader2, X, Activity, MapPin, TrendingUp, ShoppingCart, DollarSign, User, Mail, Zap, ChevronDown } from "lucide-react";
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
  "#00d4ff","#ff4d6d","#7fff00","#ff9500","#bf5fff",
  "#ffdd00","#00ff9f","#ff6b35","#4fc3f7","#ff69b4",
];
function getBeaconColor(index: number) { return BEACON_PALETTE[index % BEACON_PALETTE.length]; }

function BusinessSlideOver({ businessId, color, onClose }: { businessId: number; color: string; onClose: () => void }) {
  const [period, setPeriod] = useState<FetchLatestReportPeriod>('month');
  const { data: report, isLoading } = useFetchLatestReport(
    { businessId, period },
    { query: { enabled: !!businessId, queryKey: getFetchLatestReportQueryKey({ businessId, period }) } }
  );
  const { data: businesses } = useListBusinesses({ query: { queryKey: getListBusinessesQueryKey() } });
  const business = businesses?.find(b => b.id === businessId);
  const margin = report && report.revenue > 0 ? ((report.profit / report.revenue) * 100).toFixed(1) : null;
  const periodLabel: Record<FetchLatestReportPeriod, string> = { day: '24 hrs', week: '7 days', month: '30 days' };

  return (
    <>
      {/* Mobile: bottom sheet overlay */}
      <div
        className="md:hidden absolute inset-0 z-20 flex flex-col justify-end"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div
          className="flex flex-col rounded-t-2xl overflow-hidden max-h-[85vh]"
          style={{
            background: 'linear-gradient(180deg, rgba(4,10,22,0.98) 0%, rgba(2,6,14,1) 100%)',
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
                  {business?.industry || '—'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-widest"
                  style={{
                    background: business?.status === 'active' ? '#22c55e16' : '#ef444416',
                    color: business?.status === 'active' ? '#22c55e' : '#ef4444',
                    border: `1px solid ${business?.status === 'active' ? '#22c55e38' : '#ef444438'}`,
                  }}>
                  {business?.status ?? 'unknown'}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-white leading-tight">{business?.name ?? '...'}</h2>
              <div className="flex items-center gap-1 mt-1 text-[12px]" style={{ color: `${color}aa` }}>
                <MapPin className="w-3 h-3" />
                <span className="font-mono">{business?.city}, {business?.country}</span>
              </div>
            </div>
            <button onClick={onClose} className="ml-3 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10"
              style={{ color: `${color}66` }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Period selector */}
          <div className="px-5 py-2.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${color}14` }}>
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: `${color}66` }}>
              Telemetry — {periodLabel[period]}
            </span>
            <Select value={period} onValueChange={(val: FetchLatestReportPeriod) => setPeriod(val)}>
              <SelectTrigger className="w-20 h-7 text-xs font-mono border-white/10 bg-white/5 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">24h</SelectItem>
                <SelectItem value="week">7d</SelectItem>
                <SelectItem value="month">30d</SelectItem>
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
                    { label: 'Revenue', value: formatCurrency(report.revenue), icon: DollarSign },
                    { label: 'Profit', value: formatCurrency(report.profit), icon: TrendingUp },
                    { label: 'Orders', value: formatNumber(report.orders), icon: ShoppingCart },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-xl p-3" style={{ background: `${color}0a`, border: `1px solid ${color}1e` }}>
                      <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: `${color}77` }}>{label}</div>
                      <div className="text-base font-light text-white tabular-nums">{value}</div>
                    </div>
                  ))}
                </div>
                {margin !== null && (
                  <div className="text-xs font-mono" style={{ color: parseFloat(margin) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {parseFloat(margin) >= 0 ? '+' : ''}{margin}% margin
                  </div>
                )}
                {report.notes && (
                  <div className="rounded-xl p-3" style={{ background: `${color}06`, border: `1px solid ${color}18` }}>
                    <div className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: `${color}66` }}>Field Notes</div>
                    <p className="text-[12px] text-white/60 leading-relaxed">{report.notes}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-white/25 font-mono text-sm">No telemetry available</div>
            )}
          </div>

          {/* CTA */}
          <div className="px-5 py-4" style={{ borderTop: `1px solid ${color}18` }}>
            <Link href={`/businesses/${businessId}`}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl font-mono text-xs uppercase tracking-widest transition-all"
              style={{ background: `${color}14`, color, border: `1px solid ${color}33` }}>
              <Zap className="w-3.5 h-3.5" />
              Full Node Analysis
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
                {business?.industry || '—'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-widest"
                style={{
                  background: business?.status === 'active' ? '#22c55e16' : '#ef444416',
                  color: business?.status === 'active' ? '#22c55e' : '#ef4444',
                  border: `1px solid ${business?.status === 'active' ? '#22c55e38' : '#ef444438'}`,
                }}>
                {business?.status ?? 'unknown'}
              </span>
            </div>
            <h2 className="text-[21px] font-semibold text-white leading-tight">{business?.name ?? '...'}</h2>
            <div className="flex items-center gap-1.5 mt-1.5 text-[13px]" style={{ color: `${color}aa` }}>
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-mono">{business?.city}, {business?.country}</span>
            </div>
          </div>
          <button onClick={onClose} className="ml-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ color: `${color}66` }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {business?.managerName && (
          <div className="px-6 py-4" style={{ borderBottom: `1px solid ${color}14`, background: `${color}06` }}>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-2.5" style={{ color: `${color}66` }}>Commander</div>
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
            Telemetry — {periodLabel[period]}
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
              {[
                { label: 'Revenue', value: formatCurrency(report.revenue), icon: DollarSign, sub: null },
                { label: 'Profit', value: formatCurrency(report.profit), icon: TrendingUp, sub: margin !== null ? `${parseFloat(margin) >= 0 ? '+' : ''}${margin}% margin` : null },
                { label: 'Orders', value: formatNumber(report.orders), icon: ShoppingCart, sub: null },
              ].map(({ label, value, icon: Icon, sub }) => (
                <div key={label} className="rounded-xl p-4 flex items-center justify-between"
                  style={{ background: `${color}0a`, border: `1px solid ${color}1e` }}>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: `${color}77` }}>{label}</div>
                    <div className="text-[25px] font-light text-white tabular-nums">{value}</div>
                    {sub && <div className="text-xs mt-1 font-mono" style={{ color: sub.startsWith('+') ? '#22c55e' : '#ef4444' }}>{sub}</div>}
                  </div>
                  <Icon className="w-9 h-9 opacity-20" style={{ color }} />
                </div>
              ))}
              {report.notes && (
                <div className="rounded-xl p-4" style={{ background: `${color}06`, border: `1px solid ${color}18` }}>
                  <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: `${color}66` }}>Field Notes</div>
                  <p className="text-[13px] text-white/60 leading-relaxed">{report.notes}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-white/25 font-mono text-sm">No telemetry available</div>
          )}
        </div>

        <div className="px-6 py-5" style={{ borderTop: `1px solid ${color}18` }}>
          <Link href={`/businesses/${businessId}`}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl font-mono text-xs uppercase tracking-widest transition-all duration-200"
            style={{ background: `${color}14`, color, border: `1px solid ${color}33` }}>
            <Zap className="w-3.5 h-3.5" />
            Full Node Analysis
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
  const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats({ period: 'month' }, { query: { queryKey: getGetDashboardStatsQueryKey({ period: 'month' }) } });
  const { data: topBusinesses, isLoading: isLoadingTop } = useGetTopBusinesses({ period: 'month', limit: 5 }, { query: { queryKey: getGetTopBusinessesQueryKey({ period: 'month', limit: 5 }) } });

  const colorMap = useMemo(() => {
    const map = new Map<number, string>();
    businesses?.forEach((b, i) => map.set(b.id, getBeaconColor(i)));
    return map;
  }, [businesses]);

  const markersData = useMemo(() => {
    if (!businesses) return [];
    return businesses.map((b, i) => ({
      lat: b.lat, lng: b.lng,
      color: getBeaconColor(i), alt: 0.025, radius: 0.52, business: b,
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

  const Fallback2D = (
    <div className="w-full h-full flex items-center justify-center">
      <div className="relative" style={{ width: Math.min(dimensions.width * 0.85, 520), height: Math.min(dimensions.width * 0.85, 520) }}>
        {(() => {
          const size = Math.min(dimensions.width * 0.85, 520);
          const cx = size / 2;
          return (
            <>
              <div className="absolute inset-0 rounded-full" style={{
                background: 'radial-gradient(circle at 38% 32%, #0d3a6e 0%, #082040 35%, #041020 65%, #020810 100%)',
                boxShadow: '0 0 140px 40px rgba(0,150,255,0.18), inset 0 0 80px rgba(0,80,180,0.22)',
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
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
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
      <div className="relative w-full h-full bg-[#020810] overflow-hidden" ref={containerRef}>
        <div className="absolute inset-0 z-0">
          {dimensions.width > 0 && dimensions.height > 0 && (
            <GlobeErrorBoundary fallback={Fallback2D}>
              <Globe
                ref={globeEl}
                width={dimensions.width}
                height={dimensions.height}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                atmosphereColor="#4db8ff"
                atmosphereAltitude={0.32}
                polygonsData={countries}
                polygonCapColor={(d: any) => d === hoveredPolygon ? "rgba(0,212,255,0.18)" : "rgba(255,255,255,0.02)"}
                polygonSideColor={() => "rgba(0,180,255,0.04)"}
                polygonStrokeColor={(d: any) => d === hoveredPolygon ? "#00d4ff" : "rgba(0,180,255,0.18)"}
                polygonAltitude={(d: any) => d === hoveredPolygon ? 0.015 : 0.001}
                onPolygonHover={(d: any) => setHoveredPolygon(d || null)}
                polygonsTransitionDuration={200}
                pointsData={markersData}
                pointLat="lat" pointLng="lng" pointAltitude="alt" pointRadius="radius" pointColor="color"
                pointResolution={16} pointsMerge={false}
                onPointClick={(d: any) => setSelectedBusiness({ id: d.business.id, color: d.color })}
                onPointHover={(d: any) => setHoveredPoint(d || null)}
                ringsData={markersData}
                ringLat="lat" ringLng="lng"
                ringColor={(d: any) => (t: number) => `${d.color}${Math.round((1 - t) * 220).toString(16).padStart(2, '0')}`}
                ringMaxRadius={4.5} ringPropagationSpeed={2.2} ringRepeatPeriod={850} ringAltitude={0.001}
              />
            </GlobeErrorBoundary>
          )}
        </div>

        {/* Country tooltip */}
        {hoveredPolygon && !hoveredPoint && !selectedBusiness && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none rounded-xl font-mono glass"
            style={{ padding: '8px 18px', border: '1px solid rgba(0,212,255,0.25)', boxShadow: '0 0 24px rgba(0,212,255,0.15)' }}>
            <div className="text-[13px] font-semibold text-cyan-300 tracking-widest uppercase">
              {hoveredPolygon.properties?.NAME || hoveredPolygon.properties?.name || ''}
            </div>
          </div>
        )}

        {/* Point hover tooltip (desktop) */}
        {hoveredPoint && !selectedBusiness && (
          <div className="hidden md:block absolute z-10 pointer-events-none rounded-xl font-mono text-sm glass"
            style={{ top: '50%', left: '50%', transform: 'translate(20px, -28px)', padding: '12px 16px',
              borderColor: `${hoveredPoint.color}44`, boxShadow: `0 0 24px ${hoveredPoint.color}28` }}>
            <div className="font-semibold text-sm" style={{ color: hoveredPoint.color }}>{hoveredPoint.business.name}</div>
            <div className="text-white/40 mt-0.5 text-[12px]">{hoveredPoint.business.city}, {hoveredPoint.business.country}</div>
          </div>
        )}

        {/* Header */}
        <div className="absolute top-3 md:top-6 left-3 md:left-6 z-10 flex items-center gap-2 md:gap-3 pointer-events-none">
          <Activity className="w-4 h-4 md:w-5 md:h-5 text-primary animate-pulse" />
          <h1 className="text-base md:text-xl font-mono font-bold text-white tracking-widest">GLOBAL COMMAND</h1>
        </div>

        {/* ── Desktop stats panel ── */}
        <div
          className="hidden md:flex absolute top-6 right-6 z-10 flex-col gap-3 w-72 pointer-events-auto transition-all duration-300"
          style={{ transform: selectedBusiness ? 'translateX(130%)' : 'translateX(0)', opacity: selectedBusiness ? 0 : 1 }}
        >
          <div className="glass-cyan rounded-xl p-5">
            <div className="text-[10px] text-primary/50 uppercase tracking-widest font-mono mb-2">Global Revenue (30D)</div>
            {isLoadingStats
              ? <Loader2 className="h-6 w-6 animate-spin text-primary" />
              : <div className="text-3xl font-light text-white font-mono tabular-nums">{formatCurrency(stats?.totalRevenue || 0)}</div>
            }
          </div>

          <div className="glass rounded-xl p-5">
            <div className="text-[10px] text-white/30 uppercase tracking-widest font-mono mb-3">Top Nodes</div>
            {isLoadingTop ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : (
              <div className="space-y-3">
                {topBusinesses?.map((b) => {
                  const bColor = colorMap.get(b.id) ?? '#00d4ff';
                  return (
                    <div key={b.id} className="flex justify-between items-center cursor-pointer group"
                      onClick={() => setSelectedBusiness({ id: b.id, color: bColor })}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: bColor, boxShadow: `0 0 8px 2px ${bColor}88` }} />
                        <span className="text-white/65 text-sm group-hover:text-white transition-colors truncate">{b.name}</span>
                      </div>
                      <span className="text-white/30 font-mono text-xs ml-2 flex-shrink-0 tabular-nums">{formatCurrency(b.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass rounded-xl p-4">
            <div className="text-[10px] text-white/30 uppercase tracking-widest font-mono mb-3">Active Nodes</div>
            <div className="grid grid-cols-2 gap-y-2 gap-x-3">
              {businesses?.slice(0, 10).map((b, i) => (
                <div key={b.id} className="flex items-center gap-1.5 cursor-pointer group min-w-0"
                  onClick={() => setSelectedBusiness({ id: b.id, color: getBeaconColor(i) })}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: getBeaconColor(i), boxShadow: `0 0 6px 1px ${getBeaconColor(i)}99` }} />
                  <span className="text-white/45 text-[11px] group-hover:text-white/80 transition-colors truncate font-mono">{b.name.split(' ').slice(0, 2).join(' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Mobile: revenue badge + collapsible nodes ── */}
        {!selectedBusiness && (
          <div className="md:hidden absolute top-10 right-3 z-10 pointer-events-auto flex flex-col items-end gap-2">
            {/* Revenue pill */}
            <div className="rounded-xl px-3 py-2 glass-cyan text-right">
              <div className="text-[9px] font-mono text-primary/60 uppercase tracking-widest">Global Rev 30D</div>
              <div className="text-sm font-mono font-light text-white tabular-nums">
                {isLoadingStats ? '…' : formatCurrency(stats?.totalRevenue || 0)}
              </div>
            </div>

            {/* Collapsible node list */}
            <div className="glass rounded-xl overflow-hidden w-44">
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-left"
                onClick={() => setStatsOpen(v => !v)}
              >
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Nodes</span>
                <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${statsOpen ? 'rotate-180' : ''}`} />
              </button>
              {statsOpen && (
                <div className="px-3 pb-2 space-y-2 border-t border-white/5">
                  {businesses?.slice(0, 8).map((b, i) => (
                    <div key={b.id} className="flex items-center gap-1.5 cursor-pointer"
                      onClick={() => { setSelectedBusiness({ id: b.id, color: getBeaconColor(i) }); setStatsOpen(false); }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: getBeaconColor(i), boxShadow: `0 0 5px ${getBeaconColor(i)}` }} />
                      <span className="text-white/50 text-[11px] font-mono truncate">{b.name.split(' ').slice(0, 2).join(' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
