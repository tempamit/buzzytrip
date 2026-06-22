import { parseWorkerEnvironment } from '@buzzytrip/config';
import { describe, expect, it } from 'vitest';

import { createConfiguredModelProviders } from './provider-factory';

describe('model provider factory', () => {
  it('creates no providers while content generation is disabled', () => {
    expect(createConfiguredModelProviders(parseWorkerEnvironment({}))).toEqual([]);
  });

  it('allows only an explicit manual run to bypass the automatic-generation switch', () => {
    const environment = parseWorkerEnvironment({ GEMINI_API_KEY: 'test-gemini-key' });
    expect(
      createConfiguredModelProviders(environment, undefined, { ignoreEnabled: true }).map(
        ({ provider }) => provider.name,
      ),
    ).toEqual(['gemini']);
  });

  it('uses only configured keys and respects provider order', () => {
    const environment = parseWorkerEnvironment({
      CONTENT_GENERATION_ENABLED: 'true',
      GEMINI_API_KEY: 'test-gemini-key',
      GROQ_API_KEY: 'test-groq-key',
      MODEL_PROVIDER_ORDER: 'groq,gemini',
    });

    expect(
      createConfiguredModelProviders(environment).map(({ dailyRequestLimit, provider }) => ({
        dailyRequestLimit,
        model: provider.model,
        name: provider.name,
      })),
    ).toEqual([
      { dailyRequestLimit: 10, model: 'openai/gpt-oss-20b', name: 'groq' },
      { dailyRequestLimit: 10, model: 'gemini-flash-latest', name: 'gemini' },
    ]);
  });
});
