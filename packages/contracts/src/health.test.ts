import { describe, expect, it } from 'vitest';

import { createServiceHealth, serviceHealthSchema } from './health';

describe('service health contract', () => {
  it('creates a valid and deterministic health payload', () => {
    const now = new Date('2026-06-20T09:30:00.000Z');
    const payload = createServiceHealth('api', now);

    expect(serviceHealthSchema.parse(payload)).toEqual({
      service: 'api',
      status: 'ok',
      timestamp: '2026-06-20T09:30:00.000Z',
    });
  });
});
