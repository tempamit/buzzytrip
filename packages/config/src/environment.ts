import { z } from 'zod';

const nodeEnvironmentSchema = z.enum(['development', 'test', 'production']);
const logLevelSchema = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);
const localDatabaseUrl = 'postgresql://buzzytrip:buzzytrip_local@127.0.0.1:55432/buzzytrip';

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

const workerEnvironmentSchema = z.object({
  ...databaseEnvironmentShape,
  NODE_ENV: nodeEnvironmentSchema.default('development'),
  LOG_LEVEL: logLevelSchema.default('info'),
  WORKER_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().min(1_000).default(30_000),
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
