import type { TrendSignal } from '@buzzytrip/contracts';
import type { DestinationTrendIdentity } from '@buzzytrip/database';
import { describe, expect, it } from 'vitest';

import { rankDestinationTrends, selectDailyTrendLanes } from './ranking';

const identities: DestinationTrendIdentity[] = [
  {
    aliases: ['city of lakes'],
    countryCode: 'IN',
    countryName: 'India',
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Udaipur',
    scope: 'india',
    slug: 'udaipur',
  },
  {
    aliases: [],
    countryCode: 'ID',
    countryName: 'Indonesia',
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Bali',
    scope: 'international',
    slug: 'bali',
  },
];

function signal(
  displayName: string,
  provider: TrendSignal['provider'],
  score: number,
  context: string[] = [],
): TrendSignal {
  return {
    context,
    displayName,
    metricValue: 100,
    normalizedName: displayName.toLowerCase(),
    observedOn: '2026-06-22',
    provider,
    rank: 1,
    score,
    sourceUrl: 'https://example.com/trends',
  };
}

describe('destination trend ranking', () => {
  it('matches known aliases and rewards independent signals', () => {
    const candidates = rankDestinationTrends(
      [
        signal('Udaipur travel', 'google_trends', 70),
        signal('Udaipur', 'wikivoyage_pageviews', 80),
      ],
      identities,
    );

    expect(candidates[0]).toMatchObject({
      displayName: 'Udaipur',
      scope: 'india',
      status: 'eligible',
    });
    expect(candidates[0]?.reasons).toContain('multi_source_bonus:5');
  });

  it('rejects a destination trending in crisis coverage', () => {
    const [candidate] = rankDestinationTrends(
      [signal('Bali', 'google_trends', 95, ['Earthquake emergency and evacuation'])],
      identities,
    );

    expect(candidate).toMatchObject({ displayName: 'Bali', status: 'rejected' });
    expect(candidate?.reasons).toContain('crisis_context:earthquake');
  });

  it('selects one eligible destination in each daily lane', () => {
    const candidates = rankDestinationTrends(
      [signal('Udaipur', 'wikivoyage_pageviews', 80), signal('Bali', 'wikivoyage_pageviews', 75)],
      identities,
    );

    expect(selectDailyTrendLanes(candidates)).toMatchObject({
      india: { displayName: 'Udaipur' },
      international: { displayName: 'Bali' },
    });
  });
});
