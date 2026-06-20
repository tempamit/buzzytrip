# Foundation architecture

## Runtime boundaries

```text
Browser -> Next.js web -> internal NestJS API -> PostgreSQL
                                  ^                 ^
                                  |                 |
                                  +------ worker ---+
```

- The web application owns rendering and browser interaction.
- The API owns validation, permissions, and application operations.
- The worker owns long-running, scheduled, and model-backed tasks.
- PostgreSQL owns durable application state and remains inaccessible from the public internet.
- Shared contracts prevent the three runtimes from silently disagreeing.
- Runtime configuration is parsed at process startup and fails closed when invalid.

## Compatibility policy

- Add new contract fields before making them required.
- Deploy readers before writers for changed data shapes.
- Keep destructive migrations separate from replacement migrations.
- Put incomplete user-facing behaviour behind a feature flag.
- Preserve content as immutable revisions rather than overwriting it.

## Production direction

Coolify will deploy the application stack on the Hostinger VPS. PostgreSQL and the worker remain
private. Custom DNS records will direct `www.buzzytrip.com` and media traffic to Coolify only when
the launch gates pass.

## Local persistence

Local PostgreSQL runs in Docker and binds only to `127.0.0.1:55432`. The nonstandard host port avoids
conflicts with existing Windows services; containers and Coolify continue using PostgreSQL's normal
internal port 5432.
