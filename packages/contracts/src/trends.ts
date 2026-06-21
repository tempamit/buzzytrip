import { z } from 'zod';

import { destinationScopeSchema } from './destinations';

export const trendSignalProviderSchema = z.enum([
  'google_trends',
  'wikivoyage_pageviews',
  'wikipedia_pageviews',
]);

export const trendSignalSchema = z.object({
  context: z.array(z.string().trim().min(1).max(500)).max(12),
  displayName: z.string().trim().min(1).max(180),
  metricValue: z.number().finite().nonnegative(),
  normalizedName: z.string().trim().min(1).max(180),
  observedOn: z.iso.date(),
  provider: trendSignalProviderSchema,
  rank: z.number().int().positive().nullable(),
  score: z.number().finite().min(0).max(100),
  sourceUrl: z.url(),
});

export const rankedTrendCandidateSchema = z.object({
  countryCode: z.string().length(2),
  countryName: z.string().min(2).max(100),
  destinationId: z.uuid(),
  displayName: z.string().min(1).max(180),
  normalizedName: z.string().min(1).max(180),
  providerScores: z.partialRecord(trendSignalProviderSchema, z.number().min(0).max(100)),
  reasons: z.array(z.string().min(1).max(240)).min(1).max(12),
  scope: destinationScopeSchema,
  score: z.number().min(0).max(100),
  status: z.enum(['eligible', 'deferred', 'rejected']),
});

export type TrendSignalProvider = z.infer<typeof trendSignalProviderSchema>;
export type TrendSignal = z.infer<typeof trendSignalSchema>;
export type RankedTrendCandidate = z.infer<typeof rankedTrendCandidateSchema>;
