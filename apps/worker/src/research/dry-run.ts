import { parseWorkerEnvironment } from '@buzzytrip/config';

import { findMvpGuideProfile } from '../content/mvp-batch';
import { collectDestinationResearch } from './collect';

function destinationArgument(arguments_: string[]): string {
  const inline = arguments_.find((argument) => argument.startsWith('--destination='));
  if (inline) return inline.slice('--destination='.length);
  const index = arguments_.indexOf('--destination');
  return index >= 0 ? (arguments_[index + 1] ?? '') : 'udaipur';
}

async function run(): Promise<void> {
  const environment = parseWorkerEnvironment(process.env);
  const destinationSlug = destinationArgument(process.argv.slice(2));
  const profile = findMvpGuideProfile(destinationSlug);
  if (!profile) throw new Error(`Unknown MVP destination: ${destinationSlug}`);

  const bundle = await collectDestinationResearch(profile, {
    maximumBytes: environment.RESEARCH_MAX_SOURCE_BYTES,
    timeoutMilliseconds: environment.RESEARCH_REQUEST_TIMEOUT_MS,
    userAgent: environment.RESEARCH_USER_AGENT,
  });

  console.log(
    JSON.stringify({
      destination: profile.destinationSlug,
      evidenceCharacters: bundle.quality.evidenceCharacters,
      issues: bundle.quality.issues.map((issue) => issue.code),
      passed: bundle.quality.passed,
      sources: bundle.sources.map((source) => ({
        evidenceFacts: source.facts.length,
        publisher: source.publisher,
        type: source.sourceType,
        url: source.url,
      })),
    }),
  );

  if (!bundle.quality.passed) process.exitCode = 1;
}

void run();
