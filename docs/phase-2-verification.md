# Phase 2 persistence verification

Date: 2026-06-20

## Completed

- Added PostgreSQL 17 local Compose service bound only to localhost.
- Added typed Drizzle database package and committed SQL migration.
- Added production-aware database environment validation.
- Made API health depend on a successful database query.
- Made the worker persist its heartbeat in PostgreSQL.
- Added explicit local backup and restore commands.
- Preserved zero known npm vulnerabilities using narrow dependency overrides.

## Runtime proof

- Migration created only the Drizzle journal, `service_heartbeats`, and `system_settings` tables.
- Compiled API health returned `api: ok` with PostgreSQL running.
- Compiled worker persisted `worker: ok` in `service_heartbeats`.
- Backup captured a marker with value `before_backup`.
- The live value was changed to `after_backup`.
- Restore returned the value to `before_backup`, proving recovery rather than file creation alone.

## Regression proof

- Formatting passed.
- Linting passed across all workspaces.
- Type checking passed across all workspaces.
- Ten unit tests passed.
- Production builds passed for shared packages, API, worker, and Next.js web.

Production backup encryption and offsite transfer remain intentionally deferred until the Coolify
deployment package is built.
