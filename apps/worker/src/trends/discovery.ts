import type { RankedTrendCandidate, TrendSignal } from '@buzzytrip/contracts';
import {
  canPublishDestination,
  listDestinationTrendIdentities,
  upsertRankedTrendCandidates,
  upsertTrendObservations,
  type Database,
} from '@buzzytrip/database';

import type { TrendProvider } from './provider';
import { rankDestinationTrends, selectDailyTrendLanes } from './ranking';

export interface TrendDiscoveryReport {
  candidates: RankedTrendCandidate[];
  failures: Array<{ code: string; provider: string }>;
  observedOn: string;
  selected: ReturnType<typeof selectDailyTrendLanes>;
  signalCount: number;
}

export async function discoverDestinationTrends(
  database: Database,
  providers: readonly TrendProvider[],
  now = new Date(),
): Promise<TrendDiscoveryReport> {
  const providerResults = await Promise.allSettled(
    providers.map(async (provider) => ({
      provider: provider.name,
      signals: await provider.fetchSignals(now),
    })),
  );
  const signals: TrendSignal[] = [];
  const failures: TrendDiscoveryReport['failures'] = [];

  for (const [index, result] of providerResults.entries()) {
    const provider = providers[index];
    if (result.status === 'fulfilled') signals.push(...result.value.signals);
    else failures.push({ code: 'provider_failed', provider: provider?.name ?? 'unknown' });
  }

  await upsertTrendObservations(database, signals);
  const identities = await listDestinationTrendIdentities(database);
  const candidates = rankDestinationTrends(signals, identities);

  for (const candidate of candidates) {
    if (
      candidate.status === 'eligible' &&
      !(await canPublishDestination(database, candidate.destinationId))
    ) {
      candidate.status = 'deferred';
      candidate.reasons.push('publication_gap:deferred');
    }
  }

  const observedOn = now.toISOString().slice(0, 10);
  await upsertRankedTrendCandidates(database, candidates, observedOn);

  return {
    candidates,
    failures,
    observedOn,
    selected: selectDailyTrendLanes(candidates),
    signalCount: signals.length,
  };
}
