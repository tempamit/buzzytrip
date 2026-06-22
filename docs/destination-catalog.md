# Initial destination catalogue

BuzzyTrip starts with a curated metadata catalogue of 176 active destinations: 75 Indian and 101
international. It includes cities, regions, coasts, islands, nature and wildlife areas, and selected
countries that commonly appear in public trend feeds.

The catalogue is metadata, not generated travel copy. It contains only the canonical name, URL slug,
country, region, destination type, trend lane, and useful alternate names. Destination articles are
still created through the separate research, generation, review, and publication workflow.

## Repeatable seeding

The one-shot migration process seeds the catalogue after schema migrations. Repeated deployments
update canonical metadata and add missing aliases without creating duplicate destinations. An
operator's archived status is preserved; redeployment does not silently reactivate a destination.

Local commands:

- `npm run db:migrate` applies migrations and seeds the catalogue.
- `npm run db:seed` repeats only the catalogue seed.
- `npm run db:verify-catalog` seeds twice and verifies the managed destination and alias set against a
  local PostgreSQL database.

Trend matching uses the same normalisation function as catalogue validation. An alias must be an
unambiguous, already-normalised lookup phrase. Broad or risky abbreviations are deliberately omitted.
