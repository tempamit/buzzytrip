# Model provider policy

BuzzyTrip supports Gemini and Groq through one structured-generation boundary. The worker is
provider-neutral: prompts, contracts, quality checks, quota handling, and publication rules do not
depend on either vendor.

## Safe default

`CONTENT_GENERATION_ENABLED` defaults to `false`. A deployment without model keys continues to run
its API, web application, migrations, and worker heartbeat, but it cannot make a model request.

Keys must be stored only in a local ignored `.env` file or Coolify's secret environment settings.
They must never be committed to GitHub, included in logs, or sent to the browser.

## Free-only operating rule

BuzzyTrip has no paid-provider fallback. The initial limits are deliberately conservative:

- Gemini: 10 reserved requests per UTC day
- Groq: 10 reserved requests per UTC day
- Maximum output: 8,192 tokens per request
- Maximum source material: 60,000 characters per request

The database reserves each request atomically before it is sent. Restarts and concurrent worker
processes therefore cannot reset or race past the BuzzyTrip limit. Failed and quality-rejected calls
still consume a reservation because provider limits may count them.

These limits protect usage but cannot inspect a provider account's billing configuration. Before
enabling generation, keep billing disabled on the relevant Gemini and Groq projects and confirm the
chosen models are available under those accounts' current free allowances.

## Provider order and fallback

`MODEL_PROVIDER_ORDER=gemini,groq` tries Gemini first. A provider is skipped when its key is absent or
its BuzzyTrip daily allowance is exhausted. A structured response that fails schema or editorial
quality validation is not published and may fall through to the next configured free provider.

Model identifiers are environment values because providers rename and retire models. The current
defaults are `gemini-flash-latest` and `openai/gpt-oss-20b`; changing either requires no code change.

## Content gates

Every generated guide must:

- match the shared destination JSON contract;
- stay within length and sentence-complexity limits;
- avoid model self-reference, travel clichés, exaggerated certainty, and duplicated sentences;
- keep the primary-keyword density below the stuffing threshold;
- remain sufficiently different from previous BuzzyTrip guides;
- use only bounded research evidence supplied by the worker; and
- reference valid evidence indexes across every factual guide section;
- remain sufficiently different from the wording of supplied sources; and
- remain unpublished until source, media-rights, and publication checks also pass.

No AI detector can reliably prove authorship. BuzzyTrip therefore optimises for useful, sourced,
original, plain-language travel writing rather than making an unverifiable “undetectable” claim.
