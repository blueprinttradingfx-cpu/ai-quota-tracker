import type { Account, LoginMethod, ProviderConfig, ResetType, Store, Usage, WindowSpec } from './types';
import { LOGIN_KEYS } from './logins';
import { newId } from './ids';
import { parseLegacy, type LegacyAccount } from './legacy';
import { PROVIDERS, PROVIDER_BY_ID } from './config/providers';

export { newId };
export const STORAGE_KEY = 'quota-tracker-v4';
const OLD_KEYS = ['quota-tracker-v3', 'quota-tracker-v2', 'quota-tracker-v1'];
const TYPES: ResetType[] = ['rolling', 'daily', 'weekly', 'monthly'];

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/* ---------- normalizers ---------- */

function normalizeSpec(x: unknown): WindowSpec | null {
  if (!isObj(x)) return null;
  const type: ResetType = TYPES.includes(x.type as ResetType) ? (x.type as ResetType) : 'monthly';
  return {
    id: str(x.id) || newId(),
    name: str(x.name),
    type,
    hours: num(x.hours, 5) > 0 ? num(x.hours, 5) : 5,
    total: Math.max(0, num(x.total, 100)),
    unit: str(x.unit),
    step: num(x.step, 1) > 0 ? num(x.step, 1) : 1,
  };
}

function normalizeUsage(x: unknown): Usage | null {
  if (!isObj(x)) return null;
  return {
    used: Math.max(0, num(x.used)),
    next: str(x.next) || undefined,
    anchor: x.anchor === true ? true : undefined,
    day: typeof x.day === 'number' && x.day >= 1 && x.day <= 31 ? Math.floor(x.day) : undefined,
    last: str(x.last) || undefined,
  };
}

function normalizeAccount(x: unknown): Account | null {
  if (!isObj(x) || !str(x.providerId)) return null;
  const usage: Record<string, Usage> = {};
  if (isObj(x.usage)) {
    for (const [k, v] of Object.entries(x.usage)) {
      const u = normalizeUsage(v);
      if (u) usage[k] = u;
    }
  }
  const login = str(x.login) as LoginMethod;
  return {
    id: str(x.id) || newId(),
    providerId: str(x.providerId),
    account: str(x.account),
    login: LOGIN_KEYS.includes(login) ? login : '',
    plan: str(x.plan),
    tag: str(x.tag),
    note: str(x.note),
    active: x.active !== false,
    usage,
    connection: typeof x.connection === 'string' && ['github', 'claude', 'codex', 'antigravity', 'cursor', 'kiro', 'manus', 'kilocode', 'kimi', 'grok'].includes(x.connection) ? (x.connection as Account['connection']) : undefined,
    syncedAt: str(x.syncedAt) || undefined,
  };
}

/* ---------- converting older saved layouts ---------- */

interface OldStore {
  providers: { id: string; name: string; windows: WindowSpec[] }[];
  accounts: Account[];
}

/** The layout where every account carried its own quota windows. */
function legacyToOld(list: LegacyAccount[]): OldStore {
  const providers: OldStore['providers'] = [];
  const accounts: Account[] = [];
  for (const la of list) {
    const key = la.provider.trim().toLowerCase();
    let p = providers.find((x) => x.name.toLowerCase() === key);
    if (!p) {
      p = { id: newId(), name: la.provider.trim(), windows: [] };
      providers.push(p);
    }
    const usage: Record<string, Usage> = {};
    for (const w of la.windows) {
      const type: ResetType = w.type === 'once' ? 'monthly' : w.type;
      let spec = p.windows.find((s) => s.name === (w.name || 'Quota') && s.type === type);
      if (!spec) {
        const limited = w.total > 0;
        spec = {
          id: newId(), name: w.name || 'Quota', type, hours: w.hours > 0 ? w.hours : 5,
          total: limited ? w.total : 100, unit: limited ? w.unit : '%', step: w.step > 0 ? w.step : 1,
        };
        p.windows.push(spec);
      }
      const next = w.type === 'once' ? w.at : w.next;
      const entered = w.type === 'once' || (w.type !== 'rolling' && !!w.next);
      usage[spec.id] = {
        used: w.used,
        next,
        anchor: entered && next ? true : undefined,
        day: entered && next ? new Date(next).getDate() : undefined,
        last: w.last,
      };
    }
    accounts.push({
      id: la.id, providerId: p.id, account: la.account, login: la.login, plan: la.plan, tag: la.tag,
      note: la.note, active: la.active, usage,
    });
  }
  return { providers, accounts };
}

function findConfig(name: string): ProviderConfig | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  const exact = PROVIDERS.find((c) => [c.name, c.id, c.alias ?? ''].some((v) => v.toLowerCase() === q));
  if (exact) return exact;
  if (q.length < 3) return undefined;
  return PROVIDERS.find((c) => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase()));
}

function findWindow(cfg: ProviderConfig, spec: WindowSpec): WindowSpec | undefined {
  const byName = cfg.windows.find((w) => w.name.toLowerCase() === spec.name.toLowerCase());
  if (byName) return byName;
  const sameType = cfg.windows.filter((w) => w.type === spec.type);
  return sameType.length === 1 ? sameType[0] : undefined;
}

/** Moves accounts from user-defined providers onto the global provider config, matching by name. */
function adoptConfig(old: OldStore): Account[] {
  const map = new Map<string, { cfg: ProviderConfig; windows: Map<string, string> }>();
  for (const op of old.providers) {
    const cfg = findConfig(op.name);
    if (!cfg) continue;
    const windows = new Map<string, string>();
    for (const s of op.windows) {
      const target = findWindow(cfg, s);
      if (target) windows.set(s.id, target.id);
    }
    map.set(op.id, { cfg, windows });
  }
  const out: Account[] = [];
  for (const a of old.accounts) {
    const m = map.get(a.providerId);
    if (!m) continue;
    const usage: Record<string, Usage> = {};
    for (const [k, v] of Object.entries(a.usage)) {
      const to = m.windows.get(k);
      if (to) usage[to] = v;
    }
    out.push({ ...a, providerId: m.cfg.id, usage });
  }
  return out;
}

/* ---------- public API ---------- */

/** Accepts the current format, or any older backup or saved layout (which is converted). */
export function parseStore(text: string): Store {
  const data: unknown = JSON.parse(text);

  // Previous layout: user-defined providers stored next to the accounts.
  if (isObj(data) && Array.isArray(data.providers) && Array.isArray(data.accounts)) {
    const providers = data.providers.flatMap((p): OldStore['providers'] => {
      if (!isObj(p) || !str(p.name).trim()) return [];
      const windows = Array.isArray(p.windows) ? p.windows.map(normalizeSpec).filter((w): w is WindowSpec => w !== null) : [];
      return [{ id: str(p.id), name: str(p.name), windows }];
    });
    const accounts = data.accounts.map(normalizeAccount).filter((a): a is Account => a !== null);
    return { accounts: adoptConfig({ providers, accounts }) };
  }

  const list = Array.isArray(data) ? data : isObj(data) && Array.isArray(data.accounts) ? data.accounts : null;
  if (!list) throw new Error('Not a backup.');
  const current: Account[] = [];
  const legacy: unknown[] = [];
  for (const item of list) {
    if (isObj(item) && str(item.providerId)) {
      const a = normalizeAccount(item);
      if (a && PROVIDER_BY_ID.has(a.providerId)) current.push(a);
    } else legacy.push(item);
  }
  const converted = legacy.length ? adoptConfig(legacyToOld(parseLegacy(JSON.stringify(legacy)))) : [];
  return { accounts: [...current, ...converted] };
}

export function serialize(store: Store): string {
  return JSON.stringify({ version: 4, accounts: store.accounts }, null, 2);
}

/** Adds imported accounts to the current ones. */
export function mergeStores(current: Store, incoming: Store): Store {
  const taken = new Set(current.accounts.map((a) => a.id));
  const added = incoming.accounts.map((a) => {
    const id = taken.has(a.id) ? newId() : a.id;
    taken.add(id);
    return { ...a, id };
  });
  return { accounts: [...current.accounts, ...added] };
}

export function loadStore(): Store {
  try {
    for (const key of [STORAGE_KEY, ...OLD_KEYS]) {
      const raw = localStorage.getItem(key);
      if (raw) return parseStore(raw);
    }
  } catch {
    /* fall through to an empty store */
  }
  return { accounts: [] };
}

export function saveStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(store));
  } catch {
    /* storage unavailable or full: the app keeps working in memory */
  }
}
