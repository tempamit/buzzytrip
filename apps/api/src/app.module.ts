import { Module } from '@nestjs/common';

import { DatabaseService } from './database/database.service';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';

@Module({
  controllers: [HealthController],
  providers: [DatabaseService, HealthService],
})
export class AppModule {}
