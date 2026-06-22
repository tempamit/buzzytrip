import { parseWorkerEnvironment } from '@buzzytrip/config';
import {
  createDatabase,
  createDatabasePool,
  loadGuideGenerationContext,
  persistGeneratedGuideDraft,
  upsertResearchSourceRecords,
} from '@buzzytrip/database';
import { URL } from 'node:url';

import { discoverUnsplashImages, trackUnsplashDownload } from '../media/unsplash';
import { DatabaseGenerationAttemptObserver } from '../models/database-attempt-observer';
import { GenerationCoordinator } from '../models/generation-coordinator';
import { createConfiguredModelProviders } from '../models/provider-factory';
import { PersistentModelUsageBudget } from '../models/usage-budget';
import { collectDestinationResearch } from '../research/collect';
import { generateDestinationGuide } from './generate-guide';
import { findMvpGuideProfile } from './mvp-batch';
import { DESTINATION_GUIDE_PROMPT_VERSION } from './prompt';

function argumentValue(arguments_: string[], name: string, fallback: string): string {
  const inline = arguments_.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = arguments_.indexOf(name);
  return index >= 0 ? (arguments_[index + 1] ?? '') : fallback;
}

async function run(): Promise<void> {
  const arguments_ = process.argv.slice(2);
  if (!arguments_.includes('--execute')) {
    throw new Error('Generation requires the explicit --execute flag.');
  }

  const environment = parseWorkerEnvironment(process.env);
  const parsedDatabaseUrl = new URL(environment.DATABASE_URL);
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsedDatabaseUrl.hostname)) {
    throw new Error('The MVP generation command is restricted to a local database.');
  }
  const destinationSlug = argumentValue(arguments_, '--destination', 'udaipur');
  const profile = findMvpGuideProfile(destinationSlug);
  if (!profile) throw new Error(`Unknown MVP destination: ${destinationSlug}`);
  if (!environment.UNSPLASH_ACCESS_KEY) throw new Error('UNSPLASH_ACCESS_KEY is not configured.');

  const pool = createDatabasePool(environment.DATABASE_URL, 'buzzytrip-mvp-generation', 3);
  const database = createDatabase(pool);

  try {
    const context = await loadGuideGenerationContext(database, destinationSlug);
    if (!context) throw new Error(`Seeded destination is missing: ${destinationSlug}`);

    const research = await collectDestinationResearch(profile, {
      maximumBytes: environment.RESEARCH_MAX_SOURCE_BYTES,
      timeoutMilliseconds: environment.RESEARCH_REQUEST_TIMEOUT_MS,
      userAgent: environment.RESEARCH_USER_AGENT,
    });
    if (!research.quality.passed) {
      throw new Error(
        `Research quality failed: ${research.quality.issues.map((issue) => issue.code).join(', ')}`,
      );
    }
    const persistedSources = await upsertResearchSourceRecords(
      database,
      research.sources.map((source) => ({
        contentHash: source.contentHash,
        fetchedAt: source.fetchedAt,
        notes: `Automated evidence extraction: ${source.facts.length} bounded facts; source body not retained.`,
        publisher: source.publisher,
        sourceType: source.sourceType,
        title: source.title,
        url: source.url,
      })),
    );
    const sourceIdByUrl = new Map(persistedSources.map((source) => [source.url, source.id]));
    const orderedSources = research.sources.map((source) => {
      const id = sourceIdByUrl.get(source.url);
      if (!id) throw new Error(`Persisted research source is missing: ${source.url}`);
      return { id, url: source.url };
    });

    const configuredProviders = createConfiguredModelProviders(environment, undefined, {
      ignoreEnabled: true,
    });
    if (configuredProviders.length === 0) throw new Error('No model API key is configured.');
    const coordinator = new GenerationCoordinator(
      configuredProviders,
      new PersistentModelUsageBudget(database),
      new DatabaseGenerationAttemptObserver(database),
    );
    const generation = await generateDestinationGuide(coordinator, {
      audiences: profile.audiences,
      canonicalPath: `/destinations/${profile.guideSlug}`,
      contentAngle: profile.contentAngle,
      countryName: context.countryName,
      destinationId: context.destinationId,
      destinationName: context.destinationName,
      evidence: research.sources.map((source) => ({
        facts: source.facts,
        publisher: source.publisher,
        title: source.title,
        url: source.url,
      })),
      maximumSourceCharacters: environment.MODEL_MAX_SOURCE_CHARACTERS,
      previousTitles: context.previousTitles,
      primaryKeyword: profile.primaryKeyword,
      priorGuideTexts: context.priorGuideTexts,
      tripTheme: profile.tripTheme,
    });

    const images = await discoverUnsplashImages({
      accessKey: environment.UNSPLASH_ACCESS_KEY,
      apiBaseUrl: environment.UNSPLASH_API_BASE_URL,
      applicationName: environment.UNSPLASH_APPLICATION_NAME,
      count: environment.UNSPLASH_IMAGES_PER_GUIDE,
      query: profile.imageQuery,
      timeoutMilliseconds: environment.RESEARCH_REQUEST_TIMEOUT_MS,
    });
    await Promise.all(
      images.map((image) =>
        trackUnsplashDownload(image, {
          accessKey: environment.UNSPLASH_ACCESS_KEY!,
          timeoutMilliseconds: environment.RESEARCH_REQUEST_TIMEOUT_MS,
        }),
      ),
    );

    const draft = await persistGeneratedGuideDraft(database, {
      audiences: profile.audiences,
      contentAngle: profile.contentAngle,
      destinationSlug,
      generated: generation.result.value,
      ...(generation.attemptId ? { generationAttemptId: generation.attemptId } : {}),
      guideSlug: profile.guideSlug,
      media: images.map((image) => ({
        altText: image.altText,
        checksum: image.checksum,
        creditText: image.creditText,
        creditUrl: image.creditUrl,
        externalId: image.externalId,
        height: image.height,
        license: image.license,
        licenseUrl: image.licenseUrl,
        publicUrl: image.publicUrl,
        sourceUrl: image.sourceUrl,
        width: image.width,
      })),
      modelName: generation.model,
      modelProvider: generation.provider,
      promptVersion: DESTINATION_GUIDE_PROMPT_VERSION,
      qualityPassed: generation.quality.passed,
      qualityReport: JSON.parse(JSON.stringify(generation.quality)) as Record<string, unknown>,
      sources: orderedSources,
      tripTheme: profile.tripTheme,
    });

    console.log(
      JSON.stringify({
        created: draft.created,
        destination: destinationSlug,
        images: images.length,
        model: generation.model,
        provider: generation.provider,
        quality: generation.quality.metrics,
        revisionNumber: draft.revisionNumber,
        sources: research.sources.length,
        status: 'ready_not_published',
        title: generation.result.value.title,
      }),
    );
  } finally {
    await pool.end();
  }
}

void run();
