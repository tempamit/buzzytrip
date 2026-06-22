import type { ModelProviderName } from '@buzzytrip/contracts';
import { createHash } from 'node:crypto';

import type { ConfiguredModelProvider } from './provider-factory';
import {
  ModelProviderError,
  type StructuredGenerationRequest,
  type StructuredGenerationResult,
} from './provider';
import type { ModelUsageBudget } from './usage-budget';

export interface QualityDecision {
  passed: boolean;
}

export interface CoordinatedGenerationResult<T, TQuality extends QualityDecision> {
  attemptId?: string;
  model: string;
  provider: ModelProviderName;
  quality: TQuality;
  result: StructuredGenerationResult<T>;
}

export interface GenerationAttemptFailure {
  code: string;
  provider: ModelProviderName;
}

export interface GenerationAttemptObserver {
  complete(
    attemptId: string,
    outcome: {
      errorCode?: string;
      inputTokens: number;
      outputTokens: number;
      responseHash?: string;
      status: 'failed' | 'quality_rejected' | 'succeeded';
    },
  ): Promise<void>;
  start(input: {
    destinationId?: string;
    metadata?: Record<string, unknown>;
    model: string;
    promptVersion: string;
    provider: ModelProviderName;
  }): Promise<string>;
}

export class GenerationUnavailableError extends Error {
  constructor(readonly attempts: GenerationAttemptFailure[]) {
    super('No configured free-only model provider produced publishable content.');
    this.name = 'GenerationUnavailableError';
  }
}

export class GenerationCoordinator {
  constructor(
    private readonly providers: ConfiguredModelProvider[],
    private readonly usageBudget: ModelUsageBudget,
    private readonly attemptObserver?: GenerationAttemptObserver,
  ) {}

  async generate<T, TQuality extends QualityDecision>(
    request: StructuredGenerationRequest<T>,
    evaluateQuality: (value: T) => TQuality,
  ): Promise<CoordinatedGenerationResult<T, TQuality>> {
    const attempts: GenerationAttemptFailure[] = [];

    for (const configuredProvider of this.providers) {
      const { dailyRequestLimit, provider } = configuredProvider;
      const reserved = await this.usageBudget.reserve(provider.name, dailyRequestLimit);

      if (!reserved) {
        attempts.push({ code: 'daily_quota_exhausted', provider: provider.name });
        continue;
      }

      if (this.attemptObserver && !request.audit) {
        throw new Error('Audited generation requires request audit metadata.');
      }
      const attemptId =
        this.attemptObserver && request.audit
          ? await this.attemptObserver.start({
              ...request.audit,
              model: provider.model,
              provider: provider.name,
            })
          : undefined;

      let result: StructuredGenerationResult<T>;
      try {
        result = await provider.generate(request);
      } catch (error) {
        const errorCode =
          error instanceof ModelProviderError ? error.code : 'unexpected_provider_error';
        if (attemptId && this.attemptObserver) {
          await this.attemptObserver.complete(attemptId, {
            errorCode,
            inputTokens: 0,
            outputTokens: 0,
            status: 'failed',
          });
        }
        attempts.push({
          code: errorCode,
          provider: provider.name,
        });
        if (!(error instanceof ModelProviderError)) break;
        continue;
      }

      // A usage-write failure stops fallback so a database outage cannot multiply paid requests.
      try {
        await this.usageBudget.record(provider.name, result.usage);
      } catch (error) {
        if (attemptId && this.attemptObserver) {
          await this.attemptObserver.complete(attemptId, {
            errorCode: 'usage_record_failed',
            ...result.usage,
            status: 'failed',
          });
        }
        throw error;
      }
      const quality = evaluateQuality(result.value);
      const responseHash = createHash('sha256').update(result.rawText).digest('hex');

      if (!quality.passed) {
        if (attemptId && this.attemptObserver) {
          await this.attemptObserver.complete(attemptId, {
            ...result.usage,
            responseHash,
            status: 'quality_rejected',
          });
        }
        attempts.push({ code: 'quality_rejected', provider: provider.name });
        continue;
      }

      if (attemptId && this.attemptObserver) {
        await this.attemptObserver.complete(attemptId, {
          ...result.usage,
          responseHash,
          status: 'succeeded',
        });
      }

      return {
        ...(attemptId ? { attemptId } : {}),
        model: provider.model,
        provider: provider.name,
        quality,
        result,
      };
    }

    throw new GenerationUnavailableError(attempts);
  }
}
