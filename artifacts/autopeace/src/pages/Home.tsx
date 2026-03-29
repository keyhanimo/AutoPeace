import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Activity, Zap, BarChart, Database, DollarSign, Handshake, Swords } from "lucide-react";
import { useGetExperimentStats, useGetLatestForecasts, useListCosts, useGetCurrentDeal, type Forecast, type DealScores } from "@workspace/api-client-react";
import { Card, Button, Badge } from "@/components/ui";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const OUTCOME_COLORS: Record<string, string> = {
  continued_conflict: '#ef4444',
  major_escalation: '#b91c1c',
  informal_deescalation: '#f59e0b',
  limited_ceasefire: '#fcd34d',
  humanitarian_mini_deal: '#34d399',
  sanctions_partial_deal: '#10b981',
  regional_framework: '#059669',
  broad_settlement: '#0284c7',
};

const CONFLICT_NODES = [
  { id: "us", label: "US", x: 18, y: 34, r: 10, color: "#3b82f6" },
  { id: "iran", label: "Iran", x: 58, y: 42, r: 12, color: "#ef4444" },
  { id: "israel", label: "Israel", x: 53, y: 40, r: 7, color: "#a855f7" },
  { id: "ksa", label: "KSA", x: 56, y: 47, r: 7, color: "#f59e0b" },
  { id: "russia", label: "Russia", x: 66, y: 25, r: 8, color: "#64748b" },
  { id: "china", label: "China", x: 78, y: 35, r: 9, color: "#f97316" },
  { id: "eu", label: "EU", x: 50, y: 28, r: 7, color: "#6366f1" },
  { id: "hezbollah", label: "Hizbullah", x: 52, y: 38, r: 5, color: "#84cc16" },
];

const CONFLICT_EDGES = [
  { from: "us", to: "iran", tension: 0.9, color: "#ef4444" },
  { from: "israel", to: "iran", tension: 0.95, color: "#ef4444" },
  { from: "iran", to: "hezbollah", tension: 0.4, color: "#84cc16" },
  { from: "us", to: "israel", tension: 0.15, color: "#3b82f6" },
  { from: "russia", to: "iran", tension: 0.2, color: "#64748b" },
  { from: "china", to: "iran", tension: 0.25, color: "#f97316" },
];

function ConflictMap({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border/50 bg-card/50 aspect-[2/1]">
      <svg viewBox="0 0 100 60" className="w-full h-full" style={{ minHeight: 180 }}>
        <defs>
          <radialGradient id="map-bg" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width="100" height="60" fill="url(#map-bg)" />

        {CONFLICT_EDGES.map((edge, i) => {
          const from = CONFLICT_NODES.find(n => n.id === edge.from);
          const to = CONFLICT_NODES.find(n => n.id === edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={edge.color}
              strokeWidth={edge.tension * 0.8}
              strokeOpacity={0.3 + edge.tension * 0.3}
              strokeDasharray={edge.tension > 0.7 ? "none" : "0.5 0.5"}
            />
          );
        })}

        {CONFLICT_NODES.map(node => {
          const isSelected = selectedId === node.id;
          return (
            <g key={node.id} onClick={() => onSelect(node.id)} style={{ cursor: "pointer" }}>
              <circle cx={node.x} cy={node.y} r={node.r * 1.8} fill={node.color} fillOpacity={isSelected ? 0.2 : 0.08} filter="url(#glow)" />
              <circle cx={node.x} cy={node.y} r={node.r * 0.5} fill={node.color} fillOpacity={isSelected ? 1 : 0.7} />
              {(isSelected || node.r >= 9) && (
                <text x={node.x} y={node.y + node.r + 3.5} textAnchor="middle"
                  fill={isSelected ? "white" : "#94a3b8"} fontSize="2.2" fontWeight={isSelected ? "bold" : "normal"}
                  style={{ pointerEvents: "none" }}>
                  {node.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-2 left-3 text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
        Conflict Network
      </div>
    </div>
  );
}

const TICKER_ITEMS = [
  "Anthropic Claude generating 90-day forecasts...",
  "Gemini red-teaming optimistic scenario...",
  "OpenAI GPT-4o evaluating champion...",
  "Ingesting GDELT articles...",
  "Computing Brier scores against 2024 backtest...",
  "Hill-climbing: challenger retained as champion",
  "Storing forecast probabilities to DB...",
];

function LiveTicker() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % TICKER_ITEMS.length);
        setVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-mono w-full">
      <span className="w-2 h-2 bg-primary rounded-full animate-pulse shrink-0" />
      <AnimatePresence mode="wait">
        {visible && (
          <motion.span
            key={idx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="truncate"
          >
            {TICKER_ITEMS[idx]}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function calculatePeaceProbability(forecasts: Forecast[]): number {
  if (!forecasts || forecasts.length === 0) return 0;
  const f30 = forecasts.find(f => f.timeHorizon === '30d') ?? forecasts[0];
  if (!f30) return 0;
  const p = f30.probabilities;
  return ([p.humanitarian_mini_deal, p.sanctions_partial_deal, p.regional_framework, p.broad_settlement]
    .map(v => v ?? 0)
    .reduce((a, b) => a + b, 0)) * 100;
}

function OutcomeSparkbar({ forecasts }: { forecasts: Forecast[] }) {
  const f90 = forecasts.find(f => f.timeHorizon === '90d');
  if (!f90) return null;
  const probs = Object.entries(f90.probabilities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-1.5 w-full">
      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">90-Day Outcome Dist.</p>
      {probs.map(([key, val]) => (
        <div key={key} className="flex items-center gap-2">
          <div className="w-20 shrink-0 text-[10px] text-muted-foreground truncate capitalize">{key.replace(/_/g, ' ')}</div>
          <div className="flex-1 bg-secondary/50 rounded h-1.5 overflow-hidden">
            <motion.div
              className="h-full rounded"
              style={{ backgroundColor: OUTCOME_COLORS[key] ?? '#94a3b8' }}
              initial={{ width: 0 }}
              animate={{ width: `${(val * 100).toFixed(1)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="w-8 text-right text-[10px] font-mono text-foreground shrink-0">{(val * 100).toFixed(0)}%</div>
        </div>
      ))}
    </div>
  );
}

function CostOfWarSection() {
  const { data: costsRes, isLoading } = useListCosts();
  const costs = costsRes?.data ?? [];

  const sorted = [...costs].sort((a, b) => (b.economic.totalUsd ?? 0) - (a.economic.totalUsd ?? 0));
  const sparkData = sorted.slice(0, 8).map(c => ({
    name: c.stakeholderId.slice(0, 8),
    value: (c.economic.totalUsd ?? 0) / 1e9,
  }));

  const totalUsd = costs.reduce((sum, c) => sum + (c.economic.totalUsd ?? 0), 0);
  const topCost = sorted[0];

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-4 bg-secondary rounded w-48 mb-4" />
        <div className="h-24 bg-secondary rounded" />
      </Card>
    );
  }

  if (!costs.length) return null;

  return (
    <Card className="p-6 border-red-900/30 bg-gradient-to-br from-card to-red-950/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <DollarSign className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-bold">Cost of War</h2>
            <p className="text-xs text-muted-foreground">Economic burden across all tracked stakeholders</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-display font-bold text-red-400">
            ${(totalUsd / 1e9).toFixed(1)}B
          </div>
          <div className="text-[10px] text-muted-foreground">Total Estimated USD</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '6px', fontSize: '10px' }}
                formatter={(v: number) => [`$${v.toFixed(1)}B`, 'Econ. Cost']}
              />
              <Area type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} fill="url(#costGradient)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {sorted.slice(0, 4).map(c => {
            const val = c.economic.totalUsd ?? 0;
            const pct = totalUsd > 0 ? (val / totalUsd) * 100 : 0;
            return (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className="w-28 shrink-0 text-muted-foreground truncate font-mono text-[10px]">{c.stakeholderId.replace(/-/g, ' ')}</span>
                <div className="flex-1 bg-secondary/50 rounded h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full bg-red-500 rounded"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct.toFixed(1)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-foreground shrink-0">${(val / 1e9).toFixed(1)}B</span>
              </div>
            );
          })}
        </div>
      </div>

      {topCost && (
        <p className="text-[10px] text-muted-foreground mt-4 italic border-t border-border/50 pt-3">
          Largest burden: <strong className="text-foreground">{topCost.stakeholderId}</strong> — Economic cost ${(topCost.economic.totalUsd / 1e9).toFixed(1)}B
          {topCost.humanitarian.casualtiesEstimate ? `, ~${topCost.humanitarian.casualtiesEstimate.toLocaleString()} casualties est.` : ''}
        </p>
      )}

      <div className="mt-3 text-right">
        <Link to="/costs" className="text-xs text-primary hover:underline underline-offset-2">Explore all costs →</Link>
      </div>
    </Card>
  );
}

function DealHeroSection() {
  const { data: deal } = useGetCurrentDeal();
  if (!deal) return null;
  const scores = deal.scores as DealScores | null;
  const composite = scores?.composite ?? 0;
  const feasibility = scores?.feasibility ?? 0;
  const domestic = scores?.domesticSellability ?? 0;
  const durability = scores?.durability ?? 0;

  return (
    <section>
      <Card className="p-6 border-amber-700/30 bg-gradient-to-br from-card to-amber-950/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Handshake className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="text-lg font-bold">Latest AI-Designed Peace Deal</h2>
              <Badge variant="outline" className="border-amber-700/40 text-amber-400 text-[10px] capitalize">
                {deal.architecture} architecture
              </Badge>
              {deal.isPareto && (
                <Badge variant="outline" className="border-emerald-700/40 text-emerald-400 text-[10px]">
                  Pareto frontier
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Composite", value: composite, color: "text-amber-400" },
                { label: "Feasibility", value: feasibility, color: "text-emerald-400" },
                { label: "Domestic", value: domestic, color: "text-purple-400" },
                { label: "Durability", value: durability, color: "text-pink-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-secondary/30 rounded-lg p-2.5 text-center">
                  <div className={`text-xl font-display font-bold ${color}`}>
                    {(value * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/deals">
                <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700 text-white border-0">
                  <Handshake className="w-3.5 h-3.5" /> View Deal Dashboard
                </Button>
              </Link>
              <Link to="/arena">
                <Button size="sm" variant="outline" className="gap-2">
                  <Swords className="w-3.5 h-3.5" /> Proposal Arena
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetExperimentStats();
  const { data: latestRes, isLoading: forecastLoading } = useGetLatestForecasts();
  const [selectedNode, setSelectedNode] = useState<string | null>("iran");

  const forecasts = latestRes?.data || [];
  const peaceProb = calculatePeaceProbability(forecasts);

  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (peaceProb / 100) * circumference;

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      <section className="relative rounded-3xl overflow-hidden border border-border/50 bg-card">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-card via-card/90 to-card" />
        </div>

        <div className="relative z-10 p-8 md:p-12 grid lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-5">
            <Badge variant="outline" className="bg-background/50 backdrop-blur-md border-primary/30 text-primary">
              Live AI Geopolitical Analysis
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold font-display leading-tight">
              Forecasting <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Peace & Conflict</span> in Real-Time.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              AutoPeace uses continuous multi-agent LLM loops to analyze thousands of data points, forecasting outcomes for the Iran conflict with calibrated probabilistic precision.
            </p>
            <LiveTicker />
            <div className="flex flex-wrap gap-4 pt-2">
              <Link to="/forecasts">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  View Latest Forecasts <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/methodology">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-background/50 backdrop-blur-sm">
                  Read Methodology
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <ConflictMap selectedId={selectedNode} onSelect={setSelectedNode} />
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-border" />
                    {!forecastLoading && (
                      <motion.circle
                        cx="50" cy="50" r="42"
                        stroke="currentColor"
                        strokeWidth="10"
                        fill="transparent"
                        className="text-primary"
                        strokeDasharray={2 * Math.PI * 42}
                        initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                        animate={{ strokeDashoffset: (2 * Math.PI * 42) - (peaceProb / 100) * (2 * Math.PI * 42) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-lg font-bold">{forecastLoading ? "--" : peaceProb.toFixed(0)}<span className="text-xs">%</span></div>
                    <div className="text-[9px] text-muted-foreground text-center leading-tight">Peace<br/>Outlook</div>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">30d Horizon</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                {forecastLoading ? <div className="animate-pulse text-xs text-muted-foreground">Loading...</div> : <OutcomeSparkbar forecasts={forecasts} />}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Latest Brier Score</p>
          <h3 className="text-3xl font-display font-bold">{statsLoading ? "--" : stats?.latestBrierScore?.toFixed(3) || "N/A"}</h3>
          <p className="text-xs text-muted-foreground mt-2">Lower is better (0 = perfect)</p>
        </Card>
        <Card className="p-6">
          <div className="p-3 bg-blue-500/10 rounded-xl w-fit mb-4">
            <Database className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Research Cycles</p>
          <h3 className="text-3xl font-display font-bold">{statsLoading ? "--" : stats?.cyclesRun}</h3>
          <p className="text-xs text-muted-foreground mt-2">Continuous loops executed</p>
        </Card>
        <Card className="p-6">
          <div className="p-3 bg-emerald-500/10 rounded-xl w-fit mb-4">
            <Zap className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Experiments Retained</p>
          <h3 className="text-3xl font-display font-bold">{statsLoading ? "--" : `${((stats?.retentionRate || 0) * 100).toFixed(0)}%`}</h3>
          <p className="text-xs text-muted-foreground mt-2">{stats?.retained} of {stats?.total} retained</p>
        </Card>
        <Card className="p-6">
          <div className="p-3 bg-purple-500/10 rounded-xl w-fit mb-4">
            <BarChart className="w-6 h-6 text-purple-500" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Tokens Processed</p>
          <h3 className="text-3xl font-display font-bold">{statsLoading ? "--" : new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(stats?.totalTokensConsumed || 0)}</h3>
          <p className="text-xs text-muted-foreground mt-2">Total LLM context analyzed</p>
        </Card>
      </section>

      <DealHeroSection />

      <section>
        <CostOfWarSection />
      </section>

      <section>
        <div className="mb-8">
          <h2 className="text-2xl font-bold font-display">Intelligence Pipeline</h2>
          <p className="text-muted-foreground mt-1">How AutoPeace turns global noise into calibrated signal.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-border via-primary/50 to-border" />
          <Card className="p-8 relative">
            <div className="w-12 h-12 rounded-full bg-secondary border-2 border-primary flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <span className="font-bold text-lg">1</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Evidence Ingestion</h3>
            <p className="text-muted-foreground text-sm">
              We continuously scrape ACLED, GDELT, and global news feeds, filtering for relevance to 28 key stakeholders in the Iran conflict theater.
            </p>
          </Card>
          <Card className="p-8 relative">
            <div className="w-12 h-12 rounded-full bg-secondary border-2 border-primary flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <span className="font-bold text-lg">2</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Cross-Model Red Teaming</h3>
            <p className="text-muted-foreground text-sm">
              Anthropic generates initial Bayesian forecasts. Gemini aggressively critiques them. OpenAI evaluates the critique. The forecast updates.
            </p>
          </Card>
          <Card className="p-8 relative">
            <div className="w-12 h-12 rounded-full bg-secondary border-2 border-primary flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <span className="font-bold text-lg">3</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Evolution & Scoring</h3>
            <p className="text-muted-foreground text-sm">
              The agent mutates its own prompt instructions. If a mutated prompt produces better backtested Brier scores, the new prompt is retained forever.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
