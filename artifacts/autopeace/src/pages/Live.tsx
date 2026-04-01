import { useState, useEffect, useRef, useCallback } from "react";
import { Activity, Clock, CheckCircle2, AlertTriangle, XCircle, Zap, Timer, Radio, ChevronDown, ChevronRight } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CycleLogEntry {
  id: number;
  timestamp: number;
  cycleId: string;
  level: "info" | "warn" | "error" | "stage" | "llm_start" | "llm_complete" | "llm_error";
  stage: string;
  message: string;
  durationMs?: number;
  tokens?: number;
  prompt?: string;
  output?: string;
  provider?: string;
  model?: string;
  metadata?: Record<string, unknown>;
}

interface CycleStatus {
  isRunning: boolean;
  cycleId: string | null;
  stage: string | null;
  dealSubStage: string | null;
  stageStartedAt: number | null;
  cycleStartedAt: number | null;
  stagesCompleted: string[];
  lastError: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  starting: "Initializing",
  evidence_ingestion: "Evidence Ingestion",
  proposal_extraction: "Proposal Extraction",
  forecasting: "Forecast Generation",
  changelog: "Changelog",
  deal_engine: "Deal Engine",
  deal_pipeline: "Deal Pipeline",
  "deal.brainstorm": "Deal: Brainstorm",
  "deal.proposal": "Deal: Proposal",
  "deal.stakeholders": "Deal: Stakeholder Eval",
  "deal.domestic": "Deal: Domestic Eval",
  "deal.framing": "Deal: Framing",
  "deal.redteam": "Deal: Red Team",
  "deal.negotiator": "Deal: Negotiator",
  "deal.judge": "Deal: Judge Panel",
  "deal.meta_eval": "Deal: Meta-Evaluator",
  "deal.diagnosis": "Deal: Diagnosis",
  deal_complete: "Deal Complete",
  forecasting_complete: "Forecasting Complete",
  completed: "Completed",
  failed: "Failed",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "now";
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatMetaKey(key: string): string {
  const labels: Record<string, string> = {
    ingestedCount: "Items Ingested",
    extractedProposals: "Proposals Found",
    forecastCount: "Forecasts",
    horizons: "Time Horizons",
    probabilities: "Probability Distribution",
    totalTokens: "Total Tokens",
    composite: "Composite Score",
    feasibility: "Feasibility",
    coherence: "Coherence",
    evidenceGrounding: "Evidence Grounding",
    domesticSellability: "Domestic Sellability",
    regionalStability: "Regional Stability",
    implementability: "Implementability",
    durability: "Durability",
    accepts: "Stakeholders Accepting",
    rejects: "Stakeholders Rejecting",
    conditionals: "Conditional Accept",
    rejectingStakeholders: "Rejecting Parties",
    countries: "Countries Evaluated",
    vulnerabilitiesFound: "Vulnerabilities Found",
    amendments: "Proposed Amendments",
    tradeoffs: "Creative Tradeoffs",
    pipelineQuality: "Pipeline Quality",
    promptImprovements: "Prompt Improvements",
    analogies: "Historical Analogies",
    provisions: "Creative Provisions",
    innovativeProvisions: "Innovative Provisions",
    architecture: "Deal Architecture",
    chosenArch: "Chosen Architecture",
    dealCount: "Total Deals",
    currentBestComposite: "Current Best Score",
    topDeals: "Top Deals in Memory",
    provisionInsights: "Provision Insights",
    pipelineGeneration: "Pipeline Generation",
    newComposite: "New Score",
    prevComposite: "Previous Best",
    improvement: "Score Change",
    tokensConsumed: "Tokens Used",
    errorType: "Error Type",
    provider: "AI Provider",
    failedStage: "Failed At Stage",
    evidenceLength: "Evidence Length",
    strategicTokens: "Strategy Tokens",
    stallCount: "Stall Count",
    headline: "Headline",
    keyEvidence: "Key Evidence",
    elapsedSeconds: "Elapsed Time",
    totalCost: "Estimated Cost",
    overrides: "Prompt Overrides",
    overrideKeys: "Override Targets",
    newGeneration: "New Generation",
    hasNuclearProtocol: "Nuclear Protocol",
    hasSanctionsRelief: "Sanctions Relief",
    hasHormuzArrangements: "Hormuz Arrangements",
  };
  return labels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
}

const RATIO_KEYS = new Set([
  "composite", "feasibility", "coherence", "evidenceGrounding",
  "domesticSellability", "regionalStability", "implementability", "durability",
  "newComposite", "prevComposite", "currentBestComposite",
]);

const CURRENCY_KEYS = new Set(["totalCost"]);
const DURATION_KEYS = new Set(["elapsedSeconds"]);
const TOKEN_KEYS = new Set(["totalTokens", "tokensConsumed", "strategicTokens"]);

function formatMetaValue(value: unknown, key?: string): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (key && CURRENCY_KEYS.has(key)) return `$${value.toFixed(4)}`;
    if (key && DURATION_KEYS.has(key)) return `${value.toFixed(1)}s`;
    if (key && TOKEN_KEYS.has(key)) return value.toLocaleString();
    if (key && RATIO_KEYS.has(key)) return `${(value * 100).toFixed(1)}%`;
    if (key === "improvement") return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}pp`;
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toFixed(3);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "none";
    if (typeof value[0] === "string") return value.join(", ");
    if (typeof value[0] === "object") {
      return value.map(v => {
        const obj = v as Record<string, unknown>;
        return (obj.title ?? obj.name ?? obj.description ?? obj.dealName ?? obj.idea ?? JSON.stringify(v)) as string;
      }).join(", ");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.map(([k, v]) => {
      if (typeof v === "number" && RATIO_KEYS.has(k)) return `${k}: ${(v * 100).toFixed(1)}%`;
      return `${k}: ${String(v)}`;
    }).join(", ");
  }
  return String(value);
}

function levelIcon(level: CycleLogEntry["level"]) {
  switch (level) {
    case "stage": return <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    case "info": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    case "warn": return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    case "error": return <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
    case "llm_start": return <Radio className="w-3.5 h-3.5 text-violet-400 shrink-0 animate-pulse" />;
    case "llm_complete": return <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />;
    case "llm_error": return <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
    default: return <Activity className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  }
}

function levelColor(level: CycleLogEntry["level"]): string {
  switch (level) {
    case "stage": return "text-blue-300";
    case "info": return "text-slate-300";
    case "warn": return "text-amber-300";
    case "error": return "text-red-300";
    case "llm_start": return "text-violet-300";
    case "llm_complete": return "text-violet-200";
    case "llm_error": return "text-red-300";
    default: return "text-slate-400";
  }
}

function LogEntry({ entry }: { entry: CycleLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = entry.metadata || entry.output || entry.prompt;

  return (
    <div
      className={`group flex items-start gap-2 py-1.5 px-3 font-mono text-xs hover:bg-white/[0.02] ${
        entry.level === "stage" ? "border-t border-white/5 mt-1 pt-2.5" : ""
      } ${entry.level === "error" ? "bg-red-500/5" : ""}`}
    >
      {levelIcon(entry.level)}
      <span className="text-slate-500 shrink-0 w-[68px]">{formatTimestamp(entry.timestamp)}</span>
      <span className="text-slate-600 shrink-0 w-[140px] truncate" title={entry.stage}>
        {STAGE_LABELS[entry.stage] ?? entry.stage}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {hasDetails && (
            <button onClick={() => setExpanded(!expanded)} className="shrink-0 text-slate-500 hover:text-slate-300">
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          )}
          <span className={levelColor(entry.level)}>{entry.message}</span>
        </div>
        {expanded && hasDetails && (
          <div className="mt-1.5 ml-5 space-y-1.5 text-[11px]">
            {entry.metadata && (
              <div className="bg-white/[0.02] rounded p-2 space-y-1">
                {Object.entries(entry.metadata).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-slate-500 font-medium shrink-0 min-w-[120px]">{formatMetaKey(key)}:</span>
                    <span className="text-slate-400 break-all">{formatMetaValue(value, key)}</span>
                  </div>
                ))}
              </div>
            )}
            {entry.prompt && (
              <div>
                <span className="text-violet-500 font-semibold">PROMPT:</span>
                <pre className="text-slate-500 whitespace-pre-wrap break-all bg-violet-500/5 rounded p-1.5 mt-0.5 max-h-40 overflow-y-auto">
                  {entry.prompt}
                </pre>
              </div>
            )}
            {entry.output && (
              <div>
                <span className="text-emerald-500 font-semibold">OUTPUT:</span>
                <pre className="text-slate-500 whitespace-pre-wrap break-all bg-emerald-500/5 rounded p-1.5 mt-0.5 max-h-40 overflow-y-auto">
                  {entry.output}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {entry.durationMs != null && (
          <span className="text-slate-500 flex items-center gap-1">
            <Timer className="w-3 h-3" />
            {formatDuration(entry.durationMs)}
          </span>
        )}
        {entry.tokens != null && (
          <span className="text-slate-500">{entry.tokens.toLocaleString()} tok</span>
        )}
        {entry.provider && (
          <span className="text-slate-600">{entry.provider}</span>
        )}
      </div>
    </div>
  );
}

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(Date.now() - startedAt);
  useEffect(() => {
    const iv = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(iv);
  }, [startedAt]);
  return <span>{formatDuration(elapsed)}</span>;
}

function CountdownTimer({ targetTime }: { targetTime: number }) {
  const [remaining, setRemaining] = useState(targetTime - Date.now());
  useEffect(() => {
    const iv = setInterval(() => setRemaining(targetTime - Date.now()), 1000);
    return () => clearInterval(iv);
  }, [targetTime]);
  return <span>{formatCountdown(remaining)}</span>;
}

export default function Live() {
  const [logs, setLogs] = useState<CycleLogEntry[]>([]);
  const [previousLogs, setPreviousLogs] = useState<CycleLogEntry[]>([]);
  const [status, setStatus] = useState<CycleStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const [nextRunAt, setNextRunAt] = useState<number | null>(null);
  const [showPrevious, setShowPrevious] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentCycleIdRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [autoScroll]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      setAutoScroll(isAtBottom);
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let disposed = false;
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      if (disposed) return;
      es = new EventSource(`${API_BASE}/api/live/stream`);

      es.onopen = () => {
        if (disposed) return;
        setConnected(true);
      };

      es.onmessage = (event) => {
        if (disposed) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "init") {
            setStatus(data.status);
            const serverCycleId = data.currentLogCycleId ?? null;
            const serverLogs: CycleLogEntry[] = data.currentLogs ?? [];

            if (serverCycleId && serverCycleId === currentCycleIdRef.current) {
              setLogs(prev => {
                const existingIds = new Set(prev.map(l => l.id));
                const newEntries = serverLogs.filter(l => !existingIds.has(l.id));
                if (newEntries.length === 0) return prev;
                return [...prev, ...newEntries].sort((a, b) => a.id - b.id);
              });
            } else {
              currentCycleIdRef.current = serverCycleId;
              setLogs(serverLogs);
            }

            setPreviousLogs(data.previousLogs ?? []);
            if (!data.status?.isRunning && (data.previousLogs?.length ?? 0) > 0 && serverLogs.length === 0) {
              setShowPrevious(true);
            }
          } else if (data.type === "entry") {
            const entry = data.entry as CycleLogEntry;
            if (currentCycleIdRef.current && entry.cycleId !== currentCycleIdRef.current) {
              setLogs(prev => {
                setPreviousLogs(prev);
                return [entry];
              });
              currentCycleIdRef.current = entry.cycleId;
            } else {
              if (!currentCycleIdRef.current) currentCycleIdRef.current = entry.cycleId;
              setLogs(prev => {
                if (prev.some(l => l.id === entry.id)) return prev;
                return [...prev, entry];
              });
            }
            setShowPrevious(false);
          } else if (data.type === "status") {
            setStatus(data.status);
          }
        } catch {}
      };

      es.onerror = () => {
        if (disposed) return;
        setConnected(false);
        es?.close();
        es = null;
        retryTimeout = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      disposed = true;
      es?.close();
      es = null;
      clearTimeout(retryTimeout);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  useEffect(() => {
    if (status?.isRunning) return;
    const fetchNext = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/live/next-run`);
        const data = await res.json();
        setNextRunAt(data.nextRunAt ?? null);
      } catch {}
    };
    fetchNext();
    const iv = setInterval(fetchNext, 30000);
    return () => clearInterval(iv);
  }, [status?.isRunning]);

  const displayLogs = showPrevious && logs.length === 0 ? previousLogs : logs;

  const totalTokens = displayLogs.reduce((sum, l) => sum + (l.tokens ?? 0), 0);
  const stageEntries = displayLogs.filter(l => l.level === "stage");
  const errorEntries = displayLogs.filter(l => l.level === "error" || l.level === "llm_error");
  const warnEntries = displayLogs.filter(l => l.level === "warn");

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-white/10 bg-card/50 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${status?.isRunning ? "bg-emerald-400 animate-pulse" : connected ? "bg-slate-500" : "bg-red-500"}`} />
            <h1 className="text-lg font-display font-bold text-foreground">Live Cycle Monitor</h1>
            {status?.isRunning && status.cycleStartedAt && (
              <span className="text-sm text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Running for <ElapsedTimer startedAt={status.cycleStartedAt} />
              </span>
            )}
            {!status?.isRunning && !showPrevious && logs.length === 0 && previousLogs.length > 0 && (
              <button onClick={() => setShowPrevious(true)} className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2">
                Show previous cycle logs
              </button>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            {!status?.isRunning && nextRunAt && (
              <span className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" />
                Next cycle in <CountdownTimer targetTime={nextRunAt} />
              </span>
            )}
            {displayLogs.length > 0 && (
              <>
                <span>{stageEntries.length} stages</span>
                {totalTokens > 0 && <span>{totalTokens.toLocaleString()} tokens</span>}
                {errorEntries.length > 0 && <span className="text-red-400">{errorEntries.length} errors</span>}
                {warnEntries.length > 0 && <span className="text-amber-400">{warnEntries.length} warnings</span>}
              </>
            )}
            {!connected && <span className="text-red-400">Disconnected</span>}
          </div>
        </div>

        {status?.isRunning && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300">Current:</span>
            <span className="text-xs text-blue-300 font-mono">
              {status.dealSubStage
                ? STAGE_LABELS[`deal.${status.dealSubStage}`] ?? status.dealSubStage
                : STAGE_LABELS[status.stage ?? ""] ?? status.stage}
            </span>
            {status.stageStartedAt && (
              <span className="text-xs text-slate-500">
                (<ElapsedTimer startedAt={status.stageStartedAt} />)
              </span>
            )}
            {status.stagesCompleted.length > 0 && (
              <span className="text-xs text-slate-500 ml-2">
                Completed: {status.stagesCompleted.map(s => STAGE_LABELS[s] ?? s).join(" → ")}
              </span>
            )}
          </div>
        )}

        {showPrevious && !status?.isRunning && previousLogs.length > 0 && logs.length === 0 && (
          <div className="mt-2 text-xs text-slate-500">
            Showing logs from previous cycle. These will be replaced when a new cycle starts.
          </div>
        )}
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto bg-[#0a0e1a] min-h-0">
        {displayLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Activity className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm">
              {status?.isRunning ? "Waiting for cycle events..." : "No cycle running. Logs will appear here when a cycle starts."}
            </p>
            {!status?.isRunning && nextRunAt && (
              <p className="text-xs mt-2">
                Next scheduled run in <CountdownTimer targetTime={nextRunAt} />
              </p>
            )}
          </div>
        ) : (
          <div className="py-1">
            {displayLogs.map(entry => (
              <LogEntry key={entry.id} entry={entry} />
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>

      {displayLogs.length > 0 && !autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            logEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
          className="fixed bottom-20 right-8 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg z-50"
        >
          Scroll to bottom
        </button>
      )}
    </div>
  );
}
