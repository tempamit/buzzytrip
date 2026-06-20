import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { databaseSchema } from './schema';

export function createDatabasePool(
  connectionString: string,
  applicationName: string,
  maxConnections = 10,
): Pool {
  return new Pool({
    application_name: applicationName,
    connectionString,
    max: maxConnections,
  });
}

export function createDatabase(pool: Pool) {
  return drizzle(pool, { schema: databaseSchema });
}

export type Database = ReturnType<typeof createDatabase>;
