import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useListDeals, type Deal, type DealScores } from "@workspace/api-client-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { ARCHITECTURE_COLORS, scoreColor } from "@/utils/deal-ui-constants";

export default function DealHistory() {
  const { data: historyRes, isLoading } = useListDeals({ limit: 50 });
  const navigate = useNavigate();

  const historyDeals = useMemo(() => {
    return (historyRes?.data ?? [])
      .filter((d): d is Deal & { scores: DealScores } => d.scores !== null)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [historyRes]);

  const historyBarData = useMemo(() => {
    return historyDeals.map((d, i) => {
      const t = new Date(d.createdAt);
      const ts = !isNaN(t.getTime()) ? `${t.getFullYear().toString().slice(2)}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")} ${t.toLocaleTimeString("en-US",{hour12:false})}` : "";
      return {
        name: `#${i + 1} ${ts}`,
        index: i + 1,
        composite: Math.round((d.scores.composite ?? 0) * 100),
        architecture: d.architecture,
        isCurrent: d.isCurrent,
        id: d.id,
      };
    });
  }, [historyDeals]);

  const archCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    historyDeals.forEach(d => { counts[d.architecture] = (counts[d.architecture] ?? 0) + 1; });
    return counts;
  }, [historyDeals]);

  const avgComposite = useMemo(() => {
    if (historyDeals.length === 0) return 0;
    return historyDeals.reduce((sum, d) => sum + (d.scores.composite ?? 0), 0) / historyDeals.length;
  }, [historyDeals]);

  const champion = historyDeals.find(d => d.isCurrent);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-20 bg-card rounded-2xl" />
        <div className="h-96 bg-card rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Deal History"
        description="Complete archive of all AI-generated peace deal iterations. Track the evolution of proposals and compare architectures over time."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-display font-bold text-primary">{historyDeals.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Deals</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-display font-bold text-amber-400">{Object.keys(archCounts).length}</div>
          <div className="text-xs text-muted-foreground mt-1">Architectures</div>
        </Card>
        <Card className="p-4 text-center">
          <div className={`text-3xl font-display font-bold ${scoreColor(avgComposite)}`}>
            {historyDeals.length > 0 ? `${(avgComposite * 100).toFixed(0)}%` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Avg Composite</div>
        </Card>
        <Card className="p-4 text-center">
          <div className={`text-3xl font-display font-bold ${scoreColor(champion?.scores?.composite ?? 0)}`}>
            {champion ? `${((champion.scores.composite ?? 0) * 100).toFixed(0)}%` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Champion Score</div>
        </Card>
      </div>

      {historyDeals.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-bold">No Deals Generated Yet</h3>
          <p className="text-muted-foreground max-w-md">
            The deal engine has not run yet. Go to the Admin panel and trigger a deal cycle to generate the first AI peace proposal.
          </p>
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-2">Score Evolution</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Composite scores for each AI deal iteration. Click a bar to view the full deal.
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historyBarData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={(props: any) => { const { x, y, payload } = props; return (<g transform={`translate(${x},${y})`}><text x={0} y={0} dy={12} textAnchor="end" fill="#94a3b8" fontSize={8} transform="rotate(-35)">{payload.value}</text></g>); }} height={80} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                    formatter={(v: number, _: unknown, entry: { payload?: { architecture?: string; isCurrent?: boolean } }) => [
                      `${v}% (${entry.payload?.architecture ?? ""}${entry.payload?.isCurrent ? " — champion" : ""})`,
                      "Composite"
                    ]}
                  />
                  <Bar
                    dataKey="composite"
                    name="Composite Score"
                    radius={[3, 3, 0, 0]}
                    cursor="pointer"
                    onClick={(data: { id?: string }) => {
                      if (data.id) navigate(`/deals/${data.id}`);
                    }}
                  >
                    {historyBarData.map((entry) => (
                      <Cell
                        key={entry.id}
                        fill={ARCHITECTURE_COLORS[entry.architecture] ?? "#64748b"}
                        stroke={entry.isCurrent ? "#fbbf24" : "transparent"}
                        strokeWidth={entry.isCurrent ? 2.5 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 px-1">
              {Object.entries(archCounts).map(([arch, count]) => (
                <span key={arch} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: ARCHITECTURE_COLORS[arch] ?? "#64748b" }} />
                  <span className="capitalize">{arch}</span>
                  <span className="text-muted-foreground/50">({count})</span>
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground ml-2 pl-2 border-l border-border/50">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0 border-2 border-amber-400 bg-transparent" />
                <span>Current Champion</span>
              </span>
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {historyDeals.map((d, i) => {
              const s = d.scores as DealScores | null;
              return (
                <Link key={d.id} to={`/deals/${d.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`p-3 rounded-lg border text-xs text-left transition-all cursor-pointer hover:border-primary/50 ${
                      d.isCurrent ? "border-primary/50 bg-primary/5" : "border-border hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold">
                        Deal #{i + 1}
                        <span className="ml-1.5 capitalize" style={{ color: ARCHITECTURE_COLORS[d.architecture] ?? "#94a3b8" }}>
                          {d.architecture}
                        </span>
                      </span>
                      {d.isCurrent && <Badge className="text-[9px] px-1 py-0 h-4">champion</Badge>}
                    </div>
                    <div className={`font-bold ${scoreColor(s?.composite ?? 0)}`}>
                      {s ? `${((s.composite ?? 0) * 100).toFixed(0)}% composite` : "—"}
                    </div>
                    <div className="text-muted-foreground/60">{(() => { const dt = new Date(d.createdAt); return `${dt.getFullYear().toString().slice(2)}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")} ${dt.toLocaleTimeString("en-US",{hour12:false})}`; })()}</div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
