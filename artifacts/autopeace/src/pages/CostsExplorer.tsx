import React, { useState } from "react";
import { useListStakeholders, useGetCostsByStakeholder } from "@workspace/api-client-react";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatUsd } from "@/lib/utils";
import { Search, Shield, HeartPulse, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

function RegionalMap({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card">
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
            <g key={id}
              style={{ cursor: "pointer" }}
              onClick={() => onSelect(id)}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r * scale + (isSelected ? 4 : 0)}
                fill={node.color}
                fillOpacity={isSelected ? 0.25 : 0.12}
                stroke={node.color}
                strokeWidth={isSelected ? 2.5 : 1}
                style={{ transition: "all 0.18s ease" }}
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r * 0.45 * scale}
                fill={node.color}
                fillOpacity={isSelected ? 1 : 0.7}
                style={{ transition: "all 0.18s ease" }}
              />
              {(isSelected || isHovered || node.r >= 14) && (
                <text
                  x={node.x}
                  y={node.y + node.r * scale + 9}
                  textAnchor="middle"
                  fill={isSelected ? "white" : "#94a3b8"}
                  fontSize={isSelected ? 8 : 7}
                  fontWeight={isSelected ? "bold" : "normal"}
                  style={{ pointerEvents: "none", transition: "all 0.18s ease" }}
                >
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

function CostDetails({ stakeholderId }: { stakeholderId: string }) {
  const { data: cost, isLoading } = useGetCostsByStakeholder(stakeholderId);

  if (isLoading) return <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Loading cost vectors...</div>;
  if (!cost) return <div className="p-4 text-center text-sm text-muted-foreground">No cost data available.</div>;

  const eco = cost.economic;
  const hum = cost.humanitarian;
  const strat = cost.strategic;

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-4 border-t border-border mt-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><DollarSign className="w-3 h-3"/> Economic</div>
          <div className="font-mono text-sm font-bold text-red-400">{formatUsd(eco?.totalUsd || 0)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><HeartPulse className="w-3 h-3"/> Displaced</div>
          <div className="font-mono text-sm font-bold text-amber-400">{(hum?.displacedPersons || 0).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Shield className="w-3 h-3"/> Proliferation</div>
          <div className="text-sm font-bold uppercase tracking-wider text-purple-400">{strat?.proliferationRiskLevel || 'Unknown'}</div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CostsExplorer() {
  const { data: stakeholdersRes, isLoading } = useListStakeholders();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stakeholders = stakeholdersRes?.data || [];
  const filtered = stakeholders.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase()));

  const handleMapSelect = (nodeId: string) => {
    const match = stakeholders.find(s => s.id === nodeId || s.id.toLowerCase().replace(/[\s-]/g, '_') === nodeId);
    if (match) {
      setExpandedId(prev => prev === match.id ? null : match.id);
      setTimeout(() => {
        document.getElementById(`stakeholder-${match.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
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
            className="pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </PageHeader>

      <RegionalMap selected={expandedId} onSelect={handleMapSelect} />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-card rounded-2xl animate-pulse" />)}
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
                {expandedId === s.id && <CostDetails stakeholderId={s.id} />}
              </AnimatePresence>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
