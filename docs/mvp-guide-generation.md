# MVP guide generation

The first content batch contains six Indian and six international destinations:

- Udaipur, Goa, Munnar, Varanasi, Rishikesh, and Jaipur
- Tokyo, Dubai, Paris, Singapore, Sydney, and Amsterdam

Each profile has a distinct angle, audience, theme, search phrase, image query, and reachable official
tourism source. Wikipedia and Wikivoyage provide two additional independent research records.

## Research gate

`npm run research:dry-run -- --destination=udaipur` collects a no-write evidence preview. A bundle
fails unless it has at least three publishers, one official source, and 4,000 usable evidence
characters. Source bodies remain in memory only. PostgreSQL retains the URL, publisher, retrieval
time, content hash, source type, and a short extraction note.

Evidence supplied to a model is bounded and treated as untrusted. Generated output must reference
valid source indexes, use at least three sources, and cover every factual guide section. A separate
similarity gate rejects close reproduction of source language.

## Image gate

`npm run media:dry-run -- --destination=udaipur` previews Unsplash results without marking them as
used. Selected images stay hotlinked to Unsplash. Stored metadata includes the photographer credit
and link, photo source link, licence and link, dimensions, and a stable metadata checksum. The
provider download-tracking endpoint is called only when an image is attached to a successful draft.

## Explicit local generation

`npm run content:generate-mvp -- --destination=udaipur --execute` is intentionally restricted to a
local PostgreSQL database and requires the explicit `--execute` flag. It collects fresh research,
reserves a persistent daily request allowance, records the model attempt, applies schema and quality
gates, selects attributed images, and creates an immutable `ready` revision.

The command never creates a publication row. A ready revision remains invisible to the public API
until the later publication workflow approves it.

The application cannot determine whether billing is enabled on a provider account. Do not run live
generation until billing is disabled and the configured models are confirmed to be within the
account's intended free allowance.
