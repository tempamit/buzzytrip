import type { ModelProviderName } from '@buzzytrip/contracts';
import { and, eq, lt, sql } from 'drizzle-orm';

import type { Database } from './client';
import { modelUsageDaily } from './schema';

export interface ModelUsageReservation {
  provider: ModelProviderName;
  requestCount: number;
  usageDate: string;
}

export interface ModelTokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export function toUtcUsageDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export async function reserveDailyModelRequest(
  database: Database,
  provider: ModelProviderName,
  dailyRequestLimit: number,
  now = new Date(),
): Promise<ModelUsageReservation | null> {
  if (!Number.isInteger(dailyRequestLimit) || dailyRequestLimit < 1) {
    throw new Error('dailyRequestLimit must be a positive integer');
  }

  const usageDate = toUtcUsageDate(now);
  const [reservation] = await database
    .insert(modelUsageDaily)
    .values({
      provider,
      requestCount: 1,
      updatedAt: now,
      usageDate,
    })
    .onConflictDoUpdate({
      set: {
        requestCount: sql`${modelUsageDaily.requestCount} + 1`,
        updatedAt: now,
      },
      setWhere: lt(modelUsageDaily.requestCount, dailyRequestLimit),
      target: [modelUsageDaily.provider, modelUsageDaily.usageDate],
    })
    .returning({
      provider: modelUsageDaily.provider,
      requestCount: modelUsageDaily.requestCount,
      usageDate: modelUsageDaily.usageDate,
    });

  return reservation ?? null;
}

export async function recordDailyModelTokenUsage(
  database: Database,
  provider: ModelProviderName,
  usage: ModelTokenUsage,
  now = new Date(),
): Promise<void> {
  if (
    !Number.isInteger(usage.inputTokens) ||
    usage.inputTokens < 0 ||
    !Number.isInteger(usage.outputTokens) ||
    usage.outputTokens < 0
  ) {
    throw new Error('Model token usage must contain non-negative integers');
  }

  await database
    .update(modelUsageDaily)
    .set({
      inputTokens: sql`${modelUsageDaily.inputTokens} + ${usage.inputTokens}`,
      outputTokens: sql`${modelUsageDaily.outputTokens} + ${usage.outputTokens}`,
      updatedAt: now,
    })
    .where(
      and(
        eq(modelUsageDaily.provider, provider),
        eq(modelUsageDaily.usageDate, toUtcUsageDate(now)),
      ),
    );
}
