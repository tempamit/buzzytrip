export type ResearchFetchFunction = typeof globalThis.fetch;

export class ResearchFetchError extends Error {
  constructor(
    readonly code: 'body_too_large' | 'http_error' | 'network_error' | 'timeout',
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ResearchFetchError';
  }
}

export interface ResearchResource {
  body: string;
  contentType: string;
  finalUrl: string;
}

export async function fetchResearchResource(
  fetchFunction: ResearchFetchFunction,
  url: string,
  userAgent: string,
  timeoutMilliseconds: number,
  maximumBytes: number,
): Promise<ResearchResource> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);

  try {
    const response = await fetchFunction(url, {
      headers: {
        accept: 'application/json, text/html, text/plain',
        'user-agent': userAgent,
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ResearchFetchError(
        'http_error',
        `Research source returned HTTP ${response.status}.`,
        response.status,
      );
    }

    const bodyBytes = new Uint8Array(await response.arrayBuffer());
    if (bodyBytes.byteLength > maximumBytes) {
      throw new ResearchFetchError('body_too_large', 'Research source exceeded the size limit.');
    }

    return {
      body: new TextDecoder().decode(bodyBytes),
      contentType: response.headers.get('content-type') ?? '',
      finalUrl: response.url || url,
    };
  } catch (error) {
    if (error instanceof ResearchFetchError) throw error;
    const timedOut = error instanceof Error && error.name === 'AbortError';
    throw new ResearchFetchError(
      timedOut ? 'timeout' : 'network_error',
      timedOut ? 'Research source timed out.' : 'Research source request failed.',
    );
  } finally {
    clearTimeout(timeout);
  }
}
