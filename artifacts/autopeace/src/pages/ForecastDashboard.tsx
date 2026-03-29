import React, { useState, useMemo } from "react";
import { useGetLatestForecasts, useListForecasts, type Forecast } from "@workspace/api-client-react";
import { Card, PageHeader } from "@/components/ui";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line, Legend, ReferenceLine, ScatterChart, Scatter, CartesianGrid,
} from "recharts";
import { AlertCircle, Clock, CheckCircle2, FileText, Target, TrendingUp, BarChart2 } from "lucide-react";

const TIME_HORIZONS = ['30d', '90d', '180d', '1y'] as const;

const CATEGORIES = [
  { key: 'continued_conflict', label: 'Continued Conflict', shortLabel: 'Conflict', color: '#ef4444' },
  { key: 'major_escalation', label: 'Major Escalation', shortLabel: 'Escalation', color: '#b91c1c' },
  { key: 'informal_deescalation', label: 'Informal De-escalation', shortLabel: 'De-escalation', color: '#f59e0b' },
  { key: 'limited_ceasefire', label: 'Limited Ceasefire', shortLabel: 'Ceasefire', color: '#fcd34d' },
  { key: 'humanitarian_mini_deal', label: 'Humanitarian Deal', shortLabel: 'Humanitarian', color: '#34d399' },
  { key: 'sanctions_partial_deal', label: 'Sanctions Deal', shortLabel: 'Sanctions', color: '#10b981' },
  { key: 'regional_framework', label: 'Regional Framework', shortLabel: 'Regional', color: '#059669' },
  { key: 'broad_settlement', label: 'Broad Settlement', shortLabel: 'Settlement', color: '#0284c7' },
];

const PEACE_KEYS = ['humanitarian_mini_deal', 'sanctions_partial_deal', 'regional_framework', 'broad_settlement'];

const PREDICTION_MARKETS = [
  { name: "Polymarket", peaceProb: 0.08, conflictProb: 0.72, lastUpdated: "2024-12-01" },
  { name: "Metaculus", peaceProb: 0.12, conflictProb: 0.65, lastUpdated: "2024-12-01" },
  { name: "Kalshi", peaceProb: 0.06, conflictProb: 0.78, lastUpdated: "2024-12-01" },
];

function getProbs(f: Forecast): Record<string, number> {
  return f.probabilities as unknown as Record<string, number>;
}

function computePeaceProb(probs: Record<string, number>): number {
  return PEACE_KEYS.reduce((acc, k) => acc + (probs[k] ?? 0), 0);
}

function CalibrationScorecard({ forecasts }: { forecasts: Forecast[] }) {
  const brierScores = forecasts.filter(f => f.brierScore != null).map(f => f.brierScore!);
  const avgBrier = brierScores.length > 0 ? brierScores.reduce((a, b) => a + b, 0) / brierScores.length : null;
  const lastBrier = brierScores[brierScores.length - 1] ?? null;
  const trend = brierScores.length >= 2 ? (brierScores[brierScores.length - 1] ?? 0) - (brierScores[0] ?? 0) : null;

  const data = brierScores.slice(-10).map((b, i) => ({ cycle: `C${i + 1}`, brier: parseFloat(b.toFixed(4)) }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        Calibration Scorecard
      </h3>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold font-mono text-blue-400">{lastBrier?.toFixed(3) ?? "—"}</div>
          <div className="text-[10px] text-muted-foreground">Latest Brier</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold font-mono text-purple-400">{avgBrier?.toFixed(3) ?? "—"}</div>
          <div className="text-[10px] text-muted-foreground">Avg Brier</div>
        </div>
        <div className="text-center">
          <div className={`text-xl font-bold font-mono ${trend != null ? (trend < 0 ? "text-emerald-400" : "text-red-400") : "text-muted-foreground"}`}>
            {trend != null ? (trend < 0 ? "↓ " : "↑ ") + Math.abs(trend).toFixed(3) : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">Trend</div>
        </div>
      </div>
      {data.length >= 2 ? (
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="cycle" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '6px', fontSize: '11px', color: '#f8fafc' }}
                formatter={(v: number) => [v.toFixed(4), 'Brier']}
              />
              <Line type="monotone" dataKey="brier" stroke="#0284c7" strokeWidth={2} dot={false} />
              <ReferenceLine y={0.25} stroke="#475569" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center">Run more cycles for calibration trend</p>
      )}
    </Card>
  );
}

function PredictionMarketComparison({ activeForecast }: { activeForecast: Forecast }) {
  const probs = getProbs(activeForecast);
  const autoPeacePeace = computePeaceProb(probs) * 100;
  const autoPeaceConflict = (probs['continued_conflict'] ?? 0) * 100;

  const data = [
    { name: "AutoPeace", peace: parseFloat(autoPeacePeace.toFixed(1)), conflict: parseFloat(autoPeaceConflict.toFixed(1)) },
    ...PREDICTION_MARKETS.map(m => ({
      name: m.name,
      peace: parseFloat((m.peaceProb * 100).toFixed(1)),
      conflict: parseFloat((m.conflictProb * 100).toFixed(1)),
    })),
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-primary" />
        Prediction Market Comparison
      </h3>
      <p className="text-xs text-muted-foreground mb-4">AutoPeace vs. external markets (stub — Dec 2024 snapshot)</p>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }}
              formatter={(v: number) => [`${v.toFixed(1)}%`]}
            />
            <Bar dataKey="peace" fill="#10b981" name="Peace" radius={[2, 2, 0, 0]} />
            <Bar dataKey="conflict" fill="#ef4444" name="Conflict" radius={[2, 2, 0, 0]} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function ForecastDashboard() {
  const { data: latestRes, isLoading, isError } = useGetLatestForecasts();
  const { data: historyRes } = useListForecasts({ limit: 100 });
  const [horizon, setHorizon] = useState<typeof TIME_HORIZONS[number]>('30d');
  const [activeTab, setActiveTab] = useState<'probabilities' | 'radar' | 'history'>('probabilities');
  const [historyWindow, setHistoryWindow] = useState(10);

  const activeForecast = useMemo(() => {
    if (!latestRes?.data) return null;
    return latestRes.data.find(f => f.timeHorizon === horizon);
  }, [latestRes, horizon]);

  const chartData = useMemo(() => {
    if (!activeForecast) return [];
    const p = getProbs(activeForecast);
    return CATEGORIES.map(cat => ({
      name: cat.label,
      shortName: cat.shortLabel,
      value: parseFloat(((p[cat.key] || 0) * 100).toFixed(1)),
      color: cat.color,
    }));
  }, [activeForecast]);

  const radarData = useMemo(() => {
    if (!latestRes?.data) return [];
    return CATEGORIES.map(cat => {
      const entry: Record<string, number | string> = { outcome: cat.shortLabel };
      for (const f of latestRes.data) {
        const p = getProbs(f);
        entry[f.timeHorizon] = parseFloat(((p[cat.key] || 0) * 100).toFixed(1));
      }
      return entry;
    });
  }, [latestRes]);

  const allHistoryForHorizon = useMemo(() => {
    if (!historyRes?.data) return [];
    return historyRes.data
      .filter(f => f.timeHorizon === horizon)
      .reverse();
  }, [historyRes, horizon]);

  const historyData = useMemo(() => {
    return allHistoryForHorizon.slice(-historyWindow).map((f, i) => {
      const p = getProbs(f);
      return {
        cycle: `C${i + 1}`,
        date: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '',
        peace: parseFloat((computePeaceProb(p) * 100).toFixed(1)),
        conflict: parseFloat(((p['continued_conflict'] ?? 0) * 100).toFixed(1)),
        escalation: parseFloat(((p['major_escalation'] ?? 0) * 100).toFixed(1)),
      };
    });
  }, [allHistoryForHorizon, historyWindow]);

  const peaceProb = useMemo(() => {
    if (!activeForecast) return 0;
    return computePeaceProb(getProbs(activeForecast)) * 100;
  }, [activeForecast]);

  const uncertaintyRange = useMemo(() => {
    if (!activeForecast) return null;
    const p = getProbs(activeForecast);
    const maxProb = Math.max(...Object.values(p));
    const entropy = -Object.values(p).filter(v => v > 0).reduce((acc, v) => acc + v * Math.log2(v), 0);
    return { maxProb: maxProb * 100, entropy: entropy.toFixed(2) };
  }, [activeForecast]);

  const allForecasts = historyRes?.data ?? [];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-20 bg-card rounded-2xl" />
        <div className="h-96 bg-card rounded-2xl" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="text-destructive p-8 bg-destructive/10 rounded-2xl border border-destructive/20 text-center">
        Failed to load forecasts. Backend may not be fully initialized.
      </div>
    );
  }

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
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="text-3xl font-display font-bold text-primary">{peaceProb.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground mt-1">Peace Probability</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-3xl font-display font-bold text-destructive">
                {((getProbs(activeForecast)['continued_conflict'] ?? 0) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">Continued Conflict</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-3xl font-display font-bold text-amber-400">
                {uncertaintyRange?.entropy ?? '—'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Shannon Entropy</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-3xl font-display font-bold text-blue-400">
                {activeForecast.brierScore?.toFixed(3) ?? '—'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Brier Score</div>
            </Card>
          </div>

          <div className="flex gap-2 border-b border-border">
            {(['probabilities', 'radar', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors capitalize border-b-2 -mb-px ${activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {tab === 'probabilities' ? 'Outcome Probabilities' : tab === 'radar' ? 'Cross-Horizon Radar' : 'Historical Trend'}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 flex flex-col">
              {activeTab === 'probabilities' && (
                <>
                  <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Outcome Probabilities — {horizon.toUpperCase()}
                  </h3>
                  <div className="flex-1 min-h-[380px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" domain={[0, 100]} stroke="#475569" tickFormatter={(val: number) => `${val}%`} />
                        <YAxis dataKey="name" type="category" width={140} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                        <Tooltip
                          cursor={{ fill: '#1e293b' }}
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
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
                </>
              )}

              {activeTab === 'radar' && (
                <>
                  <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Cross-Horizon Comparison
                  </h3>
                  <div className="flex-1 min-h-[380px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#1e293b" />
                        <PolarAngleAxis dataKey="outcome" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        {TIME_HORIZONS.map((h, i) => (
                          <Radar
                            key={h}
                            name={h.toUpperCase()}
                            dataKey={h}
                            stroke={['#f59e0b', '#10b981', '#0284c7', '#8b5cf6'][i]}
                            fill={['#f59e0b', '#10b981', '#0284c7', '#8b5cf6'][i]}
                            fillOpacity={0.15}
                          />
                        ))}
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`]}
                        />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {activeTab === 'history' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-display font-bold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Historical Trend — {horizon.toUpperCase()}
                    </h3>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-muted-foreground">Show last:</label>
                      <input
                        type="range"
                        min={3}
                        max={Math.max(3, allHistoryForHorizon.length)}
                        value={historyWindow}
                        onChange={e => setHistoryWindow(Number(e.target.value))}
                        className="w-24 accent-primary"
                      />
                      <span className="text-xs font-mono text-muted-foreground w-6">{historyWindow}</span>
                    </div>
                  </div>
                  {historyData.length < 2 ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                      Run more research cycles to see historical trends.
                    </div>
                  ) : (
                    <div className="flex-1 min-h-[340px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <XAxis dataKey="cycle" stroke="#475569" />
                          <YAxis stroke="#475569" tickFormatter={(v: number) => `${v}%`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                            formatter={(value: number) => [`${value.toFixed(1)}%`]}
                            labelFormatter={(label, payload) => {
                              const item = payload?.[0]?.payload as { cycle: string; date: string } | undefined;
                              return item ? `${item.cycle} (${item.date})` : label;
                            }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="peace" stroke="#10b981" name="Peace" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="conflict" stroke="#ef4444" name="Conflict" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="escalation" stroke="#b91c1c" name="Escalation" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </Card>

            <div className="space-y-6 flex flex-col">
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Model Metadata
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Cycle ID</span>
                    <span className="font-mono text-xs">{activeForecast.cycleId.slice(0, 8)}…</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Evidence Pack</span>
                    <span className="font-mono text-xs">{activeForecast.evidencePackVersion}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Brier Score</span>
                    <span className="font-mono">{activeForecast.brierScore?.toFixed(3) ?? '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Max Outcome</span>
                    <span className="font-mono">{uncertaintyRange?.maxProb.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Generated</span>
                    <span>{new Date(activeForecast.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Evidence Audit
                </h3>
                {activeForecast.keyEvidenceItems && activeForecast.keyEvidenceItems.length > 0 ? (
                  <ul className="space-y-2">
                    {(activeForecast.keyEvidenceItems as string[]).slice(0, 5).map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No evidence items recorded for this forecast.</p>
                )}
              </Card>

              <Card className="p-6 flex-1 bg-gradient-to-br from-card to-secondary/50">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Strategic Rationale
                </h3>
                <div className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed h-[200px] overflow-y-auto pr-2 text-xs">
                  {activeForecast.rationale || "No rationale provided by the model."}
                </div>
              </Card>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <CalibrationScorecard forecasts={allForecasts} />
            <PredictionMarketComparison activeForecast={activeForecast} />
          </div>
        </>
      )}
    </div>
  );
}
