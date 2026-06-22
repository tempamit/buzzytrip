import { describe, expect, it, vi } from 'vitest';

import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import { ModelProviderError, type StructuredGenerationRequest } from './provider';

interface TestPayload {
  answer: string;
}

const request: StructuredGenerationRequest<TestPayload> = {
  jsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    properties: { answer: { type: 'string' } },
    required: ['answer'],
    type: 'object',
  },
  schemaName: 'test_payload',
  systemPrompt: 'Return a structured answer.',
  userPrompt: 'What is the answer?',
  validate(value) {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('answer' in value) ||
      typeof value.answer !== 'string'
    ) {
      throw new Error('invalid');
    }
    return { answer: value.answer };
  },
};

describe('structured model providers', () => {
  it('sends Gemini a JSON schema and validates its response', async () => {
    const fetchFunction = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"answer":"Gemini"}' }] } }],
          usageMetadata: { candidatesTokenCount: 4, promptTokenCount: 8 },
        }),
        { status: 200 },
      ),
    );
    const provider = new GeminiProvider({
      apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: 'test-gemini-key',
      fetchFunction,
      maxOutputTokens: 2048,
      model: 'gemini-flash-latest',
      temperature: 0.35,
      timeoutMilliseconds: 5000,
    });

    await expect(provider.generate(request)).resolves.toMatchObject({
      usage: { inputTokens: 8, outputTokens: 4 },
      value: { answer: 'Gemini' },
    });

    const requestBody = JSON.parse(fetchFunction.mock.calls[0]?.[1]?.body as string);
    expect(requestBody.generationConfig).toMatchObject({
      responseMimeType: 'application/json',
    });
    expect(requestBody.generationConfig.responseJsonSchema.$schema).toBeUndefined();
  });

  it('sends Groq a JSON-schema response format and validates its response', async () => {
    const fetchFunction = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"answer":"Groq"}' } }],
          usage: { completion_tokens: 3, prompt_tokens: 7 },
        }),
        { status: 200 },
      ),
    );
    const provider = new GroqProvider({
      apiBaseUrl: 'https://api.groq.com/openai/v1',
      apiKey: 'test-groq-key',
      fetchFunction,
      maxOutputTokens: 2048,
      model: 'openai/gpt-oss-20b',
      temperature: 0.35,
      timeoutMilliseconds: 5000,
    });

    await expect(provider.generate(request)).resolves.toMatchObject({
      usage: { inputTokens: 7, outputTokens: 3 },
      value: { answer: 'Groq' },
    });

    const requestBody = JSON.parse(fetchFunction.mock.calls[0]?.[1]?.body as string);
    expect(requestBody.response_format).toMatchObject({
      json_schema: { name: 'test_payload', strict: false },
      type: 'json_schema',
    });
  });

  it('classifies rate limits as retryable without returning provider response bodies', async () => {
    const provider = new GroqProvider({
      apiBaseUrl: 'https://api.groq.com/openai/v1',
      apiKey: 'test-groq-key',
      fetchFunction: vi.fn().mockResolvedValue(new Response('account details', { status: 429 })),
      maxOutputTokens: 2048,
      model: 'openai/gpt-oss-20b',
      temperature: 0.35,
      timeoutMilliseconds: 5000,
    });

    const error = await provider.generate(request).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ModelProviderError);
    expect(error).toMatchObject({ code: 'rate_limited', retryable: true, status: 429 });
    expect((error as Error).message).not.toContain('account details');
  });

  it('keeps the model deadline active while reading a stalled response body', async () => {
    const fetchFunction = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      const body = new ReadableStream({
        start(controller) {
          init?.signal?.addEventListener('abort', () => {
            controller.error(new DOMException('Aborted', 'AbortError'));
          });
        },
      });
      return Promise.resolve(new Response(body, { status: 200 }));
    });
    const provider = new GroqProvider({
      apiBaseUrl: 'https://api.groq.com/openai/v1',
      apiKey: 'test-groq-key',
      fetchFunction,
      maxOutputTokens: 2048,
      model: 'openai/gpt-oss-20b',
      temperature: 0.35,
      timeoutMilliseconds: 10,
    });

    const error = await provider.generate(request).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ModelProviderError);
    expect(error).toMatchObject({ code: 'timeout' });
  });
});
