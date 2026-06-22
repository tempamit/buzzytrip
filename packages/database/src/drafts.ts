import type {
  GeneratedDestinationGuide,
  GuideEvidenceSection,
  ModelProviderName,
} from '@buzzytrip/contracts';
import { and, desc, eq, max, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';

import type { Database } from './client';
import type { PersistedResearchSource } from './research';
import {
  destinationGuides,
  destinations,
  guideRevisionMedia,
  guideRevisionSources,
  guideRevisions,
  mediaAssets,
  modelGenerationAttempts,
} from './schema';

export interface GuideGenerationContext {
  countryName: string;
  destinationId: string;
  destinationName: string;
  previousTitles: string[];
  priorGuideTexts: string[];
}

export interface DraftMediaInput {
  altText: string;
  checksum: string;
  creditText: string;
  creditUrl: string;
  externalId: string;
  height: number;
  license: string;
  licenseUrl: string;
  publicUrl: string;
  sourceUrl: string;
  width: number;
}

export interface PersistGeneratedDraftInput {
  audiences: string[];
  contentAngle: string;
  destinationSlug: string;
  generated: GeneratedDestinationGuide;
  generationAttemptId?: string;
  guideSlug: string;
  media: DraftMediaInput[];
  modelName: string;
  modelProvider: ModelProviderName;
  promptVersion: string;
  qualityPassed: boolean;
  qualityReport: Record<string, unknown>;
  sources: PersistedResearchSource[];
  tripTheme: string;
}

export interface PersistedGuideDraft {
  created: boolean;
  guideId: string;
  revisionId: string;
  revisionNumber: number;
}

function fingerprintGuide(guide: GeneratedDestinationGuide): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        content: guide.content,
        excerpt: guide.excerpt,
        seo: guide.seo,
        title: guide.title,
      }),
    )
    .digest('hex');
}

export async function loadGuideGenerationContext(
  database: Database,
  destinationSlug: string,
): Promise<GuideGenerationContext | null> {
  const [destination] = await database
    .select({
      countryName: destinations.countryName,
      destinationId: destinations.id,
      destinationName: destinations.name,
    })
    .from(destinations)
    .where(and(eq(destinations.slug, destinationSlug), eq(destinations.status, 'active')))
    .limit(1);
  if (!destination) return null;

  const revisions = await database
    .select({
      content: guideRevisions.content,
      excerpt: guideRevisions.excerpt,
      title: guideRevisions.title,
    })
    .from(guideRevisions)
    .innerJoin(destinationGuides, eq(guideRevisions.guideId, destinationGuides.id))
    .where(eq(destinationGuides.destinationId, destination.destinationId))
    .orderBy(desc(guideRevisions.createdAt));

  return {
    ...destination,
    previousTitles: revisions.map((revision) => revision.title),
    priorGuideTexts: revisions.map((revision) =>
      JSON.stringify({
        content: revision.content,
        excerpt: revision.excerpt,
        title: revision.title,
      }),
    ),
  };
}

export async function persistGeneratedGuideDraft(
  database: Database,
  input: PersistGeneratedDraftInput,
): Promise<PersistedGuideDraft> {
  if (!input.qualityPassed)
    throw new Error('A quality-rejected guide cannot be persisted as ready.');
  if (input.sources.length < 3) throw new Error('A ready guide requires at least three sources.');
  if (input.media.length < 1) throw new Error('A ready guide requires at least one image.');

  for (const sourceUse of input.generated.sourceUses) {
    if (!input.sources[sourceUse.sourceIndex]) {
      throw new Error(
        `Generated guide references an unknown source index: ${sourceUse.sourceIndex}`,
      );
    }
  }

  const contentFingerprint = fingerprintGuide(input.generated);
  return database.transaction(async (transaction) => {
    const [existing] = await transaction
      .select({
        guideId: guideRevisions.guideId,
        revisionId: guideRevisions.id,
        revisionNumber: guideRevisions.revisionNumber,
      })
      .from(guideRevisions)
      .where(eq(guideRevisions.contentFingerprint, contentFingerprint))
      .limit(1);
    if (existing) return { ...existing, created: false };

    const [destination] = await transaction
      .select({ id: destinations.id })
      .from(destinations)
      .where(and(eq(destinations.slug, input.destinationSlug), eq(destinations.status, 'active')))
      .limit(1);
    if (!destination) throw new Error(`Active destination not found: ${input.destinationSlug}`);

    const [guide] = await transaction
      .insert(destinationGuides)
      .values({
        audiences: input.audiences,
        contentAngle: input.contentAngle,
        destinationId: destination.id,
        slug: input.guideSlug,
        tripTheme: input.tripTheme,
      })
      .onConflictDoUpdate({
        set: {
          audiences: input.audiences,
          contentAngle: input.contentAngle,
          tripTheme: input.tripTheme,
          updatedAt: new Date(),
        },
        target: destinationGuides.slug,
      })
      .returning({ id: destinationGuides.id });
    if (!guide) throw new Error('Guide upsert did not return an identifier.');

    const [revisionMaximum] = await transaction
      .select({ value: max(guideRevisions.revisionNumber) })
      .from(guideRevisions)
      .where(eq(guideRevisions.guideId, guide.id));
    const revisionNumber = (revisionMaximum?.value ?? 0) + 1;
    const [revision] = await transaction
      .insert(guideRevisions)
      .values({
        content: input.generated.content,
        contentFingerprint,
        excerpt: input.generated.excerpt,
        guideId: guide.id,
        modelName: input.modelName,
        modelProvider: input.modelProvider,
        promptVersion: input.promptVersion,
        qualityReport: input.qualityReport,
        revisionNumber,
        seo: input.generated.seo,
        status: 'ready',
        title: input.generated.title,
      })
      .returning({ id: guideRevisions.id });
    if (!revision) throw new Error('Revision insert did not return an identifier.');

    const sourceLinks = input.generated.sourceUses.flatMap((sourceUse) => {
      const source = input.sources[sourceUse.sourceIndex];
      if (!source) return [];
      return sourceUse.sectionKeys.map((sectionKey: GuideEvidenceSection) => ({
        claimSummary: sourceUse.claimSummary,
        revisionId: revision.id,
        sectionKey,
        sourceId: source.id,
      }));
    });
    await transaction.insert(guideRevisionSources).values(sourceLinks);

    const persistedMedia = await transaction
      .insert(mediaAssets)
      .values(
        input.media.map((media) => ({
          ...media,
          provider: 'unsplash',
          storageKey: `unsplash/${media.externalId}`,
        })),
      )
      .onConflictDoUpdate({
        set: {
          altText: sql`excluded.alt_text`,
          checksum: sql`excluded.checksum`,
          creditText: sql`excluded.credit_text`,
          creditUrl: sql`excluded.credit_url`,
          height: sql`excluded.height`,
          license: sql`excluded.license`,
          licenseUrl: sql`excluded.license_url`,
          publicUrl: sql`excluded.public_url`,
          sourceUrl: sql`excluded.source_url`,
          width: sql`excluded.width`,
        },
        target: [mediaAssets.provider, mediaAssets.externalId],
      })
      .returning({ externalId: mediaAssets.externalId, id: mediaAssets.id });
    const mediaIds = new Map(persistedMedia.map((media) => [media.externalId, media.id]));
    await transaction.insert(guideRevisionMedia).values(
      input.media.map((media, index) => {
        const mediaAssetId = mediaIds.get(media.externalId);
        if (!mediaAssetId) throw new Error(`Media upsert is missing: ${media.externalId}`);
        return {
          mediaAssetId,
          revisionId: revision.id,
          role: index === 0 ? ('hero' as const) : ('gallery' as const),
          sortOrder: index === 0 ? 0 : index - 1,
        };
      }),
    );

    if (input.generationAttemptId) {
      await transaction
        .update(modelGenerationAttempts)
        .set({ guideRevisionId: revision.id })
        .where(eq(modelGenerationAttempts.id, input.generationAttemptId));
    }

    return {
      created: true,
      guideId: guide.id,
      revisionId: revision.id,
      revisionNumber,
    };
  });
}
