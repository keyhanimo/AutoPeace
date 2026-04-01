import { useState, useEffect, useRef } from "react";

const STAGE_LABELS: Record<string, string> = {
  starting: "Starting",
  evidence_ingestion: "Ingesting evidence",
  proposal_extraction: "Extracting proposals",
  forecasting: "Forecasting",
  changelog: "Writing changelog",
  deal_engine: "Deal engine",
  completed: "Completed",
  failed: "Failed",
};

const DEAL_SUB_LABELS: Record<string, string> = {
  brainstorm: "Brainstorming",
  proposal: "Drafting deal",
  stakeholders: "Stakeholder eval",
  domestic: "Domestic audience",
  framing: "Narrative framing",
  redteam: "Red-teaming",
  negotiator: "Negotiating",
  judge: "Scoring",
  meta_eval: "Meta-evaluation",
  diagnosis: "Diagnosing",
};

const PIPELINE_STAGES = [
  "evidence_ingestion",
  "proposal_extraction",
  "forecasting",
  "changelog",
  "deal_engine",
];

const DEAL_SUB_STAGES = [
  "brainstorm",
  "proposal",
  "stakeholders",
  "domestic",
  "framing",
  "redteam",
  "negotiator",
  "judge",
  "meta_eval",
  "diagnosis",
];

type StatusData = {
  isRunning: boolean;
  cycleId: string | null;
  stage: string | null;
  dealSubStage: string | null;
  stageStartedAt: number | null;
  cycleStartedAt: number | null;
  stagesCompleted: string[];
  lastError: string | null;
  nextRunAt: number | null;
};

function useCycleStatus(): StatusData | null {
  const [status, setStatus] = useState<StatusData | null>(null);
  const retryDelay = useRef(1000);

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;

    function connect() {
      if (unmounted) return;
      es = new EventSource("/api/status/stream");

      es.onmessage = (e) => {
        try {
          setStatus(JSON.parse(e.data) as StatusData);
          retryDelay.current = 1000;
        } catch {}
      };

      es.onerror = () => {
        es?.close();
        if (!unmounted) {
          retryTimer = setTimeout(connect, retryDelay.current);
          retryDelay.current = Math.min(retryDelay.current * 2, 30000);
        }
      };
    }

    connect();

    return () => {
      unmounted = true;
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  return status;
}

export { useCycleStatus };

function formatCountdown(ms: number): string {
  if (ms <= 0) return "any moment";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatElapsed(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function CycleStatusIndicator() {
  const data = useCycleStatus();
  const [now, setNow] = useState(Date.now());

  const needsTick = data !== null && (data.isRunning || data.nextRunAt !== null);

  useEffect(() => {
    if (!needsTick) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [needsTick]);

  if (!data) {
    return (
      <div className="bg-secondary/30 border border-border/30 p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Pipeline</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">Connecting…</p>
      </div>
    );
  }

  const { isRunning, stage, stagesCompleted, nextRunAt, dealSubStage } = data;

  if (!isRunning && stage !== "completed" && stage !== "failed") {
    if (nextRunAt !== null) {
      const remaining = nextRunAt - now;
      return (
        <div className="bg-secondary/30 border border-border/30 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Pipeline</p>
            <span className="text-[9px] text-muted-foreground font-mono">{formatCountdown(remaining)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Next cycle in {formatCountdown(remaining)}</p>
          <div className="mt-1.5 h-1 bg-muted-foreground/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-muted-foreground/30 rounded-full transition-all duration-1000"
              style={{ width: `${Math.max(0, Math.min(100, 100 - (remaining / 3600000) * 100))}%` }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="bg-secondary/30 border border-border/30 p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Pipeline</p>
        <p className="text-xs text-muted-foreground mt-0.5">Manual mode</p>
      </div>
    );
  }

  if (stage === "failed") {
    if (nextRunAt !== null) {
      const remaining = nextRunAt - now;
      return (
        <div className="bg-red-950/30 border border-red-900/40 p-3">
          <p className="text-[10px] text-red-400/80 uppercase tracking-widest font-semibold">Pipeline</p>
          <p className="text-xs text-red-400 mt-0.5">Last cycle failed</p>
          <p className="text-[9px] text-muted-foreground mt-1">Retry in {formatCountdown(remaining)}</p>
        </div>
      );
    }
    return (
      <div className="bg-red-950/30 border border-red-900/40 p-3">
        <p className="text-[10px] text-red-400/80 uppercase tracking-widest font-semibold">Pipeline</p>
        <p className="text-xs text-red-400 mt-0.5">Last cycle failed</p>
      </div>
    );
  }

  if (stage === "completed" && !isRunning) {
    if (nextRunAt !== null) {
      const remaining = nextRunAt - now;
      return (
        <div className="bg-emerald-950/20 border border-emerald-900/30 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-semibold">Pipeline</p>
            <span className="text-[9px] text-muted-foreground font-mono">{formatCountdown(remaining)}</span>
          </div>
          <p className="text-xs text-emerald-400 mt-0.5">Cycle complete</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Next cycle in {formatCountdown(remaining)}</p>
        </div>
      );
    }
    return (
      <div className="bg-emerald-950/20 border border-emerald-900/30 p-3">
        <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-semibold">Pipeline</p>
        <p className="text-xs text-emerald-400 mt-0.5">Cycle complete</p>
      </div>
    );
  }

  const completedSet = new Set(stagesCompleted);
  const isDealStage = stage === "deal_engine";

  const totalSteps = PIPELINE_STAGES.length - 1 + DEAL_SUB_STAGES.length;
  let completedSteps = 0;
  for (const s of PIPELINE_STAGES) {
    if (s === "deal_engine") break;
    if (completedSet.has(s)) completedSteps++;
  }
  if (isDealStage && dealSubStage) {
    const subIdx = DEAL_SUB_STAGES.indexOf(dealSubStage);
    if (subIdx > 0) completedSteps += subIdx;
  }
  const progress = Math.round((completedSteps / totalSteps) * 100);

  const elapsed = data.cycleStartedAt ? now - data.cycleStartedAt : 0;

  const currentLabel = isDealStage && dealSubStage
    ? DEAL_SUB_LABELS[dealSubStage] ?? dealSubStage
    : STAGE_LABELS[stage ?? ""] ?? stage ?? "Running";

  return (
    <div className="bg-primary/5 border border-primary/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-primary/80 uppercase tracking-widest font-semibold">Pipeline</p>
        <span className="text-[9px] text-muted-foreground font-mono">{formatElapsed(elapsed)}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <p className="text-xs text-foreground font-medium truncate">
          {currentLabel}
        </p>
      </div>

      <div className="flex gap-0.5">
        {PIPELINE_STAGES.map((s) => {
          if (s === "deal_engine") return null;
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

      {(isDealStage || completedSet.has("deal_engine")) && (
        <>
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider font-semibold mt-1">Deal Engine</p>
          <div className="flex gap-0.5">
            {DEAL_SUB_STAGES.map((sub) => {
              const subIdx = DEAL_SUB_STAGES.indexOf(sub);
              const activeIdx = dealSubStage ? DEAL_SUB_STAGES.indexOf(dealSubStage) : -1;
              const done = isDealStage ? subIdx < activeIdx : completedSet.has("deal_engine");
              const active = isDealStage && sub === dealSubStage;
              return (
                <div
                  key={sub}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    done
                      ? "bg-amber-500"
                      : active
                        ? "bg-amber-500/50 animate-pulse"
                        : "bg-muted-foreground/15"
                  }`}
                  title={DEAL_SUB_LABELS[sub] ?? sub}
                />
              );
            })}
          </div>
        </>
      )}

      <p className="text-[9px] text-muted-foreground">
        {progress}%{isDealStage && dealSubStage
          ? ` · Deal ${DEAL_SUB_STAGES.indexOf(dealSubStage) + 1}/${DEAL_SUB_STAGES.length}`
          : ""}
      </p>
    </div>
  );
}
