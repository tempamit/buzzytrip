import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { DestinationsService, type PublishedGuideReader } from './destinations.service';

function createReader(): PublishedGuideReader {
  return {
    findPublishedGuideBySlug: vi.fn().mockResolvedValue(null),
    listPublishedGuides: vi.fn().mockResolvedValue([]),
  };
}

describe('DestinationsService', () => {
  it('lists only a bounded number of published guides', async () => {
    const reader = createReader();
    const service = new DestinationsService(reader);

    await expect(service.listPublishedGuides()).resolves.toEqual([]);
    expect(reader.listPublishedGuides).toHaveBeenCalledWith(20);

    await expect(service.listPublishedGuides('0')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.listPublishedGuides('51')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.listPublishedGuides('many')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('never exposes a missing or malformed guide', async () => {
    const reader = createReader();
    const service = new DestinationsService(reader);

    await expect(service.findPublishedGuide('Not A Slug')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.findPublishedGuide('missing-guide')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
