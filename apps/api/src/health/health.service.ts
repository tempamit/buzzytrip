import { Injectable } from '@nestjs/common';
import { createServiceHealth, type ServiceHealth } from '@buzzytrip/contracts';

@Injectable()
export class HealthService {
  getHealth(now = new Date()): ServiceHealth {
    return createServiceHealth('api', now);
  }
}
