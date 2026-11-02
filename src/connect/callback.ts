import { call } from './client';
import { loadPending, PENDING_TTL_MS, type Pending } from './pending';

export type CallbackRead =
  | { status: 'none' }
  | { status: 'error'; message: string }
  | { status: 'ready'; pending: Pending; code: string };

/**
 * Looks at the address the page was opened with. A provider that redirects back to this app adds ?code=...&state=...;
 * the state must match a sign-in this browser started, and it must be recent.
 */
export function readCallback(search: string, now: number): CallbackRead {
  const params = new URLSearchParams(search);
  const code = params.get('code');
  const error = params.get('error');
  if (!params.has('state') || (!code && !error)) return { status: 'none' };
  if (error) return { status: 'error', message: `The provider reported: ${params.get('error_description') || error}` };
  const pending = loadPending();
  if (!pending || pending.state !== params.get('state')) {
    return { status: 'error', message: 'That sign-in did not start in this browser. Start it again from the account.' };
  }
  if (now - pending.at > PENDING_TTL_MS) return { status: 'error', message: 'That sign-in took too long. Start it again.' };
  return { status: 'ready', pending, code: code as string };
}

export interface Tokens {
  accessToken: string;
  refreshToken?: string;
  accountId?: string;
  email?: string;
  plan?: string;
  projectId?: string;
  profile?: 'ide' | 'cli';
}

/** Trades the code from the redirect for tokens, the same exchange the dialog does after a paste. */
export async function exchangeCallback(p: Pending, code: string, f?: Parameters<typeof call>[1]): Promise<Tokens> {
  if (p.kind === 'antigravity') {
    const profile = p.profile ?? 'ide';
    const t = await call<Tokens>({ action: 'google.exchange', code, profile, redirectUri: p.redirectUri }, f);
    return { ...t, profile };
  }
  if (p.kind === 'codex') return call<Tokens>({ action: 'codex.exchange', code, verifier: p.verifier }, f);
  throw new Error('This provider does not redirect back to the app.');
}
