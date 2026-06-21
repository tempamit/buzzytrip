import { Module } from '@nestjs/common';

import { DatabaseService } from './database/database.service';
import { DestinationsController } from './destinations/destinations.controller';
import { DestinationsService } from './destinations/destinations.service';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';

@Module({
  controllers: [DestinationsController, HealthController],
  providers: [DatabaseService, DestinationsService, HealthService],
})
export class AppModule {}
