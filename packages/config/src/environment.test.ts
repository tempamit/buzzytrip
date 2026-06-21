import { describe, expect, it } from 'vitest';

import { parseApiEnvironment, parseWorkerEnvironment } from './environment';

describe('runtime configuration', () => {
  it('applies safe API defaults', () => {
    expect(parseApiEnvironment({})).toEqual({
      DATABASE_URL: 'postgresql://buzzytrip:buzzytrip_local@127.0.0.1:55432/buzzytrip',
      DB_POOL_MAX: 10,
      NODE_ENV: 'development',
      PORT: 4000,
    });
  });

  it('coerces worker values from environment strings', () => {
    expect(
      parseWorkerEnvironment({
        DATABASE_URL: 'postgres://user:password@database:5432/buzzytrip',
        DB_POOL_MAX: '5',
        NODE_ENV: 'test',
        LOG_LEVEL: 'debug',
        WORKER_HEARTBEAT_INTERVAL_MS: '5000',
      }),
    ).toEqual({
      CONTENT_GENERATION_ENABLED: false,
      DATABASE_URL: 'postgres://user:password@database:5432/buzzytrip',
      DB_POOL_MAX: 5,
      GEMINI_API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
      GEMINI_DAILY_REQUEST_LIMIT: 10,
      GEMINI_MODEL: 'gemini-flash-latest',
      GROQ_API_BASE_URL: 'https://api.groq.com/openai/v1',
      GROQ_DAILY_REQUEST_LIMIT: 10,
      GROQ_MODEL: 'openai/gpt-oss-20b',
      NODE_ENV: 'test',
      LOG_LEVEL: 'debug',
      MODEL_MAX_OUTPUT_TOKENS: 8192,
      MODEL_MAX_SOURCE_CHARACTERS: 60000,
      MODEL_PROVIDER_ORDER: ['gemini', 'groq'],
      MODEL_REQUEST_TIMEOUT_MS: 90000,
      MODEL_TEMPERATURE: 0.35,
      WORKER_HEARTBEAT_INTERVAL_MS: 5000,
    });
  });

  it('rejects invalid ports', () => {
    expect(() => parseApiEnvironment({ PORT: '70000' })).toThrow();
  });

  it('requires an explicit database URL in production', () => {
    expect(() => parseApiEnvironment({ NODE_ENV: 'production' })).toThrow(
      'DATABASE_URL must be set explicitly in production.',
    );
  });

  it('keeps content generation disabled by default and parses false safely', () => {
    expect(parseWorkerEnvironment({ CONTENT_GENERATION_ENABLED: 'false' })).toMatchObject({
      CONTENT_GENERATION_ENABLED: false,
      MODEL_PROVIDER_ORDER: ['gemini', 'groq'],
    });
  });

  it('requires a provider key only when generation is enabled', () => {
    expect(() => parseWorkerEnvironment({ CONTENT_GENERATION_ENABLED: 'true' })).toThrow(
      'At least one provider API key is required',
    );

    expect(
      parseWorkerEnvironment({
        CONTENT_GENERATION_ENABLED: 'true',
        GEMINI_API_KEY: 'test-gemini-key',
        MODEL_PROVIDER_ORDER: 'groq,gemini',
      }),
    ).toMatchObject({
      CONTENT_GENERATION_ENABLED: true,
      GEMINI_API_KEY: 'test-gemini-key',
      MODEL_PROVIDER_ORDER: ['groq', 'gemini'],
    });
  });
});
