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
npm run dev
npm run check
npm run deploy:smoke
```

`npm run check` is the release gate: formatting, linting, type checking, tests, and builds must all
pass before a change is considered complete. Workspaces are checked sequentially in dependency
order so local machines and the initial VPS are not overwhelmed by competing builds.

## Current scope

The foundation now includes the destination, trend, evidence, media-rights, immutable revision, and
publication lifecycle, plus published-only destination read APIs. It deliberately contains no
seeded travel content or model-provider integration yet. The workflow is documented in
`docs/content-lifecycle.md`.
