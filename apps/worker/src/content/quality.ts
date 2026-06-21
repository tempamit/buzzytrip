import type { GeneratedDestinationGuide } from '@buzzytrip/contracts';

const editorialCliches = [
  'a hidden gem',
  'breathtaking beauty',
  'embark on',
  'in conclusion',
  'nestled in',
  'something for everyone',
  'tapestry of',
  'unforgettable journey',
  "whether you're",
];

const unsafeAbsoluteClaims = [
  '100% accurate',
  '100% safe',
  'always safe',
  'completely safe',
  'guaranteed',
  'perfect for everyone',
];

export type EditorialQualityIssueCode =
  | 'absolute_claim'
  | 'ai_self_reference'
  | 'duplicate_sentence'
  | 'editorial_cliche'
  | 'keyword_stuffing'
  | 'long_sentences'
  | 'too_long'
  | 'too_short'
  | 'too_similar';

export interface EditorialQualityIssue {
  code: EditorialQualityIssueCode;
  detail: string;
}

export interface EditorialQualityMetrics {
  averageSentenceWords: number;
  keywordDensityPercent: number;
  maximumPriorSimilarity: number;
  wordCount: number;
}

export interface EditorialQualityReport {
  issues: EditorialQualityIssue[];
  metrics: EditorialQualityMetrics;
  passed: boolean;
}

export interface EditorialQualityOptions {
  maximumAverageSentenceWords?: number;
  maximumKeywordDensityPercent?: number;
  maximumPriorSimilarity?: number;
  maximumWords?: number;
  minimumWords?: number;
  primaryKeyword: string;
  priorTexts?: readonly string[];
}

function words(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function sentences(text: string): string[] {
  return text
    .split(/[.!?]+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function phraseOccurrences(textWords: readonly string[], phraseWords: readonly string[]): number {
  if (phraseWords.length === 0 || phraseWords.length > textWords.length) return 0;

  let matches = 0;
  for (let index = 0; index <= textWords.length - phraseWords.length; index += 1) {
    if (phraseWords.every((word, offset) => textWords[index + offset] === word)) matches += 1;
  }
  return matches;
}

function shingles(text: string, size = 5): Set<string> {
  const textWords = words(text);
  if (textWords.length === 0) return new Set();
  if (textWords.length < size) return new Set([textWords.join(' ')]);

  const result = new Set<string>();
  for (let index = 0; index <= textWords.length - size; index += 1) {
    result.add(textWords.slice(index, index + size).join(' '));
  }
  return result;
}

export function calculateTextSimilarity(first: string, second: string): number {
  const firstShingles = shingles(first);
  const secondShingles = shingles(second);
  if (firstShingles.size === 0 || secondShingles.size === 0) return 0;

  let intersection = 0;
  for (const shingle of firstShingles) {
    if (secondShingles.has(shingle)) intersection += 1;
  }

  const union = new Set([...firstShingles, ...secondShingles]).size;
  return intersection / union;
}

function collectStrings(value: unknown, strings: string[]): void {
  if (typeof value === 'string') {
    strings.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, strings);
    return;
  }

  if (typeof value === 'object' && value !== null) {
    for (const item of Object.values(value)) collectStrings(item, strings);
  }
}

export function generatedGuideEditorialText(guide: GeneratedDestinationGuide): string {
  const strings: string[] = [];
  collectStrings({ content: guide.content, excerpt: guide.excerpt, title: guide.title }, strings);
  return strings.join('\n');
}

export function evaluateEditorialText(
  text: string,
  options: EditorialQualityOptions,
): EditorialQualityReport {
  const textWords = words(text);
  const textSentences = sentences(text);
  const normalizedText = text.toLowerCase();
  const minimumWords = options.minimumWords ?? 1_200;
  const maximumWords = options.maximumWords ?? 4_500;
  const maximumAverageSentenceWords = options.maximumAverageSentenceWords ?? 24;
  const maximumKeywordDensityPercent = options.maximumKeywordDensityPercent ?? 2.5;
  const maximumPriorSimilarity = options.maximumPriorSimilarity ?? 0.68;
  const primaryKeywordWords = words(options.primaryKeyword);
  const keywordWordMatches =
    phraseOccurrences(textWords, primaryKeywordWords) * primaryKeywordWords.length;
  const keywordDensityPercent =
    textWords.length === 0 ? 0 : (keywordWordMatches / textWords.length) * 100;
  const averageSentenceWords =
    textSentences.length === 0 ? 0 : textWords.length / textSentences.length;
  const maximumSimilarity = Math.max(
    0,
    ...(options.priorTexts ?? []).map((priorText) => calculateTextSimilarity(text, priorText)),
  );
  const issues: EditorialQualityIssue[] = [];

  if (textWords.length < minimumWords) {
    issues.push({ code: 'too_short', detail: `Guide contains ${textWords.length} words.` });
  }
  if (textWords.length > maximumWords) {
    issues.push({ code: 'too_long', detail: `Guide contains ${textWords.length} words.` });
  }
  if (averageSentenceWords > maximumAverageSentenceWords) {
    issues.push({
      code: 'long_sentences',
      detail: `Average sentence length is ${averageSentenceWords.toFixed(1)} words.`,
    });
  }
  if (keywordDensityPercent > maximumKeywordDensityPercent) {
    issues.push({
      code: 'keyword_stuffing',
      detail: `Primary-keyword density is ${keywordDensityPercent.toFixed(2)}%.`,
    });
  }
  if (maximumSimilarity > maximumPriorSimilarity) {
    issues.push({
      code: 'too_similar',
      detail: `Similarity to an earlier guide is ${maximumSimilarity.toFixed(3)}.`,
    });
  }

  for (const phrase of editorialCliches) {
    if (normalizedText.includes(phrase)) {
      issues.push({ code: 'editorial_cliche', detail: `Avoid the phrase "${phrase}".` });
    }
  }
  for (const claim of unsafeAbsoluteClaims) {
    if (normalizedText.includes(claim)) {
      issues.push({ code: 'absolute_claim', detail: `Avoid the claim "${claim}".` });
    }
  }
  if (/\b(as an ai|as a language model|i cannot browse)\b/iu.test(text)) {
    issues.push({ code: 'ai_self_reference', detail: 'Remove model self-reference.' });
  }

  const seenSentences = new Set<string>();
  for (const sentence of textSentences) {
    const normalizedSentence = words(sentence).join(' ');
    if (normalizedSentence.split(' ').length < 8) continue;
    if (seenSentences.has(normalizedSentence)) {
      issues.push({ code: 'duplicate_sentence', detail: 'A full sentence is repeated.' });
      break;
    }
    seenSentences.add(normalizedSentence);
  }

  return {
    issues,
    metrics: {
      averageSentenceWords,
      keywordDensityPercent,
      maximumPriorSimilarity: maximumSimilarity,
      wordCount: textWords.length,
    },
    passed: issues.length === 0,
  };
}

export function evaluateGeneratedGuide(
  guide: GeneratedDestinationGuide,
  options: EditorialQualityOptions,
): EditorialQualityReport {
  return evaluateEditorialText(generatedGuideEditorialText(guide), options);
}
