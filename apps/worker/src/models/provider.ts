import type { ModelProviderName } from '@buzzytrip/contracts';

export interface ModelTokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface StructuredGenerationRequest<T> {
  jsonSchema: Record<string, unknown>;
  schemaName: string;
  systemPrompt: string;
  userPrompt: string;
  validate: (value: unknown) => T;
}

export interface StructuredGenerationResult<T> {
  rawText: string;
  usage: ModelTokenUsage;
  value: T;
}

export interface StructuredModelProvider {
  readonly model: string;
  readonly name: ModelProviderName;
  generate<T>(request: StructuredGenerationRequest<T>): Promise<StructuredGenerationResult<T>>;
}

export type FetchFunction = typeof globalThis.fetch;

export class ModelProviderError extends Error {
  constructor(
    message: string,
    readonly provider: ModelProviderName,
    readonly code: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ModelProviderError';
  }
}

export function parseAndValidateStructuredResponse<T>(
  rawText: string,
  provider: ModelProviderName,
  validate: (value: unknown) => T,
): T {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new ModelProviderError(
      `${provider} returned invalid JSON.`,
      provider,
      'invalid_json',
      false,
    );
  }

  try {
    return validate(parsed);
  } catch {
    throw new ModelProviderError(
      `${provider} returned JSON that failed the BuzzyTrip content contract.`,
      provider,
      'schema_validation_failed',
      false,
    );
  }
}

export function schemaWithoutDialect(jsonSchema: Record<string, unknown>): Record<string, unknown> {
  const schema = { ...jsonSchema };
  delete schema.$schema;
  return schema;
}

export async function fetchWithDeadline(
  fetchFunction: FetchFunction,
  url: string,
  init: RequestInit,
  timeoutMilliseconds: number,
  provider: ModelProviderName,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);

  try {
    return await fetchFunction(url, { ...init, signal: controller.signal });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    throw new ModelProviderError(
      isTimeout ? `${provider} request timed out.` : `${provider} request failed.`,
      provider,
      isTimeout ? 'timeout' : 'network_error',
      true,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function createHttpProviderError(
  provider: ModelProviderName,
  status: number,
): ModelProviderError {
  return new ModelProviderError(
    `${provider} returned HTTP ${status}.`,
    provider,
    status === 429 ? 'rate_limited' : 'http_error',
    status === 408 || status === 429 || status >= 500,
    status,
  );
}
