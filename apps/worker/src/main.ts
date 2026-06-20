import { parseWorkerEnvironment } from '@buzzytrip/config';
import pino from 'pino';

import { createWorkerHeartbeat } from './heartbeat';

const environment = parseWorkerEnvironment(process.env);
const logger = pino({ level: environment.LOG_LEVEL });

logger.info(createWorkerHeartbeat(), 'BuzzyTrip worker started');

const heartbeat = setInterval(() => {
  logger.debug(createWorkerHeartbeat(), 'BuzzyTrip worker heartbeat');
}, environment.WORKER_HEARTBEAT_INTERVAL_MS);

function shutdown(signal: NodeJS.Signals): void {
  clearInterval(heartbeat);
  logger.info({ signal }, 'BuzzyTrip worker stopped');
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
