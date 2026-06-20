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

## Requirements

- Node.js 22
- npm 10+
- Docker (database and deployment work begins in the next phase)

## Local commands

```bash
npm install
npm run dev
npm run check
```

`npm run check` is the release gate: formatting, linting, type checking, tests, and builds must all
pass before a change is considered complete. Workspaces are checked sequentially in dependency
order so local machines and the initial VPS are not overwhelmed by competing builds.

## Current scope

This initial foundation deliberately contains no destination content or model integrations. Those
features will be added only after the health, configuration, test, and deployment boundaries are
verified.
