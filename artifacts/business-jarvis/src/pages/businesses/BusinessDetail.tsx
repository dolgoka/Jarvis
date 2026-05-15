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

  const { data: business, isLoading: isLoadingBusiness } = useGetBusiness(businessId, { query: { enabled: !!businessId, queryKey: getGetBusinessQueryKey(businessId) }});
  const { data: reports, isLoading: isLoadingReports } = useListReports({ businessId, period }, { query: { enabled: !!businessId, queryKey: getListReportsQueryKey({ businessId, period }) }});

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

  // Match static company data by name (fuzzy: check if business name contains or matches the static name)
  const staticCompany = companies.find(c =>
    business.name.toLowerCase().includes(c.name.split(' ')[0].toLowerCase()) ||
    c.name.toLowerCase().includes(business.name.split(' ')[0].toLowerCase())
  );

  const companyEmployees = staticCompany
    ? employees.filter(e => e.company_id === staticCompany.id)
    : [];

  const departments = companyEmployees.length > 0
    ? ["all", ...Array.from(new Set(companyEmployees.map(e => e.department)))]
    : [];

  const filteredEmployees = deptFilter === "all"
    ? companyEmployees
    : companyEmployees.filter(e => e.department === deptFilter);

  const highPotential = companyEmployees.filter(e => e.potential === "high").length;
  const relocationReady = companyEmployees.filter(e => e.relocation_ready).length;

  return (
    <Shell>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-primary/20 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`w-3 h-3 rounded-full ${business.status === 'active' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : business.status === 'pending' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-red-500'} animate-pulse`}></span>
              <h1 className="text-4xl font-light text-white tracking-tight uppercase">{business.name}</h1>
            </div>
            <div className="flex flex-wrap gap-4 text-muted-foreground font-mono text-sm">
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {business.city}, {business.country}</span>
              <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> {business.industry}</span>
              <span className="flex items-center gap-2"><User className="w-4 h-4" /> {business.managerName}</span>
            </div>
            {business.description && (
              <p className="text-muted-foreground text-sm mt-2 max-w-2xl">{business.description}</p>
            )}
          </div>

          <Select value={period} onValueChange={(val: ListReportsPeriod) => setPeriod(val)}>
            <SelectTrigger className="w-32 bg-black/40 border-primary/20 text-white font-mono uppercase text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="Revenue" value={reports?.length ? formatCurrency(reports[0].revenue) : "$0.00"} icon={Activity} />
          <MetricCard title="Profit" value={reports?.length ? formatCurrency(reports[0].profit) : "$0.00"} icon={TrendingUp} />
          <MetricCard title="Volume" value={reports?.length ? formatNumber(reports[0].orders) : "0"} icon={Activity} />
        </div>

        {/* Static company enriched data */}
        {staticCompany && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Summary */}
            <Card className="lg:col-span-2 bg-black/40 border-primary/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-primary font-mono text-sm tracking-widest uppercase flex items-center gap-2">
                  <Brain className="w-4 h-4" /> AI Intelligence Brief
                </CardTitle>
              </CardHeader>
              <CardContent className="text-white/70 text-sm leading-relaxed">
                {staticCompany.ai_summary}
              </CardContent>
            </Card>

            {/* Key Stats */}
            <Card className="bg-black/40 border-primary/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-primary font-mono text-sm tracking-widest uppercase flex items-center gap-2">
                  <Award className="w-4 h-4" /> Company Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-mono uppercase text-xs">Founded</span>
                  <span className="text-white font-mono">{staticCompany.metrics.founded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-mono uppercase text-xs">Headcount</span>
                  <span className="text-white font-mono">{staticCompany.metrics.employees_total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-mono uppercase text-xs">Status</span>
                  <Badge variant="outline" className={`text-xs ${staticCompany.status === 'profit' ? 'border-green-500/50 text-green-400' : staticCompany.status === 'warning' ? 'border-yellow-500/50 text-yellow-400' : 'border-red-500/50 text-red-400'}`}>
                    {staticCompany.status.toUpperCase()}
                  </Badge>
                </div>
                {staticCompany.metrics.revenue && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-mono uppercase text-xs">Revenue</span>
                    <span className="text-white font-mono text-xs">{staticCompany.metrics.revenue}</span>
                  </div>
                )}
                {staticCompany.metrics.margin && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-mono uppercase text-xs">Margin</span>
                    <span className="text-white font-mono text-xs">{staticCompany.metrics.margin}</span>
                  </div>
                )}
                {companyEmployees.length > 0 && (
                  <>
                    <div className="border-t border-primary/10 pt-3 mt-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-mono uppercase text-xs">High Potential</span>
                        <span className="text-yellow-400 font-mono">{highPotential} / {companyEmployees.length}</span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-muted-foreground font-mono uppercase text-xs">Relocation Ready</span>
                        <span className="text-cyan-400 font-mono">{relocationReady}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* KPIs */}
        {staticCompany && staticCompany.kpis && staticCompany.kpis.length > 0 && (
          <Card className="bg-black/40 border-primary/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-primary font-mono text-sm tracking-widest uppercase">Key Performance Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {staticCompany.kpis.map((kpi, i) => (
                  <div key={i} className="bg-black/30 border border-primary/10 rounded-lg p-4">
                    <p className="text-xs font-mono text-primary/60 uppercase tracking-wider mb-1">{kpi.label}</p>
                    <p className="text-xl font-light text-white">{kpi.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leadership */}
        {staticCompany && staticCompany.leadership && staticCompany.leadership.length > 0 && (
          <Card className="bg-black/40 border-primary/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-primary font-mono text-sm tracking-widest uppercase flex items-center gap-2">
                <Globe2 className="w-4 h-4" /> Leadership
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {staticCompany.leadership.map((leader, i) => (
                  <div key={i} className="flex items-center gap-3 bg-black/30 border border-primary/10 rounded-lg p-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-mono font-bold text-sm flex-shrink-0">
                      {leader.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{leader.name}</p>
                      <p className="text-muted-foreground text-xs truncate">{leader.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Clients / Tech Stack */}
        {staticCompany && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {staticCompany.key_clients && staticCompany.key_clients.length > 0 && (
              <Card className="bg-black/40 border-primary/20 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-primary font-mono text-sm tracking-widest uppercase">Key Clients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {staticCompany.key_clients.map((client, i) => (
                      <Badge key={i} variant="outline" className="border-primary/20 text-white/60 text-xs">
                        {client}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {staticCompany.technology_stack && staticCompany.technology_stack.length > 0 && (
              <Card className="bg-black/40 border-primary/20 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-primary font-mono text-sm tracking-widest uppercase">Technology Stack</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {staticCompany.technology_stack.map((tech, i) => (
                      <Badge key={i} variant="outline" className="border-cyan-500/20 text-cyan-400/70 text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Chart */}
        <Card className="bg-black/40 border-primary/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-primary font-mono text-sm tracking-widest uppercase">Telemetry Stream: Revenue & Profit</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {isLoadingReports ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : reports?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...reports].reverse()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 212, 255, 0.1)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'monospace' }} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                  <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'monospace' }} tickFormatter={(val) => `$${val/1000}k`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '4px' }} itemStyle={{ fontFamily: 'monospace' }} labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: '8px', fontFamily: 'monospace' }} formatter={(value: number) => [formatCurrency(value), '']} />
                  <Line type="monotone" dataKey="revenue" stroke="#00d4ff" strokeWidth={2} dot={{ fill: '#00d4ff', r: 4 }} activeDot={{ r: 6, fill: '#fff' }} />
                  <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} activeDot={{ r: 6, fill: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground font-mono">NO TELEMETRY RECORDED</div>
            )}
          </CardContent>
        </Card>

        {/* Employee Roster */}
        {companyEmployees.length > 0 && (
          <Card className="bg-black/40 border-primary/20 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-primary font-mono text-sm tracking-widest uppercase flex items-center gap-2">
                  <Users className="w-4 h-4" /> Personnel Roster — {companyEmployees.length} Agents
                </CardTitle>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-48 bg-black/40 border-primary/20 text-white font-mono text-xs">
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

function EmployeeRow({ employee: emp, isExpanded, onToggle }: { employee: Employee; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="cursor-pointer hover:bg-primary/5 transition-colors" onClick={onToggle}>
      <div className="px-6 py-4 flex items-center gap-4">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 font-mono ${emp.potential === 'high' ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-400' : emp.potential === 'medium' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-white/5 border border-white/10 text-white/40'}`}>
          {emp.photo_initials}
        </div>

        {/* Name & role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-medium text-sm">{emp.name}</span>
            {emp.is_department_head && <Badge variant="outline" className="border-primary/30 text-primary text-[10px] px-1.5 py-0">HEAD</Badge>}
            {emp.relocation_ready && <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px] px-1.5 py-0">MOBILE</Badge>}
            {emp.potential === 'high' && <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-[10px] px-1.5 py-0"><Star className="w-2.5 h-2.5 mr-1" />HIGH POT</Badge>}
          </div>
          <div className="text-muted-foreground text-xs mt-0.5 font-mono">{emp.role} · {emp.department}</div>
        </div>

        {/* Right info */}
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

        <div className="text-muted-foreground flex-shrink-0">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-6 pb-5 space-y-4 border-t border-primary/10 bg-black/20" onClick={e => e.stopPropagation()}>
          {/* AI Profile */}
          <div className="pt-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-primary/60 mb-2 flex items-center gap-1.5">
              <Brain className="w-3 h-3" /> AI Profile
            </div>
            <p className="text-white/70 text-sm leading-relaxed">{emp.ai_profile}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Languages */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-2">Languages</div>
              <div className="flex flex-wrap gap-1">
                {emp.languages.map((lang, i) => (
                  <Badge key={i} variant="outline" className="border-white/10 text-white/50 text-[10px] px-1.5 py-0">{lang}</Badge>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-2">Skills</div>
              <div className="flex flex-wrap gap-1">
                {emp.skills.map((skill, i) => (
                  <Badge key={i} variant="outline" className="border-primary/15 text-primary/60 text-[10px] px-1.5 py-0">{skill}</Badge>
                ))}
              </div>
            </div>

            {/* Education */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-2">Education</div>
              <p className="text-white/60">{emp.education}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon }: { title: string, value: string, icon: any }) {
  return (
    <Card className="bg-black/60 border-primary/30 backdrop-blur-md relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary shadow-[0_0_10px_rgba(0,212,255,1)] transition-colors"></div>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-mono text-primary/70 uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-light text-white tracking-tight">{value}</p>
          </div>
          <Icon className="w-5 h-5 text-primary/50" />
        </div>
      </CardContent>
    </Card>
  );
}
