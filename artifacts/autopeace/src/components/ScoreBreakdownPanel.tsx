import React, { useState } from "react";
import type { DealScores } from "@workspace/api-client-react";
import { Code, Brain } from "lucide-react";

export const SCORE_DIMENSIONS: { key: keyof DealScores; label: string; color: string; weight: number; description: string }[] = [
  { key: "feasibility", label: "Feasibility", color: "#10b981", weight: 0.20, description: "Likelihood the deal gets signed by all required parties" },
  { key: "coherence", label: "Coherence", color: "#0284c7", weight: 0.15, description: "Internal consistency of the terms — do they contradict each other?" },
  { key: "evidenceGrounding", label: "Evidence", color: "#f59e0b", weight: 0.10, description: "How well the terms reflect documented evidence and real-world constraints" },
  { key: "domesticSellability", label: "Domestic", color: "#8b5cf6", weight: 0.20, description: "Can leaders sell this deal domestically? (US Congress, Iran IRGC, etc.)" },
  { key: "regionalStability", label: "Regional", color: "#06b6d4", weight: 0.15, description: "Predicted impact on broader Middle East stability" },
  { key: "implementability", label: "Implement.", color: "#f97316", weight: 0.10, description: "Technical and logistical ease of executing the terms" },
  { key: "durability", label: "Durability", color: "#ec4899", weight: 0.10, description: "Resilience against future shocks or changes in leadership" },
];

export type ExtendedScores = DealScores & {
  judgePanel?: Array<{ provider: string; model: string; scores: Record<string, number>; rationale: Record<string, string> }>;
  judgePrompt?: string;
  scoreRationale?: Record<string, string>;
};

function scoreColor(score: number) {
  if (score >= 0.65) return "text-emerald-400";
  if (score >= 0.45) return "text-amber-400";
  return "text-red-400";
}

const PROVIDER_LABELS: Record<string, { label: string; color: string }> = {
  anthropic: { label: "Anthropic (Claude)", color: "#d97706" },
  openai: { label: "OpenAI (GPT)", color: "#10b981" },
  gemini: { label: "Google (Gemini)", color: "#3b82f6" },
};

export function ScoreBreakdownPanel({
  scores,
  label,
}: {
  scores: ExtendedScores;
  label: string;
}) {
  const [activeJudge, setActiveJudge] = useState<string>("averaged");
  const [showPrompt, setShowPrompt] = useState(false);
  const panel = scores.judgePanel ?? [];
  const hasPanel = panel.length > 0;
  const activeEntry = activeJudge === "averaged" ? null : panel.find(e => e.provider === activeJudge);
  const displayScores = activeEntry ? activeEntry.scores : Object.fromEntries(SCORE_DIMENSIONS.map(d => [d.key, scores[d.key] ?? 0]));
  const displayRationale = activeEntry ? activeEntry.rationale : (scores.scoreRationale ?? {});

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5" /> {label}
        </h4>
        {scores.judgePrompt && (
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors"
          >
            <Code className="w-3 h-3" /> {showPrompt ? "Hide" : "Show"} Prompt
          </button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mb-3">
        {hasPanel
          ? `Scored by ${panel.length} independent LLM judges. Final scores are the arithmetic mean across all models. Click a model tab to see its individual scores and rationale.`
          : "Scored by a single LLM judge."}
      </p>

      {showPrompt && scores.judgePrompt && (
        <div className="mb-4 p-3 bg-secondary/30 border border-border/50 rounded-sm overflow-auto max-h-48">
          <p className="text-[9px] font-bold text-primary uppercase tracking-wider mb-2">Judge Prompt (sent to all {panel.length} LLMs)</p>
          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{scores.judgePrompt}</pre>
        </div>
      )}

      {hasPanel && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setActiveJudge("averaged")}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-sm border transition-colors ${
              activeJudge === "averaged"
                ? "bg-primary/10 border-primary/50 text-primary"
                : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            Averaged ({panel.length} models)
          </button>
          {panel.map(entry => {
            const info = PROVIDER_LABELS[entry.provider] ?? { label: entry.provider, color: "#94a3b8" };
            return (
              <button
                key={entry.provider}
                onClick={() => setActiveJudge(entry.provider)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-sm border transition-colors ${
                  activeJudge === entry.provider
                    ? "bg-primary/10 border-primary/50 text-primary"
                    : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: info.color }} />
                {info.label}
                <span className="ml-1 text-[8px] text-muted-foreground/60 font-mono">{entry.model}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        {SCORE_DIMENSIONS.map(d => {
          const val = displayScores[d.key] ?? 0;
          const pct = Math.round(val * 100);
          const rationale = displayRationale[d.key] || undefined;

          const perModelScores = hasPanel ? panel.map(e => ({
            provider: e.provider,
            score: Math.round((e.scores[d.key] ?? 0) * 100),
            color: (PROVIDER_LABELS[e.provider] ?? { color: "#94a3b8" }).color,
          })) : [];

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
              {activeJudge === "averaged" && hasPanel && (
                <div className="flex items-center gap-3 mb-1.5">
                  {perModelScores.map(m => (
                    <span key={m.provider} className="text-[9px] font-mono text-muted-foreground flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: m.color }} />
                      {m.score}%
                    </span>
                  ))}
                </div>
              )}
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
          <span className="text-xs font-bold text-primary">
            {activeJudge === "averaged" ? "Composite Score (Averaged)" : `Composite Score (${(PROVIDER_LABELS[activeJudge] ?? { label: activeJudge }).label})`}
          </span>
          {(() => {
            const c = activeJudge === "averaged"
              ? (scores.composite ?? 0)
              : SCORE_DIMENSIONS.reduce((sum, d) => sum + (displayScores[d.key] ?? 0) * d.weight, 0);
            return <span className={`text-lg font-bold font-mono ${scoreColor(c)}`}>{(c * 100).toFixed(0)}%</span>;
          })()}
        </div>
        <p className="text-[9px] text-muted-foreground mt-1">
          Weighted: Feasibility 20% + Domestic 20% + Coherence 15% + Regional 15% + Evidence 10% + Implement. 10% + Durability 10%
        </p>
      </div>
    </div>
  );
}
