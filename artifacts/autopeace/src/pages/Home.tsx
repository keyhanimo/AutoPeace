import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Crosshair, Cpu, TrendingDown, Gauge, Handshake, Swords, Trophy, Users } from "lucide-react";
import { useGetExperimentStats, useGetLatestForecasts, useListCosts, useGetCurrentDeal, useListProposals, type Forecast, type DealScores, type Proposal } from "@workspace/api-client-react";
import { Card, Button, Badge } from "@/components/ui";
import { DataSourceNote } from "@/components/DataSourceNote";

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


function scoreLabel(score: number) {
  if (score >= 0.65) return { text: "Viable", color: "text-emerald-400" };
  if (score >= 0.45) return { text: "Marginal", color: "text-amber-400" };
  return { text: "Weak", color: "text-red-400" };
}

function AIvsHumanChart({ aiDeal, humanProposals }: { aiDeal: { scores: unknown; architecture: string } | null; humanProposals: Proposal[] }) {
  const aiComposite = aiDeal ? ((aiDeal.scores as DealScores | null)?.composite ?? 0) : 0;
  const aiPct = Math.round(aiComposite * 100);
  const aiLabel = scoreLabel(aiComposite);

  const entries: { name: string; score: number; pct: number; color: string; isAI: boolean; label: ReturnType<typeof scoreLabel> }[] = [];

  for (const p of humanProposals.slice(0, 2)) {
    const s = (p.scores as DealScores | null)?.composite ?? 0;
    const pct = Math.round(s * 100);
    entries.push({ name: p.name ?? "Human Proposal", score: s, pct, color: "#f59e0b", isAI: false, label: scoreLabel(s) });
  }

  if (aiDeal) {
    entries.push({ name: "AI Autoresearch Champion", score: aiComposite, pct: aiPct, color: "#3b82f6", isAI: true, label: aiLabel });
  }

  entries.sort((a, b) => a.score - b.score);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {entry.isAI ? <Trophy className="w-4 h-4 text-blue-400 shrink-0" /> : <Users className="w-4 h-4 text-amber-400 shrink-0" />}
              <span className="text-sm font-semibold text-foreground truncate">{entry.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className={`text-xs font-semibold ${entry.label.color}`}>{entry.label.text}</span>
              <span className="text-base font-bold font-mono text-foreground">{entry.pct}%</span>
            </div>
          </div>
          <div className="h-6 bg-secondary/40 rounded-sm overflow-hidden relative">
            <motion.div
              className="h-full rounded-sm"
              style={{ backgroundColor: entry.color }}
              initial={{ width: 0 }}
              animate={{ width: `${(entry.pct / 100) * 100}%` }}
              transition={{ duration: 1.2, delay: i * 0.15, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
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

const OUTCOME_LABELS: Record<string, string> = {
  continued_conflict: 'Continued Conflict',
  major_escalation: 'Major Escalation',
  informal_deescalation: 'Informal De-escalation',
  limited_ceasefire: 'Limited Ceasefire',
  humanitarian_mini_deal: 'Humanitarian Deal',
  sanctions_partial_deal: 'Sanctions Deal',
  regional_framework: 'Regional Framework',
  broad_settlement: 'Broad Settlement',
};

function OutcomeSparkbar({ forecasts }: { forecasts: Forecast[] }) {
  const f90 = forecasts.find(f => f.timeHorizon === '90d');
  if (!f90) return null;
  const probs = Object.entries(f90.probabilities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-2.5 w-full">
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">90-Day Outcome Distribution</p>
      {probs.map(([key, val]) => (
        <div key={key} className="flex items-center gap-3">
          <div className="w-40 shrink-0 text-xs text-muted-foreground capitalize">{OUTCOME_LABELS[key] ?? key.replace(/_/g, ' ')}</div>
          <div className="flex-1 bg-secondary/50 h-2.5 overflow-hidden rounded-sm">
            <motion.div
              className="h-full rounded-sm"
              style={{ backgroundColor: OUTCOME_COLORS[key] ?? '#94a3b8' }}
              initial={{ width: 0 }}
              animate={{ width: `${(val * 100).toFixed(1)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="w-9 text-right text-xs font-mono text-foreground shrink-0">{(val * 100).toFixed(0)}%</div>
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
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-0.5 h-10 bg-red-500 rounded-full" />
          <div>
            <h2 className="text-xl font-bold">Cost-Benefit Analysis</h2>
            <p className="text-sm text-muted-foreground">War costs vs. peace benefits across stakeholders</p>
          </div>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <div className="text-2xl font-display font-bold text-red-400">$450B</div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest">War Cost/yr</div>
          </div>
          <div>
            <div className="text-2xl font-display font-bold text-emerald-400">$560B</div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest">Peace Gain/yr</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
          {sorted.slice(0, 4).map(c => {
            const val = c.economic.totalUsd ?? 0;
            const pct = totalUsd > 0 ? (val / totalUsd) * 100 : 0;
            return (
              <div key={c.id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-muted-foreground truncate font-mono text-xs capitalize">{c.stakeholderId.replace(/-/g, ' ')}</span>
                <div className="flex-1 bg-secondary/50 h-3 overflow-hidden rounded-sm">
                  <motion.div
                    className="h-full bg-red-500 rounded-sm"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct.toFixed(1)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <span className="w-16 text-right font-mono text-sm font-semibold text-foreground shrink-0">${(val / 1e9).toFixed(1)}B</span>
              </div>
            );
          })}
        </div>

      <p className="text-xs text-muted-foreground mt-5 italic border-t border-border/50 pt-3">
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
    <div className="mt-5 pt-4 border-t border-border/30">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Stakeholder Acceptance</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-emerald-400">{counts.accept} accept</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-amber-400">{counts.conditional} conditional</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-red-400">{counts.reject} reject</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {entries.map(([stakeholderId, ev]) => {
          const cfg = VERDICT_COLORS[ev.verdict] ?? VERDICT_COLORS.reject;
          const label = STAKEHOLDER_LABELS[stakeholderId.toLowerCase().replace(/-/g, '_')] ?? stakeholderId;
          return (
            <div
              key={stakeholderId}
              title={ev.rationale ?? ev.verdict}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${cfg.bg} ${cfg.text}`}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
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
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold font-display">AI Autoresearch Champion</h2>
              <Badge variant="outline" className="border-amber-700/40 text-amber-400 text-xs capitalize border-l-2 px-2.5 py-1">
                {deal.architecture} architecture
              </Badge>
              <Badge variant="outline" className="border-cyan-700/40 text-cyan-400 text-xs border-l-2 px-2.5 py-1">
                Task B champion
              </Badge>
              {deal.isPareto && (
                <Badge variant="outline" className="border-emerald-700/40 text-emerald-400 text-xs border-l-2 px-2.5 py-1">
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
                <div key={label} className="bg-secondary/30 rounded-sm p-4 text-center">
                  <div className={`text-3xl font-display font-bold ${color}`}>
                    {(value * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">{label}</div>
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
  const { data: proposalsRes } = useListProposals();
  const forecasts = latestRes?.data || [];
  const peaceProb = calculatePeaceProbability(forecasts);

  const allProposals = (proposalsRes?.data ?? []) as Proposal[];
  const humanProposals = allProposals
    .filter(p => p.source !== "ai" && p.scores)
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 2);

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
              Can AI Design a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">Better Peace Deal</span> Than Humans?
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              AutoPeace continuously generates and stress-tests peace proposals for the Iran conflict using a multi-agent AI pipeline — then scores them against real-world human proposals on the same 7 dimensions. See how they compare.
            </p>
            <LiveTicker />
            <div className="flex flex-wrap gap-4 pt-2">
              <Link to="/arena">
                <Button size="lg" className="w-full sm:w-auto gap-2 rounded-sm">
                  Compare in Proposal Arena <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/methodology">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-background/50 backdrop-blur-sm rounded-sm">
                  Read Methodology
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-card/80 border border-border/50 rounded-sm p-5">
              <div className="mb-4">
                <h3 className="text-base font-bold uppercase tracking-wider">AI vs Human Proposals</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Composite score — same 7-dimension evaluation by 3 independent AI judges</p>
              </div>
              <AIvsHumanChart
                aiDeal={currentDeal as { scores: unknown; architecture: string } | null}
                humanProposals={humanProposals}
              />
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                  AI-Generated
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                  Human Proposal
                </div>
                <div className="flex-1" />
                <div className="text-xs text-muted-foreground/60">
                  Scored by Anthropic + OpenAI + Gemini
                </div>
              </div>
            </div>

            <div className="bg-card border border-border p-5 rounded-sm flex flex-col sm:flex-row gap-6 items-center">
              <div className="flex flex-col items-center shrink-0">
                <div className="relative w-28 h-28">
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
                    <div className="text-xl font-bold">{forecastLoading ? "--" : peaceProb.toFixed(0)}<span className="text-sm">%</span></div>
                    <div className="text-[11px] text-muted-foreground text-center leading-tight uppercase tracking-wider font-bold">Peace<br/>Outlook</div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground mt-2 uppercase tracking-widest font-bold">30d Horizon</span>
                <span className="text-[10px] text-muted-foreground/70 mt-1 text-center max-w-[140px] leading-tight">Sum of 4 peace-outcome probabilities from AI forecast</span>
              </div>
              <div className="w-px h-24 bg-border/50 hidden sm:block shrink-0" />
              <div className="flex-1 min-w-0 w-full">
                {forecastLoading ? <div className="animate-pulse text-xs text-muted-foreground">Loading...</div> : <OutcomeSparkbar forecasts={forecasts} />}
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

      <p className="text-xs text-muted-foreground/60 text-center -mt-2 italic">
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
              We continuously scrape ACLED, GDELT, and global news feeds, filtering for relevance to 32 key stakeholders in the Iran conflict theater.
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
