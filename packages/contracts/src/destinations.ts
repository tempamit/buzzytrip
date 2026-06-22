import { z } from 'zod';

const shortText = z.string().trim().min(2).max(160);
const paragraph = z.string().trim().min(20).max(2_000);

export const destinationScopeSchema = z.enum(['india', 'international']);
export const destinationTypeSchema = z.enum([
  'city',
  'coast',
  'country',
  'countryside',
  'desert',
  'heritage',
  'island',
  'mountains',
  'nature',
  'region',
  'wildlife',
]);
export const destinationStatusSchema = z.enum(['active', 'archived']);

export function normalizeDestinationLookupKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/&/gu, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

const destinationAliasSchema = z
  .string()
  .trim()
  .min(2)
  .max(180)
  .refine((alias) => alias === normalizeDestinationLookupKey(alias), {
    message: 'Destination aliases must already be normalized lookup keys.',
  });

export const destinationCatalogEntrySchema = z
  .object({
    aliases: z.array(destinationAliasSchema).max(12),
    countryCode: z.string().regex(/^[A-Z]{2}$/u),
    countryName: z.string().trim().min(2).max(100),
    destinationType: destinationTypeSchema,
    name: shortText,
    scope: destinationScopeSchema,
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
      .min(2)
      .max(160),
    stateOrRegion: z.string().trim().min(2).max(120).nullable(),
  })
  .strict()
  .superRefine((entry, context) => {
    const isIndian = entry.countryCode === 'IN' && entry.countryName === 'India';
    if ((entry.scope === 'india') !== isIndian) {
      context.addIssue({
        code: 'custom',
        message: 'India-scope destinations must use country code IN and country name India.',
        path: ['scope'],
      });
    }

    if (new Set(entry.aliases).size !== entry.aliases.length) {
      context.addIssue({
        code: 'custom',
        message: 'Destination aliases cannot contain duplicates.',
        path: ['aliases'],
      });
    }
  });

export const destinationCatalogSchema = z
  .array(destinationCatalogEntrySchema)
  .min(2)
  .superRefine((entries, context) => {
    const slugs = new Set<string>();
    const lookupOwners = new Map<string, string>();

    for (const [index, entry] of entries.entries()) {
      if (slugs.has(entry.slug)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate destination slug: ${entry.slug}`,
          path: [index, 'slug'],
        });
      }
      slugs.add(entry.slug);

      const lookupKeys = new Set([
        normalizeDestinationLookupKey(entry.name),
        normalizeDestinationLookupKey(entry.slug),
        ...entry.aliases,
      ]);
      for (const lookupKey of lookupKeys) {
        const owner = lookupOwners.get(lookupKey);
        if (owner && owner !== entry.slug) {
          context.addIssue({
            code: 'custom',
            message: `Lookup key "${lookupKey}" is already owned by ${owner}.`,
            path: [index, 'aliases'],
          });
        } else {
          lookupOwners.set(lookupKey, entry.slug);
        }
      }
    }
  });
export const trendCandidateStatusSchema = z.enum([
  'discovered',
  'matched',
  'eligible',
  'deferred',
  'selected',
  'rejected',
]);
export const guideStatusSchema = z.enum(['draft', 'review', 'published', 'retired']);
export const guideRevisionStatusSchema = z.enum([
  'draft',
  'quality_failed',
  'ready',
  'published',
  'rejected',
]);

export const guideListItemSchema = z.object({
  detail: paragraph,
  title: shortText,
});

export const guideRecommendationSchema = z.object({
  area: z.string().trim().min(2).max(120).optional(),
  name: shortText,
  priceBand: z.string().trim().min(1).max(40).optional(),
  reason: paragraph,
});

export const destinationGuideContentSchema = z
  .object({
    ageAndMobility: z.object({
      accessibilityNotes: z.array(paragraph).max(12),
      ageGroups: z.array(shortText).min(1).max(10),
      summary: paragraph,
    }),
    bestTime: z.object({
      seasons: z.array(guideListItemSchema).min(1).max(8),
      summary: paragraph,
    }),
    eat: z.object({
      localFlavours: z.array(guideRecommendationSchema).min(1).max(12),
      reliableComfort: z.array(guideRecommendationSchema).min(1).max(12),
      specialOccasion: z.array(guideRecommendationSchema).min(1).max(12),
    }),
    faqs: z
      .array(
        z.object({
          answer: paragraph,
          question: z.string().trim().min(10).max(180),
        }),
      )
      .min(3)
      .max(12),
    gettingAround: z.array(guideListItemSchema).min(1).max(12),
    highlights: z.array(guideListItemSchema).min(3).max(24),
    howToReach: z.object({
      byAir: paragraph.optional(),
      byRail: paragraph.optional(),
      byRoad: paragraph.optional(),
      summary: paragraph,
    }),
    idealFor: z.array(shortText).min(1).max(12),
    overview: z.string().trim().min(120).max(2_000),
    practical: z.object({
      donts: z.array(paragraph).min(3).max(20),
      dos: z.array(paragraph).min(3).max(20),
      whatToCarry: z.array(paragraph).min(3).max(20),
      whatToWear: z.array(paragraph).min(2).max(16),
    }),
    responsibleTravel: z.array(paragraph).min(2).max(12),
    safety: z.object({
      emergencyNotes: z.array(paragraph).max(10),
      summary: paragraph,
    }),
    stay: z.object({
      comfort: z.array(guideRecommendationSchema).min(1).max(12),
      premium: z.array(guideRecommendationSchema).min(1).max(12),
      value: z.array(guideRecommendationSchema).min(1).max(12),
    }),
    tripLength: z
      .object({
        minimumDays: z.number().int().min(1).max(60),
        recommendedDays: z.number().int().min(1).max(60),
      })
      .refine((value) => value.recommendedDays >= value.minimumDays, {
        message: 'recommendedDays must be greater than or equal to minimumDays',
        path: ['recommendedDays'],
      }),
  })
  .strict();

export const destinationGuideSeoSchema = z
  .object({
    canonicalPath: z.string().trim().startsWith('/').max(220),
    metaDescription: z.string().trim().min(80).max(165),
    metaTitle: z.string().trim().min(20).max(65),
    primaryKeyword: z.string().trim().min(2).max(80),
    supportingKeywords: z.array(z.string().trim().min(2).max(80)).max(8),
  })
  .strict();

export const destinationSummarySchema = z.object({
  countryCode: z.string().length(2),
  countryName: z.string().min(2).max(100),
  destinationType: destinationTypeSchema,
  id: z.string().uuid(),
  name: shortText,
  scope: destinationScopeSchema,
  slug: z.string().min(2).max(160),
  stateOrRegion: z.string().max(120).nullable(),
});

export const publishedGuideSummarySchema = z.object({
  destination: destinationSummarySchema,
  excerpt: z.string().min(20).max(600),
  guideSlug: z.string().min(2).max(180),
  id: z.string().uuid(),
  publishedAt: z.string().datetime(),
  title: z.string().min(10).max(180),
});

export const publishedGuideMediaSchema = z.object({
  alt: z.string().min(5).max(240),
  caption: z.string().max(500).nullable(),
  credit: z.string().min(2).max(240),
  creditUrl: z.string().url(),
  height: z.number().int().positive().nullable(),
  license: z.string().min(2).max(100),
  licenseUrl: z.string().url(),
  role: z.enum(['hero', 'gallery', 'inline']),
  sourceUrl: z.string().url(),
  url: z.string().url(),
  width: z.number().int().positive().nullable(),
});

export const publishedGuideSourceSchema = z.object({
  publisher: z.string().min(2).max(160),
  title: z.string().min(2).max(240),
  url: z.string().url(),
});

export const publishedGuideDetailSchema = publishedGuideSummarySchema.extend({
  content: destinationGuideContentSchema,
  media: z.array(publishedGuideMediaSchema),
  seo: destinationGuideSeoSchema,
  sources: z.array(publishedGuideSourceSchema),
});

export type DestinationScope = z.infer<typeof destinationScopeSchema>;
export type DestinationType = z.infer<typeof destinationTypeSchema>;
export type DestinationStatus = z.infer<typeof destinationStatusSchema>;
export type DestinationCatalogEntry = z.infer<typeof destinationCatalogEntrySchema>;
export type TrendCandidateStatus = z.infer<typeof trendCandidateStatusSchema>;
export type GuideStatus = z.infer<typeof guideStatusSchema>;
export type GuideRevisionStatus = z.infer<typeof guideRevisionStatusSchema>;
export type DestinationGuideContent = z.infer<typeof destinationGuideContentSchema>;
export type DestinationGuideSeo = z.infer<typeof destinationGuideSeoSchema>;
export type DestinationSummary = z.infer<typeof destinationSummarySchema>;
export type PublishedGuideSummary = z.infer<typeof publishedGuideSummarySchema>;
export type PublishedGuideMedia = z.infer<typeof publishedGuideMediaSchema>;
export type PublishedGuideSource = z.infer<typeof publishedGuideSourceSchema>;
export type PublishedGuideDetail = z.infer<typeof publishedGuideDetailSchema>;
