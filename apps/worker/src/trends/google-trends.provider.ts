import { trendSignalSchema, type TrendSignal } from '@buzzytrip/contracts';

import { displayTrendName, normalizeTrendName } from './normalize';
import { fetchTrendFeed, type TrendFetchFunction, type TrendProvider } from './provider';

interface GoogleTrendsProviderOptions {
  fetchFunction?: TrendFetchFunction;
  geos: string[];
  maxSignals: number;
  timeoutMilliseconds: number;
  userAgent: string;
}

function decodeXml(value: string): string {
  return value
    .replace(/^<!\[CDATA\[|\]\]>$/gu, '')
    .replace(/&amp;/gu, '&')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&#39;|&apos;/gu, "'")
    .trim();
}

function extractTag(block: string, tag: string): string | null {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const match = block.match(new RegExp(`<${escapedTag}>([\\s\\S]*?)<\\/${escapedTag}>`, 'iu'));
  return match?.[1] ? decodeXml(match[1]) : null;
}

function parseTraffic(value: string | null): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value.replace(/[^0-9]/gu, ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export class GoogleTrendsProvider implements TrendProvider {
  readonly name = 'google_trends' as const;

  private readonly options: GoogleTrendsProviderOptions;
  private readonly fetchFunction: TrendFetchFunction;

  constructor(options: GoogleTrendsProviderOptions) {
    this.options = options;
    this.fetchFunction = options.fetchFunction ?? globalThis.fetch;
  }

  async fetchSignals(now = new Date()): Promise<TrendSignal[]> {
    const observedOn = now.toISOString().slice(0, 10);
    const feeds = await Promise.all(
      this.options.geos.map(async (geo) => {
        const sourceUrl = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`;
        const response = await fetchTrendFeed(
          this.fetchFunction,
          this.name,
          sourceUrl,
          this.options.userAgent,
          this.options.timeoutMilliseconds,
        );
        return { geo, sourceUrl, xml: await response.text() };
      }),
    );

    const signals = new Map<string, TrendSignal>();
    for (const feed of feeds) {
      const items = feed.xml.match(/<item>[\s\S]*?<\/item>/giu) ?? [];
      for (const [index, item] of items.slice(0, this.options.maxSignals).entries()) {
        const title = extractTag(item, 'title');
        if (!title) continue;
        const normalizedName = normalizeTrendName(title);
        if (!normalizedName) continue;
        const traffic = parseTraffic(extractTag(item, 'ht:approx_traffic'));
        const newsTitles = [
          ...item.matchAll(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/giu),
        ]
          .map((match) => (match[1] ? decodeXml(match[1]) : ''))
          .filter(Boolean)
          .slice(0, 8);
        const rank = index + 1;
        const rankScore = clamp(100 - ((rank - 1) / this.options.maxSignals) * 100);
        const trafficScore = clamp((Math.log10(Math.max(traffic, 10)) / 6) * 100);
        const score = clamp(rankScore * 0.7 + trafficScore * 0.3);
        const existing = signals.get(normalizedName);
        const candidate = trendSignalSchema.parse({
          context: [`geo:${feed.geo}`, ...newsTitles],
          displayName: displayTrendName(title),
          metricValue: traffic,
          normalizedName,
          observedOn,
          provider: this.name,
          rank,
          score,
          sourceUrl: feed.sourceUrl,
        });

        if (!existing || candidate.score > existing.score) signals.set(normalizedName, candidate);
        else {
          const additionalContext = candidate.context.filter(
            (value) => !existing.context.includes(value),
          );
          existing.context.push(...additionalContext.slice(0, 12 - existing.context.length));
        }
      }
    }

    return [...signals.values()].slice(0, this.options.maxSignals);
  }
}
