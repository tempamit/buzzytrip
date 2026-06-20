# Database operations

The local PostgreSQL service is bound to `127.0.0.1` and is not exposed to other machines.

## Local lifecycle

```bash
npm run db:up
npm run db:migrate
npm run db:backup
npm run db:down
```

Restore is intentionally explicit and destructive:

```bash
npm run db:restore -- backups/FILE.sql --confirm-local
```

## Migration policy

1. Schema changes are generated into `packages/database/drizzle`.
2. Migrations are committed with the code that consumes them.
3. Migrations are additive during the initial deployment.
4. A backup is created before destructive production changes.
5. Application rollback must not require rolling a destructive migration backward.

Local SQL backups are ignored by Git. Production backups will be encrypted and copied to private
offsite storage; that workflow will be added with the Coolify deployment package.
