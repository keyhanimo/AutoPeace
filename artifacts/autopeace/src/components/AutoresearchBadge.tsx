import { Link } from "react-router-dom";
import { Microscope, TrendingUp, GitBranch, Zap } from "lucide-react";
import { useGetExperimentStats, useGetPipelineEvolution } from "@workspace/api-client-react";
import { useCycleStatus } from "./CycleStatusIndicator";

export function AutoresearchPulse() {
  const { data: stats } = useGetExperimentStats();
  const status = useCycleStatus();

  return (
    <Link
      to="/lab"
      className="block border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors p-4 rounded-sm group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Microscope className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Autoresearch</span>
        </div>
        {status?.isRunning && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span><strong className="text-foreground">{stats?.cyclesRun ?? 0}</strong> cycles</span>
        <span><strong className="text-foreground">{stats?.retained ?? 0}</strong> retained</span>
        <span><strong className="text-foreground">{stats ? `${Math.round(stats.retentionRate * 100)}%` : "--"}</strong> rate</span>
      </div>
      <p className="text-[10px] text-primary/70 mt-2 group-hover:text-primary transition-colors flex items-center gap-1">
        Open Autoresearch Lab <Zap className="w-3 h-3" />
      </p>
    </Link>
  );
}

export function ForecastAutoresearchBadge() {
  const { data: stats } = useGetExperimentStats();
  const status = useCycleStatus();

  const isForecasting = status?.isRunning && (status.stage === "forecasting" || status.stage === "hill_climbing");

  return (
    <Link
      to="/lab"
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors rounded-sm text-xs"
    >
      {isForecasting ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-primary font-medium">Optimizing forecasts…</span>
        </>
      ) : (
        <>
          <TrendingUp className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">
            <strong className="text-foreground">{stats?.cyclesRun ?? 0}</strong> cycles run
          </span>
          {stats?.latestBrierScore != null && (
            <span className="text-muted-foreground">
              · Brier <strong className="text-foreground">{stats.latestBrierScore.toFixed(3)}</strong>
            </span>
          )}
        </>
      )}
    </Link>
  );
}

export function DealAutoresearchBadge() {
  const { data } = useGetPipelineEvolution();
  const status = useCycleStatus();

  const isDealing = status?.isRunning && status.stage === "deal_engine";

  return (
    <Link
      to="/lab?tab=evolution"
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors rounded-sm text-xs"
    >
      {isDealing ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          <span className="text-amber-400 font-medium">Generating deals…</span>
        </>
      ) : (
        <>
          <GitBranch className="w-3 h-3 text-amber-400" />
          <span className="text-muted-foreground">
            Pipeline Gen <strong className="text-foreground">{data?.currentGeneration ?? 0}</strong>
          </span>
          <span className="text-muted-foreground">
            · <strong className="text-foreground">{data?.generations?.length ?? 0}</strong> evolutions
          </span>
        </>
      )}
    </Link>
  );
}

export function ChangelogAutoresearchBadge() {
  const status = useCycleStatus();

  if (!status?.isRunning) return null;

  return (
    <Link
      to="/lab?tab=live"
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors rounded-sm text-xs"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
      </span>
      <span className="text-primary font-medium">Cycle running — new entries incoming</span>
    </Link>
  );
}
