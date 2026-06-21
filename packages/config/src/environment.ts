import { z } from 'zod';

const nodeEnvironmentSchema = z.enum(['development', 'test', 'production']);
const logLevelSchema = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);
const localDatabaseUrl = 'postgresql://buzzytrip:buzzytrip_local@127.0.0.1:55432/buzzytrip';

const environmentBooleanSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return value;
}, z.boolean());

const optionalApiKeySchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(10).optional(),
);

const modelProviderOrderSchema = z
  .string()
  .default('gemini,groq')
  .transform((value) => value.split(',').map((provider) => provider.trim().toLowerCase()))
  .pipe(
    z
      .array(z.enum(['gemini', 'groq']))
      .min(1)
      .max(2),
  )
  .refine((providers) => new Set(providers).size === providers.length, {
    message: 'MODEL_PROVIDER_ORDER cannot contain duplicate providers.',
  });

const databaseEnvironmentShape = {
  DATABASE_URL: z
    .string()
    .refine((value) => value.startsWith('postgresql://') || value.startsWith('postgres://'), {
      message: 'DATABASE_URL must be a PostgreSQL connection string.',
    })
    .default(localDatabaseUrl),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
};

const apiEnvironmentSchema = z.object({
  ...databaseEnvironmentShape,
  NODE_ENV: nodeEnvironmentSchema.default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
});

const workerEnvironmentSchema = z
  .object({
    ...databaseEnvironmentShape,
    CONTENT_GENERATION_ENABLED: environmentBooleanSchema.default(false),
    GEMINI_API_BASE_URL: z
      .string()
      .url()
      .default('https://generativelanguage.googleapis.com/v1beta'),
    GEMINI_API_KEY: optionalApiKeySchema,
    GEMINI_DAILY_REQUEST_LIMIT: z.coerce.number().int().min(1).max(500).default(10),
    GEMINI_MODEL: z.string().trim().min(2).default('gemini-flash-latest'),
    GROQ_API_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
    GROQ_API_KEY: optionalApiKeySchema,
    GROQ_DAILY_REQUEST_LIMIT: z.coerce.number().int().min(1).max(500).default(10),
    GROQ_MODEL: z.string().trim().min(2).default('openai/gpt-oss-20b'),
    LOG_LEVEL: logLevelSchema.default('info'),
    MODEL_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(1_024).max(32_768).default(8_192),
    MODEL_MAX_SOURCE_CHARACTERS: z.coerce.number().int().min(1_000).max(200_000).default(60_000),
    MODEL_PROVIDER_ORDER: modelProviderOrderSchema,
    MODEL_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(180_000).default(90_000),
    MODEL_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.35),
    NODE_ENV: nodeEnvironmentSchema.default('development'),
    WORKER_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().min(1_000).default(30_000),
  })
  .superRefine((environment, context) => {
    if (
      environment.CONTENT_GENERATION_ENABLED &&
      !environment.GEMINI_API_KEY &&
      !environment.GROQ_API_KEY
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'At least one provider API key is required when CONTENT_GENERATION_ENABLED is true.',
        path: ['CONTENT_GENERATION_ENABLED'],
      });
    }
  });

export type ApiEnvironment = z.infer<typeof apiEnvironmentSchema>;
export type WorkerEnvironment = z.infer<typeof workerEnvironmentSchema>;

export function parseApiEnvironment(input: Record<string, unknown>): ApiEnvironment {
  const environment = apiEnvironmentSchema.parse(input);
  assertExplicitProductionDatabase(input, environment.NODE_ENV);
  return environment;
}

export function parseWorkerEnvironment(input: Record<string, unknown>): WorkerEnvironment {
  const environment = workerEnvironmentSchema.parse(input);
  assertExplicitProductionDatabase(input, environment.NODE_ENV);
  return environment;
}

function assertExplicitProductionDatabase(
  input: Record<string, unknown>,
  nodeEnvironment: z.infer<typeof nodeEnvironmentSchema>,
): void {
  if (nodeEnvironment === 'production' && typeof input.DATABASE_URL !== 'string') {
    throw new Error('DATABASE_URL must be set explicitly in production.');
  }
}
