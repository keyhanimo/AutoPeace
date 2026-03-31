import React, { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  useGetAutoresearchTimeline,
  useGetChampionLineage,
  useGetPipelineEvolution,
  useGetExperimentStats,
} from "@workspace/api-client-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  BarChart, Bar, Cell,
} from "recharts";
import { TrendingUp, Trophy, GitBranch, Radio, ArrowRight, CheckCircle2, XCircle, Cpu, Zap, ChevronDown, ChevronRight } from "lucide-react";
import { CycleStatusIndicator, useCycleStatus } from "@/components/CycleStatusIndicator";
import { motion, AnimatePresence } from "framer-motion";

function ImprovementTimeline() {
  const { data, isLoading } = useGetAutoresearchTimeline({ limit: 50 });

  const forecastChartData = useMemo(() => {
    if (!data?.forecastTimeline) return [];
    return data.forecastTimeline.map((d, i) => {
      const t = new Date(d.timestamp);
      const ts = !isNaN(t.getTime()) ? `${t.getFullYear().toString().slice(2)}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")} ${t.toLocaleTimeString("en-US",{hour12:false})}` : "";
      return {
        cycle: i + 1,
        label: `#${i + 1} ${ts}`,
        cycleId: d.cycleId.slice(0, 8),
        brier: d.brierScore != null ? Number(d.brierScore.toFixed(4)) : null,
        log: d.logScore != null ? Number(d.logScore.toFixed(4)) : null,
        retained: d.experimentsRetained,
        run: d.experimentsRun,
      };
    });
  }, [data]);

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
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Forecast Score Over Time</h3>
        </div>
        {forecastChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={forecastChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" tick={(props: any) => { const { x, y, payload } = props; return (<g transform={`translate(${x},${y})`}><text x={0} y={0} dy={12} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={9} transform="rotate(-35)">{payload.value}</text></g>); }} height={50} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 4, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="brier" name="Brier Score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="log" name="Log Score" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No forecast cycles recorded yet.</p>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Deal Composite Score Over Time</h3>
        </div>
        {dealChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dealChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" tick={(props: any) => { const { x, y, payload } = props; return (<g transform={`translate(${x},${y})`}><text x={0} y={0} dy={12} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={9} transform="rotate(-35)">{payload.value}</text></g>); }} height={50} stroke="hsl(var(--muted-foreground))" />
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

function ChampionLineage() {
  const { data, isLoading } = useGetChampionLineage({ task: "all", limit: 30 });

  if (isLoading) return <div className="text-sm text-muted-foreground animate-pulse py-8 text-center">Loading lineage...</div>;

  const champions = data?.champions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold uppercase tracking-wider">Retained Champions</span>
        <span className="text-xs text-muted-foreground ml-2">
          <span className="font-bold text-foreground">{data?.totalRetained ?? 0}</span> retained / <span className="font-bold text-foreground">{data?.totalExperiments ?? 0}</span> total
        </span>
      </div>

      {champions.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No champion experiments found yet.</p>
        </Card>
      ) : (
        <div className="space-y-3 relative before:absolute before:left-5 before:top-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:to-transparent">
          {champions.map((c, i) => {
            const scoresBefore = c.scoresBefore as Record<string, number> | null;
            const scoresAfter = c.scoresAfter as Record<string, number> | null;
            const improvement = scoresBefore && scoresAfter
              ? Object.keys(scoresAfter).some(k => (scoresAfter[k] ?? 0) > (scoresBefore[k] ?? 0))
              : null;

            const scoreDeltas = scoresBefore && scoresAfter
              ? Object.keys(scoresAfter).filter(k => k !== "composite").map(k => ({
                  key: k,
                  before: scoresBefore[k] ?? 0,
                  after: scoresAfter[k] ?? 0,
                  delta: (scoresAfter[k] ?? 0) - (scoresBefore[k] ?? 0),
                }))
              : [];

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-4 ml-10 relative">
                  <div className="absolute -left-[2.15rem] top-4 w-3 h-3 rounded-full bg-primary border-2 border-background z-10" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-[9px] ${c.task === "A" ? "border-blue-500/40 text-blue-400" : c.task === "both" ? "border-violet-500/40 text-violet-400" : "border-amber-500/40 text-amber-400"}`}>
                          {c.task === "A" ? "Forecast" : c.task === "both" ? "Forecast + Deal" : "Deal"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">#{c.cycleId.slice(0, 8)}</span>
                        {improvement !== null && (
                          improvement
                            ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            : <XCircle className="w-3 h-3 text-red-400" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">{c.changeDescription}</p>
                      {c.diagnosis && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.diagnosis}</p>
                      )}
                      {(scoreDeltas.length > 0 || (c as any).dealInfo) && (
                        <div className="mt-2 space-y-2">
                          {scoreDeltas.length > 0 && (
                            <div>
                              <p className="text-[9px] text-blue-400/80 uppercase tracking-wider font-bold mb-1">Forecast Outcome Probabilities</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                                {scoreDeltas.map(sd => (
                                  <div key={sd.key} className="flex items-center gap-1.5 text-[10px]">
                                    <span className="text-muted-foreground truncate capitalize">{sd.key.replace(/_/g, " ")}</span>
                                    <span className="font-mono text-muted-foreground/60">{Math.round(sd.before * 100)}</span>
                                    <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/40" />
                                    <span className="font-mono text-foreground">{Math.round(sd.after * 100)}</span>
                                    <span className={`font-mono font-bold ${sd.delta > 0 ? "text-emerald-400" : sd.delta < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                                      {sd.delta > 0 ? "+" : ""}{Math.round(sd.delta * 100)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {(c as any).dealInfo && (
                            <div>
                              <p className="text-[9px] text-amber-400/80 uppercase tracking-wider font-bold mb-1">Deal Composite Score</p>
                              <div className="flex items-center gap-3 text-[10px]">
                                <span className="text-muted-foreground">
                                  Composite: <strong className="font-mono text-foreground">{Math.round((c as any).dealInfo.compositeScore * 100)}%</strong>
                                </span>
                                <span className="text-muted-foreground">
                                  Architecture: <strong className="text-foreground capitalize">{(c as any).dealInfo.architecture}</strong>
                                </span>
                                {(c as any).dealInfo.isCurrent && (
                                  <Badge className="text-[8px] bg-amber-500/20 text-amber-400 border-amber-500/30">Current Best</Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(c.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                        {c.tokensConsumed.toLocaleString()} tok
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
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
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Retention Rate</p>
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

const VALID_TABS = ["timeline", "champions", "evolution", "live"] as const;

export default function AutoresearchLab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(tabParam as typeof VALID_TABS[number])
    ? (tabParam as string)
    : "timeline";

  const handleTabChange = (value: string) => {
    setSearchParams(value === "timeline" ? {} : { tab: value }, { replace: true });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Autoresearch Lab"
        description="Visualize how the AI pipeline iteratively improves forecasts and peace deals — Karpathy's autoresearch concept in action."
      />

      <div className="flex items-center gap-3 text-xs text-muted-foreground bg-primary/5 border border-primary/20 p-3 rounded-sm">
        <Zap className="w-4 h-4 text-primary shrink-0" />
        <span>
          Each cycle, the system runs experiments (prompt mutations), evaluates them against the current champion, and retains only improvements.
          Over time, this hill-climbing process drives measurable score gains.
        </span>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start border-b border-border/50 bg-transparent h-auto p-0 rounded-none">
          <TabsTrigger
            value="timeline"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2.5 text-sm"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Improvement Timeline
          </TabsTrigger>
          <TabsTrigger
            value="champions"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2.5 text-sm"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Champion Lineage
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

        <TabsContent value="timeline" className="mt-6">
          <ImprovementTimeline />
        </TabsContent>
        <TabsContent value="champions" className="mt-6">
          <ChampionLineage />
        </TabsContent>
        <TabsContent value="evolution" className="mt-6">
          <PipelineEvolutionView />
        </TabsContent>
        <TabsContent value="live" className="mt-6">
          <LiveStatus />
        </TabsContent>
      </Tabs>

      <div className="flex gap-3">
        <Link to="/changelog" className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
          Changelog <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
