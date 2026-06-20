import type { ServiceName } from '@buzzytrip/contracts';

import type { Database } from './client';
import { serviceHeartbeats } from './schema';

export async function recordServiceHeartbeat(
  database: Database,
  service: ServiceName,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const lastSeenAt = new Date();

  await database
    .insert(serviceHeartbeats)
    .values({
      lastSeenAt,
      metadata,
      service,
      status: 'ok',
    })
    .onConflictDoUpdate({
      target: serviceHeartbeats.service,
      set: {
        lastSeenAt,
        metadata,
        status: 'ok',
      },
    });
}
