<p align="center">
  <h1 align="center">AutoPeace</h1>
  <p align="center">
    <strong>LLM-based Autonomous Peace Deal Optimization for Geopolitical Conflict using Multi-Agent Systems</strong>
  </p>
  <p align="center">
    An autonomous research platform that generates Bayesian conflict forecasts and iteratively optimizes peace deal proposals for the Iran–US–Israel conflict complex.
  </p>
  <p align="center">
    Developed by <strong>Mohammad Keyhani</strong>, University of Calgary
  </p>
</p>

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
  - [The Autoresearch Cycle](#the-autoresearch-cycle)
  - [Task A: Conflict Forecasting](#task-a-conflict-forecasting)
  - [Task B: Autonomous Deal Optimization](#task-b-autonomous-deal-optimization)
  - [Relationship Between Tasks A and B](#relationship-between-tasks-a-and-b)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [Monorepo Structure](#monorepo-structure)
  - [Frontend (React Dashboard)](#frontend-react-dashboard)
  - [Backend (Express API Server)](#backend-express-api-server)
  - [Shared Libraries](#shared-libraries)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
  - [Public Endpoints](#public-endpoints)
  - [Community Endpoints](#community-endpoints)
  - [Data Export Endpoints](#data-export-endpoints)
  - [Admin Endpoints](#admin-endpoints)
- [Frontend Pages](#frontend-pages)
- [Intelligence Pipeline Deep Dive](#intelligence-pipeline-deep-dive)
  - [Evidence Ingestion](#evidence-ingestion)
  - [Forecasting Engine](#forecasting-engine)
  - [8-Stage Deal Engine](#8-stage-deal-engine)
  - [Deal Memory & Provision-Level Learning](#deal-memory--provision-level-learning)
  - [Pipeline Hill-Climbing (Self-Improving Prompts)](#pipeline-hill-climbing-self-improving-prompts)
  - [Proposal Extraction & Screening](#proposal-extraction--screening)
  - [Unified LLM Router](#unified-llm-router)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [Configuration](#configuration)
- [License](#license)

---

## Overview

AutoPeace is an open-source, AI-powered research platform focused on the Iran–US–Israel conflict complex. It demonstrates that autonomous LLM research loops — inspired by Karpathy's autoresearch paradigm — can contribute to complex geopolitical problems by providing transparent, measurable, and progressively improving peace deal proposals alongside probabilistic conflict forecasts.

The platform operates two research tasks:

- **Task A (Conflict Forecasting):** Generates Bayesian probability distributions across 8 mutually exclusive conflict outcome states over five time horizons (10 days, 30 days, 90 days, 180 days, 1 year). Forecasting is a single-pass inference step — no experimentation, scoring optimization, or hill-climbing is applied to forecast outputs.
- **Task B (Deal Optimization):** Uses a multi-agent negotiation pipeline (Stages 0–8) to design, stress-test, and iteratively optimize structured peace deal proposals through adversarial red-teaming, stakeholder simulation, and hill-climbing over a 7-dimension composite score.

Both tasks share the same evidence corpus but are operationally independent — forecast probabilities are not consumed by the deal engine.

---

## How It Works

### The Autoresearch Cycle

AutoPeace runs a continuous research cycle that can be scheduled hourly, daily, weekly, or triggered manually:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTORESEARCH CYCLE                          │
│                                                                    │
│  1. Evidence Ingestion                                             │
│     RSS feeds (Reuters, AP, BBC, Al Jazeera, Guardian)             │
│     + ACLED conflict data + GDELT event streams                    │
│              │                                                     │
│              ▼                                                     │
│  1b. Stakeholder Profile Updates                                   │
│      LLM updates 33 stakeholder profiles from latest evidence      │
│              │                                                     │
│              ▼                                                     │
│  2. Proposal Extraction                                            │
│     Auto-scan diplomatic evidence for real-world peace proposals   │
│              │                                                     │
│              ▼                                                     │
│  3. Conflict Forecasting (Task A)                                  │
│     Single-pass Bayesian probabilities × 8 outcomes × 5 horizons  │
│              │                                                     │
│              ▼                                                     │
│  4. Deal Optimization (Task B)                                     │
│     8-stage multi-agent pipeline → solution tree → Pareto frontier │
│              │                                                     │
│              ▼                                                     │
│  5. Changelog Generation                                           │
│     Auto-generate headline from forecast deltas                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Task A: Conflict Forecasting

The forecasting engine produces probability distributions across **8 MECE (Mutually Exclusive, Collectively Exhaustive) outcome states**:

| # | Outcome | Description |
|---|---------|-------------|
| 1 | Continued Conflict | Status quo friction without major escalation |
| 2 | Informal De-escalation | Unspoken throttling of hostilities |
| 3 | Limited Ceasefire | Temporary, tactical pause in kinetic action |
| 4 | Humanitarian Mini-Deal | Narrow agreements on hostage or aid access |
| 5 | Sanctions Partial Deal | Economic relief in exchange for specific concessions |
| 6 | Regional Framework | Broad multi-lateral security architecture |
| 7 | Broad Settlement | Comprehensive, enduring peace treaty |
| 8 | Major Escalation | Severe expansion of kinetic theater |

Forecasts are generated for **five time horizons**: 10 days, 30 days, 90 days, 180 days, and 1 year. Each cycle produces a single forecast per horizon conditioned on the latest evidence — no experimentation, no scoring optimization, and no hill-climbing is applied to forecasts.

### Task B: Autonomous Deal Optimization

The deal engine uses a **multi-agent pipeline** to generate, evaluate, and iteratively optimize peace proposals. It maintains:

- **Solution Tree:** A branching tree of deal versions across 8 architectures (balanced, nuclear-first, hormuz-first, humanitarian-first, radical-restructure, asymmetric-grand-bargain, incremental-confidence, freeform), allowing backtracking or branching when an approach stalls.
- **Pareto Frontier:** Instead of one "best" deal, the system preserves a frontier of non-dominated deals that excel in different dimensions.
- **Pipeline Hill-Climbing:** The Meta-Evaluator (Stage 7) suggests prompt improvements after each cycle, applied cumulatively through a score-gated mechanism — enabling the system to iteratively improve its own deal generation prompts.
- **Deal Memory:** Provision-level learning tracks which specific deal mechanisms historically improved or hurt scores across dimensions.

### Relationship Between Tasks A and B

In the current implementation, forecasting and deal optimization are operationally independent. Both consume the same underlying evidence corpus (RSS feeds, ACLED, GDELT), but the probability distributions produced by Task A are not programmatically passed to or consumed by the deal optimization pipeline. The deal engine receives a two-layer evidence context (a strategic situation assessment synthesized from up to 150 evidence items, plus the 30 most recent items) but does not condition on the forecast probabilities. The two tasks run sequentially within each cycle — forecasting completes first, then the deal engine launches — and they share evidence ingestion infrastructure, but the information flow between them is limited to this shared evidence base.

---

## Features

- **Bayesian Conflict Forecasting** — Single-pass probability distributions across 8 outcome states and 5 time horizons per cycle
- **Multi-Agent Deal Negotiation** — 8-stage pipeline with proposal generation, stakeholder evaluation, domestic audience analysis, creative reframing, red-teaming, Pareto-optimal negotiation, multi-model judicial scoring, meta-evaluation, and diagnosis
- **33 Stakeholder Profiles** — Tiered acceptance system (Required → Critical → Influential → Contextual) with evidence-updated goals, red lines, and constraints
- **8 Deal Architectures** — Sequential cycling through balanced, nuclear-first, hormuz-first, humanitarian-first, radical-restructure, asymmetric-grand-bargain, incremental-confidence, and freeform approaches
- **Cost-Benefit Analysis** — Economic modeling across 8 channels for key stakeholders, injected into deal generation and evaluation prompts
- **Deal Memory** — Provision-level learning that tracks which deal mechanisms improved or hurt scores, feeding insights into future cycles
- **Self-Improving Prompts** — Score-gated hill-climbing on pipeline prompts with full evolutionary lineage tracking
- **Live Monitor** — Real-time view of active research cycles with full LLM call logging (model, tokens, cost, duration)
- **Community Forecasts** — Users can submit their own probability estimates for comparison
- **Proposal Arena** — Side-by-side comparison of proposals with multi-dimensional scoring
- **Evidence Corpus** — Searchable database of real-world events sourced from RSS, ACLED, and GDELT
- **Deal Permalinks & Sharing** — Shareable deal pages with social metadata and markdown export
- **Data Portal** — JSON and CSV exports for all research datasets
- **RSS Feed** — Subscribe to research cycle updates via RSS 2.0

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Language** | TypeScript (throughout) |
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, Recharts, Framer Motion, Shadcn UI |
| **Backend** | Express 5, Node.js 24 |
| **Database** | PostgreSQL + Drizzle ORM |
| **AI Models** | Anthropic Claude, OpenAI GPT, Google Gemini (configurable per role) |
| **Validation** | Zod v4, drizzle-zod |
| **API Codegen** | Orval (from OpenAPI 3.1 spec) |
| **Data Fetching** | TanStack React Query |
| **Build** | esbuild (ESM bundle for API), Vite (frontend) |
| **Monorepo** | pnpm workspaces |
| **Rate Limiting** | express-rate-limit |

---

## Architecture

### Monorepo Structure

```
autopeace/
├── artifacts/
│   ├── api-server/              # Express 5 API + autoresearch pipeline
│   │   └── src/
│   │       ├── routes/          # API route handlers
│   │       ├── services/        # Core business logic
│   │       │   ├── autoresearch.ts        # Cycle orchestrator
│   │       │   ├── deal-engine.ts         # 8-stage deal pipeline
│   │       │   ├── deal-autoresearch.ts   # Deal cycle loop, solution tree, Pareto
│   │       │   ├── forecasting.ts         # Bayesian forecasting engine
│   │       │   ├── evidence-ingestion.ts  # RSS/ACLED/GDELT ingestion
│   │       │   ├── llm-router.ts          # Unified LLM routing layer
│   │       │   ├── proposal-extractor.ts  # Auto-extract proposals from evidence
│   │       │   ├── proposal-screening.ts  # AI screening of community submissions
│   │       │   ├── scoring.ts             # Deal scoring utilities
│   │       │   └── cycle-log.ts           # Active cycle context & event emitter
│   │       ├── seed/            # Seed data (stakeholders, proposals, forecasts)
│   │       ├── lib/             # Admin auth, logger, cycle-log
│   │       └── app.ts           # Express app setup
│   │
│   └── autopeace/               # React Vite frontend (dark navy theme)
│       └── src/
│           ├── pages/           # 20+ page components
│           ├── components/      # Reusable UI components
│           ├── hooks/           # Custom React hooks (useCycleStatus, etc.)
│           └── App.tsx          # Router + layout
│
├── lib/
│   ├── api-spec/                # OpenAPI 3.1 spec + Orval codegen config
│   ├── api-client-react/        # Generated React Query hooks
│   ├── api-zod/                 # Generated Zod schemas from OpenAPI
│   ├── db/                      # Drizzle ORM schema + DB connection
│   │   └── src/schema/          # Table definitions
│   ├── integrations-anthropic-ai/      # Anthropic client
│   ├── integrations-openai-ai-server/  # OpenAI client
│   └── integrations-gemini-ai/         # Gemini AI client
│
├── scripts/                     # Utility & post-merge scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json           # Shared TypeScript config
├── tsconfig.json                # Project references
└── package.json
```

### Frontend (React Dashboard)

The UI is a dark-themed research dashboard built with React 19, Vite, Tailwind CSS, and Shadcn UI components. It uses TanStack React Query with auto-generated hooks from the OpenAPI spec for type-safe data fetching. The interface is organized into four navigation groups:

- **Research** — Home dashboard, deal dashboard, deal history, proposal arena, forecasts, cost-benefit analysis
- **Explorer** — Stakeholder profiles, comparisons, stakeholder lens, evidence corpus, live monitor, autoresearch lab
- **Community** — Submit proposals, data portal, API docs
- **Info** — Changelog, methodology, admin panel

### Backend (Express API Server)

The API server is built on Express 5 and serves three roles:

1. **REST API** — 40+ endpoints serving forecasts, deals, stakeholders, evidence, and community data
2. **Research Orchestrator** — Runs the autoresearch cycle (evidence ingestion → stakeholder updates → proposal extraction → forecasting → deal optimization)
3. **Admin Interface** — Protected endpoints for configuration, manual cycle triggers, and proposal management

### Shared Libraries

| Library | Purpose |
|---|---|
| `@workspace/db` | Drizzle ORM schema, migrations, and database connection |
| `@workspace/api-spec` | OpenAPI 3.1 specification and Orval codegen configuration |
| `@workspace/api-client-react` | Auto-generated React Query hooks from the OpenAPI spec |
| `@workspace/api-zod` | Auto-generated Zod validation schemas from the OpenAPI spec |
| `@workspace/integrations-anthropic-ai` | Anthropic Claude client |
| `@workspace/integrations-openai-ai-server` | OpenAI GPT client |
| `@workspace/integrations-gemini-ai` | Google Gemini client |

---

## Database Schema

The PostgreSQL database uses Drizzle ORM and contains tables organized around the concept of **research cycles**:

### Core Tables

| Table | Purpose |
|---|---|
| `cycles` | Tracks automated research runs (status, timing, stage progression) |
| `forecasts` | Probability distributions across 8 outcome states per time horizon, linked to cycles |
| `deals` | Generated peace proposals with terms (JSONB), scores (JSONB), stakeholder evaluations; supports parent-child versioning |
| `stakeholders` | 33 conflict actor profiles with tiers, red lines, goals, and LLM-updated profiles |
| `evidence_items` | Ingested news/events classified by type and source, used for AI grounding |
| `evidence_sources` | RSS source configurations |
| `proposals` | Analyzed/scored real-world and community peace proposals |
| `proposal_submissions` | Raw user-submitted proposals with screening status |

### Supporting Tables

| Table | Purpose |
|---|---|
| `pipeline_evolution` | Cumulative prompt overrides per pipeline stage for hill-climbing optimization |
| `provision_outcomes` | Per-provision performance tracking (score deltas, dimension-level deltas, stakeholder reactions) |
| `solution_tree` | Hierarchical representation of deal evolution branches |
| `cost_of_war` | Economic, humanitarian, and strategic cost data per stakeholder |
| `community_forecasts` | User-submitted probability estimates |
| `changelog_entries` | Auto-generated summaries of research cycle deltas |
| `admin_config` | Key-value store for system-wide configuration |

### Key Relationships

- **One-to-Many:** `cycles` → `deals`, `forecasts`, `changelog_entries`
- **Self-Reference:** `deals.parent_id` (deal evolution), `solution_tree.parent_node_id` (branch exploration)
- **Flexible JSONB:** Stakeholder IDs used as keys in `deals.stakeholder_evaluations` and `proposals.stakeholder_evaluations` for schemaless flexibility

---

## API Reference

All endpoints are prefixed with `/api`. Rate limits: 120 requests/min (public), 5 requests/15min (submissions), 30 requests/min (downloads).

### Public Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/healthz` | Server health check |
| `GET` | `/forecasts` | List forecasts (filter by `timeHorizon`, `cycleId`, paginate) |
| `GET` | `/forecasts/latest` | Latest forecast for each time horizon |
| `GET` | `/forecasts/:id` | Single forecast detail |
| `GET` | `/deals` | List deals (filter by `architecture`, paginate) |
| `GET` | `/deals/current` | Highest-scoring current deal |
| `GET` | `/deals/pareto` | Pareto frontier of non-dominated deals |
| `GET` | `/deals/tree` | Full solution tree visualization data |
| `GET` | `/deals/history` | Chronological deal history |
| `GET` | `/deals/robustness` | Red-team attack survival report |
| `GET` | `/deals/compare` | Side-by-side deal comparison (via `ids` query param) |
| `GET` | `/deals/:id` | Single deal detail with permalink metadata |
| `GET` | `/deals/:id/stakeholder-evals` | Stakeholder evaluations for a deal |
| `GET` | `/deals/:id/llm.md` | Markdown export of deal |
| `POST` | `/deals/:id/share-text` | Generate social sharing text for a deal |
| `GET` | `/proposals` | List analyzed proposals |
| `GET` | `/proposals/arena` | Proposal comparison set |
| `GET` | `/proposals/:id` | Single proposal detail |
| `GET` | `/stakeholders` | All stakeholder profiles |
| `GET` | `/stakeholders/:id` | Single stakeholder profile |
| `GET` | `/stakeholders/tiers` | Tier registry grouped by acceptance level |
| `GET` | `/evidence` | Search/list evidence corpus |
| `GET` | `/costs` | Cost-of-war data by stakeholder |
| `GET` | `/experiments/stats` | Pipeline experiment statistics |
| `GET` | `/changelog` | Research cycle changelog |
| `GET` | `/changelog.xml` | RSS 2.0 feed |
| `GET` | `/changelog/:id` | Single changelog entry |

### Community Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/community-forecasts` | Submit user probability estimates |
| `GET` | `/community-forecasts/aggregate` | Aggregated community forecast by time horizon |
| `POST` | `/proposals/submit` | Submit a community peace proposal (AI-screened) |

### Data Export Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/downloads/index` | List available export formats |
| `GET` | `/downloads/forecasts.json` | Export forecasts as JSON |
| `GET` | `/downloads/forecasts.csv` | Export forecasts as CSV |
| `GET` | `/downloads/deals.json` | Export deals as JSON |
| `GET` | `/downloads/deals.csv` | Export deals as CSV |
| `GET` | `/downloads/stakeholders.json` | Export stakeholders as JSON |
| `GET` | `/downloads/evidence.json` | Export evidence as JSON |
| `GET` | `/downloads/costs.json` | Export cost-of-war data as JSON |

### Admin Endpoints

All admin endpoints require the `X-Admin-Key` header matching the `ADMIN_PASSWORD` environment variable.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/config` | View system configuration |
| `POST` | `/admin/config` | Update configuration (cadence, models, budget, etc.) |
| `GET` | `/admin/pipeline/config` | View per-stage model assignments |
| `GET` | `/admin/cycle-status` | Current cycle status |
| `POST` | `/admin/run` | Trigger a full research cycle (409 if already running) |
| `GET` | `/admin/deal-cycles` | List deal cycle history |
| `GET` | `/admin/sources` | View evidence source configurations |
| `PATCH` | `/admin/sources/:id` | Update an evidence source |
| `POST` | `/proposals` | Manually add a new proposal (admin auth required) |
| `POST` | `/admin/proposals/:id/evaluate` | Trigger full 8-stage AI evaluation for a proposal |

---

## Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/` | **Home** | Dashboard with 10-day outcome distribution, peace deal score, live metrics, pipeline status |
| `/forecasts` | **Forecast Dashboard** | Outcome probability charts, time horizon selector, community forecast comparison, historical trend chart |
| `/deals` | **Deal Dashboard** | Current AI champion deal, 7-dimension radar chart, red-team results, stakeholder acceptance map |
| `/deals/history` | **Deal History** | Chronological list of all generated deals with scores and architecture tags |
| `/deals/:id` | **Deal Permalink** | Shareable deal detail page with full terms, scores, stakeholder evaluations, markdown export |
| `/arena` | **Proposal Arena** | Side-by-side proposal comparison with radar charts and score breakdowns |
| `/costs` | **Cost-Benefit Analysis** | War costs vs. peace benefits by channel/stakeholder, treemaps, and methodology framework |
| `/stakeholders` | **Stakeholder Gallery** | Profile cards for all conflict actors with tier badges |
| `/stakeholders/compare` | **Stakeholder Comparison** | Multi-select comparison tool for up to 4 stakeholders |
| `/stakeholders/lens` | **Stakeholder Lens** | Immersive view filtering all data through one stakeholder's perspective |
| `/evidence` | **Evidence Explorer** | Searchable, filterable corpus of ingested evidence items |
| `/live` | **Live Monitor** | Real-time cycle monitoring with full LLM call detail logging (model, tokens, cost, duration) |
| `/lab` | **Autoresearch Lab** | Pipeline evolution history, solution tree visualization |
| `/submit` | **Submit Proposal** | Public form for community peace proposal submissions with AI screening |
| `/data` | **Data Portal** | JSON/CSV download links for research datasets + RSS |
| `/api-docs` | **API Documentation** | Interactive documentation for all endpoints, filterable by tag |
| `/methodology` | **Methodology** | Academic-style paper describing the system architecture, forecasting approach, and deal optimization pipeline |
| `/changelog` | **Changelog** | Timeline of research cycle headlines and deltas |
| `/changelog/:id` | **Changelog Entry** | Detailed view of a single research cycle update |
| `/admin` | **Admin Panel** | Password-gated panel for model/provider config, proposal management, cycle triggers |

---

## Intelligence Pipeline Deep Dive

### Evidence Ingestion

The system ingests real-world data from multiple sources:

- **RSS Feeds:** Reuters, AP, The Guardian, BBC, Al Jazeera — filtered by Iran-related keywords (iran, tehran, nuclear, iaea, sanctions, irgc, hezbollah, hamas, houthi, strait of hormuz, jcpoa, enrichment, centrifuge, etc.)
- **ACLED:** Armed Conflict Location & Event Data — battles, explosions, protests, and strategic developments in the Iran-Israel-Gulf region
- **GDELT:** Global Database of Events, Language, and Tone — high-frequency event data with sentiment analysis

Evidence items are deduplicated using SHA-256 hashes, classified by type (military, diplomatic, economic, humanitarian, political), and linked to the cycle and forecast they influenced. After ingestion, stakeholder profiles are updated by an LLM based on newly ingested evidence.

### Forecasting Engine

Each cycle generates probability distributions across 8 outcome states for 5 time horizons using the admin-configured forecasting model. Forecasting is a **single-pass inference step**:

1. Collects the 30 most recent evidence items as context
2. Generates new probability distributions constrained to sum to 1.0
3. Produces rationale explaining the reasoning behind each probability
4. Normalizes outputs against the MECE constraint
5. Persists all forecasts; marks the latest set as "current"

No experimentation, automated scoring, or hill-climbing is applied to forecasts. Historical forecasts are retained for trend comparison but no quality metric (e.g., Brier score) is computed.

### 8-Stage Deal Engine

The deal engine implements a multi-agent pipeline where different LLM providers are deliberately assigned to different stages to ensure adversarial independence:

| Stage | Role | Provider Role | Description |
|---|---|---|---|
| **0. Innovation Brainstorm** | Pre-stage | Generation | Mines historical peace deal analogies, discovers cross-issue linkages, generates creative provisions with deal memory context |
| **1. Proposal Agent** | Generation | Generation | Designs deal terms with CBA data, brainstorm insights, deal memory, and previous diagnosis |
| **2. Stakeholder Evaluator** | Evaluation | Evaluation | Assesses acceptance across 33 stakeholders in 4 tiers with evidence-updated profiles |
| **3. Domestic Audiences** | Evaluation | Evaluation | Evaluates political sellability across 11 audiences in Iran, US, and Israel |
| **3.5 Creative Reframing** | Generation | Generation | Generates domestic selling narratives, reframing concessions as victories |
| **4. Red-Team Agent** | Adversarial | Adversarial | Runs 5 adversarial attack scenarios with severity and survival ratings |
| **5. Creative Negotiator** | Generation | Generation | Searches for Pareto improvements and win-win tradeoffs across stakeholders |
| **6. Judge Panel** | Judicial | All 3 Providers | Three independent LLM judges score on 7 dimensions; scores averaged |
| **7. Meta-Evaluator** | Evaluation | Evaluation | Pipeline reasoning quality assessment + prompt improvement suggestions |
| **8. Diagnosis Generator** | Adversarial | Adversarial | Tier-aware diagnosis fed forward to the next cycle's Proposal Agent |

**Provider Independence:** The system enforces that the generation provider differs from the evaluation provider at the code level — the system throws an error if they match.

**Tiered Stakeholder Acceptance with Graduated Penalties:**

| Tier | Actors | Rejection Impact |
|---|---|---|
| **Required** | Iran, United States | Feasibility/durability compressed toward 0.10; −0.10 composite offset |
| **Critical** | Israel | Feasibility compressed toward 0.20; −0.05 composite offset |
| **Influential** | Saudi Arabia, EU3, Russia, China, IAEA | Affects durability and regional stability |
| **Contextual** | UAE, Qatar, Turkey, Iraq, + 11 others | Affects regional stability assessment |

**7 Scoring Dimensions:** Feasibility (15%), Coherence (15%), Evidence Grounding (12%), Domestic Sellability (15%), Regional Stability (13%), Implementability (15%), Durability (15%) — each scored 0.0–1.0 by the 3-model Judge Panel.

### Deal Memory & Provision-Level Learning

The system maintains structured memory across deal cycles:

- **Deal History Context:** Top 5 highest-scoring deals with terms, scores, stakeholder verdicts, and diagnoses are injected into brainstorm and proposal stages
- **Provision Outcomes:** Each innovative provision is tracked in a `provision_outcomes` table with composite score delta, per-dimension deltas, stakeholder reactions, category, and architecture
- **Aggregated Insights:** Usage count, average score delta, and best/worst dimensions for each provision type are computed and injected into prompts, creating a genuine learning signal

### Pipeline Hill-Climbing (Self-Improving Prompts)

The Meta-Evaluator (Stage 7) suggests prompt improvements after each cycle. These are adopted through a score-gated mechanism:

1. Each pipeline configuration must produce at least 2 deals before evolving
2. New overrides are adopted only when the composite score exceeds the running average by a minimum threshold
3. Accepted improvements are applied as cumulative addenda to stage prompts
4. Full evolutionary lineage is tracked in the `pipeline_evolution` table

### Proposal Extraction & Screening

**Auto-Extraction:** After evidence ingestion, the system scans diplomatic articles for real-world peace proposals. Extracted proposals are mapped to the standard 7-dimension deal terms structure. Deduplication uses stable ID hashing and fuzzy word overlap detection.

**Community Screening:** User-submitted proposals are screened by an LLM for seriousness, legitimacy, and uniqueness before entering the admin review queue. Rejected submissions receive specific feedback. The system fails open — if the screening API is unavailable, proposals pass through to human review.

### Unified LLM Router

All LLM calls route through a single `llm-router.ts` module — the single source of truth for model defaults, provider-specific parameters, and admin configuration. The router also emits detailed cycle events (model, provider, tokens consumed, cost, duration) for real-time monitoring on the Live Monitor page.

**Five configurable roles:**
- `generation` — Proposal and deal creation
- `evaluation` — Scoring and assessment
- `adversarial` — Red-teaming and challenges
- `forecasting` — Outcome probability generation
- `extraction` — Evidence processing and proposal extraction

Each role has independent `{provider, model}` settings stored in the admin config database. Provider-specific handling (OpenAI's `max_completion_tokens`, Anthropic's `max_tokens`, Gemini's `contents` array format) is abstracted automatically. A three-tier resolution hierarchy applies: per-stage override > per-role bucket > global fallback.

---

## Getting Started

### Prerequisites

- **Node.js** 24+
- **pnpm** 9+
- **PostgreSQL** 15+

### Installation

```bash
# Clone the repository
git clone https://github.com/keyhanimo/AutoPeace.git
cd AutoPeace

# Install dependencies
pnpm install
```

### Environment Variables

Set the following environment variables (via Replit Secrets, `.env` file, or your deployment platform):

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ADMIN_PASSWORD` | Yes | Password for admin API routes and panel |
| `ANTHROPIC_API_KEY` | Yes | Anthropic Claude API key |
| `OPENAI_API_KEY` | Yes | OpenAI GPT API key |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `ACLED_API_KEY` | No | ACLED conflict data API key (for enhanced evidence ingestion) |
| `ACLED_EMAIL` | No | ACLED account email |

### Database Setup

```bash
# Push the schema to your PostgreSQL database
pnpm --filter @workspace/db run push
```

The API server performs a readiness check on startup, runs seed data, and logs missing tables as warnings.

### Running the Application

```bash
# Start both the API server and frontend
pnpm --filter @workspace/api-server run dev   # API server
pnpm --filter @workspace/autopeace run dev     # Frontend
```

Or use the build command for production:

```bash
# Typecheck and build all packages
pnpm run build
```

### API Codegen

After modifying the OpenAPI spec (`lib/api-spec/openapi.yaml`), regenerate the client:

```bash
pnpm --filter @workspace/api-spec run codegen
```

This regenerates both the React Query hooks (`lib/api-client-react`) and Zod schemas (`lib/api-zod`).

---

## Configuration

The admin panel (`/admin`) provides runtime configuration for:

- **Research Cadence** — hourly, daily (6:00 UTC default), weekly (Monday 6:00 UTC), or manual
- **LLM Models** — Per-role and per-stage provider and model selection for generation, evaluation, adversarial, forecasting, and extraction
- **Budget Cap** — Maximum USD spend per cycle
- **Pause/Resume** — Toggle the autoresearch scheduler

All configuration is stored in the `admin_config` database table and takes effect on the next cycle.

---

## License

MIT
