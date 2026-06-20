import { describe, expect, it } from 'vitest';

import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports an API health payload', () => {
    const service = new HealthService();
    const now = new Date('2026-06-20T10:00:00.000Z');

    expect(service.getHealth(now)).toEqual({
      service: 'api',
      status: 'ok',
      timestamp: '2026-06-20T10:00:00.000Z',
    });
  });
});
