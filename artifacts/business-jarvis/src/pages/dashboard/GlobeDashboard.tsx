import { useEffect, useRef, useState, useMemo, Component, type ReactNode } from "react";
import Globe from "react-globe.gl";
import { useListBusinesses, getListBusinessesQueryKey, useGetDashboardStats, getGetDashboardStatsQueryKey, useGetTopBusinesses, getGetTopBusinessesQueryKey, useFetchLatestReport, getFetchLatestReportQueryKey, FetchLatestReportPeriod } from "@workspace/api-client-react";

class GlobeErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Loader2, Crosshair, X, TrendingUp, DollarSign, Target, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Shell } from "@/components/layout/Shell";

function BusinessSlideOver({ businessId, onClose }: { businessId: number, onClose: () => void }) {
  const [period, setPeriod] = useState<FetchLatestReportPeriod>('month');
  const { data: report, isLoading } = useFetchLatestReport({ businessId, period }, { query: { enabled: !!businessId, queryKey: getFetchLatestReportQueryKey({ businessId, period }) }});
  const { data: businesses } = useListBusinesses({ query: { queryKey: getListBusinessesQueryKey() }});
  
  const business = businesses?.find(b => b.id === businessId);

  return (
    <div className="absolute top-0 right-0 h-full w-[400px] bg-black/80 backdrop-blur-xl border-l border-primary/30 shadow-[-10px_0_30px_rgba(0,212,255,0.1)] z-20 flex flex-col transform transition-transform duration-300 translate-x-0">
      <div className="p-6 border-b border-primary/20 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-light text-white uppercase tracking-wider">{business?.name || 'NODE'}</h2>
          <div className="text-muted-foreground font-mono text-sm mt-1">{business?.city}, {business?.country}</div>
        </div>
        <button onClick={onClose} className="text-primary/50 hover:text-primary transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-primary/70 font-mono text-xs uppercase tracking-widest">Telemetry</span>
          <Select value={period} onValueChange={(val: FetchLatestReportPeriod) => setPeriod(val)}>
            <SelectTrigger className="w-28 h-8 bg-black/40 border-primary/30 text-white font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">24h</SelectItem>
              <SelectItem value="week">7d</SelectItem>
              <SelectItem value="month">30d</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : report ? (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-md p-4">
              <div className="text-xs text-primary/70 font-mono uppercase mb-1">Revenue</div>
              <div className="text-2xl text-white font-light">{formatCurrency(report.revenue)}</div>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-md p-4">
              <div className="text-xs text-primary/70 font-mono uppercase mb-1">Orders</div>
              <div className="text-2xl text-white font-light">{formatNumber(report.orders)}</div>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-md p-4">
              <div className="text-xs text-primary/70 font-mono uppercase mb-1">Profit</div>
              <div className="text-2xl text-white font-light">{formatCurrency(report.profit)}</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground font-mono">No telemetry data.</div>
        )}

        <div className="pt-6 border-t border-primary/20">
          <Link href={`/businesses/${businessId}`} className="w-full inline-flex items-center justify-center h-10 px-4 py-2 bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-black transition-colors font-mono tracking-widest uppercase text-sm">
            Access Full Node Data
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function GlobeDashboard() {
  const globeEl = useRef<any>();
  const [hoveredLocation, setHoveredLocation] = useState<any | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  const { data: businesses } = useListBusinesses({ query: { queryKey: getListBusinessesQueryKey() }});
  const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats({ period: 'month' }, { query: { queryKey: getGetDashboardStatsQueryKey({ period: 'month' }) }});
  const { data: topBusinesses, isLoading: isLoadingTop } = useGetTopBusinesses({ period: 'month', limit: 5 }, { query: { queryKey: getGetTopBusinessesQueryKey({ period: 'month', limit: 5 }) }});
  
  const pointsData = useMemo(() => {
    if (!businesses) return [];
    return businesses.map(b => ({
      lat: b.lat,
      lng: b.lng,
      size: 0.1,
      color: b.status === 'active' ? '#00d4ff' : (b.status === 'inactive' ? '#ef4444' : '#eab308'),
      business: b
    }));
  }, [businesses]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      globeEl.current.controls().enableZoom = true;
      globeEl.current.scene().background = null;
    }
  }, []);

  return (
    <Shell>
      <div className="relative w-full h-full bg-[#050a14] overflow-hidden flex" ref={containerRef}>
        <div className="absolute inset-0 z-0 cursor-move">
          {dimensions.width > 0 && dimensions.height > 0 && (
            <GlobeErrorBoundary fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="relative w-[500px] h-[500px]">
                  <div className="absolute inset-0 rounded-full bg-gradient-radial from-[#0a2a4a] via-[#050a14] to-transparent border border-cyan-500/20 shadow-[0_0_80px_rgba(0,212,255,0.15)]" />
                  <div className="absolute inset-[30px] rounded-full border border-cyan-500/10 animate-spin" style={{animationDuration:'20s'}} />
                  <div className="absolute inset-[60px] rounded-full border border-cyan-500/15 animate-spin" style={{animationDuration:'15s',animationDirection:'reverse'}} />
                  {pointsData.map((p, i) => {
                    const angle = (i / pointsData.length) * 2 * Math.PI;
                    const radius = 180 + Math.sin(i * 1.3) * 40;
                    const x = 250 + radius * Math.cos(angle);
                    const y = 250 + radius * Math.sin(angle) * 0.5;
                    return (
                      <div key={i} className="absolute cursor-pointer" style={{left: x - 6, top: y - 6}} onClick={() => setSelectedBusiness(p.business.id)}>
                        <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,212,255,0.8)] animate-pulse" />
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
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                pointsData={pointsData}
                pointLat="lat"
                pointLng="lng"
                pointColor="color"
                pointAltitude="size"
                pointRadius={0.5}
                pointsMerge={false}
                onPointHover={(point: any) => setHoveredLocation(point)}
                onPointClick={(point: any) => setSelectedBusiness(point.business.id)}
                pointResolution={2}
                atmosphereColor="#00d4ff"
                atmosphereAltitude={0.15}
              />
            </GlobeErrorBoundary>
          )}
        </div>

        {hoveredLocation && (
          <div 
            className="absolute z-10 pointer-events-none bg-black/80 border border-primary/50 p-4 rounded-md backdrop-blur-md text-white font-mono text-sm shadow-[0_0_15px_rgba(0,212,255,0.3)]"
            style={{ top: '50%', left: '50%', transform: 'translate(20px, -20px)' }}
          >
            <div className="text-primary font-bold tracking-wider">{hoveredLocation.business.name}</div>
            <div className="text-muted-foreground mt-1">{hoveredLocation.business.city}, {hoveredLocation.business.country}</div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className={hoveredLocation.business.status === 'active' ? 'text-green-400' : (hoveredLocation.business.status === 'inactive' ? 'text-red-400' : 'text-yellow-400')}>
                ● {hoveredLocation.business.status.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        <div className="absolute top-6 left-6 z-10 flex flex-col gap-4 pointer-events-none">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-primary animate-pulse" />
            <h1 className="text-xl font-mono font-bold text-white tracking-widest">GLOBAL COMMAND</h1>
          </div>
        </div>

        <div className="absolute top-6 right-6 z-10 flex flex-col gap-4 w-72 pointer-events-auto transition-transform duration-300" style={{ transform: selectedBusiness ? 'translateX(120%)' : 'translateX(0)' }}>
          <Card className="bg-black/60 border-primary/30 backdrop-blur-md shadow-[0_0_20px_rgba(0,212,255,0.1)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-primary/70 uppercase tracking-widest font-mono">Global Revenue (30D)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <div className="text-3xl font-light text-white font-mono flex items-center gap-2">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-primary/30 backdrop-blur-md shadow-[0_0_20px_rgba(0,212,255,0.1)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-primary/70 uppercase tracking-widest font-mono">Top Nodes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTop ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <div className="space-y-3">
                  {topBusinesses?.map((b, idx) => (
                    <div key={b.id} className="flex justify-between items-center group cursor-pointer" onClick={() => setSelectedBusiness(b.id)}>
                      <div className="flex items-center gap-2">
                        <span className="text-primary/50 font-mono text-xs">{idx + 1}.</span>
                        <span className="text-white text-sm hover:text-primary transition-colors">{b.name}</span>
                      </div>
                      <span className="text-muted-foreground font-mono text-xs">{formatCurrency(b.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-20">
          <Crosshair className="w-[600px] h-[600px] text-primary" strokeWidth={0.5} />
        </div>
        
        {selectedBusiness && (
          <BusinessSlideOver businessId={selectedBusiness} onClose={() => setSelectedBusiness(null)} />
        )}
      </div>
    </Shell>
  );
}
