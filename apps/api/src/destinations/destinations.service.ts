import type { PublishedGuideDetail, PublishedGuideSummary } from '@buzzytrip/contracts';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

const DEFAULT_LIST_LIMIT = 20;
const MAXIMUM_LIST_LIMIT = 50;
const guideSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type PublishedGuideReader = Pick<
  DatabaseService,
  'findPublishedGuideBySlug' | 'listPublishedGuides'
>;

@Injectable()
export class DestinationsService {
  constructor(@Inject(DatabaseService) private readonly databaseService: PublishedGuideReader) {}

  async findPublishedGuide(guideSlug: string): Promise<PublishedGuideDetail> {
    if (!guideSlugPattern.test(guideSlug) || guideSlug.length > 180) {
      throw new BadRequestException('Invalid destination guide slug.');
    }

    const guide = await this.databaseService.findPublishedGuideBySlug(guideSlug);

    if (!guide) {
      throw new NotFoundException('Destination guide not found.');
    }

    return guide;
  }

  async listPublishedGuides(rawLimit?: string): Promise<PublishedGuideSummary[]> {
    const limit = rawLimit === undefined ? DEFAULT_LIST_LIMIT : Number(rawLimit);

    if (!Number.isInteger(limit) || limit < 1 || limit > MAXIMUM_LIST_LIMIT) {
      throw new BadRequestException(`limit must be an integer from 1 to ${MAXIMUM_LIST_LIMIT}.`);
    }

    return this.databaseService.listPublishedGuides(limit);
  }
}
