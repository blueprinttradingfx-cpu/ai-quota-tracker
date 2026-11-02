import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

/** Pulls `--name: #hex` pairs out of one block of the stylesheet. */
function tokens(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)) {
    // #fff means #ffffff
    out[m[1]] = '#' + (m[2].length === 3 ? [...m[2]].map((c) => c + c).join('') : m[2]);
  }
  return out;
}

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const light = tokens(css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme: dark)')));
const darkBlock = css.slice(css.indexOf(':root[data-theme="dark"] {'));
const dark = { ...light, ...tokens(darkBlock.slice(0, darkBlock.indexOf('}'))) };

describe.each([['light', light], ['dark', dark]] as const)('%s theme contrast', (_name, t) => {
  const pairs: [string, string, string, number][] = [
    ['text on card', 'tx', 'card', 4.5],
    ['text on page', 'tx', 'bg', 4.5],
    ['muted text on card', 'mut', 'card', 4.5],
    ['muted text on page', 'mut', 'bg', 4.5],
    ['link on card', 'ac', 'card', 4.5],
    ['healthy on card', 'ok', 'card', 4.5],
    ['low on card', 'warn', 'card', 4.5],
    ['critical on card', 'bad', 'card', 4.5],
    ['button text on accent', 'on-ac', 'ac', 4.5],
    ['text on danger fill', 'on-bad', 'bad', 4.5],
    ['text on input', 'tx', 'inp', 4.5],
  ];
  it.each(pairs)('%s is readable', (_label, fg, bg, min) => {
    expect(t[fg], fg).toBeDefined();
    expect(t[bg], bg).toBeDefined();
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(min);
  });
});
