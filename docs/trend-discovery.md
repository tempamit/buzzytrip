# Trend discovery

BuzzyTrip treats a trend as a signal to investigate, not permission to publish. Automatic discovery
is disabled by default with `TREND_DISCOVERY_ENABLED=false`.

## Public signal sources

- Google Trends RSS across configured country feeds supplies search momentum.
- English Wikivoyage top pageviews supply travel-intent interest.
- English Wikipedia top pageviews supply broader public interest.

No model, image, search, or paid API key is used to collect these signals. Wikimedia requests carry
an identifying BuzzyTrip user agent and use a two-day lag because pageview aggregates are not
real-time.

## Matching and safety

Signals only become candidates when they match a known active destination name or alias. Exact
normalised matching is used; a small set of travel suffixes such as “travel” and “hotels” may be
removed. Unmatched people, sports, products, and news topics remain raw observations and cannot enter
the content workflow.

Candidate scoring combines provider-specific rank and momentum. Independent provider agreement earns
a small bonus. Crisis terms—including earthquakes, floods, attacks, crashes, evacuations, and war—
reject the candidate instead of turning suffering into travel inspiration.

Eligible candidates still pass the six-publication destination gap. The worker selects at most one
Indian and one international candidate; either lane may remain empty when no safe candidate qualifies.

## Storage and scheduling

Raw observations and composite candidates use idempotent daily keys, so retries do not create
duplicates. When enabled, the worker runs once at startup and then every 24 hours by default. The
initial destination metadata catalogue will be added before automatic discovery is enabled.

`npm run trend:dry-run` fetches and prints a small signal summary without writing to PostgreSQL.
