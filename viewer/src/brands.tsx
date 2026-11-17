import { BRANDS, type BrandIcon as BrandData } from './brands.generated';

export type { BrandData };

const key = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');

const INDEX = new Map<string, BrandData>();
for (const brand of BRANDS) {
  for (const alias of [brand.id, brand.name, ...brand.aliases]) {
    const k = key(alias);
    if (k && !INDEX.has(k)) INDEX.set(k, brand);
  }
}

const candidates = (value: string) => {
  const out = [value];
  const stripped = value.replace(/\s+v?\d+(?:\.\d+)*.*$/i, '');
  if (stripped !== value) out.push(stripped);
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    out.push(words[0]!);
    out.push(words.slice(0, 2).join(' '));
  }
  return out;
};

/** Resolve a brand from tech names or a node title; unknown names return null. */
export function brandFor(...values: (string | undefined | null)[]): BrandData | null {
  for (const value of values) {
    if (!value) continue;
    for (const candidate of candidates(value)) {
      const hit = INDEX.get(key(candidate));
      if (hit) return hit;
    }
  }
  return null;
}

export function BrandGlyph({ brand, size = 20, x = 0, y = 0 }: { brand: BrandData; size?: number; x?: number; y?: number }) {
  const scale = Math.min(size / brand.w, size / brand.h);
  const w = brand.w * scale;
  const h = brand.h * scale;
  return (
    <svg x={x + (size - w) / 2} y={y + (size - h) / 2} width={w} height={h}
      viewBox={`0 0 ${brand.w} ${brand.h}`} data-brand={brand.id}
      dangerouslySetInnerHTML={{ __html: brand.body }} />
  );
}
