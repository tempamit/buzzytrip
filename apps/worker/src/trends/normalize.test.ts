import { describe, expect, it } from 'vitest';

import {
  displayTrendName,
  isWikimediaArticleTitle,
  normalizeTrendName,
  trendLookupKeys,
} from './normalize';

describe('trend name normalization', () => {
  it('normalizes Wikimedia titles and disambiguation suffixes', () => {
    expect(displayTrendName('São_Paulo_(city)')).toBe('São Paulo');
    expect(normalizeTrendName('São_Paulo_(city)')).toBe('sao paulo');
    expect(displayTrendName('100% travel')).toBe('100% travel');
  });

  it('creates a cautious destination lookup key for travel queries', () => {
    expect(trendLookupKeys('Udaipur travel')).toEqual(['udaipur travel', 'udaipur']);
    expect(trendLookupKeys('Udaipur election')).toEqual(['udaipur election']);
  });

  it('filters Wikimedia navigation and list pages', () => {
    expect(isWikimediaArticleTitle('Main_Page')).toBe(false);
    expect(isWikimediaArticleTitle('Special:Search')).toBe(false);
    expect(isWikimediaArticleTitle('List_of_cities')).toBe(false);
    expect(isWikimediaArticleTitle('Udaipur')).toBe(true);
  });
});
