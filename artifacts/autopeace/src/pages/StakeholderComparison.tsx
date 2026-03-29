import React, { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useListStakeholders, useGetCurrentDeal, type Stakeholder } from "@workspace/api-client-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { CheckCircle2, XCircle, AlertTriangle, Users, Share2 } from "lucide-react";

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

type DomesticEval = { audience: string; verdict: string; rationale: string };
type StakeholderEval = { verdict: string; rationale: string; conditions?: string[]; redLineViolations?: string[] };

function VerdictBadge({ verdict }: { verdict: string | undefined }) {
  if (!verdict) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium capitalize ${VERDICT_COLORS[verdict] ?? "text-foreground"}`}>
      {VERDICT_ICONS[verdict]}
      {verdict}
    </span>
  );
}

function getStakeholderVerdict(stakeholderId: string, evals: Record<string, StakeholderEval> | null): StakeholderEval | null {
  if (!evals) return null;
  const key = Object.keys(evals).find(k =>
    k.toLowerCase().replace(/-/g, "_") === stakeholderId.toLowerCase().replace(/-/g, "_") ||
    k.toLowerCase().includes(stakeholderId.toLowerCase().slice(0, 5))
  );
  return key ? (evals[key] ?? null) : null;
}

function getDomesticVerdicts(stakeholderId: string, domestic: Record<string, DomesticEval> | null): DomesticEval[] {
  if (!domestic) return [];
  return Object.values(domestic).filter(d =>
    d.audience?.toLowerCase().includes(stakeholderId.toLowerCase().slice(0, 3))
  );
}

export default function StakeholderComparison() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialSelected = (searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 4);

  const [selected, setSelected] = useState<string[]>(initialSelected);

  const { data: stakeholdersData, isLoading: stakeholdersLoading } = useListStakeholders();
  const { data: currentDeal } = useGetCurrentDeal();

  const stakeholders = stakeholdersData?.data ?? [];
  const stakeholderEvals = (currentDeal?.stakeholderEvaluations ?? null) as Record<string, StakeholderEval> | null;
  const domesticEvals = (currentDeal?.domesticEvaluations ?? null) as Record<string, DomesticEval> | null;
  const costs = (currentDeal as Record<string, unknown> | undefined | null);
  void costs;

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
      setSearchParams(next.length ? { ids: next.join(",") } : {});
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
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Stakeholder Comparison"
        description="Select up to 4 stakeholders to compare their positions, deal acceptance status, and costs side by side."
      >
        <Badge variant="outline" className="border-primary/40 text-primary">
          <Users className="w-3 h-3 mr-1" /> {selected.length}/4 selected
        </Badge>
      </PageHeader>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">Select Stakeholders</h3>
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
                      <p className="text-[10px] text-muted-foreground capitalize">{s.role}</p>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Deal Verdict</div>
                    {verdict ? (
                      <>
                        <VerdictBadge verdict={verdict.verdict} />
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed line-clamp-3">{verdict.rationale}</p>
                        {verdict.conditions && verdict.conditions.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {verdict.conditions.slice(0, 2).map((c, i) => (
                              <p key={i} className="text-[10px] text-amber-400/80">• {c}</p>
                            ))}
                          </div>
                        )}
                        {verdict.redLineViolations && verdict.redLineViolations.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {verdict.redLineViolations.slice(0, 2).map((r, i) => (
                              <p key={i} className="text-[10px] text-red-400/80">✗ {r}</p>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">No deal generated yet</p>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Goals</div>
                    <p className="text-[10px] text-foreground leading-relaxed line-clamp-3">
                      {s.goals || <span className="text-muted-foreground">—</span>}
                    </p>
                  </div>

                  {s.redLines && (
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Red Lines</div>
                      <p className="text-[10px] text-red-400/80 leading-relaxed line-clamp-2">{s.redLines}</p>
                    </div>
                  )}

                  {domestic.length > 0 && (
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Domestic Sellability</div>
                      {domestic.map((d, i) => (
                        <div key={i} className="flex items-center gap-1 mt-0.5">
                          <VerdictBadge verdict={d.verdict === "sellable" ? "accept" : d.verdict === "unsellable" ? "reject" : "conditional"} />
                          <span className="text-[10px] text-muted-foreground">{d.audience}</span>
                        </div>
                      ))}
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
                          <VerdictBadge verdict={v?.verdict} />
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
                  <tr>
                    <td className="py-2 pr-4 text-muted-foreground">Red lines</td>
                    {selectedStakeholders.map(s => (
                      <td key={s.id} className="text-center py-2 px-2">{s.redLines ? "Yes" : "—"}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
