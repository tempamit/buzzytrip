import { desc, eq } from 'drizzle-orm';

import type { Database } from './client';
import { contentPublications } from './schema';

export const DEFAULT_DESTINATION_PUBLICATION_GAP = 6;

export function meetsDestinationPublicationGap(
  destinationId: string,
  recentDestinationIds: readonly string[],
  minimumGap = DEFAULT_DESTINATION_PUBLICATION_GAP,
): boolean {
  if (!Number.isInteger(minimumGap) || minimumGap < 0) {
    throw new Error('minimumGap must be a non-negative integer');
  }

  return !recentDestinationIds.slice(0, minimumGap).includes(destinationId);
}

export async function canPublishDestination(
  database: Database,
  destinationId: string,
  minimumGap = DEFAULT_DESTINATION_PUBLICATION_GAP,
): Promise<boolean> {
  if (!Number.isInteger(minimumGap) || minimumGap < 0) {
    throw new Error('minimumGap must be a non-negative integer');
  }

  const recentPublications = await database
    .select({ destinationId: contentPublications.destinationId })
    .from(contentPublications)
    .where(eq(contentPublications.status, 'published'))
    .orderBy(desc(contentPublications.publicationSequence))
    .limit(minimumGap);

  return meetsDestinationPublicationGap(
    destinationId,
    recentPublications.map((publication) => publication.destinationId),
    minimumGap,
  );
}
