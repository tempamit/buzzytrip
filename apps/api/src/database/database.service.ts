import { parseApiEnvironment } from '@buzzytrip/config';
import { checkDatabaseConnection, createDatabasePool } from '@buzzytrip/database';
import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import type { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool: Pool;

  constructor() {
    const environment = parseApiEnvironment(process.env);
    this.pool = createDatabasePool(
      environment.DATABASE_URL,
      'buzzytrip-api',
      environment.DB_POOL_MAX,
    );
  }

  async assertReady(): Promise<void> {
    await checkDatabaseConnection(this.pool);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

export type DatabaseHealthService = Pick<DatabaseService, 'assertReady'>;
