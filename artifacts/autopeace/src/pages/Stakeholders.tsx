import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useListStakeholders,
  useGetCurrentDeal,
  useListCosts,
  useGetProposalArena,
  useGetCostsByStakeholder,
  useGetLatestForecasts,
  type Stakeholder,
} from "@workspace/api-client-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Shield,
  Globe, Info, Clock, XCircle, Share2, DollarSign, GitCompare, Eye,
  TrendingUp, BarChart2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DataSourceNote } from "@/components/DataSourceNote";

const STAKEHOLDER_DEFINITIONS: Record<string, string> = {
  iran: "The Islamic Republic of Iran — the central state actor in the conflict, encompassing the Supreme Leader's office, elected government, and bureaucratic apparatus.",
  us: "The United States federal government, including the Executive Branch, State Department, Pentagon, and intelligence community as they relate to Iran policy.",
  israel: "The State of Israel, including the Prime Minister's office, IDF, Mossad, and the broader security establishment driving Iran containment policy.",
  saudi_arabia: "The Kingdom of Saudi Arabia under Crown Prince MBS, including Vision 2030 economic planning and regional security posture vis-à-vis Iran.",
  uae: "The United Arab Emirates, a pragmatic Gulf power balancing economic ties with Iran against security alignment with the US and Israel.",
  qatar: "The State of Qatar, host to US Central Command (Al Udeid) while maintaining diplomatic channels with Iran via shared gas field interests.",
  oman: "The Sultanate of Oman, historically the key back-channel facilitator between Iran and the West (e.g., JCPOA secret talks).",
  kuwait: "The State of Kuwait, a US-allied Gulf state with significant Shia minority population and Iraqi border security concerns.",
  bahrain: "The Kingdom of Bahrain, home to the US Fifth Fleet, with a Shia-majority population governed by a Sunni monarchy, making it sensitive to Iranian influence.",
  egypt: "The Arab Republic of Egypt under President Sisi, focused on Gaza ceasefire mediation, Suez Canal revenue protection, and regional stability.",
  turkey: "The Republic of Turkey under President Erdogan, a NATO member balancing Western alliance obligations with independent engagement of Iran and Russia.",
  pakistan: "The Islamic Republic of Pakistan, a nuclear-armed neighbor of Iran with shared border tensions and economic corridor interests.",
  iraq: "The Republic of Iraq, a fractured state caught between Iranian militia influence (PMF/Hashd) and US military presence.",
  jordan: "The Hashemite Kingdom of Jordan, a moderate US ally vulnerable to refugee flows, with custodianship interests over Jerusalem's holy sites.",
  lebanon: "The Lebanese Republic, a failed state where Hezbollah operates as both political party and Iranian proxy militia with precision missile capability.",
  yemen: "Yemen's Houthi movement (Ansar Allah), an Iranian-aligned non-state actor controlling northern Yemen and conducting Red Sea maritime attacks.",
  syria: "The Syrian Arab Republic under post-Assad transitional governance, with Russian military bases and former Iranian/Hezbollah presence.",
  france: "The French Republic, an E3/EU nuclear negotiator, JCPOA architect, and key voice for European strategic autonomy in Middle East policy.",
  germany: "The Federal Republic of Germany, the EU's largest economy and E3 member, prioritizing diplomatic resolution and non-proliferation norms.",
  uk: "The United Kingdom, post-Brexit E3 participant closely aligned with US policy, with naval presence in the Gulf (HMS Duncan, Bahrain base).",
  russia: "The Russian Federation, Iran's strategic partner in Syria, arms supplier (S-300/400), and UN Security Council veto holder opposing Western sanctions.",
  china: "The People's Republic of China, Iran's largest oil customer, BRI partner, and diplomatic counterweight to US-led pressure campaigns.",
  india: "The Republic of India, balancing Iranian oil imports and Chabahar port access against US sanctions compliance pressure.",
  japan: "Japan, critically dependent on Gulf oil transiting the Strait of Hormuz (~80% of oil imports), with constitutional pacifism constraining military options.",
  south_korea: "The Republic of Korea, holding ~$7B in frozen Iranian assets and dependent on Gulf energy, caught between US alliance and Iranian economic leverage.",
  ukraine: "Ukraine, fighting Russia's invasion with a direct stake in curtailing Iranian drone (Shahed-136) supply to Russia's military.",
  global_north: "An aggregate bloc representing the G7 nations plus EU/OECD economies broadly aligned on rules-based international order, non-proliferation norms, and sanctions enforcement. Includes US, Canada, EU members, UK, Japan, Australia, and allied democracies.",
  global_south_energy_importers: "An aggregate bloc representing developing nations that are net energy importers — particularly vulnerable to oil price spikes from Gulf instability. Includes most of Sub-Saharan Africa, South/Southeast Asia (except exporters), and small island states.",
  global_south_energy_exporters: "An aggregate bloc representing developing nations that are net energy exporters and may benefit from elevated oil prices during conflict. Includes OPEC members (Nigeria, Angola, Venezuela, Algeria), plus non-OPEC producers (Brazil, Malaysia).",
  iaea: "The International Atomic Energy Agency, the UN's nuclear watchdog responsible for verifying Iran's compliance with safeguards agreements and monitoring enrichment activities at Natanz, Fordow, and Isfahan.",
  iran_reformists: "The reformist political faction within Iran, including figures aligned with former Presidents Khatami and Rouhani, advocating pragmatic diplomacy, sanctions relief, and reduced international isolation. Largely sidelined since 2021 Guardian Council vetting.",
  iran_irgc: "The Islamic Revolutionary Guard Corps (IRGC) leadership — Iran's most powerful military-economic institution, controlling the Quds Force (external operations), proxy networks (Hezbollah, PMF, Houthis), and significant economic interests via sanctions-bypass enterprises.",
};

const ROLE_LABELS: Record<string, string> = {
  core_principal: "Core Principal",
  gulf_state: "Gulf State",
  regional_broker: "Regional Broker",
  external_power: "External Power",
  global_bloc: "Global Bloc",
  international_org: "International Organization",
  internal_faction: "Internal Faction",
};

const ROLE_COLORS: Record<string, string> = {
  core_principal: "text-red-400 border-red-400/30",
  gulf_state: "text-amber-400 border-amber-400/30",
  regional_broker: "text-sky-400 border-sky-400/30",
  external_power: "text-violet-400 border-violet-400/30",
  global_bloc: "text-emerald-400 border-emerald-400/30",
  international_org: "text-cyan-400 border-cyan-400/30",
  internal_faction: "text-orange-400 border-orange-400/30",
};

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  required: { label: "Required", color: "text-red-400 border-red-400/30 bg-red-400/10" },
  critical: { label: "Critical", color: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  influential: { label: "Influential", color: "text-sky-400 border-sky-400/30 bg-sky-400/10" },
  contextual: { label: "Contextual", color: "text-zinc-400 border-zinc-400/30 bg-zinc-400/10" },
};

const OUTCOME_LABELS: Record<string, string> = {
  continued_conflict: "Continued Conflict",
  major_escalation: "Major Escalation",
  informal_deescalation: "Informal De-escalation",
  limited_ceasefire: "Limited Ceasefire",
  humanitarian_mini_deal: "Humanitarian Mini-Deal",
  sanctions_partial_deal: "Sanctions Partial Deal",
  regional_framework: "Regional Framework",
  broad_settlement: "Broad Settlement",
};

const VERDICT_ICONS: Record<string, React.ReactNode> = {
  accept: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-label="Accept" />,
  conditional: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" aria-label="Conditional" />,
  reject: <XCircle className="w-3.5 h-3.5 text-red-400" aria-label="Reject" />,
};

const VERDICT_COLORS: Record<string, string> = {
  accept: "text-emerald-400",
  conditional: "text-amber-400",
  reject: "text-red-400",
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function parseTextField(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "string" && value.trim()) {
    return value.split(/,\s*/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function VerdictBadge({ verdict }: { verdict: string | undefined }) {
  if (!verdict) return <span className="text-muted-foreground text-xs">—</span>;
  if (verdict === "accept") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs font-semibold">
        <CheckCircle2 className="w-3 h-3" /> Accept
      </span>
    );
  }
  if (verdict === "conditional") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs font-semibold">
        <AlertTriangle className="w-3 h-3" /> Conditional
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs font-semibold">
      <XCircle className="w-3 h-3" /> Reject
    </span>
  );
}

function CompactVerdictBadge({ verdict }: { verdict: string | undefined }) {
  if (!verdict) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium capitalize ${VERDICT_COLORS[verdict] ?? "text-foreground"}`}>
      {VERDICT_ICONS[verdict]}
      {verdict}
    </span>
  );
}

type DomesticEval = { audience: string; verdict: string; rationale: string };
type StakeholderEval = { verdict: string; rationale: string; conditions?: string[]; redLineViolations?: string[] };

function getStakeholderVerdict(stakeholderId: string, evals: Record<string, StakeholderEval> | null): StakeholderEval | null {
  if (!evals) return null;
  return evals[stakeholderId] ?? null;
}

function getDomesticVerdicts(stakeholderId: string, domestic: Record<string, DomesticEval> | null): DomesticEval[] {
  if (!domestic) return [];
  const prefix = stakeholderId + "_";
  return Object.entries(domestic)
    .filter(([key]) => key === stakeholderId || key.startsWith(prefix))
    .map(([, v]) => v);
}

function StakeholderCard({ stakeholder }: { stakeholder: Stakeholder }) {
  const [expanded, setExpanded] = useState(false);

  const goals = parseTextField(stakeholder.goals);
  const redLines = parseTextField(stakeholder.redLines);
  const constraints = parseTextField(stakeholder.constraints);
  const preferred = parseTextField(stakeholder.preferredOutcomes);
  const definition = STAKEHOLDER_DEFINITIONS[stakeholder.id];
  const roleColor = ROLE_COLORS[stakeholder.role] ?? "text-muted-foreground border-border";

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="text-2xl shrink-0">{stakeholder.flag || "🏛️"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-base font-bold">{stakeholder.name}</h3>
            <Badge variant="outline" className={`text-[10px] ${roleColor}`}>
              {ROLE_LABELS[stakeholder.role] ?? stakeholder.role.replace(/_/g, " ")}
            </Badge>
            {stakeholder.tier && TIER_LABELS[stakeholder.tier] && (
              <Badge variant="outline" className={`text-[10px] ${TIER_LABELS[stakeholder.tier].color}`}>
                {TIER_LABELS[stakeholder.tier].label}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">{stakeholder.region}</span>
          </div>
          <div className="flex items-center gap-3">
            {definition && (
              <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{definition}</p>
            )}
            {stakeholder.updatedAt && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0" title={`Last updated: ${new Date(stakeholder.updatedAt).toLocaleString()}`}>
                <Clock className="w-3 h-3" />
                {formatRelativeTime(stakeholder.updatedAt)}
              </span>
            )}
          </div>
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
              {definition && (
                <div className="bg-secondary/20 border border-border/50 rounded-lg p-3">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Info className="w-3 h-3" /> Definition
                  </h4>
                  <p className="text-xs text-foreground/80 leading-relaxed">{definition}</p>
                </div>
              )}

              {stakeholder.profileSummary && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> AI Profile Summary
                  </h4>
                  <p className="text-xs text-foreground/80 leading-relaxed">{stakeholder.profileSummary}</p>
                </div>
              )}

              {stakeholder.communicationStyle && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3 h-3" /> Communication Style
                  </h4>
                  <p className="text-xs text-muted-foreground">{stakeholder.communicationStyle}</p>
                </div>
              )}

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

type RoleFilter = "all" | string;

function GalleryTab() {
  const { data, isLoading } = useListStakeholders();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const allStakeholders = data?.data ?? [];
  const roles = Array.from(new Set(allStakeholders.map(s => s.role)));

  const stakeholders = allStakeholders.filter(s => {
    if (roleFilter !== "all" && s.role !== roleFilter) return false;
    if (search !== "" && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.role.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search stakeholders..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 border border-border bg-background/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="h-10 border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Roles ({allStakeholders.length})</option>
          {roles.map(r => (
            <option key={r} value={r}>
              {ROLE_LABELS[r] ?? r.replace(/_/g, " ")} ({allStakeholders.filter(s => s.role === r).length})
            </option>
          ))}
        </select>
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
            {search || roleFilter !== "all" ? "Try a different search term or filter." : "Stakeholders are seeded in the DB on first run."}
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
        methodology="Stakeholder profiles are compiled from academic and policy literature. Goals, red lines, constraints, and preferred outcomes are derived from official government positions, think tank analyses (ICG, IISS, Brookings, CSIS), and published diplomatic frameworks. Communication styles reflect documented negotiation patterns. Global blocs aggregate multiple countries sharing similar structural interests. Internal factions model sub-state actors within Iran's political system."
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
          "Global bloc aggregations (Global North, Global South Importers/Exporters) simplify diverse national interests into composite positions.",
        ]}
      />
    </div>
  );
}

function formatCostTotal(cost: unknown): string {
  if (!cost || typeof cost !== "object") return "—";
  const obj = cost as Record<string, unknown>;
  if (obj.total !== undefined) return `$${Number(obj.total).toLocaleString()}B`;
  return "Available";
}

function CompareTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSelected = (searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 4);

  const [selected, setSelected] = useState<string[]>(initialSelected);

  const { data: stakeholdersData, isLoading: stakeholdersLoading } = useListStakeholders();
  const { data: currentDeal } = useGetCurrentDeal();
  const { data: costsData } = useListCosts();

  const stakeholders = stakeholdersData?.data ?? [];
  const stakeholderEvals = (currentDeal?.stakeholderEvaluations ?? null) as Record<string, StakeholderEval> | null;
  const domesticEvals = (currentDeal?.domesticEvaluations ?? null) as Record<string, DomesticEval> | null;
  const allCosts = costsData?.data ?? [];
  const dealScores = (currentDeal?.scores ?? null) as Record<string, number> | null;

  function getCostsForStakeholder(stakeholderId: string) {
    return allCosts.find(c => c.stakeholderId === stakeholderId) ?? null;
  }

  const toggle = (id: string) => {
    setSelected(prev => {
      let next: string[];
      if (prev.includes(id)) {
        next = prev.filter(x => x !== id);
      } else if (prev.length < 4) {
        next = [...prev, id];
      } else {
        next = prev;
      }
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        if (next.length) {
          newParams.set("ids", next.join(","));
        } else {
          newParams.delete("ids");
        }
        return newParams;
      }, { replace: true });
      return next;
    });
  };

  const shareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("ids", selected.join(","));
    navigator.clipboard.writeText(url.toString());
  };

  const selectedStakeholders = useMemo(
    () => selected.map(id => stakeholders.find(s => s.id === id)).filter((s): s is Stakeholder => !!s),
    [selected, stakeholders]
  );

  if (stakeholdersLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-16 bg-card rounded-2xl" />
        <div className="h-64 bg-card rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">Select Stakeholders</h3>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary/40 text-primary">
              <Users className="w-3 h-3 mr-1" /> {selected.length}/4 selected
            </Badge>
            {selected.length > 0 && (
              <button
                onClick={shareUrl}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                aria-label="Copy shareable link to clipboard"
              >
                <Share2 className="w-3 h-3" /> Copy shareable link
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {stakeholders.map(s => {
            const isSelected = selected.includes(s.id);
            const disabled = !isSelected && selected.length >= 4;
            return (
              <button
                key={s.id}
                onClick={() => !disabled && toggle(s.id)}
                disabled={disabled}
                aria-pressed={isSelected}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  isSelected
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : disabled
                    ? "border-border/20 text-muted-foreground/40 cursor-not-allowed"
                    : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {s.flag && <span className="mr-1" aria-hidden="true">{s.flag}</span>}
                {s.name}
              </button>
            );
          })}
        </div>
      </Card>

      {selectedStakeholders.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground opacity-40 mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-2">No stakeholders selected</h3>
          <p className="text-sm text-muted-foreground">Select 2–4 stakeholders above to compare them.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className={`grid gap-4 ${selectedStakeholders.length === 2 ? "sm:grid-cols-2" : selectedStakeholders.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
            {selectedStakeholders.map(s => {
              const verdict = getStakeholderVerdict(s.id, stakeholderEvals);
              const domestic = getDomesticVerdicts(s.id, domesticEvals);
              return (
                <Card key={s.id} className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    {s.flag && <span className="text-2xl" aria-hidden="true">{s.flag}</span>}
                    <div>
                      <h3 className="text-sm font-bold">{s.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{s.role}</p>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Deal Verdict</div>
                    {verdict ? (
                      <>
                        <CompactVerdictBadge verdict={verdict.verdict} />
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">{verdict.rationale}</p>
                        {verdict.conditions && verdict.conditions.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {verdict.conditions.slice(0, 2).map((c, i) => (
                              <p key={i} className="text-xs text-amber-400">• {c}</p>
                            ))}
                          </div>
                        )}
                        {verdict.redLineViolations && verdict.redLineViolations.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {verdict.redLineViolations.slice(0, 2).map((r, i) => (
                              <p key={i} className="text-xs text-red-400">✗ {r}</p>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">No deal generated yet</p>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Goals</div>
                    <p className="text-xs text-foreground leading-relaxed line-clamp-3">
                      {s.goals || <span className="text-muted-foreground">—</span>}
                    </p>
                  </div>

                  {s.redLines && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Red Lines</div>
                      <p className="text-xs text-red-400 leading-relaxed line-clamp-2">{s.redLines}</p>
                    </div>
                  )}

                  {domestic.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Domestic Sellability</div>
                      {domestic.map((d, i) => (
                        <div key={i} className="flex items-center gap-1 mt-0.5">
                          <CompactVerdictBadge verdict={d.verdict === "sellable" ? "accept" : d.verdict === "unsellable" ? "reject" : "conditional"} />
                          <span className="text-xs text-muted-foreground">{d.audience}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(() => {
                    const costs = getCostsForStakeholder(s.id);
                    if (!costs) return null;
                    return (
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1">
                          <DollarSign className="w-2.5 h-2.5" /> Cost of Conflict
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { label: "Economic", value: formatCostTotal(costs.economic) },
                            { label: "Human", value: formatCostTotal(costs.humanitarian) },
                            { label: "Strategic", value: formatCostTotal(costs.strategic) },
                          ].map(({ label, value }) => (
                            <div key={label} className="text-center bg-secondary/30 rounded p-1">
                              <div className="text-[9px] text-muted-foreground">{label}</div>
                              <div className="text-xs font-mono text-amber-400">{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {dealScores && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Deal Score Dimensions</div>
                      <div className="space-y-1">
                        {[
                          { key: "feasibility", label: "Feasibility" },
                          { key: "domesticSellability", label: "Domestic" },
                          { key: "durability", label: "Durability" },
                        ].map(({ key, label }) => {
                          const v = dealScores[key] ?? null;
                          return (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-[9px] text-muted-foreground w-16 shrink-0">{label}</span>
                              <div className="flex-1 h-1 rounded bg-secondary/40 overflow-hidden">
                                <div className="h-full rounded bg-primary/60" style={{ width: `${v != null ? Math.round(v * 100) : 0}%` }} />
                              </div>
                              <span className="text-[9px] font-mono w-6 text-right">{v != null ? Math.round(v * 100) : "—"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-bold mb-4">Comparison Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" role="table" aria-label="Stakeholder comparison table">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Attribute</th>
                    {selectedStakeholders.map(s => (
                      <th key={s.id} className="text-center py-2 px-2 font-medium">
                        {s.flag} {s.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/20">
                    <td className="py-2 pr-4 text-muted-foreground">Role</td>
                    {selectedStakeholders.map(s => (
                      <td key={s.id} className="text-center py-2 px-2 capitalize">{s.role}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-2 pr-4 text-muted-foreground">Deal Verdict</td>
                    {selectedStakeholders.map(s => {
                      const v = getStakeholderVerdict(s.id, stakeholderEvals);
                      return (
                        <td key={s.id} className="text-center py-2 px-2">
                          <CompactVerdictBadge verdict={v?.verdict} />
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-2 pr-4 text-muted-foreground">Goals stated</td>
                    {selectedStakeholders.map(s => (
                      <td key={s.id} className="text-center py-2 px-2">{s.goals ? "Yes" : "—"}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-2 pr-4 text-muted-foreground">Red lines</td>
                    {selectedStakeholders.map(s => (
                      <td key={s.id} className="text-center py-2 px-2">{s.redLines ? "Yes" : "—"}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-2 pr-4 text-muted-foreground">Red line violations</td>
                    {selectedStakeholders.map(s => {
                      const v = getStakeholderVerdict(s.id, stakeholderEvals);
                      const count = v?.redLineViolations?.length ?? 0;
                      return (
                        <td key={s.id} className={`text-center py-2 px-2 font-mono ${count > 0 ? "text-red-400" : "text-emerald-400"}`}>
                          {v ? count : "—"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-2 pr-4 text-muted-foreground">Conditions to accept</td>
                    {selectedStakeholders.map(s => {
                      const v = getStakeholderVerdict(s.id, stakeholderEvals);
                      const count = v?.conditions?.length ?? 0;
                      return (
                        <td key={s.id} className={`text-center py-2 px-2 font-mono ${count === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                          {v ? count : "—"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-2 pr-4 text-muted-foreground">Economic cost of conflict</td>
                    {selectedStakeholders.map(s => {
                      const costs = getCostsForStakeholder(s.id);
                      return (
                        <td key={s.id} className="text-center py-2 px-2 font-mono text-xs text-amber-400">
                          {costs ? formatCostTotal(costs.economic) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-2 pr-4 text-muted-foreground">Humanitarian cost</td>
                    {selectedStakeholders.map(s => {
                      const costs = getCostsForStakeholder(s.id);
                      return (
                        <td key={s.id} className="text-center py-2 px-2 font-mono text-xs text-amber-400">
                          {costs ? formatCostTotal(costs.humanitarian) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                  {dealScores && (
                    <>
                      <tr className="border-b border-border/20">
                        <td className="py-2 pr-4 text-muted-foreground">Deal feasibility</td>
                        {selectedStakeholders.map(s => (
                          <td key={s.id} className="text-center py-2 px-2 font-mono text-xs">
                            {dealScores.feasibility != null ? `${Math.round(dealScores.feasibility * 100)}%` : "—"}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-border/20">
                        <td className="py-2 pr-4 text-muted-foreground">Domestic sellability</td>
                        {selectedStakeholders.map(s => (
                          <td key={s.id} className="text-center py-2 px-2 font-mono text-xs">
                            {dealScores.domesticSellability != null ? `${Math.round(dealScores.domesticSellability * 100)}%` : "—"}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-muted-foreground">Composite deal score</td>
                        {selectedStakeholders.map(s => (
                          <td key={s.id} className="text-center py-2 px-2 font-mono text-xs font-bold text-primary">
                            {dealScores.composite != null ? `${Math.round(dealScores.composite * 100)}%` : "—"}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <DataSourceNote
        compact
        title="Comparison Methodology"
        methodology="Side-by-side comparison uses data from the stakeholder profiles database, the deal evaluation pipeline (verdicts, red-line violations, conditions), and the CBA economic model (cost data for Iran/US/Israel from DB; other stakeholders from client-side model). All scores are AI-generated through the multi-agent pipeline."
        sources={[
          { label: "Stakeholder profiles", detail: "Database-seeded from ICG, IISS, Brookings analyses" },
          { label: "Deal verdicts", detail: "Multi-agent pipeline evaluation (Claude/GPT-4o/Gemini)" },
          { label: "Cost data", detail: "IMF WEO 2024 + modeled war-peace estimates" },
        ]}
        limitations={["Comparison is limited to current deal and proposal evaluations — no historical trend comparison across deal iterations."]}
      />
    </div>
  );
}

function StakeholderOverview({ stakeholder }: { stakeholder: Stakeholder }) {
  const icon = stakeholder.flag || "🏛️";
  const toArr = (v: unknown): string[] => Array.isArray(v) ? v as string[] : typeof v === "string" && v.trim() ? v.split(/,\s*/).map(s => s.trim()).filter(Boolean) : [];
  const goals = toArr(stakeholder.goals);
  const redLines = toArr(stakeholder.redLines);
  const preferred = toArr(stakeholder.preferredOutcomes);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{stakeholder.name}</h2>
            <Badge variant="outline" className="text-[10px]">{stakeholder.role}</Badge>
            {stakeholder.tier && (
              <Badge variant="outline" className="text-[10px]">{stakeholder.tier}</Badge>
            )}
          </div>
          {stakeholder.updatedAt && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5" title={new Date(stakeholder.updatedAt).toLocaleString()}>
              <Clock className="w-3 h-3" /> Last updated {new Date(stakeholder.updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      {stakeholder.communicationStyle && (
        <p className="text-sm text-muted-foreground">{stakeholder.communicationStyle}</p>
      )}
      <div className="grid sm:grid-cols-3 gap-4 text-sm">
        {goals.length > 0 && (
          <div>
            <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">Core Goals</p>
            <ul className="space-y-1">
              {goals.map((g, i) => <li key={i} className="flex gap-1.5"><span className="text-green-500 shrink-0 mt-0.5">•</span>{g}</li>)}
            </ul>
          </div>
        )}
        {redLines.length > 0 && (
          <div>
            <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">Red Lines</p>
            <ul className="space-y-1">
              {redLines.map((r, i) => <li key={i} className="flex gap-1.5"><span className="text-red-500 shrink-0 mt-0.5">•</span>{r}</li>)}
            </ul>
          </div>
        )}
        {preferred.length > 0 && (
          <div>
            <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">Preferred Outcomes</p>
            <ul className="space-y-1">
              {preferred.map((p, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-blue-500 shrink-0 mt-0.5">•</span>
                  {OUTCOME_LABELS[p] ?? p}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function ProposalEvalSection({ stakeholderId }: { stakeholderId: string }) {
  const { data: proposalsData, isLoading } = useGetProposalArena();

  const proposals = useMemo(() => {
    type PEntry = {
      id: string;
      name: string;
      summary: string;
      stakeholderEvaluations?: Record<string, { verdict: string; rationale: string; redLineViolations?: string[]; conditions?: string[] }>;
      scores?: { composite?: number };
    };
    const list: PEntry[] = (proposalsData as unknown as { proposals?: PEntry[] })?.proposals ?? [];
    return list
      .filter(p => p.stakeholderEvaluations && p.stakeholderEvaluations[stakeholderId])
      .map(p => ({
        ...p,
        eval: p.stakeholderEvaluations![stakeholderId]!,
      }));
  }, [proposalsData, stakeholderId]);

  if (isLoading) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted-foreground animate-pulse">Loading proposal evaluations…</p>
      </Card>
    );
  }

  if (proposals.length === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">No evaluated proposals found for this stakeholder.</p>
      </Card>
    );
  }

  const accepts = proposals.filter(p => p.eval.verdict === "accept").length;
  const conditionals = proposals.filter(p => p.eval.verdict === "conditional").length;
  const rejects = proposals.filter(p => p.eval.verdict === "reject").length;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-500" />
        <h3 className="font-semibold text-sm">Proposal Evaluations</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {accepts} accept · {conditionals} conditional · {rejects} reject
        </span>
      </div>
      <div className="space-y-3">
        {proposals.map(p => (
          <div key={p.id} className="border border-border/40 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2 flex-wrap">
              <span className="font-medium text-sm">{p.name}</span>
              <VerdictBadge verdict={p.eval.verdict} />
              {p.scores?.composite != null && (
                <span className="text-xs text-muted-foreground ml-auto">
                  Score: {(p.scores.composite * 100).toFixed(0)}/100
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{p.eval.rationale}</p>
            {p.eval.redLineViolations && p.eval.redLineViolations.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {p.eval.redLineViolations.map((v, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    ⚠ {v}
                  </span>
                ))}
              </div>
            )}
            {p.eval.conditions && p.eval.conditions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {p.eval.conditions.map((c, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                    ✓ {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function CostLensSection({ stakeholderId }: { stakeholderId: string }) {
  const { data, isLoading } = useGetCostsByStakeholder(stakeholderId);

  if (isLoading) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted-foreground animate-pulse">Loading cost data…</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">No cost data available for this stakeholder.</p>
      </Card>
    );
  }

  const cost = data as unknown as {
    economic?: { totalUsd?: number };
    humanitarian?: { displacedPersons?: number; casualtiesEstimate?: number };
    strategic?: { proliferationRiskLevel?: string };
  };

  const econTotal = cost.economic?.totalUsd ?? 0;
  const displaced = cost.humanitarian?.displacedPersons ?? 0;
  const casualties = cost.humanitarian?.casualtiesEstimate ?? 0;
  const prolifRisk = cost.strategic?.proliferationRiskLevel ?? "—";

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-amber-500" />
        <h3 className="font-semibold text-sm">Cost Profile</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="bg-muted/30 rounded p-3">
          <p className="text-xs text-muted-foreground">Economic Cost</p>
          <p className="font-bold text-base text-red-400">${(econTotal / 1e9).toFixed(1)}B</p>
        </div>
        <div className="bg-muted/30 rounded p-3">
          <p className="text-xs text-muted-foreground">Displaced</p>
          <p className="font-bold text-base text-amber-400">{displaced.toLocaleString()}</p>
        </div>
        <div className="bg-muted/30 rounded p-3">
          <p className="text-xs text-muted-foreground">Casualties</p>
          <p className="font-bold text-base text-red-300">{casualties.toLocaleString()}</p>
        </div>
        <div className="bg-muted/30 rounded p-3">
          <p className="text-xs text-muted-foreground">Prolif Risk</p>
          <p className="font-bold text-base text-purple-400 uppercase">{prolifRisk}</p>
        </div>
      </div>
    </Card>
  );
}

function ForecastLensSection({ stakeholder }: { stakeholder: Stakeholder }) {
  const { data: forecastsData, isLoading } = useGetLatestForecasts();
  const preferred = Array.isArray(stakeholder.preferredOutcomes) ? stakeholder.preferredOutcomes as string[] : typeof stakeholder.preferredOutcomes === "string" && (stakeholder.preferredOutcomes as string).trim() ? (stakeholder.preferredOutcomes as string).split(/,\s*/).map(s => s.trim()).filter(Boolean) : [];

  const latest = useMemo(() => {
    type FEntry = { id: string; timeHorizon: string; probabilities: Record<string, number> };
    const list: FEntry[] = (forecastsData as unknown as { data?: FEntry[] })?.data ?? [];
    return list.find(f => f.timeHorizon === "90d") ?? list[0] ?? null;
  }, [forecastsData]);

  if (isLoading) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted-foreground animate-pulse">Loading forecast data…</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-purple-500" />
        <h3 className="font-semibold text-sm">Forecast Outlook (90d)</h3>
        {preferred.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            Highlighted = preferred outcomes
          </span>
        )}
      </div>

      {latest ? (
        <div className="space-y-2">
          {Object.entries(latest.probabilities ?? {})
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([key, prob]) => {
              const isPreferred = preferred.includes(key);
              const pct = typeof prob === "number" ? (prob * 100).toFixed(1) : "0.0";
              return (
                <div key={key} className={`rounded p-2 ${isPreferred ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" : ""}`}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-medium ${isPreferred ? "text-blue-700 dark:text-blue-300" : ""}`}>
                      {isPreferred && "⭐ "}{OUTCOME_LABELS[key] ?? key}
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isPreferred ? "bg-blue-500" : "bg-muted-foreground/40"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No forecast data available.</p>
      )}
    </Card>
  );
}

function DealLensSection({ stakeholderId }: { stakeholderId: string }) {
  const { data: dealData, isLoading } = useGetCurrentDeal();

  const deal = dealData as unknown as {
    id: string;
    name: string;
    summary: string;
    scores?: { composite?: number };
    stakeholderEvaluations?: Record<string, { verdict: string; rationale: string }>;
  } | null | undefined;

  if (isLoading) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted-foreground animate-pulse">Loading deal data…</p>
      </Card>
    );
  }

  if (!deal) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">No current deal found.</p>
      </Card>
    );
  }

  const stakeholderEval = deal.stakeholderEvaluations?.[stakeholderId];

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-green-500" />
        <h3 className="font-semibold text-sm">Current Best Deal</h3>
        {deal.scores?.composite != null && (
          <Badge variant="outline" className="ml-auto text-xs">
            Score: {(deal.scores.composite * 100).toFixed(0)}/100
          </Badge>
        )}
      </div>
      <p className="text-sm font-medium">{deal.name}</p>
      <p className="text-xs text-muted-foreground">{deal.summary}</p>
      {stakeholderEval ? (
        <div className="border-t border-border/40 pt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            This Stakeholder's Position
            <VerdictBadge verdict={stakeholderEval.verdict} />
          </div>
          <p className="text-xs text-muted-foreground">{stakeholderEval.rationale}</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground border-t border-border/40 pt-3">
          No evaluation from this stakeholder on the current deal.
        </p>
      )}
    </Card>
  );
}

function LensTab() {
  const { data: stakeholderList, isLoading } = useListStakeholders();
  const [selectedId, setSelectedId] = useState<string>("");

  const stakeholders = ((stakeholderList as unknown as { data?: Stakeholder[] })?.data ?? []) as Stakeholder[];

  const selected = stakeholders.find(s => s.id === selectedId) ?? stakeholders[0] ?? null;

  const effectiveId = selected?.id ?? "";

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Select Stakeholder
        </label>
        {isLoading ? (
          <div className="h-9 bg-muted rounded animate-pulse" />
        ) : (
          <select
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={effectiveId}
            onChange={e => setSelectedId(e.target.value)}
          >
            {stakeholders.map(s => (
              <option key={s.id} value={s.id}>
                {s.flag || "🏛️"} {s.name}
              </option>
            ))}
          </select>
        )}
      </Card>

      {selected && (
        <>
          <StakeholderOverview stakeholder={selected} />

          <div className="grid md:grid-cols-2 gap-4">
            <ForecastLensSection stakeholder={selected} />
            <DealLensSection stakeholderId={effectiveId} />
          </div>

          <ProposalEvalSection stakeholderId={effectiveId} />
          <CostLensSection stakeholderId={effectiveId} />
        </>
      )}

      {!selected && !isLoading && (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          No stakeholders loaded yet.
        </Card>
      )}

      <DataSourceNote
        compact
        title="Stakeholder Lens Methodology"
        methodology="This view aggregates data from multiple pipeline outputs — forecasts, deal evaluations, proposals, and economic cost data — filtered through the selected stakeholder's perspective. Outcome preferences are derived from the stakeholder's documented goals. Deal verdicts and red-line violations are generated by the multi-agent evaluation pipeline. Cost data comes from the CBA module (war-peace alternative states framework)."
        sources={[
          { label: "Forecast data", detail: "Multi-model Bayesian pipeline (Claude/Gemini/GPT-4o)" },
          { label: "Deal evaluations", detail: "8-stage deal engine with stakeholder-specific assessment" },
          { label: "Economic costs", detail: "IMF WEO 2024, World Bank, UNCTAD — modeled estimates" },
          { label: "Stakeholder profiles", detail: "ICG, IISS, Brookings, CSIS, official government positions" },
        ]}
        limitations={["Lens view synthesizes AI-generated outputs — it reflects model assessment, not ground truth. Cost data for non-core stakeholders (Iran/US/Israel) comes from the client-side CBA model."]}
      />
    </div>
  );
}

const VALID_TABS = ["gallery", "compare", "lens"] as const;

export default function Stakeholders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(tabParam as typeof VALID_TABS[number])
    ? (tabParam as string)
    : "gallery";

  const handleTabChange = (value: string) => {
    setSearchParams(value === "gallery" ? {} : { tab: value }, { replace: true });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Stakeholders"
        description="Explore all 33 actors modeled in the AutoPeace system — their profiles, positions on the current deal, and how the conflict looks from each perspective."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start border-b border-border/50 bg-transparent h-auto p-0 rounded-none">
          <TabsTrigger
            value="gallery"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2.5 text-sm"
          >
            <Users className="w-4 h-4 mr-2" />
            Gallery
          </TabsTrigger>
          <TabsTrigger
            value="compare"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2.5 text-sm"
          >
            <GitCompare className="w-4 h-4 mr-2" />
            Compare
          </TabsTrigger>
          <TabsTrigger
            value="lens"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2.5 text-sm"
          >
            <Eye className="w-4 h-4 mr-2" />
            Lens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="mt-6">
          <GalleryTab />
        </TabsContent>
        <TabsContent value="compare" className="mt-6">
          <CompareTab />
        </TabsContent>
        <TabsContent value="lens" className="mt-6">
          <LensTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
