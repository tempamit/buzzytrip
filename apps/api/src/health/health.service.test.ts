import { describe, expect, it, vi } from 'vitest';

import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports an API health payload after checking the database', async () => {
    const databaseService = {
      assertReady: vi.fn().mockResolvedValue(undefined),
    };
    const service = new HealthService(databaseService);
    const now = new Date('2026-06-20T10:00:00.000Z');

    await expect(service.getHealth(now)).resolves.toEqual({
      service: 'api',
      status: 'ok',
      timestamp: '2026-06-20T10:00:00.000Z',
    });
    expect(databaseService.assertReady).toHaveBeenCalledOnce();
  });
});
