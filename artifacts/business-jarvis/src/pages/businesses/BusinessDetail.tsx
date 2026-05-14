import { useState } from "react";
import { useRoute } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useGetBusiness, getGetBusinessQueryKey, useListReports, getListReportsQueryKey, ListReportsPeriod } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Activity, User, MapPin, Building2, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function BusinessDetail() {
  const [, params] = useRoute("/businesses/:id");
  const businessId = parseInt(params?.id || "0");
  
  const [period, setPeriod] = useState<ListReportsPeriod>('week');
  
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

  return (
    <Shell>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-primary/20 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`w-3 h-3 rounded-full ${business.status === 'active' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'} animate-pulse`}></span>
              <h1 className="text-4xl font-light text-white tracking-tight uppercase">{business.name}</h1>
            </div>
            <div className="flex gap-6 text-muted-foreground font-mono text-sm">
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {business.city}, {business.country}</span>
              <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> {business.industry}</span>
              <span className="flex items-center gap-2"><User className="w-4 h-4" /> {business.managerName}</span>
            </div>
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
          <MetricCard 
            title="Revenue" 
            value={reports?.length ? formatCurrency(reports[0].revenue) : "$0.00"} 
            icon={Activity}
          />
          <MetricCard 
            title="Profit Margin" 
            value={reports?.length ? formatCurrency(reports[0].profit) : "$0.00"} 
            icon={Activity}
          />
          <MetricCard 
            title="Volume" 
            value={reports?.length ? formatNumber(reports[0].orders) : "0"} 
            icon={Activity}
          />
        </div>

        {/* Chart */}
        <Card className="bg-black/40 border-primary/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-primary font-mono text-sm tracking-widest uppercase">Telemetry Stream: Revenue & Profit</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            {isLoadingReports ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : reports?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...reports].reverse()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 212, 255, 0.1)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.3)" 
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'monospace' }} 
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.3)" 
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'monospace' }}
                    tickFormatter={(val) => `$${val/1000}k`}
                  />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '4px' }}
                    itemStyle={{ fontFamily: 'monospace' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: '8px', fontFamily: 'monospace' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#00d4ff" strokeWidth={2} dot={{ fill: '#00d4ff', r: 4 }} activeDot={{ r: 6, fill: '#fff' }} />
                  <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} activeDot={{ r: 6, fill: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground font-mono">NO TELEMETRY RECORDED</div>
            )}
          </CardContent>
        </Card>
      </div>
    </Shell>
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
