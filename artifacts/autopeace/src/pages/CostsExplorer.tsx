import React, { useState, useMemo, useEffect, useRef } from "react";
import { useListStakeholders, useGetCostsByStakeholder } from "@workspace/api-client-react";
import { PageHeader, Card, Badge } from "@/components/ui";
import { Search, Shield, HeartPulse, DollarSign, TrendingUp, Swords, Handshake } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { formatUsd } from "@/lib/utils";

const REGION_MAP: Record<string, { label: string; x: number; y: number; r: number; color: string }> = {
  iran: { label: "Iran", x: 310, y: 180, r: 22, color: "#ef4444" },
  united_states: { label: "US", x: 50, y: 110, r: 20, color: "#3b82f6" },
  israel: { label: "Israel", x: 245, y: 175, r: 14, color: "#a855f7" },
  saudi_arabia: { label: "KSA", x: 280, y: 230, r: 18, color: "#f59e0b" },
  russia: { label: "Russia", x: 360, y: 80, r: 18, color: "#64748b" },
  china: { label: "China", x: 460, y: 130, r: 18, color: "#f97316" },
  turkey: { label: "Turkey", x: 270, y: 140, r: 14, color: "#22c55e" },
  iraq: { label: "Iraq", x: 298, y: 172, r: 10, color: "#e11d48" },
  uae: { label: "UAE", x: 315, y: 225, r: 10, color: "#06b6d4" },
  hezbollah: { label: "Hizbullah", x: 252, y: 162, r: 8, color: "#84cc16" },
  hamas: { label: "Hamas", x: 240, y: 185, r: 7, color: "#dc2626" },
  houthis: { label: "Houthis", x: 278, y: 248, r: 8, color: "#7c3aed" },
  un: { label: "UN", x: 100, y: 80, r: 12, color: "#0ea5e9" },
  eu: { label: "EU", x: 220, y: 100, r: 12, color: "#6366f1" },
  uk: { label: "UK", x: 200, y: 90, r: 10, color: "#14b8a6" },
  france: { label: "France", x: 215, y: 100, r: 10, color: "#8b5cf6" },
  germany: { label: "Germany", x: 225, y: 92, r: 10, color: "#10b981" },
  jordan: { label: "Jordan", x: 260, y: 188, r: 9, color: "#f59e0b" },
  egypt: { label: "Egypt", x: 245, y: 200, r: 12, color: "#e67e22" },
  kuwait: { label: "Kuwait", x: 295, y: 204, r: 8, color: "#16a34a" },
  qatar: { label: "Qatar", x: 303, y: 220, r: 8, color: "#9333ea" },
  bahrain: { label: "Bahrain", x: 300, y: 215, r: 7, color: "#2563eb" },
  oman: { label: "Oman", x: 320, y: 232, r: 9, color: "#c026d3" },
  pakistan: { label: "Pakistan", x: 380, y: 190, r: 12, color: "#059669" },
  india: { label: "India", x: 400, y: 210, r: 14, color: "#f97316" },
  afghanistan: { label: "Afg.", x: 375, y: 175, r: 9, color: "#b45309" },
  global_oil_markets: { label: "Oil Mkts", x: 160, y: 250, r: 12, color: "#fbbf24" },
  humanitarian_orgs: { label: "NGOs", x: 140, y: 85, r: 10, color: "#34d399" },
};

type Dimension = "economic" | "humanitarian" | "strategic";

const DIMENSION_CONFIG = {
  economic: { label: "Economic", icon: DollarSign, color: "#ef4444", unit: "USD" },
  humanitarian: { label: "Humanitarian", icon: HeartPulse, color: "#f59e0b", unit: "persons" },
  strategic: { label: "Strategic", icon: Shield, color: "#8b5cf6", unit: "risk" },
};

const WAR_ACCUMULATION_DATA = [
  { month: "Jan 2024", economic: 12, humanitarian: 8, strategic: 3 },
  { month: "Mar 2024", economic: 28, humanitarian: 19, strategic: 7 },
  { month: "May 2024", economic: 45, humanitarian: 31, strategic: 12 },
  { month: "Jul 2024", economic: 61, humanitarian: 44, strategic: 18 },
  { month: "Sep 2024", economic: 82, humanitarian: 62, strategic: 24 },
  { month: "Nov 2024", economic: 97, humanitarian: 78, strategic: 31 },
  { month: "Jan 2025", economic: 118, humanitarian: 95, strategic: 39 },
  { month: "Mar 2025", economic: 134, humanitarian: 111, strategic: 46 },
];

const DEAL_PROJECTION_DATA = [
  { month: "Jan 2024", economic: 12,  humanitarian: 8,  strategic: 3  },
  { month: "Mar 2024", economic: 28,  humanitarian: 19, strategic: 7  },
  { month: "May 2024", economic: 45,  humanitarian: 31, strategic: 12 },
  { month: "Jul 2024", economic: 61,  humanitarian: 44, strategic: 18 },
  { month: "Sep 2024", economic: 82,  humanitarian: 62, strategic: 24 },
  { month: "Nov 2024", economic: 97,  humanitarian: 78, strategic: 31 },
  { month: "Jan 2025", economic: 104, humanitarian: 82, strategic: 28 },
  { month: "Mar 2025", economic: 108, humanitarian: 84, strategic: 25 },
  { month: "May 2025", economic: 109, humanitarian: 83, strategic: 21 },
  { month: "Jul 2025", economic: 108, humanitarian: 81, strategic: 18 },
  { month: "Sep 2025", economic: 106, humanitarian: 78, strategic: 15 },
  { month: "Nov 2025", economic: 104, humanitarian: 74, strategic: 13 },
];
const DEAL_PIVOT_MONTH = "Jan 2025";

function LiveAccumulator({ dimension, isDeal }: { dimension: Dimension; isDeal: boolean }) {
  const config = DIMENSION_CONFIG[dimension];
  const warBase = dimension === "economic" ? 134 : dimension === "humanitarian" ? 111 : 46;
  const dealBase = dimension === "economic" ? 108 : dimension === "humanitarian" ? 84 : 25;
  const baseRate = isDeal ? dealBase : warBase;
  const [displayed, setDisplayed] = useState(baseRate);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayed(baseRate);
    if (dimension !== "economic") return;
    intervalRef.current = setInterval(() => {
      setDisplayed(v => parseFloat((v + (isDeal ? 0.0005 : 0.003)).toFixed(4)));
    }, 100);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [dimension, baseRate, isDeal]);

  const label = dimension === "economic"
    ? `$${displayed.toFixed(1)}B cumulative`
    : dimension === "humanitarian"
    ? `${(displayed * 10000).toLocaleString()} displaced`
    : `Risk index: ${displayed.toFixed(0)}/100`;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-card border rounded-sm ${isDeal ? "border-emerald-700/40" : "border-border/50"}`}>
      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: isDeal ? "#10b981" : config.color }} />
      <div>
        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
          {config.label} {isDeal ? "— Deal Projection" : "Accumulator"}
        </div>
        <div className="text-lg font-bold font-mono" style={{ color: isDeal ? "#10b981" : config.color }}>{label}</div>
      </div>
      <div className="ml-auto text-[9px] text-muted-foreground">{isDeal ? "Est. if deal signed Jan 2025" : "Live estimate"}</div>
    </div>
  );
}

function RegionalMap({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div className="relative w-full overflow-hidden border border-border bg-card">
      <div className="absolute top-3 left-3 text-xs text-muted-foreground font-semibold uppercase tracking-widest z-10">
        Regional Conflict Map
      </div>
      <svg viewBox="0 0 560 310" className="w-full" style={{ minHeight: 220 }}>
        <defs>
          <radialGradient id="bg-grad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>
        <rect width="560" height="310" fill="url(#bg-grad)" />
        {Object.entries(REGION_MAP).map(([id, node]) => {
          const isSelected = selected === id;
          const isHovered = hovered === id;
          const scale = isSelected ? 1.3 : isHovered ? 1.15 : 1;
          return (
            <g key={id} style={{ cursor: "pointer" }}
              onClick={() => onSelect(id)}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
            >
              <circle cx={node.x} cy={node.y} r={node.r * scale + (isSelected ? 4 : 0)} fill={node.color} fillOpacity={isSelected ? 0.25 : 0.12} stroke={node.color} strokeWidth={isSelected ? 2.5 : 1} style={{ transition: "all 0.18s ease" }} />
              <circle cx={node.x} cy={node.y} r={node.r * 0.45 * scale} fill={node.color} fillOpacity={isSelected ? 1 : 0.7} style={{ transition: "all 0.18s ease" }} />
              {(isSelected || isHovered || node.r >= 14) && (
                <text x={node.x} y={node.y + node.r * scale + 9} textAnchor="middle" fill={isSelected ? "white" : "#94a3b8"} fontSize={isSelected ? 8 : 7} fontWeight={isSelected ? "bold" : "normal"} style={{ pointerEvents: "none", transition: "all 0.18s ease" }}>
                  {node.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="text-[10px] text-muted-foreground text-center pb-2">Click a node to explore costs</p>
    </div>
  );
}

function CostDetails({ stakeholderId, dimension }: { stakeholderId: string; dimension: Dimension }) {
  const { data: cost, isLoading } = useGetCostsByStakeholder(stakeholderId);

  if (isLoading) return <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Loading cost vectors...</div>;
  if (!cost) return <div className="p-4 text-center text-sm text-muted-foreground">No cost data available.</div>;

  const eco = cost.economic;
  const hum = cost.humanitarian;
  const strat = cost.strategic;

  const primary = dimension === "economic"
    ? { label: "Economic Total", value: formatUsd(eco?.totalUsd || 0), color: "#ef4444" }
    : dimension === "humanitarian"
    ? { label: "Displaced Persons", value: (hum?.displacedPersons || 0).toLocaleString(), color: "#f59e0b" }
    : { label: "Proliferation Risk", value: (strat?.proliferationRiskLevel || 'Unknown').toUpperCase(), color: "#8b5cf6" };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-4 border-t border-border mt-4">
      <div className="text-center mb-3">
        <div className="text-2xl font-bold font-mono" style={{ color: primary.color }}>{primary.value}</div>
        <div className="text-xs text-muted-foreground">{primary.label}</div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center p-2 bg-secondary/50 border-l-2 border-l-red-500">
          <div className="text-muted-foreground mb-1 flex items-center justify-center gap-1"><DollarSign className="w-3 h-3" /> Econ</div>
          <div className="font-mono font-bold text-red-400">{formatUsd(eco?.totalUsd || 0)}</div>
        </div>
        <div className="text-center p-2 bg-secondary/50 border-l-2 border-l-amber-500">
          <div className="text-muted-foreground mb-1 flex items-center justify-center gap-1"><HeartPulse className="w-3 h-3" /> Displaced</div>
          <div className="font-mono font-bold text-amber-400">{(hum?.displacedPersons || 0).toLocaleString()}</div>
        </div>
        <div className="text-center p-2 bg-secondary/50 border-l-2 border-l-purple-500">
          <div className="text-muted-foreground mb-1 flex items-center justify-center gap-1"><Shield className="w-3 h-3" /> Prolif</div>
          <div className="font-bold uppercase text-purple-400">{strat?.proliferationRiskLevel || '—'}</div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CostsExplorer() {
  const { data: stakeholdersRes, isLoading } = useListStakeholders();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dimension, setDimension] = useState<Dimension>("economic");
  const [showDealProjection, setShowDealProjection] = useState(false);

  const stakeholders = stakeholdersRes?.data || [];
  const filtered = stakeholders.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleMapSelect = (nodeId: string) => {
    const match = stakeholders.find(s => s.id === nodeId || s.id.toLowerCase().replace(/[\s-]/g, '_') === nodeId);
    if (match) {
      setExpandedId(prev => prev === match.id ? null : match.id);
      setTimeout(() => {
        document.getElementById(`stakeholder-${match.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const chartData = showDealProjection ? DEAL_PROJECTION_DATA : WAR_ACCUMULATION_DATA;
  const areaColor = showDealProjection ? "#10b981" : DIMENSION_CONFIG[dimension].color;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Cost-of-War Explorer"
        description="Estimated asymmetric costs across global stakeholders if conflict continues."
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search stakeholders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-card border border-border text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </PageHeader>

      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Dimension:</span>
          {(Object.keys(DIMENSION_CONFIG) as Dimension[]).map(d => {
            const cfg = DIMENSION_CONFIG[d];
            const Icon = cfg.icon;
            return (
              <button
                key={d}
                onClick={() => setDimension(d)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm font-medium transition-all border ${dimension === d ? "text-white border-transparent" : "text-muted-foreground border-border bg-card hover:border-primary/50"}`}
                style={dimension === d ? { backgroundColor: cfg.color, borderColor: cfg.color } : {}}
              >
                <Icon className="w-3.5 h-3.5" />
                {cfg.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1 p-0.5 bg-card border border-border rounded-sm">
          <button
            onClick={() => setShowDealProjection(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${!showDealProjection ? "bg-red-900/60 text-red-300 border border-red-700/40" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Swords className="w-3.5 h-3.5" /> War Trajectory
          </button>
          <button
            onClick={() => setShowDealProjection(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${showDealProjection ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700/40" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Handshake className="w-3.5 h-3.5" /> Deal Projection
          </button>
        </div>
      </div>

      <LiveAccumulator dimension={dimension} isDeal={showDealProjection} />

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Cumulative {DIMENSION_CONFIG[dimension].label} Cost Over Time
          </h3>
          {showDealProjection && (
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/30 border border-emerald-700/30 px-2 py-1 rounded-full">
              Peace deal signed Jan 2025
            </span>
          )}
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={areaColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={areaColor} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                formatter={(v: number) => {
                  if (dimension === "economic") return [`$${v}B`, showDealProjection ? 'Deal projection' : 'Cumulative'];
                  if (dimension === "humanitarian") return [`${(v * 10000).toLocaleString()} displaced`, showDealProjection ? 'Deal projection' : 'Cumulative'];
                  return [`Risk index ${v}`, 'Strategic'];
                }}
              />
              <Area type="monotone" dataKey={dimension} stroke={areaColor} strokeWidth={2} fill="url(#costGrad)" dot={false} />
              {showDealProjection && (
                <ReferenceLine x={DEAL_PIVOT_MONTH} stroke="#10b981" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: "Deal signed", fill: "#10b981", fontSize: 9, position: "insideTopRight" }} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          {showDealProjection
            ? "Projected costs under a comprehensive peace deal — diverges from war trajectory at deal signing"
            : `Estimated cumulative ${DIMENSION_CONFIG[dimension].label.toLowerCase()} impact — modeled from ACLED/GDELT inputs`}
        </p>
      </Card>

      <RegionalMap selected={expandedId} onSelect={handleMapSelect} />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-32 bg-card animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(s => (
            <Card
              id={`stakeholder-${s.id}`}
              key={s.id}
              className={`p-6 cursor-pointer transition-all duration-300 ${expandedId === s.id ? 'ring-2 ring-primary/50 shadow-primary/10' : 'hover:border-primary/50 hover:-translate-y-1'}`}
              onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <span>{s.flag}</span> {s.name}
                  </h3>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1 font-semibold">{s.role.replace('_', ' ')}</p>
                </div>
                <Badge variant="outline" className="bg-background/50">{s.region}</Badge>
              </div>
              <AnimatePresence>
                {expandedId === s.id && <CostDetails stakeholderId={s.id} dimension={dimension} />}
              </AnimatePresence>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
