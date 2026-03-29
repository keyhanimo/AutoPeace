import React from "react";
import { useListStakeholders } from "@workspace/api-client-react";
import { PageHeader, Card, Badge } from "@/components/ui";
import { Users } from "lucide-react";

export default function Methodology() {
  const { data: stakeholderRes, isLoading: stakeholdersLoading } = useListStakeholders();
  const stakeholders = stakeholderRes?.data || [];

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-12">
      <PageHeader
        title="Methodology"
        description="The mathematical and structural underpinnings of the AutoPeace forecasting engine."
      />

      <div className="prose prose-invert prose-lg max-w-none text-muted-foreground space-y-6">
        <Card className="p-8">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0">The Bayesian Forecasting Approach</h2>
          <p>
            AutoPeace uses a dynamic, multi-agent LLM pipeline to continuously update probability distributions across eight distinct outcome scenarios. Rather than relying on static point-in-time analysis, the system ingests daily evidence (from ACLED, GDELT, and RSS feeds) and forces its agents to justify probability shifts.
          </p>
          <p>
            We utilize a rigid taxonomy of 8 mutually exclusive and collectively exhaustive (MECE) states:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm not-prose list-none p-0">
            <li className="bg-card p-3 rounded-lg border border-border"><span className="text-red-500 font-bold">1. Continued Conflict:</span> Status quo friction without major escalation.</li>
            <li className="bg-card p-3 rounded-lg border border-border"><span className="text-amber-500 font-bold">2. Informal De-escalation:</span> Unspoken throttling of hostilities.</li>
            <li className="bg-card p-3 rounded-lg border border-border"><span className="text-amber-300 font-bold">3. Limited Ceasefire:</span> Temporary, tactical pause in kinetic action.</li>
            <li className="bg-card p-3 rounded-lg border border-border"><span className="text-emerald-400 font-bold">4. Humanitarian Mini-Deal:</span> Narrow agreements on hostage or aid access.</li>
            <li className="bg-card p-3 rounded-lg border border-border"><span className="text-emerald-500 font-bold">5. Sanctions Partial Deal:</span> Economic relief in exchange for specific concessions.</li>
            <li className="bg-card p-3 rounded-lg border border-border"><span className="text-emerald-600 font-bold">6. Regional Framework:</span> Broad multi-lateral security architecture.</li>
            <li className="bg-card p-3 rounded-lg border border-border"><span className="text-sky-500 font-bold">7. Broad Settlement:</span> Comprehensive, enduring peace treaty.</li>
            <li className="bg-card p-3 rounded-lg border border-border"><span className="text-red-800 font-bold">8. Major Escalation:</span> Severe expansion of kinetic theater.</li>
          </ul>
        </Card>

        <Card className="p-8">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0">Adversarial Agent Architecture</h2>
          <p>
            To combat LLM hallucination and confirmation bias, AutoPeace employs a multi-provider adversarial debate mechanism:
          </p>
          <ol>
            <li><strong>Forecaster (Anthropic Claude Sonnet):</strong> Generates the initial probabilities and rationale based on raw evidence.</li>
            <li><strong>Red-Teamer (Google Gemini 2.5 Flash):</strong> Actively attempts to find flaws, historical inaccuracies, or logical leaps in the Forecaster's output.</li>
            <li><strong>Evaluator (OpenAI GPT-4o):</strong> Adjudicates the debate and produces the final, calibrated probabilities.</li>
          </ol>
        </Card>

        <Card className="p-8">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0">Hill-Climbing Self-Improvement Loop</h2>
          <p>
            Each research cycle runs 3 adversarial mutations (optimistic peace analyst, hawkish strategic analyst, base-rate superforecaster).
            Each mutation is scored against a composite of Brier score and log score computed across 30d/90d/180d backtest windows.
            The GPT-4o evaluator adjudicates whether the challenger improves on the champion. If yes, the challenger becomes the new champion — true hill-climbing over prompt space.
          </p>
          <p>
            Forecast probabilities and Brier/log scores are persisted per cycle, enabling calibration trend tracking over time as the model improves.
          </p>
        </Card>

        <Card className="p-8">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <Users className="w-7 h-7" /> Stakeholder Universe
          </h2>
          <p className="mb-6">
            The cost-of-war model tracks {stakeholders.length > 0 ? stakeholders.length : '28'} stakeholders across multiple regional and global categories:
          </p>

          {stakeholdersLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {stakeholders.map(s => (
                <div key={s.id} className="bg-card border border-border rounded-xl p-3 flex flex-col items-center text-center gap-1 hover:border-primary/50 transition-colors">
                  <span className="text-2xl">{s.flag || '🌍'}</span>
                  <span className="text-xs font-semibold text-foreground truncate w-full">{s.name}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 leading-4 capitalize truncate max-w-full">
                    {s.role.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{s.region}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
