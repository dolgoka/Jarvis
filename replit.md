# Business Jarvis

Global business intelligence command center — a real-time dashboard where an owner monitors all their worldwide businesses from a single interface, featuring an interactive 3D globe with clickable business nodes, AI executive briefings, and per-period financial reports.

## Quick start (new Replit)

Новый Replit: импорт из гита → вставить `OPENAI_API_KEY` в Secrets → Run.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/business-jarvis run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` — for AI summaries (auto-provisioned via Replit AI Integrations)
- **Railway**: добавить в Variables → `OPENAI_API_KEY` = `sk-...` (без него все AI-эндпоинты вернут 503)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, react-globe.gl (Three.js 3D globe), Recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- AI: OpenAI via Replit AI Integrations
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/` — DB schema: `businesses.ts`, `reports.ts`
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/business-jarvis/src/pages/` — Frontend pages

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks + Zod validators
- Globe uses react-globe.gl (WebGL/Three.js); GlobeErrorBoundary provides 2D fallback for headless environments
- Manager connect endpoint uses access code `JARVIS2024` as lightweight auth
- AI summaries are generated on-demand per period via OpenAI chat completions with structured JSON output
- Reports are stored flat (businessId + period + date) — one row per business per period per date

## Product

- **Globe Dashboard** (`/`): Interactive 3D globe with business pins, global revenue stats, top businesses ranking, and a slide-over panel for per-business telemetry
- **Network** (`/businesses`): Table of all business nodes with location, sector, and status
- **Business Detail** (`/businesses/:id`): Full telemetry view with revenue/profit charts, period switcher, manager info
- **AI Briefing** (`/ai-summary`): AI-generated executive summary with highlights, powered by OpenAI
- **Establish Link** (`/connect`): Manager portal to register a new business node (access code: JARVIS2024)

## User preferences

- Dark theme throughout — deep space / command center aesthetic
- Cyan/electric blue as primary accent color
- All business language uses "command center" framing (nodes, uplink, telemetry, etc.)
- After every completed task: attach 1–2 screenshots of verified screens. Always navigate via `?role=client` (bypasses role selector). Always hard-refresh the page before screenshotting to avoid stale HMR snapshots.

## Gotchas

- WebGL 3D globe won't render in headless/screenshot environments — GlobeErrorBoundary shows a 2D fallback automatically
- Always run codegen after changing openapi.yaml before touching frontend or backend
- Operations with both path AND query params cause Zod/TypeScript collision in api-zod barrel — move to query-only params to avoid

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
