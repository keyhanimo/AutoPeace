import React from "react";
import { useParams, Link } from "react-router-dom";
import { useGetChangelogEntry } from "@workspace/api-client-react";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatDistanceToNow, format } from "date-fns";
import { ArrowLeft, GitCommit, BarChart2, TrendingUp, FileText, Handshake } from "lucide-react";

const OUTCOME_COLORS: Record<string, string> = {
  continued_conflict: "#ef4444",
  major_escalation: "#b91c1c",
  informal_deescalation: "#f59e0b",
  limited_ceasefire: "#fcd34d",
  humanitarian_mini_deal: "#34d399",
  sanctions_partial_deal: "#10b981",
  regional_framework: "#059669",
  broad_settlement: "#0284c7",
};

const SCORE_COLORS: Record<string, string> = {
  composite: '#8b5cf6',
  feasibility: '#3b82f6',
  coherence: '#06b6d4',
  evidenceGrounding: '#14b8a6',
  domesticSellability: '#f59e0b',
  regionalStability: '#10b981',
  implementability: '#6366f1',
  durability: '#ec4899',
};

const SCORE_LABELS: Record<string, string> = {
  composite: 'Composite',
  feasibility: 'Feasibility',
  coherence: 'Coherence',
  evidenceGrounding: 'Evidence Grounding',
  domesticSellability: 'Domestic Sellability',
  regionalStability: 'Regional Stability',
  implementability: 'Implementability',
  durability: 'Durability',
};

export default function ChangelogEntry() {
  const { id } = useParams<{ id: string }>();
  const { data: entry, isLoading, isError } = useGetChangelogEntry(id ?? "");

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-4 animate-pulse">
        <div className="h-6 bg-secondary rounded w-1/3" />
        <div className="h-40 bg-secondary rounded" />
      </div>
    );
  }

  if (isError || !entry) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <p className="text-muted-foreground">Changelog entry not found.</p>
        <Link to="/changelog" className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Changelog
        </Link>
      </div>
    );
  }

  const hasScoreDelta = entry.scoreDelta && typeof entry.scoreDelta === "object" && Object.keys(entry.scoreDelta as object).length > 0;
  const hasForecastDelta = entry.forecastDelta && typeof entry.forecastDelta === "object" && Object.keys(entry.forecastDelta as object).length > 0;
  const isDeal = hasScoreDelta ? true : hasForecastDelta ? false : (entry.headline.startsWith("New best deal:") || entry.headline.startsWith("Deal cycle:"));
  const isNewBest = entry.headline.startsWith("New best deal:");

  const forecastDelta = !isDeal && entry.forecastDelta && typeof entry.forecastDelta === "object"
    ? Object.entries(entry.forecastDelta as Record<string, unknown>)
        .filter(([, v]) => typeof v === "number")
        .map(([k, v]) => ({ key: k, value: (v as number) * 100 }))
        .sort((a, b) => b.value - a.value)
    : [];

  const scoreDelta = isDeal && entry.scoreDelta && typeof entry.scoreDelta === "object"
    ? Object.entries(entry.scoreDelta as Record<string, unknown>)
        .filter(([, v]) => typeof v === "number")
        .map(([k, v]) => ({ key: k, value: (v as number) * 100 }))
        .sort((a, b) => a.key === "composite" ? -1 : b.key === "composite" ? 1 : b.value - a.value)
    : [];

  const keyEvidence = Array.isArray(entry.keyEvidence)
    ? (entry.keyEvidence as Array<{ title: string }>)
    : [];

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl mx-auto pb-12">
      <div>
        <Link
          to="/changelog"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Changelog
        </Link>
        <PageHeader
          title={entry.headline}
          description={
            entry.timestamp
              ? `${format(new Date(entry.timestamp), "PPPp")} · ${formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}`
              : ""
          }
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="outline" className="font-mono text-xs">
          <GitCommit className="w-3 h-3 mr-1" />
          #{entry.cycleId?.slice(0, 8)}
        </Badge>
        <Badge variant="outline" className={`text-xs ${isDeal ? 'border-amber-700/40 text-amber-400' : ''}`}>
          {isDeal ? (
            <>
              <Handshake className="w-3 h-3 mr-1" />
              {isNewBest ? 'New Best Deal' : 'Deal Cycle'}
            </>
          ) : (
            <>
              <TrendingUp className="w-3 h-3 mr-1" />
              {entry.experimentsRetained}/{entry.experimentsTried} mutations retained
            </>
          )}
        </Badge>
      </div>

      {entry.notes && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" /> {isDeal ? "Deal Summary" : "Cycle Summary"}
          </div>
          <p className="text-sm text-foreground leading-relaxed">{entry.notes}</p>
        </Card>
      )}

      {forecastDelta.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <BarChart2 className="w-3.5 h-3.5" /> Forecast Distribution
          </div>
          <div className="space-y-3">
            {forecastDelta.map(({ key, value }) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-36 shrink-0 text-sm text-muted-foreground capitalize truncate">
                  {key.replace(/_/g, " ")}
                </div>
                <div className="flex-1 bg-secondary/50 rounded h-3 overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${Math.min(100, value)}%`,
                      backgroundColor: OUTCOME_COLORS[key] ?? "#94a3b8",
                    }}
                  />
                </div>
                <div className="w-12 text-right text-sm font-mono text-foreground shrink-0">
                  {value.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {scoreDelta.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <Handshake className="w-3.5 h-3.5" /> Deal Scores
          </div>
          <div className="space-y-3">
            {scoreDelta.map(({ key, value }) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-36 shrink-0 text-sm text-muted-foreground truncate">
                  {SCORE_LABELS[key] ?? key}
                </div>
                <div className="flex-1 bg-secondary/50 rounded h-3 overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${Math.min(100, value)}%`,
                      backgroundColor: SCORE_COLORS[key] ?? "#94a3b8",
                    }}
                  />
                </div>
                <div className={`w-12 text-right text-sm font-mono shrink-0 ${value >= 65 ? "text-emerald-400" : value >= 45 ? "text-amber-400" : "text-red-400"}`}>
                  {value.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {keyEvidence.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Key Evidence
          </div>
          <ol className="space-y-3">
            {keyEvidence.map((ev, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-primary font-bold shrink-0 w-5">{i + 1}.</span>
                <span className="text-foreground leading-relaxed">{ev.title}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground font-mono">
          Permalink: /changelog/{id}
        </p>
      </div>
    </div>
  );
}
