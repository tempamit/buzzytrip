import { describe, expect, it, vi } from 'vitest';

import { GoogleTrendsProvider } from './google-trends.provider';
import { WikimediaPageviewProvider } from './wikimedia.provider';

describe('public trend providers', () => {
  it('parses Google Trends RSS without executing embedded text', async () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title><![CDATA[Udaipur travel]]></title>
        <ht:approx_traffic>10,000+</ht:approx_traffic>
        <ht:news_item><ht:news_item_title><![CDATA[New rail service improves access]]></ht:news_item_title></ht:news_item>
      </item>
    </channel></rss>`;
    const fetchFunction = vi
      .fn()
      .mockResolvedValue(
        new Response(xml, { headers: { 'content-type': 'text/xml' }, status: 200 }),
      );
    const provider = new GoogleTrendsProvider({
      fetchFunction,
      geos: ['IN'],
      maxSignals: 100,
      timeoutMilliseconds: 5000,
      userAgent: 'BuzzyTrip test agent',
    });

    await expect(provider.fetchSignals(new Date('2026-06-22T10:00:00.000Z'))).resolves.toEqual([
      expect.objectContaining({
        context: ['geo:IN', 'New rail service improves access'],
        displayName: 'Udaipur travel',
        metricValue: 10000,
        normalizedName: 'udaipur travel',
        observedOn: '2026-06-22',
        provider: 'google_trends',
      }),
    ]);
  });

  it('scores the latest Wikimedia pageviews against a baseline', async () => {
    const fetchFunction = vi.fn().mockImplementation((url: string) => {
      const latest = url.endsWith('/2026/06/20');
      return Promise.resolve(
        new Response(
          JSON.stringify({
            items: [
              {
                articles: [
                  { article: 'Main_Page', rank: 1, views: 1000 },
                  { article: 'Udaipur', rank: 2, views: latest ? 200 : 100 },
                  { article: 'Goa', rank: 3, views: latest ? 120 : 150 },
                ],
              },
            ],
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        ),
      );
    });
    const provider = new WikimediaPageviewProvider({
      fetchFunction,
      lagDays: 2,
      lookbackDays: 2,
      maxSignals: 100,
      project: 'en.wikivoyage.org',
      provider: 'wikivoyage_pageviews',
      timeoutMilliseconds: 5000,
      userAgent: 'BuzzyTrip test agent',
    });
    const signals = await provider.fetchSignals(new Date('2026-06-22T10:00:00.000Z'));

    expect(signals).toHaveLength(2);
    expect(signals[0]).toMatchObject({
      displayName: 'Udaipur',
      metricValue: 200,
      observedOn: '2026-06-20',
      provider: 'wikivoyage_pageviews',
      rank: 2,
    });
    expect(signals[0]?.score).toBeGreaterThan(signals[1]?.score ?? 0);
  });
});
