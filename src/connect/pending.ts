import type { ConnectorKind } from './providers';

/**
 * A sign-in that has been started but not finished. It is kept in localStorage so that the page the provider sends
 * the person back to (often a new tab, or the same app on another port) can finish what the original tab began.
 */
export interface Pending {
  kind: ConnectorKind;
  accountId: string;
  providerId: string;
  verifier: string;
  state: string;
  redirectUri: string;
  profile?: 'ide' | 'cli';
  at: number;
}

const KEY = 'quota-tracker-pending-v1';
export const PENDING_TTL_MS = 15 * 60 * 1000;

export function savePending(p: Pending): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* without storage, only the paste fallback works */
  }
}

export function loadPending(): Pending | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<Pending> | null;
    if (raw && typeof raw.state === 'string' && typeof raw.verifier === 'string' && typeof raw.accountId === 'string' && typeof raw.kind === 'string') {
      return raw as Pending;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearPending(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
