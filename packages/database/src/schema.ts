import type {
  DestinationGuideContent,
  DestinationGuideSeo,
  DestinationScope,
  DestinationStatus,
  DestinationType,
  GuideRevisionStatus,
  GuideStatus,
  TrendCandidateStatus,
} from '@buzzytrip/contracts';
import { sql } from 'drizzle-orm';
import {
  bigserial,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

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

export const destinations = pgTable(
  'destinations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 160 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    countryCode: varchar('country_code', { length: 2 }).notNull(),
    countryName: varchar('country_name', { length: 100 }).notNull(),
    scope: varchar('scope', { length: 20 }).$type<DestinationScope>().notNull(),
    destinationType: varchar('destination_type', { length: 32 }).$type<DestinationType>().notNull(),
    stateOrRegion: varchar('state_or_region', { length: 120 }),
    status: varchar('status', { length: 16 })
      .$type<DestinationStatus>()
      .notNull()
      .default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('destinations_slug_unique').on(table.slug),
    index('destinations_scope_status_idx').on(table.scope, table.status),
    check('destinations_country_code_check', sql`char_length(${table.countryCode}) = 2`),
    check('destinations_scope_check', sql`${table.scope} in ('india', 'international')`),
  ],
);

export const destinationAliases = pgTable(
  'destination_aliases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    destinationId: uuid('destination_id')
      .notNull()
      .references(() => destinations.id, { onDelete: 'cascade' }),
    normalizedAlias: varchar('normalized_alias', { length: 180 }).notNull(),
    locale: varchar('locale', { length: 12 }).notNull().default('en'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('destination_aliases_destination_alias_locale_unique').on(
      table.destinationId,
      table.normalizedAlias,
      table.locale,
    ),
    index('destination_aliases_lookup_idx').on(table.normalizedAlias),
  ],
);

export const trendCandidates = pgTable(
  'trend_candidates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    destinationId: uuid('destination_id').references(() => destinations.id, {
      onDelete: 'set null',
    }),
    displayName: varchar('display_name', { length: 180 }).notNull(),
    normalizedName: varchar('normalized_name', { length: 180 }).notNull(),
    countryCode: varchar('country_code', { length: 2 }).notNull(),
    countryName: varchar('country_name', { length: 100 }).notNull(),
    scope: varchar('scope', { length: 20 }).$type<DestinationScope>().notNull(),
    provider: varchar('provider', { length: 40 }).notNull(),
    trendScore: numeric('trend_score', { precision: 8, scale: 3 }).notNull(),
    observedOn: date('observed_on').notNull(),
    status: varchar('status', { length: 20 })
      .$type<TrendCandidateStatus>()
      .notNull()
      .default('discovered'),
    rawSignals: jsonb('raw_signals')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('trend_candidates_provider_destination_day_unique').on(
      table.provider,
      table.normalizedName,
      table.countryCode,
      table.observedOn,
    ),
    index('trend_candidates_selection_idx').on(table.observedOn, table.scope, table.status),
    check('trend_candidates_scope_check', sql`${table.scope} in ('india', 'international')`),
  ],
);

export const researchSources = pgTable(
  'research_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    url: text('url').notNull(),
    publisher: varchar('publisher', { length: 160 }).notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    sourceType: varchar('source_type', { length: 24 })
      .$type<'official' | 'primary' | 'reputable' | 'local'>()
      .notNull(),
    status: varchar('status', { length: 20 })
      .$type<'active' | 'unavailable' | 'superseded'>()
      .notNull()
      .default('active'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('research_sources_url_unique').on(table.url),
    index('research_sources_status_fetched_idx').on(table.status, table.fetchedAt),
  ],
);

export const destinationGuides = pgTable(
  'destination_guides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    destinationId: uuid('destination_id')
      .notNull()
      .references(() => destinations.id, { onDelete: 'restrict' }),
    slug: varchar('slug', { length: 180 }).notNull(),
    contentAngle: varchar('content_angle', { length: 180 }).notNull(),
    tripTheme: varchar('trip_theme', { length: 80 }).notNull(),
    audiences: jsonb('audiences')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    status: varchar('status', { length: 20 }).$type<GuideStatus>().notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('destination_guides_slug_unique').on(table.slug),
    index('destination_guides_destination_status_idx').on(table.destinationId, table.status),
  ],
);

export const guideRevisions = pgTable(
  'guide_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => destinationGuides.id, { onDelete: 'cascade' }),
    revisionNumber: integer('revision_number').notNull(),
    title: varchar('title', { length: 180 }).notNull(),
    excerpt: text('excerpt').notNull(),
    content: jsonb('content').$type<DestinationGuideContent>().notNull(),
    seo: jsonb('seo').$type<DestinationGuideSeo>().notNull(),
    contentFingerprint: varchar('content_fingerprint', { length: 64 }).notNull(),
    promptVersion: varchar('prompt_version', { length: 40 }).notNull(),
    modelProvider: varchar('model_provider', { length: 40 }),
    modelName: varchar('model_name', { length: 100 }),
    status: varchar('status', { length: 20 })
      .$type<GuideRevisionStatus>()
      .notNull()
      .default('draft'),
    qualityReport: jsonb('quality_report')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('guide_revisions_guide_number_unique').on(table.guideId, table.revisionNumber),
    uniqueIndex('guide_revisions_content_fingerprint_unique').on(table.contentFingerprint),
    index('guide_revisions_guide_status_idx').on(table.guideId, table.status),
    check('guide_revisions_revision_number_check', sql`${table.revisionNumber} > 0`),
  ],
);

export const guideRevisionSources = pgTable(
  'guide_revision_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => guideRevisions.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => researchSources.id, { onDelete: 'restrict' }),
    sectionKey: varchar('section_key', { length: 80 }).notNull(),
    claimSummary: text('claim_summary').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('guide_revision_sources_revision_idx').on(table.revisionId),
    index('guide_revision_sources_source_idx').on(table.sourceId),
  ],
);

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: varchar('provider', { length: 40 }).notNull(),
    externalId: varchar('external_id', { length: 180 }),
    sourceUrl: text('source_url').notNull(),
    storageKey: varchar('storage_key', { length: 300 }).notNull(),
    publicUrl: text('public_url').notNull(),
    altText: varchar('alt_text', { length: 240 }).notNull(),
    creditText: varchar('credit_text', { length: 240 }).notNull(),
    license: varchar('license', { length: 100 }).notNull(),
    width: integer('width'),
    height: integer('height'),
    checksum: varchar('checksum', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('media_assets_storage_key_unique').on(table.storageKey),
    uniqueIndex('media_assets_provider_external_id_unique').on(table.provider, table.externalId),
    check('media_assets_width_check', sql`${table.width} is null or ${table.width} > 0`),
    check('media_assets_height_check', sql`${table.height} is null or ${table.height} > 0`),
  ],
);

export const guideRevisionMedia = pgTable(
  'guide_revision_media',
  {
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => guideRevisions.id, { onDelete: 'cascade' }),
    mediaAssetId: uuid('media_asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'restrict' }),
    role: varchar('role', { length: 16 }).$type<'hero' | 'gallery' | 'inline'>().notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    caption: varchar('caption', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.revisionId, table.mediaAssetId] }),
    uniqueIndex('guide_revision_media_position_unique').on(
      table.revisionId,
      table.role,
      table.sortOrder,
    ),
    check('guide_revision_media_sort_order_check', sql`${table.sortOrder} >= 0`),
  ],
);

export const contentPublications = pgTable(
  'content_publications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicationSequence: bigserial('publication_sequence', { mode: 'number' }).notNull(),
    destinationId: uuid('destination_id')
      .notNull()
      .references(() => destinations.id, { onDelete: 'restrict' }),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => destinationGuides.id, { onDelete: 'restrict' }),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => guideRevisions.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 16 })
      .$type<'published' | 'withdrawn'>()
      .notNull()
      .default('published'),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('content_publications_sequence_unique').on(table.publicationSequence),
    uniqueIndex('content_publications_revision_unique').on(table.revisionId),
    index('content_publications_recent_idx').on(table.status, table.publishedAt),
    index('content_publications_destination_recent_idx').on(table.destinationId, table.publishedAt),
  ],
);

export const databaseSchema = {
  contentPublications,
  destinationAliases,
  destinationGuides,
  destinations,
  guideRevisionMedia,
  guideRevisionSources,
  guideRevisions,
  mediaAssets,
  researchSources,
  serviceHeartbeats,
  systemSettings,
  trendCandidates,
};
