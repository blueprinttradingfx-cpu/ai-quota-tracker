import { ANTIGRAVITY, CLAUDE, CODEX } from './server';

export function claudeAuthUrl(challenge: string, state: string): string {
  const p = new URLSearchParams({
    code: 'true', client_id: CLAUDE.clientId, response_type: 'code', redirect_uri: CLAUDE.redirectUri, scope: CLAUDE.scopes,
    code_challenge: challenge, code_challenge_method: 'S256', state, prompt: 'login',
  });
  return `${CLAUDE.authorizeUrl}?${p}`;
}

export function codexAuthUrl(challenge: string, state: string): string {
  const p = new URLSearchParams({
    response_type: 'code', client_id: CODEX.clientId, redirect_uri: CODEX.redirectUri, scope: CODEX.scope,
    code_challenge: challenge, code_challenge_method: 'S256', ...CODEX.extra, state,
  });
  return `${CODEX.authorizeUrl}?${p}`;
}

export function antigravityAuthUrl(state: string, redirectUri: string = ANTIGRAVITY.redirectUri): string {
  const p = new URLSearchParams({
    client_id: ANTIGRAVITY.clientId, response_type: 'code', redirect_uri: redirectUri, scope: ANTIGRAVITY.scopes.join(' '),
    state, access_type: 'offline', prompt: 'consent',
  });
  return `${ANTIGRAVITY.authorizeUrl}?${p}`;
}

/**
 * After signing in, the provider sends the browser to http://localhost:1455/auth/callback?code=...&state=...
 * That page does not load; the person copies the address. Accepts the full address or a bare query string.
 */
export function parseCallback(input: string, expectedState: string): { code: string } | { error: string } {
  const text = input.trim();
  if (!text) return { error: 'Paste the address from the browser.' };
  let params: URLSearchParams;
  try {
    params = new URL(text).searchParams;
  } catch {
    params = new URLSearchParams(text.startsWith('?') ? text.slice(1) : text);
  }
  const err = params.get('error');
  if (err) return { error: `The provider reported: ${params.get('error_description') || err}` };
  const code = params.get('code');
  if (!code) return { error: 'That address has no code in it. Copy the whole address after signing in.' };
  if (params.get('state') !== expectedState) return { error: 'That address belongs to a different sign-in. Start again.' };
  return { code };
}

/** Claude shows "code#state". The state part must match when present. */
export function parseClaudeCode(input: string, expectedState: string): { code: string } | { error: string } {
  const text = input.trim();
  if (!text) return { error: 'Paste the code Claude shows.' };
  const [code, state] = text.split('#');
  if (!code) return { error: 'Paste the code Claude shows.' };
  if (state && state !== expectedState) return { error: 'That code belongs to a different sign-in. Start again.' };
  return { code: text };
}

/** @deprecated Same parser; kept for the Codex flow. */
export const parseCodexCallback = parseCallback;

export interface Here {
  hostname: string;
  origin: string;
  port: string;
}

const isLoopback = (h: Here) => h.hostname === 'localhost' || h.hostname === '127.0.0.1';

/**
 * Where the provider should send the person afterwards. Google accepts any loopback address, so when the app itself runs on
 * localhost it can be the target and the sign-in finishes with no pasting. OpenAI only allows localhost:1455.
 */
export function redirectFor(kind: 'antigravity' | 'codex', here: Here): string {
  if (kind === 'antigravity') return isLoopback(here) ? `${here.origin}/auth/callback` : ANTIGRAVITY.redirectUri;
  return CODEX.redirectUri;
}

/** True when the redirect lands on this very app, so nothing has to be pasted. */
export function returnsToThisApp(kind: 'antigravity' | 'codex', here: Here): boolean {
  return redirectFor(kind, here).startsWith(here.origin);
}
