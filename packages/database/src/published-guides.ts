import {
  publishedGuideDetailSchema,
  publishedGuideSummarySchema,
  type PublishedGuideDetail,
  type PublishedGuideSummary,
} from '@buzzytrip/contracts';
import { and, desc, eq } from 'drizzle-orm';

import type { Database } from './client';
import {
  contentPublications,
  destinationGuides,
  destinations,
  guideRevisionMedia,
  guideRevisionSources,
  guideRevisions,
  mediaAssets,
  researchSources,
} from './schema';

function mapPublishedGuideSummary(row: {
  countryCode: string;
  countryName: string;
  destinationId: string;
  destinationName: string;
  destinationSlug: string;
  destinationType: (typeof destinations.$inferSelect)['destinationType'];
  excerpt: string;
  guideSlug: string;
  publishedAt: Date;
  revisionId: string;
  scope: (typeof destinations.$inferSelect)['scope'];
  stateOrRegion: string | null;
  title: string;
}): PublishedGuideSummary {
  return publishedGuideSummarySchema.parse({
    destination: {
      countryCode: row.countryCode,
      countryName: row.countryName,
      destinationType: row.destinationType,
      id: row.destinationId,
      name: row.destinationName,
      scope: row.scope,
      slug: row.destinationSlug,
      stateOrRegion: row.stateOrRegion,
    },
    excerpt: row.excerpt,
    guideSlug: row.guideSlug,
    id: row.revisionId,
    publishedAt: row.publishedAt.toISOString(),
    title: row.title,
  });
}

function publishedGuideSelection() {
  return {
    content: guideRevisions.content,
    countryCode: destinations.countryCode,
    countryName: destinations.countryName,
    destinationId: destinations.id,
    destinationName: destinations.name,
    destinationSlug: destinations.slug,
    destinationType: destinations.destinationType,
    excerpt: guideRevisions.excerpt,
    guideSlug: destinationGuides.slug,
    publishedAt: contentPublications.publishedAt,
    revisionId: guideRevisions.id,
    scope: destinations.scope,
    seo: guideRevisions.seo,
    stateOrRegion: destinations.stateOrRegion,
    title: guideRevisions.title,
  };
}

export async function listPublishedGuides(
  database: Database,
  limit = 20,
): Promise<PublishedGuideSummary[]> {
  const rows = await database
    .select(publishedGuideSelection())
    .from(contentPublications)
    .innerJoin(destinations, eq(contentPublications.destinationId, destinations.id))
    .innerJoin(destinationGuides, eq(contentPublications.guideId, destinationGuides.id))
    .innerJoin(guideRevisions, eq(contentPublications.revisionId, guideRevisions.id))
    .where(eq(contentPublications.status, 'published'))
    .orderBy(desc(contentPublications.publicationSequence))
    .limit(limit);

  return rows.map(mapPublishedGuideSummary);
}

export async function findPublishedGuideBySlug(
  database: Database,
  guideSlug: string,
): Promise<PublishedGuideDetail | null> {
  const [row] = await database
    .select(publishedGuideSelection())
    .from(contentPublications)
    .innerJoin(destinations, eq(contentPublications.destinationId, destinations.id))
    .innerJoin(destinationGuides, eq(contentPublications.guideId, destinationGuides.id))
    .innerJoin(guideRevisions, eq(contentPublications.revisionId, guideRevisions.id))
    .where(and(eq(contentPublications.status, 'published'), eq(destinationGuides.slug, guideSlug)))
    .limit(1);

  if (!row) {
    return null;
  }

  const [mediaRows, sourceRows] = await Promise.all([
    database
      .select({
        alt: mediaAssets.altText,
        caption: guideRevisionMedia.caption,
        credit: mediaAssets.creditText,
        height: mediaAssets.height,
        role: guideRevisionMedia.role,
        sortOrder: guideRevisionMedia.sortOrder,
        url: mediaAssets.publicUrl,
        width: mediaAssets.width,
      })
      .from(guideRevisionMedia)
      .innerJoin(mediaAssets, eq(guideRevisionMedia.mediaAssetId, mediaAssets.id))
      .where(eq(guideRevisionMedia.revisionId, row.revisionId))
      .orderBy(guideRevisionMedia.sortOrder),
    database
      .select({
        publisher: researchSources.publisher,
        title: researchSources.title,
        url: researchSources.url,
      })
      .from(guideRevisionSources)
      .innerJoin(researchSources, eq(guideRevisionSources.sourceId, researchSources.id))
      .where(eq(guideRevisionSources.revisionId, row.revisionId)),
  ]);

  const uniqueSources = [...new Map(sourceRows.map((source) => [source.url, source])).values()];

  return publishedGuideDetailSchema.parse({
    ...mapPublishedGuideSummary(row),
    content: row.content,
    media: mediaRows.map((media) => ({
      alt: media.alt,
      caption: media.caption,
      credit: media.credit,
      height: media.height,
      role: media.role,
      url: media.url,
      width: media.width,
    })),
    seo: row.seo,
    sources: uniqueSources,
  });
}
