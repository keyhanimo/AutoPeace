import React, { useState } from "react";
import { useListExperiments, useGetExperimentStats } from "@workspace/api-client-react";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { formatUsd } from "@/lib/utils";
import { CheckCircle2, XCircle, Database, Coins, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";

type TaskFilter = "all" | "A" | "B" | "both";
type RetainedFilter = "all" | "true" | "false";

export default function ExperimentLog() {
  const [page, setPage] = useState(0);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [retainedFilter, setRetainedFilter] = useState<RetainedFilter>("all");
  const [search, setSearch] = useState("");
  const limit = 15;

  const queryParams = {
    limit,
    offset: page * limit,
    ...(taskFilter !== "all" ? { task: taskFilter } : {}),
    ...(retainedFilter !== "all" ? { retained: retainedFilter === "true" } : {}),
  };

  const { data: stats } = useGetExperimentStats();
  const { data: experimentsRes, isLoading } = useListExperiments(queryParams);

  const experiments = (experimentsRes?.data || []).filter(exp =>
    search === "" || exp.changeDescription.toLowerCase().includes(search.toLowerCase())
  );
  const total = experimentsRes?.total || 0;
  const maxPage = Math.ceil(total / limit) - 1;

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
        description="Track the autoresearch agent's self-improvement mutations."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Database className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Experiments</p>
            <p className="text-2xl font-bold font-display">{stats?.total || 0}</p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Retained Rate</p>
            <p className="text-2xl font-bold font-display">{((stats?.retentionRate || 0) * 100).toFixed(1)}%</p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Coins className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Dev Cost</p>
            <p className="text-2xl font-bold font-display">{formatUsd(stats?.totalCostUsd || 0)}</p>
          </div>
        </Card>
      </div>

      <Card className="p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search descriptions..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={taskFilter}
            onChange={e => { setTaskFilter(e.target.value as TaskFilter); setPage(0); }}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Tasks</option>
            <option value="A">Task A (Pessimist)</option>
            <option value="B">Task B (Optimist)</option>
            <option value="both">Both (Base-Rate)</option>
          </select>
          <select
            value={retainedFilter}
            onChange={e => { setRetainedFilter(e.target.value as RetainedFilter); setPage(0); }}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Task</th>
                <th className="px-6 py-4 font-medium">Mutation Description</th>
                <th className="px-6 py-4 font-medium">Cost / Tokens</th>
                <th className="px-6 py-4 font-medium text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Loading log...</td></tr>
              ) : experiments.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No experiments match your filters.</td></tr>
              ) : (
                experiments.map((exp) => (
                  <tr key={exp.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {new Date(exp.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">{exp.task}</Badge>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-foreground font-medium" title={exp.changeDescription}>
                      {exp.changeDescription}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-amber-400 font-mono">{formatUsd(exp.costUsd)}</span>
                        <span className="text-xs text-muted-foreground">{exp.tokensConsumed.toLocaleString()} tks</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {exp.retained ? (
                        <Badge variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3"/> Retained</Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3"/> Discarded</Badge>
                      )}
                    </td>
                  </tr>
                ))
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
    </div>
  );
}
