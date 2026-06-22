import type { ModelProviderName } from '@buzzytrip/contracts';
import { eq } from 'drizzle-orm';

import type { Database } from './client';
import { modelGenerationAttempts } from './schema';

export interface StartGenerationAttemptInput {
  destinationId?: string;
  metadata?: Record<string, unknown>;
  model: string;
  promptVersion: string;
  provider: ModelProviderName;
}

export interface CompleteGenerationAttemptInput {
  errorCode?: string;
  inputTokens: number;
  outputTokens: number;
  responseHash?: string;
  status: 'failed' | 'quality_rejected' | 'succeeded';
}

export async function startModelGenerationAttempt(
  database: Database,
  input: StartGenerationAttemptInput,
): Promise<string> {
  const [attempt] = await database
    .insert(modelGenerationAttempts)
    .values({
      destinationId: input.destinationId,
      metadata: input.metadata ?? {},
      model: input.model,
      promptVersion: input.promptVersion,
      provider: input.provider,
      status: 'started',
    })
    .returning({ id: modelGenerationAttempts.id });
  if (!attempt) throw new Error('Generation attempt insert did not return an identifier.');
  return attempt.id;
}

export async function completeModelGenerationAttempt(
  database: Database,
  attemptId: string,
  input: CompleteGenerationAttemptInput,
): Promise<void> {
  await database
    .update(modelGenerationAttempts)
    .set({
      completedAt: new Date(),
      errorCode: input.errorCode,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      responseHash: input.responseHash,
      status: input.status,
    })
    .where(eq(modelGenerationAttempts.id, attemptId));
}
