/**
 * Deterministic duplicate detection (no AI). A fingerprint is the sorted set of
 * normalized tokens from merchant + description.
 */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'with', 'by', 'from',
  'inc', 'llc', 'ltd', 'co', 'corp', 'company',
]);

export function tokenize(...parts: string[]): string[] {
  const tokens = parts
    .join(' ')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t))
    .map((t) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t)); // naive plural fold
  return [...new Set(tokens)].sort();
}

export function fingerprint(merchant: string, description: string): string {
  return tokenize(merchant, description).join(' ');
}

/** Jaccard similarity of two fingerprints, 0..1. */
export function similarity(fpA: string, fpB: string): number {
  const a = new Set(fpA.split(' ').filter(Boolean));
  const b = new Set(fpB.split(' ').filter(Boolean));
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export const DUPLICATE_THRESHOLD = 0.75;
