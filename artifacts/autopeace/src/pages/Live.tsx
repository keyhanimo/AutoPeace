import { useState, useEffect, useRef, useCallback } from "react";
import { Activity, Clock, CheckCircle2, AlertTriangle, XCircle, Zap, Timer, Radio, ChevronDown, ChevronRight, Copy, Check, ArrowRight } from "lucide-react";

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

const PIPELINE_STAGE_ORDER = [
  "deal.brainstorm",
  "deal.proposal",
  "deal.stakeholders",
  "deal.domestic",
  "deal.framing",
  "deal.redteam",
  "deal.negotiator",
  "deal.judge",
  "deal.meta_eval",
  "deal.diagnosis",
];

function getNextStage(currentStage: string | null): string | null {
  if (!currentStage) return null;
  const idx = PIPELINE_STAGE_ORDER.indexOf(currentStage);
  if (idx === -1 || idx >= PIPELINE_STAGE_ORDER.length - 1) return null;
  return PIPELINE_STAGE_ORDER[idx + 1];
}

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

const SCALAR_META_LABELS: Record<string, string> = {
  ingestedCount: "Items Ingested",
  extractedProposals: "Proposals Found",
  forecastCount: "Forecasts",
  horizons: "Time Horizons",
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
  vulnerabilitiesFound: "Vulnerabilities Found",
  pipelineQuality: "Pipeline Quality",
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
  elapsedSeconds: "Elapsed Time",
  totalCost: "Estimated Cost",
  newGeneration: "New Generation",
  hasNuclearProtocol: "Nuclear Protocol",
  hasSanctionsRelief: "Sanctions Relief",
  hasHormuzArrangements: "Hormuz Arrangements",
};

const RATIO_KEYS = new Set([
  "composite", "feasibility", "coherence", "evidenceGrounding",
  "domesticSellability", "regionalStability", "implementability", "durability",
  "newComposite", "prevComposite", "currentBestComposite",
]);
const CURRENCY_KEYS = new Set(["totalCost"]);
const DURATION_KEYS = new Set(["elapsedSeconds"]);
const TOKEN_KEYS = new Set(["totalTokens", "tokensConsumed", "strategicTokens"]);

const RICH_DETAIL_KEYS = new Set([
  "analogies", "provisions", "crossIssueLinkages", "unconventionalApproaches",
  "innovativeProvisions", "amendments", "tradeoffs", "promptImprovements",
  "stakeholderDetails", "redTeamFindings", "promptOverrides", "evolvedOverrides",
  "overrides", "overrideKeys", "rejectingStakeholders", "stakeholderCommitments",
  "nuclearProtocol", "sanctionsRelief", "hormuzArrangements",
  "systemPrompt", "probabilities", "countries",
]);

function formatScalarValue(value: unknown, key?: string): string {
  if (value === null || value === undefined) return "--";
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
  return String(value);
}

function formatMetaLabel(key: string): string {
  return SCALAR_META_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="shrink-0 p-0.5 text-slate-600 hover:text-slate-400 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function CollapsibleTextBlock({ label, text, color }: { label: string; text: string; color: "violet" | "emerald" | "blue" | "amber" | "slate" }) {
  const [expanded, setExpanded] = useState(false);
  const colorClasses = {
    violet: { label: "text-violet-400", bg: "bg-violet-500/5 border-violet-500/10" },
    emerald: { label: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/10" },
    blue: { label: "text-blue-400", bg: "bg-blue-500/5 border-blue-500/10" },
    amber: { label: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/10" },
    slate: { label: "text-slate-400", bg: "bg-white/[0.02] border-white/5" },
  }[color];

  return (
    <div className="mt-1">
      <div className="flex items-center gap-2">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-80">
          {expanded ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
          <span className={colorClasses.label}>{label}</span>
          <span className="text-slate-600 font-normal">({text.length.toLocaleString()} chars)</span>
        </button>
        <CopyButton text={text} />
      </div>
      {expanded && (
        <pre className={`text-[11px] text-slate-400 whitespace-pre-wrap break-words ${colorClasses.bg} border rounded p-2.5 mt-1 max-h-[600px] overflow-y-auto leading-relaxed`}>
          {text}
        </pre>
      )}
    </div>
  );
}

function RichObjectList({ items, title }: { items: unknown[]; title: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-1.5">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-80">
        {expanded ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
        <span className="text-blue-400">{title}</span>
        <span className="text-slate-600 font-normal">({items.length} items)</span>
      </button>
      {expanded && (
        <div className="mt-1 space-y-1.5 ml-4">
          {items.map((item, i) => {
            if (typeof item === "string") {
              return <div key={i} className="text-[11px] text-slate-400 bg-white/[0.02] border border-white/5 rounded px-2.5 py-1.5">{item}</div>;
            }
            if (typeof item === "object" && item !== null) {
              const obj = item as Record<string, unknown>;
              const rawTitle = obj.title ?? obj.dealName ?? obj.name ?? obj.idea ?? obj.proposedChange ?? obj.amendment ?? obj.linkage ?? obj.stage;
              const titleText = typeof rawTitle === "string" || typeof rawTitle === "number" ? String(rawTitle) : null;
              return (
                <div key={i} className="text-[11px] bg-white/[0.02] border border-white/5 rounded px-2.5 py-2 space-y-0.5">
                  {titleText && <div className="text-slate-300 font-medium">{titleText}</div>}
                  {Object.entries(obj).filter(([k]) => k !== "title" && k !== "dealName" && k !== "name").map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-slate-600 shrink-0">{formatMetaLabel(k)}:</span>
                      <span className="text-slate-400 break-words">{typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}</span>
                    </div>
                  ))}
                </div>
              );
            }
            return <div key={i} className="text-[11px] text-slate-400">{JSON.stringify(item)}</div>;
          })}
        </div>
      )}
    </div>
  );
}

function StakeholderDetailsSection({ details }: { details: Record<string, { verdict: string; rationale: string }> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(details);
  if (entries.length === 0) return null;

  const verdictColor = (v: string) => v === "accept" ? "text-emerald-400" : v === "reject" ? "text-red-400" : "text-amber-400";

  return (
    <div className="mt-1.5">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-80">
        {expanded ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
        <span className="text-blue-400">Stakeholder Verdicts</span>
        <span className="text-slate-600 font-normal">({entries.length} stakeholders)</span>
      </button>
      {expanded && (
        <div className="mt-1 space-y-1 ml-4">
          {entries.map(([id, { verdict, rationale }]) => (
            <div key={id} className="text-[11px] bg-white/[0.02] border border-white/5 rounded px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-medium">{id}</span>
                <span className={`font-semibold uppercase text-[10px] ${verdictColor(verdict)}`}>{verdict}</span>
              </div>
              {rationale && <div className="text-slate-500 mt-0.5">{rationale}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PromptOverridesSection({ overrides }: { overrides: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(overrides);
  if (entries.length === 0) return null;

  return (
    <div className="mt-1.5">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-80">
        {expanded ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
        <span className="text-amber-400">Prompt Overrides</span>
        <span className="text-slate-600 font-normal">({entries.length} stages)</span>
      </button>
      {expanded && (
        <div className="mt-1 space-y-1.5 ml-4">
          {entries.map(([stage, text]) => (
            <div key={stage}>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-amber-400 font-medium">{stage}</span>
                <CopyButton text={text} />
              </div>
              <pre className="text-[11px] text-slate-400 whitespace-pre-wrap break-words bg-amber-500/5 border border-amber-500/10 rounded p-2 mt-0.5 max-h-[400px] overflow-y-auto leading-relaxed">{text}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailedMetadata({ metadata }: { metadata: Record<string, unknown> }) {
  const scalarEntries: [string, unknown][] = [];
  const richEntries: [string, unknown][] = [];

  for (const [key, value] of Object.entries(metadata)) {
    if (RICH_DETAIL_KEYS.has(key) && value != null && typeof value === "object") {
      richEntries.push([key, value]);
    } else if (RICH_DETAIL_KEYS.has(key) && typeof value === "string" && value.length > 200) {
      richEntries.push([key, value]);
    } else {
      scalarEntries.push([key, value]);
    }
  }

  return (
    <div className="space-y-1">
      {scalarEntries.length > 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded p-2 space-y-0.5">
          {scalarEntries.map(([key, value]) => (
            <div key={key} className="flex gap-2 text-[11px]">
              <span className="text-slate-500 font-medium shrink-0 min-w-[130px]">{formatMetaLabel(key)}:</span>
              <span className="text-slate-400 break-all">
                {Array.isArray(value) ? (value.length === 0 ? "none" : value.join(", ")) : formatScalarValue(value, key)}
              </span>
            </div>
          ))}
        </div>
      )}

      {richEntries.map(([key, value]) => {
        if ((key === "promptOverrides" || key === "evolvedOverrides" || key === "overrides") && typeof value === "object" && !Array.isArray(value)) {
          return <PromptOverridesSection key={key} overrides={value as Record<string, string>} />;
        }
        if (key === "stakeholderDetails" && typeof value === "object" && !Array.isArray(value)) {
          return <StakeholderDetailsSection key={key} details={value as Record<string, { verdict: string; rationale: string }>} />;
        }
        if (key === "stakeholderCommitments" && typeof value === "object" && !Array.isArray(value)) {
          const entries = Object.entries(value as Record<string, string>);
          if (entries.length === 0) return null;
          return <RichObjectList key={key} title="Stakeholder Commitments" items={entries.map(([id, text]) => ({ name: id, commitment: text }))} />;
        }
        if (typeof value === "string" && value.length > 200) {
          const labelMap: Record<string, string> = { nuclearProtocol: "Nuclear Protocol", sanctionsRelief: "Sanctions Relief", hormuzArrangements: "Hormuz Arrangements", systemPrompt: "System Prompt" };
          return <CollapsibleTextBlock key={key} label={labelMap[key] ?? formatMetaLabel(key)} text={value} color={key === "systemPrompt" ? "violet" : "slate"} />;
        }
        if (Array.isArray(value)) {
          const labelMap: Record<string, string> = {
            analogies: "Historical Analogies", provisions: "Creative Provisions",
            crossIssueLinkages: "Cross-Issue Linkages", unconventionalApproaches: "Unconventional Approaches",
            innovativeProvisions: "Innovative Provisions", amendments: "Proposed Amendments",
            tradeoffs: "Creative Tradeoffs", promptImprovements: "Prompt Improvements",
            redTeamFindings: "Red Team Findings",
          };
          return <RichObjectList key={key} title={labelMap[key] ?? formatMetaLabel(key)} items={value} />;
        }
        if (typeof value === "object" && !Array.isArray(value)) {
          const entries = Object.entries(value as Record<string, unknown>);
          return (
            <RichObjectList key={key} title={formatMetaLabel(key)} items={entries.map(([k, v]) => ({ name: k, value: typeof v === "object" ? JSON.stringify(v) : String(v ?? "") }))} />
          );
        }
        return null;
      })}
    </div>
  );
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
  const isLLMCall = entry.level === "llm_start" || entry.level === "llm_complete" || entry.level === "llm_error";

  return (
    <div
      className={`group flex items-start gap-2 py-1.5 px-3 font-mono text-xs hover:bg-white/[0.02] ${
        entry.level === "stage" ? "border-t border-white/5 mt-1 pt-2.5" : ""
      } ${entry.level === "error" || entry.level === "llm_error" ? "bg-red-500/5" : ""} ${
        entry.level === "llm_start" ? "bg-violet-500/[0.03]" : ""
      }`}
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
          {isLLMCall && entry.provider && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-medium shrink-0">
              {entry.provider}/{entry.model}
            </span>
          )}
        </div>
        {expanded && hasDetails && (
          <div className="mt-2 ml-5 space-y-2 text-[11px]">
            {entry.metadata && <DetailedMetadata metadata={entry.metadata} />}

            {entry.prompt && (
              <CollapsibleTextBlock label="PROMPT (User Message)" text={entry.prompt} color="violet" />
            )}
            {entry.output && (
              <CollapsibleTextBlock label="OUTPUT (Model Response)" text={entry.output} color="emerald" />
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
        {!isLLMCall && entry.provider && (
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

function ActiveLLMCallBanner({ logs }: { logs: CycleLogEntry[] }) {
  const activeLLMCall = findActiveLLMCall(logs);
  if (!activeLLMCall) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/[0.06] border-b border-violet-500/10">
      <Radio className="w-3.5 h-3.5 text-violet-400 animate-pulse shrink-0" />
      <span className="text-xs text-violet-300 font-medium">Waiting for LLM response:</span>
      <span className="text-xs text-violet-200 font-mono">{activeLLMCall.provider}/{activeLLMCall.model}</span>
      <span className="text-xs text-slate-500">in {STAGE_LABELS[activeLLMCall.stage] ?? activeLLMCall.stage}</span>
      {activeLLMCall.timestamp && (
        <span className="text-xs text-slate-600 ml-auto">
          <ElapsedTimer startedAt={activeLLMCall.timestamp} />
        </span>
      )}
    </div>
  );
}

function findActiveLLMCall(logs: CycleLogEntry[]): CycleLogEntry | null {
  const pendingStarts = new Map<string, CycleLogEntry>();
  for (const log of logs) {
    const key = `${log.stage}:${log.provider}:${log.model}`;
    if (log.level === "llm_start") {
      pendingStarts.set(key, log);
    } else if (log.level === "llm_complete" || log.level === "llm_error") {
      pendingStarts.delete(key);
    }
  }
  if (pendingStarts.size === 0) return null;
  let latest: CycleLogEntry | null = null;
  for (const entry of pendingStarts.values()) {
    if (!latest || entry.timestamp > latest.timestamp) latest = entry;
  }
  return latest;
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
  const llmCalls = displayLogs.filter(l => l.level === "llm_complete").length;

  const currentStageKey = status?.dealSubStage ? `deal.${status.dealSubStage}` : status?.stage ?? null;
  const nextStageKey = getNextStage(currentStageKey);

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
                {llmCalls > 0 && <span>{llmCalls} LLM calls</span>}
                {totalTokens > 0 && <span>{totalTokens.toLocaleString()} tokens</span>}
                {errorEntries.length > 0 && <span className="text-red-400">{errorEntries.length} errors</span>}
                {warnEntries.length > 0 && <span className="text-amber-400">{warnEntries.length} warnings</span>}
              </>
            )}
            {!connected && <span className="text-red-400">Disconnected</span>}
          </div>
        </div>

        {status?.isRunning && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-300">Current Stage:</span>
              <span className="text-xs text-blue-300 font-mono font-medium">
                {currentStageKey ? (STAGE_LABELS[currentStageKey] ?? currentStageKey) : "..."}
              </span>
              {status.stageStartedAt && (
                <span className="text-xs text-slate-500">
                  (<ElapsedTimer startedAt={status.stageStartedAt} />)
                </span>
              )}
              {nextStageKey && (
                <>
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span className="text-xs text-slate-500">Next: {STAGE_LABELS[nextStageKey] ?? nextStageKey}</span>
                </>
              )}
            </div>
            {status.stagesCompleted.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-600 font-medium">Completed:</span>
                {status.stagesCompleted.map(s => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">{STAGE_LABELS[s] ?? s}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {showPrevious && !status?.isRunning && previousLogs.length > 0 && logs.length === 0 && (
          <div className="mt-2 text-xs text-slate-500">
            Showing logs from previous cycle. These will be replaced when a new cycle starts.
          </div>
        )}
      </div>

      {status?.isRunning && <ActiveLLMCallBanner logs={displayLogs} />}

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
