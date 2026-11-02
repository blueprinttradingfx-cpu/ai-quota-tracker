import type { ProviderConfig } from '../types';

function initials(name: string): string {
  const words = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase();
}

/**
 * One short mark per provider, never shared. OmniRoute's marks collide (several providers use "CB" or "KC"), so a mark is
 * kept only while it is unique; later providers fall back to other letters from their own name.
 */
export function computeMarks(providers: ProviderConfig[]): Map<string, string> {
  const taken = new Set<string>();
  const marks = new Map<string, string>();
  const sorted = [...providers].sort((a, b) => a.name.localeCompare(b.name));
  for (const p of sorted) {
    const letters = p.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const candidates = [
      p.textIcon?.toUpperCase(),
      initials(p.name),
      letters.slice(0, 3),
      letters.slice(0, 2) + letters.slice(-1),
      letters.slice(0, 4),
      p.id.slice(0, 3).toUpperCase(),
    ].filter((c): c is string => !!c);
    const pick = candidates.find((c) => !taken.has(c)) ?? p.id.toUpperCase().slice(0, 4);
    taken.add(pick);
    marks.set(p.id, pick);
  }
  return marks;
}
