import { generatedDestinationGuideSchema } from '@buzzytrip/contracts';
import {
  createDatabase,
  createDatabasePool,
  persistGeneratedGuideDraft,
  upsertResearchSourceRecords,
} from '@buzzytrip/database';
import { URL } from 'node:url';

const defaultLocalDatabaseUrl = 'postgresql://buzzytrip:buzzytrip_local@127.0.0.1:55432/buzzytrip';
const connectionString = process.env.DATABASE_URL ?? defaultLocalDatabaseUrl;
const parsedUrl = new URL(connectionString);

if (!['127.0.0.1', 'localhost', '::1'].includes(parsedUrl.hostname)) {
  console.error('Refusing to verify draft persistence against a non-local database.');
  process.exit(2);
}

const pool = createDatabasePool(connectionString, 'buzzytrip-draft-verification', 2);
const database = createDatabase(pool);
const guideSlug = 'phase8-draft-verification';
const mediaExternalId = 'phase8-draft-verification-image';
const sourceUrls = [1, 2, 3].map((number) => `https://example.com/phase8-source-${number}`);
const paragraph =
  'This practical verification paragraph contains enough plain language to satisfy the destination content contract without representing public travel advice.';

const recommendation = (name) => ({ name, reason: paragraph });
const listItem = (title) => ({ detail: paragraph, title });
const generated = generatedDestinationGuideSchema.parse({
  content: {
    ageAndMobility: {
      accessibilityNotes: [paragraph],
      ageGroups: ['Adults and families'],
      summary: paragraph,
    },
    bestTime: { seasons: [listItem('Comfortable season')], summary: paragraph },
    eat: {
      localFlavours: [recommendation('Local kitchen')],
      reliableComfort: [recommendation('Comfort kitchen')],
      specialOccasion: [recommendation('Occasion kitchen')],
    },
    faqs: [1, 2, 3].map((number) => ({
      answer: paragraph,
      question: `What should a verification traveller know for question ${number}?`,
    })),
    gettingAround: [listItem('Local transport')],
    highlights: [listItem('First place'), listItem('Second place'), listItem('Third place')],
    howToReach: { byAir: paragraph, byRail: paragraph, byRoad: paragraph, summary: paragraph },
    idealFor: ['First-time visitors'],
    overview: `${paragraph} ${paragraph}`,
    practical: {
      donts: [paragraph, `${paragraph} One`, `${paragraph} Two`],
      dos: [paragraph, `${paragraph} Three`, `${paragraph} Four`],
      whatToCarry: [paragraph, `${paragraph} Five`, `${paragraph} Six`],
      whatToWear: [paragraph, `${paragraph} Seven`],
    },
    responsibleTravel: [paragraph, `${paragraph} Eight`],
    safety: { emergencyNotes: [paragraph], summary: paragraph },
    stay: {
      comfort: [recommendation('Comfort stay')],
      premium: [recommendation('Premium stay')],
      value: [recommendation('Value stay')],
    },
    tripLength: { minimumDays: 2, recommendedDays: 3 },
  },
  excerpt:
    'A deliberately synthetic verification guide used only to prove safe local persistence, source linking, media attribution, and duplicate prevention.',
  seo: {
    canonicalPath: '/destinations/phase8-draft-verification',
    metaDescription:
      'Verify local draft persistence, citations, attributed media, revision numbering, and duplicate protection without publishing any travel content.',
    metaTitle: 'Local verification guide for BuzzyTrip draft persistence',
    primaryKeyword: 'draft persistence verification',
    supportingKeywords: ['revision verification'],
  },
  sourceUses: [
    {
      claimSummary: 'The official verification source supports overview and planning sections.',
      sectionKeys: ['overview', 'best_time', 'highlights', 'how_to_reach'],
      sourceIndex: 0,
    },
    {
      claimSummary:
        'The second verification source supports movement, stay, food, and mobility sections.',
      sectionKeys: ['getting_around', 'stay', 'eat', 'age_and_mobility'],
      sourceIndex: 1,
    },
    {
      claimSummary:
        'The third verification source supports practical, safety, responsibility, and FAQ sections.',
      sectionKeys: ['practical', 'safety', 'responsible_travel', 'faqs'],
      sourceIndex: 2,
    },
  ],
  title: 'A local-only verification guide for safe draft persistence',
});

async function cleanVerificationRows() {
  await pool.query('delete from destination_guides where slug = $1', [guideSlug]);
  await pool.query('delete from media_assets where provider = $1 and external_id = $2', [
    'unsplash',
    mediaExternalId,
  ]);
  await pool.query('delete from research_sources where url = any($1::text[])', [sourceUrls]);
}

try {
  await cleanVerificationRows();
  const persistedSources = await upsertResearchSourceRecords(
    database,
    sourceUrls.map((url, index) => ({
      contentHash: `${index + 1}`.repeat(64),
      fetchedAt: new Date('2099-08-08T08:00:00.000Z'),
      notes: 'Synthetic verification metadata only.',
      publisher: `Verification Publisher ${index + 1}`,
      sourceType: index === 0 ? 'official' : 'reputable',
      title: `Verification Source ${index + 1}`,
      url,
    })),
  );
  const input = {
    audiences: ['verification travellers'],
    contentAngle: 'Local persistence verification only',
    destinationSlug: 'udaipur',
    generated,
    guideSlug,
    media: [
      {
        altText: 'Synthetic verification image record',
        checksum: 'a'.repeat(64),
        creditText: 'Photo by Verification on Unsplash',
        creditUrl: 'https://unsplash.com/@verification?utm_source=buzzytrip&utm_medium=referral',
        externalId: mediaExternalId,
        height: 800,
        license: 'Unsplash License',
        licenseUrl: 'https://unsplash.com/license',
        publicUrl: 'https://images.unsplash.com/phase8-verification',
        sourceUrl: 'https://unsplash.com/photos/phase8-verification',
        width: 1200,
      },
    ],
    modelName: 'verification-model',
    modelProvider: 'gemini',
    promptVersion: 'destination-guide-v2',
    qualityPassed: true,
    qualityReport: { passed: true, verification: true },
    sources: sourceUrls.map((url) => {
      const source = persistedSources.find((item) => item.url === url);
      if (!source) throw new Error(`Missing persisted verification source: ${url}`);
      return source;
    }),
    tripTheme: 'verification',
  };

  const first = await persistGeneratedGuideDraft(database, input);
  const second = await persistGeneratedGuideDraft(database, input);
  const counts = await pool.query(
    `select
       (select count(*)::integer from destination_guides where slug = $1) as guides,
       (select count(*)::integer from guide_revisions where guide_id = $2) as revisions,
       (select count(*)::integer from guide_revision_sources where revision_id = $3) as sources,
       (select count(*)::integer from guide_revision_media where revision_id = $3) as media,
       (select count(*)::integer from content_publications where revision_id = $3) as publications`,
    [guideSlug, first.guideId, first.revisionId],
  );
  const row = counts.rows[0];

  if (
    !first.created ||
    second.created ||
    row?.guides !== 1 ||
    row.revisions !== 1 ||
    row.sources !== 12 ||
    row.media !== 1 ||
    row.publications !== 0
  ) {
    throw new Error('Draft persistence verification failed.');
  }

  console.log(
    'Draft persistence verification passed: one ready revision, fully linked and unpublished.',
  );
} finally {
  await cleanVerificationRows();
  await pool.end();
}
