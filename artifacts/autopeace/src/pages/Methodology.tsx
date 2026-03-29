import React from "react";
import { PageHeader, Card } from "@/components/ui";

export default function Methodology() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <PageHeader 
        title="Methodology" 
        description="The mathematical and structural underpinnings of the AutoPeace forecasting engine."
      />

      <div className="prose prose-invert prose-lg max-w-none text-muted-foreground">
        <Card className="p-8 mb-8">
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

        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0">Adversarial Agent Architecture</h2>
          <p>
            To combat LLM hallucination and confirmation bias, AutoPeace employs a multi-provider adversarial debate mechanism:
          </p>
          <ol>
            <li><strong>Forecaster (Anthropic Claude 3.5 Sonnet):</strong> Generates the initial probabilities and rationale based on raw evidence.</li>
            <li><strong>Red-Teamer (Google Gemini 2.5 Flash):</strong> Actively attempts to find flaws, historical inaccuracies, or logical leaps in the Forecaster's output.</li>
            <li><strong>Evaluator (OpenAI GPT-4o):</strong> Adjudicates the debate and produces the final, calibrated probabilities.</li>
          </ol>
        </Card>

        <Card className="p-8">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0">Self-Improving DSPy Loop</h2>
          <p>
            The system logs its forecasts against reality (using resolution criteria verified by human analysts or designated oracles). It scores its accuracy using the <strong>Brier Score</strong> and <strong>Logarithmic Score</strong>. 
          </p>
          <p>
            Periodically, the system mutates its own prompt instructions, backtests the new prompts against historical data, and if the Brier score improves, the mutation is retained. This ensures the engine grows sharper over time without human intervention.
          </p>
        </Card>
      </div>
    </div>
  );
}
