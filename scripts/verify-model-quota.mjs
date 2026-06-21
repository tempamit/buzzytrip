import {
  createDatabase,
  createDatabasePool,
  recordDailyModelTokenUsage,
  reserveDailyModelRequest,
} from '@buzzytrip/database';
import { URL } from 'node:url';

const defaultLocalDatabaseUrl = 'postgresql://buzzytrip:buzzytrip_local@127.0.0.1:55432/buzzytrip';
const connectionString = process.env.DATABASE_URL ?? defaultLocalDatabaseUrl;
const parsedUrl = new URL(connectionString);

if (!['127.0.0.1', 'localhost', '::1'].includes(parsedUrl.hostname)) {
  console.error('Refusing to run the quota verification against a non-local database.');
  process.exit(2);
}

const pool = createDatabasePool(connectionString, 'buzzytrip-quota-verification', 4);
const database = createDatabase(pool);
const verificationDate = '2099-01-01';
const verificationTime = new Date(`${verificationDate}T12:00:00.000Z`);

try {
  await pool.query('delete from model_usage_daily where provider = $1 and usage_date = $2', [
    'gemini',
    verificationDate,
  ]);

  const reservations = await Promise.all(
    Array.from({ length: 20 }, () =>
      reserveDailyModelRequest(database, 'gemini', 10, verificationTime),
    ),
  );
  await recordDailyModelTokenUsage(
    database,
    'gemini',
    { inputTokens: 3, outputTokens: 2 },
    verificationTime,
  );

  const result = await pool.query(
    'select request_count, input_tokens, output_tokens from model_usage_daily where provider = $1 and usage_date = $2',
    ['gemini', verificationDate],
  );
  const granted = reservations.filter(Boolean).length;
  const row = result.rows[0];

  if (
    granted !== 10 ||
    row?.request_count !== 10 ||
    row.input_tokens !== 3 ||
    row.output_tokens !== 2
  ) {
    throw new Error('Persistent quota verification failed.');
  }

  console.log('Persistent quota verification passed: 10 of 20 concurrent requests reserved.');
} finally {
  await pool.query('delete from model_usage_daily where provider = $1 and usage_date = $2', [
    'gemini',
    verificationDate,
  ]);
  await pool.end();
}
