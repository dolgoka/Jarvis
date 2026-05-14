import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetAiSummary, getGetAiSummaryQueryKey, GetAiSummaryPeriod } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Sparkles, Loader2 } from "lucide-react";

export default function AiSummary() {
  const [period, setPeriod] = useState<GetAiSummaryPeriod>('month');
  const { data: summary, isLoading } = useGetAiSummary({ period }, { query: { queryKey: getGetAiSummaryQueryKey({ period }) }});

  return (
    <Shell>
      <div className="p-8 space-y-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-light text-white tracking-tight uppercase flex items-center gap-3">
              <Brain className="w-8 h-8 text-primary" />
              Strategic AI Briefing
            </h1>
            <p className="text-muted-foreground mt-1">Dry distillation of global network telemetry.</p>
          </div>
          <Select value={period} onValueChange={(val: GetAiSummaryPeriod) => setPeriod(val)}>
            <SelectTrigger className="w-32 bg-black/40 border-primary/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">24 Hours</SelectItem>
              <SelectItem value="week">7 Days</SelectItem>
              <SelectItem value="month">30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
              <Loader2 className="w-12 h-12 animate-spin text-primary relative z-10" />
            </div>
            <div className="text-primary font-mono text-sm tracking-widest animate-pulse">SYNTHESIZING TELEMETRY...</div>
          </div>
        ) : summary ? (
          <div className="space-y-6">
            <Card className="bg-black/60 border-primary/30 backdrop-blur-md shadow-[0_0_30px_rgba(0,212,255,0.05)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 shadow-[0_0_10px_rgba(0,212,255,1)]"></div>
              <CardHeader>
                <CardTitle className="text-primary font-mono text-sm tracking-widest uppercase flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Executive Synthesis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed text-white/90 font-light">
                  {summary.summary}
                </p>
                <div className="mt-6 pt-4 border-t border-primary/10 text-xs text-muted-foreground font-mono">
                  GENERATED AT: {new Date(summary.generatedAt).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {summary.highlights.map((highlight, idx) => (
                <Card key={idx} className="bg-black/40 border-primary/20 backdrop-blur-sm hover:bg-black/60 transition-colors">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="mt-1 text-primary font-mono">{(idx + 1).toString().padStart(2, '0')}</div>
                    <p className="text-white/80 leading-relaxed">{highlight}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground font-mono">NO DATA AVAILABLE</div>
        )}
      </div>
    </Shell>
  );
}
