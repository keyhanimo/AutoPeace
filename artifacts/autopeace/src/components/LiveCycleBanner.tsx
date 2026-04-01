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
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between gap-3 animate-in slide-in-from-top-1 duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <p className="text-xs text-foreground truncate">
          <span className="font-medium">Research cycle running</span>
          <span className="text-muted-foreground"> — </span>
          <Link
            to="/live"
            className="text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1 transition-colors"
          >
            <Radio className="w-3 h-3" />
            Follow live
          </Link>
        </p>
      </div>
      <button
        onClick={() => setDismissed(cycleId)}
        className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
