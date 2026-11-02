export type Theme = 'system' | 'light' | 'dark';

export const THEMES: Theme[] = ['system', 'light', 'dark'];
export const THEME_LABEL: Record<Theme, string> = { system: 'Match device', light: 'Light', dark: 'Dark' };

/** Page background per theme, also used for the browser's address bar color on phones. */
export const THEME_COLOR = { light: '#eef1f5', dark: '#0f161d' } as const;

interface Attrs {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}
export interface ThemeDoc {
  documentElement: Attrs;
  querySelector(selector: string): { setAttribute(name: string, value: string): void } | null;
}

/**
 * Applies a theme by setting data-theme on the page. "Match device" removes only what this app set, so a theme chosen by
 * a host page (for example when embedded) is left alone, and the stylesheet falls back to prefers-color-scheme.
 */
export function applyTheme(theme: Theme, systemDark: boolean, doc: ThemeDoc = document as unknown as ThemeDoc): void {
  const root = doc.documentElement;
  if (theme === 'system') {
    if (root.getAttribute('data-theme-by') === 'app') {
      root.removeAttribute('data-theme');
      root.removeAttribute('data-theme-by');
    }
  } else {
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-theme-by', 'app');
  }
  const hostTheme = root.getAttribute('data-theme');
  const dark = theme === 'system' ? (hostTheme ? hostTheme === 'dark' : systemDark) : theme === 'dark';
  doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light);
}

export const prefersDark = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
