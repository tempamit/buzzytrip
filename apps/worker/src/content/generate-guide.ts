import {
  generatedDestinationGuideJsonSchema,
  generatedDestinationGuideSchema,
  type GeneratedDestinationGuide,
} from '@buzzytrip/contracts';

import type { GenerationCoordinator } from '../models/generation-coordinator';
import {
  createDestinationGuidePrompts,
  DESTINATION_GUIDE_PROMPT_VERSION,
  type DestinationGuidePromptInput,
} from './prompt';
import { evaluateGeneratedGuide, type EditorialQualityReport } from './quality';

export interface GenerateDestinationGuideInput extends DestinationGuidePromptInput {
  destinationId: string;
  priorGuideTexts: string[];
}

export async function generateDestinationGuide(
  coordinator: GenerationCoordinator,
  input: GenerateDestinationGuideInput,
) {
  const prompts = createDestinationGuidePrompts(input);

  return coordinator.generate<GeneratedDestinationGuide, EditorialQualityReport>(
    {
      audit: {
        destinationId: input.destinationId,
        metadata: { contentAngle: input.contentAngle, tripTheme: input.tripTheme },
        promptVersion: DESTINATION_GUIDE_PROMPT_VERSION,
      },
      jsonSchema: generatedDestinationGuideJsonSchema,
      schemaName: 'buzzytrip_destination_guide',
      systemPrompt: prompts.systemPrompt,
      userPrompt: prompts.userPrompt,
      validate: (value) => generatedDestinationGuideSchema.parse(value),
    },
    (guide) =>
      evaluateGeneratedGuide(guide, {
        evidenceSourceCount: input.evidence.length,
        expectedCanonicalPath: input.canonicalPath,
        primaryKeyword: input.primaryKeyword,
        priorTexts: input.priorGuideTexts,
        sourceTexts: input.evidence.map((source) => source.facts.join(' ')),
      }),
  );
}
