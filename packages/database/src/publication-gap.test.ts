import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DESTINATION_PUBLICATION_GAP,
  meetsDestinationPublicationGap,
} from './publication-gap';

describe('destination publication gap', () => {
  const destinationId = 'destination-a';

  it('defers a destination found within the latest six publications', () => {
    expect(
      meetsDestinationPublicationGap(destinationId, [
        'destination-b',
        'destination-c',
        destinationId,
        'destination-d',
        'destination-e',
        'destination-f',
      ]),
    ).toBe(false);
  });

  it('allows a destination after six other publications', () => {
    expect(
      meetsDestinationPublicationGap(destinationId, [
        'destination-b',
        'destination-c',
        'destination-d',
        'destination-e',
        'destination-f',
        'destination-g',
        destinationId,
      ]),
    ).toBe(true);
    expect(DEFAULT_DESTINATION_PUBLICATION_GAP).toBe(6);
  });

  it('rejects invalid gap configuration', () => {
    expect(() => meetsDestinationPublicationGap(destinationId, [], -1)).toThrow(
      'minimumGap must be a non-negative integer',
    );
  });
});
