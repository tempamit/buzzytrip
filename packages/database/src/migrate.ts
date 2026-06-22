import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'node:path';

import { createDatabase, createDatabasePool } from './client';
import { seedInitialDestinationCatalog } from './seed-catalog';

const localDatabaseUrl = 'postgresql://buzzytrip:buzzytrip_local@127.0.0.1:55432/buzzytrip';
const databaseUrl = process.env.DATABASE_URL ?? localDatabaseUrl;

if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set explicitly for production migrations.');
}

const pool = createDatabasePool(databaseUrl, 'buzzytrip-migrations', 1);
const migrationsFolder = path.resolve(__dirname, '..', 'drizzle');

async function runMigrations(): Promise<void> {
  try {
    const database = createDatabase(pool);
    await migrate(database, {
      migrationsFolder,
    });
    const report = await seedInitialDestinationCatalog(database);
    console.log(JSON.stringify({ event: 'destination_catalog_seeded', ...report }));
  } finally {
    await pool.end();
  }
}

void runMigrations();
