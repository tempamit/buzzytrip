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
import { discoverDestinationTrends } from './trends/discovery';
import { createTrendProviders } from './trends/provider-factory';

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
  const configuredTrendProviders = createTrendProviders(environment);
  const heartbeatMetadata = {
    contentGenerationEnabled: environment.CONTENT_GENERATION_ENABLED,
    modelProviders: configuredModelProviders.map(({ dailyRequestLimit, provider }) => ({
      dailyRequestLimit,
      model: provider.model,
      provider: provider.name,
    })),
    pid: process.pid,
    trendDiscoveryEnabled: environment.TREND_DISCOVERY_ENABLED,
    trendProviders: configuredTrendProviders.map((provider) => provider.name),
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

  let trendDiscoveryRunning = false;
  async function runTrendDiscovery(): Promise<void> {
    if (trendDiscoveryRunning || configuredTrendProviders.length === 0) return;
    trendDiscoveryRunning = true;
    try {
      const report = await discoverDestinationTrends(database, configuredTrendProviders);
      logger.info(
        {
          candidateCount: report.candidates.length,
          failures: report.failures,
          observedOn: report.observedOn,
          selected: {
            india: report.selected.india?.displayName ?? null,
            international: report.selected.international?.displayName ?? null,
          },
          signalCount: report.signalCount,
        },
        'Trend discovery completed',
      );
    } catch (error: unknown) {
      logger.error({ error }, 'Trend discovery failed');
    } finally {
      trendDiscoveryRunning = false;
    }
  }

  const trendDiscovery =
    configuredTrendProviders.length > 0
      ? setInterval(() => void runTrendDiscovery(), environment.TREND_DISCOVERY_INTERVAL_MS)
      : undefined;
  if (configuredTrendProviders.length > 0) void runTrendDiscovery();

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    clearInterval(heartbeat);
    if (trendDiscovery) clearInterval(trendDiscovery);
    await pool.end();
    logger.info({ signal }, 'BuzzyTrip worker stopped');
    process.exit(0);
  }

  process.once('SIGINT', (signal) => void shutdown(signal));
  process.once('SIGTERM', (signal) => void shutdown(signal));
}

void run();
