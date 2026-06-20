import { z } from 'zod';

const nodeEnvironmentSchema = z.enum(['development', 'test', 'production']);
const logLevelSchema = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

const apiEnvironmentSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema.default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
});

const workerEnvironmentSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema.default('development'),
  LOG_LEVEL: logLevelSchema.default('info'),
  WORKER_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().min(1_000).default(30_000),
});

export type ApiEnvironment = z.infer<typeof apiEnvironmentSchema>;
export type WorkerEnvironment = z.infer<typeof workerEnvironmentSchema>;

export function parseApiEnvironment(input: Record<string, unknown>): ApiEnvironment {
  return apiEnvironmentSchema.parse(input);
}

export function parseWorkerEnvironment(input: Record<string, unknown>): WorkerEnvironment {
  return workerEnvironmentSchema.parse(input);
}
