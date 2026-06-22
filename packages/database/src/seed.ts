import { createDatabase, createDatabasePool } from './client';
import { seedInitialDestinationCatalog } from './seed-catalog';

const localDatabaseUrl = 'postgresql://buzzytrip:buzzytrip_local@127.0.0.1:55432/buzzytrip';
const databaseUrl = process.env.DATABASE_URL ?? localDatabaseUrl;

if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set explicitly for production seeding.');
}

const pool = createDatabasePool(databaseUrl, 'buzzytrip-catalog-seed', 1);

async function runSeed(): Promise<void> {
  try {
    const report = await seedInitialDestinationCatalog(createDatabase(pool));
    console.log(JSON.stringify({ event: 'destination_catalog_seeded', ...report }));
  } finally {
    await pool.end();
  }
}

void runSeed();
