import { useEffect, useMemo, useRef, useState } from 'react';
import type { Account, AccountView, ProviderConfig, QuotaWindow, Store, Usage } from './types';
import { advanceStore, soonestReset, startRolling } from './schedule';
import { loadStore, newId, saveStore, STORAGE_KEY } from './storage';
import { loadPrefs, savePrefs, type Prefs, type SortKey, type StatusFilter } from './prefs';
import { accountStatus, STATUS_LABEL, type StatusKey } from './status';
import { buildViews } from './view';
import { PROVIDERS, PROVIDER_BY_ID } from './config/providers';
import { formatRemaining } from './format';
import AccountCard from './components/AccountCard';
import AccountForm from './components/AccountForm';
import DataDialog from './components/DataDialog';
import ProviderAvatar from './components/ProviderAvatar';
import ProviderPicker from './components/ProviderPicker';
import ConnectAccountDialog, { type Connected } from './components/ConnectAccountDialog';
import { CONNECTOR_BY_PROVIDER, type QuotaResult } from './connect/providers';
import { exchangeCallback, readCallback } from './connect/callback';
import { clearPending } from './connect/pending';
import { applyResult, call, ConnectError, fetchQuota } from './connect/client';
import { connectedIds, deleteCreds, setCreds } from './connect/creds';
import ExternalLinkIcon from './components/ExternalLinkIcon';
import { ToastHost, useToasts } from './components/Toasts';
import OverflowMenu from './components/OverflowMenu';
import { applyTheme, prefersDark, THEMES, THEME_LABEL } from './theme';
import { useInstall } from './install';

const RANK: Record<StatusKey, number> = { critical: 0, alert: 1, ok: 2, empty: 3, paused: 4 };
const STATUS_ORDER: StatusKey[] = ['critical', 'alert', 'ok', 'empty', 'paused'];

const blankAccount = (providerId: string): Account => ({
  id: newId(), providerId, account: '', login: '', plan: '', tag: '', note: '', active: true, usage: {},
});

const advance = (s: Store, n: Date) => advanceStore(PROVIDERS, s, n);

export default function App() {
  const [now, setNow] = useState(() => new Date());
  const [store, setStore] = useState<Store>(() => advance(loadStore(), new Date()));
  const storeRef = useRef(store);
  storeRef.current = store;
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [search, setSearch] = useState('');
  const [picking, setPicking] = useState(false);
  const [acctForm, setAcctForm] = useState<Account | null>(null);
  const [showData, setShowData] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const { toasts, push, dismiss } = useToasts();
  const install = useInstall();
  const pendingCreds = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [connecting, setConnecting] = useState<Account | null>(null);
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  useEffect(() => saveStore(store), [store]);
  useEffect(() => savePrefs(prefs), [prefs]);

  // Apply the chosen theme, and follow the device when it is set to match it.
  useEffect(() => {
    applyTheme(prefs.theme, prefersDark());
    if (prefs.theme !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => applyTheme('system', mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [prefs.theme]);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNow(n);
      setStore((prev) => advance(prev, n));
    };
    const id = setInterval(tick, 30000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    // Keep several open tabs in sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setStore(advance(loadStore(), new Date()));
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  /** Reads quotas for one connected account and writes them onto it. */
  const syncAccount = async (id: string) => {
    setBusyIds((s) => new Set(s).add(id));
    try {
      const { result, kind } = await fetchQuota(id);
      const at = new Date();
      setStore((s) =>
        advance(
          {
            accounts: s.accounts.map((x) => {
              const p = PROVIDER_BY_ID.get(x.providerId);
              return x.id === id && p ? applyResult(x, p, result, kind, at) : x;
            }),
          },
          at,
        ),
      );
      setSyncErrors((e) => {
        const { [id]: _drop, ...rest } = e;
        return rest;
      });
      return true;
    } catch (e) {
      const expired = e instanceof ConnectError && e.status === 401;
      setSyncErrors((m) => ({ ...m, [id]: expired ? 'Sign-in expired. Connect again.' : e instanceof Error ? e.message : 'Could not read quotas.' }));
      if (expired) setStore((s) => ({ accounts: s.accounts.map((x) => (x.id === id ? { ...x, connection: undefined } : x)) }));
      return false;
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  useEffect(() => {
    const ids = new Set(storeRef.current.accounts.map((x) => x.id));
    for (const id of connectedIds()) if (!ids.has(id)) deleteCreds(id);
  }, []);

  // Read every connected account when the page opens, and again every 10 minutes while it is open.
  useEffect(() => {
    const run = async () => {
      const ids = connectedIds();
      for (const a of storeRef.current.accounts) if (a.connection && ids.has(a.id)) await syncAccount(a.id);
    };
    void run();
    const t = setInterval(() => void run(), 10 * 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishConnect = (account: Account, c: Connected) => {
    const provider = PROVIDER_BY_ID.get(account.providerId);
    const kind = CONNECTOR_BY_PROVIDER[account.providerId];
    if (!provider || !kind) return;
    setCreds(account.id, { kind, accessToken: c.accessToken, refreshToken: c.refreshToken, accountId: c.accountId, projectId: c.projectId, profile: c.profile, profileArn: c.profileArn, deviceId: c.deviceId, idp: c.idp });
    const at = new Date();
    const merged = applyResult(account, provider, { ...c.result, email: c.result.email ?? c.email, plan: c.result.plan ?? c.plan }, kind, at);
    setStore((s) => ({ accounts: s.accounts.some((x) => x.id === account.id) ? s.accounts.map((x) => (x.id === account.id ? merged : x)) : [...s.accounts, merged] }));
    setSyncErrors((e) => {
      const { [account.id]: _drop, ...rest } = e;
      return rest;
    });
    push(`Connected ${merged.account || provider.name}`, { tone: 'ok' });
  };

  // When the provider sends the person back to this app (?code=...&state=...), finish the sign-in here.
  const callbackHandled = useRef(false);
  useEffect(() => {
    if (callbackHandled.current) return;
    callbackHandled.current = true;
    const r = readCallback(window.location.search, Date.now());
    if (r.status === 'none') return;
    window.history.replaceState(null, '', '/');
    if (r.status === 'error') {
      push(r.message, { tone: 'error', ms: 9000 });
      return;
    }
    void (async () => {
      const account = storeRef.current.accounts.find((x) => x.id === r.pending.accountId);
      if (!account) {
        clearPending();
        push('That account no longer exists. Add it again and sign in.', { tone: 'error', ms: 9000 });
        return;
      }
      push('Finishing sign-in…');
      try {
        const tokens = await exchangeCallback(r.pending, r.code);
        const { result } = await call<{ result: QuotaResult }>({
          action: 'quota', kind: r.pending.kind, accessToken: tokens.accessToken, accountId: tokens.accountId, projectId: tokens.projectId, profile: tokens.profile,
        });
        clearPending();
        finishConnect(account, { ...tokens, result });
      } catch (e) {
        clearPending();
        push(e instanceof Error ? e.message : 'Sign-in failed.', { tone: 'error', ms: 9000 });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = (id: string) => {
    deleteCreds(id);
    setStore((s) => ({ accounts: s.accounts.map((x) => (x.id === id ? { ...x, connection: undefined, syncedAt: undefined } : x)) }));
    setSyncErrors((e) => {
      const { [id]: _drop, ...rest } = e;
      return rest;
    });
  };

  const views = useMemo(() => buildViews(store), [store]);
  const used = useMemo(() => {
    const ids = new Set(views.map((v) => v.provider.id));
    return PROVIDERS.filter((p) => ids.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [views]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of store.accounts) c[a.providerId] = (c[a.providerId] ?? 0) + 1;
    return c;
  }, [store.accounts]);
  const tags = useMemo(() => [...new Set(store.accounts.map((a) => a.tag).filter(Boolean))].sort(), [store.accounts]);
  const providerId = used.some((p) => p.id === prefs.provider) ? prefs.provider : 'all';
  const tag = tags.includes(prefs.tag) ? prefs.tag : 'all';

  // Everything except the status filter, so the status chips can show counts.
  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return views.filter((v) => {
      if (providerId !== 'all' && v.provider.id !== providerId) return false;
      if (tag !== 'all' && v.account.tag !== tag) return false;
      if (!q) return true;
      const hay = [v.provider.name, v.account.account, v.account.plan, v.account.tag, v.account.note, ...v.windows.map((w) => w.name)]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [views, providerId, tag, search]);

  const statusOf = (v: AccountView) => accountStatus(v.account.active, v.windows);

  const statusCounts = useMemo(() => {
    const c: Record<StatusKey, number> = { critical: 0, alert: 0, ok: 0, empty: 0, paused: 0 };
    for (const v of scoped) c[accountStatus(v.account.active, v.windows)]++;
    return c;
  }, [scoped]);

  const rows = useMemo(() => {
    const soon = (v: AccountView) => soonestReset(v.windows, now)?.getTime() ?? Infinity;
    const st = (v: AccountView) => RANK[accountStatus(v.account.active, v.windows)];
    const byName = (a: AccountView, b: AccountView) =>
      a.provider.name.localeCompare(b.provider.name) || a.account.account.localeCompare(b.account.account);
    const cmp: Record<SortKey, (a: AccountView, b: AccountView) => number> = {
      status: (a, b) => st(a) - st(b) || soon(a) - soon(b) || byName(a, b),
      reset: (a, b) => Number(!a.account.active) - Number(!b.account.active) || soon(a) - soon(b) || byName(a, b),
      provider: (a, b) => byName(a, b) || st(a) - st(b) || soon(a) - soon(b),
    };
    return scoped.filter((v) => prefs.status === 'all' || statusOf(v) === prefs.status).sort(cmp[prefs.sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, prefs.status, prefs.sort, now]);

  // Provider groups, in the order the sort puts their accounts.
  const groups = useMemo(() => {
    const map = new Map<string, AccountView[]>();
    for (const v of rows) {
      const list = map.get(v.provider.id);
      if (list) list.push(v);
      else map.set(v.provider.id, [v]);
    }
    return [...map.values()].map((list): [ProviderConfig, AccountView[]] => [list[0].provider, list]);
  }, [rows]);

  const next = useMemo(() => {
    let best: { v: AccountView; at: Date } | null = null;
    for (const v of views) {
      if (!v.account.active) continue;
      const at = soonestReset(v.windows, now);
      if (at && (!best || at < best.at)) best = { v, at };
    }
    return best;
  }, [views, now]);

  const setPref = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs((p) => ({ ...p, [k]: v }));
  const toggleGroup = (id: string) =>
    setPrefs((p) => ({ ...p, collapsed: p.collapsed.includes(id) ? p.collapsed.filter((x) => x !== id) : [...p.collapsed, id] }));

  const mapAccounts = (fn: (a: Account) => Account) => setStore((s) => ({ accounts: s.accounts.map(fn) }));
  const patchUsage = (accountId: string, specId: string, fn: (u: Usage) => Usage) =>
    mapAccounts((a) => (a.id === accountId ? { ...a, usage: { ...a.usage, [specId]: fn(a.usage[specId] ?? { used: 0 }) } } : a));

  const setUsed = (a: Account, w: QuotaWindow, usedNow: number) =>
    patchUsage(a.id, w.id, (u) => {
      const nu: Usage = { ...u, used: usedNow };
      if (w.type === 'rolling') {
        // A rolling window starts at first use and goes idle again when cleared.
        if (usedNow > 0 && !u.next) nu.next = startRolling(w, new Date());
        if (usedNow === 0) delete nu.next;
      }
      return nu;
    });
  const startWindow = (a: Account, w: QuotaWindow) => patchUsage(a.id, w.id, (u) => ({ ...u, next: startRolling(w, new Date()) }));
  const setReset = (a: Account, w: QuotaWindow, iso: string | null) =>
    patchUsage(a.id, w.id, (u) => {
      const nu: Usage = { ...u };
      if (iso) {
        nu.next = iso;
        nu.anchor = true;
        nu.day = new Date(iso).getDate();
      } else {
        delete nu.next;
        delete nu.anchor;
        delete nu.day;
      }
      return nu;
    });

  const saveAccount = (a: Account) => {
    // Make sure the saved account is visible even if its provider group was folded.
    setPrefs((p) => (p.collapsed.includes(a.providerId) ? { ...p, collapsed: p.collapsed.filter((x) => x !== a.providerId) } : p));
    setStore((s) => ({
      accounts: s.accounts.some((x) => x.id === a.id) ? s.accounts.map((x) => (x.id === a.id ? a : x)) : [...s.accounts, a],
    }));
  };

  const chip = (key: StatusFilter, label: string, count?: number) => (
    <button key={key} type="button" className={`chip${prefs.status === key ? ' on' : ''}`} aria-pressed={prefs.status === key} onClick={() => setPref('status', key)}>
      {label}
      {count != null && <span className="cnt">{count}</span>}
    </button>
  );

  const criticalCount = views.filter((v) => v.account.active && statusOf(v) === 'critical').length;
  const attention = criticalCount + views.filter((v) => v.account.active && statusOf(v) === 'alert').length;
  const connectedCount = store.accounts.filter((x) => x.connection).length;
  const activeFilters = (providerId !== 'all' ? 1 : 0) + (tag !== 'all' ? 1 : 0) + (prefs.sort !== 'status' ? 1 : 0);
  const signInProviders = PROVIDERS.filter((p) => CONNECTOR_BY_PROVIDER[p.id] && !p.deprecated).sort((x, y) => x.name.localeCompare(y.name));

  useEffect(() => {
    document.title = attention > 0 ? `(${attention}) Quota Tracker` : 'Quota Tracker';
  }, [attention]);

  /** Removes an account right away, and keeps its sign-in for a few seconds so Undo can bring it back. */
  const removeAccount = (acct: Account) => {
    const index = storeRef.current.accounts.findIndex((x) => x.id === acct.id);
    setStore((s) => ({ accounts: s.accounts.filter((x) => x.id !== acct.id) }));
    const timer = setTimeout(() => {
      deleteCreds(acct.id);
      pendingCreds.current.delete(acct.id);
    }, 7500);
    pendingCreds.current.set(acct.id, timer);
    push(`Deleted ${acct.account || PROVIDER_BY_ID.get(acct.providerId)?.name || 'account'}`, {
      action: {
        label: 'Undo',
        run: () => {
          clearTimeout(timer);
          pendingCreds.current.delete(acct.id);
          setStore((s) => {
            if (s.accounts.some((x) => x.id === acct.id)) return s;
            const copy = [...s.accounts];
            copy.splice(Math.min(index < 0 ? copy.length : index, copy.length), 0, acct);
            return { accounts: copy };
          });
        },
      },
    });
  };

  const syncAll = async () => {
    const ids = storeRef.current.accounts.filter((x) => x.connection).map((x) => x.id);
    if (ids.length === 0) return;
    setSyncingAll(true);
    let ok = 0;
    for (const id of ids) if (await syncAccount(id)) ok++;
    setSyncingAll(false);
    push(ok === ids.length ? `Updated ${ok} account${ok === 1 ? '' : 's'}` : `Updated ${ok} of ${ids.length}. Some need attention.`, { tone: ok === ids.length ? 'ok' : 'error' });
  };

  return (
    <main>
      <header className="top">
        <h1>Quota Tracker</h1>
        <div className="hb">
          {connectedCount > 0 && (
            <button type="button" className="icon" disabled={syncingAll} aria-label="Refresh all connected accounts" title="Refresh all connected accounts" onClick={() => void syncAll()}>
              <svg className={syncingAll ? 'spin' : ''} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
          )}
          <OverflowMenu
            label="Settings"
            items={[
              ...THEMES.map((t) => ({ label: `Theme: ${THEME_LABEL[t]}`, checked: prefs.theme === t, run: () => setPref('theme', t) })),
              { label: 'Install app', run: () => void install.prompt(), hidden: !install.canPrompt },
              {
                label: 'Add to Home Screen',
                run: () => push('In Safari, tap the Share button, then Add to Home Screen.', { ms: 9000 }),
                hidden: !install.needsManual,
              },
              { label: 'Backup and restore', run: () => setShowData(true) },
            ]}
          />
          <button type="button" className="pri" onClick={() => setPicking(true)}>+ Add account</button>
        </div>
      </header>

      {views.length > 0 && (
        <div className="tiles">
          <div className="tile">
            <span className="tl">Accounts</span>
            <b className="tv">{views.length}</b>
            <span className="ts">{used.length} {used.length === 1 ? 'provider' : 'providers'}</span>
          </div>
          <button
            type="button"
            className="tile"
            disabled={attention === 0}
            onClick={() => setPref('status', criticalCount > 0 ? 'critical' : 'alert')}
            aria-label={`${attention} accounts need attention`}
          >
            <span className="tl">Need attention</span>
            <b className="tv" style={{ color: attention > 0 ? (criticalCount > 0 ? 'var(--bad)' : 'var(--warn)') : 'var(--ok)' }}>{attention}</b>
            <span className="ts">{criticalCount > 0 ? `${criticalCount} critical` : attention > 0 ? 'running low' : 'all healthy'}</span>
          </button>
          <div className="tile">
            <span className="tl">Next reset</span>
            <b className="tv">{next ? formatRemaining(next.at.getTime() - now.getTime()) : '—'}</b>
            <span className="ts">{next ? next.v.provider.name : 'none scheduled'}</span>
          </div>
        </div>
      )}

      {views.length > 0 && (
        <div className="tools">
          <div className="bar2">
            <input className="search" type="search" placeholder="Search accounts" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search accounts" />
            <div className="seg" role="group" aria-label="View">
              <button type="button" aria-pressed={!prefs.compact} aria-label="Detailed view" title="Detailed view" onClick={() => setPref('compact', false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="4" width="16" height="7" rx="2" />
                  <rect x="4" y="13" width="16" height="7" rx="2" />
                </svg>
              </button>
              <button type="button" aria-pressed={prefs.compact} aria-label="Compact view" title="Compact view" onClick={() => setPref('compact', true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 6h14M5 10h14M5 14h14M5 18h14" />
                </svg>
              </button>
            </div>
            <button type="button" className={`fbtn${showFilters ? ' on' : ''}`} aria-expanded={showFilters} onClick={() => setShowFilters((s) => !s)}>
              Filters{activeFilters > 0 && <span className="cnt">{activeFilters}</span>}
            </button>
          </div>
          {showFilters && (
            <div className="panel">
              <label>
                Provider
                <select value={providerId} onChange={(e) => setPref('provider', e.target.value)}>
                  <option value="all">All providers</option>
                  {used.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              {tags.length > 0 && (
                <label>
                  Tag
                  <select value={tag} onChange={(e) => setPref('tag', e.target.value)}>
                    <option value="all">All tags</option>
                    {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              )}
              <label>
                Sort by
                <select value={prefs.sort} onChange={(e) => setPref('sort', e.target.value as SortKey)}>
                  <option value="status">Most urgent first</option>
                  <option value="reset">Soonest reset</option>
                  <option value="provider">Provider</option>
                </select>
              </label>
            </div>
          )}
          <div className="chips" role="group" aria-label="Filter by status">
            {chip('all', 'All', scoped.length)}
            {STATUS_ORDER.filter((s) => statusCounts[s] > 0 || prefs.status === s).map((s) => chip(s, STATUS_LABEL[s], statusCounts[s]))}
          </div>
        </div>
      )}

      {views.length === 0 ? (
        <div className="hero">
          <h2>Every quota, one place</h2>
          <p className="mut">Add an account, sign in where it is supported, and see usage and reset times for all of them together.</p>
          <button type="button" className="pri big" onClick={() => setPicking(true)}>Add your first account</button>
          <p className="mut sm">Sign-in supported for</p>
          <div className="quick">
            {signInProviders.map((p) => (
              <button key={p.id} type="button" className="qchip" onClick={() => setAcctForm(blankAccount(p.id))}>
                <ProviderAvatar provider={p} size={22} />
                {p.name}
              </button>
            ))}
          </div>
        </div>
      ) : groups.length === 0 ? (
        <div className="empty">
          Nothing matches these filters.
          <br />
          <button type="button" className="link" onClick={() => { setSearch(''); setPref('status', 'all'); setPref('provider', 'all'); setPref('tag', 'all'); }}>Clear filters</button>
        </div>
      ) : (
        groups.map(([provider, list]) => {
          const shut = prefs.collapsed.includes(provider.id);
          const live = list.filter((v) => v.account.active);
          const crit = live.filter((v) => statusOf(v) === 'critical').length;
          const low = live.filter((v) => statusOf(v) === 'alert').length;
          let soonest: Date | null = null;
          for (const v of live) {
            const d = soonestReset(v.windows, now);
            if (d && (!soonest || d < soonest)) soonest = d;
          }
          return (
            <section className="group" key={provider.id}>
              <div className="gh">
                <button type="button" className="ght" aria-expanded={!shut} onClick={() => toggleGroup(provider.id)}>
                  <span className="chev" aria-hidden="true">{shut ? '▸' : '▾'}</span>
                  <ProviderAvatar provider={provider} size={32} />
                  <span className="gtext">
                    <span className="gn">
                      {provider.name}
                      {provider.deprecated && <span className="badge warn">Ending</span>}
                      {provider.research?.availability === 'unclear' && <span className="badge warn">Unclear</span>}
                    </span>
                    <span className="gsub">
                      {list.length === 1 ? '1 account' : `${list.length} accounts`}
                      {crit > 0 && <span style={{ color: 'var(--bad)' }}> · {crit} critical</span>}
                      {low > 0 && <span style={{ color: 'var(--warn)' }}> · {low} low</span>}
                      {soonest && ` · resets in ${formatRemaining(soonest.getTime() - now.getTime())}`}
                    </span>
                  </span>
                </button>
                {provider.website && (
                  <a className="glink" href={provider.website} target="_blank" rel="noopener noreferrer" aria-label={`Open ${provider.name} website`} title={`Open ${provider.name} website`}>
                    <ExternalLinkIcon />
                  </a>
                )}
                <button type="button" className="gadd" aria-label={`Add account to ${provider.name}`} title={`Add account to ${provider.name}`} onClick={() => setAcctForm(blankAccount(provider.id))}>+</button>
              </div>
              {provider.deprecated && <p className="dep">{provider.deprecated}</p>}
              {provider.research?.availability === 'unclear' && <p className="dep">Availability unclear. {provider.research.evidence}</p>}
              {!shut &&
                list.map((v) => (
                  <AccountCard
                    key={v.account.id}
                    view={v}
                    now={now}
                    compact={prefs.compact}
                    onUsed={(w, u) => setUsed(v.account, w, u)}
                    onStart={(w) => startWindow(v.account, w)}
                    onReset={(w, iso) => setReset(v.account, w, iso)}
                    onToggleActive={() => saveAccount({ ...v.account, active: !v.account.active })}
                    onEdit={() => setAcctForm(v.account)}
                    onDuplicate={() => setAcctForm({ ...v.account, id: newId(), account: '', usage: {}, connection: undefined, syncedAt: undefined })}
                    onDelete={() => removeAccount(v.account)}
                    connectable={!!CONNECTOR_BY_PROVIDER[v.provider.id]}
                    syncError={syncErrors[v.account.id]}
                    syncing={busyIds.has(v.account.id)}
                    onConnect={() => setConnecting(v.account)}
                    onRefresh={() => void syncAccount(v.account.id)}
                    onDisconnect={() => {
                      disconnect(v.account.id);
                      push('Signed out. Quotas stay as last read.');
                    }}
                  />
                ))}
            </section>
          );
        })
      )}

      {views.length > 0 && (
        <p className="mut sm foot">
          Saved only in this browser. Add accounts and enter usage by hand, or connect a supported provider to read its quotas automatically.
        </p>
      )}

      <ToastHost toasts={toasts} dismiss={dismiss} />

      {picking && (
        <ProviderPicker
          providers={PROVIDERS.filter((p) => !p.deprecated)}
          counts={counts}
          signIn={new Set(Object.keys(CONNECTOR_BY_PROVIDER))}
          onPick={(id) => setAcctForm(blankAccount(id))}
          onClose={() => setPicking(false)}
        />
      )}
      {acctForm && (
        <AccountForm
          key={acctForm.id}
          initial={acctForm}
          providerName={PROVIDER_BY_ID.get(acctForm.providerId)?.name ?? 'provider'}
          plans={PROVIDER_BY_ID.get(acctForm.providerId)?.plans}
          isNew={!store.accounts.some((a) => a.id === acctForm.id)}
          tags={tags}
          onSave={(acct) => {
            const isNew = !store.accounts.some((x) => x.id === acct.id);
            saveAccount(acct);
            // A new GitHub Copilot, Claude, or Codex account goes straight to sign-in.
            if (isNew && CONNECTOR_BY_PROVIDER[acct.providerId]) setConnecting(acct);
          }}
          onClose={() => setAcctForm(null)}
        />
      )}
      {connecting && CONNECTOR_BY_PROVIDER[connecting.providerId] && PROVIDER_BY_ID.get(connecting.providerId) && (
        <ConnectAccountDialog
          key={connecting.id}
          account={connecting}
          provider={PROVIDER_BY_ID.get(connecting.providerId)!}
          kind={CONNECTOR_BY_PROVIDER[connecting.providerId]}
          onDone={(c) => finishConnect(connecting, c)}
          onClose={() => setConnecting(null)}
        />
      )}
      {showData && <DataDialog store={store} onChange={setStore} onClose={() => setShowData(false)} />}
    </main>
  );
}
