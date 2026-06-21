# Coolify staging deployment

This document describes the future staging deployment. Do not change production DNS while following
it.

## Architecture

- Coolify PostgreSQL resource: private, persistent database
- Compose `migrate`: one-shot schema migration
- Compose `api`: private application API on port 4000
- Compose `worker`: private background process
- Compose `web`: the only public application, on port 3000

## Required environment values

Set these in Coolify rather than committing them:

```text
DATABASE_URL=<Coolify PostgreSQL internal URL>
API_DB_POOL_MAX=10
WORKER_DB_POOL_MAX=5
WORKER_HEARTBEAT_INTERVAL_MS=30000
LOG_LEVEL=info
```

`DATABASE_URL` is deliberately required. Deployment fails before starting the application if it is
missing.

## Local production smoke test

With Docker Desktop running, execute `npm run deploy:smoke`. The command builds the same production
targets used by Coolify, launches an isolated PostgreSQL database, verifies the API, website, and
worker heartbeat, and removes the temporary stack when it finishes.

## Staging procedure

1. Create a PostgreSQL resource in Coolify.
2. Keep its port private; do not enable public database access.
3. Create a Docker Compose application from the GitHub repository.
4. Select branch `main` and Compose file `compose.coolify.yaml`.
5. Add the PostgreSQL internal URL as `DATABASE_URL`.
6. Give only the `web` service a generated Coolify staging domain on port 3000.
7. Do not assign domains to `api`, `worker`, or `migrate`.
8. Deploy and confirm that `migrate` completes successfully.
9. Confirm `api` and `web` become healthy and `worker` remains running.
10. Keep staging blocked from search indexing.

## Production-domain rule

`www.buzzytrip.com` remains unchanged until the complete MVP passes its launch gate. The generated
Coolify domain is sufficient for staging and internal verification.
