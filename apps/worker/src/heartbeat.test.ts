import { describe, expect, it } from 'vitest';

import { createWorkerHeartbeat } from './heartbeat';

describe('worker heartbeat', () => {
  it('uses the shared health contract', () => {
    const now = new Date('2026-06-20T10:30:00.000Z');

    expect(createWorkerHeartbeat(now)).toEqual({
      service: 'worker',
      status: 'ok',
      timestamp: '2026-06-20T10:30:00.000Z',
    });
  });
});
