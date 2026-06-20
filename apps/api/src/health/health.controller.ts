import { Controller, Get, Inject } from '@nestjs/common';
import type { ServiceHealth } from '@buzzytrip/contracts';

import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get()
  getHealth(): ServiceHealth {
    return this.healthService.getHealth();
  }
}
