const trailingTravelTerms = /\s+(airport|flights?|hotels?|tourism|travel|trip|weather)$/iu;

export function displayTrendName(value: string): string {
  const withSpaces = value.replaceAll('_', ' ');
  let decoded = withSpaces;
  try {
    decoded = decodeURIComponent(withSpaces);
  } catch {
    // Some valid trend phrases contain a literal percent sign rather than URL encoding.
  }

  return decoded
    .replace(/\s*\([^)]*\)\s*$/u, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function normalizeTrendName(value: string): string {
  return displayTrendName(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/&/gu, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function trendLookupKeys(value: string): string[] {
  const normalized = normalizeTrendName(value);
  const withoutTravelSuffix = normalized.replace(trailingTravelTerms, '').trim();
  return withoutTravelSuffix && withoutTravelSuffix !== normalized
    ? [normalized, withoutTravelSuffix]
    : [normalized];
}

export function isWikimediaArticleTitle(value: string): boolean {
  if (!value || value === 'Main_Page') return false;
  return !value.includes(':') && !value.startsWith('List_of_');
}
