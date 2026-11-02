import type { Account, ProviderConfig, Usage } from '../types';
import type { ConnectorKind, QuotaResult } from './providers';
import { deleteCreds, getCreds, setCreds, type Creds } from './creds';

export class ConnectError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** Calls this app's own sign-in proxy (api/connect.ts). */
export async function call<T = Record<string, unknown>>(
  payload: Record<string, unknown>,
  f: FetchLike = (u, i) => fetch(u, i),
): Promise<T> {
  let res: Response;
  try {
    res = await f('/api/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } catch {
    throw new ConnectError('Could not reach this app’s server. Sign-in needs the deployed site (or `vercel dev`), not a static preview.', 0);
  }
  let data: { ok?: boolean; error?: string } | null = null;
  try {
    data = await res.json();
  } catch {
    /* handled below */
  }
  if (!res.ok || !data || data.ok === false) {
    const hint = res.status === 404 ? 'This page has no sign-in server. Deploy to Vercel or run `vercel dev`.' : 'Request failed.';
    throw new ConnectError(data?.error ?? hint, res.status);
  }
  return data as T;
}

/** Turns a percent reading into our usage record, scaled to the window's size. */
export function readingToUsage(total: number, usedPercent: number, resetAt: string | null): Usage {
  const used = total > 0 ? Math.round(((usedPercent / 100) * total) * 100) / 100 : Math.round(usedPercent * 100) / 100;
  return { used, next: resetAt ?? undefined };
}

/** Writes a quota result onto an account. Windows the result does not cover are left as they were. */
export function applyResult(account: Account, provider: ProviderConfig, result: QuotaResult, kind: ConnectorKind, now: Date): Account {
  // A provider's plan decides how big a window is, so scale against the plan that will be in effect.
  const plan = provider.plans?.some((p) => p.name === result.plan) ? (result.plan as string) : account.plan || result.plan || '';
  const planSpec = provider.plans?.find((p) => p.name === plan) ?? provider.plans?.[0];
  const usage: Record<string, Usage> = { ...account.usage };
  for (const spec of provider.windows) {
    const r = result.windows[spec.id];
    if (r) usage[spec.id] = readingToUsage(planSpec?.totals?.[spec.id] ?? spec.total, r.usedPercent, r.resetAt);
  }
  return {
    ...account,
    usage,
    connection: kind,
    syncedAt: now.toISOString(),
    account: account.account || result.email || '',
    plan,
  };
}

/**
 * Reads quotas for a connected account, refreshing an expired sign-in once.
 * Throws ConnectError with status 401 when the person must connect again.
 */
export async function fetchQuota(accountId: string, f?: FetchLike): Promise<{ result: QuotaResult; kind: ConnectorKind }> {
  const creds = getCreds(accountId);
  if (!creds) throw new ConnectError('Not connected.', 401);
  const ask = (c: Creds) =>
    call<{ result: QuotaResult }>({ action: 'quota', kind: c.kind, accessToken: c.accessToken, accountId: c.accountId, projectId: c.projectId, profile: c.profile, profileArn: c.profileArn, deviceId: c.deviceId, external: c.idp ? true : undefined }, f);
  try {
    return { result: (await ask(creds)).result, kind: creds.kind };
  } catch (e) {
    if (!(e instanceof ConnectError) || e.status !== 401 || !creds.refreshToken || creds.kind === 'github' || creds.kind === 'manus' || creds.kind === 'kilocode') {
      if (e instanceof ConnectError && e.status === 401) deleteCreds(accountId);
      throw e;
    }
    try {
      const r = await call<{ accessToken: string; refreshToken?: string }>({ action: 'refresh', kind: creds.kind, refreshToken: creds.refreshToken, deviceId: creds.deviceId, idp: creds.idp }, f);
      const next: Creds = { ...creds, accessToken: r.accessToken, refreshToken: r.refreshToken ?? creds.refreshToken };
      setCreds(accountId, next);
      return { result: (await ask(next)).result, kind: creds.kind };
    } catch (e2) {
      if (e2 instanceof ConnectError && e2.status === 401) deleteCreds(accountId);
      throw e2;
    }
  }
}
