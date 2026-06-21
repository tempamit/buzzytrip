# Destination content lifecycle

BuzzyTrip separates discovery, research, drafting, quality review, and publication. A model response
is never a public page by itself.

## Daily selection lanes

- Indian and international destinations are ranked independently.
- Trend observations are stored with their provider, date, score, and original signal metadata.
- Known aliases match different spellings to one canonical destination.
- A destination is deferred if it appears in the latest six publications. It becomes eligible again
  after six other posts, which keeps repeat coverage within the agreed five-to-seven-post gap.
- Selection does not guarantee publication. A failed evidence, media, or quality gate leaves that
  lane unpublished rather than releasing weak content.

## Research and originality

- Research records retain the page URL, publisher, retrieval date, and a content hash; copied source
  bodies are not used as article content.
- Each factual section can be traced to one or more source records.
- Every revision has a content fingerprint. The database rejects an identical fingerprint even when
  a destination is intentionally featured again.
- A repeated destination receives a new angle, title, theme, and immutable revision.

## Images

- Image records include their provider, original URL, storage key, credit, licence, dimensions, alt
  text, and checksum.
- A guide revision explicitly assigns hero, gallery, and inline roles.
- An image without known usage rights and attribution cannot enter the publication workflow.

## Revision states

```text
draft -> quality_failed
      -> ready -> published
      -> rejected
```

Published revisions are never overwritten. Corrections create a new revision, allowing rollback and
an auditable history. A separate publication record controls what the public API can return.

## Public boundary

The public endpoints are:

- `GET /api/destinations?limit=20`
- `GET /api/destinations/:guideSlug`

They join through active publication records and cannot expose drafts, rejected revisions, model
metadata, private research notes, or unpublished media.
