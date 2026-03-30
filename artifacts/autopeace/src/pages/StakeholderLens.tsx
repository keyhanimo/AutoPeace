import React, { useState, useMemo } from "react";
import {
  useListStakeholders,
  useGetProposalArena,
  useGetCostsByStakeholder,
  useGetCurrentDeal,
  useGetLatestForecasts,
  type Stakeholder,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, PageHeader, Badge } from "@/components/ui";
import {
  Eye, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, XCircle, Shield, DollarSign, BarChart2,
} from "lucide-react";
import { DataSourceNote } from "@/components/DataSourceNote";
function getBaseUrl() {
  return window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
}

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

function VerdictBadge({ verdict }: { verdict: string }) {
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

type WhatIfScenario = {
  id: string;
  name: string;
  description: string;
  triggerCondition: string;
  absoluteProbabilities: Record<string, number>;
  probabilityDeltas: Record<string, number>;
  proposalImpacts?: Array<{
    proposalId: string;
    proposalName: string;
    viabilityDelta: number;
    projectedComposite: number;
    favorabilityNote: string;
  }>;
};

function useScenarios() {
  return useQuery<{ data: WhatIfScenario[] }>({
    queryKey: ["scenarios"],
    queryFn: async () => {
      const res = await fetch(`${getBaseUrl()}/api/scenarios`);
      if (!res.ok) throw new Error("Failed to fetch scenarios");
      return res.json();
    },
    staleTime: 60_000,
  });
}

function StakeholderOverview({ stakeholder }: { stakeholder: Stakeholder }) {
  const icon = STAKEHOLDER_ICONS[stakeholder.id] ?? "🏛️";
  const toArr = (v: unknown): string[] => Array.isArray(v) ? v as string[] : [];
  const goals = toArr(stakeholder.goals);
  const redLines = toArr(stakeholder.redLines);
  const preferred = toArr(stakeholder.preferredOutcomes);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <h2 className="text-lg font-bold">{stakeholder.name}</h2>
          <Badge variant="outline" className="text-[10px]">{stakeholder.role}</Badge>
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
    humanitarian?: { displacedPersons?: number; civilianCasualties?: number };
    strategic?: { proliferationRiskLevel?: string };
  };

  const econTotal = cost.economic?.totalUsd ?? 0;
  const displaced = cost.humanitarian?.displacedPersons ?? 0;
  const casualties = cost.humanitarian?.civilianCasualties ?? 0;
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

function ForecastLensSection({
  stakeholder,
  scenarios,
}: {
  stakeholder: Stakeholder;
  scenarios: WhatIfScenario[];
}) {
  const { data: forecastsData, isLoading } = useGetLatestForecasts();
  const preferred = Array.isArray(stakeholder.preferredOutcomes) ? stakeholder.preferredOutcomes as string[] : [];

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

      {scenarios.length > 0 && preferred.length > 0 && (
        <div className="mt-4 border-t border-border/40 pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            How scenarios affect preferred outcomes
          </p>
          <div className="space-y-2">
            {scenarios.map(s => {
              const totalDelta = preferred.reduce(
                (sum, key) => sum + (s.probabilityDeltas[key] ?? 0),
                0,
              );
              const positive = totalDelta > 0.5;
              const negative = totalDelta < -0.5;
              return (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className={`font-semibold flex items-center gap-1 ${positive ? "text-green-600" : negative ? "text-red-600" : "text-muted-foreground"}`}>
                    {positive ? <TrendingUp className="w-3 h-3" /> : negative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {totalDelta > 0 ? "+" : ""}{totalDelta.toFixed(1)}pp
                  </span>
                </div>
              );
            })}
          </div>
        </div>
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

export default function StakeholderLens() {
  const { data: stakeholderList, isLoading } = useListStakeholders();
  const { data: scenariosData } = useScenarios();
  const [selectedId, setSelectedId] = useState<string>("");

  const stakeholders = ((stakeholderList as unknown as { data?: Stakeholder[] })?.data ?? []) as Stakeholder[];
  const scenarios = scenariosData?.data ?? [];

  const selected = stakeholders.find(s => s.id === selectedId) ?? stakeholders[0] ?? null;

  const effectiveId = selected?.id ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stakeholder Lens"
        description="Explore the conflict through a single stakeholder's perspective — their proposal evaluations, preferred forecast outcomes, cost profile, and deal positions."
      />

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
                {STAKEHOLDER_ICONS[s.id] ?? "🏛️"} {s.name}
              </option>
            ))}
          </select>
        )}
      </Card>

      {selected && (
        <>
          <StakeholderOverview stakeholder={selected} />

          <div className="grid md:grid-cols-2 gap-4">
            <ForecastLensSection stakeholder={selected} scenarios={scenarios} />
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
