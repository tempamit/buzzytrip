import {
  rankedTrendCandidateSchema,
  type RankedTrendCandidate,
  type TrendSignal,
  type TrendSignalProvider,
} from '@buzzytrip/contracts';
import type { DestinationTrendIdentity } from '@buzzytrip/database';

import { normalizeTrendName, trendLookupKeys } from './normalize';

const providerWeights: Record<TrendSignalProvider, number> = {
  google_trends: 0.3,
  wikipedia_pageviews: 0.2,
  wikivoyage_pageviews: 0.5,
};

const crisisTerms = [
  'accident',
  'attack',
  'bombing',
  'crash',
  'cyclone',
  'earthquake',
  'emergency',
  'evacuation',
  'flood',
  'hurricane',
  'killed',
  'landslide',
  'riot',
  'shooting',
  'tsunami',
  'war',
  'wildfire',
];

function containsCrisisContext(signals: readonly TrendSignal[]): string | null {
  const context = signals
    .flatMap((signal) => [signal.displayName, ...signal.context])
    .join(' ')
    .toLowerCase();
  return crisisTerms.find((term) => new RegExp(`\\b${term}\\b`, 'iu').test(context)) ?? null;
}

function buildIdentityIndex(identities: readonly DestinationTrendIdentity[]) {
  const index = new Map<string, DestinationTrendIdentity | null>();

  for (const identity of identities) {
    const keys = new Set([
      normalizeTrendName(identity.name),
      normalizeTrendName(identity.slug),
      ...identity.aliases.map(normalizeTrendName),
    ]);

    for (const key of keys) {
      if (!key) continue;
      if (!index.has(key)) {
        index.set(key, identity);
        continue;
      }
      const existing = index.get(key);
      if (existing && existing.id !== identity.id) index.set(key, null);
    }
  }

  return index;
}

export function rankDestinationTrends(
  signals: readonly TrendSignal[],
  identities: readonly DestinationTrendIdentity[],
): RankedTrendCandidate[] {
  const identityIndex = buildIdentityIndex(identities);
  const matchedSignals = new Map<
    string,
    { identity: DestinationTrendIdentity; signals: TrendSignal[] }
  >();

  for (const signal of signals) {
    const identity = trendLookupKeys(signal.normalizedName)
      .map((key) => identityIndex.get(key))
      .find(
        (candidate): candidate is DestinationTrendIdentity =>
          candidate !== undefined && candidate !== null,
      );
    if (!identity) continue;

    const matched = matchedSignals.get(identity.id) ?? { identity, signals: [] };
    matched.signals.push(signal);
    matchedSignals.set(identity.id, matched);
  }

  const candidates: RankedTrendCandidate[] = [];
  for (const { identity, signals: destinationSignals } of matchedSignals.values()) {
    const providerScores: Partial<Record<TrendSignalProvider, number>> = {};
    for (const signal of destinationSignals) {
      providerScores[signal.provider] = Math.max(
        providerScores[signal.provider] ?? 0,
        signal.score,
      );
    }

    const crisisTerm = containsCrisisContext(destinationSignals);
    const weightedEntries = Object.entries(providerScores) as Array<[TrendSignalProvider, number]>;
    const totalWeight = weightedEntries.reduce(
      (sum, [provider]) => sum + providerWeights[provider],
      0,
    );
    const weightedScore =
      totalWeight === 0
        ? 0
        : weightedEntries.reduce(
            (sum, [provider, score]) => sum + score * providerWeights[provider],
            0,
          ) / totalWeight;
    const independentSourceBonus = Math.min(10, Math.max(0, weightedEntries.length - 1) * 5);
    const score = Math.min(100, weightedScore + independentSourceBonus);
    const reasons = weightedEntries.map(
      ([provider, providerScore]) => `${provider}:${providerScore.toFixed(1)}`,
    );

    if (crisisTerm) reasons.push(`crisis_context:${crisisTerm}`);
    else if (independentSourceBonus > 0)
      reasons.push(`multi_source_bonus:${independentSourceBonus}`);

    candidates.push(
      rankedTrendCandidateSchema.parse({
        countryCode: identity.countryCode,
        countryName: identity.countryName,
        destinationId: identity.id,
        displayName: identity.name,
        normalizedName: normalizeTrendName(identity.name),
        providerScores,
        reasons,
        scope: identity.scope,
        score,
        status: crisisTerm || score < 20 ? 'rejected' : 'eligible',
      }),
    );
  }

  return candidates.sort((first, second) => second.score - first.score);
}

export function selectDailyTrendLanes(candidates: readonly RankedTrendCandidate[]): {
  india: RankedTrendCandidate | null;
  international: RankedTrendCandidate | null;
} {
  return {
    india:
      candidates.find(
        (candidate) => candidate.scope === 'india' && candidate.status === 'eligible',
      ) ?? null,
    international:
      candidates.find(
        (candidate) => candidate.scope === 'international' && candidate.status === 'eligible',
      ) ?? null,
  };
}
