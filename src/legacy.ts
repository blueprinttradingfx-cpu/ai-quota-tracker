import type { LoginMethod } from './types';
import { LOGIN_KEYS } from './logins';

export type LegacyType = 'daily' | 'weekly' | 'monthly' | 'rolling' | 'once';
export interface LegacyWindow {
  id: string; name: string; used: number; total: number; unit: string; step: number; type: LegacyType;
  time: string; dow: number; dom: number; hours: number; next?: string; at?: string; last?: string;
}
export interface LegacyAccount {
  id: string; provider: string; account: string; login: LoginMethod; plan: string; tag: string; note: string;
  active: boolean; windows: LegacyWindow[];
}
import { newId } from './ids';
const TYPES: string[] = ['daily', 'weekly', 'monthly', 'rolling', 'once'];


const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

export function normalizeLegacyWindow(x: unknown): LegacyWindow | null {
  if (!isObj(x) || typeof x.type !== 'string' || !TYPES.includes(x.type)) return null;
  return {
    id: str(x.id) || newId(),
    name: str(x.name),
    used: Math.max(0, num(x.used)),
    total: Math.max(0, num(x.total)),
    unit: str(x.unit),
    step: num(x.step, 1) > 0 ? num(x.step, 1) : 1,
    type: x.type as LegacyType,
    time: str(x.time) || '00:00',
    dow: num(x.dow, 1),
    dom: num(x.dom, 1),
    hours: num(x.hours, 5),
    next: str(x.next) || undefined,
    at: str(x.at) || undefined,
    last: str(x.last) || undefined,
  };
}

export function normalizeLegacyAccount(x: unknown): LegacyAccount | null {
  if (!isObj(x) || typeof x.provider !== 'string' || !x.provider.trim()) return null;
  const windows = Array.isArray(x.windows)
    ? x.windows.map(normalizeLegacyWindow).filter((w): w is LegacyWindow => w !== null)
    : [];
  return {
    id: str(x.id) || newId(),
    provider: x.provider.trim(),
    account: str(x.account),
    login: LOGIN_KEYS.includes(str(x.login) as LoginMethod) ? (str(x.login) as LoginMethod) : '',
    plan: str(x.plan),
    tag: str(x.tag),
    note: str(x.note),
    active: x.active !== false,
    windows,
  };
}

/** Groups the old one-quota-per-card records into accounts with several windows. */
export function migrateFlat(items: unknown[]): LegacyAccount[] {
  const groups = new Map<string, LegacyAccount>();
  for (const item of items) {
    const w = normalizeLegacyWindow(item);
    if (!w || !isObj(item) || typeof item.provider !== 'string' || !item.provider.trim()) continue;
    const provider = item.provider.trim();
    const account = str(item.account);
    const key = `${provider}\u0000${account}`;
    const existing = groups.get(key);
    if (existing) existing.windows.push(w);
    else
      groups.set(key, {
        id: newId(),
        provider,
        account,
        login: '',
        plan: '',
        tag: '',
        note: '',
        active: true,
        windows: [w],
      });
  }
  return [...groups.values()];
}

/** Accepts the current backup format, a bare list of accounts, or the old flat list. */
export function parseLegacy(text: string): LegacyAccount[] {
  const data: unknown = JSON.parse(text);
  const list = Array.isArray(data) ? data : isObj(data) && Array.isArray(data.accounts) ? data.accounts : null;
  if (!list) throw new Error('Not a backup.');
  const accounts: LegacyAccount[] = [];
  const flat: unknown[] = [];
  for (const item of list) {
    if (isObj(item) && Array.isArray(item.windows)) {
      const a = normalizeLegacyAccount(item);
      if (a) accounts.push(a);
    } else flat.push(item);
  }
  return [...accounts, ...migrateFlat(flat)];
}

