import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useGetDeal, useGenerateDealShareText, type Deal, type DealScores } from "@workspace/api-client-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { ScoreBreakdownPanel, type ExtendedScores } from "@/components/ScoreBreakdownPanel";
import { useToast } from "@/hooks/use-toast";
import { dealToMarkdown } from "@/utils/deal-markdown";
import {
  ArrowLeft, Copy, Share2, ExternalLink, FileText, CheckCircle2, XCircle, AlertTriangle,
  AlertCircle, Shield, Zap, Globe, Heart, TrendingUp, GitBranch, Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
} from "recharts";

function getBaseUrl() {
  return window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
}

function safe(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") {
    try { return JSON.stringify(v); } catch { return "[object]"; }
  }
  return String(v);
}

const SCORE_DIMENSIONS: { key: keyof DealScores; label: string; color: string; icon: React.ReactNode; description: string }[] = [
  { key: "feasibility", label: "Feasibility", color: "#10b981", icon: <CheckCircle2 className="w-4 h-4" />, description: "Likelihood the deal gets signed" },
  { key: "coherence", label: "Coherence", color: "#0284c7", icon: <GitBranch className="w-4 h-4" />, description: "Internal consistency" },
  { key: "evidenceGrounding", label: "Evidence", color: "#f59e0b", icon: <TrendingUp className="w-4 h-4" />, description: "Reflects real-world constraints" },
  { key: "domesticSellability", label: "Domestic", color: "#8b5cf6", icon: <Globe className="w-4 h-4" />, description: "Sellable domestically?" },
  { key: "regionalStability", label: "Regional", color: "#06b6d4", icon: <Shield className="w-4 h-4" />, description: "Middle East stability impact" },
  { key: "implementability", label: "Implement.", color: "#f97316", icon: <Zap className="w-4 h-4" />, description: "Logistical ease" },
  { key: "durability", label: "Durability", color: "#ec4899", icon: <Heart className="w-4 h-4" />, description: "Resilience against shocks" },
];

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

const PLATFORMS = [
  { key: "twitter", label: "X / Twitter", icon: "𝕏", shareUrlFn: (text: string, url: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
  { key: "facebook", label: "Facebook", icon: "f", shareUrlFn: (_text: string, url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { key: "linkedin", label: "LinkedIn", icon: "in", shareUrlFn: (text: string, url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}` },
  { key: "reddit", label: "Reddit", icon: "r", shareUrlFn: (text: string, url: string) => `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text.split("\n")[0] || text)}` },
] as const;

function ShareModal({ dealId, permalinkUrl, onClose }: { dealId: string; permalinkUrl: string; onClose: () => void }) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [generatedText, setGeneratedText] = useState<string>("");
  const [editedText, setEditedText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const shareMutation = useGenerateDealShareText();

  const handleGenerate = async (platform: string) => {
    setSelectedPlatform(platform);
    setIsGenerating(true);
    setGeneratedText("");
    setEditedText("");

    try {
      const result = await shareMutation.mutateAsync({ id: dealId, data: { platform: platform as "twitter" | "facebook" | "linkedin" | "reddit" } });
      setGeneratedText(result.text);
      setEditedText(result.text);
    } catch {
      toast({ title: "Error", description: "Failed to generate share text. Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = () => {
    const platform = PLATFORMS.find(p => p.key === selectedPlatform);
    if (!platform) return;
    const shareUrl = platform.shareUrlFn(editedText, permalinkUrl);
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" /> Share This Deal
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">×</button>
        </div>

        {!selectedPlatform ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose a platform — our AI will craft a post tailored to it:</p>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map(p => (
                <button
                  key={p.key}
                  onClick={() => handleGenerate(p.key)}
                  className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <span className="text-2xl font-bold block mb-1">{p.icon}</span>
                  <span className="text-sm font-medium">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => { setSelectedPlatform(null); setGeneratedText(""); setEditedText(""); }} className="text-xs text-primary hover:underline">
                ← Back to platforms
              </button>
              <span className="text-sm font-medium ml-auto">{PLATFORMS.find(p => p.key === selectedPlatform)?.label}</span>
            </div>

            {isGenerating ? (
              <div className="flex items-center justify-center py-8 gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">AI is crafting your post...</span>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Edit the suggested text below:</label>
                  <textarea
                    value={editedText}
                    onChange={e => setEditedText(e.target.value)}
                    className="w-full h-32 bg-secondary/50 border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {selectedPlatform === "twitter" && (
                    <p className={`text-xs mt-1 ${editedText.length > 280 ? "text-red-400" : "text-muted-foreground"}`}>
                      {editedText.length}/280 characters
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleShare}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" /> Share on {PLATFORMS.find(p => p.key === selectedPlatform)?.label}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(editedText);
                      toast({ title: "Copied", description: "Share text copied to clipboard." });
                    }}
                    className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-secondary transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                {generatedText !== editedText && (
                  <button onClick={() => setEditedText(generatedText)} className="text-xs text-primary hover:underline">
                    Reset to AI suggestion
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function DealPermalink() {
  const { id } = useParams<{ id: string }>();
  const { data: deal, isLoading, isError } = useGetDeal(id ?? "");
  const { toast } = useToast();
  const [showShareModal, setShowShareModal] = useState(false);
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-20 bg-card rounded-2xl" />
        <div className="h-96 bg-card rounded-2xl" />
      </div>
    );
  }

  if (isError || !deal) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Deal Not Found" description="This deal may have been removed or the link is invalid." />
        <Card className="p-12 text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground opacity-50" />
          <Link to="/deals" className="text-primary hover:underline flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Deal Dashboard
          </Link>
        </Card>
      </div>
    );
  }

  const scores = deal.scores as ExtendedScores | null;
  const stakeholderEvals = (deal.stakeholderEvaluations ?? {}) as Record<string, { verdict: string; rationale: string }>;
  const redTeamResults = (deal.redTeamResults ?? []) as Array<{ attack: string; severity: string; response: string; survived: boolean }>;
  const domesticEvals = (deal.domesticEvaluations ?? {}) as Record<string, { audience: string; verdict: string; rationale: string }>;
  const domesticFraming = ((deal as Record<string, unknown>).domesticFramingStrategies ?? {}) as Record<string, { audience: string; framingNarrative: string; keyTalkingPoints: string[]; historicalAnalogy?: string; riskOfBackfire: string }>;
  const brainstormInsights = (deal as Record<string, unknown>).brainstormInsights as { historicalAnalogies: Array<{ dealName: string; relevantLesson: string; applicability: string }>; creativeProvisions: Array<{ idea: string; rationale: string; noveltyLevel: string }>; crossIssueLinkages: Array<{ linkage: string; stakeholdersHelped: string[] }>; unconventionalApproaches: string[] } | null;
  const terms = (deal.terms ?? {}) as Record<string, unknown>;
  const negotiatorResult = deal.negotiatorResult as { proposedAmendments: Array<{ stakeholder: string; originalConcern: string; proposedChange: string; likelihood: string }>; negotiationStrategy: string; creativeTradeoffs?: Array<{ gives: string; gets: string; netBenefit: string }> } | null;

  const permalinkUrl = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/deals/${deal.id}`;
  const llmMdUrl = `${getBaseUrl()}/api/deals/${deal.id}/llm.md`;

  const radarData = scores ? SCORE_DIMENSIONS.map(d => ({
    dimension: d.label,
    score: Math.round((scores[d.key] ?? 0) * 100),
  })) : [];

  const survived = redTeamResults.filter(r => r.survived).length;
  const accepts = Object.values(stakeholderEvals).filter(e => e.verdict === "accept").length;
  const conditionals = Object.values(stakeholderEvals).filter(e => e.verdict === "conditional").length;
  const rejects = Object.values(stakeholderEvals).filter(e => e.verdict === "reject").length;

  const handleCopyMarkdown = () => {
    const md = dealToMarkdown(deal as Deal, permalinkUrl);
    navigator.clipboard.writeText(md).then(() => {
      toast({ title: "Copied", description: "Full deal copied as Markdown to clipboard." });
    }).catch(() => {
      toast({ title: "Error", description: "Failed to copy to clipboard.", variant: "destructive" });
    });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex items-center gap-3">
        <Link to="/deals" className="text-primary hover:underline flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> All Deals
        </Link>
      </div>

      <PageHeader
        title={`${deal.architecture.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())} Deal`}
        description={`AI-generated peace deal proposal · ${new Date(deal.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`}
      >
        <div className="flex flex-wrap gap-2">
          {deal.isCurrent && <Badge className="bg-primary/20 text-primary border-primary/40">Champion</Badge>}
          {deal.isPareto && <Badge variant="outline" className="border-amber-500/40 text-amber-400">Pareto</Badge>}
          <Badge variant="outline" className="border-border capitalize">{deal.generatedBy}</Badge>
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowShareModal(true)}
          className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-2"
        >
          <Share2 className="w-4 h-4" /> Share
        </button>
        <button
          onClick={handleCopyMarkdown}
          className="px-4 py-2 bg-secondary/50 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2"
        >
          <Copy className="w-4 h-4" /> Copy as Markdown
        </button>
        <a
          href={llmMdUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-secondary/50 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2"
        >
          <FileText className="w-4 h-4" /> llm.md
        </a>
        <button
          onClick={() => { navigator.clipboard.writeText(permalinkUrl); toast({ title: "Copied", description: "Permalink copied to clipboard." }); }}
          className="px-4 py-2 bg-secondary/50 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" /> Copy Link
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className={`text-3xl font-display font-bold ${scoreColor(scores?.composite ?? 0)}`}>
            {scores ? `${((scores.composite ?? 0) * 100).toFixed(0)}%` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Composite</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-display font-bold text-emerald-400">{accepts}</div>
          <div className="text-xs text-muted-foreground mt-1">Accept</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-display font-bold text-red-400">{rejects}</div>
          <div className="text-xs text-muted-foreground mt-1">Reject</div>
        </Card>
        <Card className="p-4 text-center">
          <div className={`text-3xl font-display font-bold ${survived === redTeamResults.length && redTeamResults.length > 0 ? "text-emerald-400" : "text-amber-400"}`}>
            {redTeamResults.length > 0 ? `${survived}/${redTeamResults.length}` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Red Team</div>
        </Card>
      </div>

      <div className="p-4 rounded-lg border border-amber-700/40 bg-amber-950/10">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-200 font-medium">
              This proposal was generated based on the state of the world at{" "}
              <span className="font-mono text-amber-400">
                {new Date(deal.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}{" "}
                {new Date(deal.createdAt).toLocaleTimeString("en-US", { hour12: false })}
              </span>
            </p>
            {deal.evidenceSummary ? (
              <div className="mt-2">
                <button
                  onClick={() => setEvidenceExpanded(prev => !prev)}
                  className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                >
                  {evidenceExpanded ? "Hide evidence context" : "Show evidence context used"}
                </button>
                {evidenceExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 p-3 rounded border border-amber-800/30 bg-amber-950/20 max-h-96 overflow-y-auto"
                  >
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{safe(deal.evidenceSummary)}</pre>
                  </motion.div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Evidence context was not captured for this deal.</p>
            )}
          </div>
        </div>
      </div>

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
                {key === "timelineYears" ? `${terms[key] ?? "?"} years` : safe(terms[key])}
              </span>
            </div>
          ))}
          {Boolean(terms.stakeholderCommitments && typeof terms.stakeholderCommitments === "object" && Object.keys(terms.stakeholderCommitments as Record<string, unknown>).length > 0) && (
            <div className="border-t border-border/50 pt-3 mt-3">
              <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider block mb-2">Grand Coalition Commitments</span>
              <div className="space-y-1.5">
                {Object.entries(terms.stakeholderCommitments as Record<string, unknown>).map(([id, commitment]) => (
                  <div key={id} className="flex gap-2 text-xs">
                    <span className="text-primary font-semibold capitalize shrink-0 w-24">{id.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">{safe(commitment)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Boolean(Array.isArray(terms.innovativeProvisions) && (terms.innovativeProvisions as unknown[]).length > 0) && (
            <div className="border-t border-border/50 pt-3 mt-3">
              <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider block mb-2">Innovative Provisions</span>
              <div className="space-y-3">
                {(terms.innovativeProvisions as Array<{ title: string; description: string; rationale: string; historicalPrecedent?: string }>).map((prov, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-violet-800/30 bg-violet-950/10">
                    <span className="text-xs font-bold text-violet-300 block mb-1">{safe(prov.title)}</span>
                    <p className="text-xs text-muted-foreground mb-1">{safe(prov.description)}</p>
                    <p className="text-xs text-violet-300 italic">{safe(prov.rationale)}</p>
                    {prov.historicalPrecedent && (
                      <p className="text-xs text-muted-foreground mt-1">Precedent: {safe(prov.historicalPrecedent)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {scores && SCORE_DIMENSIONS.map(d => (
          <Card key={d.key} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: d.color }}>{d.icon}</span>
              <span className="text-sm font-medium">{d.label}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{d.description}</p>
            <div className="flex items-end justify-between">
              <div className={`text-2xl font-display font-bold ${scoreColor(scores[d.key] ?? 0)}`}>
                {((scores[d.key] ?? 0) * 100).toFixed(0)}%
              </div>
              <span className={`text-xs font-medium ${scoreColor(scores[d.key] ?? 0)}`}>{scoreLabel(scores[d.key] ?? 0)}</span>
            </div>
            <div className="mt-2 bg-secondary/50 rounded h-1.5 overflow-hidden">
              <motion.div
                className="h-full rounded"
                style={{ backgroundColor: d.color }}
                initial={{ width: 0 }}
                animate={{ width: `${((scores[d.key] ?? 0) * 100).toFixed(1)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </Card>
        ))}
      </div>

      {radarData.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-2">Score Radar</h3>
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
      )}

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
          <p className="text-sm text-muted-foreground">{safe(deal.diagnosis)}</p>
        </Card>
      )}

      {Object.keys(stakeholderEvals).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-2">Stakeholder Acceptance Map</h3>
          <div className="flex gap-4 text-xs flex-wrap mb-3">
            <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" /> {accepts} Accept</span>
            <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3 h-3" /> {conditionals} Conditional</span>
            <span className="flex items-center gap-1 text-red-400"><XCircle className="w-3 h-3" /> {rejects} Reject</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Object.entries(stakeholderEvals).map(([id, evaluation]) => {
              const cardColor = VERDICT_COLORS[evaluation.verdict] ?? "text-muted-foreground border-border bg-card";
              return (
                <div key={id} className={`p-2 rounded-lg border text-left ${cardColor}`}>
                  <div className="flex items-center gap-1 mb-1">
                    {VERDICT_ICONS[evaluation.verdict]}
                    <span className="font-mono font-bold capitalize truncate text-xs">{id.replace(/[_-]/g, " ")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">{safe(evaluation.rationale)}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {Object.keys(domesticEvals).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Domestic Sellability</h3>
          <div className="space-y-3">
            {Object.entries(domesticEvals).map(([key, ev]) => {
              const color = ev.verdict === "sellable" ? "text-emerald-400 border-emerald-800/40" :
                ev.verdict === "unsellable" ? "text-red-400 border-red-800/40" : "text-amber-400 border-amber-800/40";
              return (
                <div key={key} className={`p-3 rounded-lg border ${color}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{ev.audience || key}</span>
                    <span className={`text-xs font-bold capitalize ${color.split(" ")[0]}`}>{ev.verdict}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{ev.rationale}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {Object.keys(domesticFraming).length > 0 && (
        <Card className="p-6 border-emerald-800/30 bg-emerald-950/5">
          <h3 className="text-lg font-bold mb-4">AI Creative Framing Strategies</h3>
          <div className="space-y-4">
            {Object.entries(domesticFraming).map(([key, strategy]) => (
              <div key={key} className="p-4 rounded-lg border border-emerald-800/30 bg-emerald-950/10">
                <span className="text-sm font-bold text-emerald-300 block mb-2">{safe(strategy.audience)}</span>
                <p className="text-xs text-foreground mb-2 italic">"{safe(strategy.framingNarrative)}"</p>
                <div className="space-y-1 mb-2">
                  {(strategy.keyTalkingPoints ?? []).map((pt: string, i: number) => (
                    <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="text-emerald-500 shrink-0">•</span>
                      <span>{safe(pt)}</span>
                    </div>
                  ))}
                </div>
                {strategy.historicalAnalogy && (
                  <p className="text-xs text-emerald-400 italic">Historical analogy: {safe(strategy.historicalAnalogy)}</p>
                )}
                <p className="text-xs text-amber-400 mt-1">Risk: {safe(strategy.riskOfBackfire)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {redTeamResults.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-2">Red Team Stress Test</h3>
          <p className="text-xs text-muted-foreground mb-4">{survived}/{redTeamResults.length} attacks survived</p>
          <div className="space-y-3">
            {redTeamResults.map((r, i) => (
              <div key={i} className={`p-3 rounded-lg border text-xs ${r.survived ? "border-emerald-800/40 bg-emerald-950/10" : "border-red-800/40 bg-red-950/10"}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-foreground flex-1 font-medium">{safe(r.attack)}</p>
                  <span className={`font-bold shrink-0 text-xs px-2 py-0.5 rounded ${r.survived ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>
                    {r.survived ? "Survived" : "Failed"}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">{safe(r.severity)} severity</p>
                {r.response && <p className="text-muted-foreground mt-1">{safe(r.response)}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {negotiatorResult && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-2">Negotiator Amendments</h3>
          {negotiatorResult.negotiationStrategy && (
            <p className="text-sm text-muted-foreground mb-4">{negotiatorResult.negotiationStrategy}</p>
          )}
          {negotiatorResult.proposedAmendments?.length > 0 && (
            <div className="space-y-2 mb-4">
              {negotiatorResult.proposedAmendments.map((a, i) => (
                <div key={i} className="p-3 rounded-lg border border-border text-xs">
                  <span className="font-bold text-foreground">{a.stakeholder}</span>
                  <span className="text-muted-foreground ml-2">(likelihood: {a.likelihood})</span>
                  <p className="text-muted-foreground mt-1">Concern: {a.originalConcern}</p>
                  <p className="text-primary mt-0.5">Change: {a.proposedChange}</p>
                </div>
              ))}
            </div>
          )}
          {negotiatorResult.creativeTradeoffs && negotiatorResult.creativeTradeoffs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Creative Tradeoffs</h4>
              {negotiatorResult.creativeTradeoffs.map((t, i) => (
                <div key={i} className="p-2 rounded border border-border text-xs">
                  <span className="text-red-400">Gives: {t.gives}</span> → <span className="text-emerald-400">Gets: {t.gets}</span>
                  <p className="text-muted-foreground mt-0.5">{t.netBenefit}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {brainstormInsights && (
        <Card className="p-6 border-violet-800/30 bg-violet-950/5">
          <h3 className="text-lg font-bold mb-4">AI Innovation Brainstorm</h3>
          {brainstormInsights.historicalAnalogies?.length > 0 && (
            <div className="mb-4">
              <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider block mb-2">Historical Analogies</span>
              <div className="space-y-2">
                {brainstormInsights.historicalAnalogies.map((a, i) => (
                  <div key={i} className="p-2 rounded border border-violet-800/20 bg-violet-950/10 text-xs">
                    <span className="font-bold text-violet-300">{safe(a.dealName)}</span>
                    <p className="text-muted-foreground">{safe(a.relevantLesson)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {brainstormInsights.creativeProvisions?.length > 0 && (
            <div className="mb-4">
              <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider block mb-2">Creative Provisions</span>
              <div className="space-y-1">
                {brainstormInsights.creativeProvisions.map((p, i) => (
                  <div key={i} className="text-xs text-muted-foreground">• <span className="text-violet-300">{safe(p.idea)}</span> [{p.noveltyLevel}] — {safe(p.rationale)}</div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {showShareModal && (
        <ShareModal
          dealId={deal.id}
          permalinkUrl={permalinkUrl}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
