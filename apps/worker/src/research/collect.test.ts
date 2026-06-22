import { describe, expect, it, vi } from 'vitest';

import type { MvpGuideProfile } from '../content/mvp-batch';
import { collectDestinationResearch } from './collect';

const profile: MvpGuideProfile = {
  audiences: ['first-time visitors'],
  contentAngle: 'A practical first visit',
  destinationSlug: 'udaipur',
  guideSlug: 'udaipur-first-trip-guide',
  imageQuery: 'Udaipur travel',
  officialSources: [
    {
      publisher: 'Test Tourism Office',
      sourceType: 'official',
      title: 'Official visitor information',
      url: 'https://tourism.example.com/udaipur',
    },
  ],
  primaryKeyword: 'Udaipur travel guide',
  tripTheme: 'heritage',
  wikimediaTitle: 'Udaipur',
};

function evidenceText(count: number, prefix: string): string {
  return Array.from(
    { length: count },
    (_, index) =>
      `${prefix} ${index + 1} covers a distinct district, practical transport choices, seasonal planning, local etiquette, and well-known visitor places.`,
  ).join(' ');
}

function createFetch(officialAvailable = true) {
  return vi.fn((url: string | URL | Request) => {
    const value = url.toString();
    if (value.includes('tourism.example.com')) {
      return Promise.resolve(
        officialAvailable
          ? new Response(
              `<html><title>Official Udaipur</title><main><p>${evidenceText(18, 'Official note')}</p></main></html>`,
              { status: 200 },
            )
          : new Response('unavailable', { status: 503 }),
      );
    }

    const project = value.includes('wikivoyage') ? 'Wikivoyage' : 'Wikipedia';
    return Promise.resolve(
      new Response(
        JSON.stringify({
          query: {
            pages: [
              {
                extract: evidenceText(20, `${project} note`),
                fullurl: `https://${project.toLowerCase()}.example.com/Udaipur`,
                title: 'Udaipur',
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );
  });
}

describe('destination research collection', () => {
  it('builds a passing bundle from official, Wikivoyage, and Wikipedia evidence', async () => {
    const bundle = await collectDestinationResearch(profile, {
      fetchFunction: createFetch(),
      userAgent: 'BuzzyTrip test agent',
    });

    expect(bundle.quality).toMatchObject({ passed: true, publisherCount: 3, sourceCount: 3 });
    expect(bundle.sources.map((source) => source.publisher)).toEqual([
      'Test Tourism Office',
      'Wikivoyage',
      'Wikipedia',
    ]);
    expect(bundle.sources.every((source) => source.contentHash.length === 64)).toBe(true);
  });

  it('fails closed when the official source is unavailable', async () => {
    const bundle = await collectDestinationResearch(profile, {
      fetchFunction: createFetch(false),
      userAgent: 'BuzzyTrip test agent',
    });

    expect(bundle.quality.passed).toBe(false);
    expect(bundle.quality.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['insufficient_sources', 'missing_official_source']),
    );
  });
});
