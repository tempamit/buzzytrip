# BuzzyTrip

BuzzyTrip is a travel-intelligence and itinerary-planning platform. The repository is organised
as a TypeScript monorepo so the public website, API, background worker, and shared business rules
evolve together without drifting apart.

## Applications

- `apps/web` — Next.js public and administrative interface
- `apps/api` — NestJS application API
- `apps/worker` — asynchronous content and maintenance jobs

## Shared packages

- `packages/config` — validated runtime configuration
- `packages/contracts` — shared API and job contracts
- `packages/database` — PostgreSQL schema, migrations, and shared database access

## Requirements

- Node.js 22
- npm 10+
- Docker Desktop for PostgreSQL and production-container verification

## Local commands

```bash
npm install
npm run db:up
npm run db:migrate
npm run db:verify-model-quota
npm run dev
npm run check
npm run deploy:smoke
```

`npm run check` is the release gate: formatting, linting, type checking, tests, and builds must all
pass before a change is considered complete. Workspaces are checked sequentially in dependency
order so local machines and the initial VPS are not overwhelmed by competing builds.

## Current scope

The foundation now includes the destination, trend, evidence, media-rights, immutable revision, and
publication lifecycle, plus published-only destination read APIs. The worker has disabled-by-default
Gemini and Groq adapters, persistent free-usage budgets, structured prompts, and editorial quality
gates. It deliberately contains no provider secrets, live model calls, or seeded travel content yet.
The workflows are documented in `docs/content-lifecycle.md` and `docs/model-providers.md`.
