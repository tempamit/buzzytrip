import { initialDestinationCatalog } from '@buzzytrip/database';
import { describe, expect, it } from 'vitest';

import { findMvpGuideProfile, initialMvpGuideProfiles } from './mvp-batch';

describe('initial MVP guide batch', () => {
  it('contains six Indian and six international destinations', () => {
    const scopeBySlug = new Map(
      initialDestinationCatalog.map((destination) => [destination.slug, destination.scope]),
    );

    expect(initialMvpGuideProfiles).toHaveLength(12);
    expect(
      initialMvpGuideProfiles.filter(
        (profile) => scopeBySlug.get(profile.destinationSlug) === 'india',
      ),
    ).toHaveLength(6);
    expect(
      initialMvpGuideProfiles.filter(
        (profile) => scopeBySlug.get(profile.destinationSlug) === 'international',
      ),
    ).toHaveLength(6);
  });

  it('gives every guide an official source and distinct editorial angle', () => {
    expect(initialMvpGuideProfiles.every((profile) => profile.officialSources.length > 0)).toBe(
      true,
    );
    expect(new Set(initialMvpGuideProfiles.map((profile) => profile.contentAngle)).size).toBe(12);
    expect(findMvpGuideProfile('udaipur')).toMatchObject({
      guideSlug: 'udaipur-first-trip-guide',
      primaryKeyword: 'Udaipur travel guide',
    });
  });
});
