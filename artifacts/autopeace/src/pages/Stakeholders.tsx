import React, { useState } from "react";
import { useListStakeholders, type Stakeholder } from "@workspace/api-client-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { Users, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Shield, Globe, Info, Clock } from "lucide-react";
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

export default function Stakeholders() {
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
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Stakeholder Gallery"
        description="Exact definitions, goals, red lines, and constraints for every actor modeled in the AutoPeace system."
      >
        <Badge variant="outline" className="border-primary/30 text-primary">
          {allStakeholders.length} actors
        </Badge>
      </PageHeader>

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
