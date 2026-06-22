import { createHash } from 'node:crypto';

const namedEntities: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  hellip: '…',
  laquo: '«',
  ldquo: '“',
  lsquo: '‘',
  lt: '<',
  mdash: '—',
  nbsp: ' ',
  ndash: '–',
  quot: '"',
  raquo: '»',
  rdquo: '”',
  rsquo: '’',
};

export function contentHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (entity, code: string) => {
    if (code.startsWith('#x')) {
      const point = Number.parseInt(code.slice(2), 16);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    if (code.startsWith('#')) {
      const point = Number.parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    return namedEntities[code.toLowerCase()] ?? entity;
  });
}

export function extractHtmlTitle(html: string): string | null {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/iu)?.[1];
  return title
    ? decodeHtmlEntities(title.replace(/<[^>]+>/gu, ' '))
        .replace(/\s+/gu, ' ')
        .trim()
    : null;
}

export function htmlToReadableText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<!--([\s\S]*?)-->/gu, ' ')
      .replace(/<(script|style|svg|noscript|template)[^>]*>[\s\S]*?<\/\1>/giu, ' ')
      .replace(/<(nav|header|footer)[^>]*>[\s\S]*?<\/\1>/giu, ' ')
      .replace(/<br\s*\/?\s*>/giu, '\n')
      .replace(
        /<\/(address|article|aside|blockquote|div|h[1-6]|li|main|p|section|table|tr)>/giu,
        '\n',
      )
      .replace(/<[^>]+>/gu, ' '),
  )
    .split(/\r?\n/gu)
    .map((line) => line.replace(/\s+/gu, ' ').trim())
    .filter((line) => line.length >= 40)
    .join('\n');
}

export function extractEvidenceFacts(sourceText: string, maximumFacts = 30): string[] {
  const candidates = sourceText
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/gu)
    .map((value) => value.replace(/\s+/gu, ' ').trim())
    .filter((value) => value.length >= 50 && value.length <= 900);
  const facts: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    if (seen.has(normalized)) continue;
    if (
      /^(accept|all rights reserved|cookie|copyright|home|menu|privacy|search|skip to)/iu.test(
        candidate,
      )
    ) {
      continue;
    }
    seen.add(normalized);
    facts.push(candidate);
    if (facts.length >= maximumFacts) break;
  }

  return facts;
}
