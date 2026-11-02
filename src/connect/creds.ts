import type { ConnectorKind } from './providers';

/** Sign-in tokens, kept apart from accounts so they are never part of a backup. */
export interface Creds {
  kind: ConnectorKind;
  accessToken: string;
  refreshToken?: string;
  /** Codex needs the ChatGPT account id on every request. */
  accountId?: string;
  /** Antigravity: the Google Cloud project the quotas are read from. */
  projectId?: string;
  /** Antigravity: which client the sign-in identifies as. */
  profile?: 'ide' | 'cli';
  /** Kiro: the AWS profile the quotas are read for. */
  profileArn?: string;
  /** Kimi: a stable id this browser uses to identify itself on every request. */
  deviceId?: string;
  /** Kiro organization sign-in: how to refresh the token at the organization's identity provider. */
  idp?: { clientId: string; tokenEndpoint: string; scope: string };
}

const KEY = 'quota-tracker-creds-v1';

function readAll(): Record<string, Creds> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, Creds>;
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, Creds>): void {
  try {
    if (Object.keys(all).length) localStorage.setItem(KEY, JSON.stringify(all));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the sign-in lasts until the page closes */
  }
}

export const getCreds = (accountId: string): Creds | undefined => readAll()[accountId];

export function setCreds(accountId: string, c: Creds): void {
  writeAll({ ...readAll(), [accountId]: c });
}

export function deleteCreds(accountId: string): void {
  const all = readAll();
  delete all[accountId];
  writeAll(all);
}

export const connectedIds = (): Set<string> => new Set(Object.keys(readAll()));
