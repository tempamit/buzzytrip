import { sql } from 'drizzle-orm';

import type { Database } from './client';
import { initialDestinationCatalog, initialDestinationCatalogCounts } from './destination-catalog';
import { destinationAliases, destinations } from './schema';

export interface DestinationCatalogSeedReport {
  aliases: number;
  destinations: number;
  india: number;
  international: number;
}

export async function seedInitialDestinationCatalog(
  database: Database,
): Promise<DestinationCatalogSeedReport> {
  return database.transaction(async (transaction) => {
    const seededDestinations = await transaction
      .insert(destinations)
      .values(
        initialDestinationCatalog.map((destination) => ({
          countryCode: destination.countryCode,
          countryName: destination.countryName,
          destinationType: destination.destinationType,
          name: destination.name,
          scope: destination.scope,
          slug: destination.slug,
          stateOrRegion: destination.stateOrRegion,
        })),
      )
      .onConflictDoUpdate({
        set: {
          countryCode: sql`excluded.country_code`,
          countryName: sql`excluded.country_name`,
          destinationType: sql`excluded.destination_type`,
          name: sql`excluded.name`,
          scope: sql`excluded.scope`,
          stateOrRegion: sql`excluded.state_or_region`,
          updatedAt: new Date(),
        },
        target: destinations.slug,
      })
      .returning({ id: destinations.id, slug: destinations.slug });

    const destinationIds = new Map(
      seededDestinations.map((destination) => [destination.slug, destination.id]),
    );
    const aliases = initialDestinationCatalog.flatMap((destination) => {
      const destinationId = destinationIds.get(destination.slug);
      if (!destinationId) throw new Error(`Seeded destination is missing: ${destination.slug}`);
      return destination.aliases.map((normalizedAlias) => ({
        destinationId,
        normalizedAlias,
      }));
    });

    if (aliases.length > 0) {
      await transaction.insert(destinationAliases).values(aliases).onConflictDoNothing();
    }

    return {
      aliases: aliases.length,
      destinations: initialDestinationCatalogCounts.total,
      india: initialDestinationCatalogCounts.india,
      international: initialDestinationCatalogCounts.international,
    };
  });
}
