import {
  trendSignalSchema,
  type TrendSignal,
  type TrendSignalProvider,
} from '@buzzytrip/contracts';

import { displayTrendName, isWikimediaArticleTitle, normalizeTrendName } from './normalize';
import { fetchTrendFeed, type TrendFetchFunction, type TrendProvider } from './provider';

interface WikimediaPageviewProviderOptions {
  fetchFunction?: TrendFetchFunction;
  lagDays: number;
  lookbackDays: number;
  maxSignals: number;
  project: 'en.wikipedia.org' | 'en.wikivoyage.org';
  provider: Extract<TrendSignalProvider, 'wikipedia_pageviews' | 'wikivoyage_pageviews'>;
  timeoutMilliseconds: number;
  userAgent: string;
}

interface WikimediaArticle {
  article?: string;
  rank?: number;
  views?: number;
}

interface WikimediaResponse {
  items?: Array<{ articles?: WikimediaArticle[] }>;
}

function utcDateOffset(now: Date, days: number): Date {
  const result = new Date(now);
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function dateParts(date: Date): { day: string; month: string; observedOn: string; year: string } {
  const observedOn = date.toISOString().slice(0, 10);
  const [year = '', month = '', day = ''] = observedOn.split('-');
  return { day, month, observedOn, year };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export class WikimediaPageviewProvider implements TrendProvider {
  readonly name: WikimediaPageviewProviderOptions['provider'];

  private readonly options: WikimediaPageviewProviderOptions;
  private readonly fetchFunction: TrendFetchFunction;

  constructor(options: WikimediaPageviewProviderOptions) {
    this.options = options;
    this.fetchFunction = options.fetchFunction ?? globalThis.fetch;
    this.name = options.provider;
  }

  async fetchSignals(now = new Date()): Promise<TrendSignal[]> {
    const dailyArticles = await Promise.all(
      Array.from({ length: this.options.lookbackDays }, async (_, index) => {
        const date = utcDateOffset(now, -this.options.lagDays - index);
        const { day, month, observedOn, year } = dateParts(date);
        const sourceUrl = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${this.options.project}/all-access/${year}/${month}/${day}`;
        const response = await fetchTrendFeed(
          this.fetchFunction,
          this.name,
          sourceUrl,
          this.options.userAgent,
          this.options.timeoutMilliseconds,
        );
        const payload = (await response.json()) as WikimediaResponse;
        return {
          articles: (payload.items?.[0]?.articles ?? [])
            .filter(
              (article): article is Required<WikimediaArticle> =>
                typeof article.article === 'string' &&
                typeof article.rank === 'number' &&
                typeof article.views === 'number' &&
                isWikimediaArticleTitle(article.article),
            )
            .slice(0, this.options.maxSignals),
          observedOn,
          sourceUrl,
        };
      }),
    );

    const [latest, ...baselineDays] = dailyArticles;
    if (!latest) return [];

    const baselineViews = new Map<string, number[]>();
    for (const day of baselineDays) {
      const viewsByArticle = new Map(
        day.articles.map((article) => [article.article, article.views]),
      );
      for (const article of latest.articles) {
        const views = baselineViews.get(article.article) ?? [];
        views.push(viewsByArticle.get(article.article) ?? 0);
        baselineViews.set(article.article, views);
      }
    }

    return latest.articles.map((article) => {
      const baseline = baselineViews.get(article.article) ?? [];
      const baselineAverage =
        baseline.length === 0
          ? article.views
          : baseline.reduce((sum, value) => sum + value, 0) / baseline.length;
      const velocity =
        baselineAverage === 0 ? 1 : (article.views - baselineAverage) / baselineAverage;
      const rankScore = clamp(100 - ((article.rank - 1) / this.options.maxSignals) * 100);
      const velocityScore = clamp(50 + velocity * 25);

      return trendSignalSchema.parse({
        context: [
          `views:${article.views}`,
          `baseline_average:${baselineAverage.toFixed(2)}`,
          `velocity:${velocity.toFixed(4)}`,
        ],
        displayName: displayTrendName(article.article),
        metricValue: article.views,
        normalizedName: normalizeTrendName(article.article),
        observedOn: latest.observedOn,
        provider: this.name,
        rank: article.rank,
        score: clamp(rankScore * 0.65 + velocityScore * 0.35),
        sourceUrl: latest.sourceUrl,
      });
    });
  }
}
