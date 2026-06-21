import { parseWorkerEnvironment } from '@buzzytrip/config';
import {
  checkDatabaseConnection,
  createDatabase,
  createDatabasePool,
  recordServiceHeartbeat,
} from '@buzzytrip/database';
import pino from 'pino';

import { createWorkerHeartbeat } from './heartbeat';
import { createConfiguredModelProviders } from './models/provider-factory';

async function run(): Promise<void> {
  const environment = parseWorkerEnvironment(process.env);
  const logger = pino({ level: environment.LOG_LEVEL });
  const pool = createDatabasePool(
    environment.DATABASE_URL,
    'buzzytrip-worker',
    environment.DB_POOL_MAX,
  );
  const database = createDatabase(pool);
  const configuredModelProviders = createConfiguredModelProviders(environment);
  const heartbeatMetadata = {
    contentGenerationEnabled: environment.CONTENT_GENERATION_ENABLED,
    modelProviders: configuredModelProviders.map(({ dailyRequestLimit, provider }) => ({
      dailyRequestLimit,
      model: provider.model,
      provider: provider.name,
    })),
    pid: process.pid,
  };

  await checkDatabaseConnection(pool);
  await recordServiceHeartbeat(database, 'worker', heartbeatMetadata);
  logger.info({ ...createWorkerHeartbeat(), ...heartbeatMetadata }, 'BuzzyTrip worker started');

  let heartbeatRunning = false;
  const heartbeat = setInterval(() => {
    if (heartbeatRunning) return;
    heartbeatRunning = true;

    void recordServiceHeartbeat(database, 'worker', heartbeatMetadata)
      .then(() => logger.debug(createWorkerHeartbeat(), 'BuzzyTrip worker heartbeat'))
      .catch((error: unknown) => logger.error({ error }, 'Worker heartbeat failed'))
      .finally(() => {
        heartbeatRunning = false;
      });
  }, environment.WORKER_HEARTBEAT_INTERVAL_MS);

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    clearInterval(heartbeat);
    await pool.end();
    logger.info({ signal }, 'BuzzyTrip worker stopped');
    process.exit(0);
  }

  process.once('SIGINT', (signal) => void shutdown(signal));
  process.once('SIGTERM', (signal) => void shutdown(signal));
}

void run();
