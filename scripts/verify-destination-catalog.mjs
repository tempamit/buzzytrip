import {
  createDatabase,
  createDatabasePool,
  initialDestinationCatalog,
  initialDestinationCatalogCounts,
  seedInitialDestinationCatalog,
} from '@buzzytrip/database';
import { URL } from 'node:url';

const defaultLocalDatabaseUrl = 'postgresql://buzzytrip:buzzytrip_local@127.0.0.1:55432/buzzytrip';
const connectionString = process.env.DATABASE_URL ?? defaultLocalDatabaseUrl;
const parsedUrl = new URL(connectionString);

if (!['127.0.0.1', 'localhost', '::1'].includes(parsedUrl.hostname)) {
  console.error('Refusing to verify the destination catalogue against a non-local database.');
  process.exit(2);
}

const pool = createDatabasePool(connectionString, 'buzzytrip-catalog-verification', 2);
const database = createDatabase(pool);
const catalogSlugs = initialDestinationCatalog.map((destination) => destination.slug);
const expectedAliases = new Set(
  initialDestinationCatalog.flatMap((destination) =>
    destination.aliases.map((alias) => `${destination.slug}:${alias}`),
  ),
);

try {
  await seedInitialDestinationCatalog(database);
  await seedInitialDestinationCatalog(database);

  const destinationResult = await pool.query(
    `select
       count(*)::integer as total,
       count(*) filter (where scope = 'india')::integer as india,
       count(*) filter (where scope = 'international')::integer as international
     from destinations
     where slug = any($1::text[])`,
    [catalogSlugs],
  );
  const aliasResult = await pool.query(
    `select destinations.slug, destination_aliases.normalized_alias
     from destination_aliases
     inner join destinations on destinations.id = destination_aliases.destination_id
     where destinations.slug = any($1::text[])`,
    [catalogSlugs],
  );

  const actualAliases = new Set(
    aliasResult.rows.map((row) => `${row.slug}:${row.normalized_alias}`),
  );
  const counts = destinationResult.rows[0];
  const aliasesPresent = [...expectedAliases].every((alias) => actualAliases.has(alias));

  if (
    counts?.total !== initialDestinationCatalogCounts.total ||
    counts.india !== initialDestinationCatalogCounts.india ||
    counts.international !== initialDestinationCatalogCounts.international ||
    !aliasesPresent
  ) {
    throw new Error('Destination catalogue verification failed.');
  }

  console.log(
    `Destination catalogue verification passed: ${counts.total} destinations and ${expectedAliases.size} managed aliases.`,
  );
} finally {
  await pool.end();
}
