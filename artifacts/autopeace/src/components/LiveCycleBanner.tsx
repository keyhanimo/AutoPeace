import { Link, useLocation } from "react-router-dom";
import { Radio, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useCycleStatus } from "./CycleStatusIndicator";

export function LiveCycleBanner() {
  const status = useCycleStatus();
  const location = useLocation();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const wasRunning = useRef(false);

  const isLivePage = location.pathname === "/live";
  const isRunning = status?.isRunning ?? false;
  const cycleId = status?.cycleId ?? null;

  useEffect(() => {
    if (isRunning && !wasRunning.current) {
      setDismissed(null);
    }
    wasRunning.current = isRunning;
  }, [isRunning]);

  if (!isRunning || isLivePage || dismissed === cycleId) return null;

  return (
    <div className="fixed top-16 lg:top-3 right-3 lg:right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-primary/30 rounded-full pl-3 pr-1.5 py-1.5 shadow-lg shadow-black/20">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
        </span>
        <Link
          to="/live"
          className="text-[11px] text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1 transition-colors"
        >
          <Radio className="w-3 h-3" />
          Cycle running
        </Link>
        <button
          onClick={() => setDismissed(cycleId)}
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0 rounded-full hover:bg-white/5"
          aria-label="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
