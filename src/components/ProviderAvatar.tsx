import type { ProviderConfig } from '../types';
import { PROVIDERS } from '../config/providers';
import { computeMarks } from '../config/marks';

const MARKS = computeMarks(PROVIDERS);

/** Black or white, whichever reads better on the brand color. */
function textOn(hex?: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? '#111' : '#fff';
}

export default function ProviderAvatar({ provider, size = 28 }: { provider: ProviderConfig; size?: number }) {
  const mark = MARKS.get(provider.id) ?? provider.name.slice(0, 2).toUpperCase();
  return (
    <span
      className="av"
      aria-hidden="true"
      style={{ width: size, height: size, background: provider.color ?? 'var(--ac)', color: textOn(provider.color), fontSize: size * (mark.length > 2 ? 0.32 : 0.4) }}
    >
      {mark}
    </span>
  );
}
