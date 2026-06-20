import { describe, expect, it } from 'vitest';

import { parseApiEnvironment, parseWorkerEnvironment } from './environment';

describe('runtime configuration', () => {
  it('applies safe API defaults', () => {
    expect(parseApiEnvironment({})).toEqual({
      DATABASE_URL: 'postgresql://buzzytrip:buzzytrip_local@127.0.0.1:55432/buzzytrip',
      DB_POOL_MAX: 10,
      NODE_ENV: 'development',
      PORT: 4000,
    });
  });

  it('coerces worker values from environment strings', () => {
    expect(
      parseWorkerEnvironment({
        DATABASE_URL: 'postgres://user:password@database:5432/buzzytrip',
        DB_POOL_MAX: '5',
        NODE_ENV: 'test',
        LOG_LEVEL: 'debug',
        WORKER_HEARTBEAT_INTERVAL_MS: '5000',
      }),
    ).toEqual({
      DATABASE_URL: 'postgres://user:password@database:5432/buzzytrip',
      DB_POOL_MAX: 5,
      NODE_ENV: 'test',
      LOG_LEVEL: 'debug',
      WORKER_HEARTBEAT_INTERVAL_MS: 5000,
    });
  });

  it('rejects invalid ports', () => {
    expect(() => parseApiEnvironment({ PORT: '70000' })).toThrow();
  });

  it('requires an explicit database URL in production', () => {
    expect(() => parseApiEnvironment({ NODE_ENV: 'production' })).toThrow(
      'DATABASE_URL must be set explicitly in production.',
    );
  });
});
