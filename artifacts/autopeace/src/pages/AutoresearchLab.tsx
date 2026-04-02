import React, { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  useGetAutoresearchTimeline,
  useGetPipelineEvolution,
  useGetExperimentStats,
  useListChangelog,
  useGetChangelogEntry,
} from "@workspace/api-client-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  TrendingUp, GitBranch, Radio, Zap, ChevronDown, ChevronRight,
  ChevronUp, Handshake, BarChart2, BookOpen,
} from "lucide-react";
import { CycleStatusIndicator, useCycleStatus } from "@/components/CycleStatusIndicator";
import { ChangelogAutoresearchBadge } from "@/components/AutoresearchBadge";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

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

function ChangelogFeed() {
  const { data: changelogRes, isLoading } = useListChangelog({ limit: 30 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const entries = changelogRes?.data || [];

  return (
    <div className="space-y-6">
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

function DealTimeline() {
  const { data, isLoading } = useGetAutoresearchTimeline({ limit: 50 });

  const dealChartData = useMemo(() => {
    if (!data?.dealTimeline) return [];
    return data.dealTimeline.map((d, i) => {
      const t = new Date(d.timestamp);
      const ts = !isNaN(t.getTime()) ? `${t.getFullYear().toString().slice(2)}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")} ${t.toLocaleTimeString("en-US",{hour12:false})}` : "";
      return {
        deal: i + 1,
        label: `#${i + 1} ${ts}`,
        composite: Math.round(d.compositeScore * 100),
        architecture: d.architecture,
        isCurrent: d.isCurrent,
      };
    });
  }, [data]);

  if (isLoading) return <div className="text-sm text-muted-foreground animate-pulse py-8 text-center">Loading timeline...</div>;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Deal Composite Score Over Time</h3>
        </div>
        {dealChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={dealChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" tick={(props: any) => { const { x, y, payload } = props; return (<g transform={`translate(${x},${y})`}><text x={0} y={0} dy={12} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={9} transform="rotate(-35)">{payload.value}</text></g>); }} height={80} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 4, fontSize: 12 }} formatter={(v: number) => [`${v}%`, "Composite"]} />
              <Bar dataKey="composite" name="Composite %" radius={[2, 2, 0, 0]}>
                {dealChartData.map((d, i) => (
                  <Cell key={i} fill={d.isCurrent ? "#f59e0b" : "#3b82f6"} opacity={d.isCurrent ? 1 : 0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No deals generated yet.</p>
        )}
      </Card>
    </div>
  );
}

function PipelineEvolutionView() {
  const { data, isLoading } = useGetPipelineEvolution();
  const [expandedGen, setExpandedGen] = useState<string | null>(null);

  if (isLoading) return <div className="text-sm text-muted-foreground animate-pulse py-8 text-center">Loading evolution...</div>;

  const generations = data?.generations ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <GitBranch className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-wider">Pipeline Generations</h3>
        <Badge variant="outline" className="text-[10px]">Current: Gen {data?.currentGeneration ?? 0}</Badge>
      </div>

      {generations.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No pipeline evolution records yet.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {generations.map((g) => {
            const overrides = (g.promptOverrides as Record<string, string> | null) ?? {};
            const overrideKeys = Object.keys(overrides);
            const isExpanded = expandedGen === g.id;

            return (
              <Card key={g.id} className={`p-4 ${g.isCurrent ? "border-primary/40 bg-primary/5" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-foreground">Gen {g.generation}</span>
                      {g.isCurrent && <Badge className="text-[9px] bg-primary/20 text-primary border-primary/30">Current</Badge>}
                      {g.parentConfigId && (
                        <span className="text-[10px] text-muted-foreground">← from {g.parentConfigId.slice(0, 8)}</span>
                      )}
                    </div>
                    <p className="text-sm text-foreground">{g.description}</p>
                    {overrideKeys.length > 0 && (
                      <button
                        onClick={() => setExpandedGen(isExpanded ? null : g.id)}
                        className="mt-2 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span className="font-medium">{overrideKeys.length} prompt override{overrideKeys.length !== 1 ? "s" : ""}</span>
                      </button>
                    )}
                    <AnimatePresence>
                      {isExpanded && overrideKeys.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 space-y-2 border-l-2 border-primary/20 pl-3">
                            {overrideKeys.map(k => (
                              <div key={k}>
                                <p className="text-[10px] font-mono font-bold text-primary/80 uppercase">{k}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-wrap">{overrides[k]}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    {g.avgCompositeScore != null && (
                      <p className="text-sm font-bold font-mono">{Math.round(g.avgCompositeScore * 100)}%</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{g.dealCount} deals</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(g.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LiveStatus() {
  const status = useCycleStatus();
  const { data: stats } = useGetExperimentStats();

  const elapsed = status?.cycleStartedAt
    ? Math.floor((Date.now() - status.cycleStartedAt) / 1000)
    : null;
  const elapsedLabel = elapsed != null
    ? elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Cycles Run</p>
          <p className="text-3xl font-bold font-display">{stats?.cyclesRun ?? "--"}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Deal Retention Rate</p>
          <p className="text-3xl font-bold font-display">{stats ? `${Math.round(stats.retentionRate * 100)}%` : "--"}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{stats?.retained} / {stats?.total} retained</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Total Tokens</p>
          <p className="text-3xl font-bold font-display">
            {stats ? new Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short" }).format(stats.totalTokensConsumed) : "--"}
          </p>
        </Card>
        <Card className={`p-5 ${status?.isRunning ? "border-primary/40 bg-primary/5" : ""}`}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Current Cycle</p>
          {status?.isRunning ? (
            <>
              <p className="text-lg font-bold font-display capitalize">{status.stage?.replace(/_/g, " ") ?? "Running"}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {status.stagesCompleted.length} stages done
                {elapsedLabel && <> · {elapsedLabel} elapsed</>}
              </p>
            </>
          ) : (
            <p className="text-lg font-bold font-display text-muted-foreground">Idle</p>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Pipeline Status</h3>
        <CycleStatusIndicator />
      </Card>

      {status && (
        <Card className="p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Connection Details</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium text-foreground flex items-center gap-1.5">
                {status.isRunning ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    Running
                  </>
                ) : "Idle"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Current Stage</p>
              <p className="font-medium text-foreground">{status.stage ?? "None"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cycle ID</p>
              <p className="font-mono font-medium text-foreground">{status.cycleId?.slice(0, 12) ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Stages Completed</p>
              <p className="font-medium text-foreground">{status.stagesCompleted?.length ?? 0}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

const VALID_TABS = ["changelog", "timeline", "evolution", "live"] as const;

export default function AutoresearchLab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(tabParam as typeof VALID_TABS[number])
    ? (tabParam as string)
    : "changelog";

  const handleTabChange = (value: string) => {
    setSearchParams(value === "changelog" ? {} : { tab: value }, { replace: true });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Autoresearch Lab"
        description="Chronological updates from the autoresearch loop — forecast shifts, deal engine results, pipeline evolution, and live cycle status."
      />

      <div className="flex items-center gap-3 text-xs text-muted-foreground bg-primary/5 border border-primary/20 p-3 rounded-sm">
        <Zap className="w-4 h-4 text-primary shrink-0" />
        <span>
          Each cycle, the deal engine generates a new peace proposal, evaluates it through a 9-stage pipeline,
          and retains it only if it scores higher than the current champion. Over time, this drives measurable deal quality gains.
        </span>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start border-b border-border/50 bg-transparent h-auto p-0 rounded-none">
          <TabsTrigger
            value="changelog"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2.5 text-sm"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Changelog
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2.5 text-sm"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Deal Timeline
          </TabsTrigger>
          <TabsTrigger
            value="evolution"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2.5 text-sm"
          >
            <GitBranch className="w-4 h-4 mr-2" />
            Pipeline Evolution
          </TabsTrigger>
          <TabsTrigger
            value="live"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2.5 text-sm"
          >
            <Radio className="w-4 h-4 mr-2" />
            Live Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="changelog" className="mt-6">
          <ChangelogFeed />
        </TabsContent>
        <TabsContent value="timeline" className="mt-6">
          <DealTimeline />
        </TabsContent>
        <TabsContent value="evolution" className="mt-6">
          <PipelineEvolutionView />
        </TabsContent>
        <TabsContent value="live" className="mt-6">
          <LiveStatus />
        </TabsContent>
      </Tabs>
    </div>
  );
}
