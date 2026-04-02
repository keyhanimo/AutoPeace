import React, { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";

function getBaseUrl() {
  return window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
}

type PipelineStage = { stage: number; provider: string; model: string };
type AdminCfg = Record<string, string>;

function ModelTag({ value }: { value: string }) {
  return (
    <code className="text-xs px-1 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 ml-1">
      {value}
    </code>
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
    return "loading\u2026";
  };

  const judgeLabel = (() => {
    const a = cfg.judgePanelAnthropicModel || cfg.anthropicModel || "\u2026";
    const o = cfg.judgePanelOpenaiModel || cfg.openaiModel || "\u2026";
    const g = cfg.judgePanelGeminiModel || cfg.geminiModel || "\u2026";
    if (a === "\u2026" && o === "\u2026" && g === "\u2026") return "loading\u2026";
    return `anthropic / ${a} \u00b7 openai / ${o} \u00b7 gemini / ${g}`;
  })();

  return (
    <article className="max-w-3xl mx-auto px-4 py-12 text-slate-300 leading-relaxed">

      <header className="text-center mb-12 border-b border-slate-700 pb-10">
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-100 leading-snug mb-6">
          AutoPeace: LLM-based Autonomous Peace Deal Optimization for Geopolitical Conflict using Multi-Agent Systems
        </h1>
        <p className="text-base text-slate-200">Mohammad Keyhani</p>
        <p className="text-sm text-slate-400 mb-4">University of Calgary</p>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <a href="mailto:mkeyhani@ucalgary.ca" className="text-sky-400 hover:underline">mkeyhani@ucalgary.ca</a>
          <a href="https://profiles.ucalgary.ca/mohammad-keyhani" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1">Institutional Profile <ExternalLink className="w-3 h-3" /></a>
          <a href="https://www.linkedin.com/in/keyhanimo/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1">LinkedIn <ExternalLink className="w-3 h-3" /></a>
          <a href="https://www.digitvibe.com/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1">Blog <ExternalLink className="w-3 h-3" /></a>
        </div>
      </header>

      <nav className="mb-12">
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Table of Contents</h2>
        <ol className="text-sm text-slate-400 list-decimal list-inside space-y-1 columns-2">
          <li><a href="#abstract" className="hover:text-sky-400">Abstract</a></li>
          <li><a href="#related-work" className="hover:text-sky-400">Related Work</a></li>
          <li><a href="#system-architecture" className="hover:text-sky-400">System Architecture</a></li>
          <li><a href="#evidence-ingestion" className="hover:text-sky-400">Evidence Ingestion</a></li>
          <li><a href="#forecasting" className="hover:text-sky-400">Conflict Forecasting</a></li>
          <li><a href="#deal-optimization" className="hover:text-sky-400">Deal Optimization</a></li>
          <li><a href="#deal-memory" className="hover:text-sky-400">Deal Memory</a></li>
          <li><a href="#cba" className="hover:text-sky-400">Cost-Benefit Analysis</a></li>
          <li><a href="#scoring" className="hover:text-sky-400">Scoring Framework</a></li>
          <li><a href="#pareto" className="hover:text-sky-400">Pareto Frontier</a></li>
          <li><a href="#limitations" className="hover:text-sky-400">Limitations</a></li>
        </ol>
      </nav>

      <section id="abstract" className="mb-10">
        <h2 className="text-xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">1. Abstract</h2>
        <p className="mb-4">
          AutoPeace is an autonomous research system that performs two complementary tasks for the Iran-US-Israel conflict complex:
        </p>
        <p className="mb-2">
          <strong className="text-slate-200">Task A &mdash; Conflict Forecasting.</strong>{" "}
          Each research cycle, the system generates probability distributions across eight mutually exclusive conflict outcome states for five time horizons (10&nbsp;days, 30&nbsp;days, 90&nbsp;days, 180&nbsp;days, 1&nbsp;year), conditioned on the latest ingested evidence. Forecasting is a single-pass inference step: no experimentation, scoring optimization, or hill-climbing is applied to forecast outputs. The model produces one forecast per horizon per cycle, which is persisted and displayed on the dashboard.
        </p>
        <p className="mb-4">
          <strong className="text-slate-200">Task B &mdash; Autonomous Deal Optimization.</strong>{" "}
          A multi-stage pipeline (Stages&nbsp;0&ndash;8) generates, evaluates, and iteratively refines AI-originated peace deal proposals through adversarial red-teaming, stakeholder simulation, domestic political analysis, creative reframing, Pareto-optimal negotiation search, multi-model judicial scoring, self-improving prompt evolution, deal memory with provision-level learning, and radical architecture exploration.
        </p>
        <p className="mb-4">
          <strong className="text-slate-200">Independence of Tasks&nbsp;A and&nbsp;B.</strong>{" "}
          In the current implementation, the forecasting and deal optimization tasks are operationally independent. Both consume the same underlying evidence corpus (RSS feeds, ACLED, GDELT), but the probability distributions produced by Task&nbsp;A are not programmatically passed to or consumed by the deal optimization pipeline. The deal engine receives a two-layer evidence context (a strategic situation assessment synthesized from up to 150 evidence items, plus the 30 most recent items) but does not condition on the forecast probabilities. The two tasks run sequentially within each cycle&mdash;forecasting completes first, then the deal engine launches&mdash;and they share evidence ingestion infrastructure, but the information flow between them is limited to this shared evidence base. Tighter integration (e.g., conditioning deal generation on forecast-implied scenario weights) is a natural direction for future work.
        </p>
        <p>
          The core insight motivating this separation is that conflict forecasting and actionable peace proposal design are fundamentally different optimization problems. Forecasting asks "what will happen?"; deal optimization asks "what arrangement could work?" The latter requires a separate loop grounded in cost-benefit analysis, stakeholder game theory, and adversarial stress testing.
        </p>
      </section>

      <section id="related-work" className="mb-10">
        <h2 className="text-xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">2. Related Work: Karpathy&rsquo;s Autoresearch Paradigm</h2>
        <p className="mb-4">
          AutoPeace extends the paradigm articulated in Andrej Karpathy&rsquo;s autoresearch project&mdash;the idea that LLMs can be orchestrated to perform successive refinement of research artifacts within an automated loop, where the system &ldquo;grades its own homework&rdquo; using adversarial evaluation and measurable scoring functions. AutoPeace builds on this foundation in several ways:
        </p>
        <p className="mb-3">
          <strong className="text-slate-200">Successive refinement over state.</strong>{" "}
          AutoPeace treats outputs as state to be iteratively refined across cycles. In deal optimization (Task&nbsp;B), each cycle generates a fresh proposal informed by the previous deal&rsquo;s failure diagnosis, then compares its composite score to the current best deal, retaining whichever scores higher&mdash;true hill-climbing over the composite score. Task&nbsp;B embodies the core autoresearch principle: LLM output is not the final product but the starting point for automated improvement. Forecasting (Task&nbsp;A), by contrast, produces a single evidence-conditioned forecast per cycle without iterative refinement.
        </p>
        <p className="mb-3">
          <strong className="text-slate-200">LLM-as-Judge with generation/evaluation independence.</strong>{" "}
          In the deal optimization pipeline, the system enforces a strict architectural constraint: the model that generates a deal proposal must never be the same model that evaluates it. This is enforced at the code level&mdash;the system throws an error if the generation and evaluation providers are identical. Cross-provider design ensures no single model&rsquo;s biases dominate both generation and evaluation.
        </p>
        <p className="mb-3">
          <strong className="text-slate-200">Adversarial multi-provider debate.</strong>{" "}
          Where Karpathy&rsquo;s autoresearch uses a single model with self-critique, AutoPeace distributes adversarial roles across three independent LLM providers (Anthropic Claude, OpenAI GPT, Google Gemini). The Proposal Agent generates, the Red-Team Agent attacks, and the Judge Panel (all three providers) scores independently.
        </p>
        <p className="mb-3">
          <strong className="text-slate-200">Measurable scoring functions.</strong>{" "}
          AutoPeace defines concrete, computable scoring functions for deal optimization using a 7-dimension weighted composite score (feasibility, coherence, evidence grounding, domestic sellability, regional stability, implementability, durability). These replace subjective quality judgments with quantitative optimization targets that drive the hill-climbing loop.
        </p>
        <p>
          <strong className="text-slate-200">Self-diagnosis, feedback, and prompt evolution.</strong>{" "}
          Each deal cycle produces a Diagnosis (Stage&nbsp;8) explaining why a deal failed or underperformed. This diagnosis is injected as input to the next cycle&rsquo;s Proposal Agent, creating a closed feedback loop. Additionally, the Meta-Evaluator (Stage&nbsp;7) suggests prompt improvements for the pipeline itself, which are adopted through a score-gated hill-climbing mechanism. The system does not just improve its deals; it improves the process by which it generates and evaluates deals.
        </p>
      </section>

      <section id="system-architecture" className="mb-10">
        <h2 className="text-xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">3. System Architecture Overview</h2>
        <p className="mb-4">
          The system runs on a configurable schedule (hourly, daily, weekly, or manual trigger). Each cycle executes the following steps sequentially:
        </p>
        <ol className="list-decimal list-outside ml-6 space-y-3 text-sm">
          <li>
            <strong className="text-slate-200">Evidence Ingestion</strong> &mdash; Ingest from RSS feeds, ACLED, and GDELT; filter for Iran-relevance; classify by type (military, diplomatic, economic, humanitarian, political).
          </li>
          <li>
            <strong className="text-slate-200">Stakeholder Profile Updates</strong> &mdash; Newly ingested evidence items are grouped by stakeholder relevance and fed to an LLM that proposes updates to each stakeholder&rsquo;s goals, red lines, constraints, and profile summary. Updates are written back to the database so that subsequent pipeline stages use the most current stakeholder intelligence.
          </li>
          <li>
            <strong className="text-slate-200">Proposal Extraction</strong> &mdash; Scan ingested evidence for real-world peace proposals mentioned in news; extract structured deal terms and store them for reference by the deal engine.
          </li>
          <li>
            <strong className="text-slate-200">Conflict Forecasting (Task&nbsp;A)</strong> &mdash; Generate probability distributions across 5 time horizons (10d, 30d, 90d, 180d, 1y) for 8 outcome states using the forecasting model <ModelTag value={stm(null, "forecasting")} />.
          </li>
          <li>
            <strong className="text-slate-200">Deal Optimization (Task&nbsp;B)</strong> &mdash; Before launching the 8-stage deal evaluation pipeline, the system generates a two-layer evidence context: (1)&nbsp;a Strategic Situation Assessment&mdash;an LLM-synthesized narrative covering the full conflict trajectory, drawn from up to 150 evidence items; and (2)&nbsp;a Recent Tactical Developments briefing from the 30 most recent items. Both layers are threaded through all pipeline stages. Task&nbsp;B then runs as a separate async process that generates, tests, and scores a new peace deal proposal, managing its own persistence, Pareto frontier updates, and solution tree recording.
          </li>
          <li>
            <strong className="text-slate-200">Persistence</strong> &mdash; Store forecast results in the database. Generate a changelog entry summarizing the cycle&rsquo;s key findings.
          </li>
        </ol>
        <p className="mt-4 text-sm">
          Budget controls prevent runaway costs: each cycle checks cumulative spend against a configurable USD cap before proceeding. The scheduler also respects admin pause flags.
        </p>
      </section>

      <section id="evidence-ingestion" className="mb-10">
        <h2 className="text-xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">4. Evidence Ingestion Pipeline</h2>
        <p className="mb-4">
          The system ingests structured and unstructured data from three primary sources:
        </p>
        <p className="mb-2">
          <strong className="text-slate-200">RSS Feeds.</strong>{" "}
          A configurable set of news feeds (Al Jazeera, Reuters, AP News, BBC, etc.) parsed via the <code>rss-parser</code> library. Each item is keyword-filtered against a curated set of Iran-relevant terms (including: iran, tehran, nuclear, iaea, sanctions, irgc, hezbollah, hamas, houthi, strait of hormuz, jcpoa, enrichment, centrifuge, etc.).
        </p>
        <p className="mb-2">
          <strong className="text-slate-200">ACLED (Armed Conflict Location &amp; Event Data).</strong>{" "}
          Conflict event data covering battles, explosions, protests, and strategic developments, filtered to the Iran-Israel-Gulf region and classified by event type.
        </p>
        <p className="mb-4">
          <strong className="text-slate-200">GDELT (Global Database of Events, Language, and Tone).</strong>{" "}
          High-frequency event data providing sentiment analysis and conflict intensity indicators, filtered by Iran-related actor codes and themes.
        </p>
        <p>
          All evidence is deduplicated using stable SHA-256 hashes derived from source, URL, and publication timestamp. Each item is automatically classified into one of five evidence types: military, diplomatic, economic, humanitarian, or political. Evidence items are linked to the cycle and forecast they influenced, enabling full provenance tracking from raw data to probability output.
        </p>
      </section>

      <section id="forecasting" className="mb-10">
        <h2 className="text-xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">5. Task A: Conflict Forecasting</h2>
        <p className="mb-4">
          The forecasting component produces probability distributions over eight mutually exclusive and collectively exhaustive (MECE) conflict outcome states across five time horizons. Forecasting is a straightforward inference task: each cycle, the model receives the latest evidence and produces a single set of probability distributions. No experimentation, automated scoring, or iterative refinement is applied to forecast outputs.
        </p>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">5.1 Outcome Taxonomy</h3>
        <p className="mb-3">The system uses a rigid taxonomy of 8 MECE states. Probabilities across all states must sum to 1.0 and are automatically normalized if they do not:</p>
        <ol className="list-decimal list-outside ml-6 space-y-1 text-sm mb-4">
          <li><strong className="text-red-400">Continued Conflict:</strong> Status quo friction without major escalation.</li>
          <li><strong className="text-amber-400">Informal De-escalation:</strong> Unspoken throttling of hostilities.</li>
          <li><strong className="text-amber-300">Limited Ceasefire:</strong> Temporary, tactical pause in kinetic action.</li>
          <li><strong className="text-emerald-300">Humanitarian Mini-Deal:</strong> Narrow agreements on hostage or aid access.</li>
          <li><strong className="text-emerald-400">Sanctions Partial Deal:</strong> Economic relief in exchange for specific concessions.</li>
          <li><strong className="text-emerald-500">Regional Framework:</strong> Broad multi-lateral security architecture.</li>
          <li><strong className="text-sky-400">Broad Settlement:</strong> Comprehensive, enduring peace treaty.</li>
          <li><strong className="text-red-700">Major Escalation:</strong> Severe expansion of kinetic theater.</li>
        </ol>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">5.2 Time Horizons</h3>
        <p className="mb-4">
          Forecasts are generated independently for five time horizons: 10&nbsp;days, 30&nbsp;days, 90&nbsp;days, 180&nbsp;days, and 1&nbsp;year. Each horizon receives its own prompt with identical evidence but horizon-specific framing.
        </p>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">5.3 Forecasting Model</h3>
        <p className="mb-3">
          Forecasts are generated by the configured forecasting model <ModelTag value={stm(null, "forecasting")} />, prompted as a &ldquo;Bayesian conflict forecasting model specializing in the Iran-US-Israel conflict complex.&rdquo; The model receives:
        </p>
        <ul className="list-disc list-outside ml-6 space-y-1 text-sm mb-4">
          <li>The 30 most recent evidence items (with source, title, evidence type, publication date, and up to 300 characters of text per item)</li>
          <li>The 8-state outcome taxonomy with instructions to produce a valid probability distribution summing to 1.0</li>
          <li>A requirement to provide rationale and cite key evidence items for each forecast</li>
        </ul>
        <p>
          All five time-horizon forecasts are processed in parallel with a concurrency limit of 2 and up to 2 retries per horizon. Raw LLM probability outputs are normalized to ensure they sum to exactly 1.0, with any missing states receiving zero probability before normalization.
        </p>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">5.4 Persistence</h3>
        <p>
          Each cycle&rsquo;s forecasts are persisted to the database. The most recent forecast for each time horizon is marked as &ldquo;current&rdquo; and displayed on the dashboard. Historical forecasts are retained for trend analysis and comparison across cycles, but no automated quality metric (e.g., Brier score) is computed or used to select between forecast variants. Forecasting does not use a scoring or optimization loop.
        </p>
      </section>

      <section id="deal-optimization" className="mb-10">
        <h2 className="text-xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">6. Task B: Autonomous Deal Optimization</h2>
        <p className="mb-4">
          Task&nbsp;B is a separate autoresearch loop triggered after each forecasting cycle completes. It generates a fresh proposal each cycle&mdash;informed by the latest evidence, the previous deal&rsquo;s failure diagnosis, and a deal memory context encoding lessons from all prior deals&mdash;then evaluates it through a multi-stage pipeline (Stage&nbsp;0 through Stage&nbsp;8) where different LLM providers are deliberately assigned to different stages to ensure adversarial independence. The pipeline cycles sequentially through 8 deal architectures, ensuring each receives equal representation. If the new deal scores equal to or higher than the current best, it replaces it&mdash;ties are broken in favor of the newer deal because it reflects the most current evidence context.
        </p>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">6.1 Deal Architecture Selection</h3>
        <p className="mb-3">
          Each cycle selects one of eight deal architectures. The system cycles through all architectures sequentially. The architecture determines the primary sequencing, emphasis, and creative approach:
        </p>
        <ol className="list-decimal list-outside ml-6 space-y-1 text-sm mb-4">
          <li><strong className="text-slate-200">Balanced:</strong> Equal priority across nuclear, sanctions, and maritime dimensions.</li>
          <li><strong className="text-slate-200">Nuclear-First:</strong> Comprehensive nuclear rollback as the prerequisite for any relief.</li>
          <li><strong className="text-slate-200">Hormuz-First:</strong> Maritime security framework as the foundation enabling economic normalization.</li>
          <li><strong className="text-slate-200">Humanitarian-First:</strong> Immediate humanitarian corridor as the trust-building prerequisite.</li>
          <li><strong className="text-slate-200">Radical Restructure:</strong> Rejects incremental diplomacy entirely; proposes fundamental paradigm shifts, novel governance structures, or entirely new categories of agreement.</li>
          <li><strong className="text-slate-200">Asymmetric Grand Bargain:</strong> Creates deliberately lopsided exchanges where one party makes a bold, disproportionate concession in exchange for asymmetric gains elsewhere.</li>
          <li><strong className="text-slate-200">Incremental Confidence-Building:</strong> Designs a sequence of micro-steps, each independently reversible and low-risk, that collectively build the trust infrastructure needed for larger agreements.</li>
          <li><strong className="text-slate-200">Freeform:</strong> Unconstrained creative exploration with no predefined structural template.</li>
        </ol>
        <p>
          Architecture selection uses a dual mechanism: sequential cycling advances through all 8 architectures in order, and stall-triggered randomization switches to a randomly selected architecture when 3 or more consecutive cycles fail to improve scores.
        </p>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">6.2 The Multi-Stage Pipeline</h3>
        <p className="mb-4">
          Each deal passes through the following stages. Default provider assignments enforce generation/evaluation independence:
        </p>
        <div className="space-y-4 text-sm">
          <div className="border-l-2 border-slate-600 pl-4">
            <p className="font-semibold text-slate-200 mb-1">Stage 0: Innovation Brainstorm <ModelTag value={stm(null, "generation")} /></p>
            <p>Before formal proposal generation, the system conducts an extended creative brainstorm. This stage receives deal memory context from past cycles (Section&nbsp;7), mines historical peace deal analogies (Camp David, Good Friday Agreement, JCPOA, etc.), generates creative provisions beyond standard diplomatic categories, discovers cross-issue linkages, and explores unconventional approaches. To enforce provision diversity, the prompt includes an explicit &ldquo;do not repeat&rdquo; list of all provision titles from previous deals. When a radical architecture is selected, the brainstorm receives architecture-specific creative directives. A fallback system selects from a pool of 12 diverse provisions if parsing fails.</p>
          </div>
          <div className="border-l-2 border-slate-600 pl-4">
            <p className="font-semibold text-slate-200 mb-1">Stage 1: Proposal Agent <ModelTag value={stm(1, "generation")} /></p>
            <p>Designs initial deal terms across 7 standard dimensions plus innovative provisions. The agent receives the Stage&nbsp;0 brainstorm insights, deal memory context (top-performing past deals, successful vs. harmful provisions with score delta data, stakeholder verdict patterns), the two-layer evidence context, the previous cycle&rsquo;s failure diagnosis, the selected architecture focus, hard CBA economic data, and any evolved pipeline overrides. A diversified fallback pool of 8 provisions ensures variety even when LLM parsing fails.</p>
          </div>
          <div className="border-l-2 border-slate-600 pl-4">
            <p className="font-semibold text-slate-200 mb-1">Stage 2: Stakeholder Evaluator <ModelTag value={stm(2, "evaluation")} /></p>
            <p>Assesses how each of 33 stakeholders across 4 acceptance tiers would respond to the proposed deal. Stakeholder profiles are loaded from the database, reflecting the latest evidence-driven updates. Required tier (Iran, US)&mdash;both must accept; rejection triggers graduated penalties. Critical tier (Israel)&mdash;rejection triggers penalties on feasibility, durability, and regional stability. Influential tier (Saudi Arabia, IAEA, Russia, China, EU3)&mdash;affects durability and regional stability. Contextual tier (15 regional and global actors)&mdash;affects regional stability. Each stakeholder returns a verdict: accept, conditional, or reject, with rationale.</p>
          </div>
          <div className="border-l-2 border-slate-600 pl-4">
            <p className="font-semibold text-slate-200 mb-1">Stage 3: Domestic Audience Agent <ModelTag value={stm(3, "evaluation")} /></p>
            <p>Assesses domestic political sellability across 11 audiences in 3 key countries: Iran (Supreme Leader, IRGC, reformists, public), US (Congress, Pentagon, Israel lobby, public), and Israel (Knesset hardliners, security establishment, center-left coalition). Returns a verdict per audience: sellable, difficult, or unsellable.</p>
          </div>
          <div className="border-l-2 border-slate-600 pl-4">
            <p className="font-semibold text-slate-200 mb-1">Stage 3.5: Creative Reframing <ModelTag value={stm(null, "generation")} /></p>
            <p>After domestic audience evaluation reveals which audiences find the deal &ldquo;difficult&rdquo; or &ldquo;unsellable,&rdquo; this stage generates domestic selling narratives for each problematic audience. Rather than changing deal terms, it reframes existing provisions as victories within each audience&rsquo;s value framework. Each strategy includes a framing narrative, key talking points, a historical analogy, and a risk-of-backfire assessment.</p>
          </div>
          <div className="border-l-2 border-slate-600 pl-4">
            <p className="font-semibold text-slate-200 mb-1">Stage 4: Red-Team Agent <ModelTag value={stm(4, "adversarial")} /></p>
            <p>Generates 5 adversarial attack scenarios designed to expose fatal flaws. The red-team agent receives the latest evidence summary to identify situation-specific attack vectors. Each attack specifies a concrete description, severity level, proponent response, and whether the deal survives.</p>
          </div>
          <div className="border-l-2 border-slate-600 pl-4">
            <p className="font-semibold text-slate-200 mb-1">Stage 5: Creative Negotiator <ModelTag value={stm(5, "generation")} /></p>
            <p>Analyzes rejecting and conditional stakeholders, domestic framing strategies, and the full context of stakeholder interests to search for creative Pareto-improving tradeoffs. Outputs include specific creative tradeoffs (describing what each side gives/gets and why it is a Pareto improvement), targeted amendments per stakeholder, and revised terms.</p>
          </div>
          <div className="border-l-2 border-slate-600 pl-4">
            <p className="font-semibold text-slate-200 mb-1">Stage 6: Judge Panel <span className="text-xs text-slate-500 ml-1">{judgeLabel}</span></p>
            <p>A panel of three independent LLM judges (Anthropic, OpenAI, Gemini) each score the deal on 7 dimensions with rationale. Each judge receives the latest evidence summary, which is important for the Evidence Grounding dimension. Scores are averaged across providers. This multi-model scoring prevents any single model&rsquo;s biases from dominating. See Section&nbsp;9 for the scoring framework.</p>
          </div>
          <div className="border-l-2 border-slate-600 pl-4">
            <p className="font-semibold text-slate-200 mb-1">Stage 7: Meta-Evaluator <ModelTag value={stm(7, "evaluation")} /></p>
            <p>Assesses the quality of the pipeline&rsquo;s own reasoning process, not the deal itself. Identifies blindspots, rates overall pipeline quality (0&ndash;1), suggests which architecture to try next, and outputs prompt improvement suggestions for each stage. These suggestions feed into the pipeline hill-climbing mechanism (Section&nbsp;6.4).</p>
          </div>
          <div className="border-l-2 border-slate-600 pl-4">
            <p className="font-semibold text-slate-200 mb-1">Stage 8: Diagnosis Generator <ModelTag value={stm(8, "adversarial")} /></p>
            <p>Produces a human-readable diagnosis of why the deal succeeded or faces difficulties. Focuses on which stakeholder objections and structural weaknesses are most critical. This diagnosis is fed forward as input to the next cycle&rsquo;s Proposal Agent (Stage&nbsp;1), closing the autoresearch feedback loop.</p>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">6.3 Model Configuration &amp; Independence Enforcement</h3>
        <p className="mb-3">
          The system uses a three-tier model resolution hierarchy with the highest specificity winning:
        </p>
        <ol className="list-decimal list-outside ml-6 space-y-1 text-sm mb-3">
          <li><strong className="text-slate-200">Per-agent stage override</strong> (e.g., <code>stage4Provider = "gemini"</code>)&mdash;highest priority.</li>
          <li><strong className="text-slate-200">Per-role bucket</strong> (e.g., <code>adversarialProvider = "gemini"</code>)&mdash;applies to all stages with that role.</li>
          <li><strong className="text-slate-200">Legacy per-provider model</strong> (e.g., <code>geminiModel = "gemini-3.1-pro-preview"</code>)&mdash;global fallback.</li>
        </ol>
        <p>
          A hard validation check ensures generation and evaluation providers are always different: <code>if (generationProvider === evaluationProvider) throw Error</code>. This is the system&rsquo;s core architectural invariant for preventing self-grading.
        </p>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">6.4 Pipeline Hill-Climbing (Self-Improving Prompts)</h3>
        <p className="mb-4">
          Beyond iterating on deal content, the system also iterates on its own prompts. After each deal cycle, the Meta-Evaluator (Stage&nbsp;7) suggests specific prompt improvements. These suggestions are subject to a score-gated acceptance criterion:
        </p>
        <p className="mb-2">
          <strong className="text-slate-200">Data collection.</strong>{" "}
          Each pipeline configuration must produce at least 2 deals before the system considers evolving to the next generation. This prevents premature abandonment of a promising configuration based on a single noisy data point.
        </p>
        <p className="mb-2">
          <strong className="text-slate-200">Score-gated promotion.</strong>{" "}
          New prompt overrides are adopted only when the current cycle&rsquo;s composite score exceeds the running average of the current configuration by a minimum threshold, ensuring the system climbs uphill on deal quality.
        </p>
        <p className="mb-2">
          <strong className="text-slate-200">Cumulative overrides.</strong>{" "}
          Accepted improvements are applied as cumulative addenda to stage prompts. Each generation builds on the previous, creating a growing set of learned instructions. Override keys map to specific stages: <code>brainstorm_system</code>, <code>proposal_system</code>, <code>framing_system</code>, <code>negotiator_system</code>, etc.
        </p>
        <p>
          <strong className="text-slate-200">Lineage tracking.</strong>{" "}
          Each configuration stores its parent config ID, generation number, average composite score, and deal count. This creates a full evolutionary lineage of the pipeline&rsquo;s prompt evolution over time, stored in the <code>pipeline_evolution</code> database table.
        </p>
      </section>

      <section id="deal-memory" className="mb-10">
        <h2 className="text-xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">7. Deal Memory &amp; Provision-Level Learning</h2>
        <p className="mb-4">
          Beyond iterating on prompts (Section&nbsp;6.4), the system also learns from the substantive content of past deals. Each cycle, before generating a new proposal, the system builds a structured memory context from its entire deal history and injects it into the brainstorm (Stage&nbsp;0) and proposal generation (Stage&nbsp;1) stages.
        </p>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">7.1 Deal History Context</h3>
        <p className="mb-3">
          The system queries the top 5 highest-scoring deals from the database and extracts structured context for each:
        </p>
        <ul className="list-disc list-outside ml-6 space-y-1 text-sm mb-4">
          <li>Architecture used and composite score achieved</li>
          <li>Key deal terms (nuclear protocol, sanctions relief, sequencing, Hormuz arrangements)</li>
          <li>Innovative provisions with their historical performance data (score delta vs. parent deal)</li>
          <li>Stakeholder verdicts and rationale from each evaluating party</li>
          <li>Diagnosis text explaining what worked and what failed</li>
        </ul>
        <p>
          This context allows the brainstorm and proposal stages to reason about what has actually worked in past iterations. The prompt explicitly highlights provisions that historically improved scores and those that hurt scores, enabling the LLM to make informed decisions about which mechanisms to retain, adapt, or avoid.
        </p>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">7.2 Provision-Level Learning</h3>
        <p className="mb-3">
          The system tracks the performance of individual innovative provisions across all deals in a dedicated <code>provision_outcomes</code> database table. After each deal cycle completes, the system records for each provision:
        </p>
        <ul className="list-disc list-outside ml-6 space-y-1 text-sm mb-4">
          <li><strong className="text-slate-200">Score delta:</strong> The difference between the deal&rsquo;s composite score and its parent deal&rsquo;s score. A positive delta indicates the provision appeared in a deal that improved on its predecessor.</li>
          <li><strong className="text-slate-200">Dimension-level deltas:</strong> Per-dimension score changes across all 7 scoring dimensions, revealing which dimensions a provision helps or hurts.</li>
          <li><strong className="text-slate-200">Stakeholder reactions:</strong> A record of how each stakeholder responded (accept, conditional, reject) when this provision was part of the deal.</li>
          <li><strong className="text-slate-200">Category &amp; architecture:</strong> Provisions are categorized (nuclear, economic, security, humanitarian, governance, verification, or novel) and tagged with the architecture that produced them.</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">7.3 Aggregated Provision Insights</h3>
        <p className="mb-3">
          The system aggregates provision-level data into actionable insights injected into the brainstorm and proposal prompts:
        </p>
        <ul className="list-disc list-outside ml-6 space-y-1 text-sm mb-4">
          <li><strong className="text-slate-200">Usage count:</strong> How many times a provision type has been tried across all deals.</li>
          <li><strong className="text-slate-200">Average score delta:</strong> Whether including this provision tends to improve or worsen overall deal quality.</li>
          <li><strong className="text-slate-200">Best and worst dimensions:</strong> Which scoring dimensions benefit most and least from this provision.</li>
        </ul>
        <p>
          These insights create a genuine learning signal: the system can identify, for example, that &ldquo;digital verification protocols&rdquo; have appeared in 4 deals with an average score improvement of +3.2 percentage points, while &ldquo;immediate full sanctions removal&rdquo; has appeared in 3 deals with an average decrease of &minus;5.1 percentage points.
        </p>
      </section>

      <section id="cba" className="mb-10">
        <h2 className="text-xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">8. Cost-Benefit Analysis Modeling</h2>
        <p className="mb-4">
          The CBA framework is injected directly into the Proposal Agent&rsquo;s prompt context (Stage&nbsp;1) and the Judge Panel&rsquo;s scoring prompt (Stage&nbsp;6), ensuring that deal generation and evaluation are grounded in economic reality rather than pure diplomatic reasoning.
        </p>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">8.1 War vs. Peace Framework</h3>
        <p className="mb-4">
          The modeling approach treats war and peace as alternative states of the same system using consistent accounting rules. The delta (&Delta;) between states represents the &ldquo;Peace Dividend&rdquo; or &ldquo;War Cost.&rdquo; Annual estimates used in prompts: ongoing conflict cost of ~$450B/yr globally in GDP-equivalent losses; durable peace benefit of ~$560B/yr&mdash;a $1T/yr aggregate swing.
        </p>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">8.2 Economic Channels</h3>
        <p className="mb-3">
          Impacts are decomposed across specific channels with war cost / peace gain estimates (USD billions per year) provided to the LLM agents:
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="text-left p-2 text-slate-200">Channel</th>
                <th className="text-right p-2 text-slate-200">War Cost</th>
                <th className="text-right p-2 text-slate-200">Peace Gain</th>
              </tr>
            </thead>
            <tbody className="text-slate-400">
              <tr className="border-b border-slate-700/50"><td className="p-2">Trade &amp; Sanctions</td><td className="text-right p-2">$75B</td><td className="text-right p-2">$122B</td></tr>
              <tr className="border-b border-slate-700/50"><td className="p-2">Energy Markets (incl. transfers)</td><td className="text-right p-2">$113B</td><td className="text-right p-2">$133B</td></tr>
              <tr className="border-b border-slate-700/50"><td className="p-2">Shipping &amp; Insurance</td><td className="text-right p-2">$55B</td><td className="text-right p-2">$69B</td></tr>
              <tr className="border-b border-slate-700/50"><td className="p-2">Finance &amp; Banking</td><td className="text-right p-2">$55B</td><td className="text-right p-2">$82B</td></tr>
              <tr className="border-b border-slate-700/50"><td className="p-2">Defense &amp; Security</td><td className="text-right p-2">$72B</td><td className="text-right p-2">$39B</td></tr>
              <tr className="border-b border-slate-700/50"><td className="p-2">Aviation &amp; Tourism</td><td className="text-right p-2">$30B</td><td className="text-right p-2">$45B</td></tr>
              <tr className="border-b border-slate-700/50"><td className="p-2">Humanitarian</td><td className="text-right p-2">$28B</td><td className="text-right p-2">$26B</td></tr>
              <tr className="border-b border-slate-700/50"><td className="p-2">Productivity &amp; FDI</td><td className="text-right p-2">$28B</td><td className="text-right p-2">$56B</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">8.3 Stakeholder-Specific Incentives</h3>
        <p className="mb-3">
          The Proposal Agent is told which actors bear the highest costs and stand to gain the most from peace, ensuring deals are designed with realistic incentive structures:
        </p>
        <ul className="list-disc list-outside ml-6 space-y-1 text-sm mb-4">
          <li><strong className="text-slate-200">Iran:</strong> $87B cost &rarr; $142B peace benefit</li>
          <li><strong className="text-slate-200">US:</strong> $52B cost &rarr; $38B peace benefit</li>
          <li><strong className="text-slate-200">Israel:</strong> $43B cost &rarr; $35B peace benefit</li>
          <li><strong className="text-slate-200">Europe:</strong> $42B cost &rarr; $55B peace benefit</li>
          <li><strong className="text-slate-200">China:</strong> $35B cost &rarr; $48B peace benefit</li>
        </ul>
        <p>
          This CBA context directs the LLM to design deals that address the channels where the largest economic gains are achievable and ensure stakeholders who bear the highest costs have clear incentives to participate. The Judge Panel receives the same data for scoring regional stability and feasibility.
        </p>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">8.4 Conceptual Framework: Three-Ledger Accounting</h3>
        <p className="mb-3">
          The CBA estimates are informed by a three-ledger conceptual framework designed to avoid double-counting errors common in conflict economics:
        </p>
        <ol className="list-decimal list-outside ml-6 space-y-1 text-sm mb-4">
          <li><strong className="text-slate-200">Real Resource Losses/Gains:</strong> Physical destruction, lost production, productivity changes&mdash;genuine deadweight costs.</li>
          <li><strong className="text-slate-200">Transfers and Redistribution:</strong> Commodity price shifts that help exporters but hurt importers&mdash;zero-sum at the global level.</li>
          <li><strong className="text-slate-200">Risk and Option Value:</strong> Changes in sovereign spreads, insurance premiums, and strategic leverage&mdash;including Iran&rsquo;s &ldquo;Wartime Rents&rdquo; (the value of selective-access tolls and deterrence leverage that peace would eliminate).</li>
        </ol>
        <p>
          The third ledger is conceptually critical: it prevents naive overestimation of peace benefits by recognizing that some actors derive strategic value from the conflict status quo that a peace deal must compensate for.
        </p>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">8.5 CBA Integration Scope</h3>
        <p className="mb-2">
          <strong className="text-slate-200">Task&nbsp;B (Deal Optimization)&mdash;uses CBA data.</strong>{" "}
          The deal engine embeds CBA summary figures as static prompt context at multiple stages: Stage&nbsp;0 receives high-level economic context; Stage&nbsp;1 receives detailed per-channel and per-stakeholder breakdowns; Stage&nbsp;6 receives aggregate economic context to ground scoring.
        </p>
        <p className="mb-2">
          <strong className="text-slate-200">Task&nbsp;A (Conflict Forecasting)&mdash;does not use CBA data.</strong>{" "}
          The forecasting pipeline is entirely independent of economic modeling. It relies on evidence ingestion and probability estimation across 8 outcome states. No cost-benefit figures are included in forecasting prompts.
        </p>
        <p>
          <strong className="text-slate-200">Costs Explorer page&mdash;independent visualization layer.</strong>{" "}
          The interactive CBA page provides a standalone analytical tool for exploring the economic case for peace. Its frontend calculations are performed independently and are not programmatically consumed by any backend pipeline. The CBA figures embedded in the deal engine&rsquo;s prompts are maintained separately.
        </p>
      </section>

      <section id="scoring" className="mb-10">
        <h2 className="text-xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">9. Scoring &amp; Evaluation Framework</h2>

        <h3 className="text-lg font-semibold text-slate-200 mt-4 mb-3">9.1 Forecasting (Task&nbsp;A)</h3>
        <p className="mb-4">
          Forecasting does not use a scoring or optimization loop. Each cycle generates a single set of probability distributions across 5 time horizons conditioned on the latest evidence. Historical forecasts are retained for trend comparison, but no automated quality metric is computed or used.
        </p>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">9.2 Deal Scoring (Task&nbsp;B)</h3>
        <p className="mb-3">
          Deal evaluation is fundamentally forward-looking&mdash;it does not use historical backtesting. Quality is assessed through multi-agent LLM stakeholder simulations (33 stakeholders across 4 acceptance tiers, 11 domestic audiences, adversarial red-teaming) grounded in cost-benefit economic modeling. The Judge Panel (Stage&nbsp;6) synthesizes these simulation results and scores each deal on 7 dimensions, each rated 0.0 to 1.0 with rationale:
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="text-left p-2 text-slate-200">Dimension</th>
                <th className="text-right p-2 text-slate-200">Weight</th>
                <th className="text-left p-2 text-slate-200">Description</th>
              </tr>
            </thead>
            <tbody className="text-slate-400">
              <tr className="border-b border-slate-700/50"><td className="p-2 text-slate-300">Feasibility</td><td className="text-right p-2">15%</td><td className="p-2">Likelihood the deal gets signed by all required parties.</td></tr>
              <tr className="border-b border-slate-700/50"><td className="p-2 text-slate-300">Coherence</td><td className="text-right p-2">15%</td><td className="p-2">Do the terms form a logically consistent, non-contradictory package?</td></tr>
              <tr className="border-b border-slate-700/50"><td className="p-2 text-slate-300">Evidence Grounding</td><td className="text-right p-2">12%</td><td className="p-2">Are the terms responsive to current geopolitical reality?</td></tr>
              <tr className="border-b border-slate-700/50"><td className="p-2 text-slate-300">Domestic Sellability</td><td className="text-right p-2">15%</td><td className="p-2">Could domestic political audiences in key states accept this?</td></tr>
              <tr className="border-b border-slate-700/50"><td className="p-2 text-slate-300">Regional Stability</td><td className="text-right p-2">13%</td><td className="p-2">Does this deal reduce regional conflict risk?</td></tr>
              <tr className="border-b border-slate-700/50"><td className="p-2 text-slate-300">Implementability</td><td className="text-right p-2">15%</td><td className="p-2">Can the terms be practically implemented and sequenced?</td></tr>
              <tr className="border-b border-slate-700/50"><td className="p-2 text-slate-300">Durability</td><td className="text-right p-2">15%</td><td className="p-2">Will this deal hold under stress and changing political conditions?</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mb-4">
          The composite score is the weighted sum: Composite = &Sigma;(dimension<sub>i</sub> &times; weight<sub>i</sub>). Scores are classified into three quality tiers: <strong className="text-emerald-400">Viable</strong> (&ge;65%), <strong className="text-amber-400">Marginal</strong> (45% to &lt;65%), and <strong className="text-red-400">Weak</strong> (&lt;45%). A deal scoring below 35% composite is marked as &ldquo;stalled.&rdquo;
        </p>
        <p className="mb-4">
          <strong className="text-slate-200">Graduated acceptance penalties</strong> enforce the acceptance hierarchy using a diminishing floor model. Each penalty is computed as diminish(score, floor, strength) = floor + (score &minus; floor) &times; strength, which compresses a dimension toward a floor value without collapsing it to near-zero. For Required-tier rejections: feasibility and durability are compressed toward 0.10 with strength 0.35, and implementability toward 0.15 with strength 0.40. For Critical-tier rejections: feasibility is compressed toward 0.20 with strength 0.50, durability toward 0.25 with strength 0.55, and regional stability toward 0.20 with strength 0.50. After per-dimension penalties, the composite score receives additive offsets: &minus;0.10 for Required-tier rejection and &minus;0.05 for Critical-tier rejection (with a floor of 0.0).
        </p>
        <p>
          Each judge provides per-dimension rationale, merged across providers using pipe-delimited concatenation. The Deal Dashboard displays per-dimension scores with individual model tabs, allowing users to compare how each LLM judge scored each dimension independently.
        </p>
      </section>

      <section id="pareto" className="mb-10">
        <h2 className="text-xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">10. Pareto Frontier &amp; Solution Tree</h2>

        <h3 className="text-lg font-semibold text-slate-200 mt-4 mb-3">10.1 Pareto Frontier</h3>
        <p className="mb-4">
          The system maintains a set of non-dominated deals&mdash;the Pareto frontier. A deal is dominated (and removed from the frontier) if and only if another deal is equal or better on all 7 scoring dimensions AND strictly better on at least one. This preserves deals with different trade-off profiles (e.g., a deal with high feasibility but lower durability coexists with one showing the opposite pattern).
        </p>

        <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">10.2 Solution Tree</h3>
        <p className="mb-3">
          Every deal is recorded as a node in a tree structure. Each node stores:
        </p>
        <ul className="list-disc list-outside ml-6 space-y-1 text-sm mb-4">
          <li>Parent node (the deal it was derived from)</li>
          <li>Architecture used</li>
          <li>Depth in the tree (number of iterations from root)</li>
          <li>Whether it is stalled (composite &lt; 0.35)</li>
          <li>Whether it is the best in its branch</li>
          <li>Composite score</li>
        </ul>
        <p>
          When the stall count for an architecture under the current parent node reaches the threshold of 3, the system automatically branches to a different architecture, creating a tree where different branches explore fundamentally different negotiation strategies.
        </p>
      </section>

      <section id="limitations" className="mb-10">
        <h2 className="text-xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">11. Limitations &amp; Disclaimer</h2>
        <ul className="list-disc list-outside ml-6 space-y-2 text-sm">
          <li>Forecasts are probabilistic estimates produced by AI models and are not verified ground truth. All probabilities should be interpreted with appropriate epistemic humility.</li>
          <li>Evidence is sourced from public RSS feeds, GDELT, and ACLED&mdash;all subject to reporting lag, bias, and incompleteness. Classified intelligence, private diplomatic channels, and real-time military data are not available to the system.</li>
          <li>LLM forecasters may exhibit hallucination, anchoring bias, or training cutoff limitations. The adversarial multi-provider architecture mitigates but cannot eliminate these risks.</li>
          <li>Task&nbsp;A (forecasting) generates a single forecast per cycle without experimentation or scoring optimization. Deal evaluation (Task&nbsp;B) uses forward-looking CBA modeling and multi-agent LLM stakeholder simulations with a 7-dimension composite scoring function.</li>
          <li>Task&nbsp;A and Task&nbsp;B are currently operationally independent&mdash;forecast probabilities are not consumed by the deal optimization pipeline. Both tasks share the same evidence corpus but do not exchange outputs.</li>
          <li>CBA figures are estimates derived from publicly available economic models and should be treated as order-of-magnitude guides rather than precise values.</li>
          <li>Deal proposals are generated by language models and have not been vetted by real negotiators, diplomats, or subject-matter experts. They represent computationally plausible frameworks, not actionable policy recommendations.</li>
          <li>The generation/evaluation independence constraint reduces but does not eliminate bias&mdash;models from different providers may share training data, alignment approaches, or systematic blindspots.</li>
          <li>Forecasts and deals should never be used as the sole basis for policy, investment, or personal safety decisions.</li>
        </ul>
        <p className="text-xs text-slate-500 mt-6 italic">
          This platform is provided for research and educational purposes only. The authors make no warranties regarding accuracy or completeness. AutoPeace is an experiment in applying autonomous research methodology to conflict analysis&mdash;it demonstrates what is technically possible, not what should be directly operationalized.
        </p>
      </section>

      <footer className="border-t border-slate-700 pt-8 mt-12">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Resources</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <a href="https://github.com/keyhanimo/AutoPeace" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> Source on GitHub</a>
          <a href="https://replit.com/@keyhanimo/AutoPeace" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> Remix on Replit</a>
          <a href="https://acleddata.com" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> ACLED Data</a>
          <a href="https://gdeltproject.org" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> GDELT Project</a>
        </div>
      </footer>

    </article>
  );
}
