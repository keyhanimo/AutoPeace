import React, { useState, useEffect } from "react";
import { PageHeader, Card } from "@/components/ui";
import { AlertTriangle, ExternalLink, ArrowRight, GitBranch, BarChart3, Shield, Scale, Brain, Zap, Target, Layers, RefreshCw, Users } from "lucide-react";

function getBaseUrl() {
  return window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
}

type PipelineStage = { stage: number; provider: string; model: string };
type AdminCfg = Record<string, string>;

function ModelTag({ value }: { value: string }) {
  return (
    <span className="not-italic font-mono text-[9px] px-1.5 py-0.5 rounded border border-primary/30 bg-primary/5 text-primary/80 ml-1 align-middle whitespace-nowrap">
      currently: {value}
    </span>
  );
}

export default function Methodology() {
  const [stages, setStages] = useState<Record<number, PipelineStage>>({});
  const [cfg, setCfg] = useState<AdminCfg>({});

  useEffect(() => {
    const base = getBaseUrl();
    fetch(`${base}/api/admin/pipeline/config`)
      .then(r => r.json())
      .then((data: { stages: PipelineStage[] }) => {
        const map: Record<number, PipelineStage> = {};
        for (const s of data.stages ?? []) map[s.stage] = s;
        setStages(map);
      })
      .catch(() => {});
    fetch(`${base}/api/admin/config`)
      .then(r => r.json())
      .then((data: AdminCfg) => setCfg(data))
      .catch(() => {});
  }, []);

  const stm = (stageNum: number | null, role: "generation" | "evaluation" | "adversarial" | "forecasting" | "extraction"): string => {
    if (stageNum !== null && stages[stageNum]) {
      const s = stages[stageNum]!;
      return `${s.provider} / ${s.model}`;
    }
    const p = cfg[`${role}Provider`];
    const m = cfg[`${role}Model`];
    if (p && m) return `${p} / ${m}`;
    return "loading…";
  };

  const judgeLabel = (() => {
    const a = cfg.judgePanelAnthropicModel || cfg.anthropicModel || "…";
    const o = cfg.judgePanelOpenaiModel || cfg.openaiModel || "…";
    const g = cfg.judgePanelGeminiModel || cfg.geminiModel || "…";
    if (a === "…" && o === "…" && g === "…") return "loading…";
    return `anthropic / ${a} · openai / ${o} · gemini / ${g}`;
  })();

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-12">
      <PageHeader
        title="Methodology"
        description="A comprehensive technical description of AutoPeace — a triple-loop autoresearch system for Bayesian conflict forecasting, autonomous peace deal optimization, and crowdsourced proposal evaluation."
      />

      <nav className="not-prose">
        <Card className="p-6">
          <h2 className="text-lg font-bold font-display text-foreground mb-4">Table of Contents</h2>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground list-decimal list-inside">
            <li><a href="#abstract" className="hover:text-primary transition-colors">Abstract &amp; Motivation</a></li>
            <li><a href="#karpathy" className="hover:text-primary transition-colors">Relationship to Karpathy's Autoresearch</a></li>
            <li><a href="#system-architecture" className="hover:text-primary transition-colors">System Architecture Overview</a></li>
            <li><a href="#evidence-ingestion" className="hover:text-primary transition-colors">Evidence Ingestion Pipeline</a></li>
            <li><a href="#task-a" className="hover:text-primary transition-colors">Task A: Bayesian Conflict Forecasting</a></li>
            <li><a href="#hill-climbing" className="hover:text-primary transition-colors">Hill-Climbing Self-Improvement Loop</a></li>
            <li><a href="#task-b" className="hover:text-primary transition-colors">Task B: Autonomous Deal Optimization</a></li>
            <li><a href="#task-c" className="hover:text-primary transition-colors">Task C: Crowdsourced Proposal Evaluation</a></li>
            <li><a href="#cba" className="hover:text-primary transition-colors">Cost-Benefit Analysis Modeling</a></li>
            <li><a href="#scoring" className="hover:text-primary transition-colors">Scoring &amp; Evaluation Framework</a></li>
            <li><a href="#pareto" className="hover:text-primary transition-colors">Pareto Frontier &amp; Solution Tree</a></li>
            <li><a href="#what-if" className="hover:text-primary transition-colors">What-If Scenario Analysis</a></li>
            <li><a href="#limitations" className="hover:text-primary transition-colors">Limitations &amp; Disclaimer</a></li>
          </ol>
        </Card>
      </nav>

      <div className="prose prose-invert prose-lg max-w-none text-muted-foreground space-y-8">

        <Card className="p-8" id="abstract">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <Brain className="w-6 h-6 text-primary" /> 1. Abstract &amp; Motivation
          </h2>
          <p>
            AutoPeace is a triple-objective autoresearch system that performs three complementary tasks:
          </p>
          <ul>
            <li><strong>Task A — Bayesian Conflict Forecasting:</strong> Continuously updating probability distributions across eight mutually exclusive conflict outcome states for the Iran-US-Israel conflict complex, using multi-agent LLM debate and hill-climbing calibration optimization.</li>
            <li><strong>Task B — Autonomous Peace Deal Optimization:</strong> Generating, evaluating, and iteratively refining AI-originated peace deal proposals through a multi-stage pipeline (Stages 0–8 including sub-stages) that includes creative brainstorming from historical precedents, stakeholder modeling, adversarial red-teaming, domestic political analysis, creative reframing of perceived concessions, Pareto-optimal negotiation search, multi-model judicial scoring, and self-improving prompt evolution.</li>
            <li><strong>Task C — Crowdsourced Proposal Evaluation:</strong> Accepting peace proposals from external sources — both community submissions and real-world proposals automatically extracted from news evidence — and subjecting them to the same rigorous 8-stage multi-agent evaluation pipeline used for AI-generated deals, enabling direct comparison across human and machine-originated proposals on identical scoring dimensions.</li>
          </ul>
          <p>
            The system treats forecasting accuracy, AI-generated deal quality, and crowdsourced proposal evaluation as complementary optimization targets. Task A provides the probabilistic context that informs Task B. Task B's deal evaluations feed diagnostic signals back into subsequent cycles. Task C brings external proposals into the same evaluation framework, enabling the system to benchmark its own AI-generated deals against real-world diplomatic proposals and community ideas. The core insight is that conflict forecasting alone is insufficient — actionable peace proposals require a separate optimization loop grounded in cost-benefit analysis, stakeholder game theory, and adversarial stress testing, combined with an open channel for human-originated proposals to be evaluated on equal footing.
          </p>
        </Card>

        <Card className="p-8" id="karpathy">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <GitBranch className="w-6 h-6 text-primary" /> 2. Relationship to Karpathy's Autoresearch
          </h2>
          <p>
            AutoPeace extends the paradigm articulated in Andrej Karpathy's autoresearch project — the idea that LLMs can be orchestrated to perform successive refinement of research artifacts within an automated loop, where the system "grades its own homework" using adversarial evaluation and measurable scoring functions. AutoPeace builds on this foundation in several specific ways:
          </p>
          <div className="space-y-4 not-prose text-sm">
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Successive Refinement over State</h4>
              <p className="text-muted-foreground">AutoPeace treats outputs as <em>state to be iteratively refined</em> across cycles, though the refinement mechanism differs by task. In Task A (forecasting), the system persists a "champion" probability distribution and applies adversarial mutations to it each cycle, promoting improvements — true hill-climbing over the probability vector. In Task B (deal optimization), the system generates a fresh proposal each cycle informed by the previous deal's failure diagnosis and current evidence, then compares its composite score to the current best deal, retaining whichever scores higher. Both loops embody the autoresearch principle: LLM output is not the final product — it is the starting point for automated improvement.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">LLM-as-Judge with Generation/Evaluation Independence</h4>
              <p className="text-muted-foreground">In the deal optimization pipeline (Task B), AutoPeace enforces a strict architectural constraint: the model that <em>generates</em> a deal proposal must never be the same model that <em>evaluates</em> it. This is enforced at the code level — the system throws an error if <code>generationProvider</code> and <code>evaluationProvider</code> are the same LLM provider. In Task A, independence is achieved structurally: base forecasts are generated by the forecasting model <ModelTag value={stm(null, "forecasting")} />, mutations by the adversarial model <ModelTag value={stm(null, "adversarial")} />, and the arbiter is the evaluation model <ModelTag value={stm(null, "evaluation")} /> — separate providers at each stage by design, though not enforced by a runtime validation check.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Adversarial Multi-Provider Debate</h4>
              <p className="text-muted-foreground">Where Karpathy's autoresearch uses a single model with self-critique, AutoPeace distributes adversarial roles across three independent LLM providers (Anthropic Claude, OpenAI GPT-4o, Google Gemini). The Proposal Agent (Anthropic) generates, the Red-Team Agent (Gemini) attacks, and the Judge Panel (all three providers) scores independently. This cross-provider architecture ensures no single model's biases dominate.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Measurable Scoring Functions</h4>
              <p className="text-muted-foreground">AutoPeace defines concrete, computable scoring functions for both tasks. Task A uses Brier scores and log scores against historical backtest records. Task B uses a 7-dimension weighted composite score (feasibility, coherence, evidence grounding, domestic sellability, regional stability, implementability, durability). These replace subjective quality judgments with quantitative optimization targets.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Self-Diagnosis, Feedback, and Prompt Evolution</h4>
              <p className="text-muted-foreground">Each deal cycle produces a Diagnosis (Stage 8) explaining <em>why</em> a deal failed or underperformed. This diagnosis is injected as input to the <em>next</em> cycle's Proposal Agent, creating a closed feedback loop. Additionally, the Meta-Evaluator (Stage 7) suggests prompt improvements for the pipeline itself — specific modifications to how each stage reasons — which are adopted through a score-gated hill-climbing mechanism. The system doesn't just improve its deals; it improves the <em>process by which it generates and evaluates deals</em>.</p>
            </div>
          </div>
        </Card>

        <Card className="p-8" id="system-architecture">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <Layers className="w-6 h-6 text-primary" /> 3. System Architecture Overview
          </h2>
          <p>
            The autoresearch loop runs on a configurable schedule (hourly, daily, weekly, or manual trigger). Each cycle executes the following stages sequentially:
          </p>
          <ol className="space-y-2 text-sm not-prose">
            <li className="bg-card p-3 border border-border flex items-start gap-3">
              <span className="bg-primary/20 text-primary font-mono text-xs px-2 py-1 shrink-0">Step 1</span>
              <div><strong className="text-foreground">Evidence Ingestion</strong> — Ingest from RSS feeds, ACLED, and GDELT; filter for Iran-relevance; classify by type (military, diplomatic, economic, humanitarian, political).</div>
            </li>
            <li className="bg-card p-3 border border-border flex items-start gap-3">
              <span className="bg-primary/20 text-primary font-mono text-xs px-2 py-1 shrink-0">Step 2</span>
              <div><strong className="text-foreground">Proposal Extraction</strong> — Scan ingested evidence for real-world peace proposals mentioned in news; extract structured deal terms and run them through the full evaluation pipeline.</div>
            </li>
            <li className="bg-card p-3 border border-border flex items-start gap-3">
              <span className="bg-primary/20 text-primary font-mono text-xs px-2 py-1 shrink-0">Step 3</span>
              <div><strong className="text-foreground">Base Forecasting (Task A)</strong> — Generate probability distributions across 4 time horizons (30d, 90d, 180d, 1y) for 8 outcome states using the forecasting model <ModelTag value={stm(null, "forecasting")} />.</div>
            </li>
            <li className="bg-card p-3 border border-border flex items-start gap-3">
              <span className="bg-primary/20 text-primary font-mono text-xs px-2 py-1 shrink-0">Step 4</span>
              <div><strong className="text-foreground">Hill-Climbing (Task A)</strong> — Apply 3 adversarial mutations to the 90-day forecast, score against backtest records, and promote improvements to champion state.</div>
            </li>
            <li className="bg-card p-3 border border-border flex items-start gap-3">
              <span className="bg-primary/20 text-primary font-mono text-xs px-2 py-1 shrink-0">Step 5</span>
              <div><strong className="text-foreground">What-If Scenarios</strong> — Compute counterfactual forecast variants for predefined geopolitical scenarios (sanctions lifted, military strikes, Hormuz closure, US withdrawal).</div>
            </li>
            <li className="bg-card p-3 border border-border flex items-start gap-3">
              <span className="bg-primary/20 text-primary font-mono text-xs px-2 py-1 shrink-0">Step 6</span>
              <div><strong className="text-foreground">Deal Optimization Trigger (Task B)</strong> — Trigger the 8-stage deal evaluation pipeline asynchronously. Task B runs as a separate async process that generates, tests, and scores a new peace deal proposal using the latest evidence and previous cycle's diagnosis. It manages its own persistence, Pareto frontier updates, and solution tree recording upon completion.</div>
            </li>
            <li className="bg-card p-3 border border-border flex items-start gap-3">
              <span className="bg-primary/20 text-primary font-mono text-xs px-2 py-1 shrink-0">Step 7</span>
              <div><strong className="text-foreground">Task A Persistence</strong> — Store forecast results, experiment outcomes, and champion state in the database. Generate a changelog entry summarizing the cycle's key findings.</div>
            </li>
          </ol>
          <p className="text-sm mt-4">
            Budget controls prevent runaway costs: each cycle checks cumulative spend against a configurable USD cap before proceeding. The scheduler also respects admin pause flags.
          </p>
        </Card>

        <Card className="p-8" id="evidence-ingestion">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <Zap className="w-6 h-6 text-primary" /> 4. Evidence Ingestion Pipeline
          </h2>
          <p>
            The system ingests structured and unstructured data from three primary sources:
          </p>
          <div className="space-y-3 not-prose text-sm">
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">RSS Feeds</h4>
              <p className="text-muted-foreground">Configurable set of news feeds (Al Jazeera, Reuters, AP News, BBC, etc.) parsed via the <code>rss-parser</code> library. Each item is keyword-filtered against a curated set of Iran-relevant terms (including: iran, tehran, nuclear, iaea, sanctions, irgc, hezbollah, hamas, houthi, strait of hormuz, jcpoa, enrichment, centrifuge, etc.).</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">ACLED (Armed Conflict Location &amp; Event Data)</h4>
              <p className="text-muted-foreground">Conflict event data covering battles, explosions, protests, and strategic developments. Events are filtered to the Iran-Israel-Gulf region and classified by event type.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">GDELT (Global Database of Events, Language, and Tone)</h4>
              <p className="text-muted-foreground">High-frequency event data providing sentiment analysis and conflict intensity indicators. Filtered by Iran-related actor codes and themes.</p>
            </div>
          </div>
          <p className="mt-4">
            All evidence is deduplicated using stable SHA-256 hashes derived from source, URL, and publication timestamp. Each item is automatically classified into one of five evidence types: <strong>military</strong>, <strong>diplomatic</strong>, <strong>economic</strong>, <strong>humanitarian</strong>, or <strong>political</strong>. Evidence items are linked to the cycle and forecast they influenced, enabling full provenance tracking from raw data to probability output.
          </p>
        </Card>

        <Card className="p-8" id="task-a">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-primary" /> 5. Task A: Bayesian Conflict Forecasting
          </h2>
          <p>
            The forecasting model produces probability distributions over eight mutually exclusive and collectively exhaustive (MECE) conflict outcome states across four time horizons. This is the system's "Task A" — the probabilistic assessment of where the conflict is heading.
          </p>
          <h3 className="text-xl font-bold font-display text-foreground mt-6">5.1 Outcome Taxonomy</h3>
          <p>The system uses a rigid taxonomy of 8 MECE states. Probabilities across all states must sum to 1.0 and are automatically normalized if they don't:</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm not-prose list-none p-0">
            <li className="bg-card p-3 border border-border border-l-2 border-l-red-500"><span className="text-red-500 font-bold">1. Continued Conflict:</span> Status quo friction without major escalation.</li>
            <li className="bg-card p-3 border border-border border-l-2 border-l-amber-500"><span className="text-amber-500 font-bold">2. Informal De-escalation:</span> Unspoken throttling of hostilities.</li>
            <li className="bg-card p-3 border border-border border-l-2 border-l-amber-300"><span className="text-amber-300 font-bold">3. Limited Ceasefire:</span> Temporary, tactical pause in kinetic action.</li>
            <li className="bg-card p-3 border border-border border-l-2 border-l-emerald-400"><span className="text-emerald-400 font-bold">4. Humanitarian Mini-Deal:</span> Narrow agreements on hostage or aid access.</li>
            <li className="bg-card p-3 border border-border border-l-2 border-l-emerald-500"><span className="text-emerald-500 font-bold">5. Sanctions Partial Deal:</span> Economic relief in exchange for specific concessions.</li>
            <li className="bg-card p-3 border border-border border-l-2 border-l-emerald-600"><span className="text-emerald-600 font-bold">6. Regional Framework:</span> Broad multi-lateral security architecture.</li>
            <li className="bg-card p-3 border border-border border-l-2 border-l-sky-500"><span className="text-sky-500 font-bold">7. Broad Settlement:</span> Comprehensive, enduring peace treaty.</li>
            <li className="bg-card p-3 border border-border border-l-2 border-l-red-800"><span className="text-red-800 font-bold">8. Major Escalation:</span> Severe expansion of kinetic theater.</li>
          </ul>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">5.2 Time Horizons</h3>
          <p>
            Forecasts are generated independently for four time horizons: <strong>30 days</strong>, <strong>90 days</strong>, <strong>180 days</strong>, and <strong>1 year</strong>. Each horizon receives its own prompt with identical evidence but horizon-specific framing. The 90-day horizon serves as the primary optimization target for the hill-climbing loop.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">5.3 Forecasting Model</h3>
          <p>
            Base forecasts are generated by the configured forecasting model <ModelTag value={stm(null, "forecasting")} />, prompted as a "Bayesian conflict forecasting model specializing in the Iran-US-Israel conflict complex." (The model assignment can be changed by the admin at any time.) The model receives:
          </p>
          <ul>
            <li>The 30 most recent evidence items (with source, title, evidence type, publication date, and up to 300 characters of text per item)</li>
            <li>The 8-state outcome taxonomy with instructions to produce a valid probability distribution summing to 1.0</li>
            <li>A requirement to provide rationale and cite key evidence items for each forecast</li>
          </ul>
          <p>
            All four time-horizon forecasts are processed in parallel with a concurrency limit of 2 and up to 2 retries per horizon. Raw LLM probability outputs are normalized to ensure they sum to exactly 1.0, with any missing states receiving zero probability before normalization.
          </p>
        </Card>

        <Card className="p-8" id="hill-climbing">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <RefreshCw className="w-6 h-6 text-primary" /> 6. Hill-Climbing Self-Improvement Loop
          </h2>
          <p>
            This is the core autoresearch mechanism for Task A. After base forecasts are generated, the system loads the persisted "champion" state (the best-performing 90-day distribution from any prior cycle) and attempts to improve it through adversarial mutation experiments.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">6.1 What Is Being Iterated On</h3>
          <p>
            The iteration target is the <strong>90-day probability distribution</strong> — the 8-dimensional vector of outcome probabilities. The champion state persists across cycles in the admin configuration store. Each cycle loads the previous champion (or uses the current base forecast if no champion exists), applies mutations, and promotes any improvement.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">6.2 Mutation Experiments (Experimentation Parameters)</h3>
          <p>
            Each cycle runs exactly <strong>3 adversarial mutation experiments</strong>, each representing a different analytical perspective:
          </p>
          <div className="space-y-3 not-prose text-sm">
            <div className="bg-card p-4 border border-border border-l-2 border-l-emerald-500">
              <h4 className="font-bold text-foreground mb-1">1. Red-Team Optimistic (Task A)</h4>
              <p className="text-muted-foreground">An "optimistic peace analyst" challenges bearish forecasts by arguing for higher probability of peace outcomes using recent diplomatic signals. Currently generated by <ModelTag value={stm(null, "adversarial")} />. Targets under-weighting of diplomatic progress.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-red-500">
              <h4 className="font-bold text-foreground mb-1">2. Red-Team Pessimistic (Task B)</h4>
              <p className="text-muted-foreground">A "hawkish strategic analyst" challenges optimistic forecasts by arguing for higher conflict risk using regional threat assessments and historical conflict patterns. Currently generated by <ModelTag value={stm(null, "adversarial")} />. Targets naive optimism bias.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-sky-500">
              <h4 className="font-bold text-foreground mb-1">3. Red-Team Base-Rate (Task A+B)</h4>
              <p className="text-muted-foreground">A "superforecaster" applies historical conflict resolution base rates and regression-to-mean adjustments. Currently generated by <ModelTag value={stm(null, "adversarial")} />. Targets anchoring bias and recency bias by forcing reversion toward base rates.</p>
            </div>
          </div>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">6.3 Evaluation Parameters (Scoring)</h3>
          <p>Each mutation's output (a new 8-dimensional probability vector) is evaluated against the champion using two complementary scoring metrics:</p>
          <div className="space-y-3 not-prose text-sm">
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Brier Score</h4>
              <p className="text-muted-foreground">The mean squared error between predicted probabilities and actual binary outcomes across all 8 states. Computed as: <code>Σ(pᵢ − oᵢ)² / N</code> where <code>pᵢ</code> is the predicted probability, <code>oᵢ</code> is the outcome indicator (1 if resolved, 0 otherwise), and N = 8. Lower is better. Rewards calibration — a well-calibrated forecaster assigns probabilities that match observed frequencies.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Log Score</h4>
              <p className="text-muted-foreground">The natural logarithm of the probability assigned to the resolved outcome: <code>ln(p_resolved)</code>. Severely penalizes confident wrong predictions — assigning 1% probability to something that happens yields a log score of −4.6, while assigning 50% yields only −0.69. Higher (less negative) is better.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Composite Score</h4>
              <p className="text-muted-foreground">The optimization target combining both metrics: <code>Composite = Brier − (Log × 0.1)</code>. Lower is better. The 0.1 weighting on the log score ensures that calibration (Brier) dominates but extreme misses (log) are still penalized.</p>
            </div>
          </div>
          <p className="mt-4">
            Backtesting uses historical forecasts from a seed cycle (<code>seed-historical-2024</code>) with known resolved outcomes. If no backtest records are available, the system falls back to scoring against "continued_conflict" as the resolved outcome.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">6.4 Champion Selection</h3>
          <p>
            After computing composite scores for both champion and challenger, the evaluation model <ModelTag value={stm(null, "evaluation")} /> is called as the final arbiter. It receives both score sets and both probability distributions and returns a JSON verdict: <code>retain_challenger</code> or <code>retain_champion</code> with reasoning. If the model's response cannot be parsed, the system falls back to a pure numerical comparison. If the challenger wins, it replaces the champion and its rationale is appended with a note identifying which mutation was applied. The updated champion state is persisted to the admin configuration store for use in subsequent cycles.
          </p>
        </Card>

        <Card className="p-8" id="task-b">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <Target className="w-6 h-6 text-primary" /> 7. Task B: Autonomous Deal Optimization
          </h2>
          <p>
            Task B is a separate autoresearch loop triggered asynchronously after each forecasting cycle completes. Unlike Task A's champion mutation approach, Task B generates a <strong>fresh proposal</strong> each cycle — informed by the latest evidence and the previous deal's failure diagnosis — then evaluates it through a <strong>multi-stage pipeline</strong> (Stage 0 through Stage 8, including sub-stages) where different LLM providers are deliberately assigned to different stages to ensure adversarial independence. The pipeline is designed to maximize AI creativity by simultaneously processing many stakeholder preferences, drawing on historical peace deal precedents, finding creative cross-issue linkages, and inventing novel deal mechanisms. If the new deal scores higher than the current best, it replaces it. The pipeline's own prompts evolve over time via a score-gated hill-climbing mechanism.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">7.1 Deal Architecture Selection</h3>
          <p>
            Each cycle selects one of four deal architectures, which determine the primary sequencing and emphasis of the generated proposal:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm not-prose list-none p-0">
            <li className="bg-card p-3 border border-border"><strong className="text-foreground">Balanced:</strong> Equal priority across nuclear, sanctions, and maritime dimensions.</li>
            <li className="bg-card p-3 border border-border"><strong className="text-foreground">Nuclear-First:</strong> Comprehensive nuclear rollback as the prerequisite for any relief.</li>
            <li className="bg-card p-3 border border-border"><strong className="text-foreground">Hormuz-First:</strong> Maritime security framework as the foundation enabling economic normalization.</li>
            <li className="bg-card p-3 border border-border"><strong className="text-foreground">Humanitarian-First:</strong> Immediate humanitarian corridor as the trust-building prerequisite.</li>
          </ul>
          <p className="mt-4">
            The system tracks a "stall counter" per architecture within the current branch of the solution tree — if 3 stalled child nodes accumulate for the same architecture under the current parent node, the system automatically branches to the next architecture. This prevents the optimization loop from getting stuck in local optima within a particular solution branch.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">7.2 The Multi-Stage Pipeline</h3>
          <p>
            Each deal passes through the following stages. The default provider assignments enforce generation/evaluation independence:
          </p>
          <div className="space-y-3 not-prose text-sm">
            <div className="bg-card p-4 border border-border border-l-2 border-l-emerald-500">
              <h4 className="font-bold text-foreground mb-1">Stage 0: Innovation Brainstorm <span className="text-xs text-muted-foreground ml-2">(currently: {stm(null, "generation")} — generation role)</span></h4>
              <p className="text-muted-foreground">Before formal proposal generation, the system conducts an extended creative brainstorm designed to unlock "superhuman" deal design. This stage mines historical peace deal analogies (Camp David, Good Friday Agreement, JCPOA, etc.) for applicable lessons, generates creative provisions that go beyond standard diplomatic categories, discovers cross-issue linkages where one stakeholder's concession can satisfy another's demand, and explores unconventional approaches like phased sovereignty transitions, digital verification systems, or economic co-dependency mechanisms. The brainstorm output is stored as <code>brainstormInsights</code> and injected into Stage 1 as additional creative context.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-violet-500">
              <h4 className="font-bold text-foreground mb-1">Stage 1: Proposal Agent <span className="text-xs text-muted-foreground ml-2">(currently: {stm(1, "generation")} — generation role)</span></h4>
              <p className="text-muted-foreground">Designs initial deal terms across 7 standard dimensions plus an <strong>innovativeProvisions</strong> field containing novel mechanisms that go beyond traditional categories. The agent receives the Stage 0 brainstorm insights, the latest evidence summary (expanded to 30 items with 150-character context each), the previous cycle's failure diagnosis, the selected architecture focus, hard CBA economic data (see Section 8), and any evolved pipeline overrides. It is explicitly instructed to create provisions that simultaneously satisfy multiple stakeholders through creative linkages, drawing on the brainstorm's historical analogies and cross-issue discoveries.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-blue-500">
              <h4 className="font-bold text-foreground mb-1">Stage 2: Stakeholder Evaluator <span className="text-xs text-muted-foreground ml-2">(currently: {stm(2, "evaluation")} — evaluation role)</span></h4>
              <p className="text-muted-foreground">Assesses how each of <strong>23 stakeholders across 4 acceptance tiers</strong> would respond to the proposed deal. <strong>Required tier</strong> (Iran, US) — both must accept for the deal to be implementable; rejection caps the feasibility score at 0.15. <strong>Critical tier</strong> (Israel) — rejection caps feasibility at 0.35. <strong>Influential tier</strong> (Saudi Arabia, IAEA, Russia, China, EU3) — affects deal durability and regional stability scores. <strong>Contextual tier</strong> (UAE, Qatar, Oman, Turkey, Iraq, Egypt, India, Japan, South Korea, Jordan, Pakistan, Ukraine, Global North Bloc, Global South Energy Importers, Global South Energy Exporters) — affects regional stability assessment. Each stakeholder has a predefined profile with interests and red lines. The agent returns a verdict per stakeholder: <code>accept</code>, <code>conditional</code>, or <code>reject</code>, with rationale and specific red-line violations cited.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-blue-500">
              <h4 className="font-bold text-foreground mb-1">Stage 3: Domestic Audience Agent <span className="text-xs text-muted-foreground ml-2">(currently: {stm(3, "evaluation")} — evaluation role)</span></h4>
              <p className="text-muted-foreground">Goes one level deeper than stakeholder evaluation by assessing domestic political sellability. Evaluates 11 domestic audiences across 3 key countries: Iran (Supreme Leader, IRGC, reformists, public), US (Congress, Pentagon, Israel lobby, public), and Israel (Knesset hardliners, security establishment, center-left coalition). Returns a verdict per audience: <code>sellable</code>, <code>difficult</code>, or <code>unsellable</code>.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-emerald-500">
              <h4 className="font-bold text-foreground mb-1">Stage 3.5: Creative Reframing <span className="text-xs text-muted-foreground ml-2">(currently: {stm(null, "generation")} — generation role)</span></h4>
              <p className="text-muted-foreground">After domestic audience evaluation reveals which audiences find the deal "difficult" or "unsellable," this stage generates clever domestic selling narratives for each problematic audience. Rather than changing the deal terms, it reframes existing provisions as victories within each audience's value framework. For example, a sanctions relief provision might be reframed to US hawks as "leverage extraction" — getting more for less. Each strategy includes a framing narrative, key talking points, a historical analogy (e.g., "Nixon goes to China"), and a risk-of-backfire assessment. Output is stored as <code>domesticFramingStrategies</code>.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-red-500">
              <h4 className="font-bold text-foreground mb-1">Stage 4: Red-Team Agent <span className="text-xs text-muted-foreground ml-2">(currently: {stm(4, "adversarial")} — adversarial role)</span></h4>
              <p className="text-muted-foreground">Generates 5 adversarial attack scenarios designed to expose fatal flaws in the deal. Each attack specifies: a concrete attack description, a severity level (low/medium/high/critical), how proponents would respond, and whether the deal survives the attack. Examples include IRGC sovereignty objections, Congressional blocking of sanctions relief, and pre-emptive Israeli strikes.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-violet-500">
              <h4 className="font-bold text-foreground mb-1">Stage 5: Creative Negotiator <span className="text-xs text-muted-foreground ml-2">(currently: {stm(5, "generation")} — generation role)</span></h4>
              <p className="text-muted-foreground">Upgraded from a simple "patch rejections" approach to a creative Pareto-improvement search. The negotiator analyzes rejecting and conditional stakeholders, the domestic framing strategies from Stage 3.5, and the full context of stakeholder interests to search for creative tradeoffs where one party's concession satisfies another party's core demand. It looks for win-win linkages, creative side payments, phased commitments, and face-saving formulations. Outputs include specific <code>creativeTradeoffs</code> (describing what each side gives/gets and why it's a Pareto improvement), targeted amendments per stakeholder, and revised terms.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-amber-500">
              <h4 className="font-bold text-foreground mb-1">Stage 6: Judge Panel <span className="text-xs text-muted-foreground ml-2">(currently: {judgeLabel} — judicial role)</span></h4>
              <p className="text-muted-foreground">A "Supreme Court" of three independent LLM judges (Anthropic, OpenAI, Gemini) each score the deal on 7 dimensions with rationale. Scores are averaged across all providers. This multi-model scoring prevents any single model's biases from dominating the assessment. Details in Section 9.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-blue-500">
              <h4 className="font-bold text-foreground mb-1">Stage 7: Meta-Evaluator <span className="text-xs text-muted-foreground ml-2">(currently: {stm(7, "evaluation")} — evaluation role)</span></h4>
              <p className="text-muted-foreground">Distinct from the Judge: the Meta-Evaluator assesses the <em>quality of the pipeline's own reasoning process</em>, not the deal itself. Identifies blindspots in the analysis, rates overall pipeline quality (0-1), suggests which architecture to try next, and provides a confidence score in the outcome. Critically, the Meta-Evaluator also outputs <strong>promptImprovements</strong> — specific suggestions for how each pipeline stage's prompts could be improved (e.g., "the brainstorm stage should weight economic co-dependency mechanisms more heavily"). These suggestions feed into the pipeline hill-climbing mechanism described in Section 7.4.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-red-500">
              <h4 className="font-bold text-foreground mb-1">Stage 8: Diagnosis Generator <span className="text-xs text-muted-foreground ml-2">(currently: {stm(8, "adversarial")} — adversarial role)</span></h4>
              <p className="text-muted-foreground">Produces a human-readable diagnosis of why the deal succeeded or faces difficulties. Focuses on which stakeholder objections and which structural weaknesses are most critical. This diagnosis is <strong>fed forward</strong> as input to the next cycle's Proposal Agent (Stage 1), closing the autoresearch feedback loop.</p>
            </div>
          </div>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">7.3 Model Configuration &amp; Independence Enforcement</h3>
          <p>
            The system uses a three-tier model resolution hierarchy with the highest specificity winning:
          </p>
          <ol className="text-sm">
            <li><strong>Per-agent stage override</strong> (e.g., <code>stage4Provider = "gemini"</code>) — highest priority</li>
            <li><strong>Per-role bucket</strong> (e.g., <code>adversarialProvider = "gemini"</code>) — applies to all stages with that role</li>
            <li><strong>Legacy per-provider model</strong> (e.g., <code>geminiModel = "gemini-3.1-pro-preview"</code>) — global fallback</li>
          </ol>
          <p>
            A hard validation check ensures generation and evaluation providers are always different: <code>if (generationProvider === evaluationProvider) throw Error</code>. This is the system's core architectural invariant for preventing self-grading.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">7.4 Pipeline Hill-Climbing (Self-Improving Prompts)</h3>
          <p>
            Beyond iterating on deal content, the system also iterates on its own prompts. After each deal cycle, the Meta-Evaluator (Stage 7) suggests specific prompt improvements — identifying weaknesses in how each stage reasons and proposing concrete instruction modifications. These suggestions are subject to a <strong>score-gated acceptance criterion</strong> before being adopted:
          </p>
          <div className="space-y-3 not-prose text-sm">
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Data Collection</h4>
              <p className="text-muted-foreground">Each pipeline configuration (set of prompt overrides) must produce at least 2 deals before the system considers evolving to the next generation. This prevents premature abandonment of a promising configuration based on a single noisy data point.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Score-Gated Promotion</h4>
              <p className="text-muted-foreground">New prompt overrides are adopted only when the current cycle's composite score exceeds the running average of the current configuration by a minimum threshold. This ensures the system climbs uphill on deal quality rather than drifting randomly.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Cumulative Overrides</h4>
              <p className="text-muted-foreground">Accepted improvements are applied as cumulative addenda to stage prompts (e.g., "ADDITIONAL INSTRUCTION (gen 3): weight economic co-dependency mechanisms more heavily"). Each generation builds on the previous, creating a growing set of learned instructions. Override keys map to specific stages: <code>brainstorm_system</code>, <code>proposal_system</code>, <code>framing_system</code>, <code>negotiator_system</code>, etc.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Lineage Tracking</h4>
              <p className="text-muted-foreground">Each configuration stores its parent config ID, generation number, average composite score, and deal count. This creates a full evolutionary lineage of the pipeline's prompt evolution over time, stored in the <code>pipeline_evolution</code> database table.</p>
            </div>
          </div>
        </Card>

        <Card className="p-8" id="task-c">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" /> 8. Task C: Crowdsourced Proposal Evaluation
          </h2>
          <p>
            While Task B generates AI-originated proposals autonomously, Task C opens the system to external proposals from two distinct sources and subjects them to the same rigorous evaluation pipeline. This creates a common evaluation framework where AI-generated deals, real-world diplomatic proposals, and community-submitted ideas can be directly compared on identical scoring dimensions.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">8.1 Source 1: Automatic News Extraction</h3>
          <p>
            During each autoresearch cycle (Step 2 in the system architecture), the system scans newly ingested diplomatic evidence for mentions of concrete peace proposals from real-world actors. This is performed by a dedicated Proposal Extraction Agent <ModelTag value={stm(null, "extraction")} /> that:
          </p>
          <ul>
            <li>Filters evidence items to only those classified as "diplomatic" and not yet processed</li>
            <li>Scans up to 30 articles per batch for mentions of <strong>concrete proposals with actual policy substance</strong> — specific nuclear terms, sanctions conditions, timelines, etc.</li>
            <li>Rejects vague diplomatic statements ("we are open to talks"), opinion columns, and proposals lacking sufficient detail</li>
            <li>Requires each extracted proposal to be attributable to a specific real-world actor (government, international body, think tank) with a confidence score ≥ 0.6</li>
            <li>Deduplicates against existing proposals using stable SHA-256 hashes and fuzzy name matching (≥3 shared significant words triggers duplicate detection)</li>
          </ul>
          <p>
            Each extracted proposal is mapped to the standard 7-dimension deal terms structure (nuclear protocol, sanctions relief, Hormuz arrangements, humanitarian provisions, verification mechanism, timeline, sequencing) and any known stakeholder responses mentioned in the source articles are captured as initial evaluations. The proposal is then immediately run through the full 8-stage evaluation pipeline: stakeholder evaluation, domestic audience assessment, red-team stress testing, negotiator amendments, judge panel scoring, meta-evaluation, diagnosis generation, and "What Would It Take" analysis.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">8.2 Source 2: Community Submissions</h3>
          <p>
            The system provides a public submission form where anyone can submit a peace proposal for evaluation. Community submissions follow a moderated pipeline:
          </p>
          <div className="space-y-3 not-prose text-sm">
            <div className="bg-card p-4 border border-border border-l-2 border-l-sky-500">
              <h4 className="font-bold text-foreground mb-1">Step 1: Submission</h4>
              <p className="text-muted-foreground">Users provide: submitter name (optional), source name and URL, a summary (minimum 50 characters), and a set of key-value term pairs describing specific policy provisions (e.g., "Uranium enrichment cap" → "3.67%"). The frontend validates completeness and URL format before submission.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-amber-500">
              <h4 className="font-bold text-foreground mb-1">Step 2: Admin Review Queue</h4>
              <p className="text-muted-foreground">Submissions enter a <code>pending</code> state in the admin review queue. Administrators can edit the summary and terms to standardize formatting before deciding. This moderation step prevents low-quality or spam submissions from consuming evaluation resources.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-emerald-500">
              <h4 className="font-bold text-foreground mb-1">Step 3: Approval &amp; Evaluation</h4>
              <p className="text-muted-foreground">Upon admin approval, the proposal is created in the proposals table with <code>source: "community"</code> and the full 8-stage evaluation pipeline is triggered asynchronously. The community proposal receives the same stakeholder evaluation, domestic audience analysis, red-team stress testing, negotiator amendments, 3-model judge panel scoring, meta-evaluation, diagnosis, and "What Would It Take" analysis as any AI-generated deal. Results are persisted and the proposal appears in the Proposal Arena alongside all other evaluated proposals.</p>
            </div>
          </div>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">8.3 Evaluation Parity</h3>
          <p>
            A critical design principle of Task C is <strong>evaluation parity</strong>: community-submitted and news-extracted proposals go through the identical evaluation pipeline as AI-generated deals from Task B. Specifically:
          </p>
          <ul>
            <li>The same 23 stakeholders across 4 acceptance tiers (Required: Iran, US; Critical: Israel; Influential: Saudi Arabia, IAEA, Russia, China, EU3; Contextual: 15 regional and global actors) evaluate every proposal using identical profiles, red lines, and tier-based feasibility caps</li>
            <li>The same 11 domestic audiences across 3 countries assess political sellability</li>
            <li>The same adversarial red-team generates 5 attack scenarios per proposal</li>
            <li>The same negotiator agent proposes amendments for rejecting stakeholders</li>
            <li>The same 3-model judge panel (Anthropic, OpenAI, Gemini) scores on the same 7 dimensions with identical composite weighting</li>
            <li>The same "What Would It Take" analysis computes concrete requirements for each rejecting stakeholder</li>
          </ul>
          <p>
            This parity means every proposal in the system — whether generated by the AI, extracted from a Reuters article, or submitted by a graduate student — is scored on the same scale and can be directly compared in the Proposal Arena. The composite scores, stakeholder verdicts, and red-team survival rates are all directly comparable across origin types.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">8.4 The Autoresearch Feedback Loop</h3>
          <p>
            Task C proposals don't exist in isolation — they integrate into the broader autoresearch cycle. News-extracted proposals are discovered during evidence ingestion, meaning the system's awareness of real-world diplomatic proposals evolves alongside its evidence base. High-scoring community proposals provide benchmark targets for Task B's AI-generated deals, creating competitive pressure that drives the autonomous optimization loop toward more realistic and feasible proposals.
          </p>
        </Card>

        <Card className="p-8" id="cba">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <Scale className="w-6 h-6 text-primary" /> 9. Cost-Benefit Analysis Modeling
          </h2>
          <p>
            The CBA framework is injected directly into the Proposal Agent's prompt context (Stage 1) and the Judge Panel's scoring prompt (Stage 6), ensuring that deal generation and evaluation are grounded in economic reality rather than pure diplomatic reasoning.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">9.1 War vs. Peace Framework</h3>
          <p>
            The modeling approach treats war and peace as alternative states of the same system using consistent accounting rules. The delta (Δ) between states represents the "Peace Dividend" or "War Cost." Annual estimates used in prompts:
          </p>
          <div className="not-prose text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="bg-card p-3 border border-border"><strong className="text-foreground">Ongoing conflict cost:</strong> ~$450B/yr globally in GDP-equivalent losses</div>
              <div className="bg-card p-3 border border-border"><strong className="text-foreground">Durable peace benefit:</strong> ~$560B/yr — a $1T/yr aggregate swing</div>
            </div>
          </div>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">9.2 Economic Channels</h3>
          <p>Impacts are decomposed across specific channels with war cost / peace gain estimates (USD billions per year) provided to the LLM agents:</p>
          <div className="overflow-x-auto not-prose">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-foreground">Channel</th>
                  <th className="text-right p-2 text-foreground">War Cost</th>
                  <th className="text-right p-2 text-foreground">Peace Gain</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50"><td className="p-2">Trade &amp; Sanctions</td><td className="text-right p-2">$75B</td><td className="text-right p-2">$122B</td></tr>
                <tr className="border-b border-border/50"><td className="p-2">Energy Markets (incl. transfers)</td><td className="text-right p-2">$113B</td><td className="text-right p-2">$133B</td></tr>
                <tr className="border-b border-border/50"><td className="p-2">Shipping &amp; Insurance</td><td className="text-right p-2">$55B</td><td className="text-right p-2">$69B</td></tr>
                <tr className="border-b border-border/50"><td className="p-2">Finance &amp; Banking</td><td className="text-right p-2">$55B</td><td className="text-right p-2">$82B</td></tr>
                <tr className="border-b border-border/50"><td className="p-2">Defense &amp; Security</td><td className="text-right p-2">$72B</td><td className="text-right p-2">$39B</td></tr>
                <tr className="border-b border-border/50"><td className="p-2">Aviation &amp; Tourism</td><td className="text-right p-2">$30B</td><td className="text-right p-2">$45B</td></tr>
                <tr className="border-b border-border/50"><td className="p-2">Humanitarian</td><td className="text-right p-2">$28B</td><td className="text-right p-2">$26B</td></tr>
                <tr className="border-b border-border/50"><td className="p-2">Productivity &amp; FDI</td><td className="text-right p-2">$28B</td><td className="text-right p-2">$56B</td></tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">9.3 Stakeholder-Specific Incentives</h3>
          <p>
            The Proposal Agent is told which actors bear the highest costs and stand to gain the most from peace, ensuring deals are designed with realistic incentive structures:
          </p>
          <div className="not-prose text-sm grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="bg-card p-3 border border-border"><strong className="text-foreground">Iran:</strong> $87B cost → $142B peace benefit</div>
            <div className="bg-card p-3 border border-border"><strong className="text-foreground">US:</strong> $52B cost → $38B peace benefit</div>
            <div className="bg-card p-3 border border-border"><strong className="text-foreground">Israel:</strong> $43B cost → $35B peace benefit</div>
            <div className="bg-card p-3 border border-border"><strong className="text-foreground">Europe:</strong> $42B cost → $55B peace benefit</div>
            <div className="bg-card p-3 border border-border"><strong className="text-foreground">China:</strong> $35B cost → $48B peace benefit</div>
          </div>
          <p className="mt-4">
            This CBA context directs the LLM to design deals that "address the channels where the largest economic gains are achievable and ensure stakeholders who bear the highest costs have clear incentives to participate." The Judge Panel receives the same data, instructing it to "consider whether the deal terms adequately address these economic incentives when scoring regionalStability and feasibility."
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">9.4 Conceptual Framework: Three-Ledger Accounting</h3>
          <p>
            The CBA estimates injected into prompts are informed by a three-ledger conceptual framework (documented in the project's modeling guide) designed to avoid double-counting errors common in conflict economics. While the system does not computationally implement these ledgers as separate modules, the framework shapes how the aggregate figures are constructed:
          </p>
          <ol className="text-sm">
            <li><strong>Real Resource Losses/Gains:</strong> Physical destruction, lost production, productivity changes — genuine deadweight costs.</li>
            <li><strong>Transfers and Redistribution:</strong> Commodity price shifts (e.g., oil price spikes) that help exporters but hurt importers — zero-sum at the global level.</li>
            <li><strong>Risk and Option Value:</strong> Changes in sovereign spreads, insurance premiums, and strategic leverage — including Iran's "Wartime Rents" (the value of selective-access tolls and deterrence leverage that peace would eliminate).</li>
          </ol>
          <p className="mt-2">
            The third ledger is conceptually critical: it prevents naive overestimation of peace benefits by recognizing that some actors (particularly Iran) derive strategic value from the conflict status quo that a peace deal must compensate for. These considerations are embedded in the prompt context rather than as separate computational modules.
          </p>
        </Card>

        <Card className="p-8" id="scoring">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" /> 10. Scoring &amp; Evaluation Framework
          </h2>

          <h3 className="text-xl font-bold font-display text-foreground mt-4">10.1 Task A Scoring (Forecast Calibration)</h3>
          <p>
            Forecast quality is measured by Brier score, log score, and their composite, computed against backtest records from historical seed data. See Section 6.3 for the mathematical definitions and composite formula.
          </p>
          <p>
            The codebase also includes a calibration curve utility that can bucket forecast-outcome pairs into 10 probability bins and compare predicted vs. observed frequencies. This is available for calibration analysis but is not automatically computed as part of the autoresearch cycle's runtime path.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">10.2 Task B &amp; C Scoring (Deal &amp; Proposal Quality)</h3>
          <p>
            Deal and proposal evaluation is fundamentally forward-looking — it does not use historical backtesting. Instead, quality is assessed through <strong>multi-agent LLM stakeholder simulations</strong> (23 stakeholders across 4 acceptance tiers, 11 domestic audiences, adversarial red-teaming) grounded in <strong>cost-benefit economic modeling</strong>. The Judge Panel (Stage 6) synthesizes these simulation results and scores each deal on <strong>7 dimensions</strong>, each rated 0.0 to 1.0 with rationale:
          </p>
          <div className="overflow-x-auto not-prose">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-foreground">Dimension</th>
                  <th className="text-right p-2 text-foreground">Weight</th>
                  <th className="text-left p-2 text-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50"><td className="p-2 font-medium text-foreground">Feasibility</td><td className="text-right p-2">20%</td><td className="p-2">Likelihood the deal gets signed by all required parties. Capped at 15% if a Required-tier stakeholder rejects; capped at 35% if the Critical-tier stakeholder rejects.</td></tr>
                <tr className="border-b border-border/50"><td className="p-2 font-medium text-foreground">Coherence</td><td className="text-right p-2">15%</td><td className="p-2">Do the terms form a logically consistent, non-contradictory package?</td></tr>
                <tr className="border-b border-border/50"><td className="p-2 font-medium text-foreground">Evidence Grounding</td><td className="text-right p-2">10%</td><td className="p-2">Are the terms responsive to current geopolitical reality?</td></tr>
                <tr className="border-b border-border/50"><td className="p-2 font-medium text-foreground">Domestic Sellability</td><td className="text-right p-2">20%</td><td className="p-2">Could domestic political audiences in key states accept this?</td></tr>
                <tr className="border-b border-border/50"><td className="p-2 font-medium text-foreground">Regional Stability</td><td className="text-right p-2">15%</td><td className="p-2">Does this deal reduce regional conflict risk and address economic incentives?</td></tr>
                <tr className="border-b border-border/50"><td className="p-2 font-medium text-foreground">Implementability</td><td className="text-right p-2">10%</td><td className="p-2">Can the terms be practically implemented and sequenced?</td></tr>
                <tr className="border-b border-border/50"><td className="p-2 font-medium text-foreground">Durability</td><td className="text-right p-2">10%</td><td className="p-2">Will this deal hold under stress and changing political conditions?</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4">
            The <strong>composite score</strong> is the weighted sum: <code>Composite = Σ(dimensionᵢ × weightᵢ)</code>. This is the primary optimization target for the deal autoresearch loop. Scores are classified into three quality tiers: <strong className="text-emerald-400">Viable</strong> (≥65%), <strong className="text-amber-400">Marginal</strong> (45% to &lt;65%), and <strong className="text-red-400">Weak</strong> (&lt;45%). A deal scoring below 35% composite is marked as "stalled," which increments the stall counter for that architecture.
          </p>
          <p>
            <strong>Tier-based feasibility caps</strong> enforce the acceptance hierarchy: if a Required-tier stakeholder (Iran or US) rejects the deal, feasibility is capped at 15%. If the Critical-tier stakeholder (Israel) rejects, feasibility is capped at 35%. These hard caps severely penalize deals that lack buy-in from the most essential parties, making it extremely difficult to achieve a Viable composite score without Required and Critical tier acceptance.
          </p>
          <p>
            Each judge provides per-dimension rationale, which is merged across providers using pipe-delimited concatenation for full transparency into each model's reasoning. The Deal Dashboard and Proposal Arena both display per-dimension scores with individual model tabs, allowing users to compare how each LLM judge scored each dimension independently.
          </p>
        </Card>

        <Card className="p-8" id="pareto">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <GitBranch className="w-6 h-6 text-primary" /> 11. Pareto Frontier &amp; Solution Tree
          </h2>
          <p>
            Rather than simply tracking the "best" deal, AutoPeace maintains two complementary views of the solution space:
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-4">11.1 Pareto Frontier</h3>
          <p>
            The system maintains a set of <strong>non-dominated deals</strong> — the Pareto frontier. A deal is dominated (and removed from the frontier) if and only if another deal is equal or better on <em>all</em> 7 scoring dimensions AND strictly better on at least one. This means the frontier preserves deals with different trade-off profiles (e.g., a deal with high feasibility but lower durability coexists with a deal showing the opposite pattern).
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">11.2 Solution Tree</h3>
          <p>
            Every deal is recorded as a node in a tree structure. Each node stores:
          </p>
          <ul className="text-sm">
            <li>Parent node (the deal it was derived from)</li>
            <li>Architecture used (balanced, nuclear-first, hormuz-first, humanitarian-first)</li>
            <li>Depth in the tree (number of iterations from root)</li>
            <li>Whether it's stalled (composite &lt; 0.35)</li>
            <li>Whether it's the best in its branch</li>
            <li>Composite score</li>
          </ul>
          <p>
            When the stall count for an architecture under the current parent node reaches the threshold of 3, the system automatically branches to a different architecture. This creates a tree where different branches explore fundamentally different negotiation strategies, preventing the optimization from getting trapped in a single approach.
          </p>
        </Card>

        <Card className="p-8" id="what-if">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <ArrowRight className="w-6 h-6 text-primary" /> 12. What-If Scenario Analysis
          </h2>
          <p>
            After each forecasting cycle, the system generates counterfactual forecast variants for four predefined geopolitical scenarios:
          </p>
          <div className="space-y-2 not-prose text-sm">
            <div className="bg-card p-3 border border-border"><strong className="text-foreground">Sanctions Lifted:</strong> Western sanctions on Iran fully removed as part of a phased deal. Trigger: Full JCPOA-plus agreement with verified enrichment rollback.</div>
            <div className="bg-card p-3 border border-border"><strong className="text-foreground">Military Strikes:</strong> Israeli or US military strikes on Iranian nuclear facilities. Trigger: Iran crosses 90% enrichment threshold or credible weapon assembly detected.</div>
            <div className="bg-card p-3 border border-border"><strong className="text-foreground">Hormuz Closure:</strong> Iran closes the Strait of Hormuz disrupting global energy supply. Trigger: US or Israeli military action or crushing sanction escalation.</div>
            <div className="bg-card p-3 border border-border"><strong className="text-foreground">US Withdrawal:</strong> United States significantly reduces military presence in the Middle East. Trigger: Domestic political shift, budget crisis, or grand strategy reorientation.</div>
          </div>
          <p className="mt-4">
            Each scenario is evaluated by re-running the forecasting model with the scenario injected as context alongside current evidence and the base 90-day forecast. The model must explain how the scenario causally shifts each outcome probability. These counterfactuals serve as sensitivity analysis — revealing which external events would most dramatically alter the conflict trajectory.
          </p>
        </Card>

        <Card className="p-8 border-amber-700/40 bg-amber-900/10" id="limitations">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400" /> 13. Limitations &amp; Disclaimer
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground mt-4 list-disc list-inside">
            <li>Forecasts are <strong>probabilistic estimates</strong> produced by AI models and are not verified ground truth. All probabilities should be interpreted with appropriate epistemic humility.</li>
            <li>Evidence is sourced from public RSS feeds, GDELT, and ACLED — all subject to reporting lag, bias, and incompleteness. Classified intelligence, private diplomatic channels, and real-time military data are not available to the system.</li>
            <li>LLM forecasters (Anthropic Claude, Gemini, GPT-4o) may exhibit hallucination, anchoring bias, or training cutoff limitations. The adversarial multi-provider architecture mitigates but cannot eliminate these risks.</li>
            <li>The Task A hill-climbing loop uses Brier score on a limited historical seed corpus to calibrate <em>forecast probabilities</em> only. Deal and proposal evaluation (Tasks B and C) does not use historical backtesting — it relies entirely on forward-looking CBA modeling and multi-agent LLM stakeholder simulations.</li>
            <li>CBA figures are estimates derived from publicly available economic models and should be treated as order-of-magnitude guides rather than precise values.</li>
            <li>Deal proposals are generated by language models and have not been vetted by real negotiators, diplomats, or subject-matter experts. They represent computationally plausible frameworks, not actionable policy recommendations.</li>
            <li>The generation/evaluation independence constraint reduces but does not eliminate bias — models from different providers may share training data, alignment approaches, or systematic blindspots.</li>
            <li>Forecasts and deals should <strong>never</strong> be used as the sole basis for policy, investment, or personal safety decisions.</li>
          </ul>
          <p className="text-xs text-amber-300/70 mt-4 italic">
            This platform is provided for research and educational purposes only. The authors make no warranties regarding accuracy or completeness. AutoPeace is an experiment in applying autoresearch methodology to conflict analysis — it demonstrates what is technically possible, not what should be directly operationalized.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold font-display text-foreground mt-0">Open Source &amp; Resources</h2>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors text-sm text-foreground"
            >
              <ExternalLink className="w-4 h-4 text-primary" /> View Source on GitHub
            </a>
            <a
              href="https://acleddata.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors text-sm text-foreground"
            >
              <ExternalLink className="w-4 h-4 text-primary" /> ACLED Data
            </a>
            <a
              href="https://gdeltproject.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors text-sm text-foreground"
            >
              <ExternalLink className="w-4 h-4 text-primary" /> GDELT Project
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
