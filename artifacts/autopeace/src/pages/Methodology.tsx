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
        description=""
      />

      <Card className="p-8 text-center space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground leading-tight">
          AutoPeace: Multi-Agent Automated Research for Bayesian Conflict Forecasting, Autonomous Peace Deal Optimization, and Crowdsourced Proposal Evaluation
        </h1>
        <div className="space-y-1">
          <p className="text-base text-foreground font-medium">Mohammad Keyhani</p>
          <p className="text-sm text-muted-foreground">University of Calgary</p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <a href="mailto:mkeyhani@ucalgary.ca" className="text-primary hover:underline transition-colors">mkeyhani@ucalgary.ca</a>
          <a href="https://profiles.ucalgary.ca/mohammad-keyhani" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline transition-colors flex items-center gap-1">Institutional Profile <ExternalLink className="w-3 h-3" /></a>
          <a href="https://www.linkedin.com/in/keyhanimo/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline transition-colors flex items-center gap-1">LinkedIn <ExternalLink className="w-3 h-3" /></a>
          <a href="https://www.digitvibe.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline transition-colors flex items-center gap-1">Blog <ExternalLink className="w-3 h-3" /></a>
        </div>
      </Card>

      <nav className="not-prose">
        <Card className="p-6">
          <h2 className="text-lg font-bold font-display text-foreground mb-4">Table of Contents</h2>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground list-decimal list-inside">
            <li><a href="#abstract" className="hover:text-primary transition-colors">Abstract &amp; Motivation</a></li>
            <li><a href="#karpathy" className="hover:text-primary transition-colors">Relationship to Karpathy's Autoresearch</a></li>
            <li><a href="#system-architecture" className="hover:text-primary transition-colors">System Architecture Overview</a></li>
            <li><a href="#evidence-ingestion" className="hover:text-primary transition-colors">Evidence Ingestion Pipeline</a></li>
            <li><a href="#task-a" className="hover:text-primary transition-colors">Task A: Bayesian Conflict Forecasting</a></li>
            <li><a href="#hill-climbing" className="hover:text-primary transition-colors">Forecast Generation &amp; Persistence</a></li>
            <li><a href="#task-b" className="hover:text-primary transition-colors">Task B: Autonomous Deal Optimization</a></li>
            <li><a href="#deal-memory" className="hover:text-primary transition-colors">Deal Memory &amp; Provision-Level Learning</a></li>
            <li><a href="#task-c" className="hover:text-primary transition-colors">Task C: Crowdsourced Proposal Evaluation</a></li>
            <li><a href="#cba" className="hover:text-primary transition-colors">Cost-Benefit Analysis Modeling</a></li>
            <li><a href="#scoring" className="hover:text-primary transition-colors">Scoring &amp; Evaluation Framework</a></li>
            <li><a href="#pareto" className="hover:text-primary transition-colors">Pareto Frontier &amp; Solution Tree</a></li>
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
            <li><strong>Task A — Bayesian Conflict Forecasting:</strong> Continuously updating probability distributions across eight mutually exclusive conflict outcome states for the Iran-US-Israel conflict complex, generating a single evidence-conditioned forecast per research cycle.</li>
            <li><strong>Task B — Autonomous Peace Deal Optimization:</strong> Generating, evaluating, and iteratively refining AI-originated peace deal proposals through a multi-stage pipeline (Stages 0–8 including sub-stages) that includes creative brainstorming from historical precedents, stakeholder modeling, adversarial red-teaming, domestic political analysis, creative reframing of perceived concessions, Pareto-optimal negotiation search, multi-model judicial scoring, self-improving prompt evolution, deal memory with provision-level learning, and radical architecture exploration.</li>
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
              <p className="text-muted-foreground">AutoPeace treats outputs as <em>state to be iteratively refined</em> across cycles. In Task A (forecasting), the system generates a fresh probability distribution each cycle conditioned on the latest evidence pack — a single forecast per cycle without experimentation. In Task B (deal optimization), the system generates a fresh proposal each cycle informed by the previous deal's failure diagnosis and current evidence, then compares its composite score to the current best deal, retaining whichever scores higher — true hill-climbing over the composite score. Task B embodies the core autoresearch principle: LLM output is not the final product — it is the starting point for automated improvement.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">LLM-as-Judge with Generation/Evaluation Independence</h4>
              <p className="text-muted-foreground">In the deal optimization pipeline (Task B), AutoPeace enforces a strict architectural constraint: the model that <em>generates</em> a deal proposal must never be the same model that <em>evaluates</em> it. This is enforced at the code level — the system throws an error if <code>generationProvider</code> and <code>evaluationProvider</code> are the same LLM provider. This cross-provider design ensures no single model's biases can dominate both generation and evaluation.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Adversarial Multi-Provider Debate</h4>
              <p className="text-muted-foreground">Where Karpathy's autoresearch uses a single model with self-critique, AutoPeace distributes adversarial roles across three independent LLM providers (Anthropic Claude, OpenAI GPT-4o, Google Gemini). The Proposal Agent (Anthropic) generates, the Red-Team Agent (Gemini) attacks, and the Judge Panel (all three providers) scores independently. This cross-provider architecture ensures no single model's biases dominate.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Measurable Scoring Functions</h4>
              <p className="text-muted-foreground">AutoPeace defines concrete, computable scoring functions for deal optimization (Task B), using a 7-dimension weighted composite score (feasibility, coherence, evidence grounding, domestic sellability, regional stability, implementability, durability). These replace subjective quality judgments with quantitative optimization targets that drive the hill-climbing loop.</p>
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
              <span className="bg-primary/20 text-primary font-mono text-xs px-2 py-1 shrink-0">Step 1b</span>
              <div><strong className="text-foreground">Stakeholder Profile Updates</strong> — After evidence ingestion, newly ingested items are grouped by stakeholder relevance and fed to an LLM that proposes updates to each stakeholder's goals, red lines, constraints, and profile summary based on the latest developments. Updates are written back to the database, ensuring that subsequent pipeline stages (deal generation, stakeholder evaluation) use the most current stakeholder intelligence.</div>
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
              <div><strong className="text-foreground">Deal Optimization Trigger (Task B)</strong> — Before launching the 8-stage deal evaluation pipeline, the system generates a <strong>two-layer evidence context</strong>: (1) a <strong>Strategic Situation Assessment</strong> — an LLM-synthesized ~500-word narrative covering the full conflict trajectory, military situation, diplomatic landscape, sanctions context, humanitarian conditions, and key structural factors, drawn from up to 150 evidence items across the entire corpus; and (2) a <strong>Recent Tactical Developments</strong> briefing — the 30 most recent items grouped by type. Both layers are combined and threaded through all pipeline stages, giving deal generation and evaluation both the long-term structural context and immediate tactical awareness. The strategic summary is regenerated every cycle to capture rapidly shifting dynamics in active conflicts. Task B then runs as a separate async process that generates, tests, and scores a new peace deal proposal. It manages its own persistence, Pareto frontier updates, and solution tree recording upon completion.</div>
            </li>
            <li className="bg-card p-3 border border-border flex items-start gap-3">
              <span className="bg-primary/20 text-primary font-mono text-xs px-2 py-1 shrink-0">Step 5</span>
              <div><strong className="text-foreground">Persistence</strong> — Store forecast results in the database. Generate a changelog entry summarizing the cycle's key findings.</div>
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
            Forecasts are generated independently for four time horizons: <strong>30 days</strong>, <strong>90 days</strong>, <strong>180 days</strong>, and <strong>1 year</strong>. Each horizon receives its own prompt with identical evidence but horizon-specific framing.
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
            <RefreshCw className="w-6 h-6 text-primary" /> 6. Forecast Generation
          </h2>
          <p>
            Each research cycle generates a single set of probability forecasts across 4 time horizons (30d, 90d, 180d, 1y) for 8 mutually exclusive outcome states. The forecasting model produces probability distributions conditioned on the latest evidence pack, incorporating both recent tactical developments and longer-term structural factors.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">6.1 Forecast Output</h3>
          <p>
            The forecast output is an 8-dimensional probability vector for each time horizon, representing the likelihood of each outcome state. The system generates a detailed rationale explaining the reasoning behind each distribution, along with key evidence items that most influenced the assessment.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">6.2 Persistence</h3>
          <p>
            Each cycle's forecasts are persisted to the database. The most recent forecast for each time horizon is marked as "current" and displayed on the dashboard. Historical forecasts are retained for trend analysis and comparison across cycles.
          </p>
        </Card>

        <Card className="p-8" id="task-b">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <Target className="w-6 h-6 text-primary" /> 7. Task B: Autonomous Deal Optimization
          </h2>
          <p>
            Task B is a separate autoresearch loop triggered asynchronously after each forecasting cycle completes. Task B generates a <strong>fresh proposal</strong> each cycle — informed by the latest evidence, the previous deal's failure diagnosis, and a <strong>deal memory context</strong> that encodes lessons from all prior deals — then evaluates it through a <strong>multi-stage pipeline</strong> (Stage 0 through Stage 8, including sub-stages) where different LLM providers are deliberately assigned to different stages to ensure adversarial independence. The pipeline selects from <strong>8 deal architectures</strong> (4 standard + 4 radical), with a 30% probability of exploring radical unconventional approaches each cycle and automatic radical branching when conventional approaches stall. It is designed to maximize AI creativity by simultaneously processing many stakeholder preferences, drawing on historical peace deal precedents, finding creative cross-issue linkages, inventing novel deal mechanisms, and learning from provision-level performance data across past iterations. If the new deal scores equal to or higher than the current best, it replaces it — ties are broken in favor of the newer deal because it reflects the most current evidence context. The pipeline's own prompts evolve over time via a score-gated hill-climbing mechanism.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">7.1 Deal Architecture Selection</h3>
          <p>
            Each cycle selects one of eight deal architectures, divided into four standard and four radical categories. The architecture determines the primary sequencing, emphasis, and creative approach of the generated proposal:
          </p>
          <h4 className="text-lg font-bold font-display text-foreground mt-4 mb-2">Standard Architectures</h4>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm not-prose list-none p-0">
            <li className="bg-card p-3 border border-border"><strong className="text-foreground">Balanced:</strong> Equal priority across nuclear, sanctions, and maritime dimensions.</li>
            <li className="bg-card p-3 border border-border"><strong className="text-foreground">Nuclear-First:</strong> Comprehensive nuclear rollback as the prerequisite for any relief.</li>
            <li className="bg-card p-3 border border-border"><strong className="text-foreground">Hormuz-First:</strong> Maritime security framework as the foundation enabling economic normalization.</li>
            <li className="bg-card p-3 border border-border"><strong className="text-foreground">Humanitarian-First:</strong> Immediate humanitarian corridor as the trust-building prerequisite.</li>
          </ul>
          <h4 className="text-lg font-bold font-display text-foreground mt-4 mb-2">Radical Architectures</h4>
          <ul className="grid grid-cols-1 gap-2 text-sm not-prose list-none p-0">
            <li className="bg-card p-3 border border-border border-l-2 border-l-violet-500"><strong className="text-foreground">Radical Restructure:</strong> Rejects incremental diplomacy entirely. Proposes fundamental paradigm shifts — novel governance structures, unprecedented institutional frameworks, or entirely new categories of agreement that don't fit traditional arms-control or sanctions-relief templates.</li>
            <li className="bg-card p-3 border border-border border-l-2 border-l-amber-500"><strong className="text-foreground">Asymmetric Grand Bargain:</strong> Creates deliberately lopsided exchanges where one party makes a bold, disproportionate concession in exchange for asymmetric gains elsewhere. Exploits the fact that parties value different things at different magnitudes — what costs one side little may be worth enormously more to the other.</li>
            <li className="bg-card p-3 border border-border border-l-2 border-l-emerald-500"><strong className="text-foreground">Incremental Confidence-Building:</strong> Designs a sequence of micro-steps, each independently reversible and low-risk, that collectively build the trust infrastructure needed for larger agreements. Focuses on confidence-building measures (CBMs), verification protocols, and graduated reciprocity rather than comprehensive packages.</li>
            <li className="bg-card p-3 border border-border border-l-2 border-l-sky-500"><strong className="text-foreground">Freeform:</strong> Unconstrained creative exploration with no predefined structural template. The system is given maximum latitude to invent entirely novel frameworks, combine elements from different paradigms, or propose arrangements that don't fit any conventional diplomatic category.</li>
          </ul>
          <p className="mt-4">
            Architecture selection uses a triple mechanism: <strong>30% random radical exploration</strong> probability per cycle ensures the system regularly ventures beyond conventional approaches; <strong>stall-triggered branching</strong> automatically switches to a radical architecture when 3 or more consecutive cycles fail to improve scores; and <strong>forced cycling</strong> ensures each standard-architecture cycle advances to a <em>different</em> standard architecture rather than repeating the current one (selected randomly from the remaining three). This prevents the optimization loop from getting stuck in local optima and ensures the system explores fundamentally different negotiation paradigms rather than only iterating within familiar frameworks.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">7.2 The Multi-Stage Pipeline</h3>
          <p>
            Each deal passes through the following stages. The default provider assignments enforce generation/evaluation independence:
          </p>
          <div className="space-y-3 not-prose text-sm">
            <div className="bg-card p-4 border border-border border-l-2 border-l-emerald-500">
              <h4 className="font-bold text-foreground mb-1">Stage 0: Innovation Brainstorm <span className="text-xs text-muted-foreground ml-2">(currently: {stm(null, "generation")} — generation role)</span></h4>
              <p className="text-muted-foreground">Before formal proposal generation, the system conducts an extended creative brainstorm designed to unlock "superhuman" deal design. This stage receives <strong>deal memory context</strong> from past cycles — including which provisions historically improved or hurt scores, stakeholder verdict patterns, and dimension-level performance data (see Section 7.5). It mines historical peace deal analogies (Camp David, Good Friday Agreement, JCPOA, etc.) for applicable lessons, generates creative provisions that go beyond standard diplomatic categories, discovers cross-issue linkages where one stakeholder's concession can satisfy another's demand, and explores unconventional approaches like phased sovereignty transitions, digital verification systems, or economic co-dependency mechanisms. To enforce <strong>provision diversity</strong>, the prompt includes an explicit "do not repeat" list of all provision titles from previous deals, forcing the model to generate genuinely novel mechanisms each cycle. When a radical architecture is selected, the brainstorm receives architecture-specific creative directives (e.g., "reject all incremental approaches" for Radical Restructure, or "design micro-step sequences" for Incremental Confidence-Building). A robust fallback system selects from a pool of 12 diverse provisions across domains (economic, technological, environmental, cultural, security) if the LLM response cannot be parsed, ensuring variety even in degraded conditions. The brainstorm output is stored as <code>brainstormInsights</code> and injected into Stage 1 as additional creative context.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-violet-500">
              <h4 className="font-bold text-foreground mb-1">Stage 1: Proposal Agent <span className="text-xs text-muted-foreground ml-2">(currently: {stm(1, "generation")} — generation role)</span></h4>
              <p className="text-muted-foreground">Designs initial deal terms across 7 standard dimensions plus an <strong>innovativeProvisions</strong> field containing novel mechanisms that go beyond traditional categories. The agent receives the Stage 0 brainstorm insights, <strong>deal memory context</strong> (including top-performing past deals, successful vs. harmful provisions with score delta data, and stakeholder verdict patterns — see Section 7.5), the <strong>two-layer evidence context</strong> (strategic situation assessment synthesized from the full evidence corpus + recent tactical developments from the last 30 items), the previous cycle's failure diagnosis, the selected architecture focus, hard CBA economic data (see Section 8), and any evolved pipeline overrides. Like Stage 0, the prompt includes an explicit list of already-tried provision titles with instructions to generate novel alternatives, enforcing diversity across cycles. It is instructed to include at least 3 innovative provisions from different domains (economic, technological, environmental, cultural) and to simultaneously satisfy multiple stakeholders through creative linkages. A diversified fallback pool of 8 provisions across domains ensures variety even when LLM parsing fails.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-blue-500">
              <h4 className="font-bold text-foreground mb-1">Stage 2: Stakeholder Evaluator <span className="text-xs text-muted-foreground ml-2">(currently: {stm(2, "evaluation")} — evaluation role)</span></h4>
              <p className="text-muted-foreground">Assesses how each of <strong>23 stakeholders across 4 acceptance tiers</strong> would respond to the proposed deal. The evaluator receives the <strong>two-layer evidence context</strong> (strategic assessment + recent tactical developments) alongside the deal terms, ensuring that stakeholder verdicts account for both the structural conflict dynamics and recent geopolitical developments that may shift positions, red lines, or willingness to negotiate — for example, new sanctions, military incidents, or diplomatic breakthroughs that could materially alter a stakeholder's calculus. Stakeholder profiles are <strong>loaded from the database</strong> at pipeline start, reflecting the latest evidence-driven updates (see Step 1b in Section 3). <strong>Required tier</strong> (Iran, US) — both must accept for the deal to be implementable; rejection triggers graduated penalties on feasibility, implementability, and durability scores. <strong>Critical tier</strong> (Israel) — rejection triggers graduated penalties on feasibility, durability, and regional stability. <strong>Influential tier</strong> (Saudi Arabia, IAEA, Russia, China, EU3) — affects deal durability and regional stability scores. <strong>Contextual tier</strong> (UAE, Qatar, Oman, Turkey, Iraq, Egypt, India, Japan, South Korea, Jordan, Pakistan, Ukraine, Global North Bloc, Global South Energy Importers, Global South Energy Exporters) — affects regional stability assessment. The agent returns a verdict per stakeholder: <code>accept</code>, <code>conditional</code>, or <code>reject</code>, with rationale and specific red-line violations cited.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-blue-500">
              <h4 className="font-bold text-foreground mb-1">Stage 3: Domestic Audience Agent <span className="text-xs text-muted-foreground ml-2">(currently: {stm(3, "evaluation")} — evaluation role)</span></h4>
              <p className="text-muted-foreground">Goes one level deeper than stakeholder evaluation by assessing domestic political sellability. Like Stage 2, the agent receives the <strong>latest evidence summary</strong> to ground its assessment in current political dynamics — recent events may shift public opinion, empower or weaken domestic factions, or alter leaders' political positioning in ways that make a deal easier or harder to sell. Evaluates 11 domestic audiences across 3 key countries: Iran (Supreme Leader, IRGC, reformists, public), US (Congress, Pentagon, Israel lobby, public), and Israel (Knesset hardliners, security establishment, center-left coalition). Returns a verdict per audience: <code>sellable</code>, <code>difficult</code>, or <code>unsellable</code>.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-emerald-500">
              <h4 className="font-bold text-foreground mb-1">Stage 3.5: Creative Reframing <span className="text-xs text-muted-foreground ml-2">(currently: {stm(null, "generation")} — generation role)</span></h4>
              <p className="text-muted-foreground">After domestic audience evaluation reveals which audiences find the deal "difficult" or "unsellable," this stage generates clever domestic selling narratives for each problematic audience. Rather than changing the deal terms, it reframes existing provisions as victories within each audience's value framework. For example, a sanctions relief provision might be reframed to US hawks as "leverage extraction" — getting more for less. Each strategy includes a framing narrative, key talking points, a historical analogy (e.g., "Nixon goes to China"), and a risk-of-backfire assessment. Output is stored as <code>domesticFramingStrategies</code>.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-red-500">
              <h4 className="font-bold text-foreground mb-1">Stage 4: Red-Team Agent <span className="text-xs text-muted-foreground ml-2">(currently: {stm(4, "adversarial")} — adversarial role)</span></h4>
              <p className="text-muted-foreground">Generates 5 adversarial attack scenarios designed to expose fatal flaws in the deal. The red-team agent receives the <strong>latest evidence summary</strong> to identify timely, situation-specific attack vectors — recent military incidents, spoiler dynamics, diplomatic breakdowns, or destabilizing events that create vulnerabilities the deal must withstand. This ensures attacks reflect the current situation rather than only generic risks. Each attack specifies: a concrete attack description, a severity level (low/medium/high/critical), how proponents would respond, and whether the deal survives the attack. Examples include IRGC sovereignty objections, Congressional blocking of sanctions relief, and pre-emptive Israeli strikes.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-violet-500">
              <h4 className="font-bold text-foreground mb-1">Stage 5: Creative Negotiator <span className="text-xs text-muted-foreground ml-2">(currently: {stm(5, "generation")} — generation role)</span></h4>
              <p className="text-muted-foreground">Upgraded from a simple "patch rejections" approach to a creative Pareto-improvement search. The negotiator analyzes rejecting and conditional stakeholders, the domestic framing strategies from Stage 3.5, and the full context of stakeholder interests to search for creative tradeoffs where one party's concession satisfies another party's core demand. It looks for win-win linkages, creative side payments, phased commitments, and face-saving formulations. Outputs include specific <code>creativeTradeoffs</code> (describing what each side gives/gets and why it's a Pareto improvement), targeted amendments per stakeholder, and revised terms.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-amber-500">
              <h4 className="font-bold text-foreground mb-1">Stage 6: Judge Panel <span className="text-xs text-muted-foreground ml-2">(currently: {judgeLabel} — judicial role)</span></h4>
              <p className="text-muted-foreground">A "Supreme Court" of three independent LLM judges (Anthropic, OpenAI, Gemini) each score the deal on 7 dimensions with rationale. Each judge receives the <strong>latest evidence summary</strong> alongside the deal and its evaluation context, which is particularly important for the <strong>Evidence Grounding</strong> scoring dimension — judges can now directly assess whether the deal's provisions are responsive to current geopolitical developments rather than evaluating evidence grounding in the abstract. Scores are averaged across all providers. This multi-model scoring prevents any single model's biases from dominating the assessment. Details in Section 9.</p>
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

        <Card className="p-8" id="deal-memory">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <Brain className="w-6 h-6 text-primary" /> 7.5 Deal Memory &amp; Provision-Level Learning
          </h2>
          <p>
            Beyond iterating on prompts (Section 7.4), the system also learns from the <strong>substantive content</strong> of past deals. Each cycle, before generating a new proposal, the system builds a structured memory context from its entire deal history and injects it into the brainstorm (Stage 0) and proposal generation (Stage 1) stages.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">7.5.1 Deal History Context</h3>
          <p>
            The system queries the top 5 highest-scoring deals from the database and extracts structured context for each:
          </p>
          <ul className="text-sm">
            <li>Architecture used and composite score achieved</li>
            <li>Key deal terms (nuclear protocol, sanctions relief, sequencing, Hormuz arrangements)</li>
            <li>Innovative provisions with their historical performance data (score delta vs. parent deal)</li>
            <li>Stakeholder verdicts and rationale from each evaluating party</li>
            <li>Diagnosis text explaining what worked and what failed</li>
          </ul>
          <p>
            This context allows the brainstorm and proposal stages to reason about <em>what has actually worked</em> in past iterations rather than generating proposals in a vacuum. The prompt explicitly highlights provisions that historically improved scores ("What worked") and those that hurt scores, enabling the LLM to make informed decisions about which mechanisms to retain, adapt, or avoid.
          </p>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">7.5.2 Provision-Level Learning</h3>
          <p>
            The system tracks the performance of individual innovative provisions across all deals in a dedicated <code>provision_outcomes</code> database table. After each deal cycle completes, the system records for each provision:
          </p>
          <div className="space-y-3 not-prose text-sm">
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Score Delta</h4>
              <p className="text-muted-foreground">The difference between the deal's composite score and its parent deal's score. A positive delta indicates the provision appeared in a deal that improved on its predecessor.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Dimension-Level Deltas</h4>
              <p className="text-muted-foreground">Per-dimension score changes across all 7 scoring dimensions (feasibility, coherence, evidence grounding, domestic sellability, regional stability, implementability, durability). This reveals which dimensions a provision helps or hurts — a provision might boost feasibility while undermining durability.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Stakeholder Reactions</h4>
              <p className="text-muted-foreground">A record of how each stakeholder responded (accept, conditional, reject) when this provision was part of the deal. Over multiple cycles, this builds a picture of which provisions attract support or opposition from specific actors.</p>
            </div>
            <div className="bg-card p-4 border border-border">
              <h4 className="font-bold text-foreground mb-1">Category &amp; Architecture</h4>
              <p className="text-muted-foreground">Provisions are categorized (nuclear, economic, security, humanitarian, governance, verification, or novel) and tagged with the architecture that produced them. This enables the system to identify which architectures produce the most effective provisions in each category.</p>
            </div>
          </div>

          <h3 className="text-xl font-bold font-display text-foreground mt-6">7.5.3 Aggregated Provision Insights</h3>
          <p>
            The system aggregates provision-level data into actionable insights that are injected into the brainstorm and proposal prompts:
          </p>
          <ul className="text-sm">
            <li><strong>Usage count:</strong> How many times a provision type has been tried across all deals</li>
            <li><strong>Average score delta:</strong> Whether including this provision tends to improve or worsen overall deal quality</li>
            <li><strong>Best and worst dimensions:</strong> Which scoring dimensions benefit most and least from this provision</li>
          </ul>
          <p>
            These insights create a genuine learning signal: the system can identify, for example, that "digital verification protocols" have appeared in 4 deals with an average score improvement of +3.2 percentage points (strongest on implementability, weakest on domestic sellability), while "immediate full sanctions removal" has appeared in 3 deals with an average score decrease of -5.1 percentage points. This data-driven feedback replaces the previous approach of generating proposals with no memory of what has been tried before.
          </p>
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
            <div className="bg-card p-4 border border-border border-l-2 border-l-violet-500">
              <h4 className="font-bold text-foreground mb-1">Step 1.5: AI Screening</h4>
              <p className="text-muted-foreground">Before reaching the admin queue, every community submission is automatically screened by an LLM (configurable in the Admin Panel; default: Anthropic Claude) for seriousness and uniqueness. The screening model checks whether the proposal contains substantive policy content (rejecting joke submissions, vague platitudes, or off-topic entries) and compares it against existing proposals for near-duplicates. If the proposal fails screening, the user receives specific feedback explaining why and the submission is blocked without entering the admin queue.</p>
            </div>
            <div className="bg-card p-4 border border-border border-l-2 border-l-amber-500">
              <h4 className="font-bold text-foreground mb-1">Step 2: Admin Review Queue</h4>
              <p className="text-muted-foreground">Submissions that pass AI screening enter a <code>pending</code> state in the admin review queue. Administrators can edit the summary and terms to standardize formatting before deciding. This two-layer moderation (AI screening + human review) prevents low-quality or spam submissions from consuming evaluation resources.</p>
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
            <li>The same 23 stakeholders across 4 acceptance tiers (Required: Iran, US; Critical: Israel; Influential: Saudi Arabia, IAEA, Russia, China, EU3; Contextual: 15 regional and global actors) evaluate every proposal using identical database-driven profiles, red lines, and graduated acceptance penalties</li>
            <li>The same 11 domestic audiences across 3 countries assess political sellability</li>
            <li>The same adversarial red-team generates 5 attack scenarios per proposal</li>
            <li>The same negotiator agent proposes amendments for rejecting stakeholders</li>
            <li>The same 3-model judge panel (Anthropic, OpenAI, Gemini) scores on the same 7 dimensions with identical composite weighting</li>
            <li>The same "What Would It Take" analysis computes concrete requirements for each rejecting stakeholder</li>
            <li>The same <strong>latest evidence context</strong> (30 most recent items) is fetched and threaded through all evaluation stages — stakeholder evaluation, domestic audience assessment, red-team stress testing, and judge panel scoring — ensuring that Task C proposals are evaluated against the same current geopolitical reality as AI-generated deals</li>
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

          <h3 className="text-xl font-bold font-display text-foreground mt-6">9.5 CBA Integration Scope Across the System</h3>
          <p>
            To clarify how the CBA data flows through the system and where it does not:
          </p>
          <div className="not-prose text-sm space-y-2 mt-2">
            <div className="bg-card p-3 border border-border rounded">
              <strong className="text-foreground">Task B (Deal Optimization) — uses CBA data.</strong>
              <span className="text-muted-foreground"> The deal engine embeds CBA summary figures as static prompt context at multiple stages: Stage 0 (Innovation Brainstorm) receives high-level economic context highlighting the largest single-country cost-benefit asymmetries as creative leverage points; Stage 1 (Proposal Generation) receives detailed per-channel and per-stakeholder breakdowns to guide deal design toward economically viable provisions; and Stage 6 (Judge Panel) receives aggregate economic context to ground its scoring of feasibility and regional stability.</span>
            </div>
            <div className="bg-card p-3 border border-border rounded">
              <strong className="text-foreground">Task C (Crowdsourced Proposal Evaluation) — uses CBA data and evidence context.</strong>
              <span className="text-muted-foreground"> Community-submitted and news-sourced proposals pass through the same evaluation pipeline as AI-generated deals, so they receive the same CBA context at Stage 6 (Judge Panel) and the same latest evidence summary at all evaluation stages (Stages 2, 3, 4, and 6). This ensures evaluation parity between AI-generated and human-originated proposals.</span>
            </div>
            <div className="bg-card p-3 border border-border rounded">
              <strong className="text-foreground">Task A (Conflict Forecasting) — does not use CBA data.</strong>
              <span className="text-muted-foreground"> The forecasting pipeline is entirely independent of economic modeling. It relies on evidence ingestion (RSS, ACLED, GDELT) and Bayesian probability estimation across 8 outcome states. Each cycle generates a single forecast conditioned on the latest evidence — no experimentation, scoring functions, or hill-climbing is applied to forecasts. No cost-benefit figures are included in forecasting prompts.</span>
            </div>
            <div className="bg-card p-3 border border-border rounded">
              <strong className="text-foreground">Costs Explorer page — independent visualization layer.</strong>
              <span className="text-muted-foreground"> The interactive CBA page provides a standalone analytical tool for exploring the economic case for peace, with detailed per-stakeholder breakdowns, channel decomposition charts, treemaps, and radar visualizations. Its frontend calculations are performed independently and are not programmatically consumed by any backend pipeline. The CBA figures embedded in the deal engine's prompts are aligned with but maintained separately from the Costs Explorer's dataset — if one is updated, the other must be updated manually to stay in sync.</span>
            </div>
          </div>
        </Card>

        <Card className="p-8" id="scoring">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" /> 10. Scoring &amp; Evaluation Framework
          </h2>

          <h3 className="text-xl font-bold font-display text-foreground mt-4">10.1 Task A (Forecasting)</h3>
          <p>
            Forecasting does not use a scoring or optimization loop. Each cycle generates a single set of probability distributions across 4 time horizons conditioned on the latest evidence. Forecasts are persisted and the most recent set is marked as "current." Historical forecasts are retained for trend comparison across cycles, but no automated quality metric (e.g., Brier score) is computed or used to select between forecast variants.
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
                <tr className="border-b border-border/50"><td className="p-2 font-medium text-foreground">Feasibility</td><td className="text-right p-2">15%</td><td className="p-2">Likelihood the deal gets signed by all required parties.</td></tr>
                <tr className="border-b border-border/50"><td className="p-2 font-medium text-foreground">Coherence</td><td className="text-right p-2">15%</td><td className="p-2">Do the terms form a logically consistent, non-contradictory package?</td></tr>
                <tr className="border-b border-border/50"><td className="p-2 font-medium text-foreground">Evidence Grounding</td><td className="text-right p-2">12%</td><td className="p-2">Are the terms responsive to current geopolitical reality? Judges receive the latest evidence summary and score this dimension against specific recent developments.</td></tr>
                <tr className="border-b border-border/50"><td className="p-2 font-medium text-foreground">Domestic Sellability</td><td className="text-right p-2">15%</td><td className="p-2">Could domestic political audiences in key states accept this?</td></tr>
                <tr className="border-b border-border/50"><td className="p-2 font-medium text-foreground">Regional Stability</td><td className="text-right p-2">13%</td><td className="p-2">Does this deal reduce regional conflict risk and address economic incentives?</td></tr>
                <tr className="border-b border-border/50"><td className="p-2 font-medium text-foreground">Implementability</td><td className="text-right p-2">15%</td><td className="p-2">Can the terms be practically implemented and sequenced?</td></tr>
                <tr className="border-b border-border/50"><td className="p-2 font-medium text-foreground">Durability</td><td className="text-right p-2">15%</td><td className="p-2">Will this deal hold under stress and changing political conditions?</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4">
            The <strong>composite score</strong> is the weighted sum: <code>Composite = Σ(dimensionᵢ × weightᵢ)</code>. This is the primary optimization target for the deal autoresearch loop. Scores are classified into three quality tiers: <strong className="text-emerald-400">Viable</strong> (≥65%), <strong className="text-amber-400">Marginal</strong> (45% to &lt;65%), and <strong className="text-red-400">Weak</strong> (&lt;45%). A deal scoring below 35% composite is marked as "stalled," which increments the stall counter for that architecture.
          </p>
          <p>
            <strong>Graduated acceptance penalties</strong> enforce the acceptance hierarchy using a <strong>diminishing floor model</strong> rather than multiplicative scaling. Each penalty is computed as <code>diminish(score, floor, strength) = floor + (score − floor) × strength</code>, which compresses a dimension toward a floor value without collapsing it to near-zero. For Required-tier stakeholder (Iran or US) rejection: feasibility and durability are compressed toward a floor of 0.10 with strength 0.35, and implementability toward 0.15 with strength 0.40. For Critical-tier stakeholder (Israel) rejection: feasibility is compressed toward 0.20 with strength 0.50, durability toward 0.25 with strength 0.55, and regional stability toward 0.20 with strength 0.50. After per-dimension penalties, the composite score receives additive offsets: −0.10 for any Required-tier rejection and −0.05 for Critical-tier rejection (with a floor of 0.0). This approach preserves meaningful differentiation between deals facing the same rejection pattern — a deal scoring 0.70 on feasibility with a Required rejection compresses to 0.31 while a deal scoring 0.50 compresses to 0.24, maintaining a visible quality gap — while ensuring deals lacking essential-party buy-in are still materially penalized.
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
            <li>Architecture used (balanced, nuclear-first, hormuz-first, humanitarian-first, radical-restructure, asymmetric-grand-bargain, incremental-confidence, freeform)</li>
            <li>Depth in the tree (number of iterations from root)</li>
            <li>Whether it's stalled (composite &lt; 0.35)</li>
            <li>Whether it's the best in its branch</li>
            <li>Composite score</li>
          </ul>
          <p>
            When the stall count for an architecture under the current parent node reaches the threshold of 3, the system automatically branches to a different architecture. This creates a tree where different branches explore fundamentally different negotiation strategies, preventing the optimization from getting trapped in a single approach.
          </p>
        </Card>

        <Card className="p-8 border-amber-700/40 bg-amber-900/10" id="limitations">
          <h2 className="text-2xl font-bold font-display text-foreground mt-0 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400" /> 12. Limitations &amp; Disclaimer
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground mt-4 list-disc list-inside">
            <li>Forecasts are <strong>probabilistic estimates</strong> produced by AI models and are not verified ground truth. All probabilities should be interpreted with appropriate epistemic humility.</li>
            <li>Evidence is sourced from public RSS feeds, GDELT, and ACLED — all subject to reporting lag, bias, and incompleteness. Classified intelligence, private diplomatic channels, and real-time military data are not available to the system.</li>
            <li>LLM forecasters (Anthropic Claude, OpenAI GPT, Google Gemini) may exhibit hallucination, anchoring bias, or training cutoff limitations. The adversarial multi-provider architecture mitigates but cannot eliminate these risks.</li>
            <li>Task A (forecasting) generates a single forecast per cycle without experimentation or scoring optimization. Deal and proposal evaluation (Tasks B and C) uses forward-looking CBA modeling and multi-agent LLM stakeholder simulations with a 7-dimension composite scoring function.</li>
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
              href="https://github.com/keyhanimo/AutoPeace"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors text-sm text-foreground"
            >
              <ExternalLink className="w-4 h-4 text-primary" /> View Source on GitHub
            </a>
            <a
              href="https://replit.com/@keyhanimo/AutoPeace"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors text-sm text-foreground"
            >
              <ExternalLink className="w-4 h-4 text-primary" /> Remix on Replit
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
