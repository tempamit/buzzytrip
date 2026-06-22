import { sql } from 'drizzle-orm';

import type { Database } from './client';
import { researchSources } from './schema';

export interface ResearchSourceRecordInput {
  contentHash: string;
  fetchedAt: Date;
  notes: string;
  publisher: string;
  sourceType: (typeof researchSources.$inferInsert)['sourceType'];
  title: string;
  url: string;
}

export interface PersistedResearchSource {
  id: string;
  url: string;
}

export async function upsertResearchSourceRecords(
  database: Database,
  sources: readonly ResearchSourceRecordInput[],
): Promise<PersistedResearchSource[]> {
  if (sources.length === 0) return [];

  return database
    .insert(researchSources)
    .values([...sources])
    .onConflictDoUpdate({
      set: {
        contentHash: sql`excluded.content_hash`,
        fetchedAt: sql`excluded.fetched_at`,
        notes: sql`excluded.notes`,
        publisher: sql`excluded.publisher`,
        sourceType: sql`excluded.source_type`,
        status: 'active',
        title: sql`excluded.title`,
        updatedAt: new Date(),
      },
      target: researchSources.url,
    })
    .returning({ id: researchSources.id, url: researchSources.url });
}
