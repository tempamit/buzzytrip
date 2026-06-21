import { parseApiEnvironment } from '@buzzytrip/config';
import type { PublishedGuideDetail, PublishedGuideSummary } from '@buzzytrip/contracts';
import {
  checkDatabaseConnection,
  createDatabase,
  createDatabasePool,
  findPublishedGuideBySlug as readPublishedGuideBySlug,
  listPublishedGuides as readPublishedGuides,
  type Database,
} from '@buzzytrip/database';
import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import type { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly database: Database;
  private readonly pool: Pool;

  constructor() {
    const environment = parseApiEnvironment(process.env);
    this.pool = createDatabasePool(
      environment.DATABASE_URL,
      'buzzytrip-api',
      environment.DB_POOL_MAX,
    );
    this.database = createDatabase(this.pool);
  }

  async assertReady(): Promise<void> {
    await checkDatabaseConnection(this.pool);
  }

  async findPublishedGuideBySlug(guideSlug: string): Promise<PublishedGuideDetail | null> {
    return readPublishedGuideBySlug(this.database, guideSlug);
  }

  async listPublishedGuides(limit: number): Promise<PublishedGuideSummary[]> {
    return readPublishedGuides(this.database, limit);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

export type DatabaseHealthService = Pick<DatabaseService, 'assertReady'>;
