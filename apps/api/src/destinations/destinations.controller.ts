import type { PublishedGuideDetail, PublishedGuideSummary } from '@buzzytrip/contracts';
import { Controller, Get, Inject, Param, Query } from '@nestjs/common';

import { DestinationsService } from './destinations.service';

@Controller('destinations')
export class DestinationsController {
  constructor(
    @Inject(DestinationsService) private readonly destinationsService: DestinationsService,
  ) {}

  @Get()
  async listPublishedGuides(@Query('limit') limit?: string): Promise<PublishedGuideSummary[]> {
    return this.destinationsService.listPublishedGuides(limit);
  }

  @Get(':guideSlug')
  async findPublishedGuide(@Param('guideSlug') guideSlug: string): Promise<PublishedGuideDetail> {
    return this.destinationsService.findPublishedGuide(guideSlug);
  }
}
