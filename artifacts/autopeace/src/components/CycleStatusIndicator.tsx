import { useQuery } from "@tanstack/react-query";

const STAGE_LABELS: Record<string, string> = {
  starting: "Starting",
  evidence_ingestion: "Ingesting evidence",
  proposal_extraction: "Extracting proposals",
  forecasting: "Forecasting",
  red_team: "Red-teaming",
  hill_climbing: "Optimizing",
  changelog: "Writing changelog",
  deal_engine: "Deal engine",
  completed: "Completed",
  failed: "Failed",
};

const PIPELINE_STAGES = [
  "evidence_ingestion",
  "proposal_extraction",
  "forecasting",
  "hill_climbing",
  "changelog",
  "deal_engine",
];

type StatusData = {
  isRunning: boolean;
  stage: string | null;
  stagesCompleted: string[];
  cycleStartedAt: number | null;
};

export function CycleStatusIndicator() {
  const { data } = useQuery<StatusData>({
    queryKey: ["/api/status"],
    queryFn: async () => {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<StatusData>;
    },
    refetchInterval: (query) => (query.state.data?.isRunning ? 10000 : 60000),
  });

  if (!data) {
    return (
      <div className="bg-secondary/30 border border-border/30 p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Status</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">Loading…</p>
      </div>
    );
  }

  const { isRunning, stage, stagesCompleted } = data;

  if (!isRunning && stage !== "completed" && stage !== "failed") {
    return (
      <div className="bg-secondary/30 border border-border/30 p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Pipeline</p>
        <p className="text-xs text-muted-foreground mt-0.5">Idle — awaiting next cycle</p>
      </div>
    );
  }

  if (stage === "failed") {
    return (
      <div className="bg-red-950/30 border border-red-900/40 p-3">
        <p className="text-[10px] text-red-400/80 uppercase tracking-widest font-semibold">Pipeline</p>
        <p className="text-xs text-red-400 mt-0.5">Last cycle failed</p>
      </div>
    );
  }

  if (stage === "completed" && !isRunning) {
    return (
      <div className="bg-emerald-950/20 border border-emerald-900/30 p-3">
        <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-semibold">Pipeline</p>
        <p className="text-xs text-emerald-400 mt-0.5">Cycle complete</p>
      </div>
    );
  }

  const completedSet = new Set(stagesCompleted);
  const currentIdx = PIPELINE_STAGES.indexOf(stage ?? "");
  const progress = currentIdx >= 0
    ? Math.round(((completedSet.size) / PIPELINE_STAGES.length) * 100)
    : 0;

  const elapsed = data.cycleStartedAt
    ? Math.round((Date.now() - data.cycleStartedAt) / 1000)
    : 0;
  const elapsedStr = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

  return (
    <div className="bg-primary/5 border border-primary/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-primary/80 uppercase tracking-widest font-semibold">Pipeline</p>
        <span className="text-[9px] text-muted-foreground font-mono">{elapsedStr}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <p className="text-xs text-foreground font-medium truncate">
          {STAGE_LABELS[stage ?? ""] ?? stage ?? "Running"}
        </p>
      </div>

      <div className="flex gap-0.5">
        {PIPELINE_STAGES.map((s) => {
          const done = completedSet.has(s);
          const active = s === stage;
          return (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                done
                  ? "bg-primary"
                  : active
                    ? "bg-primary/50 animate-pulse"
                    : "bg-muted-foreground/15"
              }`}
              title={STAGE_LABELS[s] ?? s}
            />
          );
        })}
      </div>

      <p className="text-[9px] text-muted-foreground">
        {progress}% · Stage {completedSet.size + (currentIdx >= 0 ? 1 : 0)} of {PIPELINE_STAGES.length}
      </p>
    </div>
  );
}
