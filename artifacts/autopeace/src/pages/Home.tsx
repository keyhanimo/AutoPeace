import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, Users, FileText, ExternalLink } from "lucide-react";
import { useGetLatestForecasts, useGetCurrentDeal, useListProposals, useGetCurrentDealNarrative, type Forecast, type DealScores, type Proposal } from "@workspace/api-client-react";
import { Card, Button, Badge } from "@/components/ui";

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


function calculatePeaceProbability(forecasts: Forecast[]): number {
  if (!forecasts || forecasts.length === 0) return 0;
  const f30 = forecasts.find(f => f.timeHorizon === '10d') ?? forecasts.find(f => f.timeHorizon === '30d') ?? forecasts[0];
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
  const f30 = forecasts.find(f => f.timeHorizon === '10d') ?? forecasts.find(f => f.timeHorizon === '30d') ?? forecasts[0];
  if (!f30) return null;
  const probs = Object.entries(f30.probabilities)
    .sort((a, b) => b[1] - a[1])
;

  return (
    <div className="space-y-2.5 w-full">
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">10-Day Outcome Distribution</p>
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


function ChampionDealNarrative() {
  const { data: initial, isLoading: initialLoading } = useGetCurrentDealNarrative();

  const needsGeneration = initial && !initial.narrative && !initial.generating;

  const { data: generated, isLoading: generating } = useGetCurrentDealNarrative(
    { generate: "true" },
    { query: { enabled: !!needsGeneration } },
  );

  const data = generated?.narrative ? generated : initial;
  const isLoading = initialLoading;
  const isGenerating = generating && needsGeneration;

  if (isLoading) {
    return (
      <div className="border border-border/50 bg-card rounded-sm p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-secondary/50 rounded w-1/3" />
          <div className="h-3 bg-secondary/30 rounded w-full" />
          <div className="h-3 bg-secondary/30 rounded w-5/6" />
          <div className="h-3 bg-secondary/30 rounded w-4/5" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (!data.narrative) {
    if (isGenerating) {
      return (
        <section className="border border-border/50 bg-card rounded-sm p-6 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Champion Deal Summary</h2>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Generating narrative summary of the champion deal...
          </div>
        </section>
      );
    }
    return null;
  }

  const compositePct = data.composite != null ? Math.round(data.composite * 100) : null;
  const label = data.composite != null ? scoreLabel(data.composite) : null;

  return (
    <section className="border border-border/50 bg-card rounded-sm p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary shrink-0" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Champion Deal Summary</h2>
        </div>
        {compositePct != null && label && (
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-semibold ${label.color}`}>{label.text}</span>
            <span className="text-lg font-bold font-mono">{compositePct}%</span>
          </div>
        )}
      </div>

      {data.architecture && (
        <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
          {data.architecture.replace(/-/g, " ")}
        </Badge>
      )}

      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {data.narrative}
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        <span className="text-[10px] text-muted-foreground/60">
          {data.createdAt ? new Date(data.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : ""}
        </span>
        <Link
          to={`/deals/${data.dealId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          See Full Details <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </section>
  );
}

export default function Home() {
  const { data: latestRes, isLoading: forecastLoading } = useGetLatestForecasts();
  const { data: currentDeal } = useGetCurrentDeal();
  const { data: proposalsRes } = useListProposals();
  const forecasts = latestRes?.data || [];
  const peaceProb = calculatePeaceProbability(forecasts);
  const lastUpdated = forecasts.length > 0
    ? forecasts.reduce((latest, f) => {
        const t = new Date(f.createdAt ?? 0).getTime();
        return t > latest ? t : latest;
      }, 0)
    : null;

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

        <div className="relative z-10 p-6 md:p-8">
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-3">
              <Badge variant="outline" className="bg-background/50 backdrop-blur-md border-l-primary/80 text-primary border-l-2">
                Live AI Geopolitical Analysis
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold font-display leading-tight">
                Can AI Design a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">Better Peace Deal</span> Than Humans?
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg">
                AutoPeace uses multi-agent AI systems to continuously forecast conflict outcomes, generate novel peace proposals, and rigorously evaluate them through a 9-stage pipeline of adversarial stress-testing, stakeholder simulation, and independent judicial scoring — then crafts tailored strategies for selling each proposal to 23 different stakeholders.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link to="/deals/history">
                  <Button size="sm" className="gap-1.5 rounded-sm">
                    Browse All Deals <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/arena">
                  <Button variant="outline" size="sm" className="bg-background/50 backdrop-blur-sm rounded-sm">
                    Proposal Arena
                  </Button>
                </Link>
                <Link to="/methodology">
                  <Button variant="outline" size="sm" className="bg-background/50 backdrop-blur-sm rounded-sm">
                    Methodology
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-card/80 border border-border/50 rounded-sm p-4">
              <div className="mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider">AI vs Human Proposals</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Composite score — same 7-dimension evaluation by 3 independent AI judges</p>
              </div>
              <AIvsHumanChart
                aiDeal={currentDeal as { scores: unknown; architecture: string } | null}
                humanProposals={humanProposals}
              />
              <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/30">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <div className="w-2 h-2 rounded-sm bg-blue-500" />
                  AI-Generated
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <div className="w-2 h-2 rounded-sm bg-amber-500" />
                  Human Proposal
                </div>
                <div className="flex-1" />
              </div>
            </div>
          </div>

          <div className="mt-5 bg-card border border-border p-4 rounded-sm flex flex-col sm:flex-row gap-5 items-center">
            <div className="flex flex-col items-center shrink-0">
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
                  <div className="text-[10px] text-muted-foreground text-center leading-tight uppercase tracking-wider font-bold">Peace<br/>Outlook</div>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-widest font-bold">10-Day Horizon</span>
              <span className="text-[9px] text-muted-foreground/70 mt-0.5 text-center max-w-[120px] leading-tight">Sum of 4 peace-outcome probabilities</span>
            </div>
            <div className="w-px h-20 bg-border/50 hidden sm:block shrink-0" />
            <div className="flex-1 min-w-0 w-full">
              {forecastLoading ? <div className="animate-pulse text-xs text-muted-foreground">Loading...</div> : <OutcomeSparkbar forecasts={forecasts} />}
            </div>
          </div>
          {lastUpdated && (
            <div className="mt-4 text-right">
              <span className="text-[11px] text-muted-foreground/60">
                Last updated: {new Date(lastUpdated).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
            </div>
          )}
        </div>
      </section>

      <ChampionDealNarrative />

    </div>
  );
}
