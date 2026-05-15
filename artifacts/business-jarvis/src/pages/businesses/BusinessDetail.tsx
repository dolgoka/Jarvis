import { useState } from "react";
import { useRoute } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useGetBusiness, getGetBusinessQueryKey, useListReports, getListReportsQueryKey, ListReportsPeriod } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, User, MapPin, Building2, Star, Globe2, Brain, Users, ChevronDown, ChevronUp, TrendingUp, Award } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { companies } from "@/data/companies";
import { employees, type Employee } from "@/data/employees";

export default function BusinessDetail() {
  const [, params] = useRoute("/businesses/:id");
  const businessId = parseInt(params?.id || "0");
  const [period, setPeriod] = useState<ListReportsPeriod>('week');
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const { data: business, isLoading: isLoadingBusiness } = useGetBusiness(businessId, { query: { enabled: !!businessId, queryKey: getGetBusinessQueryKey(businessId) } });
  const { data: reports, isLoading: isLoadingReports } = useListReports({ businessId, period }, { query: { enabled: !!businessId, queryKey: getListReportsQueryKey({ businessId, period }) } });

  if (isLoadingBusiness) {
    return (
      <Shell>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (!business) {
    return (
      <Shell>
        <div className="p-8 text-center text-muted-foreground font-mono">Node Not Found</div>
      </Shell>
    );
  }

  const staticCompany = companies.find(c =>
    business.name.toLowerCase().includes(c.name.split(' ')[0].toLowerCase()) ||
    c.name.toLowerCase().includes(business.name.split(' ')[0].toLowerCase())
  );

  const companyEmployees = staticCompany ? employees.filter(e => e.company_id === staticCompany.id) : [];
  const departments = companyEmployees.length > 0
    ? ["all", ...Array.from(new Set(companyEmployees.map(e => e.department)))]
    : [];
  const filteredEmployees = deptFilter === "all" ? companyEmployees : companyEmployees.filter(e => e.department === deptFilter);
  const highPotential = companyEmployees.filter(e => e.potential === "high").length;
  const relocationReady = companyEmployees.filter(e => e.relocation_ready).length;

  return (
    <Shell>
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">

        {/* ── Header ── */}
        <div className="border-b border-primary/20 pb-4 md:pb-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-start gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                business.status === 'active' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                business.status === 'pending' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-red-500'
              } animate-pulse`} />
              <h1 className="text-2xl md:text-4xl font-light text-white tracking-tight uppercase leading-tight">{business.name}</h1>
            </div>
            <Select value={period} onValueChange={(val: ListReportsPeriod) => setPeriod(val)}>
              <SelectTrigger className="w-24 md:w-32 bg-black/40 border-primary/20 text-white font-mono uppercase text-xs flex-shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground font-mono text-xs md:text-sm pl-4 md:pl-0">
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {business.city}, {business.country}</span>
            <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {business.industry}</span>
            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {business.managerName}</span>
          </div>

          {business.description && (
            <p className="text-muted-foreground text-xs md:text-sm mt-2 pl-4 md:pl-0 max-w-2xl">{business.description}</p>
          )}
        </div>

        {/* ── Metrics ── */}
        <div className="grid grid-cols-3 gap-2 md:gap-6">
          <MetricCard title="Revenue" value={reports?.length ? formatCurrency(reports[0].revenue) : "$0"} icon={Activity} />
          <MetricCard title="Profit" value={reports?.length ? formatCurrency(reports[0].profit) : "$0"} icon={TrendingUp} />
          <MetricCard title="Volume" value={reports?.length ? formatNumber(reports[0].orders) : "0"} icon={Activity} />
        </div>

        {/* ── Static company data ── */}
        {staticCompany && (
          <>
            {/* AI Summary + Company Profile */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <Card className="md:col-span-2 bg-black/40 border-primary/20 backdrop-blur-sm">
                <CardHeader className="pb-2 md:pb-4">
                  <CardTitle className="text-primary font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                    <Brain className="w-3.5 h-3.5" /> AI Intelligence Brief
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-white/70 text-xs md:text-sm leading-relaxed">
                  {staticCompany.ai_summary}
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-primary/20 backdrop-blur-sm">
                <CardHeader className="pb-2 md:pb-4">
                  <CardTitle className="text-primary font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                    <Award className="w-3.5 h-3.5" /> Company Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 md:space-y-3 text-xs md:text-sm">
                  <StatRow label="Founded" value={staticCompany.metrics.founded} />
                  <StatRow label="Headcount" value={staticCompany.metrics.employees_total.toLocaleString()} />
                  <StatRow label="Status" value={
                    <Badge variant="outline" className={`text-xs ${staticCompany.status === 'profit' ? 'border-green-500/50 text-green-400' : staticCompany.status === 'warning' ? 'border-yellow-500/50 text-yellow-400' : 'border-red-500/50 text-red-400'}`}>
                      {staticCompany.status.toUpperCase()}
                    </Badge>
                  } />
                  {staticCompany.metrics.revenue && <StatRow label="Revenue" value={staticCompany.metrics.revenue} />}
                  {staticCompany.metrics.margin && <StatRow label="Margin" value={staticCompany.metrics.margin} />}
                  {companyEmployees.length > 0 && (
                    <div className="border-t border-primary/10 pt-2 md:pt-3 space-y-2">
                      <StatRow label="High Potential" value={<span className="text-yellow-400">{highPotential} / {companyEmployees.length}</span>} />
                      <StatRow label="Relocation Ready" value={<span className="text-cyan-400">{relocationReady}</span>} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* KPIs */}
            {staticCompany.kpis && staticCompany.kpis.length > 0 && (
              <Card className="bg-black/40 border-primary/20 backdrop-blur-sm">
                <CardHeader className="pb-2 md:pb-4">
                  <CardTitle className="text-primary font-mono text-xs tracking-widest uppercase">Key Performance Indicators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                    {staticCompany.kpis.map((kpi, i) => (
                      <div key={i} className="bg-black/30 border border-primary/10 rounded-lg p-3 md:p-4">
                        <p className="text-[10px] md:text-xs font-mono text-primary/60 uppercase tracking-wider mb-1">{kpi.label}</p>
                        <p className="text-lg md:text-xl font-light text-white">{kpi.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Leadership */}
            {staticCompany.leadership && staticCompany.leadership.length > 0 && (
              <Card className="bg-black/40 border-primary/20 backdrop-blur-sm">
                <CardHeader className="pb-2 md:pb-4">
                  <CardTitle className="text-primary font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                    <Globe2 className="w-3.5 h-3.5" /> Leadership
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                    {staticCompany.leadership.map((leader, i) => (
                      <div key={i} className="flex items-center gap-3 bg-black/30 border border-primary/10 rounded-lg p-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-mono font-bold text-xs md:text-sm flex-shrink-0">
                          {leader.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-xs md:text-sm font-medium truncate">{leader.name}</p>
                          <p className="text-muted-foreground text-[11px] truncate">{leader.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Clients + Tech Stack */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {staticCompany.key_clients && staticCompany.key_clients.length > 0 && (
                <Card className="bg-black/40 border-primary/20 backdrop-blur-sm">
                  <CardHeader className="pb-2 md:pb-4">
                    <CardTitle className="text-primary font-mono text-xs tracking-widest uppercase">Key Clients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {staticCompany.key_clients.map((client, i) => (
                        <Badge key={i} variant="outline" className="border-primary/20 text-white/60 text-[10px] md:text-xs">{client}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {staticCompany.technology_stack && staticCompany.technology_stack.length > 0 && (
                <Card className="bg-black/40 border-primary/20 backdrop-blur-sm">
                  <CardHeader className="pb-2 md:pb-4">
                    <CardTitle className="text-primary font-mono text-xs tracking-widest uppercase">Technology Stack</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {staticCompany.technology_stack.map((tech, i) => (
                        <Badge key={i} variant="outline" className="border-cyan-500/20 text-cyan-400/70 text-[10px] md:text-xs">{tech}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}

        {/* ── Telemetry Chart ── */}
        <Card className="bg-black/40 border-primary/20 backdrop-blur-sm">
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-primary font-mono text-xs tracking-widest uppercase">Telemetry Stream: Revenue & Profit</CardTitle>
          </CardHeader>
          <CardContent className="h-[220px] md:h-[320px] px-2 md:px-6">
            {isLoadingReports ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : reports?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...reports].reverse()} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.1)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                  <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(val) => `$${val / 1000}k`} width={42} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '4px', fontSize: 12 }}
                    itemStyle={{ fontFamily: 'monospace' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: '4px', fontFamily: 'monospace' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#00d4ff" strokeWidth={2} dot={{ fill: '#00d4ff', r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground font-mono text-xs">NO TELEMETRY RECORDED</div>
            )}
          </CardContent>
        </Card>

        {/* ── Employee Roster ── */}
        {companyEmployees.length > 0 && (
          <Card className="bg-black/40 border-primary/20 backdrop-blur-sm">
            <CardHeader className="pb-2 md:pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-primary font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> Personnel Roster — {companyEmployees.length} Agents
                </CardTitle>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-full sm:w-44 bg-black/40 border-primary/20 text-white font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d} value={d}>{d === "all" ? "All Departments" : d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-primary/10">
                {filteredEmployees.map((emp) => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    isExpanded={expandedEmployee === emp.id}
                    onToggle={() => setExpandedEmployee(expandedEmployee === emp.id ? null : emp.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Shell>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-muted-foreground font-mono uppercase text-[10px] md:text-xs">{label}</span>
      <span className="text-white font-mono text-xs md:text-sm text-right">{value}</span>
    </div>
  );
}

function EmployeeRow({ employee: emp, isExpanded, onToggle }: { employee: Employee; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="cursor-pointer hover:bg-primary/5 active:bg-primary/8 transition-colors" onClick={onToggle}>
      <div className="px-3 md:px-6 py-3 md:py-4 flex items-center gap-3">
        {/* Avatar */}
        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold flex-shrink-0 font-mono ${
          emp.potential === 'high' ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-400' :
          emp.potential === 'medium' ? 'bg-primary/10 border border-primary/20 text-primary' :
          'bg-white/5 border border-white/10 text-white/40'
        }`}>
          {emp.photo_initials}
        </div>

        {/* Name & role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-white font-medium text-xs md:text-sm">{emp.name}</span>
            {emp.is_department_head && (
              <Badge variant="outline" className="border-primary/30 text-primary text-[9px] md:text-[10px] px-1 py-0">HEAD</Badge>
            )}
            {emp.potential === 'high' && (
              <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-[9px] md:text-[10px] px-1 py-0">
                <Star className="w-2 h-2 mr-0.5" />HIGH
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground text-[10px] md:text-xs mt-0.5 font-mono truncate">{emp.role} · {emp.department}</div>
        </div>

        {/* Desktop-only rating + band */}
        <div className="hidden md:flex items-center gap-6 text-xs font-mono text-muted-foreground flex-shrink-0">
          <span className="text-center">
            <div className="text-white/30 uppercase text-[10px] mb-0.5">Since</div>
            <div>{emp.since}</div>
          </span>
          <span className="text-center">
            <div className="text-white/30 uppercase text-[10px] mb-0.5">Rating</div>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <div key={s} className={`w-1.5 h-1.5 rounded-full ${s <= emp.performance_rating ? 'bg-primary' : 'bg-white/10'}`} />
              ))}
            </div>
          </span>
          <span className="text-center">
            <div className="text-white/30 uppercase text-[10px] mb-0.5">Band</div>
            <div className="text-white">{emp.salary_band}</div>
          </span>
        </div>

        {/* Mobile: performance dots only */}
        <div className="md:hidden flex gap-0.5 flex-shrink-0">
          {[1,2,3,4,5].map(s => (
            <div key={s} className={`w-1.5 h-1.5 rounded-full ${s <= emp.performance_rating ? 'bg-primary' : 'bg-white/10'}`} />
          ))}
        </div>

        <div className="text-muted-foreground flex-shrink-0 ml-1">
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4" />}
        </div>
      </div>

      {/* Expanded */}
      {isExpanded && (
        <div className="px-3 md:px-6 pb-4 space-y-3 md:space-y-4 border-t border-primary/10 bg-black/20" onClick={e => e.stopPropagation()}>
          <div className="pt-3 md:pt-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-primary/60 mb-1.5 flex items-center gap-1.5">
              <Brain className="w-3 h-3" /> AI Profile
            </div>
            <p className="text-white/70 text-xs md:text-sm leading-relaxed">{emp.ai_profile}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 text-xs">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-1.5">Languages</div>
              <div className="flex flex-wrap gap-1">
                {emp.languages.map((lang, i) => (
                  <Badge key={i} variant="outline" className="border-white/10 text-white/50 text-[10px] px-1.5 py-0">{lang}</Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-1.5">Skills</div>
              <div className="flex flex-wrap gap-1">
                {emp.skills.map((skill, i) => (
                  <Badge key={i} variant="outline" className="border-primary/15 text-primary/60 text-[10px] px-1.5 py-0">{skill}</Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-1.5">Education</div>
              <p className="text-white/60 text-[11px]">{emp.education}</p>
              <div className="mt-1.5 flex gap-3 text-[10px] font-mono text-white/40">
                <span>Since {emp.since}</span>
                <span>Band {emp.salary_band}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon }: { title: string; value: string; icon: any }) {
  return (
    <Card className="bg-black/60 border-primary/30 backdrop-blur-md relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors" style={{ boxShadow: '0 0 10px rgba(0,212,255,0.6)' }} />
      <CardContent className="p-3 md:p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1 md:space-y-2 min-w-0">
            <p className="text-[10px] md:text-xs font-mono text-primary/70 uppercase tracking-wider">{title}</p>
            <p className="text-lg md:text-3xl font-light text-white tracking-tight truncate">{value}</p>
          </div>
          <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary/50 flex-shrink-0 mt-0.5 ml-1" />
        </div>
      </CardContent>
    </Card>
  );
}
