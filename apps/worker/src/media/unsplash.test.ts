import { describe, expect, it, vi } from 'vitest';

import { discoverUnsplashImages, trackUnsplashDownload } from './unsplash';

const photo = {
  alt_description: 'Lake and palace buildings at sunset',
  height: 2400,
  id: 'photo-1',
  links: {
    download_location: 'https://api.unsplash.com/photos/photo-1/download',
    html: 'https://unsplash.com/photos/photo-1',
  },
  urls: { regular: 'https://images.unsplash.com/photo-1' },
  user: {
    links: { html: 'https://unsplash.com/@traveller' },
    name: 'A Traveller',
  },
  width: 3600,
};

describe('Unsplash media discovery', () => {
  it('keeps hotlinked media and complete attribution metadata', async () => {
    const fetchFunction = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ results: [photo] }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      }),
    );
    const [image] = await discoverUnsplashImages({
      accessKey: 'test-unsplash-key',
      apiBaseUrl: 'https://api.unsplash.com',
      applicationName: 'buzzytrip',
      count: 1,
      fetchFunction,
      query: 'Udaipur travel',
      timeoutMilliseconds: 5000,
    });

    expect(image).toMatchObject({
      creditText: 'Photo by A Traveller on Unsplash',
      externalId: 'photo-1',
      license: 'Unsplash License',
      publicUrl: 'https://images.unsplash.com/photo-1',
    });
    expect(image?.creditUrl).toContain('utm_source=buzzytrip');
    expect(image?.sourceUrl).toContain('utm_medium=referral');
    expect(image?.checksum).toHaveLength(64);
    expect(fetchFunction.mock.calls[0]?.[1]?.headers).toMatchObject({
      authorization: 'Client-ID test-unsplash-key',
    });
  });

  it('calls the provider download-tracking endpoint when an image is used', async () => {
    const fetchFunction = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const [image] = await discoverUnsplashImages({
      accessKey: 'test-unsplash-key',
      apiBaseUrl: 'https://api.unsplash.com',
      applicationName: 'buzzytrip',
      count: 1,
      fetchFunction: vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ results: [photo] }), { status: 200 })),
      query: 'Udaipur travel',
      timeoutMilliseconds: 5000,
    });
    if (!image) throw new Error('Missing test image');

    await trackUnsplashDownload(image, {
      accessKey: 'test-unsplash-key',
      fetchFunction,
      timeoutMilliseconds: 5000,
    });

    expect(fetchFunction).toHaveBeenCalledWith(
      'https://api.unsplash.com/photos/photo-1/download',
      expect.any(Object),
    );
  });
});
