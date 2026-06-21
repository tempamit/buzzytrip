import {
  generatedDestinationGuideJsonSchema,
  generatedDestinationGuideSchema,
  type GeneratedDestinationGuide,
} from '@buzzytrip/contracts';

import type { GenerationCoordinator } from '../models/generation-coordinator';
import { createDestinationGuidePrompts, type DestinationGuidePromptInput } from './prompt';
import { evaluateGeneratedGuide, type EditorialQualityReport } from './quality';

export interface GenerateDestinationGuideInput extends DestinationGuidePromptInput {
  priorGuideTexts: string[];
}

export async function generateDestinationGuide(
  coordinator: GenerationCoordinator,
  input: GenerateDestinationGuideInput,
) {
  const prompts = createDestinationGuidePrompts(input);

  return coordinator.generate<GeneratedDestinationGuide, EditorialQualityReport>(
    {
      jsonSchema: generatedDestinationGuideJsonSchema,
      schemaName: 'buzzytrip_destination_guide',
      systemPrompt: prompts.systemPrompt,
      userPrompt: prompts.userPrompt,
      validate: (value) => generatedDestinationGuideSchema.parse(value),
    },
    (guide) =>
      evaluateGeneratedGuide(guide, {
        primaryKeyword: input.primaryKeyword,
        priorTexts: input.priorGuideTexts,
      }),
  );
}
