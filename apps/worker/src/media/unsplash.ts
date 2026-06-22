import { createHash } from 'node:crypto';

export type UnsplashFetchFunction = typeof globalThis.fetch;

export interface UnsplashImageCandidate {
  altText: string;
  checksum: string;
  creditText: string;
  creditUrl: string;
  downloadTrackingUrl: string;
  externalId: string;
  height: number;
  license: string;
  licenseUrl: string;
  publicUrl: string;
  sourceUrl: string;
  width: number;
}

interface UnsplashPhoto {
  alt_description?: string | null;
  description?: string | null;
  height?: number;
  id?: string;
  links?: {
    download_location?: string;
    html?: string;
  };
  urls?: {
    regular?: string;
  };
  user?: {
    links?: { html?: string };
    name?: string;
  };
  width?: number;
}

interface UnsplashSearchResponse {
  results?: UnsplashPhoto[];
}

export class UnsplashError extends Error {
  constructor(readonly code: 'http_error' | 'invalid_response' | 'network_error' | 'timeout') {
    super(`Unsplash media discovery failed: ${code}.`);
    this.name = 'UnsplashError';
  }
}

function attributionUrl(value: string, applicationName: string): string {
  const url = new URL(value);
  url.searchParams.set('utm_source', applicationName);
  url.searchParams.set('utm_medium', 'referral');
  return url.toString();
}

async function fetchUnsplashJson(
  fetchFunction: UnsplashFetchFunction,
  url: string,
  accessKey: string,
  timeoutMilliseconds: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);

  try {
    const response = await fetchFunction(url, {
      headers: {
        accept: 'application/json',
        'accept-version': 'v1',
        authorization: `Client-ID ${accessKey}`,
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new UnsplashError('http_error');
    const rawText = await response.text();
    try {
      return JSON.parse(rawText) as unknown;
    } catch {
      throw new UnsplashError('invalid_response');
    }
  } catch (error) {
    if (error instanceof UnsplashError) throw error;
    throw new UnsplashError(
      error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network_error',
    );
  } finally {
    clearTimeout(timeout);
  }
}

export interface DiscoverUnsplashImagesOptions {
  accessKey: string;
  apiBaseUrl: string;
  applicationName: string;
  count: number;
  fetchFunction?: UnsplashFetchFunction;
  query: string;
  timeoutMilliseconds: number;
}

export async function discoverUnsplashImages(
  options: DiscoverUnsplashImagesOptions,
): Promise<UnsplashImageCandidate[]> {
  const fetchFunction = options.fetchFunction ?? globalThis.fetch;
  const parameters = new URLSearchParams({
    content_filter: 'high',
    orientation: 'landscape',
    page: '1',
    per_page: options.count.toString(),
    query: options.query,
  });
  const payload = (await fetchUnsplashJson(
    fetchFunction,
    `${options.apiBaseUrl.replace(/\/$/u, '')}/search/photos?${parameters.toString()}`,
    options.accessKey,
    options.timeoutMilliseconds,
  )) as UnsplashSearchResponse;

  const candidates = (payload.results ?? []).flatMap((photo) => {
    const externalId = photo.id;
    const publicUrl = photo.urls?.regular;
    const photoUrl = photo.links?.html;
    const downloadTrackingUrl = photo.links?.download_location;
    const photographer = photo.user?.name;
    const photographerUrl = photo.user?.links?.html;
    const width = photo.width;
    const height = photo.height;
    if (
      !externalId ||
      !publicUrl ||
      !photoUrl ||
      !downloadTrackingUrl ||
      !photographer ||
      !photographerUrl ||
      !width ||
      !height
    ) {
      return [];
    }

    const altText = (photo.alt_description ?? photo.description ?? options.query)
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, 240);
    return [
      {
        altText: altText.length >= 5 ? altText : options.query,
        checksum: createHash('sha256').update(`${externalId}:${publicUrl}`).digest('hex'),
        creditText: `Photo by ${photographer} on Unsplash`,
        creditUrl: attributionUrl(photographerUrl, options.applicationName),
        downloadTrackingUrl,
        externalId,
        height,
        license: 'Unsplash License',
        licenseUrl: 'https://unsplash.com/license',
        publicUrl,
        sourceUrl: attributionUrl(photoUrl, options.applicationName),
        width,
      },
    ];
  });

  if (candidates.length < options.count) throw new UnsplashError('invalid_response');
  return candidates.slice(0, options.count);
}

export async function trackUnsplashDownload(
  image: UnsplashImageCandidate,
  options: Pick<
    DiscoverUnsplashImagesOptions,
    'accessKey' | 'fetchFunction' | 'timeoutMilliseconds'
  >,
): Promise<void> {
  await fetchUnsplashJson(
    options.fetchFunction ?? globalThis.fetch,
    image.downloadTrackingUrl,
    options.accessKey,
    options.timeoutMilliseconds,
  );
}
