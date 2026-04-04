# AutoPeace — AI-Powered Peace Research Platform

## Overview

AutoPeace is an AI-powered conflict forecasting and peace research platform for the Iran conflict complex. It uses a live autoresearch loop driven by Anthropic (Claude Opus 4.6), OpenAI (GPT-5.2), and Google Gemini (3.1 Pro) to continuously generate Bayesian probability forecasts across 8 conflict outcome states.

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
│   ├── integrations-anthropic-ai/    # (legacy, no longer used by api-server)
│   ├── integrations-openai-ai-server/ # (legacy, no longer used by api-server)
│   └── integrations-gemini-ai/        # (legacy, no longer used by api-server)
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema (10+ tables)

- **stakeholders** — 33 conflict actors with flags/roles/definitions + `tier` (required/critical/influential/contextual) and `profileSummary` columns. Categories: core_principal (3), gulf_state (6), regional_broker (8), external_power (8), global_bloc (3), international_org (1), internal_faction (2). Profiles loaded from DB at deal pipeline runtime (no more hardcoded registry). Evidence-driven profile updates run each cycle via `stakeholder-updater.ts`.
- **cycles** — autoresearch run records (status, tokens, timestamps). On startup, `recoverStuckCycles()` marks any cycles left in `"running"` status as `"failed"` to prevent ghost locks after server restarts.
- **forecasts** — probability distributions across 8 outcome states per time horizon (no scoring fields — forecasting generates a single forecast per cycle)
- **experiments** — deal pipeline experiment log (hill-climbing applies only to deal generation, not forecasting)
- **evidence_items** — ingested articles classified by evidence type, with full-text content (up to 10KB)
- **evidence_sources** — 19 RSS/GDELT/ACLED source configurations (including policy journals: Foreign Affairs, Foreign Policy, Brookings, Carnegie, CSIS, Arms Control Association, Crisis Group, Middle East Eye, Arab News, Iran International; plus Google News search feeds)
- **cost_of_war** — economic/human cost data for Iran, US, Israel
- **changelog_entries** — auto-generated headlines summarizing each forecast cycle and deal engine cycle (includes `scoreDelta` for deals, `forecastDelta` for forecasts)
- **admin_config** — key/value config (isPaused, cadence, etc.)
- **deals** — includes `innovativeProvisions` (jsonb), `domesticFramingStrategies` (jsonb), `brainstormInsights` (jsonb), `pipelineConfig` (jsonb) columns for enhanced pipeline data. `evidence_summary` (text) stores the full evidence context snapshot used to generate each deal, surfaced in API and UI with timestamp. `narrative_summary` (text) stores an LLM-generated concise prose narrative of the deal, auto-generated when a new champion is crowned.
- **provision_outcomes** — tracks per-provision performance: score deltas, dimension deltas, stakeholder reactions, category. Used by deal memory system for provision-level learning.
- **pipeline_evolution** — tracks cumulative prompt overrides per stage key for pipeline hill-climbing

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
- `GET /api/autoresearch/timeline` — aggregated timeline across research cycles (deal timeline with composite scores)
- `GET /api/autoresearch/pipeline-evolution` — pipeline evolution history (prompt overrides, generation progression)

### Live Monitor
- `GET /api/live/stream` — SSE endpoint streaming real-time cycle log events (stage changes, LLM calls, timing, errors)
- `GET /api/live/next-run` — next scheduled autoresearch cycle timestamp

### Admin (requires `X-Admin-Key: $ADMIN_PASSWORD`)
- `POST /api/admin/run` — trigger autoresearch cycle immediately (409 if cycle already running)
- `GET /api/admin/config` — view admin config
- `POST /api/admin/config` — update config (isPaused, cadence, budgetCapUsd, model names)
- `GET /api/admin/sources` — list evidence sources
- `PATCH /api/admin/sources/:id` — enable/disable or change fetch frequency

## Unified LLM Router (`llm-router.ts`)

All text LLM calls route through `artifacts/api-server/src/services/llm-router.ts`, the single source of truth for model defaults, provider-specific parameters, and admin config resolution. Zero hardcoded model names exist outside this module. SDK clients are instantiated directly using env vars (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`) — no Replit integration wrappers.

**Exports**: `callLLM`, `callLLMForStage`, `getModelConfig`, `getConfigValue`, `resolveStageConfig`, `resolveFallbackConfig`, `validateModelConfig`, `isRetryableError`, `DEFAULT_ANTHROPIC_MODEL`, `DEFAULT_OPENAI_MODEL`, `DEFAULT_GEMINI_MODEL`, `MODEL_DEFAULTS`, `FALLBACK_DEFAULTS`

**Admin config roles**: `generation`, `evaluation`, `adversarial`, `forecasting`, `extraction` — each with independent `{provider, model}` settings. Per-stage overrides take highest priority.

**Cross-Provider Fallback System**: Each role has a configurable fallback `{provider, model}` pair. When a primary provider exhausts retries (3 attempts with exponential backoff), `callLLM` automatically tries the fallback provider. Defaults: generation→openai/gpt-5.2, evaluation→anthropic/claude-opus-4-6, adversarial→anthropic/claude-opus-4-6, forecasting→openai/gpt-5.2, extraction→openai/gpt-5.2. Admin-configurable via Admin Panel "Cross-Provider Fallback Models" card. Same-provider warnings shown in UI. Fallback config stored in `admin_config` key-value store (keys: `{role}FallbackProvider`, `{role}FallbackModel`).

**Model Defaults (latency-optimized)**: generation→anthropic (most creative), evaluation→openai (fastest at 2-5s), adversarial→openai (fast short-output stages), forecasting→anthropic, extraction→anthropic. Gemini is slowest (11-22s/call) and not used as primary for any role.

**Stage-Specific Timeouts & Token Limits**: Brainstorm/proposal stages use `maxTokens: 16384` (large structured output). Evaluation/negotiator/meta-evaluator use `maxTokens: 8192`. Domestic audiences/red-team use `maxTokens: 4096, timeoutMs: 180_000`. Diagnosis stage uses `maxTokens: 2048, timeoutMs: 120_000`. Default timeout is 300s for heavy stages.

**Compounding Retry Fix**: Anthropic SDK `maxRetries` set to 0 (was 2). Outer wrapper `MAX_LLM_RETRIES: 2` handles all retries with exponential backoff (5s, 10s). Max 3 attempts per provider, up to 6 with fallback. Timeout reduced from 600s to 300s in deal-engine.

**Provider-specific handling**: OpenAI uses `max_completion_tokens` (no temperature), Anthropic uses `max_tokens`, Gemini uses `contents` array format. All handled automatically by the router.

**Note**: Image/audio models in `lib/` (gpt-image-1, gpt-audio, gemini-2.5-flash-image, gpt-4o-mini-transcribe) are specialized hardware models and remain hardcoded — they are not text LLMs and don't need admin routing.

## Autoresearch Pipeline

Each cycle (triggered manually or by cron):
1. **Evidence ingestion** — RSS feeds (17 sources incl. policy journals, Google News search feeds) + GDELT (3 query variants) + ACLED + web_search (dedicated source type with configurable queries), filtered by tiered Iran keywords (primary = Iran-specific terms, secondary = requires 2+ hits). Full-text article fetching follows article links for up to 5 articles per source (SSRF-protected, manual redirect handling)
2. **Forecasting** — generates a single set of probabilities for 5 time horizons (10d, 30d, 90d, 180d, 1y) via admin-configured forecasting provider/model (no experimentation or hill-climbing)
3. **Changelog** — auto-headline generated from 90d probability leader
4. **Deal engine** — generates and evaluates peace deal proposals through multi-stage pipeline; hill-climbing/autoresearch applies only here, with composite scoring metric

Scheduler: hourly cron check, runs at UTC 6am daily by default.

### Two-Layer Evidence Context

The deal pipeline uses a two-layer evidence context system to give LLMs both structural and tactical awareness:

1. **Strategic Situation Assessment** — LLM-synthesized ~500-word narrative covering conflict trajectory, military situation, diplomatic landscape, sanctions/economic context, humanitarian conditions, and key structural factors. Generated from up to 150 evidence items across the full corpus using the extraction provider. Regenerated every pipeline cycle. Cached in `admin_config` (key: `latestStrategicSummary`).
2. **Recent Tactical Developments** — 30 most recent evidence items grouped by type (military, diplomatic, economic, humanitarian). Raw structured briefing with dated entries.

Both layers are concatenated and injected into stages 0-4 and 6 of the deal pipeline (brainstorm, proposal, stakeholder eval, domestic audience, red-team, judge panel). Evidence context is capped at 8000 chars per prompt to manage context windows. The `/api/evidence/summary` endpoint returns both layers for display in the Evidence Explorer.

## Frontend Pages

| Route | Page |
|---|---|
| `/` | Home — hero, peace gauge, AI vs Human comparison, champion deal narrative summary |
| `/forecasts` | Forecast Dashboard — bar chart, community forecast panel |
| `/deals` | Deal Dashboard — solution tree, Pareto frontier, deal cards |
| `/deals/history` | Deal History — standalone archive of all AI deal iterations with score evolution chart and expandable details |
| `/deals/:id` | Deal Permalink — shareable page for individual deals with markdown export and social sharing |
| `/arena` | Proposal Arena — US vs Iran vs AI deal comparison |
| `/stakeholders` | Stakeholder Gallery — expandable stakeholder profile cards |
| `/stakeholders/compare` | Stakeholder Comparison — multi-select comparison tool (up to 4) |
| `/evidence` | Evidence Explorer — searchable, filterable corpus browser (54+ items) |
| `/costs` | Cost-Benefit Analysis — war costs vs peace benefits by channel and stakeholder, humanitarian impact with Iran-attribution methodology and source citations, channel decomposition charts, treemap, radar charts, expanded methodology framework |
| `/lab` | Autoresearch Lab — improvement timeline, champion lineage, pipeline evolution, live status (4-tab view) |
| `/experiments` | Evolution Log — mutation table with result badges |
| `/submit` | Submit Proposal — public form for community proposal submissions |
| `/data` | Data Portal — JSON/CSV downloads for all 6 research datasets + RSS |
| `/api-docs` | API Documentation — 20 endpoints with examples, filterable by tag |
| `/open-source` | Open Source — contributing guide, tech stack, licence |
| `/changelog` | Platform Changelog — timeline of cycle headlines |
| `/changelog/:id` | Changelog Entry — detail view |
| `/deals/:id` | Deal Permalink — individual deal view with share modal, copy-as-markdown, social share buttons, score radar, stakeholder map |
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
- Full pipeline per cycle: RSS/ACLED/GDELT ingestion → proposal extraction → multi-model forecasting → hill-climbing optimization → **deal engine optimization** (generates & evaluates new deal via solution tree, updates Pareto frontier)
- Deal cycle runs as final step of each autoresearch cycle (non-critical — if it fails, forecasts are still saved)

## Phase 3 — Interactive Explorer & Community

**New DB tables**: `community_forecasts`, `proposal_submissions`

**New API routes**:
- `POST /api/community-forecasts` — submit probability forecast (sessionId + timeHorizon + estimates)
- `GET /api/community-forecasts/aggregate` — avg community forecast by time horizon
- `POST /api/proposals/submit` — public proposal submission (AI-screened, then goes to pending queue; returns 422 if rejected by LLM)
- `POST /api/proposals/screen` — AI screening endpoint (checks seriousness, legitimacy, uniqueness via Anthropic)
- `GET /admin/proposals/queue` — admin review queue with status filter
- `PATCH /admin/proposals/queue/{id}` — approve/reject (creates `proposals` entry when approved)
- `GET /api/changelog.xml` — RSS 2.0 feed of changelog entries
- `GET /api/downloads/index` — download manifest JSON
- `GET /api/downloads/forecasts.json|csv`, `deals.json|csv`, `experiments.csv`, `stakeholders.json`, `evidence.json`, `costs.json`

**Rate limiting**: `express-rate-limit` middleware — 120/min public, 5/15min submissions, 30/min downloads

**New pages**: Evidence Explorer, Stakeholder Comparison, Submit Proposal, Data Portal, API Docs, Open Source

**ForecastDashboard additions**: Community Forecast panel (AI vs crowd bar chart)

**Nav**: Grouped into Research / Explorer / Community / Info sections

**api-zod fix**: Changed `export * from "./generated/types"` → removed to prevent Zod const / TypeScript type name collision for new POST body schemas

## AI Proposal Screening

Before community proposals enter the admin review queue, an LLM screens them for seriousness, legitimacy, and uniqueness. Rejected proposals never enter the database — users receive specific feedback explaining why.

- **Service**: `artifacts/api-server/src/services/proposal-screening.ts` — fetches existing proposal summaries from DB, calls Anthropic API to evaluate
- **Endpoints**: `POST /api/proposals/screen` (standalone) and integrated into `POST /api/proposals/submit` (returns HTTP 422 with rejection reason)
- **Admin config key**: `submissionScreeningModel` (default: `claude-sonnet-4-5`) — configurable in Admin Panel "Submission Screening" card
- **Frontend**: `SubmitProposal.tsx` shows "Screening Your Proposal…" loading state and rejection card with reason/dismiss; `AdminPanel.tsx` has screening model config
- **Fail-open**: If the screening API is unavailable (network error), proposals pass through to human review

## Proposal Extractor Agent

Auto-scans ingested diplomatic evidence items for real-world peace proposals using Anthropic Claude. Runs after evidence ingestion in each autoresearch cycle (non-blocking — failures don't stop the cycle).

**Pipeline**: Batch unprocessed evidence (all types, not just diplomatic) → LLM extraction with improved prompt for policy journals and indirect proposal mentions → validate + deduplicate → insert proposal → run full 8-stage AI evaluation (stakeholder evaluations, domestic audience assessment, red-team stress testing, negotiator amendments, 3-model judge panel, meta-evaluation, diagnosis + what-would-it-take).

**Community proposals** also receive the same full 8-stage evaluation upon admin approval, ensuring parity with AI-generated and auto-extracted proposals.

**Key files**: `artifacts/api-server/src/services/proposal-extractor.ts`

**Deduplication**: Stable ID hash (name+source), exact name match, fuzzy word overlap (≥3 shared words >3 chars). In-memory dedupe sets updated after each insert. Uses `onConflictDoNothing().returning()` to detect actual inserts vs no-ops.

**Evidence lifecycle**: Evidence items marked `isProcessed=true` only AFTER extraction pipeline completes (not before), preventing permanent data loss on LLM failures.

## Phase 2 — Deal Engine (Task B)

Enhanced multi-agent pipeline (`deal-engine.ts`) with **grand coalition** cooperative game theory framing and AI creativity maximization:

0. **Innovation Brainstorm** (pre-stage) — extended creative reasoning: mines historical peace deal analogies, generates creative provisions, discovers cross-issue linkages across stakeholders, explores unconventional approaches. Output stored in `brainstormInsights` and feeds into proposal generation.
1. **Proposal Agent** (generation role) — designs deal terms per architecture using brainstorm insights; generates binding `stakeholderCommitments` for all 8 core parties + `innovativeProvisions` (novel mechanisms beyond traditional categories). No silent fallbacks — `parseLLMJson` throws `LLMParseError` on unparseable output rather than masking failures with static data.
2. **Stakeholder Evaluator** (evaluation role) — assesses **23 stakeholders across 4 tiers**; required parties (Iran, US) must be present in LLM output or stage throws `LLMParseError`
3. **Domestic Audiences** (evaluation role) — Iran/US/Israel domestic political sellability
3.5. **Creative Reframing** (generation role) — generates clever domestic selling narratives per stakeholder audience, transforming perceived concessions into perceived victories. Stored in `domesticFramingStrategies`.
4. **Red-Team Agent** (adversarial role) — 5 attack scenarios, severity + survival
5. **Creative Negotiator** (generation role) — searches for Pareto improvements and creative win-win tradeoffs rather than just patching rejections; uses domestic framing strategies
6. **Judge Agent** (evaluation role) — 7-dimension scoring (0–1 each) with tier-aware acceptance hierarchy and coalition stability evaluation
7. **Meta-Evaluator** (evaluation role) — pipeline reasoning quality + next architecture suggestion + `promptImprovements` for pipeline hill-climbing
8. **Diagnosis Generator** (adversarial role) — tier-aware diagnosis with required/critical rejection warnings

**Deal Memory & Learning System** (`deal-autoresearch.ts`):
- `buildDealMemory()` queries top 5 past deals + provision outcomes from `provision_outcomes` table
- Provides brainstorm/proposal stages with: which provisions helped/hurt scores, stakeholder verdict patterns, dimension-level insights
- `recordProvisionOutcomes()` saves per-provision performance after each deal cycle
- Provisions cross-referenced with historical data to populate `scoreDelta` for filtering effective vs harmful provisions

**Architecture Selection** (7 total):
- **Standard** (4): `balanced`, `nuclear-first`, `hormuz-first`, `humanitarian-first`
- **Radical** (3): `radical-restructure` (fundamental paradigm shifts), `asymmetric-grand-bargain` (bold asymmetric swaps), `incremental-confidence` (micro-step CBMs)
- 30% random radical exploration probability per cycle; also triggered on stall detection (3+ consecutive non-improving cycles)

**Stakeholder Rejection Penalties** (diminishing floor model, not multiplicative):
- `diminish(score, floor, strength)` = `floor + (score - floor) * strength`
- Required rejection: floor 0.10, strength 0.35 + additive composite offset -0.10
- Critical rejection: floor 0.20, strength 0.50 + additive composite offset -0.05
- Influential/contextual: lighter penalties preserving score differentiation

**Pipeline Hill-Climbing** (`pipelineEvolutionTable` in DB):
- Meta-evaluator suggests specific prompt improvements after each cycle
- `evolvePipeline()` in autoresearch stores cumulative overrides keyed by stage (`brainstorm_system`, `proposal_system`, `framing_system`, `negotiator_system`, etc.)
- Future pipeline runs apply these overrides, enabling the AI to iteratively improve its own deal generation prompts over time

**Tiered Stakeholder Acceptance System** (DB-driven, loaded via `loadStakeholderRegistryFromDB()` at pipeline start):
- **Required** (Iran, US) — both must accept for deal to be implementable
- **Critical** (Israel) — rejection severely undermines viability
- **Influential** (Saudi Arabia, EU3, Russia, China, IAEA) — affects durability but not gatekeepers
- **Contextual** (UAE, Qatar, Turkey, Iraq, Egypt, India, Japan, South Korea, Jordan, Pakistan, Ukraine, Oman, Global North, Global South Energy Exporters, Global South Energy Importers) — affects regional stability
- Profiles updated each autoresearch cycle via `stakeholder-updater.ts` (LLM analyzes recent evidence for material position shifts)

**Grand Coalition**: `DealTerms.stakeholderCommitments` (optional `Record<string, string>`) stores binding commitments from each stakeholder. Validated post-generation to ensure all 8 core parties have concrete commitments (auto-fills from defaults if LLM omits any). Displayed in Deal Dashboard and Proposal Arena frontend.

**API**: `GET /api/stakeholders/tiers` returns the full tier registry grouped by tier level.

**Per-role provider config**: generation/evaluation/adversarial each have independent `{provider, model}` settings stored in `admin_config` key-value store. `validateModelConfig()` enforces `generationProvider !== evaluationProvider` at runtime.

**API routes added**: `/deals/history`, `/deals/robustness`, `/deals/compare`, `/deals/{id}/stakeholder-evals`, `/deals/{id}/llm.md` (markdown export), `POST /deals/{id}/share-text` (LLM-generated social share text), `/admin/proposals/{id}/evaluate`, `/admin/pipeline/config`

## Key Files

- `artifacts/api-server/src/services/llm-router.ts` — unified LLM router; throws `LLMCallError` on provider failures (no silent swallowing)
- `artifacts/api-server/src/services/autoresearch.ts` — forecast cycle orchestrator
- `artifacts/api-server/src/services/deal-engine.ts` — 8-stage deal pipeline; throws `LLMParseError` on unparseable output; `classifyStageError()` provides typed error context (llm_call/llm_parse/runtime) at pipeline boundary
- `artifacts/api-server/src/services/stakeholder-updater.ts` — evidence-driven stakeholder profile updater (LLM-based; throws on parse failure)
- `artifacts/api-server/src/services/deal-autoresearch.ts` — deal cycle loop, solution tree, Pareto. Architectures: standard (balanced, nuclear-first, hormuz-first, humanitarian-first) + radical (radical-restructure, asymmetric-grand-bargain, incremental-confidence, freeform). Freeform has no predetermined constraints — the AI decides the deal's organizing logic from evidence.
- `artifacts/api-server/src/services/deal-narrative.ts` — generates LLM-powered concise prose narrative from deal markdown; called on new champion and on-demand via `?generate=true`
- `artifacts/api-server/src/routes/deals.ts` — deal API endpoints incl. history/robustness/compare/narrative
- `artifacts/api-server/src/routes/proposals.ts` — proposals + admin evaluate endpoint
- `artifacts/api-server/src/routes/admin.ts` — admin config + pipeline config with per-role providers
- `artifacts/api-server/src/seed/proposals.ts` — seeds 4 real-world proposals (US 15-pt, Iran 5-pt, Zarif Foreign Affairs, China-Pakistan 5-pt) + AI auto-eval
- `artifacts/autopeace/src/pages/AdminPanel.tsx` — per-role provider dropdowns + proposal management form
- `artifacts/autopeace/src/App.tsx` — React router + page layout
- `lib/api-spec/openapi.yaml` — full OpenAPI 3.1 spec (all new endpoints documented)
- `lib/api-client-react/src/generated/` — orval-generated React Query hooks
- `artifacts/api-server/src/tests/` — LLM diagnostic test suite (8 tests + run-all runner)

## LLM Diagnostic Test Suite

8 diagnostic scripts in `artifacts/api-server/src/tests/`:
- **01**: Provider connectivity (Anthropic/OpenAI/Gemini)
- **02**: Timeout & max_tokens experiments
- **03**: Prompt size stress testing
- **04**: Retry & backoff validation (offline — tests `isRetryableError()` + compounding analysis)
- **05**: Frontier model comparison benchmarks
- **06**: JSON parsing robustness (offline — tests deal-engine and scoring parsers)
- **07**: Pipeline smoke test (all 8 stages)
- **08**: Compound failure scenarios (production error patterns)

Run offline tests: `cd artifacts/api-server && npx tsx src/tests/run-all.ts --offline`
Run all tests: `cd artifacts/api-server && npx tsx src/tests/run-all.ts`
Run single test: `cd artifacts/api-server && npx tsx src/tests/04-retry-backoff-validation.ts`

## Shared UI Components

- **`ScoreBreakdownPanel`** (`artifacts/autopeace/src/components/ScoreBreakdownPanel.tsx`) — reusable score breakdown with per-dimension rationale + 3-model judge panel tabs. Exports `ScoreBreakdownPanel` component, `SCORE_DIMENSIONS` config, and `ExtendedScores` type. Used by both `DealDashboard.tsx` and `ProposalArena.tsx`.

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
