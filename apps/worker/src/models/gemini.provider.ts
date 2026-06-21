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

interface GeminiProviderOptions {
  apiBaseUrl: string;
  apiKey: string;
  fetchFunction?: FetchFunction;
  maxOutputTokens: number;
  model: string;
  temperature: number;
  timeoutMilliseconds: number;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    candidatesTokenCount?: number;
    promptTokenCount?: number;
  };
}

export class GeminiProvider implements StructuredModelProvider {
  readonly name = 'gemini' as const;
  readonly model: string;

  private readonly apiBaseUrl: string;
  private readonly apiKey: string;
  private readonly fetchFunction: FetchFunction;
  private readonly maxOutputTokens: number;
  private readonly temperature: number;
  private readonly timeoutMilliseconds: number;

  constructor(options: GeminiProviderOptions) {
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
    const url = `${this.apiBaseUrl}/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const response = await fetchWithDeadline(
      this.fetchFunction,
      url,
      {
        body: JSON.stringify({
          contents: [{ parts: [{ text: request.userPrompt }], role: 'user' }],
          generationConfig: {
            maxOutputTokens: this.maxOutputTokens,
            responseJsonSchema: schemaWithoutDialect(request.jsonSchema),
            responseMimeType: 'application/json',
            temperature: this.temperature,
          },
          systemInstruction: { parts: [{ text: request.systemPrompt }] },
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      },
      this.timeoutMilliseconds,
      this.name,
    );

    if (!response.ok) {
      throw createHttpProviderError(this.name, response.status);
    }

    const payload = (await response.json()) as GeminiResponse;
    const rawText =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('')
        .trim() ?? '';

    if (!rawText) {
      throw createHttpProviderError(this.name, 502);
    }

    return {
      rawText,
      usage: {
        inputTokens: payload.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: payload.usageMetadata?.candidatesTokenCount ?? 0,
      },
      value: parseAndValidateStructuredResponse(rawText, this.name, request.validate),
    };
  }
}
