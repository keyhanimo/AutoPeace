import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Crosshair, Cpu, TrendingDown, Gauge, DollarSign, Handshake, Swords } from "lucide-react";
import { useGetExperimentStats, useGetLatestForecasts, useListCosts, useGetCurrentDeal, useListChangelog, type Forecast, type DealScores } from "@workspace/api-client-react";
import { Card, Button, Badge } from "@/components/ui";
import { DataSourceNote, DataFreshness } from "@/components/DataSourceNote";

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

const ACCEPTANCE_COLORS: Record<string, string> = {
  accept: "#10b981",
  conditional: "#f59e0b",
  reject: "#ef4444",
};

function ConflictMap({
  selectedId, onSelect,
  acceptanceMap,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  acceptanceMap?: Record<string, string>;
}) {
  const hasAcceptance = acceptanceMap && Object.keys(acceptanceMap).length > 0;
  return (
    <div className="relative w-full overflow-hidden border border-border/50 bg-card/50 aspect-[2/1] rounded-sm">
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
          const verdict = acceptanceMap?.[node.id] ?? acceptanceMap?.[node.id.replace(/-/g, '_')];
          const nodeColor = hasAcceptance && verdict ? (ACCEPTANCE_COLORS[verdict] ?? node.color) : node.color;
          return (
            <g key={node.id} onClick={() => onSelect(node.id)} style={{ cursor: "pointer" }}>
              <circle cx={node.x} cy={node.y} r={node.r * 1.8} fill={nodeColor} fillOpacity={isSelected ? 0.25 : 0.1} filter="url(#glow)" />
              <circle cx={node.x} cy={node.y} r={node.r * 0.5} fill={nodeColor} fillOpacity={isSelected ? 1 : 0.8} />
              {isSelected && <circle cx={node.x} cy={node.y} r={node.r * 0.7} fill="none" stroke={nodeColor} strokeWidth={0.5} />}
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
      <div className="absolute bottom-2 left-3 text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
        {hasAcceptance ? "Deal Acceptance States" : "Conflict Network"}
      </div>
      {hasAcceptance && (
        <div className="absolute bottom-2 right-3 flex items-center gap-2">
          {[["accept", "#10b981", "Accept"], ["conditional", "#f59e0b", "Cond."], ["reject", "#ef4444", "Reject"]].map(([, color, label]) => (
            <div key={label} className="flex items-center gap-1 text-[8px] text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color as string }} />
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DealComparisonStrip({ deal }: { deal: { scores: unknown; stakeholderEvaluations: unknown; architecture: string } }) {
  const scores = deal.scores as DealScores | null;
  const evals = (deal.stakeholderEvaluations ?? {}) as Record<string, { verdict: string }>;

  const usVerdict = evals["united_states"] ?? evals["us"];
  const iranVerdict = evals["iran"];

  const verdictBadge = (v: string | undefined) => {
    if (!v) return <span className="text-[10px] text-muted-foreground">—</span>;
    const colors = { accept: "text-emerald-400", conditional: "text-amber-400", reject: "text-red-400" };
    return <span className={`text-[10px] font-bold capitalize ${colors[v as keyof typeof colors] ?? "text-foreground"}`}>{v}</span>;
  };

  return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      <div className="bg-secondary/30 rounded-sm p-3 text-center border-l-2 border-l-amber-500">
        <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1 font-bold">AI Deal Score</div>
        <div className="text-xl font-display font-bold text-amber-400">{((scores?.composite ?? 0) * 100).toFixed(0)}%</div>
        <div className="text-[9px] text-muted-foreground capitalize mt-0.5">{deal.architecture}</div>
      </div>
      <div className="bg-secondary/30 rounded-sm p-3 text-center border-l-2 border-l-blue-500">
        <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1 font-bold">🇺🇸 US Position</div>
        {verdictBadge(usVerdict?.verdict)}
        <div className="text-[9px] text-muted-foreground mt-0.5">Stakeholder eval</div>
      </div>
      <div className="bg-secondary/30 rounded-sm p-3 text-center border-l-2 border-l-red-500">
        <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1 font-bold">🇮🇷 Iran Position</div>
        {verdictBadge(iranVerdict?.verdict)}
        <div className="text-[9px] text-muted-foreground mt-0.5">Stakeholder eval</div>
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
    <div className="flex items-center gap-2 px-3 bg-primary/5 border-l-2 border-l-primary text-xs text-primary font-mono w-full h-8 overflow-hidden">
      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shrink-0" />
      <div className="relative flex-1 h-full overflow-hidden">
        <AnimatePresence mode="wait">
          {visible && (
            <motion.span
              key={idx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center truncate"
            >
              {TICKER_ITEMS[idx]}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
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
          <div className="flex-1 bg-secondary/50 h-1.5 overflow-hidden">
            <motion.div
              className="h-full"
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
  const totalUsd = costs.reduce((sum, c) => sum + (c.economic.totalUsd ?? 0), 0);
  const topCost = sorted[0];

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse rounded-sm">
        <div className="h-4 bg-secondary w-48 mb-4" />
        <div className="h-24 bg-secondary" />
      </Card>
    );
  }

  if (!costs.length) return null;

  return (
    <Card className="p-6 border-red-900/30 bg-gradient-to-br from-card to-red-950/10 rounded-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-0.5 h-8 bg-red-500 rounded-full" />
          <div>
            <h2 className="text-base font-bold">Cost-Benefit Analysis</h2>
            <p className="text-xs text-muted-foreground">War costs vs. peace benefits across stakeholders</p>
          </div>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-xl font-display font-bold text-red-400">$450B</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">War Cost/yr</div>
          </div>
          <div>
            <div className="text-xl font-display font-bold text-emerald-400">$560B</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Peace Gain/yr</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
          {sorted.slice(0, 4).map(c => {
            const val = c.economic.totalUsd ?? 0;
            const pct = totalUsd > 0 ? (val / totalUsd) * 100 : 0;
            return (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className="w-28 shrink-0 text-muted-foreground truncate font-mono text-[10px]">{c.stakeholderId.replace(/-/g, ' ')}</span>
                <div className="flex-1 bg-secondary/50 h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full bg-red-500"
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

      <p className="text-[10px] text-muted-foreground mt-4 italic border-t border-border/50 pt-3">
        A durable peace could swing the global economy by over <strong className="text-amber-400">$1T/yr</strong> — through trade normalization, energy risk reduction, shipping/insurance savings, and restored investment confidence.
      </p>

      <DataSourceNote
        compact
        title="Economic Data Sources"
        methodology="War-peace alternative states framework: each stakeholder's war cost and peace benefit are estimated per economic channel using IMF WEO 2024, World Bank commodity outlooks, UNCTAD trade data, and published sanctions cost estimates. Figures are researcher estimates, not audited accounts."
        sources={[
          { label: "IMF World Economic Outlook (2024)" },
          { label: "UNCTAD Trade & Development Report" },
          { label: "IEA World Energy Outlook (2024)" },
        ]}
        limitations={["Modeled estimates with inherent uncertainty. See full CBA page for per-stakeholder breakdowns and confidence ranges."]}
        className="mt-3"
      />

      <div className="mt-3 text-right">
        <Link to="/costs" className="text-xs text-primary hover:underline underline-offset-2">Full cost-benefit analysis →</Link>
      </div>
    </Card>
  );
}

const VERDICT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  accept:      { bg: "bg-emerald-950/40 border-emerald-700/40", text: "text-emerald-300", dot: "#10b981" },
  conditional: { bg: "bg-amber-950/40 border-amber-700/40",    text: "text-amber-300",   dot: "#f59e0b" },
  reject:      { bg: "bg-red-950/40 border-red-700/40",        text: "text-red-300",     dot: "#ef4444" },
};

const STAKEHOLDER_LABELS: Record<string, string> = {
  iran: "Iran", united_states: "US", us: "US", israel: "Israel",
  saudi_arabia: "KSA", russia: "Russia", china: "China", turkey: "Turkey",
  eu: "EU", uk: "UK", france: "France", germany: "Germany",
  hezbollah: "Hizbullah", hamas: "Hamas", houthis: "Houthis",
  uae: "UAE", iraq: "Iraq", qatar: "Qatar",
};

function StakeholderAcceptanceGrid({ evaluations }: {
  evaluations: Record<string, { verdict: string; rationale?: string }>;
}) {
  const entries = Object.entries(evaluations).slice(0, 12);
  if (entries.length === 0) return null;

  const counts = { accept: 0, conditional: 0, reject: 0 };
  for (const [, ev] of entries) counts[ev.verdict as keyof typeof counts]++;

  return (
    <div className="mt-4 pt-4 border-t border-border/30">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Stakeholder Acceptance</span>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-emerald-400">{counts.accept} accept</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-amber-400">{counts.conditional} conditional</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-red-400">{counts.reject} reject</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([stakeholderId, ev]) => {
          const cfg = VERDICT_COLORS[ev.verdict] ?? VERDICT_COLORS.reject;
          const label = STAKEHOLDER_LABELS[stakeholderId.toLowerCase().replace(/-/g, '_')] ?? stakeholderId;
          return (
            <div
              key={stakeholderId}
              title={ev.rationale ?? ev.verdict}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}
            >
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
              {label}
            </div>
          );
        })}
      </div>
    </div>
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
  const stakeholderEvals = (deal.stakeholderEvaluations ?? {}) as Record<string, { verdict: string; rationale?: string }>;

  return (
    <section>
      <Card className="p-6 border-amber-700/30 bg-gradient-to-br from-card to-amber-950/10 relative overflow-hidden rounded-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-0.5 h-8 bg-amber-500 rounded-full" />
            <Handshake className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="text-lg font-bold">Latest AI-Designed Peace Deal</h2>
              <Badge variant="outline" className="border-amber-700/40 text-amber-400 text-[10px] capitalize border-l-2">
                {deal.architecture} architecture
              </Badge>
              {deal.isPareto && (
                <Badge variant="outline" className="border-emerald-700/40 text-emerald-400 text-[10px] border-l-2">
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
                <div key={label} className="bg-secondary/30 rounded-sm p-2.5 text-center">
                  <div className={`text-xl font-display font-bold ${color}`}>
                    {(value * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-widest">{label}</div>
                </div>
              ))}
            </div>
            {Object.keys(stakeholderEvals).length > 0 && (
              <StakeholderAcceptanceGrid evaluations={stakeholderEvals} />
            )}
            <DataSourceNote
              compact
              title="Deal Scoring Methodology"
              methodology="Scores generated by an 8-stage multi-agent pipeline: Claude (generation), GPT-4o (evaluation), Gemini (adversarial red-team). Composite score is the weighted average of 7 dimensions. Stakeholder verdicts reflect simulated acceptance by each actor given their documented goals and red lines."
              sources={[
                { label: "Multi-model consensus", detail: "3 independent LLM providers" },
                { label: "7-dimension scoring", detail: "Feasibility, Coherence, Evidence, Domestic, Regional, Implementability, Durability" },
              ]}
              limitations={["AI-generated scores — not validated against real negotiation outcomes. See Deal Dashboard for full methodology."]}
              className="mt-3"
            />
            <div className="flex flex-wrap gap-3 mt-4">
              <Link to="/deals">
                <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700 text-white border-0 rounded-sm">
                  <Handshake className="w-3.5 h-3.5" /> View Deal Dashboard
                </Button>
              </Link>
              <Link to="/arena">
                <Button size="sm" variant="outline" className="gap-2 rounded-sm">
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
  const { data: currentDeal } = useGetCurrentDeal();
  const [selectedNode, setSelectedNode] = useState<string | null>("iran");

  const forecasts = latestRes?.data || [];
  const peaceProb = calculatePeaceProbability(forecasts);

  const stakeholderEvals = (currentDeal?.stakeholderEvaluations ?? {}) as Record<string, { verdict: string }>;
  const acceptanceMap: Record<string, string> = Object.fromEntries(
    Object.entries(stakeholderEvals).map(([k, v]) => [k.replace(/_/g, '-'), v.verdict])
  );

  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (peaceProb / 100) * circumference;

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      <section className="relative overflow-hidden border border-border/50 bg-card rounded-sm">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-card via-card/90 to-card" />
        </div>

        <div className="relative z-10 p-8 md:p-12 grid lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-5">
            <Badge variant="outline" className="bg-background/50 backdrop-blur-md border-l-primary/80 text-primary border-l-2">
              Live AI Geopolitical Analysis
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold font-display leading-tight">
              Forecasting <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Peace & Conflict</span> in Real-Time.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              AutoPeace uses continuous multi-agent LLM loops to analyze thousands of data points, forecasting outcomes for the Iran conflict with calibrated probabilistic precision. Its autoresearch mechanism mutates and scores its own prompt instructions each cycle — retaining only what improves accuracy.
            </p>
            <LiveTicker />
            <div className="flex flex-wrap gap-4 pt-2">
              <Link to="/forecasts">
                <Button size="lg" className="w-full sm:w-auto gap-2 rounded-sm">
                  View Latest Forecasts <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/methodology">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-background/50 backdrop-blur-sm rounded-sm">
                  Read Methodology
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <ConflictMap selectedId={selectedNode} onSelect={setSelectedNode} acceptanceMap={acceptanceMap} />
            {currentDeal && (
              <DealComparisonStrip deal={currentDeal as { scores: unknown; stakeholderEvaluations: unknown; architecture: string }} />
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border p-4 flex flex-col items-center rounded-sm">
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
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-lg font-bold">{forecastLoading ? "--" : peaceProb.toFixed(0)}<span className="text-xs">%</span></div>
                    <div className="text-[9px] text-muted-foreground text-center leading-tight uppercase tracking-wider font-bold">Peace<br/>Outlook</div>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-bold">30d Horizon</span>
                <span className="text-[8px] text-muted-foreground/50 mt-0.5 block">Bayesian posterior, multi-model consensus</span>
              </div>
              <div className="bg-card border border-border p-4 rounded-sm">
                {forecastLoading ? <div className="animate-pulse text-xs text-muted-foreground">Loading...</div> : <OutcomeSparkbar forecasts={forecasts} />}
                <p className="text-[8px] text-muted-foreground/50 mt-2 leading-relaxed">Probabilities across 8 MECE outcome states. Updated each research cycle via Claude + Gemini red-team + GPT-4o evaluation.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 rounded-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-0.5 h-6 bg-primary rounded-full" />
            <Crosshair className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-widest font-bold">Latest Brier Score</p>
          <h3 className="text-3xl font-display font-bold">{statsLoading ? "--" : stats?.latestBrierScore?.toFixed(3) || "N/A"}</h3>
          <p className="text-xs text-muted-foreground mt-2">Lower is better (0 = perfect)</p>
        </Card>
        <Card className="p-6 rounded-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-0.5 h-6 bg-blue-500 rounded-full" />
            <Cpu className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-widest font-bold">Research Cycles</p>
          <h3 className="text-3xl font-display font-bold">{statsLoading ? "--" : stats?.cyclesRun}</h3>
          <p className="text-xs text-muted-foreground mt-2">Continuous loops executed</p>
        </Card>
        <Card className="p-6 rounded-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-0.5 h-6 bg-emerald-500 rounded-full" />
            <TrendingDown className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-widest font-bold">Experiments Retained</p>
          <h3 className="text-3xl font-display font-bold">{statsLoading ? "--" : `${((stats?.retentionRate || 0) * 100).toFixed(0)}%`}</h3>
          <p className="text-xs text-muted-foreground mt-2">{stats?.retained} of {stats?.total} retained</p>
        </Card>
        <Card className="p-6 rounded-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-0.5 h-6 bg-purple-500 rounded-full" />
            <Gauge className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-widest font-bold">Tokens Processed</p>
          <h3 className="text-3xl font-display font-bold">{statsLoading ? "--" : new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(stats?.totalTokensConsumed || 0)}</h3>
          <p className="text-xs text-muted-foreground mt-2">Total LLM context analyzed</p>
        </Card>
      </section>

      <p className="text-[9px] text-muted-foreground/50 text-center -mt-2 italic">
        Pipeline metrics are computed from the autoresearch cycle log. Brier scores measure probabilistic calibration (0 = perfect forecast, 1 = worst). Retention rate reflects the fraction of prompt mutations that improved backtested accuracy.
      </p>

      <DealHeroSection />

      <section>
        <CostOfWarSection />
      </section>

      <section>
        <div className="mb-8">
          <h2 className="text-2xl font-bold font-display uppercase tracking-tight">Intelligence Pipeline</h2>
          <p className="text-muted-foreground mt-1">How AutoPeace turns global noise into calibrated signal.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-px bg-gradient-to-r from-border via-primary/50 to-border" />
          <Card className="p-8 relative rounded-sm">
            <div className="w-10 h-10 border border-primary flex items-center justify-center mb-6 bg-primary/5">
              <span className="font-bold text-lg text-primary font-mono">1</span>
            </div>
            <h3 className="text-xl font-bold mb-3 uppercase tracking-tight">Evidence Ingestion</h3>
            <p className="text-muted-foreground text-sm">
              We continuously scrape ACLED, GDELT, and global news feeds, filtering for relevance to 28 key stakeholders in the Iran conflict theater.
            </p>
          </Card>
          <Card className="p-8 relative rounded-sm">
            <div className="w-10 h-10 border border-primary flex items-center justify-center mb-6 bg-primary/5">
              <span className="font-bold text-lg text-primary font-mono">2</span>
            </div>
            <h3 className="text-xl font-bold mb-3 uppercase tracking-tight">Cross-Model Red Teaming</h3>
            <p className="text-muted-foreground text-sm">
              Anthropic generates initial Bayesian forecasts. Gemini aggressively critiques them. OpenAI evaluates the critique. The forecast updates.
            </p>
          </Card>
          <Card className="p-8 relative rounded-sm">
            <div className="w-10 h-10 border border-primary flex items-center justify-center mb-6 bg-primary/5">
              <span className="font-bold text-lg text-primary font-mono">3</span>
            </div>
            <h3 className="text-xl font-bold mb-3 uppercase tracking-tight">Evolution & Scoring</h3>
            <p className="text-muted-foreground text-sm">
              The agent mutates its own prompt instructions. If a mutated prompt produces better backtested Brier scores, the new prompt is retained forever.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
