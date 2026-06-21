import { z } from 'zod';

import { destinationGuideContentSchema, destinationGuideSeoSchema } from './destinations';

export const modelProviderNameSchema = z.enum(['gemini', 'groq']);

export const generatedDestinationGuideSchema = z
  .object({
    content: destinationGuideContentSchema,
    excerpt: z.string().trim().min(80).max(600),
    seo: destinationGuideSeoSchema,
    title: z.string().trim().min(20).max(180),
  })
  .strict();

export const generatedDestinationGuideJsonSchema = z.toJSONSchema(generatedDestinationGuideSchema, {
  reused: 'inline',
  target: 'draft-07',
  unrepresentable: 'any',
}) as Record<string, unknown>;

export type ModelProviderName = z.infer<typeof modelProviderNameSchema>;
export type GeneratedDestinationGuide = z.infer<typeof generatedDestinationGuideSchema>;
