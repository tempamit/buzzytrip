import type { ModelProviderName } from '@buzzytrip/contracts';
import {
  recordDailyModelTokenUsage,
  reserveDailyModelRequest,
  type Database,
} from '@buzzytrip/database';

import type { ModelTokenUsage } from './provider';

export interface ModelUsageBudget {
  record(provider: ModelProviderName, usage: ModelTokenUsage): Promise<void>;
  reserve(provider: ModelProviderName, dailyRequestLimit: number): Promise<boolean>;
}

export class PersistentModelUsageBudget implements ModelUsageBudget {
  constructor(private readonly database: Database) {}

  async record(provider: ModelProviderName, usage: ModelTokenUsage): Promise<void> {
    await recordDailyModelTokenUsage(this.database, provider, usage);
  }

  async reserve(provider: ModelProviderName, dailyRequestLimit: number): Promise<boolean> {
    return (await reserveDailyModelRequest(this.database, provider, dailyRequestLimit)) !== null;
  }
}
