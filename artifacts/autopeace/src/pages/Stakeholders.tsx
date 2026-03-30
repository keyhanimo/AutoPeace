import React, { useState } from "react";
import { useListStakeholders, type Stakeholder } from "@workspace/api-client-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { Users, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DataSourceNote } from "@/components/DataSourceNote";

const STAKEHOLDER_ICONS: Record<string, string> = {
  "us-government": "🇺🇸",
  "iran-government": "🇮🇷",
  "israel": "🇮🇱",
  "saudi-arabia": "🇸🇦",
  "hezbollah": "🕊️",
  "iaea": "☢️",
  "eu": "🇪🇺",
  "russia": "🇷🇺",
  "china": "🇨🇳",
  "un": "🌐",
};

function StakeholderCard({ stakeholder }: { stakeholder: Stakeholder }) {
  const [expanded, setExpanded] = useState(false);

  const toStrArr = (v: unknown): string[] => Array.isArray(v) ? v as string[] : [];
  const goals = toStrArr(stakeholder.goals);
  const redLines = toStrArr(stakeholder.redLines);
  const constraints = toStrArr(stakeholder.constraints);
  const preferred = toStrArr(stakeholder.preferredOutcomes);

  const icon = STAKEHOLDER_ICONS[stakeholder.id] ?? "🏛️";

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="text-2xl shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-base font-bold">{stakeholder.name}</h3>
            <Badge variant="outline" className="text-[10px]">{stakeholder.role}</Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{stakeholder.communicationStyle}</p>
        </div>
        <div className="text-muted-foreground shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 border-t border-border/40 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {goals.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3" /> Core Goals
                    </h4>
                    <ul className="space-y-1">
                      {goals.map((g, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {redLines.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" /> Red Lines
                    </h4>
                    <ul className="space-y-1">
                      {redLines.map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-red-500 shrink-0 mt-0.5">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {preferred.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Shield className="w-3 h-3" /> Preferred Outcomes
                    </h4>
                    <ul className="space-y-1">
                      {preferred.map((p, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {constraints.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Constraints</h4>
                    <ul className="space-y-1">
                      {constraints.map((c, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-muted-foreground/60 shrink-0 mt-0.5">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function Stakeholders() {
  const { data, isLoading } = useListStakeholders();
  const [search, setSearch] = useState("");

  const stakeholders = (data?.data ?? []).filter(s =>
    search === "" ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Stakeholder Gallery"
        description="Key actors in the Iran conflict — goals, red lines, constraints, and preferences."
      >
        <Badge variant="outline" className="border-primary/30 text-primary">
          {data?.data?.length ?? 0} actors
        </Badge>
      </PageHeader>

      <div className="relative">
        <input
          type="text"
          placeholder="Search stakeholders..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-10 rounded-xl border border-border bg-background/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-card rounded-xl" />
          ))}
        </div>
      ) : stakeholders.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground opacity-40 mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-2">No stakeholders found</h3>
          <p className="text-sm text-muted-foreground">
            {search ? "Try a different search term." : "Stakeholders are seeded in the DB on first run."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {stakeholders.map(s => (
            <StakeholderCard key={s.id} stakeholder={s} />
          ))}
        </div>
      )}

      <DataSourceNote
        compact
        title="Stakeholder Data Sources"
        methodology="Stakeholder profiles are compiled from academic and policy literature. Goals, red lines, constraints, and preferred outcomes are derived from official government positions, think tank analyses (ICG, IISS, Brookings, CSIS), and published diplomatic frameworks. Communication styles reflect documented negotiation patterns. Profiles are seeded in the database and updated when significant policy shifts occur."
        sources={[
          { label: "International Crisis Group (ICG)", detail: "Conflict analysis and policy briefs" },
          { label: "IISS", detail: "International Institute for Strategic Studies — strategic assessments" },
          { label: "Brookings Institution", detail: "US foreign policy analysis" },
          { label: "CSIS", detail: "Center for Strategic and International Studies" },
          { label: "Official government statements", detail: "State Department, MOFA Iran, Israeli MFA, etc." },
        ]}
        limitations={[
          "Profiles represent simplified models of complex institutional actors. Internal factional dynamics are not fully captured.",
          "Red lines and goals may shift with leadership changes — profiles require periodic manual review.",
        ]}
      />
    </div>
  );
}
