import { parseWorkerEnvironment } from '@buzzytrip/config';
import {
  checkDatabaseConnection,
  createDatabase,
  createDatabasePool,
  recordServiceHeartbeat,
} from '@buzzytrip/database';
import pino from 'pino';

import { createWorkerHeartbeat } from './heartbeat';

async function run(): Promise<void> {
  const environment = parseWorkerEnvironment(process.env);
  const logger = pino({ level: environment.LOG_LEVEL });
  const pool = createDatabasePool(
    environment.DATABASE_URL,
    'buzzytrip-worker',
    environment.DB_POOL_MAX,
  );
  const database = createDatabase(pool);

  await checkDatabaseConnection(pool);
  await recordServiceHeartbeat(database, 'worker', { pid: process.pid });
  logger.info(createWorkerHeartbeat(), 'BuzzyTrip worker started');

  let heartbeatRunning = false;
  const heartbeat = setInterval(() => {
    if (heartbeatRunning) return;
    heartbeatRunning = true;

    void recordServiceHeartbeat(database, 'worker', { pid: process.pid })
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
