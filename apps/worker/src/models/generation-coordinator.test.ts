import type { ModelProviderName } from '@buzzytrip/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  GenerationCoordinator,
  GenerationUnavailableError,
  type QualityDecision,
} from './generation-coordinator';
import type { ConfiguredModelProvider } from './provider-factory';
import type { StructuredGenerationRequest, StructuredModelProvider } from './provider';
import type { ModelUsageBudget } from './usage-budget';

interface TestValue {
  answer: string;
}

const request: StructuredGenerationRequest<TestValue> = {
  jsonSchema: { type: 'object' },
  schemaName: 'test',
  systemPrompt: 'system',
  userPrompt: 'user',
  validate(value) {
    return value as TestValue;
  },
};

function createProvider(name: ModelProviderName, answer: string): StructuredModelProvider {
  return {
    model: `${name}-model`,
    name,
    async generate<T>(generationRequest: StructuredGenerationRequest<T>) {
      const rawValue = { answer };
      return {
        rawText: JSON.stringify(rawValue),
        usage: { inputTokens: 10, outputTokens: 5 },
        value: generationRequest.validate(rawValue),
      };
    },
  };
}

function configured(name: ModelProviderName, answer: string): ConfiguredModelProvider {
  return { dailyRequestLimit: 10, provider: createProvider(name, answer) };
}

function createBudget(reservations: boolean[]): ModelUsageBudget & {
  record: ReturnType<typeof vi.fn>;
  reserve: ReturnType<typeof vi.fn>;
} {
  return {
    record: vi.fn().mockResolvedValue(undefined),
    reserve: vi.fn().mockImplementation(() => Promise.resolve(reservations.shift() ?? false)),
  };
}

describe('GenerationCoordinator', () => {
  it('skips an exhausted provider without making a model request', async () => {
    const gemini = configured('gemini', 'first');
    const groq = configured('groq', 'second');
    const geminiGenerate = vi.spyOn(gemini.provider, 'generate');
    const budget = createBudget([false, true]);
    const coordinator = new GenerationCoordinator([gemini, groq], budget);

    await expect(coordinator.generate(request, () => ({ passed: true }))).resolves.toMatchObject({
      provider: 'groq',
      result: { value: { answer: 'second' } },
    });
    expect(geminiGenerate).not.toHaveBeenCalled();
    expect(budget.record).toHaveBeenCalledOnce();
  });

  it('tries the next free provider when quality rejects the first response', async () => {
    const budget = createBudget([true, true]);
    const coordinator = new GenerationCoordinator(
      [configured('gemini', 'weak'), configured('groq', 'clear')],
      budget,
    );

    await expect(
      coordinator.generate<TestValue, QualityDecision>(request, (value) => ({
        passed: value.answer === 'clear',
      })),
    ).resolves.toMatchObject({ provider: 'groq' });
    expect(budget.record).toHaveBeenCalledTimes(2);
  });

  it('returns only safe failure codes when no provider can run', async () => {
    const coordinator = new GenerationCoordinator(
      [configured('gemini', 'unused'), configured('groq', 'unused')],
      createBudget([false, false]),
    );

    const error = await coordinator
      .generate(request, () => ({ passed: true }))
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(GenerationUnavailableError);
    expect(error).toMatchObject({
      attempts: [
        { code: 'daily_quota_exhausted', provider: 'gemini' },
        { code: 'daily_quota_exhausted', provider: 'groq' },
      ],
    });
  });

  it('records an audited model attempt without retaining response text', async () => {
    const observer = {
      complete: vi.fn().mockResolvedValue(undefined),
      start: vi.fn().mockResolvedValue('11111111-1111-4111-8111-111111111111'),
    };
    const coordinator = new GenerationCoordinator(
      [configured('gemini', 'clear')],
      createBudget([true]),
      observer,
    );

    await expect(
      coordinator.generate(
        {
          ...request,
          audit: {
            destinationId: '22222222-2222-4222-8222-222222222222',
            promptVersion: 'test-prompt-v1',
          },
        },
        () => ({ passed: true }),
      ),
    ).resolves.toMatchObject({ attemptId: '11111111-1111-4111-8111-111111111111' });
    expect(observer.start).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-model', provider: 'gemini' }),
    );
    expect(observer.complete).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      expect.objectContaining({ responseHash: expect.stringMatching(/^[a-f0-9]{64}$/u) }),
    );
  });
});
