import type { WorkerEnvironment } from '@buzzytrip/config';

import { GoogleTrendsProvider } from './google-trends.provider';
import type { TrendFetchFunction, TrendProvider } from './provider';
import { WikimediaPageviewProvider } from './wikimedia.provider';

export function createTrendProviders(
  environment: WorkerEnvironment,
  options: { fetchFunction?: TrendFetchFunction; ignoreEnabled?: boolean } = {},
): TrendProvider[] {
  if (!environment.TREND_DISCOVERY_ENABLED && !options.ignoreEnabled) return [];
  const shared = {
    ...(options.fetchFunction ? { fetchFunction: options.fetchFunction } : {}),
    maxSignals: environment.TREND_MAX_SIGNALS_PER_PROVIDER,
    timeoutMilliseconds: environment.TREND_REQUEST_TIMEOUT_MS,
    userAgent: environment.TREND_USER_AGENT,
  };

  return [
    new GoogleTrendsProvider({ ...shared, geos: environment.TREND_GOOGLE_GEOS }),
    new WikimediaPageviewProvider({
      ...shared,
      lagDays: environment.TREND_SOURCE_LAG_DAYS,
      lookbackDays: environment.TREND_LOOKBACK_DAYS,
      project: 'en.wikivoyage.org',
      provider: 'wikivoyage_pageviews',
    }),
    new WikimediaPageviewProvider({
      ...shared,
      lagDays: environment.TREND_SOURCE_LAG_DAYS,
      lookbackDays: environment.TREND_LOOKBACK_DAYS,
      project: 'en.wikipedia.org',
      provider: 'wikipedia_pageviews',
    }),
  ];
}
