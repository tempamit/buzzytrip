import {
  createHttpProviderError,
  fetchWithDeadline,
  parseAndValidateStructuredResponse,
  schemaWithoutDialect,
  type FetchFunction,
  type StructuredGenerationRequest,
  type StructuredGenerationResult,
  type StructuredModelProvider,
} from './provider';

interface GroqProviderOptions {
  apiBaseUrl: string;
  apiKey: string;
  fetchFunction?: FetchFunction;
  maxOutputTokens: number;
  model: string;
  temperature: number;
  timeoutMilliseconds: number;
}

interface GroqResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  usage?: {
    completion_tokens?: number;
    prompt_tokens?: number;
  };
}

export class GroqProvider implements StructuredModelProvider {
  readonly name = 'groq' as const;
  readonly model: string;

  private readonly apiBaseUrl: string;
  private readonly apiKey: string;
  private readonly fetchFunction: FetchFunction;
  private readonly maxOutputTokens: number;
  private readonly temperature: number;
  private readonly timeoutMilliseconds: number;

  constructor(options: GroqProviderOptions) {
    this.apiBaseUrl = options.apiBaseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.fetchFunction = options.fetchFunction ?? globalThis.fetch;
    this.maxOutputTokens = options.maxOutputTokens;
    this.model = options.model;
    this.temperature = options.temperature;
    this.timeoutMilliseconds = options.timeoutMilliseconds;
  }

  async generate<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationResult<T>> {
    const response = await fetchWithDeadline(
      this.fetchFunction,
      `${this.apiBaseUrl}/chat/completions`,
      {
        body: JSON.stringify({
          max_completion_tokens: this.maxOutputTokens,
          messages: [
            { content: request.systemPrompt, role: 'system' },
            { content: request.userPrompt, role: 'user' },
          ],
          model: this.model,
          response_format: {
            json_schema: {
              name: request.schemaName,
              schema: schemaWithoutDialect(request.jsonSchema),
              strict: false,
            },
            type: 'json_schema',
          },
          temperature: this.temperature,
        }),
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      },
      this.timeoutMilliseconds,
      this.name,
    );

    if (!response.ok) {
      throw createHttpProviderError(this.name, response.status);
    }

    const payload = (await response.json()) as GroqResponse;
    const rawText = payload.choices?.[0]?.message?.content?.trim() ?? '';

    if (!rawText) {
      throw createHttpProviderError(this.name, 502);
    }

    return {
      rawText,
      usage: {
        inputTokens: payload.usage?.prompt_tokens ?? 0,
        outputTokens: payload.usage?.completion_tokens ?? 0,
      },
      value: parseAndValidateStructuredResponse(rawText, this.name, request.validate),
    };
  }
}
