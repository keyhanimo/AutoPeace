import React from "react";
import { useListChangelog } from "@workspace/api-client-react";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";
import { GitCommit, TrendingUp, AlertTriangle } from "lucide-react";

export default function Changelog() {
  const { data: changelogRes, isLoading } = useListChangelog();
  const entries = changelogRes?.data || [];

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-12">
      <PageHeader 
        title="Platform Changelog" 
        description="Chronological updates from the autoresearch loop, summarizing shifts in forecasts and model evolution."
      />

      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:via-primary/50 before:to-transparent">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading feed...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No changelog entries yet.</div>
        ) : (
          entries.map((entry, idx) => (
            <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-card shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 text-primary">
                <GitCommit className="w-5 h-5" />
              </div>
              
              <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 hover:shadow-primary/5 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {entry.cycleId.slice(0, 8)}
                  </Badge>
                </div>
                
                <h3 className="text-lg font-bold text-foreground leading-tight mb-3">{entry.headline}</h3>
                
                {entry.notes && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {entry.notes}
                  </p>
                )}

                <div className="flex gap-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span>{entry.experimentsRetained}/{entry.experimentsTried} Mutated</span>
                  </div>
                  {entry.scoreDelta && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>Scores Updated</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
