import {
  createDatabase,
  createDatabasePool,
  listDestinationTrendIdentities,
  upsertRankedTrendCandidates,
  upsertTrendObservations,
} from '@buzzytrip/database';
import { URL } from 'node:url';

const defaultLocalDatabaseUrl = 'postgresql://buzzytrip:buzzytrip_local@127.0.0.1:55432/buzzytrip';
const connectionString = process.env.DATABASE_URL ?? defaultLocalDatabaseUrl;
const parsedUrl = new URL(connectionString);

if (!['127.0.0.1', 'localhost', '::1'].includes(parsedUrl.hostname)) {
  console.error('Refusing to run trend storage verification against a non-local database.');
  process.exit(2);
}

const destinationId = '00000000-0000-4000-8000-000000000006';
const destinationSlug = 'phase6-storage-verification';
const normalizedName = 'verification island';
const observedOn = '2099-06-06';
const pool = createDatabasePool(connectionString, 'buzzytrip-trend-storage-verification', 2);
const database = createDatabase(pool);

async function cleanVerificationRows() {
  await pool.query(
    'delete from trend_candidates where provider = $1 and normalized_name = $2 and observed_on = $3',
    ['composite-v1', normalizedName, observedOn],
  );
  await pool.query(
    'delete from trend_observations where provider = $1 and normalized_name = $2 and observed_on = $3',
    ['wikivoyage_pageviews', normalizedName, observedOn],
  );
  await pool.query('delete from destinations where id = $1 or slug = $2', [
    destinationId,
    destinationSlug,
  ]);
}

try {
  await cleanVerificationRows();
  await pool.query(
    `insert into destinations
      (id, slug, name, country_code, country_name, scope, destination_type, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      destinationId,
      destinationSlug,
      'Verification Island',
      'IN',
      'India',
      'india',
      'island',
      'active',
    ],
  );
  await pool.query(
    'insert into destination_aliases (destination_id, normalized_alias) values ($1, $2)',
    [destinationId, 'test isle'],
  );

  const firstSignal = {
    context: ['verification:first'],
    displayName: 'Verification Island',
    metricValue: 100,
    normalizedName,
    observedOn,
    provider: 'wikivoyage_pageviews',
    rank: 10,
    score: 60,
    sourceUrl: 'https://example.com/verification/first',
  };
  const updatedSignal = {
    ...firstSignal,
    context: ['verification:updated'],
    metricValue: 200,
    rank: 4,
    score: 88,
    sourceUrl: 'https://example.com/verification/updated',
  };

  const firstCandidate = {
    countryCode: 'IN',
    countryName: 'India',
    destinationId,
    displayName: 'Verification Island',
    normalizedName,
    providerScores: { wikivoyage_pageviews: 60 },
    reasons: ['wikivoyage_pageviews:60.0'],
    scope: 'india',
    score: 60,
    status: 'eligible',
  };
  const updatedCandidate = {
    ...firstCandidate,
    providerScores: { wikivoyage_pageviews: 88 },
    reasons: ['wikivoyage_pageviews:88.0', 'publication_gap:deferred'],
    score: 88,
    status: 'deferred',
  };

  await upsertTrendObservations(database, [firstSignal]);
  await upsertTrendObservations(database, [updatedSignal]);
  await upsertRankedTrendCandidates(database, [firstCandidate], observedOn);
  await upsertRankedTrendCandidates(database, [updatedCandidate], observedOn);

  const identities = await listDestinationTrendIdentities(database);
  const identity = identities.find((item) => item.id === destinationId);
  const observation = await pool.query(
    `select count(*)::integer as count, max(metric_value) as metric_value, max(score) as score
     from trend_observations
     where provider = $1 and normalized_name = $2 and observed_on = $3`,
    ['wikivoyage_pageviews', normalizedName, observedOn],
  );
  const candidate = await pool.query(
    `select count(*)::integer as count, max(trend_score) as trend_score, max(status) as status
     from trend_candidates
     where provider = $1 and normalized_name = $2 and observed_on = $3`,
    ['composite-v1', normalizedName, observedOn],
  );

  if (
    identity?.aliases[0] !== 'test isle' ||
    observation.rows[0]?.count !== 1 ||
    observation.rows[0]?.metric_value !== '200.000' ||
    observation.rows[0]?.score !== '88.000' ||
    candidate.rows[0]?.count !== 1 ||
    candidate.rows[0]?.trend_score !== '88.000' ||
    candidate.rows[0]?.status !== 'deferred'
  ) {
    throw new Error('Trend storage verification failed.');
  }

  console.log(
    'Trend storage verification passed: repeated writes updated one observation and candidate.',
  );
} finally {
  await cleanVerificationRows();
  await pool.end();
}
