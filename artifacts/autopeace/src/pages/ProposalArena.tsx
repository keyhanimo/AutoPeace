import React, { useState } from "react";
import {
  useGetProposalArena,
  useListProposals,
  useListDeals,
  type Proposal,
  type Deal,
  type DealScores,
  type StakeholderVerdict,
} from "@workspace/api-client-react";
import { Card, PageHeader, Badge, Button } from "@/components/ui";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend,
  LineChart, Line, CartesianGrid, ReferenceLine,
} from "recharts";
import {
  CheckCircle2, XCircle, AlertTriangle, GitCompare,
  ExternalLink, ChevronDown, ChevronUp, Globe, TrendingUp, Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SCORE_DIMENSIONS: { key: keyof DealScores; label: string; color: string; weight: number; description: string }[] = [
  { key: "feasibility", label: "Feasibility", color: "#10b981", weight: 0.20, description: "Likelihood the deal gets signed by all parties" },
  { key: "coherence", label: "Coherence", color: "#0284c7", weight: 0.15, description: "Internal consistency of the terms — do they contradict each other?" },
  { key: "evidenceGrounding", label: "Evidence", color: "#f59e0b", weight: 0.10, description: "How well the terms reflect documented evidence and real-world constraints" },
  { key: "domesticSellability", label: "Domestic", color: "#8b5cf6", weight: 0.20, description: "Can leaders sell this deal domestically? (US Congress, Iran IRGC, etc.)" },
  { key: "regionalStability", label: "Regional", color: "#06b6d4", weight: 0.15, description: "Predicted impact on broader Middle East stability" },
  { key: "implementability", label: "Implement.", color: "#f97316", weight: 0.10, description: "Technical and logistical ease of executing the terms" },
  { key: "durability", label: "Durability", color: "#ec4899", weight: 0.10, description: "Resilience against future shocks or changes in leadership" },
];

const VERDICT_COLORS: Record<string, string> = {
  accept: "text-emerald-400 border-emerald-700/40 bg-emerald-950/20",
  conditional: "text-amber-400 border-amber-700/40 bg-amber-950/20",
  reject: "text-red-400 border-red-700/40 bg-red-950/20",
};
const VERDICT_ICONS: Record<string, React.ReactNode> = {
  accept: <CheckCircle2 className="w-3 h-3" />,
  conditional: <AlertTriangle className="w-3 h-3" />,
  reject: <XCircle className="w-3 h-3" />,
};

function scoreColor(score: number) {
  if (score >= 0.65) return "text-emerald-400";
  if (score >= 0.45) return "text-amber-400";
  return "text-red-400";
}

function StakeholderBar({ evals }: { evals: Record<string, StakeholderVerdict> }) {
  const entries = Object.entries(evals);
  const accepts = entries.filter(([, e]) => e.verdict === "accept").length;
  const conditionals = entries.filter(([, e]) => e.verdict === "conditional").length;
  const rejects = entries.filter(([, e]) => e.verdict === "reject").length;
  const total = entries.length;
  if (total === 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex text-[10px] gap-3">
        <span className="text-emerald-400">{accepts} accept</span>
        <span className="text-amber-400">{conditionals} conditional</span>
        <span className="text-red-400">{rejects} reject</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        {accepts > 0 && (
          <div className="bg-emerald-500" style={{ width: `${(accepts / total) * 100}%` }} />
        )}
        {conditionals > 0 && (
          <div className="bg-amber-500" style={{ width: `${(conditionals / total) * 100}%` }} />
        )}
        {rejects > 0 && (
          <div className="bg-red-500" style={{ width: `${(rejects / total) * 100}%` }} />
        )}
      </div>
    </div>
  );
}

function ProposalCard({
  proposal,
  isExpanded,
  onToggle,
  compareScores,
}: {
  proposal: Proposal;
  isExpanded: boolean;
  onToggle: () => void;
  compareScores: DealScores | null;
}) {
  const scores = proposal.scores as DealScores | null;
  const evals = (proposal.stakeholderEvaluations ?? {}) as Record<string, StakeholderVerdict>;
  const terms = proposal.terms as Record<string, unknown>;
  const knownResponses = (proposal.knownResponses ?? {}) as Record<string, string>;
  const whatWouldItTake = (proposal.whatWouldItTake ?? []) as Array<{ dimension: string; currentGap: string; requiredChange: string; feasibility: string }>;

  const radarData = SCORE_DIMENSIONS.map(d => ({
    dimension: d.label,
    proposal: scores ? Math.round((scores[d.key] ?? 0) * 100) : 0,
    aiDeal: compareScores ? Math.round((compareScores[d.key] ?? 0) * 100) : undefined,
  }));

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left p-5 flex items-start justify-between gap-4 hover:bg-muted/20 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-base font-bold truncate">{proposal.name}</h3>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
              {proposal.source}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              by {proposal.submittedBy}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{proposal.summary}</p>
          {scores && (
            <div className="flex items-center gap-4 mt-2">
              <span className={`text-sm font-bold ${scoreColor(scores.composite ?? 0)}`}>
                {((scores.composite ?? 0) * 100).toFixed(0)}% composite
              </span>
              <StakeholderBar evals={evals} />
            </div>
          )}
        </div>
        <div className="text-muted-foreground shrink-0">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 space-y-5 border-t border-border/40">
              <div className="grid lg:grid-cols-2 gap-5">
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Terms</h4>
                  <div className="space-y-2 text-xs">
                    {[
                      { label: "Nuclear Protocol", key: "nuclearProtocol" },
                      { label: "Sanctions Relief", key: "sanctionsRelief" },
                      { label: "Maritime Security", key: "hormuzArrangements" },
                      { label: "Humanitarian", key: "humanitarianProvisions" },
                      { label: "Verification", key: "verificationMechanism" },
                      { label: "Timeline", key: "timelineYears" },
                      { label: "Sequencing", key: "sequencing" },
                    ].map(({ label, key }) => (
                      terms[key] ? (
                        <div key={key} className="border-b border-border/20 pb-1.5 last:border-0">
                          <span className="text-[10px] text-primary font-semibold uppercase tracking-wider block">{label}</span>
                          <span className="text-muted-foreground">
                            {key === "timelineYears" ? `${terms[key]} years` : String(terms[key]).slice(0, 300)}
                          </span>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>

                <div>
                  {scores ? (
                    <>
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
                        Score Comparison {compareScores ? "vs AI Deal" : ""}
                      </h4>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid stroke="#1e293b" />
                            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 8, fill: "#94a3b8" }} />
                            <Radar name="This Proposal" dataKey="proposal" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                            {compareScores && (
                              <Radar name="AI Deal" dataKey="aiDeal" stroke="#0284c7" fill="#0284c7" fillOpacity={0.15} />
                            )}
                            <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "10px" }} formatter={(v: number) => [`${v}%`]} />
                            {compareScores && <Legend wrapperStyle={{ fontSize: "10px" }} />}
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Run a deal cycle to score this proposal against dimensions.
                    </div>
                  )}
                </div>
              </div>

              {scores && (
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Score Breakdown</h4>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    Each dimension is scored 0-100% by a Judge Agent (LLM panel of diplomats). The composite is a weighted average. Hover or read rationale for why each score was assigned.
                  </p>
                  <div className="space-y-2">
                    {SCORE_DIMENSIONS.map(d => {
                      const val = (scores[d.key] ?? 0) as number;
                      const pct = Math.round(val * 100);
                      const sr = (scores as DealScores & { scoreRationale?: Record<string, string> }).scoreRationale;
                      const rationale = sr?.[d.key] || undefined;
                      return (
                        <div key={d.key} className="border border-border/30 rounded-sm p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                              <span className="text-xs font-bold">{d.label}</span>
                              <span className="text-[9px] text-muted-foreground/70 font-mono">{(d.weight * 100).toFixed(0)}% weight</span>
                            </div>
                            <span className={`text-sm font-bold font-mono ${scoreColor(val)}`}>{pct}%</span>
                          </div>
                          <div className="w-full bg-secondary/50 h-1.5 mb-1.5 overflow-hidden">
                            <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                          </div>
                          {rationale ? (
                            <p className="text-[10px] text-muted-foreground leading-relaxed">{rationale}</p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground/50 italic">{d.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 p-2.5 border border-primary/20 rounded-sm bg-primary/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">Composite Score</span>
                      <span className={`text-lg font-bold font-mono ${scoreColor(scores.composite ?? 0)}`}>{((scores.composite ?? 0) * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">
                      Weighted: Feasibility 20% + Domestic 20% + Coherence 15% + Regional 15% + Evidence 10% + Implement. 10% + Durability 10%
                    </p>
                  </div>
                </div>
              )}

              {Object.keys(evals).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Stakeholder Reactions</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {Object.entries(evals).map(([id, ev]) => (
                      <div
                        key={id}
                        className={`p-2 rounded-lg border text-xs ${VERDICT_COLORS[ev.verdict] ?? ""}`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {VERDICT_ICONS[ev.verdict]}
                          <span className="font-mono font-bold capitalize truncate">{id.replace(/-/g, " ")}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{ev.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(knownResponses).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Known Real-World Responses</h4>
                  <div className="space-y-2">
                    {Object.entries(knownResponses).map(([actor, response]) => (
                      <div key={actor} className="flex gap-2 text-xs">
                        <span className="font-bold capitalize whitespace-nowrap text-foreground shrink-0">{actor}:</span>
                        <span className="text-muted-foreground">{response}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {whatWouldItTake.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">What Would It Take?</h4>
                  <div className="space-y-2">
                    {whatWouldItTake.map((item, i) => (
                      <div key={i} className="p-3 rounded-lg border border-border text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold capitalize text-foreground">{item.dimension}</span>
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${item.feasibility === "high" ? "border-emerald-700 text-emerald-400" : item.feasibility === "low" ? "border-red-700 text-red-400" : "border-amber-700 text-amber-400"}`}>
                            {item.feasibility} feasibility
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{item.requiredChange}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function ArenaCompareChart({ proposals, aiDeal }: { proposals: Proposal[]; aiDeal: Deal | null }) {
  const scoredProposals = proposals.filter(p => p.scores !== null);
  if (scoredProposals.length === 0 && !aiDeal?.scores) return null;

  const data = SCORE_DIMENSIONS.map(d => {
    const row: Record<string, unknown> = { dimension: d.label };
    for (const p of scoredProposals) {
      const s = p.scores as DealScores;
      row[p.name] = Math.round((s[d.key] ?? 0) * 100);
    }
    if (aiDeal?.scores) {
      const s = aiDeal.scores as DealScores;
      row["AI Deal"] = Math.round((s[d.key] ?? 0) * 100);
    }
    return row;
  });

  const COLORS = ["#f59e0b", "#0284c7", "#10b981", "#8b5cf6", "#ec4899"];
  const keys = [
    ...scoredProposals.map(p => p.name),
    ...(aiDeal?.scores ? ["AI Deal"] : []),
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
        <GitCompare className="w-4 h-4 text-primary" /> Arena Comparison
      </h3>
      <p className="text-xs text-muted-foreground mb-4">All scored proposals vs. current AI deal across 7 dimensions</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
            <XAxis dataKey="dimension" tick={{ fontSize: 9, fill: "#94a3b8" }} angle={-25} textAnchor="end" />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
              formatter={(v: number) => [`${v}%`]}
            />
            <Legend wrapperStyle={{ fontSize: "10px" }} />
            {keys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                fill={key === "AI Deal" ? "#0284c7" : COLORS[i] ?? "#94a3b8"}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function DealScoreEvolution() {
  const { data: dealsData } = useListDeals();
  const deals = dealsData?.data ?? [];

  const chartData = [...deals]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((d, i) => {
      const s = d.scores as DealScores | null;
      return {
        name: `#${i + 1}`,
        composite: s ? Math.round((s.composite ?? 0) * 100) : null,
        feasibility: s ? Math.round((s.feasibility ?? 0) * 100) : null,
        domestic: s ? Math.round((s.domesticSellability ?? 0) * 100) : null,
        architecture: d.architecture,
      };
    });

  if (chartData.length < 2) return null;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" /> Score Evolution
      </h3>
      <p className="text-xs text-muted-foreground mb-4">AI deal score progression across {chartData.length} iterations</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
              formatter={(v: number) => [`${v}%`]}
            />
            <ReferenceLine y={65} stroke="#10b981" strokeDasharray="4 2" strokeOpacity={0.4} label={{ value: "target", fontSize: 9, fill: "#10b981" }} />
            <Legend wrapperStyle={{ fontSize: "10px" }} />
            <Line type="monotone" dataKey="composite" name="Composite" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="feasibility" name="Feasibility" stroke="#10b981" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" />
            <Line type="monotone" dataKey="domestic" name="Domestic" stroke="#8b5cf6" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function GapAnalysis({ proposals, aiDeal }: { proposals: Proposal[]; aiDeal: Deal | null }) {
  const scoredProposals = proposals.filter(p => p.scores);
  if (scoredProposals.length === 0 && !aiDeal) return null;

  const allItems: { name: string; scores: DealScores }[] = [];
  if (aiDeal?.scores) allItems.push({ name: "AI Deal", scores: aiDeal.scores as DealScores });
  for (const p of scoredProposals.slice(0, 6)) {
    allItems.push({ name: p.name.slice(0, 22), scores: p.scores as DealScores });
  }

  const dims = SCORE_DIMENSIONS;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" /> Gap Analysis — Distance to Ideal
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Each cell shows the gap below 100% for that dimension. Darker = larger gap.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr>
              <th className="text-left py-2 pr-3 text-muted-foreground font-medium min-w-[100px]">Proposal</th>
              {dims.map(d => (
                <th key={d.key} className="text-center py-2 px-1 text-muted-foreground font-medium min-w-[48px]">
                  {d.label}
                </th>
              ))}
              <th className="text-center py-2 px-1 text-muted-foreground font-medium min-w-[52px]">Composite</th>
            </tr>
          </thead>
          <tbody>
            {allItems.map((item, i) => (
              <tr key={i} className="border-t border-border/30">
                <td className="py-1.5 pr-3 text-foreground font-medium truncate max-w-[120px]">{item.name}</td>
                {dims.map(d => {
                  const val = item.scores[d.key] as number | undefined ?? 0;
                  const gap = 1 - val;
                  const pct = Math.round(val * 100);
                  const bg = gap < 0.15 ? "bg-emerald-950/60 text-emerald-400" :
                             gap < 0.35 ? "bg-amber-950/60 text-amber-400" :
                             "bg-red-950/60 text-red-400";
                  return (
                    <td key={d.key} className="py-1.5 px-1 text-center">
                      <span className={`inline-block rounded px-1 py-0.5 font-mono ${bg}`}>{pct}%</span>
                    </td>
                  );
                })}
                <td className="py-1.5 px-1 text-center">
                  {(() => {
                    const comp = item.scores.composite as number | undefined ?? 0;
                    const bg = comp >= 0.65 ? "bg-emerald-950/60 text-emerald-400" :
                               comp >= 0.45 ? "bg-amber-950/60 text-amber-400" :
                               "bg-red-950/60 text-red-400";
                    return <span className={`inline-block rounded px-1 py-0.5 font-mono font-bold ${bg}`}>{Math.round(comp * 100)}%</span>;
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function ProposalArena() {
  const { data: arenaData, isLoading } = useGetProposalArena();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string>("all");

  const proposals = arenaData?.proposals ?? [];
  const aiDeal = arenaData?.currentAiDeal ?? null;
  const aiDealScores = aiDeal ? (aiDeal.scores as DealScores | null) : null;

  const sources = Array.from(new Set(proposals.map(p => p.source)));
  const filtered = filterSource === "all" ? proposals : proposals.filter(p => p.source === filterSource);

  const toggleExpand = (id: string) => setExpanded(prev => prev === id ? null : id);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-20 bg-card rounded-2xl" />
        <div className="h-64 bg-card rounded-2xl" />
        <div className="h-40 bg-card rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Proposal Arena"
        description="Real-world peace proposals — evaluated and compared head-to-head against the AI-generated deal."
      >
        {aiDealScores && (
          <Badge variant="outline" className="border-primary/40 text-primary">
            AI Deal: {((aiDealScores.composite ?? 0) * 100).toFixed(0)}% composite
          </Badge>
        )}
      </PageHeader>

      {aiDeal && (
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="p-4 border-primary/30 bg-primary/5 sm:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">Current AI Deal Benchmark</span>
                  <Badge variant="outline" className="text-[9px] border-primary/40 text-primary capitalize">
                    {aiDeal.architecture}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generated by {aiDeal.generatedBy} · {new Date(aiDeal.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-4 text-center">
                {aiDealScores && [
                  { label: "Composite", v: aiDealScores.composite },
                  { label: "Feasibility", v: aiDealScores.feasibility },
                  { label: "Domestic", v: aiDealScores.domesticSellability },
                ].map(({ label, v }) => (
                  <div key={label}>
                    <div className={`text-xl font-display font-bold ${scoreColor(v ?? 0)}`}>
                      {((v ?? 0) * 100).toFixed(0)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      <ArenaCompareChart proposals={proposals} aiDeal={aiDeal} />

      <DealScoreEvolution />

      <GapAnalysis proposals={proposals} aiDeal={aiDeal} />

      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-bold">{proposals.length} Real-World Proposals</h2>
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
            {["all", ...sources].map(src => (
              <button
                key={src}
                onClick={() => setFilterSource(src)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${filterSource === src ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {src}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <ExternalLink className="w-10 h-10 text-muted-foreground opacity-40 mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-2">No proposals yet</h3>
            <p className="text-sm text-muted-foreground">
              Real-world proposals will appear here. They are seeded from the DB and can be added via the admin panel.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <ProposalCard
                key={p.id}
                proposal={p}
                isExpanded={expanded === p.id}
                onToggle={() => toggleExpand(p.id)}
                compareScores={aiDealScores}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
