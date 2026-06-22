import { parseWorkerEnvironment } from '@buzzytrip/config';

import { findMvpGuideProfile } from '../content/mvp-batch';
import { discoverUnsplashImages } from './unsplash';

function destinationArgument(arguments_: string[]): string {
  const inline = arguments_.find((argument) => argument.startsWith('--destination='));
  if (inline) return inline.slice('--destination='.length);
  const index = arguments_.indexOf('--destination');
  return index >= 0 ? (arguments_[index + 1] ?? '') : 'udaipur';
}

async function run(): Promise<void> {
  const environment = parseWorkerEnvironment(process.env);
  const destinationSlug = destinationArgument(process.argv.slice(2));
  const profile = findMvpGuideProfile(destinationSlug);
  if (!profile) throw new Error(`Unknown MVP destination: ${destinationSlug}`);
  if (!environment.UNSPLASH_ACCESS_KEY) throw new Error('UNSPLASH_ACCESS_KEY is not configured.');

  const images = await discoverUnsplashImages({
    accessKey: environment.UNSPLASH_ACCESS_KEY,
    apiBaseUrl: environment.UNSPLASH_API_BASE_URL,
    applicationName: environment.UNSPLASH_APPLICATION_NAME,
    count: environment.UNSPLASH_IMAGES_PER_GUIDE,
    query: profile.imageQuery,
    timeoutMilliseconds: environment.RESEARCH_REQUEST_TIMEOUT_MS,
  });

  console.log(
    JSON.stringify({
      destination: destinationSlug,
      imageCount: images.length,
      images: images.map((image) => ({
        alt: image.altText,
        credit: image.creditText,
        id: image.externalId,
        source: image.sourceUrl,
      })),
      trackingTriggered: false,
    }),
  );
}

void run();
