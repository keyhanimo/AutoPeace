import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useListChangelog, useGetChangelogEntry } from "@workspace/api-client-react";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";
import { GitCommit, TrendingUp, BarChart2, ChevronDown, ChevronUp, Handshake, Radio } from "lucide-react";
import { ChangelogAutoresearchBadge } from "@/components/AutoresearchBadge";

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
  evidenceGrounding: 'Evidence',
  domesticSellability: 'Domestic',
  regionalStability: 'Regional',
  implementability: 'Implementability',
  durability: 'Durability',
};

function isDealEntry(entry: { headline: string; scoreDelta?: unknown; forecastDelta?: unknown }): boolean {
  if (entry.scoreDelta && typeof entry.scoreDelta === "object" && Object.keys(entry.scoreDelta as object).length > 0) {
    return true;
  }
  if (entry.forecastDelta && typeof entry.forecastDelta === "object" && Object.keys(entry.forecastDelta as object).length > 0) {
    return false;
  }
  return entry.headline.startsWith("New best deal:") || entry.headline.startsWith("Deal cycle:");
}

function ScoreBar({ entries }: { entries: { key: string; value: number }[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
        <BarChart2 className="w-3 h-3" /> Deal Scores
      </p>
      {entries.map(({ key, value }) => (
        <div key={key} className="flex items-center gap-2">
          <div className="w-28 shrink-0 text-xs text-muted-foreground truncate">{SCORE_LABELS[key] ?? key}</div>
          <div className="flex-1 bg-secondary/50 rounded h-2 overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{ width: `${Math.min(100, value)}%`, backgroundColor: SCORE_COLORS[key] ?? '#94a3b8' }}
            />
          </div>
          <div className="w-10 text-right text-xs font-mono text-foreground shrink-0">{value.toFixed(0)}%</div>
        </div>
      ))}
    </div>
  );
}

function ForecastDeltaBar({ delta }: { delta: Record<string, unknown> }) {
  const entries = Object.entries(delta)
    .filter(([, v]) => typeof v === 'number')
    .map(([k, v]) => ({ key: k, value: (v as number) * 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  if (entries.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
        <BarChart2 className="w-3 h-3" /> Forecast Distribution
      </p>
      {entries.map(({ key, value }) => (
        <div key={key} className="flex items-center gap-2">
          <div className="w-28 shrink-0 text-xs text-muted-foreground truncate capitalize">{key.replace(/_/g, ' ')}</div>
          <div className="flex-1 bg-secondary/50 rounded h-2 overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{ width: `${Math.min(100, value)}%`, backgroundColor: OUTCOME_COLORS[key] ?? '#94a3b8' }}
            />
          </div>
          <div className="w-10 text-right text-xs font-mono text-foreground shrink-0">{value.toFixed(0)}%</div>
        </div>
      ))}
    </div>
  );
}

function ChangelogEntryDetail({ id }: { id: string }) {
  const { data: entry, isLoading } = useGetChangelogEntry(id);
  if (isLoading) return <div className="text-xs text-muted-foreground animate-pulse py-2">Loading details...</div>;
  if (!entry) return null;

  const isDeal = isDealEntry(entry as { headline: string; scoreDelta?: unknown; forecastDelta?: unknown });
  const hasKeyEvidence = entry.keyEvidence && Array.isArray(entry.keyEvidence) && entry.keyEvidence.length > 0;
  const hasNotes = !!entry.notes;

  if (!hasKeyEvidence && !hasNotes) {
    return (
      <div className="mt-3 pt-3 border-t border-border/50">
        <p className="text-xs text-muted-foreground italic">No additional details available for this entry.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
      {hasNotes && (
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
            {isDeal ? "Deal Summary" : "Cycle Summary"}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{entry.notes}</p>
        </div>
      )}

      {hasKeyEvidence && (
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Key Evidence</p>
          <ul className="space-y-1">
            {(entry.keyEvidence as Array<{ title: string }>).slice(0, 5).map((ev, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-2">
                <span className="text-primary shrink-0 font-bold">{i + 1}.</span>
                <span>{ev.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Changelog() {
  const { data: changelogRes, isLoading } = useListChangelog({ limit: 30 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const entries = changelogRes?.data || [];

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Platform Changelog"
        description="Chronological updates from the autoresearch loop — forecast shifts, deal engine results, and model evolution."
      />

      <ChangelogAutoresearchBadge />

      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:via-primary/50 before:to-transparent">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading feed...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No changelog entries yet.</div>
        ) : (
          entries.map((entry) => {
            const deal = isDealEntry(entry as { headline: string; scoreDelta?: unknown; forecastDelta?: unknown });
            const isNewBest = entry.headline.startsWith("New best deal:");

            return (
              <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 border-2 ${deal ? 'border-amber-500/40' : 'border-primary/40'} bg-card shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 ${deal ? 'text-amber-400' : 'text-primary'}`}>
                  {deal ? <Handshake className="w-5 h-5" /> : <Radio className="w-5 h-5" />}
                </div>

                <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 hover:shadow-primary/5 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </span>
                      <Badge variant="outline" className={`text-[9px] px-1.5 ${deal ? 'border-amber-700/40 text-amber-400' : 'border-primary/40 text-primary'}`}>
                        {deal ? (isNewBest ? 'New Best' : 'Deal') : 'Forecast'}
                      </Badge>
                    </div>
                    <Link
                      to={`/changelog/${entry.id}`}
                      className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors"
                      title="Permalink to this entry"
                    >
                      #{entry.cycleId.slice(0, 8)}
                    </Link>
                  </div>

                  <h3 className="text-lg font-bold text-foreground leading-tight mb-3">{entry.headline}</h3>

                  {!deal && entry.forecastDelta && typeof entry.forecastDelta === 'object' && (
                    <ForecastDeltaBar delta={entry.forecastDelta as Record<string, unknown>} />
                  )}

                  {deal && entry.scoreDelta && typeof entry.scoreDelta === 'object' && (() => {
                    const scoreEntries = Object.entries(entry.scoreDelta as Record<string, unknown>)
                      .filter(([, v]) => typeof v === 'number')
                      .map(([k, v]) => ({ key: k, value: (v as number) * 100 }))
                      .sort((a, b) => a.key === 'composite' ? -1 : b.key === 'composite' ? 1 : b.value - a.value);
                    return scoreEntries.length > 0 ? <ScoreBar entries={scoreEntries} /> : null;
                  })()}

                  <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {deal ? (
                        <>
                          <Handshake className="w-4 h-4 text-amber-400" />
                          <span>{isNewBest ? 'Improved current best' : 'Did not improve'}</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          <span>Forecast updated</span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                    >
                      {expandedId === entry.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {expandedId === entry.id ? 'Hide' : 'Details'}
                    </button>
                  </div>

                  {expandedId === entry.id && <ChangelogEntryDetail id={entry.id} />}
                </Card>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
