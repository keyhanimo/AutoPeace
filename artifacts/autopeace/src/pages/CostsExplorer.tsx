import React, { useState } from "react";
import { useListStakeholders, useGetCostsByStakeholder } from "@workspace/api-client-react";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatUsd } from "@/lib/utils";
import { Search, Map, Shield, HeartPulse, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-card rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(s => (
            <Card 
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
