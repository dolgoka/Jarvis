import { useEffect, useRef, useState, useMemo, useCallback, Component, type ReactNode } from "react";
import Globe from "react-globe.gl";
import {
  useListBusinesses, getListBusinessesQueryKey,
  useGetDashboardStats, getGetDashboardStatsQueryKey,
  useGetTopBusinesses, getGetTopBusinessesQueryKey,
  useFetchLatestReport, getFetchLatestReportQueryKey,
  FetchLatestReportPeriod,
  useGetFeed, getGetFeedQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency, formatMoney, formatNumber } from "@/lib/utils";
import {
  Loader2, X, MapPin, User, Mail,
  Zap, ChevronDown, Newspaper, Globe as GlobeIcon, ExternalLink,
  PanelLeft, LayoutGrid, Brain, ClipboardList,
  Link as LinkIcon, RefreshCcw, Menu, Sparkles,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import NewsFeedOverlay from "./NewsFeedOverlay";
import { BottomDock, type DockPanel } from "./BottomDock";
import { AIChatSidePanel } from "./AIChatSidePanel";
import BusinessCardOverlay from "./BusinessCardOverlay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthContext } from "@/hooks/AuthContext";

const HF = "'Hanken Grotesk', system-ui, sans-serif";

class GlobeErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
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

const GLOBE_NAV = [
  { href: "/",           label: "Глобальный центр", icon: GlobeIcon },
  { href: "/businesses", label: "Мои компании",      icon: LayoutGrid },
  { href: "/tasks",      label: "Задачи",            icon: ClipboardList },
  { href: "/ai-summary", label: "Сводка ИИ",         icon: Brain },
  { href: "/connect",    label: "Добавить компанию",  icon: LinkIcon },
] as const;

/* ── BusinessSlideOver ─────────────────────────────────────────────────────── */

function BusinessSlideOver({ businessId, color: _color, onClose, onOpenCard }: {
  businessId: number; color: string; onClose: () => void; onOpenCard: () => void;
}) {
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
  const healthColor = HEALTH_COLORS[health] ?? "#3ed9a0";
  const statusLabel = STATUS_LABELS[business?.status ?? ""] ?? (business?.status ?? "—");
  const statusColor = business?.status === "active" ? "#3ed9a0" : "#f0625a";
  const DIVIDER = "rgba(255,255,255,0.07)";
  const PANEL_BG = "rgba(8, 14, 28, 0.88)";
  const PANEL_BLUR = "blur(22px) saturate(120%)";
  const marginNum = margin !== null ? parseFloat(margin) : null;

  const Badges = () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: HF, background: "rgba(255,255,255,0.07)", color: "rgba(228,232,255,0.55)", border: "1px solid rgba(255,255,255,0.11)" }}>
        {business?.industry || "—"}
      </span>
      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: HF, background: `${healthColor}18`, color: healthColor, border: `1px solid ${healthColor}44` }}>
        {healthLabel}
      </span>
      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: HF, background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}40` }}>
        {statusLabel}
      </span>
    </div>
  );

  const StatCard = ({ label, value, showMargin }: { label: string; value: string; showMargin?: boolean }) => (
    <div className="glass" style={{ padding: "16px" }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(228,232,255,0.45)", fontFamily: HF, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(228,232,255,0.95)", fontFamily: HF, lineHeight: 1 }}>{value}</div>
      {showMargin && marginNum !== null && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, padding: "2px 8px", borderRadius: 999, background: marginNum >= 0 ? "rgba(62,217,160,0.15)" : "rgba(240,98,90,0.15)", color: marginNum >= 0 ? "#3ed9a0" : "#f0625a", fontSize: 11, fontWeight: 600, fontFamily: HF }}>
          {marginNum >= 0 ? "↑" : "↓"} {margin}% маржа
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Mobile: bottom sheet ── */}
      <div className="md:hidden absolute inset-0 z-20 flex flex-col justify-end"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}>
        <div className="flex flex-col rounded-t-2xl overflow-hidden max-h-[85vh]"
          style={{ background: PANEL_BG, backdropFilter: PANEL_BLUR, WebkitBackdropFilter: PANEL_BLUR, borderTop: "1px solid rgba(255,255,255,0.10)" }}
          onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.18)" }} />
          </div>
          <div style={{ padding: "12px 20px 14px", borderBottom: `1px solid ${DIVIDER}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Badges />
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "rgba(228,232,255,0.95)", fontFamily: HF, lineHeight: 1.2 }}>{business?.name ?? "…"}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, color: "rgba(228,232,255,0.38)", fontSize: 12, fontFamily: HF }}>
                <MapPin className="w-3 h-3 flex-shrink-0" />{business?.city}, {business?.country}
              </div>
            </div>
            <button onClick={onClose} className="hover:bg-white/10 transition-colors"
              style={{ marginLeft: 12, minWidth: 44, minHeight: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "rgba(228,232,255,0.35)", cursor: "pointer" }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div style={{ padding: "8px 20px", borderBottom: `1px solid ${DIVIDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(228,232,255,0.35)", fontFamily: HF }}>Телеметрия — {periodLabel[period]}</span>
            <Select value={period} onValueChange={(val: FetchLatestReportPeriod) => setPeriod(val)}>
              <SelectTrigger className="w-24 h-10 text-xs font-mono border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="day">24ч</SelectItem><SelectItem value="week">7д</SelectItem><SelectItem value="month">30д</SelectItem></SelectContent>
            </Select>
          </div>
          <div style={{ padding: "14px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {isLoading
              ? <div style={{ display: "flex", justifyContent: "center", padding: "28px 0" }}><Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--jarvis-accent)" }} /></div>
              : report ? <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <StatCard label="Выручка" value={formatMoney(report.revenue, business?.currency ?? "USD")} />
                    <StatCard label="Прибыль" value={formatMoney(report.profit, business?.currency ?? "USD")} showMargin />
                    <StatCard label="Заказы" value={formatNumber(report.orders)} />
                  </div>
                  {report.notes && <div className="glass" style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(228,232,255,0.45)", fontFamily: HF, marginBottom: 6 }}>Заметки</div>
                    <p style={{ fontSize: 12, color: "rgba(228,232,255,0.55)", lineHeight: 1.6, fontFamily: HF }}>{report.notes}</p>
                  </div>}
                </>
              : <div style={{ textAlign: "center", padding: "28px 0", color: "rgba(228,232,255,0.20)", fontSize: 14, fontFamily: HF }}>Нет данных телеметрии</div>}
          </div>
          <div style={{ padding: "10px 20px 14px", borderTop: `1px solid ${DIVIDER}` }}>
            <button onClick={onOpenCard}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44, borderRadius: 14, background: "linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)", color: "#fff", fontFamily: HF, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", boxShadow: "0 4px 16px rgba(0,212,255,0.25)", width: "100%", cursor: "pointer", border: "none" }}>
              <ExternalLink className="w-3.5 h-3.5" /> Открыть полностью
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop: right slide-over ── */}
      <div className="hidden md:flex absolute top-0 right-0 h-full w-[420px] z-20 flex-col"
        style={{ background: PANEL_BG, backdropFilter: PANEL_BLUR, WebkitBackdropFilter: PANEL_BLUR, borderLeft: "1px solid rgba(255,255,255,0.09)" }}>
        <div style={{ padding: "24px 24px 20px", borderBottom: `1px solid ${DIVIDER}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Badges />
            <h2 style={{ fontSize: 21, fontWeight: 700, color: "rgba(228,232,255,0.95)", fontFamily: HF, lineHeight: 1.2 }}>{business?.name ?? "…"}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, color: "rgba(228,232,255,0.38)", fontSize: 13, fontFamily: HF }}>
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />{business?.city}, {business?.country}
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 transition-colors"
            style={{ marginLeft: 16, minWidth: 44, minHeight: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "rgba(228,232,255,0.30)", cursor: "pointer" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        {business?.managerName && (
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${DIVIDER}`, background: "var(--jarvis-accent-08)" }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(228,232,255,0.35)", fontFamily: HF, marginBottom: 10 }}>Руководитель</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 15, fontWeight: 700, background: "var(--jarvis-accent-12)", color: "var(--jarvis-accent)", border: "1.5px solid var(--jarvis-accent-35)", fontFamily: HF }}>
                {business.managerName.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(228,232,255,0.85)", fontSize: 14, fontWeight: 600, fontFamily: HF }}>
                  <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--jarvis-accent)" }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{business.managerName}</span>
                </div>
                {business.managerEmail && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(228,232,255,0.38)", fontSize: 12, marginTop: 3, fontFamily: HF }}>
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{business.managerEmail}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div style={{ padding: "10px 24px", borderBottom: `1px solid ${DIVIDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(228,232,255,0.35)", fontFamily: HF }}>Телеметрия — {periodLabel[period]}</span>
          <Select value={period} onValueChange={(val: FetchLatestReportPeriod) => setPeriod(val)}>
            <SelectTrigger className="w-24 h-10 text-xs font-mono border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="day">24ч</SelectItem><SelectItem value="week">7д</SelectItem><SelectItem value="month">30д</SelectItem></SelectContent>
          </Select>
        </div>
        <div style={{ padding: "20px 24px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {isLoading
            ? <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--jarvis-accent)" }} /></div>
            : report ? <>
                <StatCard label="Выручка" value={formatMoney(report.revenue, business?.currency ?? "USD")} />
                <StatCard label="Прибыль" value={formatMoney(report.profit, business?.currency ?? "USD")} showMargin />
                <StatCard label="Заказы" value={formatNumber(report.orders)} />
                {report.notes && <div className="glass" style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(228,232,255,0.45)", fontFamily: HF, marginBottom: 8 }}>Заметки</div>
                  <p style={{ fontSize: 13, color: "rgba(228,232,255,0.55)", lineHeight: 1.65, fontFamily: HF }}>{report.notes}</p>
                </div>}
              </>
            : <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(228,232,255,0.20)", fontSize: 14, fontFamily: HF }}>Нет данных телеметрии</div>}
        </div>
        <div style={{ padding: "16px 24px 20px", borderTop: `1px solid ${DIVIDER}` }}>
          <button onClick={onOpenCard}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44, borderRadius: 14, background: "linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)", color: "#fff", fontFamily: HF, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", boxShadow: "0 4px 16px rgba(0,212,255,0.25)", width: "100%", cursor: "pointer", border: "none" }}>
            <ExternalLink className="w-3.5 h-3.5" /> Открыть полностью
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Main Dashboard ────────────────────────────────────────────────────────── */

export default function GlobeDashboard() {
  const globeEl = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);
  const [hoveredPolygon, setHoveredPolygon] = useState<any | null>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<{ id: number; color: string } | null>(null);
  const [cardBusinessId, setCardBusinessId] = useState<number | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const lastNodeClickRef = useRef<{ id: number; time: number } | null>(null);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [feedDismissed, setFeedDismissed] = useState(false);
  const [dockPanel, setDockPanel] = useState<DockPanel>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [chatPrefill, setChatPrefill] = useState<{ bizName: string; msg: string } | null>(null);
  const [taskOpenRequest, setTaskOpenRequest] = useState<{ text: string } | null>(null);
  const feedAutoOpenedRef = useRef(false);
  const lastPolygonHoverRef = useRef(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try { return localStorage.getItem("jarvis-sidebar") !== "closed"; } catch { return true; }
  });
  const [location] = useLocation();
  const { switchRole } = useAuthContext();

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => {
      const next = !prev;
      try { localStorage.setItem("jarvis-sidebar", next ? "open" : "closed"); } catch {}
      return next;
    });
  }, []);

  const isNavActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  const prefersReducedMotion = useMemo(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  []);

  /* Auto-open feed */
  const { data: feedPrecheck } = useGetFeed({}, { query: { queryKey: getGetFeedQueryKey({}), staleTime: 30_000 } });
  useEffect(() => {
    if (feedPrecheck?.length && !feedAutoOpenedRef.current && !feedDismissed) {
      feedAutoOpenedRef.current = true;
      setFeedOpen(true);
    }
  }, [feedPrecheck, feedDismissed]);

  /* Dimension tracking */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const measure = () => {
      if (containerRef.current)
        setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    };
    const onResize = () => { clearTimeout(timer); timer = setTimeout(measure, 150); };
    measure();
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(timer); };
  }, []);

  /* Re-measure globe when sidebar opens/closes (wait for CSS transition to finish) */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current)
        setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    }, 300);
    return () => clearTimeout(timer);
  }, [sidebarOpen]);

  /* Countries GeoJSON */
  useEffect(() => {
    fetch("https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson")
      .then(r => r.json())
      .then(d => setCountries(d.features));
  }, []);

  /* Globe controls */
  useEffect(() => {
    if (!globeEl.current) return;
    const ctrl = globeEl.current.controls();
    ctrl.autoRotate = true;
    ctrl.autoRotateSpeed = 0.4;
    ctrl.enableZoom = true;
    globeEl.current.scene().background = null;
    globeEl.current.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const onVis = () => { if (globeEl.current) globeEl.current.controls().autoRotate = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /* Data */
  const { data: businesses } = useListBusinesses({ query: { queryKey: getListBusinessesQueryKey() } });
  const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats(
    { period: "month" }, { query: { queryKey: getGetDashboardStatsQueryKey({ period: "month" }) } }
  );
  const { data: topBusinesses, isLoading: isLoadingTop } = useGetTopBusinesses(
    { period: "month", limit: 5 }, { query: { queryKey: getGetTopBusinessesQueryKey({ period: "month", limit: 5 }) } }
  );

  const colorMap = useMemo(() => {
    const m = new Map<number, string>();
    businesses?.forEach(b => m.set(b.id, getHealthColor(b.health)));
    return m;
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

  const healthCounts = useMemo(() => {
    const c = { green: 0, yellow: 0, red: 0 };
    businesses?.forEach(b => { if (b.health === "green" || b.health === "yellow" || b.health === "red") c[b.health]++; });
    return c;
  }, [businesses]);

  /* Node click: single tap → SlideOver; double-tap (≤350 ms, same node) → card overlay */
  const handleNodeClick = useCallback((id: number, color: string) => {
    const now = Date.now();
    const last = lastNodeClickRef.current;
    if (last && last.id === id && now - last.time < 350) {
      lastNodeClickRef.current = null;
      setSelectedBusiness(null);
      setCardBusinessId(id);
    } else {
      lastNodeClickRef.current = { id, time: now };
      setSelectedBusiness({ id, color });
    }
  }, []);

  /* Dock panel change — enforce "one focus" */
  const handlePanelChange = useCallback((panel: DockPanel) => {
    setDockPanel(panel);
    if (panel !== null) {
      setFeedOpen(false);
      setFeedDismissed(true);
    }
  }, []);

  /* "Спросить о компании" from BusinessCardOverlay → dock chat with prefill */
  const handleAskChat = useCallback((bizName: string) => {
    setCardBusinessId(null);
    setSelectedBusiness(null);
    setFeedOpen(false);
    setFeedDismissed(true);
    setChatPrefill({ bizName, msg: `Расскажи подробнее о компании «${bizName}»` });
    setDockPanel("chat");
  }, []);

  /* Feed toggle — closes dock */
  const handleFeedToggle = useCallback(() => {
    const next = !feedOpen;
    setFeedOpen(next);
    if (next) { setDockPanel(null); setFeedDismissed(false); } else setFeedDismissed(true);
    setSelectedBusiness(null);
  }, [feedOpen]);

  /* Corners: hide when dock/feed/selection active */
  const cornersVisible = !selectedBusiness && !feedOpen && dockPanel === null;

  /* 2D fallback */
  const Fallback2D = useMemo(() => (
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
                  <div key={i} className="absolute cursor-pointer" style={{ left: x - 8, top: y - 8 }}
                    onClick={() => setSelectedBusiness({ id: p.business.id, color: p.color })}>
                    <div className={p.health === "red" ? "beacon-red" : p.health === "yellow" ? "beacon-yellow" : undefined}
                      style={{ width: 16, height: 16, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #fff 0%, ${p.color} 60%)`, boxShadow: `0 0 12px 5px ${p.color}cc, 0 0 28px 10px ${p.color}55` }} />
                  </div>
                );
              })}
            </>
          );
        })()}
      </div>
    </div>
  ), [dimensions.width, markersData]);

  /* ── Sidebar inner content (shared between desktop + mobile) ── */
  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <>
      <div
        className="h-16 flex items-center justify-between px-5 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2.5">
          <GlobeIcon className="w-5 h-5" style={{ color: "var(--jarvis-accent)" }} />
          <span className="font-bold tracking-widest text-base" style={{ color: "var(--jarvis-text-primary)", fontFamily: HF }}>JARVIS</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-8 h-8 transition-colors"
          style={{ borderRadius: 9, color: "rgba(228,232,255,0.3)", background: "transparent", border: "none", cursor: "pointer" }}
          title="Скрыть панель"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>
      <nav className="flex-1 px-3 py-5 flex flex-col gap-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-3 px-3"
          style={{ color: "rgba(228,232,255,0.3)" }}>Навигация</div>
        {GLOBE_NAV.map((item) => {
          const active = isNavActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="jarvis-btn relative flex items-center gap-3 px-3 font-medium text-sm transition-all duration-150 min-h-[46px]"
              style={{
                borderRadius: 12,
                color: active ? "var(--jarvis-accent)" : "rgba(228,232,255,0.38)",
                background: active ? "rgba(0,60,100,0.32)" : "transparent",
                border: active ? "1px solid rgba(0,212,255,0.20)" : "1px solid transparent",
                fontFamily: HF,
              }}
              onClick={onNav}
            >
              <item.icon className="w-4 h-4 flex-shrink-0"
                style={{ color: active ? "var(--jarvis-accent)" : "rgba(228,232,255,0.3)" }} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 flex flex-col gap-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <button
          onClick={switchRole}
          className="flex items-center gap-3 w-full px-3 text-sm min-h-[46px]"
          style={{ borderRadius: 12, color: "rgba(228,232,255,0.25)", fontFamily: HF, background: "transparent", border: "none", cursor: "pointer" }}
        >
          <RefreshCcw className="w-4 h-4 flex-shrink-0 opacity-40" />
          Сменить роль
        </button>
      </div>
    </>
  );

  return (
    /* ── Root: flex row — sidebar + globe area ── */
    <div
      className="flex h-[100dvh] overflow-hidden"
      style={{
        background: "var(--jarvis-bg-screen)",
        color: "rgba(228,232,255,0.9)",
        fontFamily: HF,
      }}
    >
      {/* ── Desktop sidebar (width transition → pushes content) ── */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 overflow-hidden"
        style={{
          width: sidebarOpen ? 240 : 0,
          transition: "width 280ms cubic-bezier(0.4,0,0.2,1)",
          background: "var(--jarvis-nav-bg)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          borderRight: sidebarOpen ? "1px solid var(--jarvis-nav-border)" : "none",
          zIndex: 20,
        }}
      >
        {/* Fixed-width inner prevents content from reflowing during transition */}
        <div style={{ width: 240, minWidth: 240, height: "100%", display: "flex", flexDirection: "column" }}>
          <SidebarContent />
        </div>
      </aside>

      {/* ── Mobile sidebar (overlay, translate transition) ── */}
      <div className="md:hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40"
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
            opacity: sidebarOpen ? 1 : 0,
            pointerEvents: sidebarOpen ? "auto" : "none",
            transition: "opacity 280ms ease",
          }}
          onClick={toggleSidebar}
        />
        {/* Drawer */}
        <aside
          className="fixed inset-y-0 left-0 z-50 w-60 flex flex-col overflow-hidden"
          style={{
            background: "var(--jarvis-nav-bg)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            borderRight: "1px solid var(--jarvis-nav-border)",
            transition: "transform 280ms cubic-bezier(0.4,0,0.2,1)",
            transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          }}
        >
          <SidebarContent onNav={toggleSidebar} />
        </aside>
      </div>

      {/* ── Globe content area (flex-1, ref for dimension tracking) ── */}
      <div className="relative flex-1 overflow-hidden" ref={containerRef}>

        {/* ── Mobile top bar ── */}
        <div
          className="md:hidden absolute top-0 left-0 right-0 z-10 h-12 flex items-center justify-between px-3 flex-shrink-0"
          style={{
            background: "rgba(4,8,20,0.60)",
            backdropFilter: "blur(16px) saturate(140%)",
            WebkitBackdropFilter: "blur(16px) saturate(140%)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-9 h-9"
            style={{ borderRadius: 10, color: "rgba(228,232,255,0.45)", background: "transparent", border: "none", cursor: "pointer" }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <GlobeIcon className="w-4 h-4" style={{ color: "var(--jarvis-accent)" }} />
            <span className="font-bold tracking-widest text-sm" style={{ color: "rgba(228,232,255,0.88)", fontFamily: HF }}>JARVIS</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#3ed9a0", fontFamily: HF }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#3ed9a0" }} />
            LIVE
          </div>
        </div>

        {/* ── Desktop: sidebar toggle button — only shown when sidebar is CLOSED ── */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="hidden md:flex items-center justify-center absolute z-30"
            style={{
              top: 16, left: 16,
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(0,212,255,0.07)",
              backdropFilter: "blur(14px) saturate(140%)",
              WebkitBackdropFilter: "blur(14px) saturate(140%)",
              border: "1px solid rgba(0,212,255,0.18)",
              color: "rgba(0,212,255,0.65)",
              cursor: "pointer",
              transition: "background 150ms, border-color 150ms, color 150ms",
            }}
            title="Показать панель"
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,255,0.13)";
              (e.currentTarget as HTMLButtonElement).style.color = "#00d4ff";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,255,0.07)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,212,255,0.65)";
            }}
          >
            <PanelLeft className="w-4 h-4" style={{ transform: "scaleX(-1)" }} />
          </button>
        )}

        {/* Ambient glow blobs */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div style={{ position: "absolute", width: "55%", height: "55%", top: "5%", left: "5%", background: "var(--jarvis-blob-1-bg)", animation: "glow-drift 20s ease-in-out infinite alternate", willChange: "transform" }} />
          <div style={{ position: "absolute", width: "48%", height: "48%", top: "8%", right: "2%", background: "var(--jarvis-blob-2-bg)", animation: "glow-drift-r 24s ease-in-out infinite alternate", willChange: "transform" }} />
          <div style={{ position: "absolute", width: "42%", height: "42%", bottom: "5%", right: "12%", background: "var(--jarvis-blob-3-bg)", animation: "glow-drift 28s ease-in-out infinite alternate-reverse", willChange: "transform" }} />
          <div style={{ position: "absolute", width: "38%", height: "38%", bottom: "8%", left: "3%", background: "var(--jarvis-blob-4-bg)", animation: "glow-drift-r 22s ease-in-out infinite alternate-reverse", willChange: "transform" }} />
        </div>

        {/* Star particles */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {([
            { top: "8%",  left: "22%",  size: 1.5 },
            { top: "5%",  left: "71%",  size: 1   },
            { top: "18%", left: "93%",  size: 2   },
            { top: "80%", left: "4%",   size: 1.5 },
            { top: "88%", left: "62%",  size: 1   },
            { top: "52%", left: "89%",  size: 1.5 },
          ] as Array<{top:string;left:string;size:number}>).map((s, i) => (
            <div key={i} style={{ position: "absolute", width: s.size, height: s.size, borderRadius: "50%", background: "var(--jarvis-star-color)", top: s.top, left: s.left, boxShadow: `0 0 ${s.size * 3}px var(--jarvis-star-glow)` }} />
          ))}
        </div>

        {/* Globe */}
        <div className="absolute inset-0 z-1">
          {dimensions.width > 0 && dimensions.height > 0 && (
            <GlobeErrorBoundary fallback={Fallback2D}>
              <Globe
                ref={globeEl}
                width={dimensions.width}
                height={dimensions.height}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                atmosphereColor="rgba(0,180,255,0.7)"
                atmosphereAltitude={0.32}
                polygonsData={countries}
                polygonCapColor={(d: any) => d === hoveredPolygon ? "rgba(0,212,255,0.12)" : "rgba(255,255,255,0.02)"}
                polygonSideColor={() => "rgba(0,100,180,0.04)"}
                polygonStrokeColor={(d: any) => d === hoveredPolygon ? "#00d4ff" : "rgba(0,150,220,0.16)"}
                polygonAltitude={(d: any) => d === hoveredPolygon ? 0.015 : 0.001}
                onPolygonHover={(d: any) => {
                  const now = Date.now();
                  if (now - lastPolygonHoverRef.current > 50) { lastPolygonHoverRef.current = now; setHoveredPolygon(d || null); }
                }}
                polygonsTransitionDuration={200}
                pointsData={markersData}
                pointLat="lat" pointLng="lng" pointAltitude="alt" pointRadius="radius" pointColor="color"
                pointResolution={12} pointsMerge={false}
                onPointClick={(d: any) => handleNodeClick(d.business.id, d.color)}
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
                  el.addEventListener("click", (e) => { e.stopPropagation(); handleNodeClick(d.business.id, d.color); });
                  return el;
                }}
                htmlAltitude={(d: any) => d.alt + 0.005}
              />
            </GlobeErrorBoundary>
          )}
        </div>

        {/* Feed backdrop veil */}
        {feedOpen && !selectedBusiness && (
          <div
            className="absolute inset-0"
            style={{ zIndex: 25, background: "rgba(2,6,14,0.45)", backdropFilter: prefersReducedMotion ? undefined : "blur(3px)", WebkitBackdropFilter: prefersReducedMotion ? undefined : "blur(3px)", cursor: "pointer" }}
            onClick={() => { setFeedOpen(false); setFeedDismissed(true); }}
          />
        )}

        {/* Country tooltip */}
        {hoveredPolygon && !hoveredPoint && !selectedBusiness && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none glass pill"
            style={{ padding: "8px 20px" }}>
            <div className="text-[13px] font-semibold tracking-wide" style={{ color: "rgba(228,232,255,0.85)", fontFamily: HF }}>
              {hoveredPolygon.properties?.NAME || hoveredPolygon.properties?.name || ""}
            </div>
          </div>
        )}

        {/* Point hover tooltip */}
        {hoveredPoint && !selectedBusiness && (
          <div className="hidden md:block absolute z-10 pointer-events-none glass"
            style={{ top: "50%", left: "50%", transform: "translate(20px, -28px)", padding: "12px 18px" }}>
            <div className="font-semibold text-sm" style={{ color: hoveredPoint.color, fontFamily: HF }}>{hoveredPoint.business.name}</div>
            <div className="mt-0.5 text-[12px]" style={{ color: "rgba(228,232,255,0.38)", fontFamily: HF }}>{hoveredPoint.business.city}, {hoveredPoint.business.country}</div>
          </div>
        )}

        {/* ── Top-left: title + health chips ── */}
        <div
          className="absolute top-4 md:top-5 z-10 pointer-events-none"
          style={{
            left: sidebarOpen ? 24 : 58,
            transition: "opacity 300ms ease, left 280ms cubic-bezier(0.4,0,0.2,1)",
            opacity: cornersVisible ? 1 : 0,
          }}
        >
          <h1 className="text-base md:text-xl font-bold leading-none" style={{ color: "rgba(228,232,255,0.90)", fontFamily: HF }}>Глобальный центр</h1>
          <div className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: "hsl(var(--muted-foreground))", fontFamily: HF }}>Командный центр</div>
          {/* Traffic-light chips */}
          <div className="hidden md:flex items-center gap-3 mt-3">
            {(["green", "yellow", "red"] as const).map(h => (
              <div key={h} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: HEALTH_COLORS[h], boxShadow: `0 0 5px 2px ${HEALTH_COLORS[h]}66`, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", fontFamily: HF }}>
                  {healthCounts[h]} {HEALTH_LABELS[h]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Top-center: Лента button ── */}
        <div className="hidden md:flex absolute top-6 left-1/2 -translate-x-1/2 z-10 items-center gap-2">
          <button
            onClick={handleFeedToggle}
            className="flex items-center gap-2 px-4 transition-all hover:scale-105"
            style={{
              height: 36, borderRadius: 999,
              background: feedOpen ? "rgba(239,68,68,0.14)" : "rgba(8,12,24,0.82)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: feedOpen ? "1px solid rgba(239,68,68,0.50)" : "1px solid rgba(255,255,255,0.09)",
              color: feedOpen ? "#ef4444" : "rgba(228,232,255,0.65)",
              fontFamily: HF, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
              transition: "background 200ms, border-color 200ms, color 200ms, transform 200ms",
            }}
          >
            <Newspaper className="w-3.5 h-3.5" /> Лента
          </button>
        </div>

        {/* ── Desktop: top-right compact HUD (revenue + ranking) ── */}
        <div
          className="hidden md:flex absolute top-6 right-6 z-10 flex-col items-end gap-3 pointer-events-auto"
          style={{
            transition: "transform 300ms cubic-bezier(0.4,0,0.2,1), opacity 300ms ease",
            transform: cornersVisible ? "translateX(0)" : "translateX(120%)",
            opacity: cornersVisible ? 1 : 0,
            pointerEvents: cornersVisible ? "auto" : "none",
          }}
        >
          {/* Revenue readout */}
          <div className="glass-panel" style={{ padding: "16px 20px", minWidth: 190 }}>
            <div className="uppercase tracking-widest font-semibold" style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", fontFamily: HF, marginBottom: 8 }}>
              Выручка · 30 дн
            </div>
            {isLoadingStats
              ? <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--jarvis-accent)" }} />
              : <>
                  <div className="tabular-nums" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: "rgba(228,232,255,0.95)", fontFamily: HF }}>
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </div>
                  <div className="inline-flex items-center gap-1 mt-3" style={{ fontSize: 11, fontWeight: 600, color: "#3ed9a0", fontFamily: HF }}>
                    ↑ Активно
                  </div>
                </>
            }
          </div>

          {/* Рейтинг toggle chip */}
          <button
            onClick={() => setRankingOpen(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              height: 30, paddingInline: 14, borderRadius: 999,
              background: rankingOpen ? "rgba(0,212,255,0.14)" : "rgba(255,255,255,0.06)",
              border: rankingOpen ? "1px solid rgba(0,212,255,0.45)" : "1px solid rgba(255,255,255,0.10)",
              color: rankingOpen ? "var(--jarvis-accent)" : "rgba(228,232,255,0.45)",
              fontFamily: HF, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
              cursor: "pointer", backdropFilter: "blur(12px)",
              transition: "background 200ms, border-color 200ms, color 200ms",
            }}
          >
            <Zap className="w-3 h-3" />
            Рейтинг
          </button>

          {/* Top nodes slide-down */}
          {rankingOpen && (
            <div className="glass" style={{ padding: "16px 20px", width: 248 }}>
              <div className="uppercase tracking-widest font-semibold mb-3" style={{ fontSize: 10, color: "rgba(228,232,255,0.30)", fontFamily: HF }}>
                Топ узлов
              </div>
              {isLoadingTop
                ? <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--jarvis-accent)" }} />
                : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {topBusinesses?.map(b => {
                      const bColor = colorMap.get(b.id) ?? "#3ed9a0";
                      return (
                        <div key={b.id}
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", minHeight: 40, borderRadius: 10, padding: "0 6px", margin: "0 -6px", transition: "background 150ms" }}
                          onClick={() => { setSelectedBusiness({ id: b.id, color: bColor }); setRankingOpen(false); }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: bColor, boxShadow: `0 0 5px 2px ${bColor}55` }} />
                            <span style={{ color: "rgba(228,232,255,0.60)", fontSize: 13, fontFamily: HF, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
                          </div>
                          <span style={{ color: "rgba(228,232,255,0.32)", fontSize: 11, fontFamily: HF, marginLeft: 8, flexShrink: 0 }}>{formatCurrency(b.revenue)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          )}
        </div>

        {/* ── Desktop: bottom-left currency stub ── */}
        <div
          className="hidden md:block absolute left-6 z-10 pointer-events-none"
          style={{
            bottom: 24,
            transition: "transform 300ms cubic-bezier(0.4,0,0.2,1), opacity 300ms ease",
            opacity: cornersVisible ? 1 : 0,
            transform: cornersVisible ? "translateX(0)" : "translateX(-120%)",
          }}
        >
          <div className="glass-panel" style={{ padding: "12px 16px" }}>
            <div className="uppercase tracking-widest font-semibold mb-2" style={{ fontSize: 9, color: "hsl(var(--muted-foreground))", fontFamily: HF }}>
              Валюты · Ключевое
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {([["USD/EUR", "0.924"], ["USD/RUB", "89.4"], ["BTC", "$67 240"]] as const).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 22 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontFamily: HF }}>{k}</span>
                  <span style={{ fontSize: 11, color: "#ffffff", fontFamily: HF, fontVariantNumeric: "tabular-nums" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Mobile: revenue badge + collapsible nodes ── */}
        {!selectedBusiness && (
          <div className="md:hidden absolute top-14 right-3 z-10 pointer-events-auto flex flex-col items-end gap-2">
            <div className="glass-panel text-right" style={{ padding: "12px 16px" }}>
              <div className="uppercase tracking-widest font-semibold" style={{ fontSize: 9, color: "hsl(var(--muted-foreground))", fontFamily: HF }}>Выручка 30Д</div>
              <div className="tabular-nums mt-0.5" style={{ fontSize: 14, fontWeight: 700, color: "rgba(228,232,255,0.90)", fontFamily: HF }}>
                {isLoadingStats ? "…" : formatCurrency(stats?.totalRevenue || 0)}
              </div>
            </div>
            <div className="glass flex items-center gap-3" style={{ padding: "8px 12px" }}>
              {(["green", "yellow", "red"] as const).map(h => (
                <div key={h} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: HEALTH_COLORS[h], boxShadow: `0 0 5px 2px ${HEALTH_COLORS[h]}55` }} />
                  <span style={{ color: "rgba(228,232,255,0.55)", fontSize: 12, fontFamily: HF }}>{healthCounts[h]}</span>
                </div>
              ))}
            </div>
            <div className="glass overflow-hidden w-44">
              <button className="w-full flex items-center justify-between px-3 min-h-[48px] text-left" onClick={() => setStatsOpen(v => !v)}>
                <span className="uppercase tracking-widest font-semibold" style={{ fontSize: 10, color: "rgba(228,232,255,0.35)", fontFamily: HF }}>Узлы</span>
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
                        <span style={{ color: "rgba(228,232,255,0.55)", fontSize: 12, fontFamily: HF, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name.split(" ").slice(0, 2).join(" ")}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* News feed overlay */}
        {feedOpen && !selectedBusiness && (
          <NewsFeedOverlay
            onClose={() => { setFeedOpen(false); setFeedDismissed(true); }}
            onSelectBusiness={(id) => {
              const bColor = colorMap.get(id) ?? "#3ed9a0";
              setSelectedBusiness({ id, color: bColor });
              setFeedOpen(false);
            }}
            onOpenTask={(text) => {
              setFeedOpen(false);
              setTaskOpenRequest({ text });
            }}
          />
        )}

        {/* ── Bottom dock ── */}
        {!selectedBusiness && (
          <BottomDock
            activePanel={dockPanel}
            onPanelChange={handlePanelChange}
            chatPrefill={chatPrefill}
            onChatPrefillConsumed={() => setChatPrefill(null)}
            taskOpenRequest={taskOpenRequest}
            onTaskOpenConsumed={() => setTaskOpenRequest(null)}
          />
        )}

        {/* ── Corner menu ── */}

        {/* Slide-over / bottom sheet */}
        {selectedBusiness && !cardBusinessId && (
          <BusinessSlideOver
            businessId={selectedBusiness.id}
            color={selectedBusiness.color}
            onClose={() => setSelectedBusiness(null)}
            onOpenCard={() => setCardBusinessId(selectedBusiness.id)}
          />
        )}

        {/* Full-screen deep card overlay */}
        {cardBusinessId !== null && (
          <BusinessCardOverlay
            businessId={cardBusinessId}
            onClose={() => { setCardBusinessId(null); setSelectedBusiness(null); }}
            onAskChat={handleAskChat}
          />
        )}

        {/* ── AI FAB button (bottom-right) ── */}
        {!selectedBusiness && !cardBusinessId && (
          <button
            onClick={() => setAiPanelOpen(v => !v)}
            className="hidden md:flex items-center justify-center fixed z-50 transition-all duration-200"
            style={{
              bottom: 28,
              right: 28,
              width: 40,
              height: 40,
              borderRadius: 12,
              background: aiPanelOpen
                ? "rgba(0,212,255,0.18)"
                : "rgba(4,8,20,0.90)",
              backdropFilter: "blur(16px) saturate(160%)",
              WebkitBackdropFilter: "blur(16px) saturate(160%)",
              border: aiPanelOpen
                ? "1px solid rgba(0,212,255,0.50)"
                : "1px solid rgba(0,212,255,0.22)",
              color: aiPanelOpen ? "var(--jarvis-accent)" : "rgba(0,212,255,0.75)",
              boxShadow: aiPanelOpen
                ? "0 0 20px rgba(0,212,255,0.22), 0 4px 16px rgba(0,0,0,0.4)"
                : "0 4px 16px rgba(0,0,0,0.4)",
              cursor: "pointer",
            }}
            title={aiPanelOpen ? "Закрыть AI" : "Открыть AI ассистент"}
            onMouseEnter={e => {
              if (!aiPanelOpen) {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,255,0.12)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--jarvis-accent)";
              }
            }}
            onMouseLeave={e => {
              if (!aiPanelOpen) {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(4,8,20,0.90)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,212,255,0.75)";
              }
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: HF, letterSpacing: "0.04em" }}>AI</span>
          </button>
        )}
      </div>

      {/* AI Chat side panel — outside overflow-hidden container so slide works */}
      <AIChatSidePanel open={aiPanelOpen} onClose={() => setAiPanelOpen(false)} />
    </div>
  );
}
