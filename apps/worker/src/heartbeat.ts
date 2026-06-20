import { createServiceHealth, type ServiceHealth } from '@buzzytrip/contracts';

export function createWorkerHeartbeat(now = new Date()): ServiceHealth {
  return createServiceHealth('worker', now);
}
