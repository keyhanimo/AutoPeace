import React, { useState, useMemo } from "react";
import {
  useGetLatestForecasts, useListForecasts, useListEvidence,
  useGetCommunityForecastAggregate, useSubmitCommunityForecast,
  useListStakeholders, useListWhatIfScenarios,
  type Forecast, type WhatIfScenario,
} from "@workspace/api-client-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line, Legend, ReferenceLine, ScatterChart, Scatter, CartesianGrid,
} from "recharts";
import { AlertCircle, Clock, CheckCircle2, FileText, Target, TrendingUp, BarChart2, Users, Zap, Send } from "lucide-react";
import { DataSourceNote, DataFreshness } from "@/components/DataSourceNote";

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

function WhatIfPanel({ allForecasts }: { allForecasts: Forecast[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: scenariosData, isLoading: scenariosLoading } = useListWhatIfScenarios();
  const scenarios: WhatIfScenario[] = (scenariosData?.data ?? []) as WhatIfScenario[];

  const baseline90d = allForecasts.find(f => f.timeHorizon === "90d") ?? allForecasts[0];
  const baseProbs = baseline90d ? getProbs(baseline90d) : {};
  const activeScenario = scenarios.find(s => s.id === activeId) ?? null;

  const chartData = CATEGORIES.map(cat => ({
    name: cat.shortLabel,
    base: parseFloat(((baseProbs[cat.key] ?? 0) * 100).toFixed(1)),
    scenario: activeScenario
      ? parseFloat(((activeScenario.absoluteProbabilities[cat.key] ?? 0) * 100).toFixed(1))
      : undefined,
    color: cat.color,
  }));

  const deltaData = activeScenario
    ? CATEGORIES.map(cat => {
        const base = parseFloat(((baseProbs[cat.key] ?? 0) * 100).toFixed(1));
        const scenario = parseFloat(((activeScenario.absoluteProbabilities[cat.key] ?? 0) * 100).toFixed(1));
        return { name: cat.shortLabel, delta: parseFloat((scenario - base).toFixed(1)) };
      })
    : [];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" /> What-If Scenarios
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Pre-computed scenario variants updated each research cycle. Baseline is the <strong>90-day</strong> forecast for consistency with scenario computation.
        Select a scenario to compare probability shifts vs. baseline.
      </p>
      {scenariosLoading ? (
        <div className="grid sm:grid-cols-2 gap-2 mb-5">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse bg-secondary/40 rounded-lg" />)}
        </div>
      ) : scenarios.length === 0 ? (
        <div className="text-center py-8 border border-border/20 rounded-lg bg-secondary/10 mb-5">
          <p className="text-xs text-muted-foreground">Scenario snapshots are generated during each research cycle.</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Run a research cycle or ask an admin to compute scenarios.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2 mb-5">
          {scenarios.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveId(prev => prev === s.id ? null : s.id)}
              aria-pressed={activeId === s.id}
              className={`text-left p-3 rounded-lg border text-xs transition-all ${
                activeId === s.id
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              <div className="font-medium mb-0.5">{s.name}</div>
              <div className="text-[10px] opacity-70 leading-relaxed">{s.description}</div>
              <div className="text-[9px] opacity-50 mt-1">Trigger: {s.triggerCondition}</div>
            </button>
          ))}
        </div>
      )}
      {activeScenario ? (
        <div>
          <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: "#475569" }} />90d Baseline</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: "#f59e0b" }} />Scenario</span>
            <Badge variant="outline" className="ml-auto border-primary/40 text-primary text-xs">{activeScenario.name}</Badge>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: 11 }}
                formatter={(v: number, name: string) => [`${v}%`, name === "base" ? "90d Baseline" : "Scenario"]}
              />
              <Bar dataKey="base" fill="#475569" opacity={0.6} radius={[2, 2, 0, 0]} name="base" />
              <Bar dataKey="scenario" fill="#f59e0b" radius={[2, 2, 0, 0]} name="scenario" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Probability Deltas vs 90d Baseline</div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
              {deltaData.map(d => (
                <div key={d.name} className="text-center rounded bg-secondary/30 p-1.5">
                  <div className="text-[9px] text-muted-foreground mb-0.5">{d.name}</div>
                  <div className={`text-[11px] font-mono font-bold ${d.delta > 0 ? "text-emerald-400" : d.delta < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                    {d.delta > 0 ? "+" : ""}{d.delta}%
                  </div>
                </div>
              ))}
            </div>
          </div>
          {activeScenario.basedOnCycleId && (
            <p className="text-[9px] text-muted-foreground mt-2">Based on cycle: {activeScenario.basedOnCycleId.slice(0, 8)}…</p>
          )}
        </div>
      ) : (
        <div className="h-24 flex items-center justify-center border border-border/20 rounded-lg bg-secondary/20">
          <p className="text-xs text-muted-foreground">Select a scenario to compare pre-computed probability shifts</p>
        </div>
      )}
    </Card>
  );
}

function CommunityForecastPanel({ activeForecast }: { activeForecast: Forecast }) {
  const [horizon, setHorizon] = useState<"30d" | "90d" | "180d" | "1y">("90d");
  const [tab, setTab] = useState<"results" | "submit">("results");
  const [estimates, setEstimates] = useState<Record<string, number>>(() =>
    Object.fromEntries(CATEGORIES.map(c => [c.key, parseFloat((100 / CATEGORIES.length).toFixed(1))]))
  );
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [sessionId] = useState(() => crypto.randomUUID());

  const { data, isLoading, refetch } = useGetCommunityForecastAggregate({ timeHorizon: horizon });
  const { mutateAsync, isPending } = useSubmitCommunityForecast();

  const baseProbs = getProbs(activeForecast);

  const total = Object.values(estimates).reduce((a, b) => a + b, 0);
  const remainder = parseFloat((100 - total).toFixed(1));

  const chartData = useMemo(() => {
    if (!data?.aggregated) return [];
    return CATEGORIES.map(cat => ({
      name: cat.shortLabel,
      ai: parseFloat(((baseProbs[cat.key] ?? 0) * 100).toFixed(1)),
      community: parseFloat((data.aggregated[cat.key] ?? 0).toFixed(1)),
      color: cat.color,
    }));
  }, [data, baseProbs]);

  const handleEstimateChange = (key: string, val: number) => {
    setEstimates(prev => ({ ...prev, [key]: Math.max(0, Math.min(100, val)) }));
  };

  const handleSubmit = async () => {
    if (Math.abs(remainder) > 0.5) return;
    try {
      await mutateAsync({ data: { sessionId, timeHorizon: horizon, estimates } });
      setSubmitStatus("success");
      void refetch();
      setTimeout(() => { setSubmitStatus("idle"); setTab("results"); }, 2500);
    } catch {
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus("idle"), 3000);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Community Forecast
        </h3>
        <div className="flex gap-1">
          {(["30d", "90d", "180d", "1y"] as const).map(h => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              aria-pressed={horizon === h}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                horizon === h ? "border-primary/40 bg-primary/10 text-primary" : "border-border/30 text-muted-foreground hover:border-border"
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mb-4 border-b border-border/30">
        {(["results", "submit"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-xs font-medium capitalize border-b-2 transition-colors -mb-px ${t === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            aria-selected={t === tab}
          >
            {t === "results" ? `Results (${data?.count ?? 0})` : "Submit Your Forecast"}
          </button>
        ))}
      </div>

      {tab === "results" ? (
        isLoading ? (
          <div className="h-32 animate-pulse bg-secondary/40 rounded-lg" />
        ) : data && data.count > 0 ? (
          <div>
            <div className="flex items-center gap-3 mb-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-primary/70 rounded-sm inline-block" />AI Forecast</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-500/70 rounded-sm inline-block" />Community Avg ({data.count} submissions)</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 9, fill: "#94a3b8" }} width={32} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: 11 }}
                  formatter={(v: number, name: string) => [`${v}%`, name === "ai" ? "AI Forecast" : "Community Avg"]}
                />
                <Bar dataKey="ai" fill="#6366f1" radius={[2, 2, 0, 0]} name="ai" />
                <Bar dataKey="community" fill="#10b981" radius={[2, 2, 0, 0]} name="community" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-24 flex flex-col items-center justify-center border border-border/20 rounded-lg bg-secondary/20 gap-2">
            <p className="text-xs text-muted-foreground">No community forecasts yet for {horizon}.</p>
            <button onClick={() => setTab("submit")} className="text-xs text-primary hover:underline">Be the first to submit →</button>
          </div>
        )
      ) : submitStatus === "success" ? (
        <div className="h-32 flex flex-col items-center justify-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
          <p className="text-sm font-medium">Forecast submitted! Thank you.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className={`flex items-center justify-between mb-2 text-xs ${Math.abs(remainder) <= 0.5 ? "text-emerald-400" : "text-amber-400"}`}>
            <span>Allocate probability across 8 outcomes</span>
            <span className="font-mono font-bold">{total.toFixed(1)}% / 100%</span>
          </div>
          {CATEGORIES.map(cat => (
            <div key={cat.key} className="flex items-center gap-2">
              <span className="text-[9px] w-16 text-muted-foreground shrink-0 truncate">{cat.shortLabel}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={estimates[cat.key] ?? 0}
                onChange={e => handleEstimateChange(cat.key, parseFloat(e.target.value))}
                className="flex-1 h-1.5 accent-primary"
                aria-label={`${cat.label} probability`}
              />
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={estimates[cat.key] ?? 0}
                onChange={e => handleEstimateChange(cat.key, parseFloat(e.target.value) || 0)}
                className="w-12 text-right text-[10px] bg-secondary/50 border border-border/50 rounded px-1 py-0.5 font-mono focus:outline-none"
                aria-label={`${cat.label} percentage input`}
              />
              <span className="text-[9px] text-muted-foreground w-2">%</span>
            </div>
          ))}
          {submitStatus === "error" && (
            <p className="text-xs text-red-400 mt-1">Submission failed. Please try again.</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={isPending || Math.abs(remainder) > 0.5}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary text-xs font-medium hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Submit community forecast"
          >
            {isPending ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Send className="w-3 h-3" />}
            {Math.abs(remainder) > 0.5 ? `Adjust to reach 100% (${remainder > 0 ? "+" : ""}${remainder.toFixed(1)}%)` : "Submit Forecast"}
          </button>
        </div>
      )}
    </Card>
  );
}

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
  const { data: evidenceRes } = useListEvidence({ limit: 200 });
  const { data: stakeholderList } = useListStakeholders();
  const [horizon, setHorizon] = useState<typeof TIME_HORIZONS[number]>('30d');
  const [activeTab, setActiveTab] = useState<'probabilities' | 'radar' | 'history'>('probabilities');
  const [historyWindow, setHistoryWindow] = useState(10);
  const [lensStakeholderId, setLensStakeholderId] = useState<string>("");

  const activeForecast = useMemo(() => {
    if (!latestRes?.data) return null;
    return latestRes.data.find(f => f.timeHorizon === horizon);
  }, [latestRes, horizon]);

  const lensStakeholder = useMemo(() => {
    if (!lensStakeholderId) return null;
    const list = ((stakeholderList as unknown as { data?: Array<{ id: string; name: string; preferredOutcomes?: unknown }> })?.data ?? []);
    return list.find(s => s.id === lensStakeholderId) ?? null;
  }, [stakeholderList, lensStakeholderId]);

  const lensPreferred = useMemo((): string[] => {
    if (!lensStakeholder) return [];
    return Array.isArray(lensStakeholder.preferredOutcomes) ? lensStakeholder.preferredOutcomes as string[] : [];
  }, [lensStakeholder]);

  const chartData = useMemo(() => {
    if (!activeForecast) return [];
    const p = getProbs(activeForecast);
    return CATEGORIES.map(cat => ({
      name: cat.label,
      shortName: cat.shortLabel,
      value: parseFloat(((p[cat.key] || 0) * 100).toFixed(1)),
      color: lensPreferred.includes(cat.key) ? "#6366f1" : cat.color,
      isPreferred: lensPreferred.includes(cat.key),
    }));
  }, [activeForecast, lensPreferred]);

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

  const evidenceByTitle = useMemo(() => {
    const items = evidenceRes?.data ?? [];
    const map = new Map<string, { url: string; source: string; type: string }>();
    for (const ev of items) {
      if (ev.title) {
        map.set(ev.title.toLowerCase().trim(), { url: ev.sourceUrl, source: ev.source, type: ev.evidenceType });
      }
    }
    return map;
  }, [evidenceRes]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-20 bg-card" />
        <div className="h-96 bg-card" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="text-destructive p-8 bg-destructive/10 border border-destructive/20 text-center">
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
        <div className="flex bg-secondary p-1">
          {TIME_HORIZONS.map(h => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-4 py-1.5 text-sm font-medium transition-all ${horizon === h ? 'bg-background shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
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

          {(() => {
            const stakeholders = ((stakeholderList as unknown as { data?: Array<{ id: string; name: string }> })?.data ?? []);
            return stakeholders.length > 0 ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30 text-xs">
                <span className="text-muted-foreground font-semibold shrink-0">Stakeholder Lens:</span>
                <select
                  value={lensStakeholderId}
                  onChange={e => setLensStakeholderId(e.target.value)}
                  className="flex-1 max-w-xs border border-border/40 rounded px-2 py-1 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">None (default colors)</option>
                  {stakeholders.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {lensPreferred.length > 0 && (
                  <span className="text-violet-400 font-semibold shrink-0">
                    ⭐ {lensPreferred.length} preferred outcome{lensPreferred.length !== 1 ? "s" : ""} highlighted
                  </span>
                )}
              </div>
            ) : null;
          })()}

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
                  <ul className="space-y-3">
                    {(activeForecast.keyEvidenceItems as string[]).slice(0, 5).map((item, i) => {
                      const match = evidenceByTitle.get(item.toLowerCase().trim());
                      return (
                        <li key={i} className="text-xs flex gap-2 items-start">
                          <span className="text-primary font-bold shrink-0 mt-0.5">{i + 1}.</span>
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            {match?.url ? (
                              <a
                                href={match.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-foreground hover:text-primary transition-colors underline underline-offset-2 leading-relaxed"
                              >
                                {item}
                              </a>
                            ) : (
                              <span className="text-muted-foreground leading-relaxed">{item}</span>
                            )}
                            {match && (
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-secondary text-muted-foreground border border-border/50">
                                  {match.source}
                                </span>
                                <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-primary/10 text-primary border border-primary/20">
                                  {match.type}
                                </span>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No evidence items recorded for this forecast.</p>
                )}
              </Card>

            </div>
          </div>

          <Card className="p-8 bg-gradient-to-br from-card via-card to-primary/5 border-primary/10">
            <h3 className="text-xl font-display font-bold mb-5 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Strategic Rationale
            </h3>
            <div className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed text-sm whitespace-pre-line">
              {activeForecast.rationale || "No rationale provided by the model."}
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <WhatIfPanel allForecasts={latestRes?.data ?? []} />
            <CommunityForecastPanel activeForecast={activeForecast} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <CalibrationScorecard forecasts={allForecasts} />
            <PredictionMarketComparison activeForecast={activeForecast} />
          </div>

          <DataSourceNote
            title="Forecasting Methodology & Sources"
            methodology="Forecasts are generated using a Bayesian multi-model pipeline. Claude produces initial probability distributions across 8 mutually exclusive, collectively exhaustive (MECE) outcome states for 4 time horizons (30d, 90d, 180d, 1y). Gemini red-teams the 90d forecast with adversarial mutations. GPT-4o evaluates whether mutations improve calibration. Only mutations that pass evaluation are retained (Hill Climbing optimization). Probabilities are conditioned on the 30 most recent evidence items from RSS feeds (Reuters, AP, Guardian, BBC, Al Jazeera), ACLED, and GDELT."
            sources={[
              { label: "Evidence corpus", detail: "RSS (Reuters, AP, Guardian, BBC, Al Jazeera), ACLED conflict data, GDELT event database" },
              { label: "Forecasting model", detail: "Anthropic Claude (base forecast generation)" },
              { label: "Red-team model", detail: "Google Gemini (adversarial challenge)" },
              { label: "Evaluation model", detail: "OpenAI GPT-4o (mutation quality assessment)" },
              { label: "Calibration metric", detail: "Brier score — quadratic scoring rule for probabilistic accuracy" },
            ]}
            confidenceNote={`Shannon entropy: ${uncertaintyRange?.entropy ?? '—'} bits. Higher entropy indicates greater uncertainty across outcomes. Entropy of 3.0 (uniform over 8 states) means maximum uncertainty; values near 0 indicate high confidence in a single outcome.`}
            limitations={[
              "AI-generated probabilities — not validated against realized outcomes at scale. Brier scores measure internal consistency, not ground truth calibration.",
              "Evidence ingestion is limited to English-language sources. Persian, Arabic, and Hebrew sources are not directly analyzed.",
              "Prediction market comparison uses static snapshot data (Dec 2024) and is not live-linked.",
            ]}
            lastUpdated={activeForecast.createdAt}
            updateFrequency="Each research cycle (configurable: hourly/daily/weekly)"
          />
        </>
      )}
    </div>
  );
}
