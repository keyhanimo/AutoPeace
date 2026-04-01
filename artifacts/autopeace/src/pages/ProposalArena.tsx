import React, { useState } from "react";
import {
  useGetProposalArena,
  type Proposal,
  type Deal,
  type DealScores,
  type StakeholderVerdict,
} from "@workspace/api-client-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend,
} from "recharts";
import {
  CheckCircle2, XCircle, AlertTriangle, GitCompare,
  ExternalLink, ChevronDown, ChevronUp, Globe, Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ScoreBreakdownPanel, SCORE_DIMENSIONS, type ExtendedScores } from "@/components/ScoreBreakdownPanel";

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

const ACCEPTANCE_TIERS: Record<string, { label: string; color: string }> = {
  iran: { label: "Required", color: "text-red-300 bg-red-950/40 border-red-800/50" },
  us: { label: "Required", color: "text-red-300 bg-red-950/40 border-red-800/50" },
  israel: { label: "Critical", color: "text-orange-300 bg-orange-950/40 border-orange-800/50" },
  saudi_arabia: { label: "Influential", color: "text-blue-300 bg-blue-950/40 border-blue-800/50" },
  iaea: { label: "Influential", color: "text-blue-300 bg-blue-950/40 border-blue-800/50" },
  russia: { label: "Influential", color: "text-blue-300 bg-blue-950/40 border-blue-800/50" },
  china: { label: "Influential", color: "text-blue-300 bg-blue-950/40 border-blue-800/50" },
  eu3: { label: "Influential", color: "text-blue-300 bg-blue-950/40 border-blue-800/50" },
};
const getStakeholderTier = (id: string) => ACCEPTANCE_TIERS[id] ?? { label: "Contextual", color: "text-gray-400 bg-gray-950/40 border-gray-700/50" };
const TIER_ORDER: Record<string, number> = { Required: 0, Critical: 1, Influential: 2, Contextual: 3 };

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
      <div className="flex text-xs gap-3">
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
  const scores = proposal.scores as ExtendedScores | null;
  const evals = (proposal.stakeholderEvaluations ?? {}) as Record<string, StakeholderVerdict>;
  const terms = proposal.terms as Record<string, unknown>;
  const knownResponses = (proposal.knownResponses ?? {}) as Record<string, string>;
  const [expandedReactionIds, setExpandedReactionIds] = useState<Set<string>>(new Set());
  const [hoveredReactionId, setHoveredReactionId] = useState<string | null>(null);
  const isReactionExpanded = (id: string) => expandedReactionIds.has(id) || hoveredReactionId === id;
  const toggleReaction = (id: string) => setExpandedReactionIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

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
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
              {proposal.source}
            </Badge>
            <Badge variant="outline" className="text-xs">
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
                          <span className="text-xs text-primary font-semibold uppercase tracking-wider block">{label}</span>
                          <span className="text-muted-foreground">
                            {key === "timelineYears" ? `${terms[key]} years` : String(terms[key]).slice(0, 300)}
                          </span>
                        </div>
                      ) : null
                    ))}
                    {Boolean(terms.stakeholderCommitments && typeof terms.stakeholderCommitments === "object" && Object.keys(terms.stakeholderCommitments as Record<string, unknown>).length > 0) && (
                      <div className="border-t border-border/30 pt-2 mt-2">
                        <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider block mb-1.5">Coalition Commitments</span>
                        {Object.entries(terms.stakeholderCommitments as Record<string, string>).map(([id, commitment]) => (
                          <div key={id} className="flex gap-1.5 text-xs mb-1">
                            <span className="text-primary font-semibold capitalize shrink-0">{id.replace(/_/g, " ")}:</span>
                            <span className="text-muted-foreground">{String(commitment).slice(0, 200)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {Boolean(Array.isArray((terms as Record<string, unknown>).innovativeProvisions) && ((terms as Record<string, unknown>).innovativeProvisions as unknown[]).length > 0) && (
                      <div className="border-t border-border/30 pt-2 mt-2">
                        <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider block mb-1.5">Innovative Provisions</span>
                        {((terms as Record<string, unknown>).innovativeProvisions as Array<{ title: string; description: string; rationale: string }>).map((prov, idx) => (
                          <div key={idx} className="p-2 rounded border border-violet-800/20 bg-violet-950/10 mb-1.5">
                            <span className="text-xs font-bold text-violet-300">{prov.title}</span>
                            <p className="text-xs text-muted-foreground">{prov.description.slice(0, 200)}</p>
                          </div>
                        ))}
                      </div>
                    )}
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

              {scores && <ScoreBreakdownPanel scores={scores} label="Score Breakdown" />}

              {Object.keys(evals).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Stakeholder Reactions</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {[...Object.entries(evals)]
                      .sort((a, b) => (TIER_ORDER[getStakeholderTier(a[0]).label] ?? 3) - (TIER_ORDER[getStakeholderTier(b[0]).label] ?? 3))
                      .map(([id, ev]) => {
                        const tier = getStakeholderTier(id);
                        const expanded = isReactionExpanded(id);
                        return (
                          <button
                            key={id}
                            onClick={() => toggleReaction(id)}
                            onMouseEnter={() => setHoveredReactionId(id)}
                            onMouseLeave={() => setHoveredReactionId(null)}
                            className={`p-2 rounded-lg border text-xs text-left cursor-pointer transition-all ${VERDICT_COLORS[ev.verdict] ?? ""}`}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              {VERDICT_ICONS[ev.verdict]}
                              <span className="font-mono font-bold capitalize">{id.replace(/[_-]/g, " ")}</span>
                              <span className={`text-[7px] px-1 py-0.5 rounded border ${tier.color} font-semibold shrink-0 ml-auto`}>{tier.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{ev.rationale}</p>
                          </button>
                        );
                      })}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function AiDealCard({
  deal,
  isExpanded,
  onToggle,
}: {
  deal: Deal;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const scores = deal.scores as ExtendedScores | null;
  const evals = (deal.stakeholderEvaluations ?? {}) as Record<string, StakeholderVerdict>;
  const terms = deal.terms as Record<string, unknown>;
  const redTeamResults = (deal.redTeamResults ?? []) as Array<{ attack: string; severity: string; response: string; survived: boolean }>;
  const domesticEvals = (deal.domesticEvaluations ?? {}) as Record<string, { audience: string; verdict: string; rationale: string }>;
  const domesticFraming = ((deal as Record<string, unknown>).domesticFramingStrategies ?? {}) as Record<string, { audience: string; framingNarrative: string; keyTalkingPoints: string[]; historicalAnalogy?: string; riskOfBackfire: string }>;
  const brainstormInsights = (deal as Record<string, unknown>).brainstormInsights as { historicalAnalogies: Array<{ dealName: string; relevantLesson: string; applicability: string }>; creativeProvisions: Array<{ idea: string; rationale: string; noveltyLevel: string }>; crossIssueLinkages: Array<{ linkage: string; stakeholdersHelped: string[] }>; unconventionalApproaches: string[] } | null;
  const innovativeProvisions = Array.isArray(terms.innovativeProvisions) ? terms.innovativeProvisions as Array<{ title: string; description: string; rationale: string }> : [];
  const [expandedReactionIds, setExpandedReactionIds] = useState<Set<string>>(new Set());
  const [hoveredReactionId, setHoveredReactionId] = useState<string | null>(null);
  const isReactionExpanded = (id: string) => expandedReactionIds.has(id) || hoveredReactionId === id;
  const toggleReaction = (id: string) => setExpandedReactionIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  return (
    <Card className="overflow-hidden border-primary/30">
      <button
        className="w-full text-left p-5 flex items-start justify-between gap-4 hover:bg-muted/20 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-base font-bold">Current AI Champion Deal</h3>
            <Badge variant="outline" className="text-xs border-primary/40 text-primary capitalize">
              {deal.architecture}
            </Badge>
            <Badge variant="outline" className="text-xs">
              by {deal.generatedBy}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Generated {new Date(deal.createdAt).toLocaleDateString()} · Click to {isExpanded ? "collapse" : "expand full scoring details"}
          </p>
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
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Deal Terms</h4>
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
                          <span className="text-xs text-primary font-semibold uppercase tracking-wider block">{label}</span>
                          <span className="text-muted-foreground">
                            {key === "timelineYears" ? `${terms[key]} years` : String(terms[key]).slice(0, 300)}
                          </span>
                        </div>
                      ) : null
                    ))}
                    {Boolean(terms.stakeholderCommitments && typeof terms.stakeholderCommitments === "object" && Object.keys(terms.stakeholderCommitments as Record<string, unknown>).length > 0) && (
                      <div className="border-t border-border/30 pt-2 mt-2">
                        <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider block mb-1.5">Coalition Commitments</span>
                        {Object.entries(terms.stakeholderCommitments as Record<string, string>).map(([id, commitment]) => (
                          <div key={id} className="flex gap-1.5 text-xs mb-1">
                            <span className="text-primary font-semibold capitalize shrink-0">{id.replace(/_/g, " ")}:</span>
                            <span className="text-muted-foreground">{String(commitment).slice(0, 200)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  {scores && (
                    <>
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Score Radar</h4>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={SCORE_DIMENSIONS.map(d => ({
                            dimension: d.label,
                            score: Math.round((scores[d.key] ?? 0) * 100),
                          }))}>
                            <PolarGrid stroke="#1e293b" />
                            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 8, fill: "#94a3b8" }} />
                            <Radar name="Score" dataKey="score" stroke="#0284c7" fill="#0284c7" fillOpacity={0.2} />
                            <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "10px" }} formatter={(v: number) => [`${v}%`]} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {scores && <ScoreBreakdownPanel scores={scores} label="AI Deal Score Breakdown" />}

              {Object.keys(evals).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
                    Stakeholder Reactions ({Object.keys(evals).length} evaluated)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {[...Object.entries(evals)]
                      .sort((a, b) => (TIER_ORDER[getStakeholderTier(a[0]).label] ?? 3) - (TIER_ORDER[getStakeholderTier(b[0]).label] ?? 3))
                      .map(([id, ev]) => {
                        const tier = getStakeholderTier(id);
                        const expanded = isReactionExpanded(id);
                        return (
                          <button
                            key={id}
                            onClick={() => toggleReaction(id)}
                            onMouseEnter={() => setHoveredReactionId(id)}
                            onMouseLeave={() => setHoveredReactionId(null)}
                            className={`p-2 rounded-lg border text-xs text-left cursor-pointer transition-all ${VERDICT_COLORS[ev.verdict] ?? ""}`}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              {VERDICT_ICONS[ev.verdict]}
                              <span className="font-mono font-bold capitalize">{id.replace(/[_-]/g, " ")}</span>
                              <span className={`text-[7px] px-1 py-0.5 rounded border ${tier.color} font-semibold shrink-0 ml-auto`}>{tier.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{ev.rationale}</p>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {Object.keys(domesticEvals).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Domestic Sellability</h4>
                  <div className="grid sm:grid-cols-3 gap-2">
                    {Object.entries(domesticEvals).map(([key, ev]) => {
                      const verdict = typeof ev === "object" && ev && "verdict" in ev ? String(ev.verdict) : "unknown";
                      const audience = typeof ev === "object" && ev && "audience" in ev ? String(ev.audience) : key;
                      const rationale = typeof ev === "object" && ev && "rationale" in ev ? String(ev.rationale) : "";
                      const color = verdict === "sellable" ? "text-emerald-400 border-emerald-800/40" :
                        verdict === "unsellable" ? "text-red-400 border-red-800/40" : "text-amber-400 border-amber-800/40";
                      return (
                        <div key={key} className={`p-2.5 rounded-lg border text-xs ${color}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-foreground">{audience}</span>
                            <span className={`text-xs font-bold capitalize ${color.split(" ")[0]}`}>{verdict}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{rationale}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {innovativeProvisions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-3">Innovative Provisions</h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {innovativeProvisions.map((prov, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-violet-800/20 bg-violet-950/10 text-xs">
                        <span className="font-bold text-violet-300">{prov.title}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{prov.description.slice(0, 200)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(domesticFraming).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">Creative Framing Strategies</h4>
                  <div className="space-y-2">
                    {Object.entries(domesticFraming).map(([key, strategy]) => (
                      <div key={key} className="p-2.5 rounded-lg border border-emerald-800/30 bg-emerald-950/10 text-xs">
                        <span className="font-medium text-emerald-300">{strategy.audience}</span>
                        <p className="text-xs text-foreground mt-0.5 italic">"{strategy.framingNarrative}"</p>
                        <div className="mt-1 space-y-0.5">
                          {strategy.keyTalkingPoints.map((pt: string, i: number) => (
                            <div key={i} className="flex gap-1.5 text-xs text-muted-foreground">
                              <span className="text-emerald-500 shrink-0">•</span><span>{pt}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[9px] text-amber-400/60 mt-1">Risk: {strategy.riskOfBackfire}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {brainstormInsights && (
                <div>
                  <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-3">AI Innovation Brainstorm</h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {brainstormInsights.historicalAnalogies?.map((a, i) => (
                      <div key={i} className="p-2 rounded border border-violet-800/20 bg-violet-950/10 text-xs">
                        <span className="font-bold text-violet-300">{a.dealName}</span>
                        <p className="text-xs text-muted-foreground">{a.relevantLesson}</p>
                      </div>
                    ))}
                    {brainstormInsights.crossIssueLinkages?.map((l, i) => (
                      <div key={`l-${i}`} className="p-2 rounded border border-violet-800/20 bg-violet-950/10 text-xs">
                        <p className="text-muted-foreground">{l.linkage}</p>
                        <span className="text-xs text-violet-300">Benefits: {l.stakeholdersHelped.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {redTeamResults.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
                    Red Team Attacks ({redTeamResults.filter(r => r.survived).length}/{redTeamResults.length} survived)
                  </h4>
                  <div className="space-y-2">
                    {redTeamResults.map((r, i) => (
                      <div key={i} className={`p-2.5 rounded-lg border text-xs ${r.survived ? "border-emerald-800/40 bg-emerald-950/10" : "border-red-800/40 bg-red-950/10"}`}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${r.severity === "critical" ? "bg-red-900/50 text-red-400" : r.severity === "high" ? "bg-orange-900/50 text-orange-400" : "bg-amber-900/50 text-amber-400"}`}>
                              {r.severity}
                            </span>
                            <span className="text-foreground">{r.attack}</span>
                          </div>
                          <span className={`font-bold shrink-0 ${r.survived ? "text-emerald-400" : "text-red-400"}`}>
                            {r.survived ? "Survived" : "Failed"}
                          </span>
                        </div>
                        {r.response && <p className="text-xs text-muted-foreground">{r.response}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deal.diagnosis && (
                <div className="p-3 rounded-lg border border-amber-800/30 bg-amber-950/10">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" /> AI Diagnosis
                  </h4>
                  <p className="text-xs text-muted-foreground">{deal.diagnosis}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

const PROPOSAL_COLORS = ["#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#f97316"];
const AI_DEAL_COLOR = "#0284c7";

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
      row["AI Champion"] = Math.round((s[d.key] ?? 0) * 100);
    }
    return row;
  });

  const keys = [
    ...scoredProposals.map(p => p.name),
    ...(aiDeal?.scores ? ["AI Champion"] : []),
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
        <GitCompare className="w-4 h-4 text-primary" /> Arena Comparison
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        All scored proposals vs. current AI champion across 7 dimensions (0-100%). Each dimension is scored independently by 3 LLM judges and averaged.
      </p>
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
                fill={key === "AI Champion" ? AI_DEAL_COLOR : PROPOSAL_COLORS[i % PROPOSAL_COLORS.length]}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function GapAnalysis({ proposals, aiDeal }: { proposals: Proposal[]; aiDeal: Deal | null }) {
  const scoredProposals = proposals.filter(p => p.scores);
  if (scoredProposals.length === 0 && !aiDeal) return null;

  const allItems: { name: string; scores: DealScores }[] = [];
  if (aiDeal?.scores) allItems.push({ name: "AI Champion", scores: aiDeal.scores as DealScores });
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
        Each cell shows the score for that dimension (0-100%). Color intensity indicates how far from the ideal score of 100%.
        Green = above 85%, yellow = 45-85%, red = below 45%.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-2 pr-3 text-muted-foreground font-medium min-w-[100px]">Proposal</th>
              {dims.map(d => (
                <th key={d.key} className="text-center py-2 px-1 text-muted-foreground font-medium min-w-[48px]">
                  {d.label}
                  <div className="text-[8px] font-normal opacity-60">{(d.weight * 100)}%w</div>
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
  const [aiExpanded, setAiExpanded] = useState(false);
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
        description="All peace proposals — real-world and AI-generated — evaluated and compared head-to-head."
      >
        {aiDealScores && (
          <Badge variant="outline" className="border-primary/40 text-primary">
            AI Champion: {((aiDealScores.composite ?? 0) * 100).toFixed(0)}% composite
          </Badge>
        )}
      </PageHeader>

      <ArenaCompareChart proposals={proposals} aiDeal={aiDeal} />

      <GapAnalysis proposals={proposals} aiDeal={aiDeal} />

      {aiDeal && (
        <AiDealCard
          deal={aiDeal}
          isExpanded={aiExpanded}
          onToggle={() => setAiExpanded(!aiExpanded)}
        />
      )}

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
