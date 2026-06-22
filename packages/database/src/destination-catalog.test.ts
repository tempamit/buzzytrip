import { describe, expect, it } from 'vitest';

import { initialDestinationCatalog, initialDestinationCatalogCounts } from './destination-catalog';

describe('initial destination catalogue', () => {
  it('provides balanced launch coverage for both trend lanes', () => {
    expect(initialDestinationCatalogCounts).toEqual({
      india: 75,
      international: 101,
      total: 176,
    });
    expect(initialDestinationCatalog).toHaveLength(initialDestinationCatalogCounts.total);
  });

  it('includes aliases and broad destinations used by public trend feeds', () => {
    const bySlug = new Map(
      initialDestinationCatalog.map((destination) => [destination.slug, destination]),
    );

    expect(bySlug.get('mumbai')?.aliases).toContain('bombay');
    expect(bySlug.get('varanasi')?.aliases).toContain('benares');
    expect(bySlug.get('turkiye')?.aliases).toContain('turkey');
    expect(bySlug.get('italy')?.destinationType).toBe('country');
    expect(bySlug.get('japan')?.destinationType).toBe('country');
    expect(bySlug.get('united-states')?.destinationType).toBe('country');
  });
});
