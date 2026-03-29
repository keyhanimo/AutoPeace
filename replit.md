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

- **stakeholders** — 28 conflict actors (Iran, US, Israel, Houthis, etc.) with flags/roles
- **cycles** — autoresearch run records (status, tokens, cost, timestamps)
- **forecasts** — probability distributions across 8 outcome states per time horizon
- **experiments** — red-team mutation log (Task A: Gemini red-team + GPT-4o eval)
- **evidence_items** — ingested RSS articles classified by evidence type
- **evidence_sources** — 5 RSS source configurations
- **cost_of_war** — economic/human cost data for Iran, US, Israel
- **changelog_entries** — auto-generated headlines summarizing each cycle
- **admin_config** — key/value config (isPaused, cadence, etc.)

Run migrations: `pnpm --filter @workspace/db run push`

## API Routes (`/api/...`)

### Public
- `GET /api/healthz`
- `GET /api/forecasts/latest` — current forecasts (all horizons)
- `GET /api/experiments` — experiment log (paginated)
- `GET /api/costs` — cost-of-war data
- `GET /api/evidence` — recent evidence items
- `GET /api/changelog` — cycle changelog entries
- `GET /api/stakeholders` — all 28 stakeholders

### Admin (requires `X-Admin-Key: $ADMIN_PASSWORD`)
- `POST /api/admin/run` — trigger autoresearch cycle immediately
- `GET /api/admin/config` — view admin config
- `PUT /api/admin/config` — update config (isPaused, cadence)
- `GET /api/admin/cycles` — list all cycles with status

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
| `/` | Home — hero, peace gauge, stakeholder grid |
| `/forecasts` | Forecast Dashboard — bar chart, model metadata, rationale |
| `/costs` | Cost Explorer — economic/human cost data by actor |
| `/experiments` | Evolution Log — mutation table with result badges |
| `/changelog` | Platform Changelog — timeline of cycle headlines |
| `/methodology` | Methodology — Bayesian approach, 8-state MECE taxonomy |
| `/admin` | Admin Panel — password-gated controls (X-Admin-Key) |

## Key Files

- `artifacts/api-server/src/services/autoresearch.ts` — main cycle orchestrator
- `artifacts/api-server/src/services/forecasting.ts` — Anthropic forecasting
- `artifacts/api-server/src/services/evidence-ingestion.ts` — RSS ingest
- `artifacts/api-server/src/seed/` — seed data (stakeholders, RSS sources, costs)
- `artifacts/autopeace/src/App.tsx` — React router + page layout
- `artifacts/autopeace/src/components/Layout.tsx` — sidebar nav
- `artifacts/autopeace/src/index.css` — dark navy + amber/gold theme
- `lib/api-spec/openapi.yaml` — full OpenAPI 3.1 spec

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
