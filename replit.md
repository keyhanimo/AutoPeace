# AutoPeace — AI-Powered Peace Research Platform

## Overview

AutoPeace is an AI-powered conflict forecasting and peace research platform for the Iran conflict complex. It uses a live autoresearch loop driven by Anthropic (Claude), OpenAI (GPT-4o), and Google Gemini to continuously generate Bayesian probability forecasts across 8 conflict outcome states.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Frontend**: React 19 + Vite + TailwindCSS + Recharts

## Artifacts

| Artifact | Kind | Path | Port |
|---|---|---|---|
| `artifacts/api-server` | api | `/api` | 8080 |
| `artifacts/autopeace` | web | `/` | 21795 |
| `artifacts/mockup-sandbox` | design | `/__mockup` | 8081 |

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express 5 API + autoresearch pipeline
│   └── autopeace/          # React Vite frontend (dark navy theme)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── integrations-anthropic-ai/    # Anthropic client + batchProcess
│   ├── integrations-openai-ai-server/ # OpenAI client + batchProcess
│   └── integrations-gemini-ai/        # Gemini AI client
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema (9 tables)

- **stakeholders** — 32 conflict actors (Iran, US, Israel, Houthis, IAEA, etc.) with flags/roles
- **cycles** — autoresearch run records (status, tokens, cost, timestamps)
- **forecasts** — probability distributions across 8 outcome states per time horizon
- **experiments** — red-team mutation log (Task A: Gemini red-team + GPT-4o eval)
- **evidence_items** — ingested RSS articles classified by evidence type
- **evidence_sources** — 5 RSS source configurations
- **cost_of_war** — economic/human cost data for Iran, US, Israel
- **changelog_entries** — auto-generated headlines summarizing each cycle
- **admin_config** — key/value config (isPaused, cadence, etc.)

Run migrations: `pnpm --filter @workspace/db run push`

**Deployment migration**: The `scripts/post-merge.sh` script runs `pnpm --filter db push` automatically after task agent merges. For fresh deployments, run `pnpm --filter @workspace/db run push` before starting the API server. The server performs a readiness check on startup and logs missing tables as warnings.

## API Routes (`/api/...`)

### Public
- `GET /api/healthz`
- `GET /api/forecasts/latest` — current forecasts (all horizons)
- `GET /api/experiments` — experiment log (paginated)
- `GET /api/costs` — cost-of-war data
- `GET /api/evidence` — recent evidence items
- `GET /api/changelog` — cycle changelog entries
- `GET /api/stakeholders` — all 32 stakeholders
- `GET /api/changelog/:id` — single changelog entry detail

### Admin (requires `X-Admin-Key: $ADMIN_PASSWORD`)
- `POST /api/admin/run` — trigger autoresearch cycle immediately (409 if cycle already running)
- `GET /api/admin/config` — view admin config
- `POST /api/admin/config` — update config (isPaused, cadence, budgetCapUsd, model names)
- `GET /api/admin/sources` — list evidence sources
- `PATCH /api/admin/sources/:id` — enable/disable or change fetch frequency
- `GET /api/admin/costs-summary` — per-provider cost breakdown with actual Gemini/OpenAI attribution

## Autoresearch Pipeline

Each cycle (triggered manually or by cron):
1. **Evidence ingestion** — RSS feeds (Reuters, AP, Guardian, BBC, Al Jazeera) filtered by Iran keywords
2. **Forecasting** — Claude claude-sonnet-4-5 generates probabilities for 4 time horizons (30d, 90d, 180d, 1y)
3. **Red-team** — Gemini gemini-2.5-flash challenges the 90d forecast
4. **Evaluation** — GPT-4o evaluates and retains/discards the mutation
5. **Changelog** — auto-headline generated from 90d probability leader

Scheduler: hourly cron check, runs at UTC 6am daily by default.

## Frontend Pages

| Route | Page |
|---|---|
| `/` | Home — hero, peace gauge, stakeholder grid, DealHeroSection |
| `/forecasts` | Forecast Dashboard — bar chart, what-if scenarios, community forecast panel |
| `/deals` | Deal Dashboard — solution tree, Pareto frontier, deal cards |
| `/arena` | Proposal Arena — US vs Iran vs AI deal comparison |
| `/stakeholders` | Stakeholder Gallery — expandable stakeholder profile cards |
| `/stakeholders/compare` | Stakeholder Comparison — multi-select comparison tool (up to 4) |
| `/evidence` | Evidence Explorer — searchable, filterable corpus browser (54+ items) |
| `/costs` | Cost-Benefit Analysis — war costs vs peace benefits by channel and stakeholder, humanitarian impact with Iran-attribution methodology and source citations, channel decomposition charts, treemap, radar charts, expanded methodology framework |
| `/experiments` | Evolution Log — mutation table with result badges |
| `/submit` | Submit Proposal — public form for community proposal submissions |
| `/data` | Data Portal — JSON/CSV downloads for all 6 research datasets + RSS |
| `/api-docs` | API Documentation — 20 endpoints with examples, filterable by tag |
| `/open-source` | Open Source — contributing guide, tech stack, licence |
| `/changelog` | Platform Changelog — timeline of cycle headlines |
| `/changelog/:id` | Changelog Entry — detail view |
| `/methodology` | Methodology — Bayesian approach, 8-state MECE taxonomy |
| `/admin` | Admin Panel — password-gated (X-Admin-Key); model/provider config, proposal management, deal engine trigger |

## Academic Rigor & Data Sourcing

All 10 data-displaying pages have peer-reviewed academic-standard sourcing:

**Reusable components** (`artifacts/autopeace/src/components/DataSourceNote.tsx`):
- `DataSourceNote` — expandable methodology panel with title, methodology, sources list, confidence notes, limitations, last-updated timestamp
- `DataFreshness` — inline data freshness indicator

**Coverage**: Home, ForecastDashboard, DealDashboard, ProposalArena, StakeholderLens, StakeholderComparison, Stakeholders, ExperimentLog, EvidenceExplorer all use `DataSourceNote`. CostsExplorer has its own extensive built-in `MethodologyNote` and `HumanitarianBanner` with full attribution methodology and source citations.

**Auto-update pipeline** (`artifacts/api-server/src/services/autoresearch.ts`):
- Hourly cron scheduler reads cadence from admin config (`getConfigValue("cadence", "daily")`)
- Cadence options: hourly (every tick), daily (06:00 UTC), weekly (Monday 06:00 UTC), manual (no auto-run)
- Admin panel dropdown (`AdminPanel.tsx`) shows descriptive labels with helper text explaining the pipeline
- Full pipeline per cycle: RSS/ACLED/GDELT ingestion → proposal extraction → multi-model forecasting → hill-climbing optimization → what-if scenarios → **deal engine optimization** (generates & evaluates new deal via solution tree, updates Pareto frontier)
- Deal cycle runs as final step of each autoresearch cycle (non-critical — if it fails, forecasts are still saved)

## Phase 3 — Interactive Explorer & Community

**New DB tables**: `community_forecasts`, `proposal_submissions`

**New API routes**:
- `POST /api/community-forecasts` — submit probability forecast (sessionId + timeHorizon + estimates)
- `GET /api/community-forecasts/aggregate` — avg community forecast by time horizon
- `POST /api/proposals/submit` — public proposal submission (goes to pending queue)
- `GET /admin/proposals/queue` — admin review queue with status filter
- `PATCH /admin/proposals/queue/{id}` — approve/reject (creates `proposals` entry when approved)
- `GET /api/changelog.xml` — RSS 2.0 feed of changelog entries
- `GET /api/downloads/index` — download manifest JSON
- `GET /api/downloads/forecasts.json|csv`, `deals.json|csv`, `experiments.csv`, `stakeholders.json`, `evidence.json`, `costs.json`

**Rate limiting**: `express-rate-limit` middleware — 120/min public, 5/15min submissions, 30/min downloads

**New pages**: Evidence Explorer, Stakeholder Comparison, Submit Proposal, Data Portal, API Docs, Open Source

**ForecastDashboard additions**: What-If Scenarios panel (4 toggleable scenarios with probability shifts) + Community Forecast panel (AI vs crowd bar chart)

**Nav**: Grouped into Research / Explorer / Community / Info sections

**api-zod fix**: Changed `export * from "./generated/types"` → removed to prevent Zod const / TypeScript type name collision for new POST body schemas

## Proposal Extractor Agent

Auto-scans ingested diplomatic evidence items for real-world peace proposals using Anthropic Claude. Runs after evidence ingestion in each autoresearch cycle (non-blocking — failures don't stop the cycle).

**Pipeline**: Batch unprocessed diplomatic evidence → LLM extraction → validate + deduplicate → insert proposal → run full 8-stage AI evaluation (stakeholder evaluations, domestic audience assessment, red-team stress testing, negotiator amendments, 3-model judge panel, meta-evaluation, diagnosis + what-would-it-take).

**Community proposals** also receive the same full 8-stage evaluation upon admin approval, ensuring parity with AI-generated and auto-extracted proposals.

**Key files**: `artifacts/api-server/src/services/proposal-extractor.ts`

**Deduplication**: Stable ID hash (name+source), exact name match, fuzzy word overlap (≥3 shared words >3 chars). In-memory dedupe sets updated after each insert. Uses `onConflictDoNothing().returning()` to detect actual inserts vs no-ops.

**Evidence lifecycle**: Evidence items marked `isProcessed=true` only AFTER extraction pipeline completes (not before), preventing permanent data loss on LLM failures.

## Phase 2 — Deal Engine (Task B)

8-stage multi-agent pipeline (`deal-engine.ts`):
1. **Proposal Agent** (generation role) — designs deal terms per architecture
2. **Stakeholder Evaluator** (evaluation role) — assesses 8 core stakeholder verdicts
3. **Domestic Audiences** (evaluation role) — Iran/US/Israel domestic political sellability
4. **Red-Team Agent** (adversarial role) — 5 attack scenarios, severity + survival
5. **Negotiator Agent** (generation role) — targeted amendments for rejectors
6. **Judge Agent** (evaluation role) — 7-dimension scoring (0–1 each)
7. **Meta-Evaluator** (evaluation role) — pipeline reasoning quality + next architecture suggestion
8. **Diagnosis Generator** (adversarial role) — plain-language explanation of failure

**Per-role provider config**: generation/evaluation/adversarial each have independent `{provider, model}` settings stored in `admin_config` key-value store. `validateModelConfig()` enforces `generationProvider !== evaluationProvider` at runtime.

**API routes added**: `/deals/history`, `/deals/robustness`, `/deals/compare`, `/deals/{id}/stakeholder-evals`, `/admin/proposals/{id}/evaluate`, `/admin/pipeline/config`

## Key Files

- `artifacts/api-server/src/services/autoresearch.ts` — forecast cycle orchestrator
- `artifacts/api-server/src/services/deal-engine.ts` — 8-stage deal pipeline + validateModelConfig
- `artifacts/api-server/src/services/deal-autoresearch.ts` — deal cycle loop, solution tree, Pareto
- `artifacts/api-server/src/routes/deals.ts` — deal API endpoints incl. history/robustness/compare
- `artifacts/api-server/src/routes/proposals.ts` — proposals + admin evaluate endpoint
- `artifacts/api-server/src/routes/admin.ts` — admin config + pipeline config with per-role providers
- `artifacts/api-server/src/seed/proposals.ts` — seeds US 15-pt + Iran 5-pt proposals + AI auto-eval
- `artifacts/autopeace/src/pages/AdminPanel.tsx` — per-role provider dropdowns + proposal management form
- `artifacts/autopeace/src/App.tsx` — React router + page layout
- `lib/api-spec/openapi.yaml` — full OpenAPI 3.1 spec (all new endpoints documented)
- `lib/api-client-react/src/generated/` — orval-generated React Query hooks

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`)
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck; JS bundling is handled by esbuild/vite
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Environment Variables / Secrets

| Secret | Purpose |
|---|---|
| `ADMIN_PASSWORD` | X-Admin-Key for admin API routes and panel |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Anthropic Claude API (via Replit integration) |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Anthropic proxy base URL |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI GPT-4o API (via Replit integration) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI proxy base URL |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Gemini API (via Replit integration) |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Gemini proxy base URL |
| `DATABASE_URL` | PostgreSQL connection string (auto-provided by Replit) |

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client + Zod schemas
