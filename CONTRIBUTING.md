# Contributing

## Branch discipline

- `main` must remain releasable.
- `develop` is the integration branch for staging.
- Use short-lived `feature/*` branches for implementation work.

## Definition of done

A change is complete only when:

1. Existing behaviour remains covered by regression tests.
2. New behaviour has focused tests.
3. `npm run check` passes.
4. Database changes, once introduced, are additive and forward-compatible.
5. New features default to off until their acceptance gate passes.
6. No credential or private user information is committed.

## Content rule

Travel content is generated through the sourced content pipeline. Do not patch published travel
copy directly; correct the research packet, rule, or prompt and create a new revision.
