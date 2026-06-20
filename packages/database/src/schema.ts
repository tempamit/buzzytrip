import { sql } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const serviceHeartbeats = pgTable('service_heartbeats', {
  service: varchar('service', { length: 32 }).primaryKey(),
  status: varchar('status', { length: 24 }).notNull().default('ok'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb('metadata')
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
});

export const systemSettings = pgTable('system_settings', {
  key: varchar('key', { length: 120 }).primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const databaseSchema = {
  serviceHeartbeats,
  systemSettings,
};
