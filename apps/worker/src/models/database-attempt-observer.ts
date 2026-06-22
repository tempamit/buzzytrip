import {
  completeModelGenerationAttempt,
  startModelGenerationAttempt,
  type Database,
} from '@buzzytrip/database';

import type { GenerationAttemptObserver } from './generation-coordinator';

export class DatabaseGenerationAttemptObserver implements GenerationAttemptObserver {
  constructor(private readonly database: Database) {}

  complete(
    attemptId: string,
    outcome: Parameters<GenerationAttemptObserver['complete']>[1],
  ): Promise<void> {
    return completeModelGenerationAttempt(this.database, attemptId, outcome);
  }

  start(input: Parameters<GenerationAttemptObserver['start']>[0]): Promise<string> {
    return startModelGenerationAttempt(this.database, input);
  }
}
