import { parseWorkerEnvironment } from '@buzzytrip/config';
import type { TrendSignal } from '@buzzytrip/contracts';
import { initialDestinationCatalog, type DestinationTrendIdentity } from '@buzzytrip/database';

import { createTrendProviders } from './provider-factory';
import { rankDestinationTrends, selectDailyTrendLanes } from './ranking';

async function run(): Promise<void> {
  const environment = parseWorkerEnvironment(process.env);
  const providers = createTrendProviders(environment, { ignoreEnabled: true });
  const results = await Promise.allSettled(
    providers.map(async (provider) => ({
      name: provider.name,
      signals: await provider.fetchSignals(),
    })),
  );

  let successfulProviders = 0;
  const signals: TrendSignal[] = [];
  for (const [index, result] of results.entries()) {
    const providerName = providers[index]?.name ?? 'unknown';
    if (result.status === 'rejected') {
      console.error(`${providerName}: failed`);
      continue;
    }

    successfulProviders += 1;
    signals.push(...result.value.signals);
    console.log(
      JSON.stringify({
        provider: result.value.name,
        sample: result.value.signals.slice(0, 5).map((signal) => ({
          name: signal.displayName,
          score: Number(signal.score.toFixed(2)),
        })),
        signalCount: result.value.signals.length,
      }),
    );
  }

  if (successfulProviders === 0) {
    process.exitCode = 1;
    return;
  }

  const identities: DestinationTrendIdentity[] = initialDestinationCatalog.map(
    (destination, index) => ({
      aliases: destination.aliases,
      countryCode: destination.countryCode,
      countryName: destination.countryName,
      id: `00000000-0000-4000-8000-${(index + 1).toString().padStart(12, '0')}`,
      name: destination.name,
      scope: destination.scope,
      slug: destination.slug,
    }),
  );
  const candidates = rankDestinationTrends(signals, identities);
  const selected = selectDailyTrendLanes(candidates);

  console.log(
    JSON.stringify({
      eligibleMatches: candidates.filter((candidate) => candidate.status === 'eligible').length,
      matchedDestinations: candidates.slice(0, 12).map((candidate) => ({
        name: candidate.displayName,
        score: Number(candidate.score.toFixed(2)),
        status: candidate.status,
      })),
      selected: {
        india: selected.india?.displayName ?? null,
        international: selected.international?.displayName ?? null,
      },
    }),
  );
}

void run();
