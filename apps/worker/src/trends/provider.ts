import type { TrendSignal, TrendSignalProvider } from '@buzzytrip/contracts';

export type TrendFetchFunction = typeof globalThis.fetch;

export interface TrendProvider {
  readonly name: TrendSignalProvider;
  fetchSignals(now?: Date): Promise<TrendSignal[]>;
}

export class TrendProviderError extends Error {
  constructor(
    readonly provider: TrendSignalProvider,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'TrendProviderError';
  }
}

export async function fetchTrendFeed(
  fetchFunction: TrendFetchFunction,
  provider: TrendSignalProvider,
  url: string,
  userAgent: string,
  timeoutMilliseconds: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);

  try {
    const response = await fetchFunction(url, {
      headers: {
        accept: 'application/json, application/rss+xml, application/xml, text/xml',
        'user-agent': userAgent,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new TrendProviderError(
        provider,
        `http_${response.status}`,
        `${provider} returned HTTP ${response.status}.`,
      );
    }
    return response;
  } catch (error) {
    if (error instanceof TrendProviderError) throw error;
    const timedOut = error instanceof Error && error.name === 'AbortError';
    throw new TrendProviderError(
      provider,
      timedOut ? 'timeout' : 'network_error',
      timedOut ? `${provider} request timed out.` : `${provider} request failed.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}
