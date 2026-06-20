# Phase 0 technical audit

Date: 2026-06-20

## Repository

- Remote: `https://github.com/tempamit/buzzytrip`
- Default local branch: `main`
- Initial state: empty repository with no commits or existing code
- Legacy constraints: none

## Local toolchain

- Node.js: 22.17.1
- Docker: 29.4.0
- Docker Compose: 5.1.1
- Git: 2.50.1

The machine's global npm launcher resolves an invalid per-user npm path. The intact npm CLI under
the Node installation can be invoked directly without changing the user's global setup.

## Decisions carried into implementation

- TypeScript across web, API, worker, and shared packages
- Next.js public website
- NestJS application API
- Separate worker process
- PostgreSQL in the next phase
- Coolify staging before production
- Light interface only
- No manual travel-content authoring
- No automatic paid model fallback
- Regression gates before every merge or deployment

## Items to inspect before staging deployment

- VPS CPU, RAM, storage, and current container usage
- Coolify version and existing resources
- Hostinger DNS records
- Provider-side Gemini and Groq billing limits
- Shared-hosting backup and SMTP access
