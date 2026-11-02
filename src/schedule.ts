import type { Account, Provider, QuotaWindow, Store, Usage, WindowSpec } from './types';

const HOUR = 36e5;

export function materialize(spec: WindowSpec, u?: Usage): QuotaWindow {
  return {
    ...spec,
    dom: u?.anchor && u.day ? u.day : spec.dom,
    used: u?.used ?? 0,
    next: u?.next,
    anchor: u?.anchor,
    last: u?.last,
  };
}

function parseTime(time?: string): [number, number] {
  const [h, m] = (time || '00:00').split(':').map(Number);
  return [Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0];
}

/**
 * Next reset from the provider's shared schedule, or null when it is set per account (or rolling).
 * A daily window needs a `time` to count as shared. With `utc` the time is read as UTC.
 */
export function scheduledNext(w: WindowSpec, from: Date): Date | null {
  const [h, m] = parseTime(w.time);
  switch (w.type) {
    case 'rolling':
      return null;
    case 'daily': {
      if (w.time == null) return null;
      const d = new Date(from);
      if (w.utc) {
        d.setUTCHours(h, m, 0, 0);
        if (d <= from) d.setUTCDate(d.getUTCDate() + 1);
      } else {
        d.setHours(h, m, 0, 0);
        if (d <= from) d.setDate(d.getDate() + 1);
      }
      return d;
    }
    case 'weekly': {
      if (w.dow == null) return null;
      const d = new Date(from);
      if (w.utc) {
        d.setUTCHours(h, m, 0, 0);
        d.setUTCDate(d.getUTCDate() + ((w.dow - d.getUTCDay() + 7) % 7));
        if (d <= from) d.setUTCDate(d.getUTCDate() + 7);
      } else {
        d.setHours(h, m, 0, 0);
        d.setDate(d.getDate() + ((w.dow - d.getDay() + 7) % 7));
        if (d <= from) d.setDate(d.getDate() + 7);
      }
      return d;
    }
    case 'monthly': {
      if (w.dom == null) return null;
      for (let i = 0; i < 3; i++) {
        if (w.utc) {
          const y = from.getUTCFullYear();
          const mo = from.getUTCMonth() + i;
          const dim = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
          const d = new Date(Date.UTC(y, mo, Math.min(w.dom, dim), h, m));
          if (d > from) return d;
        } else {
          const y = from.getFullYear();
          const mo = from.getMonth() + i;
          const dim = new Date(y, mo + 1, 0).getDate();
          const d = new Date(y, mo, Math.min(w.dom, dim), h, m);
          if (d > from) return d;
        }
      }
      return null;
    }
  }
}

/** Repeats the window's period from an entered reset date until it is in the future. */
export function stepFrom(w: QuotaWindow, base: Date, now: Date): Date {
  const day = w.dom ?? base.getDate();
  let d = new Date(base);
  for (let guard = 0; d <= now && guard < 5000; guard++) {
    if (w.type === 'daily') d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, d.getHours(), d.getMinutes());
    else if (w.type === 'weekly') d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7, d.getHours(), d.getMinutes());
    else if (w.type === 'monthly') {
      const y = d.getFullYear();
      const mo = d.getMonth() + 1;
      const dim = new Date(y, mo + 1, 0).getDate();
      d = new Date(y, mo, Math.min(day, dim), d.getHours(), d.getMinutes());
    } else return d;
  }
  return d;
}

/** The upcoming reset to display, or null when unknown (idle rolling window, or reset not set). */
export function resetDate(w: QuotaWindow, now: Date): Date | null {
  if (!w.next) return null;
  const d = new Date(w.next);
  return Number.isNaN(d.getTime()) || d <= now ? null : d;
}

/**
 * Applies a passed reset to one account's usage of one window.
 * Rolling windows go idle (the next one starts at first use). Same reference when unchanged.
 */
export function advanceUsage(spec: WindowSpec, u: Usage | undefined, now: Date): Usage | undefined {
  const w = materialize(spec, u);
  if (spec.type === 'rolling') {
    if (u?.next && new Date(u.next) <= now) return { used: 0, last: now.toISOString() };
    return u;
  }
  const hadNext = !!u?.next;
  if (hadNext && new Date(u!.next!) > now) return u;
  const n = u?.anchor && u.next ? stepFrom(w, new Date(u.next), now) : scheduledNext(spec, now);
  if (!hadNext) return n ? { ...(u ?? { used: 0 }), next: n.toISOString() } : u;
  return { ...u!, used: 0, last: now.toISOString(), next: n?.toISOString() };
}

export function advanceAccounts(providers: Provider[], accounts: Account[], now: Date): Account[] {
  const byId = new Map(providers.map((p) => [p.id, p]));
  let changed = false;
  const out = accounts.map((a) => {
    const p = byId.get(a.providerId);
    if (!p) return a;
    let usage = a.usage;
    for (const spec of p.windows) {
      const cur = a.usage[spec.id];
      const nu = advanceUsage(spec, cur, now);
      if (nu !== cur) {
        if (usage === a.usage) usage = { ...a.usage };
        if (nu) usage[spec.id] = nu;
        else delete usage[spec.id];
      }
    }
    if (usage === a.usage) return a;
    changed = true;
    return { ...a, usage };
  });
  return changed ? out : accounts;
}

export function advanceStore(providers: Provider[], s: Store, now: Date): Store {
  const accounts = advanceAccounts(providers, s.accounts, now);
  return accounts === s.accounts ? s : { accounts };
}

export function startRolling(spec: WindowSpec, now: Date): string {
  return new Date(now.getTime() + Math.max(spec.hours, 0.01) * HOUR).toISOString();
}

/** Soonest upcoming reset across some windows. */
export function soonestReset(windows: QuotaWindow[], now: Date): Date | null {
  let best: Date | null = null;
  for (const w of windows) {
    const d = resetDate(w, now);
    if (d && (!best || d < best)) best = d;
  }
  return best;
}
