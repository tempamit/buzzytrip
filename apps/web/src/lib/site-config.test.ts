import { describe, expect, it } from 'vitest';

import { siteConfig } from './site-config';

describe('site configuration', () => {
  it('keeps the approved product promise', () => {
    expect(siteConfig).toEqual({
      name: 'BuzzyTrip',
      tagline: 'Find what’s buzzing. Plan what fits.',
    });
  });
});
