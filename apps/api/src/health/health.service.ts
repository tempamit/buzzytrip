import { createServiceHealth, type ServiceHealth } from '@buzzytrip/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { DatabaseService, type DatabaseHealthService } from '../database/database.service';

@Injectable()
export class HealthService {
  constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseHealthService) {}

  async getHealth(now = new Date()): Promise<ServiceHealth> {
    await this.databaseService.assertReady();
    return createServiceHealth('api', now);
  }
}
