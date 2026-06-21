import { parseWorkerEnvironment } from '@buzzytrip/config';

import { createTrendProviders } from './provider-factory';

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
  for (const [index, result] of results.entries()) {
    const providerName = providers[index]?.name ?? 'unknown';
    if (result.status === 'rejected') {
      console.error(`${providerName}: failed`);
      continue;
    }

    successfulProviders += 1;
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

  if (successfulProviders === 0) process.exitCode = 1;
}

void run();
