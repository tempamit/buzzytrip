import { describe, expect, it, vi } from 'vitest';

import { checkDatabaseConnection } from './health';

describe('database health check', () => {
  it('uses a minimal read-only query', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ database_ready: 1 }] });

    await expect(checkDatabaseConnection({ query })).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith('select 1 as database_ready');
  });

  it('propagates connection failures', async () => {
    const query = vi.fn().mockRejectedValue(new Error('database unavailable'));

    await expect(checkDatabaseConnection({ query })).rejects.toThrow('database unavailable');
  });
});
