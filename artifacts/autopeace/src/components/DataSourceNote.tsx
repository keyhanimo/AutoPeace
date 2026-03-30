import React, { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen, Clock, AlertTriangle, Database, Info } from "lucide-react";

interface SourceEntry {
  label: string;
  detail?: string;
}

interface DataSourceNoteProps {
  title?: string;
  methodology: string;
  sources: SourceEntry[];
  limitations?: string[];
  confidenceNote?: string;
  lastUpdated?: string | Date | null;
  updateFrequency?: string;
  className?: string;
  compact?: boolean;
}

export function DataSourceNote({
  title = "Methodology & Sources",
  methodology,
  sources,
  limitations,
  confidenceNote,
  lastUpdated,
  updateFrequency,
  className = "",
  compact = false,
}: DataSourceNoteProps) {
  const [expanded, setExpanded] = useState(false);

  const formattedDate = lastUpdated
    ? typeof lastUpdated === "string"
      ? lastUpdated
      : lastUpdated.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : null;

  if (compact) {
    return (
      <div className={`border border-border/40 rounded-sm bg-card/30 ${className}`}>
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3 h-3 text-primary/80" />
            <span className="font-medium">{title}</span>
          </span>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {expanded && (
          <div className="px-3 pb-3 space-y-2 border-t border-border/30">
            <p className="text-xs text-muted-foreground leading-relaxed mt-2">{methodology}</p>
            {sources.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {sources.map((s, i) => (
                  <span key={i} className="text-xs text-primary/90">
                    {s.detail ? `${s.label}: ${s.detail}` : s.label}
                  </span>
                ))}
              </div>
            )}
            {limitations && limitations.length > 0 && (
              <div className="flex items-start gap-1 mt-1">
                <AlertTriangle className="w-2.5 h-2.5 text-amber-500/80 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {limitations.join(" ")}
                </p>
              </div>
            )}
            {formattedDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-2.5 h-2.5" />
                <span>Last updated: {formattedDate}</span>
                {updateFrequency && <span className="ml-1">({updateFrequency})</span>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`border border-border/40 rounded-sm bg-card/30 p-4 space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-4 h-4 text-primary/80" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{methodology}</p>

      {sources.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sources</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
            {sources.map((s, i) => (
              <div key={i} className="text-xs text-primary/90 flex items-start gap-1">
                <span className="text-primary/70 mt-0.5 shrink-0">•</span>
                <span>{s.detail ? <><strong>{s.label}:</strong> {s.detail}</> : s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {confidenceNote && (
        <div className="flex items-start gap-1.5 px-3 py-2 bg-primary/5 border border-primary/10 rounded-sm">
          <Info className="w-3 h-3 text-primary/80 mt-0.5 shrink-0" />
          <p className="text-xs text-primary leading-relaxed">{confidenceNote}</p>
        </div>
      )}

      {limitations && limitations.length > 0 && (
        <div className="flex items-start gap-1.5 px-3 py-2 bg-amber-950/20 border border-amber-800/20 rounded-sm">
          <AlertTriangle className="w-3 h-3 text-amber-500/80 mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground leading-relaxed space-y-0.5">
            {limitations.map((l, i) => <p key={i}>{l}</p>)}
          </div>
        </div>
      )}

      {(formattedDate || updateFrequency) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/20">
          {formattedDate && (
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              Last updated: {formattedDate}
            </span>
          )}
          {updateFrequency && (
            <span className="flex items-center gap-1">
              <Database className="w-2.5 h-2.5" />
              Refresh: {updateFrequency}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function DataFreshness({
  lastUpdated,
  updateFrequency,
  label = "Data",
  className = "",
}: {
  lastUpdated?: string | Date | null;
  updateFrequency?: string;
  label?: string;
  className?: string;
}) {
  if (!lastUpdated) return null;

  const date = typeof lastUpdated === "string" ? new Date(lastUpdated) : lastUpdated;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);

  let freshness: "fresh" | "aging" | "stale" = "fresh";
  if (diffHrs > 48) freshness = "stale";
  else if (diffHrs > 12) freshness = "aging";

  const freshnessColors = {
    fresh: "text-emerald-400",
    aging: "text-amber-400",
    stale: "text-red-400",
  };

  const relativeTime = diffHrs < 1
    ? `${Math.round(diffMs / 60000)}m ago`
    : diffHrs < 24
      ? `${Math.round(diffHrs)}h ago`
      : `${Math.round(diffHrs / 24)}d ago`;

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${freshnessColors[freshness]} ${className}`}>
      <Clock className="w-2.5 h-2.5" />
      <span>{label} updated {relativeTime}</span>
      {updateFrequency && <span className="text-muted-foreground">({updateFrequency})</span>}
    </span>
  );
}
