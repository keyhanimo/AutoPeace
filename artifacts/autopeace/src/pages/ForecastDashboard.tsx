import React, { useState, useMemo } from "react";
import { useGetLatestForecasts } from "@workspace/api-client-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";

const TIME_HORIZONS = ['30d', '90d', '180d', '1y'] as const;

const CATEGORIES = [
  { key: 'continued_conflict', label: 'Continued Conflict', color: '#ef4444' }, // red
  { key: 'major_escalation', label: 'Major Escalation', color: '#b91c1c' }, // dark red
  { key: 'informal_deescalation', label: 'Informal De-escalation', color: '#f59e0b' }, // amber
  { key: 'limited_ceasefire', label: 'Limited Ceasefire', color: '#fcd34d' }, // light amber
  { key: 'humanitarian_mini_deal', label: 'Humanitarian Deal', color: '#34d399' }, // light green
  { key: 'sanctions_partial_deal', label: 'Sanctions Deal', color: '#10b981' }, // green
  { key: 'regional_framework', label: 'Regional Framework', color: '#059669' }, // dark green
  { key: 'broad_settlement', label: 'Broad Settlement', color: '#0284c7' }, // blue/teal
];

export default function ForecastDashboard() {
  const { data: latestRes, isLoading, isError } = useGetLatestForecasts();
  const [horizon, setHorizon] = useState<typeof TIME_HORIZONS[number]>('30d');

  const activeForecast = useMemo(() => {
    if (!latestRes?.data) return null;
    return latestRes.data.find(f => f.timeHorizon === horizon);
  }, [latestRes, horizon]);

  const chartData = useMemo(() => {
    if (!activeForecast) return [];
    const p = activeForecast.probabilities as unknown as Record<string, number>;
    return CATEGORIES.map(cat => ({
      name: cat.label,
      value: (p[cat.key] || 0) * 100,
      color: cat.color
    }));
  }, [activeForecast]);

  if (isLoading) return <div className="animate-pulse space-y-8"><div className="h-20 bg-card rounded-2xl" /><div className="h-96 bg-card rounded-2xl" /></div>;
  if (isError) return <div className="text-destructive p-8 bg-destructive/10 rounded-2xl border border-destructive/20 text-center">Failed to load forecasts. Backend may not be fully initialized.</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader 
        title="Forecast Dashboard" 
        description="Live probabilistic outcome models generated via cross-model adversarial debate."
      >
        <div className="flex bg-secondary p-1 rounded-lg">
          {TIME_HORIZONS.map(h => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${horizon === h ? 'bg-background shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {h.toUpperCase()}
            </button>
          ))}
        </div>
      </PageHeader>

      {!activeForecast ? (
        <Card className="p-12 text-center flex flex-col items-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-bold">No forecast available</h3>
          <p className="text-muted-foreground">No forecast generated for {horizon} horizon yet.</p>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 flex flex-col">
            <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
              <BarChart className="w-5 h-5 text-primary" />
              Outcome Probabilities
            </h3>
            <div className="flex-1 min-h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} stroke="#475569" tickFormatter={(val) => `${val}%`} />
                  <YAxis dataKey="name" type="category" width={140} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    cursor={{fill: '#1e293b'}} 
                    contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc'}}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Probability']}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="space-y-6 flex flex-col">
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> 
                Model Metadata
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Cycle ID</span>
                  <span className="font-mono text-xs">{activeForecast.cycleId.slice(0,8)}...</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Brier Score</span>
                  <span className="font-mono">{activeForecast.brierScore?.toFixed(3) || 'Pending'}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-muted-foreground">Generated</span>
                  <span>{new Date(activeForecast.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 flex-1 bg-gradient-to-br from-card to-secondary/50">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Strategic Rationale
              </h3>
              <div className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed h-[250px] overflow-y-auto pr-2">
                {activeForecast.rationale || "No rationale provided by the model."}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
