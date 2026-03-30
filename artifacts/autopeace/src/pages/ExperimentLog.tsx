import React, { useState, useMemo } from "react";
import { useListExperiments, useGetExperimentStats, useGetSolutionTree } from "@workspace/api-client-react";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import {
  CheckCircle2, XCircle, Cpu, ChevronLeft, ChevronRight,
  Search, Filter, ChevronDown, ChevronUp, Clock, FileText,
  GitBranch, Stethoscope, BarChart3,
} from "lucide-react";
import { DataSourceNote } from "@/components/DataSourceNote";

type TaskFilter = "all" | "A" | "B" | "both";
type RetainedFilter = "all" | "true" | "false";
type ActiveView = "log" | "tree";

const OUTCOME_LABELS: Record<string, string> = {
  continued_conflict: "Continued Conflict",
  informal_deescalation: "Informal De-escalation",
  limited_ceasefire: "Limited Ceasefire",
  humanitarian_mini_deal: "Humanitarian Mini-Deal",
  sanctions_partial_deal: "Sanctions Partial Deal",
  regional_framework: "Regional Framework",
  broad_settlement: "Broad Settlement",
  major_escalation: "Major Escalation",
};

function formatOutcome(key: string): string {
  return OUTCOME_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-[140px] text-muted-foreground truncate" title={label}>{label}</span>
      <div className="flex-1 bg-secondary/50 rounded h-2 overflow-hidden min-w-[80px]">
        <div className="h-full rounded transition-all" style={{ width: `${(value * 100).toFixed(1)}%`, backgroundColor: color }} />
      </div>
      <span className="w-[42px] text-right font-mono text-foreground">{(value * 100).toFixed(1)}%</span>
    </div>
  );
}

function ScoresComparison({ before, after }: { before: Record<string, number> | null; after: Record<string, number> | null }) {
  if (!before && !after) return <p className="text-xs text-muted-foreground">No score data available.</p>;

  const allKeys = Array.from(new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ])).sort((a, b) => (after?.[b] ?? before?.[b] ?? 0) - (after?.[a] ?? before?.[a] ?? 0));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {before && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Before</h4>
          <div className="space-y-1.5">
            {allKeys.map(k => (
              <ScoreBar key={k} label={formatOutcome(k)} value={before[k] ?? 0} color="#64748b" />
            ))}
          </div>
        </div>
      )}
      {after && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">After</h4>
          <div className="space-y-1.5">
            {allKeys.map(k => {
              const v = after[k] ?? 0;
              const bv = before?.[k] ?? 0;
              const delta = v - bv;
              return (
                <div key={k} className="flex items-center gap-1">
                  <div className="flex-1">
                    <ScoreBar label={formatOutcome(k)} value={v} color={delta > 0.005 ? "#10b981" : delta < -0.005 ? "#ef4444" : "#0284c7"} />
                  </div>
                  {before && (
                    <span className={`text-[10px] w-[48px] text-right font-mono ${delta > 0.005 ? "text-emerald-400" : delta < -0.005 ? "text-red-400" : "text-muted-foreground"}`}>
                      {delta > 0 ? "+" : ""}{(delta * 100).toFixed(1)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type ExperimentRow = {
  id: string;
  cycleId: string;
  timestamp: string;
  task: string;
  changeDescription: string;
  changeDiff: string;
  scoresBefore: Record<string, number> | null;
  scoresAfter: Record<string, number> | null;
  diagnosis: string | null;
  retained: boolean;
  tokensConsumed: number;
  wallClockSeconds: number | null;
  costUsd: number;
  providerCosts?: { gemini?: number; openai?: number; anthropic?: number } | null;
};

function ExpandedExperiment({ exp }: { exp: ExperimentRow }) {
  const scoreBefore = exp.scoresBefore;
  const scoresAfter = exp.scoresAfter;

  return (
    <tr>
      <td colSpan={6} className="px-0 py-0">
        <div className="bg-secondary/10 border-t border-b border-primary/20 px-6 py-5 space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-mono text-foreground">{exp.wallClockSeconds != null ? `${exp.wallClockSeconds}s` : "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Tokens:</span>
              <span className="font-mono text-foreground">{exp.tokensConsumed.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Cycle:</span>
              <span className="font-mono text-foreground text-[10px]">{exp.cycleId}</span>
            </div>
          </div>

          {exp.changeDiff && exp.changeDiff.trim() !== "" && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" /> Mutation Diff
              </h4>
              <pre className="text-xs font-mono bg-background/80 border border-border rounded p-3 overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap text-foreground/90 leading-relaxed">{exp.changeDiff}</pre>
            </div>
          )}

          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Full Score Breakdown
            </h4>
            <ScoresComparison before={scoreBefore} after={scoresAfter} />
          </div>

          {exp.diagnosis && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" /> Diagnosis
              </h4>
              <div className="text-xs text-foreground/80 bg-background/80 border border-border rounded p-3 whitespace-pre-wrap leading-relaxed max-h-[250px] overflow-y-auto">{exp.diagnosis}</div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

const ARCHITECTURE_COLORS: Record<string, string> = {
  balanced: "#10b981",
  "nuclear-first": "#f59e0b",
  "hormuz-first": "#0284c7",
  "humanitarian-first": "#ec4899",
};

type TreeNode = {
  id: string;
  dealId: string;
  parentNodeId: string | null;
  cycleId: string;
  branchLabel: string;
  architecture: string;
  depth: number;
  isStalled: boolean;
  stalledReason: string | null;
  isBestInBranch: boolean;
  compositeScore: string | null;
  createdAt: string;
};

function SolutionTreeVisualization({ nodes, isLoading: treeLoading }: { nodes: TreeNode[]; isLoading?: boolean }) {
  const { childrenMap, roots, maxDepth } = useMemo(() => {
    const cm: Record<string, TreeNode[]> = {};
    const rs: TreeNode[] = [];
    let md = 0;
    for (const n of nodes) {
      md = Math.max(md, n.depth);
      if (!n.parentNodeId) {
        rs.push(n);
      } else {
        if (!cm[n.parentNodeId]) cm[n.parentNodeId] = [];
        cm[n.parentNodeId]!.push(n);
      }
    }
    for (const key of Object.keys(cm)) {
      cm[key]!.sort((a, b) => a.branchLabel.localeCompare(b.branchLabel));
    }
    rs.sort((a, b) => a.branchLabel.localeCompare(b.branchLabel));
    return { childrenMap: cm, roots: rs, maxDepth: md };
  }, [nodes]);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  if (treeLoading) {
    return <p className="text-sm text-muted-foreground text-center py-12 animate-pulse">Loading solution tree...</p>;
  }
  if (nodes.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">No solution tree nodes yet. Run a deal autoresearch cycle to start exploring.</p>;
  }

  function renderNode(node: TreeNode, depth: number): React.ReactNode {
    const children = childrenMap[node.id] || [];
    const isHovered = hoveredNode === node.id;
    const score = node.compositeScore ? parseFloat(node.compositeScore) : null;
    const archColor = ARCHITECTURE_COLORS[node.architecture] ?? "#94a3b8";

    return (
      <div key={node.id} className="flex flex-col items-center">
        <div
          className={`relative px-3 py-2 rounded-lg border text-xs cursor-default transition-all min-w-[130px] max-w-[170px]
            ${node.isStalled ? "border-red-800/50 bg-red-950/20" : node.isBestInBranch ? "border-emerald-500/60 bg-emerald-950/20 ring-1 ring-emerald-500/30" : "border-border bg-card hover:bg-secondary/30"}
            ${isHovered ? "ring-2 ring-primary/50 scale-105" : ""}
          `}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <div className="font-mono font-bold capitalize text-[10px] tracking-wide" style={{ color: archColor }}>
            {node.architecture}
          </div>
          <div className="text-foreground mt-0.5 truncate" title={node.branchLabel}>{node.branchLabel}</div>
          {score !== null && (
            <div className={`text-[10px] mt-1 font-mono ${score >= 0.65 ? "text-emerald-400" : score >= 0.45 ? "text-amber-400" : "text-red-400"}`}>
              Score: {(score * 100).toFixed(1)}%
            </div>
          )}
          <div className="flex items-center gap-1 mt-1">
            {node.isStalled && <span className="text-red-400 text-[10px]">⚠ Stalled</span>}
            {node.isBestInBranch && <span className="text-emerald-400 text-[10px]">★ Best</span>}
          </div>

          {isHovered && node.stalledReason && (
            <div className="absolute z-10 left-1/2 -translate-x-1/2 top-full mt-2 bg-card border border-border rounded-lg shadow-lg p-3 text-xs text-foreground/80 w-[220px] whitespace-pre-wrap">
              <span className="font-medium text-red-400">Stalled reason:</span> {node.stalledReason}
            </div>
          )}
        </div>

        {children.length > 0 && (
          <>
            <div className="w-px h-6 bg-border" />
            <div className="flex gap-3 relative">
              {children.length > 1 && (
                <div className="absolute top-0 left-[calc(50%-0.5px)] h-px bg-border" style={{
                  left: `calc(${100 / (children.length * 2)}%)`,
                  width: `calc(${100 - 100 / children.length}%)`,
                }} />
              )}
              {children.map(child => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-px h-4 bg-border" />
                  {renderNode(child, depth + 1)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  const stats = useMemo(() => {
    const archCounts: Record<string, number> = {};
    let stalled = 0;
    let bestCount = 0;
    let highScore: { score: number; arch: string } | null = null;
    for (const n of nodes) {
      archCounts[n.architecture] = (archCounts[n.architecture] ?? 0) + 1;
      if (n.isStalled) stalled++;
      if (n.isBestInBranch) bestCount++;
      const s = n.compositeScore ? parseFloat(n.compositeScore) : null;
      if (s !== null && (highScore === null || s > highScore.score)) {
        highScore = { score: s, arch: n.architecture };
      }
    }
    return { archCounts, stalled, bestCount, highScore, total: nodes.length, maxDepth };
  }, [nodes, maxDepth]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <p className="text-lg font-bold font-display">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Nodes</p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <p className="text-lg font-bold font-display">{stats.maxDepth}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Max Depth</p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <p className="text-lg font-bold font-display text-emerald-400">{stats.bestCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Best-in-Branch</p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <p className="text-lg font-bold font-display text-red-400">{stats.stalled}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Stalled</p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          {stats.highScore ? (
            <>
              <p className="text-lg font-bold font-display text-primary">{(stats.highScore.score * 100).toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stats.highScore.arch}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {Object.entries(stats.archCounts).map(([arch, count]) => (
          <div key={arch} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ARCHITECTURE_COLORS[arch] ?? "#94a3b8" }} />
            <span className="capitalize text-muted-foreground">{arch}</span>
            <span className="font-mono text-foreground">{count}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 justify-center min-w-max py-4">
          {roots.map(root => renderNode(root, 0))}
        </div>
      </div>
    </div>
  );
}

export default function ExperimentLog() {
  const [page, setPage] = useState(0);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [retainedFilter, setRetainedFilter] = useState<RetainedFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<ActiveView>("log");
  const limit = 15;

  const queryParams = {
    limit,
    offset: page * limit,
    ...(taskFilter !== "all" ? { task: taskFilter } : {}),
    ...(retainedFilter !== "all" ? { retained: retainedFilter === "true" } : {}),
  };

  const { data: stats } = useGetExperimentStats();
  const { data: experimentsRes, isLoading } = useListExperiments(queryParams);
  const { data: treeRes, isLoading: treeLoading } = useGetSolutionTree();

  const experiments = (experimentsRes?.data || []).filter(exp =>
    search === "" || exp.changeDescription.toLowerCase().includes(search.toLowerCase())
  );
  const total = experimentsRes?.total || 0;
  const maxPage = Math.ceil(total / limit) - 1;
  const treeNodes = (treeRes?.nodes ?? []) as TreeNode[];

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetFilters() {
    setTaskFilter("all");
    setRetainedFilter("all");
    setSearch("");
    setPage(0);
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Evolution Log"
        description="Track the autoresearch agent's self-improvement mutations and solution tree exploration."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-0.5 h-8 bg-primary rounded-full" />
            <Cpu className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Experiments</p>
            <p className="text-2xl font-bold font-display">{stats?.total || 0}</p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-0.5 h-8 bg-success rounded-full" />
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Retained Rate</p>
            <p className="text-2xl font-bold font-display">{((stats?.retentionRate || 0) * 100).toFixed(1)}%</p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-0.5 h-8 bg-amber-500 rounded-full" />
            <Cpu className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Tokens</p>
            <p className="text-2xl font-bold font-display">{(stats?.totalTokensConsumed || 0).toLocaleString()}</p>
          </div>
        </Card>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveView("log")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${activeView === "log" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Experiment Log</span>
        </button>
        <button
          onClick={() => setActiveView("tree")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${activeView === "tree" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <span className="flex items-center gap-2"><GitBranch className="w-4 h-4" /> Solution Tree <Badge variant="outline" className="text-[10px] ml-1">{treeNodes.length}</Badge></span>
        </button>
      </div>

      {activeView === "log" && (
        <>
          <Card className="p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search descriptions..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={taskFilter}
                onChange={e => { setTaskFilter(e.target.value as TaskFilter); setPage(0); }}
                className="h-9 border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Tasks</option>
                <option value="A">Task A (Pessimist)</option>
                <option value="B">Task B (Optimist)</option>
                <option value="both">Both (Base-Rate)</option>
              </select>
              <select
                value={retainedFilter}
                onChange={e => { setRetainedFilter(e.target.value as RetainedFilter); setPage(0); }}
                className="h-9 border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Results</option>
                <option value="true">Retained Only</option>
                <option value="false">Discarded Only</option>
              </select>
              {(taskFilter !== "all" || retainedFilter !== "all" || search !== "") && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs">Clear</Button>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase tracking-wider bg-secondary/50">
                  <tr>
                    <th className="px-4 py-4 font-medium w-8"></th>
                    <th className="px-4 py-4 font-medium">Timestamp</th>
                    <th className="px-4 py-4 font-medium">Task</th>
                    <th className="px-4 py-4 font-medium">Mutation Description</th>
                    <th className="px-4 py-4 font-medium">Score Before → After</th>
                    <th className="px-4 py-4 font-medium">Tokens</th>
                    <th className="px-4 py-4 font-medium text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {isLoading ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Loading log...</td></tr>
                  ) : experiments.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No experiments match your filters.</td></tr>
                  ) : (
                    experiments.map((exp) => {
                      const scoreBefore = exp.scoresBefore as Record<string, number> | null;
                      const scoresAfter = exp.scoresAfter as Record<string, number> | null;
                      const topBefore = scoreBefore
                        ? Object.entries(scoreBefore).sort((a, b) => b[1] - a[1])[0]
                        : null;
                      const topAfter = scoresAfter
                        ? Object.entries(scoresAfter).sort((a, b) => b[1] - a[1])[0]
                        : null;
                      const isExpanded = expandedIds.has(exp.id);
                      const hasDetails = exp.changeDiff || exp.diagnosis || scoreBefore || scoresAfter;

                      return (
                        <React.Fragment key={exp.id}>
                          <tr
                            className={`transition-colors ${hasDetails ? "cursor-pointer hover:bg-secondary/20" : ""} ${isExpanded ? "bg-secondary/15" : ""}`}
                            onClick={() => hasDetails && toggleExpanded(exp.id)}
                          >
                            <td className="px-4 py-4 text-center">
                              {hasDetails && (
                                isExpanded
                                  ? <ChevronUp className="w-4 h-4 text-primary" />
                                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-muted-foreground text-xs">
                              {new Date(exp.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-4">
                              <Badge variant="outline">{exp.task}</Badge>
                            </td>
                            <td className="px-4 py-4 max-w-[220px] text-foreground font-medium text-xs">
                              <span className="line-clamp-2">{exp.changeDescription}</span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-xs font-mono">
                              {topBefore && topAfter ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-muted-foreground">
                                    {formatOutcome(topBefore[0]).slice(0, 16)}: <span className="text-foreground">{(topBefore[1] * 100).toFixed(0)}%</span>
                                  </span>
                                  <span className="text-primary">
                                    → {formatOutcome(topAfter[0]).slice(0, 16)}: <span className="font-bold">{(topAfter[1] * 100).toFixed(0)}%</span>
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-foreground font-mono text-xs">{exp.tokensConsumed.toLocaleString()} tks</span>
                                {exp.wallClockSeconds != null && (
                                  <span className="text-xs text-muted-foreground">{exp.wallClockSeconds}s</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              {exp.retained ? (
                                <Badge variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3"/> Retained</Badge>
                              ) : (
                                <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3"/> Discarded</Badge>
                              )}
                            </td>
                          </tr>
                          {isExpanded && <ExpandedExperiment exp={exp as unknown as ExperimentRow} />}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-border/50 flex items-center justify-between bg-card">
              <span className="text-sm text-muted-foreground">
                Showing {experiments.length} of {total} entries
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground self-center px-2">Page {page + 1}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(maxPage, p + 1))} disabled={page >= maxPage || maxPage < 0}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

      {activeView === "tree" && (
        <Card className="p-6">
          <SolutionTreeVisualization nodes={treeNodes} isLoading={treeLoading} />
        </Card>
      )}

      <DataSourceNote
        compact
        title="Evolution Methodology"
        methodology="Each research cycle, the agent mutates its own prompt instructions (optimistic, pessimistic, or base-rate adjustments). Gemini generates the mutation; GPT-4o evaluates whether the mutated prompt produces better Brier scores than the current champion. Only mutations that improve calibration are retained. Retention rate measures the fraction of mutations accepted."
        sources={[
          { label: "Mutation types", detail: "Optimistic bias, Pessimistic bias, Base-rate anchoring" },
          { label: "Evaluation metric", detail: "Brier score (quadratic proper scoring rule)" },
          { label: "Solution tree", detail: "Branch-and-bound exploration across deal architectures (balanced, nuclear-first, hormuz-first, humanitarian-first)" },
        ]}
        limitations={["Brier scores are computed against the model's own prior — not external ground truth outcomes."]}
      />
    </div>
  );
}
