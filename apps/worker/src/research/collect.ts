import type { MvpGuideProfile } from '../content/mvp-batch';
import { fetchResearchResource, type ResearchFetchFunction } from './fetch';
import { contentHash, extractEvidenceFacts, extractHtmlTitle, htmlToReadableText } from './text';
import type {
  CollectedResearchSource,
  DestinationResearchBundle,
  ResearchQualityReport,
  ResearchSourceDefinition,
} from './types';

export interface ResearchCollectorOptions {
  fetchFunction?: ResearchFetchFunction;
  maximumBytes?: number;
  timeoutMilliseconds?: number;
  userAgent: string;
}

interface WikimediaApiResponse {
  query?: {
    pages?: Array<{
      extract?: string;
      fullurl?: string;
      missing?: boolean;
      title?: string;
    }>;
  };
}

function evaluateResearchQuality(
  sources: readonly CollectedResearchSource[],
): ResearchQualityReport {
  const evidenceCharacters = sources.reduce(
    (total, source) => total + source.facts.reduce((sum, fact) => sum + fact.length, 0),
    0,
  );
  const publisherCount = new Set(sources.map((source) => source.publisher)).size;
  const issues: ResearchQualityReport['issues'] = [];

  if (sources.length < 3) {
    issues.push({
      code: 'insufficient_sources',
      detail: `Research bundle contains ${sources.length} usable sources; at least 3 are required.`,
    });
  }
  if (publisherCount < 3) {
    issues.push({
      code: 'insufficient_publishers',
      detail: `Research bundle contains ${publisherCount} publishers; at least 3 are required.`,
    });
  }
  if (!sources.some((source) => source.sourceType === 'official')) {
    issues.push({
      code: 'missing_official_source',
      detail: 'Research bundle has no usable official destination source.',
    });
  }
  if (evidenceCharacters < 4_000) {
    issues.push({
      code: 'insufficient_evidence',
      detail: `Research bundle contains ${evidenceCharacters} evidence characters; at least 4000 are required.`,
    });
  }

  return {
    evidenceCharacters,
    issues,
    passed: issues.length === 0,
    publisherCount,
    sourceCount: sources.length,
  };
}

async function collectOfficialSource(
  source: ResearchSourceDefinition,
  options: Required<Omit<ResearchCollectorOptions, 'fetchFunction'>> & {
    fetchFunction: ResearchFetchFunction;
  },
): Promise<CollectedResearchSource> {
  const resource = await fetchResearchResource(
    options.fetchFunction,
    source.url,
    options.userAgent,
    options.timeoutMilliseconds,
    options.maximumBytes,
  );
  const sourceText = htmlToReadableText(resource.body);
  const facts = extractEvidenceFacts(sourceText);
  if (facts.length < 3)
    throw new Error('Official research source yielded too little readable text.');

  return {
    ...source,
    contentHash: contentHash(sourceText),
    facts,
    fetchedAt: new Date(),
    sourceText,
    title: extractHtmlTitle(resource.body) ?? source.title,
    url: resource.finalUrl,
  };
}

async function collectWikimediaSource(
  project: 'en.wikipedia.org' | 'en.wikivoyage.org',
  title: string,
  options: Required<Omit<ResearchCollectorOptions, 'fetchFunction'>> & {
    fetchFunction: ResearchFetchFunction;
  },
): Promise<CollectedResearchSource> {
  const parameters = new URLSearchParams({
    action: 'query',
    exintro: '0',
    explaintext: '1',
    format: 'json',
    formatversion: '2',
    inprop: 'url',
    prop: 'extracts|info',
    redirects: '1',
    titles: title,
  });
  const apiUrl = `https://${project}/w/api.php?${parameters.toString()}`;
  const resource = await fetchResearchResource(
    options.fetchFunction,
    apiUrl,
    options.userAgent,
    options.timeoutMilliseconds,
    options.maximumBytes,
  );
  const payload = JSON.parse(resource.body) as WikimediaApiResponse;
  const page = payload.query?.pages?.[0];
  if (!page || page.missing || !page.extract || !page.fullurl || !page.title) {
    throw new Error(`${project} has no usable page for this destination.`);
  }

  const sourceText = page.extract.replace(/\r/gu, '').trim();
  const facts = extractEvidenceFacts(sourceText);
  if (facts.length < 3) throw new Error(`${project} yielded too little evidence.`);

  return {
    contentHash: contentHash(sourceText),
    facts,
    fetchedAt: new Date(),
    publisher: project === 'en.wikivoyage.org' ? 'Wikivoyage' : 'Wikipedia',
    sourceText,
    sourceType: 'reputable',
    title: page.title,
    url: page.fullurl,
  };
}

export async function collectDestinationResearch(
  profile: MvpGuideProfile,
  collectorOptions: ResearchCollectorOptions,
): Promise<DestinationResearchBundle> {
  const options = {
    fetchFunction: collectorOptions.fetchFunction ?? globalThis.fetch,
    maximumBytes: collectorOptions.maximumBytes ?? 3_000_000,
    timeoutMilliseconds: collectorOptions.timeoutMilliseconds ?? 20_000,
    userAgent: collectorOptions.userAgent,
  };
  const collectionTasks = [
    ...profile.officialSources.map((source) => collectOfficialSource(source, options)),
    collectWikimediaSource('en.wikivoyage.org', profile.wikimediaTitle, options),
    collectWikimediaSource('en.wikipedia.org', profile.wikimediaTitle, options),
  ];
  const settled = await Promise.allSettled(collectionTasks);
  const sources = settled.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  );

  return {
    quality: evaluateResearchQuality(sources),
    sources,
  };
}

export { evaluateResearchQuality };
