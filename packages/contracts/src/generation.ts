import { z } from 'zod';

import { destinationGuideContentSchema, destinationGuideSeoSchema } from './destinations';

export const modelProviderNameSchema = z.enum(['gemini', 'groq']);

export const guideEvidenceSectionSchema = z.enum([
  'overview',
  'best_time',
  'highlights',
  'how_to_reach',
  'getting_around',
  'stay',
  'eat',
  'age_and_mobility',
  'practical',
  'safety',
  'responsible_travel',
  'faqs',
]);

export const generatedDestinationGuideSchema = z
  .object({
    content: destinationGuideContentSchema,
    excerpt: z.string().trim().min(80).max(600),
    seo: destinationGuideSeoSchema,
    sourceUses: z
      .array(
        z
          .object({
            claimSummary: z.string().trim().min(20).max(500),
            sectionKeys: z.array(guideEvidenceSectionSchema).min(1).max(12),
            sourceIndex: z.number().int().nonnegative().max(20),
          })
          .strict(),
      )
      .min(2)
      .max(36),
    title: z.string().trim().min(20).max(180),
  })
  .strict();

export const generatedDestinationGuideJsonSchema = z.toJSONSchema(generatedDestinationGuideSchema, {
  reused: 'inline',
  target: 'draft-07',
  unrepresentable: 'any',
}) as Record<string, unknown>;

export type ModelProviderName = z.infer<typeof modelProviderNameSchema>;
export type GuideEvidenceSection = z.infer<typeof guideEvidenceSectionSchema>;
export type GeneratedDestinationGuide = z.infer<typeof generatedDestinationGuideSchema>;
