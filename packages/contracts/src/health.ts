import { z } from 'zod';

export const serviceNameSchema = z.enum(['web', 'api', 'worker']);

export const serviceHealthSchema = z.object({
  service: serviceNameSchema,
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
});

export type ServiceName = z.infer<typeof serviceNameSchema>;
export type ServiceHealth = z.infer<typeof serviceHealthSchema>;

export function createServiceHealth(service: ServiceName, now = new Date()): ServiceHealth {
  return serviceHealthSchema.parse({
    service,
    status: 'ok',
    timestamp: now.toISOString(),
  });
}
