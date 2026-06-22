import { describe, expect, it } from 'vitest';

import {
  destinationCatalogSchema,
  destinationGuideSeoSchema,
  destinationScopeSchema,
  normalizeDestinationLookupKey,
} from './destinations';

describe('destination contracts', () => {
  it('keeps Indian and international trend lanes explicit', () => {
    expect(destinationScopeSchema.parse('india')).toBe('india');
    expect(destinationScopeSchema.parse('international')).toBe('international');
    expect(() => destinationScopeSchema.parse('all')).toThrow();
  });

  it('limits supporting SEO phrases instead of permitting keyword stuffing', () => {
    const baseSeo = {
      canonicalPath: '/destinations/udaipur-weekend-guide',
      metaDescription:
        'Plan a thoughtful Udaipur break with practical notes on timing, neighbourhoods, food, transport, and comfortable day-by-day pacing.',
      metaTitle: 'A practical Udaipur guide for an easy-paced break',
      primaryKeyword: 'Udaipur travel guide',
    };

    expect(
      destinationGuideSeoSchema.parse({
        ...baseSeo,
        supportingKeywords: ['Udaipur weekend', 'Udaipur hotels'],
      }),
    ).toMatchObject(baseSeo);

    expect(() =>
      destinationGuideSeoSchema.parse({
        ...baseSeo,
        supportingKeywords: Array.from({ length: 9 }, (_, index) => `keyword ${index}`),
      }),
    ).toThrow();
  });

  it('normalizes catalogue names and rejects ambiguous aliases', () => {
    expect(normalizeDestinationLookupKey("Côte d'Azur & Nice")).toBe('cote d azur and nice');

    const destination = {
      aliases: ['benares'],
      countryCode: 'IN',
      countryName: 'India',
      destinationType: 'heritage' as const,
      name: 'Varanasi',
      scope: 'india' as const,
      slug: 'varanasi',
      stateOrRegion: 'Uttar Pradesh',
    };
    expect(() =>
      destinationCatalogSchema.parse([destination, { ...destination, slug: 'kashi' }]),
    ).toThrow();
  });
});
