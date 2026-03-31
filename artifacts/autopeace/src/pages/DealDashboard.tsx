import React, { useState, useMemo } from "react";
import { useGetCurrentDeal, useGetParetoDeals, useListDeals, type Deal, type DealScores } from "@workspace/api-client-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, Cell, Legend, CartesianGrid,
} from "recharts";
import { AlertCircle, Shield, Zap, Globe, Heart, TrendingUp, CheckCircle2, XCircle, AlertTriangle, GitBranch } from "lucide-react";
import { DealAutoresearchBadge } from "@/components/AutoresearchBadge";
import { motion } from "framer-motion";
import { ScoreBreakdownPanel, type ExtendedScores } from "@/components/ScoreBreakdownPanel";

function getBaseUrl() {
  return window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
}

const SCORE_DIMENSIONS: { key: keyof DealScores; label: string; color: string; icon: React.ReactNode; description: string; weight: number }[] = [
  { key: "feasibility", label: "Feasibility", color: "#10b981", icon: <CheckCircle2 className="w-4 h-4" />, description: "Likelihood the deal gets signed by all required parties", weight: 0.20 },
  { key: "coherence", label: "Coherence", color: "#0284c7", icon: <GitBranch className="w-4 h-4" />, description: "Internal consistency — do terms contradict each other?", weight: 0.15 },
  { key: "evidenceGrounding", label: "Evidence", color: "#f59e0b", icon: <TrendingUp className="w-4 h-4" />, description: "How well terms reflect real-world constraints and evidence", weight: 0.10 },
  { key: "domesticSellability", label: "Domestic", color: "#8b5cf6", icon: <Globe className="w-4 h-4" />, description: "Can leaders sell this domestically? (Congress, IRGC, Knesset)", weight: 0.20 },
  { key: "regionalStability", label: "Regional", color: "#06b6d4", icon: <Shield className="w-4 h-4" />, description: "Impact on broader Middle East stability", weight: 0.15 },
  { key: "implementability", label: "Implement.", color: "#f97316", icon: <Zap className="w-4 h-4" />, description: "Technical/logistical ease of executing the terms", weight: 0.10 },
  { key: "durability", label: "Durability", color: "#ec4899", icon: <Heart className="w-4 h-4" />, description: "Resilience against future shocks or leadership changes", weight: 0.10 },
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

function scoreLabel(score: number): string {
  if (score >= 0.65) return "Viable";
  if (score >= 0.45) return "Marginal";
  return "Weak";
}

function ScoreCard({ dimension, score }: { dimension: typeof SCORE_DIMENSIONS[number]; score: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: dimension.color }}>{dimension.icon}</span>
        <span className="text-sm font-medium">{dimension.label}</span>
        <span className="text-xs text-muted-foreground font-mono ml-auto">{(dimension.weight * 100)}%w</span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{dimension.description}</p>
      <div className="flex items-end justify-between">
        <div className={`text-2xl font-display font-bold ${scoreColor(score)}`}>
          {(score * 100).toFixed(0)}%
        </div>
        <span className={`text-xs font-medium ${scoreColor(score)}`}>{scoreLabel(score)}</span>
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

const VERDICT_ICONS: Record<string, React.ReactNode> = {
  accept: <CheckCircle2 className="w-3 h-3 shrink-0" />,
  conditional: <AlertTriangle className="w-3 h-3 shrink-0" />,
  reject: <XCircle className="w-3 h-3 shrink-0" />,
};

const VERDICT_COLORS: Record<string, string> = {
  accept: "text-emerald-400 border-emerald-500/50 bg-emerald-950/20",
  conditional: "text-amber-400 border-amber-500/50 bg-amber-950/20",
  reject: "text-red-400 border-red-500/50 bg-red-950/20",
};

function StakeholderMap({ evaluations, lensId }: { evaluations: Record<string, { verdict: string; rationale: string }>; lensId?: string }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const entries = Object.entries(evaluations);
  const accepts = entries.filter(([, e]) => e.verdict === "accept").length;
  const conditionals = entries.filter(([, e]) => e.verdict === "conditional").length;
  const rejects = entries.filter(([, e]) => e.verdict === "reject").length;

  const displayedEntries = lensId
    ? entries.filter(([id]) => id === lensId)
    : [...entries].sort((a, b) => {
        const ta = TIER_ORDER[getStakeholderTier(a[0]).label] ?? 3;
        const tb = TIER_ORDER[getStakeholderTier(b[0]).label] ?? 3;
        return ta - tb;
      });

  const isExpanded = (id: string) => expandedIds.has(id) || hoveredId === id;

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs flex-wrap">
        <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" /> {accepts} Accept</span>
        <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3 h-3" /> {conditionals} Conditional</span>
        <span className="flex items-center gap-1 text-red-400"><XCircle className="w-3 h-3" /> {rejects} Reject</span>
        <span className="ml-auto text-xs text-muted-foreground">{entries.length} stakeholders evaluated</span>
        {lensId && (
          <span className="flex items-center gap-1 text-primary text-xs font-semibold border border-primary/30 rounded px-2 py-0.5">
            Lens: {lensId.replace(/-/g, " ")}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Tier labels: <span className="text-red-300">Required</span> = deal-breaker if rejected · <span className="text-orange-300">Critical</span> = near-fatal · <span className="text-blue-300">Influential</span> = affects durability · <span className="text-gray-400">Contextual</span> = regional impact
      </p>
      {lensId && displayedEntries.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No evaluation data for the selected stakeholder lens yet.</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {displayedEntries.map(([id, evaluation]) => {
          const isLens = lensId === id;
          const tier = getStakeholderTier(id);
          const cardColor = VERDICT_COLORS[evaluation.verdict] ?? "text-muted-foreground border-border bg-card";
          const expanded = isExpanded(id);

          return (
            <button
              key={id}
              onClick={() => toggleExpanded(id)}
              onMouseEnter={() => setHoveredId(id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${cardColor} ${isLens ? "ring-1 ring-primary" : ""}`}
            >
              <div className="flex items-center gap-1 mb-1">
                {VERDICT_ICONS[evaluation.verdict]}
                <span className="font-mono font-bold capitalize truncate text-xs">{id.replace(/[_-]/g, " ")}</span>
                <span className={`text-[7px] px-1 py-0.5 rounded border ${tier.color} font-semibold shrink-0 ml-auto`}>{tier.label}</span>
              </div>
              <p className={`text-xs text-muted-foreground ${expanded ? "" : "line-clamp-2"}`}>{evaluation.rationale}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}



function DealDetailView({ deal, isHistorical }: { deal: Deal; isHistorical?: boolean }) {
  const scores = deal.scores as ExtendedScores | null;
  const stakeholderEvals = deal.stakeholderEvaluations as Record<string, { verdict: string; rationale: string }> | null ?? {};
  const redTeamResults = deal.redTeamResults as Array<{ attack: string; severity: string; response: string; survived: boolean }> | null ?? [];
  const domesticEvals = deal.domesticEvaluations as Record<string, { audience: string; verdict: string; rationale: string }> | null ?? {};
  const domesticFraming = (deal as Record<string, unknown>).domesticFramingStrategies as Record<string, { audience: string; framingNarrative: string; keyTalkingPoints: string[]; historicalAnalogy?: string; riskOfBackfire: string }> | null ?? {};
  const brainstormInsights = (deal as Record<string, unknown>).brainstormInsights as { historicalAnalogies: Array<{ dealName: string; relevantLesson: string; applicability: string }>; creativeProvisions: Array<{ idea: string; rationale: string; noveltyLevel: string }>; crossIssueLinkages: Array<{ linkage: string; stakeholdersHelped: string[] }>; unconventionalApproaches: string[] } | null;
  const terms = deal.terms as Record<string, unknown>;

  const radarData = useMemo(() => {
    if (!scores) return [];
    return SCORE_DIMENSIONS.map(d => ({
      dimension: d.label,
      score: Math.round((scores[d.key] ?? 0) * 100),
    }));
  }, [scores]);

  const survived = redTeamResults.filter(r => r.survived).length;
  const totalAttacks = redTeamResults.length;

  return (
    <div className="space-y-6">
      {isHistorical && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex-1">
            <span className="text-sm font-bold capitalize" style={{ color: ARCHITECTURE_COLORS[deal.architecture] ?? "#94a3b8" }}>
              {deal.architecture} Architecture
            </span>
            <span className="text-xs text-muted-foreground ml-3">
              {new Date(deal.createdAt).toLocaleDateString()} {new Date(deal.createdAt).toLocaleTimeString("en-US", { hour12: false })} · {deal.generatedBy}
            </span>
          </div>
          {scores && (
            <span className={`text-lg font-bold ${scoreColor(scores.composite ?? 0)}`}>
              {((scores.composite ?? 0) * 100).toFixed(0)}%
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {scores && SCORE_DIMENSIONS.map(d => (
          <ScoreCard key={d.key} dimension={d} score={scores[d.key] ?? 0} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-2">Score Radar</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Visual comparison of all 7 scoring dimensions. The composite score ({scores ? ((scores.composite ?? 0) * 100).toFixed(0) : "—"}%) is a weighted average.
          </p>
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
                  {key === "timelineYears" ? `${terms[key] ?? "?"} years` : String(terms[key] ?? "—")}
                </span>
              </div>
            ))}
            {Boolean(terms.stakeholderCommitments && typeof terms.stakeholderCommitments === "object" && Object.keys(terms.stakeholderCommitments as Record<string, unknown>).length > 0) && (
              <div className="border-t border-border/50 pt-3 mt-3">
                <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider block mb-2">Grand Coalition Commitments</span>
                <div className="space-y-1.5">
                  {Object.entries(terms.stakeholderCommitments as Record<string, string>).map(([id, commitment]) => (
                    <div key={id} className="flex gap-2 text-xs">
                      <span className="text-primary font-semibold capitalize shrink-0 w-24">{id.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground">{String(commitment)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Boolean(Array.isArray((terms as Record<string, unknown>).innovativeProvisions) && ((terms as Record<string, unknown>).innovativeProvisions as unknown[]).length > 0) && (
              <div className="border-t border-border/50 pt-3 mt-3">
                <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider block mb-2">Innovative Provisions</span>
                <div className="space-y-3">
                  {((terms as Record<string, unknown>).innovativeProvisions as Array<{ title: string; description: string; rationale: string; historicalPrecedent?: string }>).map((prov, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-violet-800/30 bg-violet-950/10">
                      <span className="text-xs font-bold text-violet-300 block mb-1">{prov.title}</span>
                      <p className="text-xs text-muted-foreground mb-1">{prov.description}</p>
                      <p className="text-xs text-violet-300 italic">{prov.rationale}</p>
                      {prov.historicalPrecedent && (
                        <p className="text-xs text-muted-foreground mt-1">Precedent: {prov.historicalPrecedent}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {scores && (
        <Card className="p-6">
          <ScoreBreakdownPanel scores={scores} label="Detailed Score Breakdown — 3-Model Judge Panel" />
        </Card>
      )}

      {deal.diagnosis && (
        <Card className="p-6 border-amber-800/30 bg-amber-950/10">
          <h3 className="text-base font-bold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> AI Diagnosis
          </h3>
          <p className="text-sm text-muted-foreground">{deal.diagnosis}</p>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold">Stakeholder Acceptance Map</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each stakeholder's verdict on the deal. AI simulates responses based on documented positions, red lines, and the specific commitments each party must make.
            </p>
          </div>
        </div>
        <StakeholderMap evaluations={stakeholderEvals} lensId={undefined} />
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold mb-2">Domestic Sellability</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Can key domestic audiences in Iran, the US, and Israel be convinced to support this deal? Evaluates political feasibility within each country.
        </p>
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

      {Object.keys(domesticFraming).length > 0 && (
        <Card className="p-6 border-emerald-800/30 bg-emerald-950/5">
          <h3 className="text-lg font-bold mb-2">AI Creative Framing Strategies</h3>
          <p className="text-xs text-muted-foreground mb-4">
            For each difficult domestic audience, the AI generates creative narratives and talking points to make the deal sellable — transforming perceived concessions into perceived victories.
          </p>
          <div className="space-y-4">
            {Object.entries(domesticFraming).map(([key, strategy]) => (
              <div key={key} className="p-4 rounded-lg border border-emerald-800/30 bg-emerald-950/10">
                <span className="text-sm font-bold text-emerald-300 block mb-2">{strategy.audience}</span>
                <p className="text-xs text-foreground mb-2 italic">"{strategy.framingNarrative}"</p>
                <div className="space-y-1 mb-2">
                  {strategy.keyTalkingPoints.map((pt: string, i: number) => (
                    <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="text-emerald-500 shrink-0">•</span>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
                {strategy.historicalAnalogy && (
                  <p className="text-xs text-emerald-400 italic">Historical analogy: {strategy.historicalAnalogy}</p>
                )}
                <p className="text-xs text-amber-400 mt-1">Risk: {strategy.riskOfBackfire}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {brainstormInsights && (
        <Card className="p-6 border-violet-800/30 bg-violet-950/5">
          <h3 className="text-lg font-bold mb-2">AI Innovation Brainstorm</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Before designing this deal, the AI conducted an extended creative brainstorm — mining historical peace deals for applicable lessons, identifying cross-issue linkages between stakeholders, and exploring unconventional approaches.
          </p>

          {brainstormInsights.historicalAnalogies?.length > 0 && (
            <div className="mb-4">
              <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider block mb-2">Historical Analogies Applied</span>
              <div className="space-y-2">
                {brainstormInsights.historicalAnalogies.map((a, i) => (
                  <div key={i} className="p-2 rounded border border-violet-800/20 bg-violet-950/10">
                    <span className="text-xs font-bold text-violet-300">{a.dealName}</span>
                    <p className="text-xs text-muted-foreground">{a.relevantLesson}</p>
                    <p className="text-xs text-violet-300 italic">{a.applicability}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {brainstormInsights.crossIssueLinkages?.length > 0 && (
            <div className="mb-4">
              <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider block mb-2">Cross-Issue Linkages</span>
              <div className="space-y-2">
                {brainstormInsights.crossIssueLinkages.map((l, i) => (
                  <div key={i} className="p-2 rounded border border-violet-800/20 bg-violet-950/10">
                    <p className="text-xs text-muted-foreground">{l.linkage}</p>
                    <span className="text-xs text-violet-300">Benefits: {l.stakeholdersHelped.join(", ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {brainstormInsights.unconventionalApproaches?.length > 0 && (
            <div>
              <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider block mb-2">Unconventional Approaches</span>
              <div className="space-y-1">
                {brainstormInsights.unconventionalApproaches.map((a, i) => (
                  <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="text-violet-500 shrink-0">•</span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Red Team Stress Test
          </h3>
          {totalAttacks > 0 && (
            <span className={`text-sm font-bold ${survived / totalAttacks >= 0.7 ? "text-emerald-400" : survived / totalAttacks >= 0.5 ? "text-amber-400" : "text-red-400"}`}>
              {survived}/{totalAttacks} survived ({Math.round((survived / totalAttacks) * 100)}%)
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Adversarial AI generates attack scenarios (geopolitical crises, defections, verification failures) and tests whether the deal's structure can withstand them.
        </p>

        {redTeamResults.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No red team results yet.</p>
        ) : (
          <div className="space-y-3">
            {["critical", "high", "medium"].map(sev => {
              const attacks = redTeamResults.filter(r => r.severity === sev);
              if (attacks.length === 0) return null;
              const pass = attacks.filter(r => r.survived).length;
              const pct = Math.round((pass / attacks.length) * 100);
              const barColor = sev === "critical" ? "bg-red-500" : sev === "high" ? "bg-orange-500" : "bg-amber-500";
              const labelColor = sev === "critical" ? "text-red-400" : sev === "high" ? "text-orange-400" : "text-amber-400";
              return (
                <div key={sev}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold uppercase ${labelColor}`}>{sev} severity</span>
                    <span className="text-xs text-muted-foreground">{pass}/{attacks.length} survived ({pct}%)</span>
                  </div>
                  <div className="bg-secondary/50 rounded h-2 overflow-hidden mb-2">
                    <motion.div
                      className={`h-full rounded ${barColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <div className="space-y-2 mb-4">
                    {attacks.map((r, i) => (
                      <div key={i} className={`p-3 rounded-lg border text-xs ${r.survived ? "border-emerald-800/40 bg-emerald-950/10" : "border-red-800/40 bg-red-950/10"}`}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-foreground flex-1 font-medium">{r.attack}</p>
                          <span className={`font-bold shrink-0 text-xs px-2 py-0.5 rounded ${r.survived ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>
                            {r.survived ? "Survived" : "Failed"}
                          </span>
                        </div>
                        {r.response && <p className="text-muted-foreground">{r.response}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function DealDashboard() {
  const { data: currentDeal, isLoading: currentLoading, isError: currentError } = useGetCurrentDeal();
  const { data: paretoRes } = useGetParetoDeals();
  const { data: historyRes } = useListDeals({ limit: 30 });
  const [activeTab, setActiveTab] = useState<"current" | "comparison" | "pareto" | "history">("current");
  const [selectedHistoryDeal, setSelectedHistoryDeal] = useState<Deal | null>(null);

  const scores = currentDeal?.scores as DealScores | null ?? null;

  const historyDeals = useMemo(() => {
    return (historyRes?.data ?? [])
      .filter((d): d is Deal & { scores: DealScores } => d.scores !== null)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [historyRes]);

  const historyBarData = useMemo(() => {
    return historyDeals.map((d, i) => {
      const t = new Date(d.createdAt);
      const time = !isNaN(t.getTime()) ? t.toLocaleTimeString("en-US", { hour12: false }) : "";
      return {
        name: `#${i + 1} ${time}`,
        index: i + 1,
        composite: Math.round((d.scores.composite ?? 0) * 100),
        architecture: d.architecture,
        isCurrent: d.isCurrent,
        id: d.id,
      };
    });
  }, [historyDeals]);

  const paretoDeals = paretoRes?.data ?? [];

  const TABS = [
    { key: "current", label: "Current Champion" },
    { key: "comparison", label: "Comparison" },
    { key: "pareto", label: "Pareto" },
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

  const stakeholderEvals = currentDeal.stakeholderEvaluations as Record<string, { verdict: string; rationale: string }> | null ?? {};
  const redTeamResults = currentDeal.redTeamResults as Array<{ attack: string; severity: string; response: string; survived: boolean }> | null ?? [];
  const survived = redTeamResults.filter(r => r.survived).length;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Deal Dashboard"
        description="AI-generated peace deal — Task B multi-agent pipeline. The current champion is the highest-scoring deal across all iterations."
      >
        <Badge variant="outline" className="border-primary/40 text-primary capitalize">
          {currentDeal.architecture} architecture
        </Badge>
      </PageHeader>

      <DealAutoresearchBadge />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="p-4 text-center col-span-2 sm:col-span-1">
          <div className={`text-3xl font-display font-bold ${scoreColor(scores?.composite ?? 0)}`}>
            {scores ? `${((scores.composite ?? 0) * 100).toFixed(0)}%` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Composite Score</div>
          <div className={`text-xs ${scoreColor(scores?.composite ?? 0)}`}>{scores ? scoreLabel(scores.composite ?? 0) : ""}</div>
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
          <div className={`text-3xl font-display font-bold ${survived === redTeamResults.length && redTeamResults.length > 0 ? "text-emerald-400" : "text-amber-400"}`}>
            {redTeamResults.length > 0 ? `${survived}/${redTeamResults.length}` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Red Team Survived</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-display font-bold text-primary">
            {historyDeals.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Total Iterations</div>
        </Card>
      </div>

      <div className="flex overflow-x-auto gap-1 bg-secondary/50 p-1 rounded-xl w-full">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key !== "history") setSelectedHistoryDeal(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === tab.key ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "current" && (
        <DealDetailView deal={currentDeal} />
      )}

      {activeTab === "comparison" && (
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Multi-Deal Comparison
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              All scored deals ranked by composite score. Shows key dimensions side by side — the highest-scoring deal becomes the "current champion."
            </p>
            {historyDeals.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No deals to compare yet. Run more deal cycles.</p>
            ) : (
              <>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[...historyDeals]
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
                      {[...historyDeals]
                        .sort((a, b) => ((b.scores as DealScores).composite ?? 0) - ((a.scores as DealScores).composite ?? 0))
                        .slice(0, 8)
                        .map(d => {
                          const s = d.scores as DealScores;
                          return (
                            <tr key={d.id} className={`border-b border-border/20 ${d.isCurrent ? "bg-primary/5" : ""}`}>
                              <td className="py-2 pr-4 font-medium capitalize flex items-center gap-1">
                                <span style={{ color: ARCHITECTURE_COLORS[d.architecture] ?? "#94a3b8" }}>{d.architecture}</span>
                                {d.isCurrent && <Badge className="text-[8px] px-1 py-0 h-3.5">champion</Badge>}
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

      {activeTab === "pareto" && (
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-2">Pareto Frontier</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Non-dominated deals — each is best on at least one dimension compared to all others. No deal on this frontier can improve without trading off another dimension.
            </p>
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

      {activeTab === "history" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-2">Deal Score History</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Composite scores for each AI deal iteration. Click a bar to view full details of that deal below.
            </p>
            {historyBarData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historyBarData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#94a3b8", angle: -35 }} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(v: number, _: unknown, entry: { payload?: { architecture?: string } }) => [
                        `${v}% (${entry.payload?.architecture ?? ""})`,
                        "Composite"
                      ]}
                    />
                    <Bar
                      dataKey="composite"
                      name="Composite Score"
                      radius={[3, 3, 0, 0]}
                      cursor="pointer"
                      onClick={(data: { id?: string }) => {
                        if (data.id) {
                          const deal = historyDeals.find(d => d.id === data.id);
                          if (deal) setSelectedHistoryDeal(deal);
                        }
                      }}
                    >
                      {historyBarData.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={entry.isCurrent ? "#f59e0b" : ARCHITECTURE_COLORS[entry.architecture] ?? "#64748b"}
                          stroke={selectedHistoryDeal?.id === entry.id ? "#f59e0b" : "transparent"}
                          strokeWidth={2}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No history yet. Run more deal cycles to see evolution.</p>
            )}

            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {historyDeals.map((d, i) => {
                const s = d.scores as DealScores | null;
                const isSelected = selectedHistoryDeal?.id === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedHistoryDeal(isSelected ? null : d)}
                    className={`p-3 rounded-lg border text-xs text-left transition-all ${
                      d.isCurrent ? "border-primary/50 bg-primary/5" :
                      isSelected ? "border-primary/50 ring-1 ring-primary" : "border-border hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold">
                        Deal #{i + 1}
                        <span className="ml-1.5 capitalize" style={{ color: ARCHITECTURE_COLORS[d.architecture] ?? "#94a3b8" }}>
                          {d.architecture}
                        </span>
                      </span>
                      {d.isCurrent && <Badge className="text-[9px] px-1 py-0 h-4">champion</Badge>}
                    </div>
                    <div className={`font-bold ${scoreColor(s?.composite ?? 0)}`}>
                      {s ? `${((s.composite ?? 0) * 100).toFixed(0)}% composite` : "—"}
                    </div>
                    <div className="text-muted-foreground/60">{new Date(d.createdAt).toLocaleDateString()} {new Date(d.createdAt).toLocaleTimeString("en-US", { hour12: false })}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          {selectedHistoryDeal && (
            <div className="border-t border-primary/30 pt-6">
              <DealDetailView deal={selectedHistoryDeal} isHistorical />
            </div>
          )}
        </div>
      )}

    </div>
  );
}
