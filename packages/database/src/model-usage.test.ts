import { describe, expect, it } from 'vitest';

import { toUtcUsageDate } from './model-usage';

describe('model usage budget', () => {
  it('uses a UTC date so restarts and VPS time zones cannot reset a budget early', () => {
    expect(toUtcUsageDate(new Date('2026-06-20T23:59:59.999Z'))).toBe('2026-06-20');
    expect(toUtcUsageDate(new Date('2026-06-21T00:00:00.000Z'))).toBe('2026-06-21');
  });
});
