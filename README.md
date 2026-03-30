<p align="center">
  <h1 align="center">AutoPeace</h1>
  <p align="center">
    <strong>AI-Powered Conflict Forecasting & Peace Research Platform</strong>
  </p>
  <p align="center">
    Automated research loops that generate Bayesian conflict forecasts and optimized peace deal proposals for the Iran–US–Israel conflict complex.
  </p>
</p>

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
  - [The Autoresearch Loop](#the-autoresearch-loop)
  - [Task A: Outcome Forecasting](#task-a-outcome-forecasting)
  - [Task B: Deal Design](#task-b-deal-design)
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
  - [Bayesian Forecasting Engine](#bayesian-forecasting-engine)
  - [Hill-Climbing Optimization](#hill-climbing-optimization)
  - [8-Stage Deal Engine](#8-stage-deal-engine)
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

AutoPeace is an open-source, AI-powered research and forecasting platform focused on the Iran–US–Israel conflict complex. It demonstrates that automated AI research loops — inspired by Karpathy's "programming the program" philosophy and research systems like AIDE and GEPA — can contribute to solving complex global problems by providing transparent, measurable, and progressively improving forecasts and peace deal proposals.

The platform operates two continuous research tasks:

- **Task A (Forecasting):** Generates Bayesian probability distributions across 8 mutually exclusive conflict outcome states over four time horizons (30 days, 90 days, 180 days, 1 year).
- **Task B (Deal Design):** Uses a multi-agent negotiation pipeline to design, stress-test, and optimize structured peace deal proposals evaluated by simulated stakeholder agents.

Every experiment, LLM prompt, reasoning step, and evaluation is logged and publicly browsable — embodying a philosophy of radical transparency.

---

## How It Works

### The Autoresearch Loop

AutoPeace runs a continuous research cycle that can be scheduled hourly, daily, weekly, or triggered manually:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTORESEARCH CYCLE                          │
│                                                                    │
│  1. Evidence Ingestion                                             │
│     RSS feeds (Reuters, AP, Guardian, BBC, Al Jazeera)             │
│     + ACLED conflict data + GDELT event streams                    │
│              │                                                     │
│              ▼                                                     │
│  2. Proposal Extraction                                            │
│     Auto-scan diplomatic evidence for real-world peace proposals   │
│              │                                                     │
│              ▼                                                     │
│  3. Multi-Model Forecasting (Task A)                               │
│     Bayesian probabilities × 8 outcomes × 4 time horizons         │
│              │                                                     │
│              ▼                                                     │
│  4. Red-Team Challenge                                             │
│     Adversarial model attacks the 90-day forecast                  │
│              │                                                     │
│              ▼                                                     │
│  5. Hill-Climbing Evaluation                                       │
│     Evaluate mutation → retain if Brier/Log scores improve         │
│              │                                                     │
│              ▼                                                     │
│  6. What-If Scenario Computation                                   │
│     Pre-compute probability shifts for trigger events              │
│              │                                                     │
│              ▼                                                     │
│  7. Deal Engine Optimization (Task B)                              │
│     8-stage multi-agent pipeline → solution tree → Pareto frontier │
│              │                                                     │
│              ▼                                                     │
│  8. Changelog Generation                                           │
│     Auto-generate headline from forecast/deal deltas               │
└─────────────────────────────────────────────────────────────────────┘
```

### Task A: Outcome Forecasting

The forecasting engine produces probability distributions across **8 MECE (Mutually Exclusive, Collectively Exhaustive) outcome categories**:

| Outcome | Description |
|---|---|
| Major Escalation | Full-scale regional conflict involving multiple state actors |
| Limited Military Confrontation | Targeted strikes or proxy escalation without full war |
| Status Quo / Frozen Conflict | Current tensions persist without significant change |
| Limited Ceasefire | Partial or temporary ceasefire in one theater |
| Broad Ceasefire | Comprehensive cessation of hostilities across theaters |
| Framework Agreement | Preliminary diplomatic agreement on core issues |
| Partial Settlement | Binding agreement resolving some but not all disputes |
| Broad Settlement | Comprehensive peace deal addressing all major issues |

Forecasts are generated for **four time horizons**: 30 days, 90 days, 180 days, and 1 year. The system self-improves through hill-climbing prompt optimization, mutating its own prompts (Adversarial, Pessimistic, Base-Rate) and retaining those that improve calibration against backtested Brier and Log scores.

### Task B: Deal Design

The deal engine uses a **grand coalition cooperative game theory framework** with a multi-agent pipeline to generate, evaluate, and optimize peace proposals. It maintains:

- **Solution Tree:** A branching tree of deal versions (Balanced, Nuclear-First, Regional Security, etc.), allowing the AI to backtrack or branch when an approach stalls.
- **Pareto Frontier:** Instead of one "best" deal, it presents a frontier of non-dominated deals that excel in different dimensions (e.g., "Most Robust" vs. "Most Acceptable to Iran").
- **Pipeline Hill-Climbing:** The meta-evaluator suggests prompt improvements after each cycle, stored cumulatively and applied to future runs — enabling the AI to iteratively improve its own deal generation prompts.

---

## Features

- **Bayesian Conflict Forecasting** — Continuously updated probability distributions across 8 outcome states and 4 time horizons
- **Multi-Agent Deal Negotiation** — 8-stage pipeline with proposal, stakeholder evaluation, domestic audience analysis, red-teaming, and creative negotiation
- **32+ Stakeholder Profiles** — Tiered acceptance system (Required → Critical → Influential → Contextual) with red lines, goals, and communication styles
- **What-If Scenarios** — Pre-computed probability shifts for hypothetical trigger events (e.g., "Hormuz Closure", "Major Cyberattack")
- **Cost-of-War Analysis** — Economic, humanitarian, and strategic cost tracking across 8 channels for 32+ stakeholders
- **Community Participation** — Users can submit their own forecasts and peace proposals for AI evaluation
- **Proposal Arena** — Side-by-side comparison of human proposals vs. AI-generated deals with multi-dimensional scoring
- **Evidence Corpus** — Searchable database of real-world events sourced from Reuters, AP, ACLED, GDELT, and other OSINT feeds
- **Evolution Log** — Full transparency into prompt mutations, experiment results, and solution tree exploration
- **Data Portal** — JSON and CSV exports for all research datasets
- **RSS Feed** — Subscribe to research cycle updates via RSS 2.0
- **AI Proposal Screening** — LLM-powered screening of community submissions for seriousness, legitimacy, and uniqueness
- **Academic-Grade Sourcing** — Every data page includes expandable methodology panels with peer-reviewed citations, confidence notes, and limitations

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Language** | TypeScript (throughout) |
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, Recharts, Framer Motion, Shadcn UI |
| **Backend** | Express 5, Node.js 24 |
| **Database** | PostgreSQL + Drizzle ORM |
| **AI Models** | Anthropic Claude Opus 4.6, OpenAI GPT-5.2, Google Gemini 3.1 Pro |
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
│   │       │   ├── autoresearch.ts        # Forecast cycle orchestrator
│   │       │   ├── deal-engine.ts         # 8-stage deal pipeline (72KB)
│   │       │   ├── deal-autoresearch.ts   # Deal cycle loop, solution tree, Pareto
│   │       │   ├── forecasting.ts         # Bayesian forecasting engine
│   │       │   ├── evidence-ingestion.ts  # RSS/ACLED/GDELT ingestion
│   │       │   ├── llm-router.ts          # Unified LLM routing layer
│   │       │   ├── proposal-extractor.ts  # Auto-extract proposals from evidence
│   │       │   ├── proposal-screening.ts  # AI screening of community submissions
│   │       │   ├── what-if-scenarios.ts   # Scenario computation engine
│   │       │   └── scoring.ts             # Deal scoring utilities
│   │       ├── seed/            # Seed data (stakeholders, proposals)
│   │       └── app.ts           # Express app setup
│   │
│   └── autopeace/               # React Vite frontend (dark navy theme)
│       └── src/
│           ├── pages/           # 17+ page components
│           ├── components/      # Reusable UI components
│           ├── hooks/           # Custom React hooks
│           └── App.tsx          # Router + layout
│
├── lib/
│   ├── api-spec/                # OpenAPI 3.1 spec + Orval codegen config
│   ├── api-client-react/        # Generated React Query hooks
│   ├── api-zod/                 # Generated Zod schemas from OpenAPI
│   ├── db/                      # Drizzle ORM schema + DB connection
│   │   └── src/schema/          # Table definitions (10+ tables)
│   ├── integrations-anthropic-ai/      # Anthropic client + batchProcess
│   ├── integrations-openai-ai-server/  # OpenAI client + batchProcess
│   └── integrations-gemini-ai/         # Gemini AI client
│
├── scripts/                     # Utility & post-merge scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json           # Shared TypeScript config (composite: true)
├── tsconfig.json                # Project references
└── package.json
```

### Frontend (React Dashboard)

The UI is a dark-themed research dashboard built with React 19, Vite, Tailwind CSS, and Shadcn UI components. It uses TanStack React Query with auto-generated hooks from the OpenAPI spec for type-safe data fetching. The interface is organized into four navigation groups:

- **Research** — Home dashboard, forecasts, deals, proposal arena, cost-benefit analysis
- **Explorer** — Stakeholder profiles, comparisons, lens view, evidence corpus, evolution log
- **Community** — Submit proposals, community forecasts
- **Info** — Data portal, API docs, methodology, changelog, open source

### Backend (Express API Server)

The API server is built on Express 5 and serves three roles:

1. **REST API** — 40+ endpoints serving forecasts, deals, stakeholders, evidence, and community data
2. **Research Orchestrator** — Runs the autoresearch cycle (evidence ingestion → forecasting → red-teaming → deal optimization)
3. **Admin Interface** — Protected endpoints for configuration, manual cycle triggers, and proposal management

### Shared Libraries

| Library | Purpose |
|---|---|
| `@workspace/db` | Drizzle ORM schema, migrations, and database connection |
| `@workspace/api-spec` | OpenAPI 3.1 specification and Orval codegen configuration |
| `@workspace/api-client-react` | Auto-generated React Query hooks from the OpenAPI spec |
| `@workspace/api-zod` | Auto-generated Zod validation schemas from the OpenAPI spec |
| `@workspace/integrations-anthropic-ai` | Anthropic Claude client with batch processing utilities |
| `@workspace/integrations-openai-ai-server` | OpenAI GPT client with batch processing utilities |
| `@workspace/integrations-gemini-ai` | Google Gemini client |

---

## Database Schema

The PostgreSQL database uses Drizzle ORM and contains 10+ tables organized around the concept of **research cycles**:

### Core Tables

| Table | Purpose |
|---|---|
| `cycles` | Tracks automated research runs (status, tokens consumed, cost, experiments run) |
| `forecasts` | Probability distributions across 8 outcome states per time horizon, linked to cycles |
| `deals` | Generated peace proposals with terms (JSONB), scores (JSONB), stakeholder evaluations; supports parent-child versioning |
| `stakeholders` | 32 conflict actor profiles with roles, red lines, goals, and communication styles |
| `evidence_items` | Ingested news/events classified by type and source, used for AI grounding |
| `evidence_sources` | RSS source configurations (5 feeds) |
| `proposals` | Analyzed/scored real-world and community peace proposals |
| `proposal_submissions` | Raw user-submitted proposals with screening status |

### Supporting Tables

| Table | Purpose |
|---|---|
| `experiments` | Detailed logs of prompt mutations and parameter variations during research cycles |
| `pipeline_evolution` | Cumulative prompt overrides per pipeline stage for hill-climbing optimization |
| `solution_tree` | Hierarchical representation of deal evolution branches |
| `what_if_scenarios` | Pre-computed hypothetical event impact projections |
| `cost_of_war` | Economic, humanitarian, and strategic cost data per stakeholder |
| `community_forecasts` | Aggregated user-submitted probability estimates |
| `changelog_entries` | Auto-generated summaries of research cycle deltas |
| `email_subscriptions` | Newsletter/alert signups |
| `admin_config` | Key-value store for system-wide configuration |

### Key Relationships

- **One-to-Many:** `cycles` → `deals`, `forecasts`, `experiments`, `changelog_entries`
- **Self-Reference:** `deals.parent_id` (deal evolution), `solution_tree.parent_node_id` (branch exploration)
- **Flexible JSONB:** Stakeholder IDs used as keys in `deals.stakeholder_evaluations` and `proposals.stakeholder_evaluations` for schemaless flexibility

### Stakeholder Categories

The 32 stakeholders are organized into 7 categories:

| Category | Count | Examples |
|---|---|---|
| Core Principal | 3 | Iran, United States, Israel |
| Gulf State | 6 | Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman |
| Regional Broker | 8 | Turkey, Iraq, Egypt, Jordan, Pakistan, etc. |
| External Power | 8 | Russia, China, EU3, India, Japan, South Korea, etc. |
| Global Bloc | 3 | Global North, Global South Energy Exporters/Importers |
| International Org | 1 | IAEA |
| Internal Faction | 2 | IRGC, US Congress |

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
| `GET` | `/deals/:id` | Single deal detail |
| `GET` | `/deals/:id/stakeholder-evals` | Stakeholder evaluations for a deal |
| `GET` | `/proposals` | List analyzed proposals |
| `GET` | `/proposals/arena` | Human vs. AI proposal comparison set |
| `GET` | `/proposals/:id` | Single proposal detail |
| `GET` | `/stakeholders` | All 32 stakeholder profiles |
| `GET` | `/stakeholders/:id` | Single stakeholder profile |
| `GET` | `/stakeholders/tiers` | Tier registry grouped by acceptance level |
| `GET` | `/evidence` | Search/list evidence corpus |
| `GET` | `/costs` | Cost-of-war data by stakeholder |
| `GET` | `/experiments` | Experiment log (paginated) |
| `GET` | `/changelog` | Research cycle changelog |
| `GET` | `/changelog.xml` | RSS 2.0 feed |
| `GET` | `/changelog/:id` | Single changelog entry |
| `GET` | `/scenarios` | Pre-computed what-if scenarios |

### Community Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/community-forecasts` | Submit user probability estimates |
| `GET` | `/community-forecasts/aggregate` | Aggregated community forecast by time horizon |
| `POST` | `/proposals/submit` | Submit a community peace proposal (AI-screened) |
| `POST` | `/subscribe` | Subscribe to research digest |
| `DELETE` | `/subscribe` | Unsubscribe |

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
| `GET` | `/downloads/experiments.csv` | Export experiments as CSV |

### Admin Endpoints

All admin endpoints require the `X-Admin-Key` header matching the `ADMIN_PASSWORD` environment variable.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/config` | View system configuration |
| `POST` | `/admin/config` | Update configuration (cadence, models, budget, etc.) |
| `POST` | `/admin/run` | Trigger a forecast research cycle (409 if already running) |
| `POST` | `/admin/deal-run` | Trigger a deal generation cycle |
| `POST` | `/admin/scenarios/compute` | Manually trigger what-if scenario computation |
| `POST` | `/admin/proposals` | Manually add a new proposal |
| `GET` | `/admin/proposals/queue` | View community submission review queue |
| `PATCH` | `/admin/proposals/queue/:id` | Approve or reject a submission |
| `POST` | `/admin/proposals/:id/evaluate` | Trigger full 8-stage AI evaluation for a proposal |

---

## Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/` | **Home** | Hero dashboard with Peace Outlook gauge, AI vs Human scores, live metrics (Brier scores, cycles, tokens), pipeline visualization |
| `/forecasts` | **Forecast Dashboard** | Outcome probability charts, what-if scenario toggles, community forecast comparison, calibration scorecard |
| `/deals` | **Deal Dashboard** | Current AI champion, 7-dimension radar charts, red-team results, stakeholder acceptance map, solution tree |
| `/arena` | **Proposal Arena** | Human vs. AI deal comparison with side-by-side radar charts and score breakdowns |
| `/costs` | **Cost-Benefit Analysis** | War costs vs. peace benefits by channel/stakeholder, humanitarian data, treemap, and methodology framework |
| `/stakeholders` | **Stakeholder Gallery** | Expandable profile cards for all 32 conflict actors |
| `/stakeholders/compare` | **Stakeholder Comparison** | Multi-select comparison tool for up to 4 stakeholders |
| `/stakeholders/lens` | **Stakeholder Lens** | Immersive view filtering all data through one stakeholder's perspective |
| `/evidence` | **Evidence Explorer** | Searchable, filterable corpus of 54+ evidence items |
| `/experiments` | **Evolution Log** | Prompt mutation history with result badges, solution tree visualization |
| `/submit` | **Submit Proposal** | Public form for community peace proposal submissions with real-time AI screening |
| `/data` | **Data Portal** | JSON/CSV download links for all 6 research datasets + RSS |
| `/api-docs` | **API Documentation** | Interactive documentation for 20+ endpoints, filterable by tag |
| `/methodology` | **Methodology** | Bayesian approach, 8-state MECE taxonomy, scoring framework |
| `/changelog` | **Changelog** | Timeline of research cycle headlines and deltas |
| `/changelog/:id` | **Changelog Entry** | Detailed view of a single research cycle update |
| `/open-source` | **Open Source** | Contributing guide, tech stack, and license information |
| `/admin` | **Admin Panel** | Password-gated panel for model/provider config, proposal management, cycle triggers |

---

## Intelligence Pipeline Deep Dive

### Evidence Ingestion

The system ingests real-world data from multiple sources:

- **RSS Feeds:** Reuters, AP, The Guardian, BBC, Al Jazeera — filtered by Iran-related keywords
- **ACLED:** Armed Conflict Location & Event Data
- **GDELT:** Global Database of Events, Language, and Tone

Evidence items are classified by type, tagged with relevance scores, and stored for use in grounding AI reasoning. Diplomatic evidence is further processed by the Proposal Extractor.

### Bayesian Forecasting Engine

Each cycle generates probabilities across 8 outcome states for 4 time horizons using the admin-configured forecasting model. The forecasting pipeline:

1. Collects recent evidence and prior forecasts as context
2. Generates new probability distributions constrained to sum to 1.0
3. Produces rationale explaining the reasoning behind each probability shift
4. Validates outputs against the MECE constraint

### Hill-Climbing Optimization

The system uses an evolutionary approach to improve forecast accuracy over time:

1. An adversarial model generates a "mutated" forecast challenging the current one
2. An independent evaluation model assesses both using Brier and Log scoring
3. If the mutation scores better, it replaces the current approach
4. Prompt variations (Adversarial, Pessimistic, Base-Rate) are tracked across experiments

This ensures the system's predictions measurably improve with each cycle.

### 8-Stage Deal Engine

The deal engine implements a sophisticated multi-agent pipeline using game theory principles:

| Stage | Role | Model Provider | Description |
|---|---|---|---|
| **0. Innovation Brainstorm** | Pre-stage | Generation | Mines historical peace deal analogies, discovers cross-issue linkages, generates creative provisions |
| **1. Proposal Agent** | Generation | Generation | Designs deal terms with binding stakeholder commitments and innovative provisions |
| **2. Stakeholder Evaluator** | Evaluation | Evaluation | Assesses acceptance across 23 stakeholders in 4 tiers |
| **3. Domestic Audiences** | Evaluation | Evaluation | Evaluates political sellability in Iran, US, and Israel |
| **3.5 Creative Reframing** | Generation | Generation | Generates domestic selling narratives, transforming concessions into perceived victories |
| **4. Red-Team Agent** | Adversarial | Adversarial | Runs 5 attack scenarios with severity and survival ratings |
| **5. Creative Negotiator** | Generation | Generation | Searches for Pareto improvements and win-win tradeoffs |
| **6. Judge Agent** | Evaluation | Evaluation | 7-dimension scoring with tier-aware acceptance hierarchy |
| **7. Meta-Evaluator** | Evaluation | Evaluation | Pipeline reasoning quality assessment + prompt improvement suggestions |
| **8. Diagnosis Generator** | Adversarial | Adversarial | Tier-aware diagnosis with rejection warnings |

**Provider Independence:** The system enforces that the generation provider differs from the evaluation provider, ensuring evaluation independence (e.g., Anthropic generates, OpenAI evaluates).

**Tiered Stakeholder Acceptance:**

| Tier | Actors | Impact |
|---|---|---|
| **Required** | Iran, United States | Both must accept; rejection caps feasibility at 0.15 |
| **Critical** | Israel | Rejection caps feasibility at 0.35 |
| **Influential** | Saudi Arabia, EU3, Russia, China, IAEA | Affects durability |
| **Contextual** | UAE, Qatar, Turkey, Iraq, + 11 others | Affects regional stability |

**7 Scoring Dimensions:** Feasibility, Coherence, Evidence Quality, Domestic Sellability, Regional Stability, Implementability, Durability — each scored 0–1.

### Proposal Extraction & Screening

**Auto-Extraction:** After evidence ingestion, the system scans diplomatic articles for real-world peace proposals using Anthropic Claude. Extracted proposals receive the full 8-stage evaluation pipeline. Deduplication uses a three-layer approach: stable ID hashing, exact name matching, and fuzzy word overlap detection.

**Community Screening:** User-submitted proposals are screened by an LLM for seriousness, legitimacy, and uniqueness before entering the admin review queue. Rejected submissions receive specific feedback. The system fails open — if the screening API is unavailable, proposals pass through to human review.

### Unified LLM Router

All text LLM calls route through a single `llm-router.ts` module — the single source of truth for model defaults, provider-specific parameters, and admin configuration. Zero hardcoded model names exist outside this module.

**Five configurable roles:**
- `generation` — Proposal and deal creation
- `evaluation` — Scoring and assessment
- `adversarial` — Red-teaming and challenges
- `forecasting` — Outcome probability generation
- `extraction` — Evidence processing and proposal extraction

Each role has independent `{provider, model}` settings stored in the admin config database. Provider-specific handling (OpenAI's `max_completion_tokens`, Anthropic's `max_tokens`, Gemini's `contents` array format) is abstracted automatically.

---

## Getting Started

### Prerequisites

- **Node.js** 24+
- **pnpm** 9+
- **PostgreSQL** 15+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/autopeace.git
cd autopeace

# Install dependencies
pnpm install
```

### Environment Variables

Create a `.env` file or set the following environment variables:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ADMIN_PASSWORD` | Yes | Password for admin API routes and panel |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Yes | Anthropic Claude API key |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | No | Anthropic proxy base URL (if using a proxy) |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Yes | OpenAI GPT API key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | No | OpenAI proxy base URL (if using a proxy) |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Yes | Google Gemini API key |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | No | Gemini proxy base URL (if using a proxy) |

### Database Setup

```bash
# Push the schema to your PostgreSQL database
pnpm --filter @workspace/db run push
```

The API server performs a readiness check on startup and logs missing tables as warnings.

### Running the Application

```bash
# Start both the API server and frontend
pnpm --filter @workspace/api-server run dev   # API on port 8080
pnpm --filter @workspace/autopeace run dev     # Frontend on its configured port
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
- **LLM Models** — Per-role provider and model selection for generation, evaluation, adversarial, forecasting, and extraction
- **Budget Cap** — Maximum USD spend per cycle
- **Submission Screening Model** — Model used for community proposal screening
- **Pause/Resume** — Toggle the autoresearch scheduler

All configuration is stored in the `admin_config` database table and takes effect on the next cycle.

---

## License

MIT
