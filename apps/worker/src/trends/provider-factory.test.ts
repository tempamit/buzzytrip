import { parseWorkerEnvironment } from '@buzzytrip/config';
import { describe, expect, it } from 'vitest';

import { createTrendProviders } from './provider-factory';

describe('trend provider factory', () => {
  it('creates no providers while automatic discovery is disabled', () => {
    expect(createTrendProviders(parseWorkerEnvironment({}))).toEqual([]);
  });

  it('builds all three public-signal providers for an explicit dry run', () => {
    expect(
      createTrendProviders(parseWorkerEnvironment({}), { ignoreEnabled: true }).map(
        (provider) => provider.name,
      ),
    ).toEqual(['google_trends', 'wikivoyage_pageviews', 'wikipedia_pageviews']);
  });
});
