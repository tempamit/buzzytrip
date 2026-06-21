import type { RankedTrendCandidate, TrendSignal } from '@buzzytrip/contracts';
import { eq, sql } from 'drizzle-orm';

import type { Database } from './client';
import { destinationAliases, destinations, trendCandidates, trendObservations } from './schema';

const TREND_UPSERT_BATCH_SIZE = 200;

function batches<T>(values: readonly T[], batchSize = TREND_UPSERT_BATCH_SIZE): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += batchSize) {
    result.push(values.slice(index, index + batchSize));
  }
  return result;
}

export interface DestinationTrendIdentity {
  aliases: string[];
  countryCode: string;
  countryName: string;
  id: string;
  name: string;
  scope: (typeof destinations.$inferSelect)['scope'];
  slug: string;
}

export async function listDestinationTrendIdentities(
  database: Database,
): Promise<DestinationTrendIdentity[]> {
  const rows = await database
    .select({
      alias: destinationAliases.normalizedAlias,
      countryCode: destinations.countryCode,
      countryName: destinations.countryName,
      id: destinations.id,
      name: destinations.name,
      scope: destinations.scope,
      slug: destinations.slug,
    })
    .from(destinations)
    .leftJoin(destinationAliases, eq(destinationAliases.destinationId, destinations.id))
    .where(eq(destinations.status, 'active'));

  const identities = new Map<string, DestinationTrendIdentity>();
  for (const row of rows) {
    const identity = identities.get(row.id) ?? {
      aliases: [],
      countryCode: row.countryCode,
      countryName: row.countryName,
      id: row.id,
      name: row.name,
      scope: row.scope,
      slug: row.slug,
    };
    if (row.alias && !identity.aliases.includes(row.alias)) identity.aliases.push(row.alias);
    identities.set(row.id, identity);
  }

  return [...identities.values()];
}

export async function upsertTrendObservations(
  database: Database,
  signals: readonly TrendSignal[],
): Promise<void> {
  if (signals.length === 0) return;

  for (const batch of batches(signals)) {
    await database
      .insert(trendObservations)
      .values(
        batch.map((signal) => ({
          context: signal.context,
          displayName: signal.displayName,
          metricValue: signal.metricValue.toString(),
          normalizedName: signal.normalizedName,
          observedOn: signal.observedOn,
          provider: signal.provider,
          rank: signal.rank,
          score: signal.score.toFixed(3),
          sourceUrl: signal.sourceUrl,
        })),
      )
      .onConflictDoUpdate({
        set: {
          context: sql`excluded.context`,
          displayName: sql`excluded.display_name`,
          metricValue: sql`excluded.metric_value`,
          rank: sql`excluded.rank`,
          score: sql`excluded.score`,
          sourceUrl: sql`excluded.source_url`,
          updatedAt: new Date(),
        },
        target: [
          trendObservations.provider,
          trendObservations.normalizedName,
          trendObservations.observedOn,
        ],
      });
  }
}

export async function upsertRankedTrendCandidates(
  database: Database,
  candidates: readonly RankedTrendCandidate[],
  observedOn: string,
): Promise<void> {
  for (const batch of batches(candidates)) {
    await database
      .insert(trendCandidates)
      .values(
        batch.map((candidate) => ({
          countryCode: candidate.countryCode,
          countryName: candidate.countryName,
          destinationId: candidate.destinationId,
          displayName: candidate.displayName,
          normalizedName: candidate.normalizedName,
          observedOn,
          provider: 'composite-v1',
          rawSignals: {
            providerScores: candidate.providerScores,
            reasons: candidate.reasons,
          },
          scope: candidate.scope,
          status: candidate.status,
          trendScore: candidate.score.toFixed(3),
        })),
      )
      .onConflictDoUpdate({
        set: {
          countryName: sql`excluded.country_name`,
          destinationId: sql`excluded.destination_id`,
          displayName: sql`excluded.display_name`,
          rawSignals: sql`excluded.raw_signals`,
          scope: sql`excluded.scope`,
          status: sql`excluded.status`,
          trendScore: sql`excluded.trend_score`,
          updatedAt: new Date(),
        },
        target: [
          trendCandidates.provider,
          trendCandidates.normalizedName,
          trendCandidates.countryCode,
          trendCandidates.observedOn,
        ],
      });
  }
}
