import type { Theme } from './theme';

export type SortKey = 'status' | 'reset' | 'provider';
export type StatusFilter = 'all' | 'critical' | 'alert' | 'ok' | 'empty' | 'paused';

export interface Prefs {
  status: StatusFilter;
  provider: string;
  tag: string;
  sort: SortKey;
  compact: boolean;
  /** Provider groups that are folded shut. */
  collapsed: string[];
  theme: Theme;
}

const KEY = 'quota-tracker-prefs-v1';
const DEFAULTS: Prefs = { status: 'all', provider: 'all', tag: 'all', sort: 'status', compact: false, collapsed: [], theme: 'system' };
const STATUSES: string[] = ['all', 'critical', 'alert', 'ok', 'empty', 'paused'];
const SORTS: string[] = ['status', 'reset', 'provider'];

export function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<Prefs>;
    return {
      status: STATUSES.includes(raw.status as string) ? (raw.status as StatusFilter) : DEFAULTS.status,
      provider: typeof raw.provider === 'string' ? raw.provider : DEFAULTS.provider,
      tag: typeof raw.tag === 'string' ? raw.tag : DEFAULTS.tag,
      sort: SORTS.includes(raw.sort as string) ? (raw.sort as SortKey) : DEFAULTS.sort,
      compact: raw.compact === true,
      theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : 'system',
      collapsed: Array.isArray(raw.collapsed) ? raw.collapsed.filter((x): x is string => typeof x === 'string') : [],
    };
  } catch {
    return DEFAULTS;
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
