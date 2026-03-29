import React, { useState, useMemo } from "react";
import { useGetCurrentDeal, useGetParetoDeals, useListDeals, useGetSolutionTree, type Deal, type DealScores } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, PageHeader, Badge } from "@/components/ui";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, Cell, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import { AlertCircle, Shield, Zap, Globe, Heart, TrendingUp, CheckCircle2, XCircle, AlertTriangle, GitBranch } from "lucide-react";
import { motion } from "framer-motion";
function getBaseUrl() {
  return window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
}

const SCORE_DIMENSIONS: { key: keyof DealScores; label: string; color: string; icon: React.ReactNode }[] = [
  { key: "feasibility", label: "Feasibility", color: "#10b981", icon: <CheckCircle2 className="w-4 h-4" /> },
  { key: "coherence", label: "Coherence", color: "#0284c7", icon: <GitBranch className="w-4 h-4" /> },
  { key: "evidenceGrounding", label: "Evidence", color: "#f59e0b", icon: <TrendingUp className="w-4 h-4" /> },
  { key: "domesticSellability", label: "Domestic", color: "#8b5cf6", icon: <Globe className="w-4 h-4" /> },
  { key: "regionalStability", label: "Regional", color: "#06b6d4", icon: <Shield className="w-4 h-4" /> },
  { key: "implementability", label: "Implement.", color: "#f97316", icon: <Zap className="w-4 h-4" /> },
  { key: "durability", label: "Durability", color: "#ec4899", icon: <Heart className="w-4 h-4" /> },
];

const ARCHITECTURE_COLORS: Record<string, string> = {
  balanced: "#10b981",
  "nuclear-first": "#f59e0b",
  "hormuz-first": "#0284c7",
  "humanitarian-first": "#ec4899",
};

function scoreColor(score: number): string {
  if (score >= 0.65) return "text-emerald-400";
  if (score >= 0.45) return "text-amber-400";
  return "text-red-400";
}

function ScoreCard({ dimension, score }: { dimension: typeof SCORE_DIMENSIONS[number]; score: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: dimension.color }}>{dimension.icon}</span>
        <span className="text-sm font-medium">{dimension.label}</span>
      </div>
      <div className={`text-2xl font-display font-bold ${scoreColor(score)}`}>
        {(score * 100).toFixed(0)}%
      </div>
      <div className="mt-2 bg-secondary/50 rounded h-1.5 overflow-hidden">
        <motion.div
          className="h-full rounded"
          style={{ backgroundColor: dimension.color }}
          initial={{ width: 0 }}
          animate={{ width: `${(score * 100).toFixed(1)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </Card>
  );
}

function StakeholderMap({ evaluations }: { evaluations: Record<string, { verdict: string; rationale: string }> }) {
  const [selected, setSelected] = useState<string | null>(null);

  const entries = Object.entries(evaluations);
  const accepts = entries.filter(([, e]) => e.verdict === "accept").length;
  const conditionals = entries.filter(([, e]) => e.verdict === "conditional").length;
  const rejects = entries.filter(([, e]) => e.verdict === "reject").length;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" /> {accepts} Accept</span>
        <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3 h-3" /> {conditionals} Conditional</span>
        <span className="flex items-center gap-1 text-red-400"><XCircle className="w-3 h-3" /> {rejects} Reject</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {entries.map(([id, evaluation]) => {
          const isSelected = selected === id;
          const color = evaluation.verdict === "accept" ? "border-emerald-500/50 bg-emerald-950/20" :
            evaluation.verdict === "reject" ? "border-red-500/50 bg-red-950/20" :
              "border-amber-500/50 bg-amber-950/20";
          const textColor = evaluation.verdict === "accept" ? "text-emerald-400" :
            evaluation.verdict === "reject" ? "text-red-400" : "text-amber-400";

          return (
            <button
              key={id}
              onClick={() => setSelected(isSelected ? null : id)}
              className={`p-3 rounded-lg border text-left transition-all ${color} ${isSelected ? "ring-1 ring-primary" : ""}`}
            >
              <div className="text-xs font-mono font-bold capitalize text-foreground truncate">{id.replace(/-/g, " ")}</div>
              <div className={`text-[10px] ${textColor} font-medium capitalize mt-1`}>{evaluation.verdict}</div>
            </button>
          );
        })}
      </div>
      {selected && evaluations[selected] && (
        <Card className="p-4 border-primary/30">
          <h4 className="text-sm font-bold capitalize mb-2">{selected.replace(/-/g, " ")}</h4>
          <p className="text-xs text-muted-foreground">{evaluations[selected]?.rationale}</p>
        </Card>
      )}
    </div>
  );
}

function SolutionTreeView({ nodes }: { nodes: Array<{ id: string; architecture: string; depth: number; isStalled: boolean; isBestInBranch: boolean; compositeScore?: string | null; branchLabel: string }> }) {
  const byDepth = useMemo(() => {
    const groups: Record<number, typeof nodes> = {};
    for (const n of nodes) {
      if (!groups[n.depth]) groups[n.depth] = [];
      groups[n.depth]!.push(n);
    }
    return groups;
  }, [nodes]);

  if (nodes.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">No solution tree nodes yet. Run a deal cycle to start exploring.</p>;
  }

  return (
    <div className="space-y-4 overflow-x-auto">
      {Object.entries(byDepth).map(([depth, depthNodes]) => (
        <div key={depth} className="flex gap-2 items-start">
          <div className="w-8 text-xs text-muted-foreground shrink-0 text-right pt-2">L{depth}</div>
          <div className="flex gap-2 flex-wrap flex-1">
            {depthNodes.map(node => (
              <div
                key={node.id}
                className={`p-2 rounded-lg border text-xs min-w-[120px] ${node.isStalled ? "border-red-800/40 bg-red-950/10 opacity-60" : node.isBestInBranch ? "border-emerald-600/50 bg-emerald-950/20" : "border-border bg-card"}`}
              >
                <div className="font-mono font-bold capitalize text-[10px]" style={{ color: ARCHITECTURE_COLORS[node.architecture] ?? "#94a3b8" }}>
                  {node.architecture}
                </div>
                <div className="text-foreground mt-0.5">{node.branchLabel}</div>
                {node.compositeScore && (
                  <div className="text-muted-foreground text-[10px] mt-1">Score: {node.compositeScore}</div>
                )}
                {node.isStalled && <div className="text-red-400 text-[10px]">⚠ Stalled</div>}
                {node.isBestInBranch && <div className="text-emerald-400 text-[10px]">★ Best</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type WhatIfImpact = {
  proposalId: string;
  proposalName: string;
  viabilityDelta: number;
  projectedComposite: number;
  favorabilityNote: string;
};

type WhatIfScenario = {
  id: string;
  name: string;
  description: string;
  triggerCondition: string;
  proposalImpacts?: WhatIfImpact[];
};

function DealWhatIfPanel({ currentDealName }: { currentDealName?: string }) {
  const { data, isLoading } = useQuery<WhatIfScenario[]>({
    queryKey: ["scenarios"],
    queryFn: async () => {
      const res = await fetch(`${getBaseUrl()}/api/scenarios`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  const [selected, setSelected] = useState<string>("");
  const scenarios = data ?? [];
  const scenario = scenarios.find(s => s.id === selected) ?? scenarios[0] ?? null;

  if (isLoading) {
    return (
      <Card className="p-5">
        <div className="h-4 bg-muted rounded animate-pulse w-48 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-3 bg-muted rounded animate-pulse" />)}
        </div>
      </Card>
    );
  }

  if (!scenario) return null;

  const impacts = scenario.proposalImpacts ?? [];

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Scenario: Deal Viability Impact
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            How each hypothetical scenario shifts deal and proposal viability scores
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {scenarios.map(s => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              (scenario.id === s.id)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-1">
        <p className="font-medium">{scenario.description}</p>
        <p className="text-muted-foreground"><span className="font-semibold">Trigger:</span> {scenario.triggerCondition}</p>
      </div>

      {impacts.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Proposal Viability Under Scenario</p>
          {impacts
            .sort((a, b) => b.viabilityDelta - a.viabilityDelta)
            .map(impact => (
              <div
                key={impact.proposalId}
                className={`flex items-center justify-between p-2 rounded border text-xs ${
                  impact.proposalId === currentDealName ? "border-primary/50 bg-primary/5" : "border-border/40"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{impact.proposalName}</p>
                  <p className="text-muted-foreground">{impact.favorabilityNote}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className={`font-bold ${impact.viabilityDelta > 0 ? "text-green-500" : impact.viabilityDelta < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                    {impact.viabilityDelta > 0 ? "+" : ""}{(impact.viabilityDelta * 100).toFixed(0)}pp
                  </p>
                  <p className="text-muted-foreground">{(impact.projectedComposite * 100).toFixed(0)}/100</p>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No proposals have been scored yet — run deal cycles to populate viability data.</p>
      )}
    </Card>
  );
}

export default function DealDashboard() {
  const { data: currentDeal, isLoading: currentLoading, isError: currentError } = useGetCurrentDeal();
  const { data: paretoRes } = useGetParetoDeals();
  const { data: historyRes } = useListDeals({ limit: 30 });
  const { data: treeRes } = useGetSolutionTree();

  const [activeTab, setActiveTab] = useState<"terms" | "stakeholders" | "domestic" | "redteam" | "pareto" | "tree" | "history" | "comparison" | "robustness">("terms");

  const scores = currentDeal?.scores as DealScores | null ?? null;
  const stakeholderEvals = currentDeal?.stakeholderEvaluations as Record<string, { verdict: string; rationale: string }> | null ?? {};
  const redTeamResults = currentDeal?.redTeamResults as Array<{ attack: string; severity: string; response: string; survived: boolean }> | null ?? [];
  const domesticEvals = currentDeal?.domesticEvaluations as Record<string, { audience: string; verdict: string; rationale: string }> | null ?? {};

  const radarData = useMemo(() => {
    if (!scores) return [];
    return SCORE_DIMENSIONS.map(d => ({
      dimension: d.label,
      score: Math.round((scores[d.key] ?? 0) * 100),
    }));
  }, [scores]);

  const historyData = useMemo(() => {
    return (historyRes?.data ?? [])
      .filter((d): d is Deal & { scores: DealScores } => d.scores !== null)
      .slice(0, 20)
      .reverse()
      .map((d, i) => ({
        index: `#${i + 1}`,
        composite: Math.round((d.scores.composite ?? 0) * 100),
        architecture: d.architecture,
      }));
  }, [historyRes]);

  const paretoDeals = paretoRes?.data ?? [];
  const treeNodes = treeRes?.nodes ?? [];

  const TABS = [
    { key: "terms", label: "Deal Terms" },
    { key: "stakeholders", label: "Stakeholders" },
    { key: "domestic", label: "Domestic" },
    { key: "redteam", label: "Red Team" },
    { key: "comparison", label: "Comparison" },
    { key: "robustness", label: "Robustness" },
    { key: "pareto", label: "Pareto" },
    { key: "tree", label: "Solution Tree" },
    { key: "history", label: "History" },
  ] as const;

  if (currentLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-20 bg-card rounded-2xl" />
        <div className="h-96 bg-card rounded-2xl" />
      </div>
    );
  }

  if (currentError || !currentDeal) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Deal Dashboard" description="AI-generated peace deal explorer — Task B." />
        <Card className="p-12 text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-bold">No AI Deal Generated Yet</h3>
          <p className="text-muted-foreground max-w-md">
            The deal engine has not run yet. Go to the Admin panel and click "Run Deal Cycle" to generate the first AI-proposed peace deal.
          </p>
        </Card>
      </div>
    );
  }

  const terms = currentDeal.terms as Record<string, unknown>;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Deal Dashboard"
        description="AI-generated peace deal — Task B multi-agent pipeline. See how geopolitical scenarios shift deal and proposal viability."
      >
        <Badge variant="outline" className="border-primary/40 text-primary capitalize">
          {currentDeal.architecture} architecture
        </Badge>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center col-span-2 sm:col-span-1">
          <div className={`text-3xl font-display font-bold ${scoreColor(scores?.composite ?? 0)}`}>
            {scores ? `${((scores.composite ?? 0) * 100).toFixed(0)}%` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Composite Score</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-display font-bold text-emerald-400">
            {Object.values(stakeholderEvals).filter(e => e.verdict === "accept").length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Accept</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-display font-bold text-red-400">
            {Object.values(stakeholderEvals).filter(e => e.verdict === "reject").length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Reject</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-display font-bold text-amber-400">
            {paretoDeals.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Pareto Deals</div>
        </Card>
      </div>

      <div className="flex overflow-x-auto gap-1 bg-secondary/50 p-1 rounded-xl w-full">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === tab.key ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "terms" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {scores && SCORE_DIMENSIONS.map(d => (
              <ScoreCard key={d.key} dimension={d} score={scores[d.key] ?? 0} />
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Score Radar</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                    <Radar name="Score" dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }} formatter={(v: number) => [`${v}%`]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Deal Terms</h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: "Nuclear Protocol", key: "nuclearProtocol" },
                  { label: "Sanctions Relief", key: "sanctionsRelief" },
                  { label: "Maritime Security", key: "hormuzArrangements" },
                  { label: "Humanitarian", key: "humanitarianProvisions" },
                  { label: "Verification", key: "verificationMechanism" },
                  { label: "Timeline", key: "timelineYears" },
                  { label: "Sequencing", key: "sequencing" },
                ].map(({ label, key }) => (
                  <div key={key} className="border-b border-border/30 pb-2 last:border-0">
                    <span className="text-xs text-primary font-semibold uppercase tracking-wider block">{label}</span>
                    <span className="text-xs text-muted-foreground">
                      {key === "timelineYears" ? `${terms[key] ?? "?"} years` : String(terms[key] ?? "—").slice(0, 200)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {currentDeal.diagnosis && (
            <Card className="p-6 border-amber-800/30 bg-amber-950/10">
              <h3 className="text-base font-bold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> AI Diagnosis
              </h3>
              <p className="text-sm text-muted-foreground">{currentDeal.diagnosis}</p>
            </Card>
          )}
        </div>
      )}

      {activeTab === "stakeholders" && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Stakeholder Acceptance Map</h3>
          <StakeholderMap evaluations={stakeholderEvals} />
        </Card>
      )}

      {activeTab === "domestic" && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Domestic Sellability</h3>
          <div className="space-y-3">
            {Object.entries(domesticEvals).map(([key, ev]) => {
              const verdict = typeof ev === "object" && ev && "verdict" in ev ? String(ev.verdict) : "unknown";
              const audience = typeof ev === "object" && ev && "audience" in ev ? String(ev.audience) : key;
              const rationale = typeof ev === "object" && ev && "rationale" in ev ? String(ev.rationale) : "";
              const color = verdict === "sellable" ? "text-emerald-400 border-emerald-800/40" :
                verdict === "unsellable" ? "text-red-400 border-red-800/40" : "text-amber-400 border-amber-800/40";
              return (
                <div key={key} className={`p-3 rounded-lg border ${color}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{audience}</span>
                    <span className={`text-xs font-bold capitalize ${color.split(" ")[0]}`}>{verdict}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{rationale}</p>
                </div>
              );
            })}
            {Object.keys(domesticEvals).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No domestic evaluations recorded yet.</p>
            )}
          </div>
        </Card>
      )}

      {activeTab === "redteam" && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Red Team Results</h3>
          <div className="space-y-3">
            {redTeamResults.map((r, i) => (
              <div key={i} className={`p-4 rounded-lg border ${r.survived ? "border-emerald-800/40 bg-emerald-950/10" : "border-red-800/40 bg-red-950/10"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${r.severity === "critical" ? "bg-red-900/50 text-red-400" : r.severity === "high" ? "bg-orange-900/50 text-orange-400" : "bg-amber-900/50 text-amber-400"}`}>
                    {r.severity}
                  </span>
                  <span className={`text-xs font-bold ${r.survived ? "text-emerald-400" : "text-red-400"}`}>
                    {r.survived ? "✓ Survived" : "✗ Failed"}
                  </span>
                </div>
                <p className="text-sm text-foreground mb-1">{r.attack}</p>
                <p className="text-xs text-muted-foreground">{r.response}</p>
              </div>
            ))}
            {redTeamResults.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No red team results yet.</p>
            )}
          </div>
        </Card>
      )}

      {activeTab === "comparison" && (
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Multi-Deal Comparison
            </h3>
            <p className="text-xs text-muted-foreground mb-4">All scored deals ranked by composite score — see where each architecture excels and falls short.</p>
            {(historyRes?.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No deals to compare yet. Run more deal cycles.</p>
            ) : (
              <>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(historyRes?.data ?? [])
                        .filter(d => d.scores)
                        .sort((a, b) => ((b.scores as DealScores).composite ?? 0) - ((a.scores as DealScores).composite ?? 0))
                        .slice(0, 10)
                        .map((d, i) => {
                          const s = d.scores as DealScores;
                          return {
                            name: `#${i + 1} ${d.architecture.slice(0, 8)}`,
                            composite: Math.round((s.composite ?? 0) * 100),
                            feasibility: Math.round((s.feasibility ?? 0) * 100),
                            domestic: Math.round((s.domesticSellability ?? 0) * 100),
                            durability: Math.round((s.durability ?? 0) * 100),
                            isCurrent: d.isCurrent,
                          };
                        })}
                      margin={{ top: 10, right: 10, left: 0, bottom: 50 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }} formatter={(v: number) => [`${v}%`]} />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                      <Bar dataKey="composite" name="Composite" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="feasibility" name="Feasibility" fill="#10b981" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="domestic" name="Domestic" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="durability" name="Durability" fill="#ec4899" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Architecture</th>
                        {SCORE_DIMENSIONS.map(d => (
                          <th key={d.key} className="text-center py-2 px-2 text-muted-foreground font-medium">{d.label}</th>
                        ))}
                        <th className="text-center py-2 px-2 text-muted-foreground font-medium">Composite</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(historyRes?.data ?? [])
                        .filter(d => d.scores)
                        .sort((a, b) => ((b.scores as DealScores).composite ?? 0) - ((a.scores as DealScores).composite ?? 0))
                        .slice(0, 8)
                        .map(d => {
                          const s = d.scores as DealScores;
                          return (
                            <tr key={d.id} className={`border-b border-border/20 ${d.isCurrent ? "bg-primary/5" : ""}`}>
                              <td className="py-2 pr-4 font-medium capitalize flex items-center gap-1">
                                <span style={{ color: ARCHITECTURE_COLORS[d.architecture] ?? "#94a3b8" }}>{d.architecture}</span>
                                {d.isCurrent && <Badge className="text-[8px] px-1 py-0 h-3.5">now</Badge>}
                              </td>
                              {SCORE_DIMENSIONS.map(dim => {
                                const v = s[dim.key] as number ?? 0;
                                const color = v >= 0.65 ? "text-emerald-400" : v >= 0.45 ? "text-amber-400" : "text-red-400";
                                return (
                                  <td key={dim.key} className={`text-center py-2 px-2 font-mono ${color}`}>
                                    {Math.round(v * 100)}%
                                  </td>
                                );
                              })}
                              <td className={`text-center py-2 px-2 font-mono font-bold ${scoreColor(s.composite ?? 0)}`}>
                                {Math.round((s.composite ?? 0) * 100)}%
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {activeTab === "robustness" && (
        <div className="space-y-4">
          {(() => {
            const total = redTeamResults.length;
            const survived = redTeamResults.filter(r => r.survived).length;
            const critical = redTeamResults.filter(r => r.severity === "critical").length;
            const criticalSurvived = redTeamResults.filter(r => r.severity === "critical" && r.survived).length;
            const survivalRate = total > 0 ? (survived / total) * 100 : 0;
            return (
              <div className="grid sm:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <div className={`text-3xl font-display font-bold ${survivalRate >= 70 ? "text-emerald-400" : survivalRate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                    {total > 0 ? `${survivalRate.toFixed(0)}%` : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Overall Survival</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-display font-bold text-emerald-400">{survived}</div>
                  <div className="text-xs text-muted-foreground mt-1">Attacks Survived</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-display font-bold text-red-400">{total - survived}</div>
                  <div className="text-xs text-muted-foreground mt-1">Attacks Failed</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className={`text-3xl font-display font-bold ${critical === 0 || criticalSurvived === critical ? "text-emerald-400" : "text-red-400"}`}>
                    {critical > 0 ? `${criticalSurvived}/${critical}` : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Critical Survived</div>
                </Card>
              </div>
            );
          })()}
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Attack Survival by Severity
            </h3>
            {redTeamResults.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No red team results yet.</p>
            ) : (
              <>
                {["critical", "high", "medium"].map(sev => {
                  const attacks = redTeamResults.filter(r => r.severity === sev);
                  if (attacks.length === 0) return null;
                  const pass = attacks.filter(r => r.survived).length;
                  const pct = Math.round((pass / attacks.length) * 100);
                  const barColor = sev === "critical" ? "bg-red-500" : sev === "high" ? "bg-orange-500" : "bg-amber-500";
                  const labelColor = sev === "critical" ? "text-red-400" : sev === "high" ? "text-orange-400" : "text-amber-400";
                  return (
                    <div key={sev} className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold uppercase ${labelColor}`}>{sev}</span>
                        <span className="text-xs text-muted-foreground">{pass}/{attacks.length} survived ({pct}%)</span>
                      </div>
                      <div className="bg-secondary/50 rounded h-2 overflow-hidden">
                        <motion.div
                          className={`h-full rounded ${barColor}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <div className="mt-2 space-y-2">
                        {attacks.map((r, i) => (
                          <div key={i} className={`p-2.5 rounded-lg border text-xs ${r.survived ? "border-emerald-800/40 bg-emerald-950/10" : "border-red-800/40 bg-red-950/10"}`}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-foreground flex-1">{r.attack}</p>
                              <span className={`font-bold shrink-0 ${r.survived ? "text-emerald-400" : "text-red-400"}`}>
                                {r.survived ? "✓" : "✗"}
                              </span>
                            </div>
                            {r.response && <p className="text-muted-foreground mt-1">{r.response}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </Card>
        </div>
      )}

      {activeTab === "pareto" && (
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Pareto Frontier</h3>
            <p className="text-xs text-muted-foreground mb-4">These deals are non-dominated — each is best on at least one dimension compared to all others.</p>
            {paretoDeals.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No Pareto frontier computed yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paretoDeals.map((d, i) => {
                    const s = d.scores as DealScores | null;
                    return {
                      name: `#${i + 1} ${d.architecture}`,
                      composite: s ? Math.round((s.composite ?? 0) * 100) : 0,
                      feasibility: s ? Math.round((s.feasibility ?? 0) * 100) : 0,
                      domestic: s ? Math.round((s.domesticSellability ?? 0) * 100) : 0,
                    };
                  })} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                    <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }} formatter={(v: number) => [`${v}%`]} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Bar dataKey="composite" name="Composite" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="feasibility" name="Feasibility" fill="#10b981" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="domestic" name="Domestic" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "tree" && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" /> Solution Tree Explorer
          </h3>
          <SolutionTreeView nodes={treeNodes} />
        </Card>
      )}

      {activeTab === "history" && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Deal Score History</h3>
          {historyData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="index" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }} formatter={(v: number) => [`${v}%`]} />
                  <Line type="monotone" dataKey="composite" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} name="Composite Score" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">No history yet. Run more deal cycles to see evolution.</p>
          )}
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(historyRes?.data ?? []).slice(0, 6).map((d, i) => {
              const s = d.scores as DealScores | null;
              return (
                <div key={d.id} className={`p-3 rounded-lg border text-xs ${d.isCurrent ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold capitalize" style={{ color: ARCHITECTURE_COLORS[d.architecture] ?? "#94a3b8" }}>
                      {d.architecture}
                    </span>
                    {d.isCurrent && <Badge className="text-[9px] px-1 py-0 h-4">current</Badge>}
                  </div>
                  <div className="text-muted-foreground">{s ? `${((s.composite ?? 0) * 100).toFixed(0)}% composite` : "—"}</div>
                  <div className="text-muted-foreground/60">{new Date(d.createdAt).toLocaleDateString()}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <DealWhatIfPanel currentDealName={currentDeal.id} />
    </div>
  );
}
