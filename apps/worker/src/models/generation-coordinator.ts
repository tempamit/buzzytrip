import type { ModelProviderName } from '@buzzytrip/contracts';

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
  model: string;
  provider: ModelProviderName;
  quality: TQuality;
  result: StructuredGenerationResult<T>;
}

export interface GenerationAttemptFailure {
  code: string;
  provider: ModelProviderName;
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

      let result: StructuredGenerationResult<T>;
      try {
        result = await provider.generate(request);
      } catch (error) {
        attempts.push({
          code: error instanceof ModelProviderError ? error.code : 'unexpected_provider_error',
          provider: provider.name,
        });
        if (!(error instanceof ModelProviderError)) break;
        continue;
      }

      // A usage-write failure stops fallback so a database outage cannot multiply paid requests.
      await this.usageBudget.record(provider.name, result.usage);
      const quality = evaluateQuality(result.value);

      if (!quality.passed) {
        attempts.push({ code: 'quality_rejected', provider: provider.name });
        continue;
      }

      return {
        model: provider.model,
        provider: provider.name,
        quality,
        result,
      };
    }

    throw new GenerationUnavailableError(attempts);
  }
}
