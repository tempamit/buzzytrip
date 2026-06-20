import { describe, expect, it } from 'vitest';

import { parseApiEnvironment, parseWorkerEnvironment } from './environment';

describe('runtime configuration', () => {
  it('applies safe API defaults', () => {
    expect(parseApiEnvironment({})).toEqual({
      NODE_ENV: 'development',
      PORT: 4000,
    });
  });

  it('coerces worker values from environment strings', () => {
    expect(
      parseWorkerEnvironment({
        NODE_ENV: 'test',
        LOG_LEVEL: 'debug',
        WORKER_HEARTBEAT_INTERVAL_MS: '5000',
      }),
    ).toEqual({
      NODE_ENV: 'test',
      LOG_LEVEL: 'debug',
      WORKER_HEARTBEAT_INTERVAL_MS: 5000,
    });
  });

  it('rejects invalid ports', () => {
    expect(() => parseApiEnvironment({ PORT: '70000' })).toThrow();
  });
});
