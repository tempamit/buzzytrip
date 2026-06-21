import type { WorkerEnvironment } from '@buzzytrip/config';
import type { ModelProviderName } from '@buzzytrip/contracts';

import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import type { FetchFunction, StructuredModelProvider } from './provider';

export interface ConfiguredModelProvider {
  dailyRequestLimit: number;
  provider: StructuredModelProvider;
}

export function createConfiguredModelProviders(
  environment: WorkerEnvironment,
  fetchFunction?: FetchFunction,
): ConfiguredModelProvider[] {
  if (!environment.CONTENT_GENERATION_ENABLED) return [];

  const providers = new Map<ModelProviderName, ConfiguredModelProvider>();

  if (environment.GEMINI_API_KEY) {
    providers.set('gemini', {
      dailyRequestLimit: environment.GEMINI_DAILY_REQUEST_LIMIT,
      provider: new GeminiProvider({
        apiBaseUrl: environment.GEMINI_API_BASE_URL,
        apiKey: environment.GEMINI_API_KEY,
        ...(fetchFunction ? { fetchFunction } : {}),
        maxOutputTokens: environment.MODEL_MAX_OUTPUT_TOKENS,
        model: environment.GEMINI_MODEL,
        temperature: environment.MODEL_TEMPERATURE,
        timeoutMilliseconds: environment.MODEL_REQUEST_TIMEOUT_MS,
      }),
    });
  }

  if (environment.GROQ_API_KEY) {
    providers.set('groq', {
      dailyRequestLimit: environment.GROQ_DAILY_REQUEST_LIMIT,
      provider: new GroqProvider({
        apiBaseUrl: environment.GROQ_API_BASE_URL,
        apiKey: environment.GROQ_API_KEY,
        ...(fetchFunction ? { fetchFunction } : {}),
        maxOutputTokens: environment.MODEL_MAX_OUTPUT_TOKENS,
        model: environment.GROQ_MODEL,
        temperature: environment.MODEL_TEMPERATURE,
        timeoutMilliseconds: environment.MODEL_REQUEST_TIMEOUT_MS,
      }),
    });
  }

  return environment.MODEL_PROVIDER_ORDER.flatMap((providerName) => {
    const provider = providers.get(providerName);
    return provider ? [provider] : [];
  });
}
