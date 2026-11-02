import { parseAntigravity, parseClaude, parseCodex, parseCursor, parseGithub, parseGrok, parseKimi, parseKiloPass, parseKiro, parseManus, type ConnectorKind, type QuotaResult } from './providers';

/**
 * Server side of sign-in and quota reads. It runs in a Vercel function (api/connect.ts) because the providers'
 * login and usage endpoints do not allow browser requests. It keeps nothing: tokens pass through to the
 * provider and back, and only fixed provider hosts are ever contacted.
 *
 * The client ids below are the public ids of each vendor's own CLI/IDE apps, the same ones OmniRoute uses.
 * Signing in with them can be against a vendor's terms for third-party apps; the UI says so before connecting.
 */

export const GITHUB = {
  clientId: 'Iv1.b507a08c87ecfe98',
  deviceCodeUrl: 'https://github.com/login/device/code',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  usageUrl: 'https://api.github.com/copilot_internal/user',
  scope: 'read:user',
  apiVersion: '2026-08-01',
  version: '1.0.91',
};

export const CLAUDE = {
  clientId: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
  authorizeUrl: 'https://claude.ai/oauth/authorize',
  tokenUrl: 'https://api.anthropic.com/v1/oauth/token',
  redirectUri: 'https://platform.claude.com/oauth/code/callback',
  usageUrl: 'https://api.anthropic.com/api/oauth/usage',
  scopes: 'org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers',
  version: '2.1.0',
};

export const CODEX = {
  clientId: 'app_EMoamEEZ73f0CkXaXp7hrann',
  authorizeUrl: 'https://auth.openai.com/oauth/authorize',
  tokenUrl: 'https://auth.openai.com/oauth/token',
  redirectUri: 'http://localhost:1455/auth/callback',
  usageUrl: 'https://chatgpt.com/backend-api/wham/usage',
  scope: 'openid profile email offline_access',
  extra: { id_token_add_organizations: 'true', codex_cli_simplified_flow: 'true', originator: 'codex_cli_rs', prompt: 'login' },
};

/**
 * Sign in with Google for Antigravity and Antigravity CLI. The client id is the public id of Google's own
 * Antigravity app (installed-app flow). Its client secret is read from the ANTIGRAVITY_OAUTH_CLIENT_SECRET
 * environment variable so it is never committed; without it Google sign-in is switched off.
 */
/** Google installed apps may use any loopback address. Anything else falls back to the default. */
export function loopbackRedirect(raw: unknown): string | null {
  return typeof raw === 'string' && /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}\/[A-Za-z0-9/_-]{0,64}$/.test(raw) ? raw : null;
}

export const ANTIGRAVITY = {
  clientId: '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com',
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v1/userinfo',
  // Google accepts any loopback port for installed apps. The page does not load; the person copies its address.
  redirectUri: 'http://localhost:51121/callback',
  scopes: [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/cclog',
    'https://www.googleapis.com/auth/experimentsandconfigs',
  ],
  bootstrapHosts: ['https://cloudcode-pa.googleapis.com'],
  quotaHosts: ['https://daily-cloudcode-pa.googleapis.com', 'https://cloudcode-pa.googleapis.com'],
  metadata: { ideType: 9, platform: 3, pluginType: 2 },
  version: { ide: '2.5.5', cli: '1.3.4' },
};

export const CURSOR = {
  loginUrl: 'https://cursor.com/loginDeepControl',
  pollUrl: 'https://api2.cursor.sh/auth/poll',
  refreshUrl: 'https://api2.cursor.sh/auth/exchange_user_api_key',
  usageUrl: 'https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage',
};

export const KIRO = {
  clientId: 'kiro-cli',
  authorizeUrl: 'https://prod.us-east-1.auth.desktop.kiro.dev/oauth/device/authorization',
  pollUrl: 'https://prod.us-east-1.auth.desktop.kiro.dev/oauth/device/poll',
  refreshUrl: 'https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken',
  usageUrl: 'https://codewhisperer.us-east-1.amazonaws.com',
  qUsageUrl: 'https://q.us-east-1.amazonaws.com',
};

export const KILO = {
  codesUrl: 'https://api.kilo.ai/api/device-auth/codes',
  passUrl: 'https://api.kilo.ai/api/trpc/kiloPass.getState',
  editor: 'quota-tracker',
};

export const KIMI = {
  clientId: '17e5f671-d194-4dfb-9706-5516cb48c098',
  deviceUrl: 'https://auth.kimi.com/api/oauth/device_authorization',
  tokenUrl: 'https://auth.kimi.com/api/oauth/token',
  usageUrl: 'https://api.kimi.com/coding/v1/usages',
  version: '2.1.1',
};

export const GROK = {
  clientId: 'b1a00492-073a-47ea-816f-4c329264a828',
  deviceUrl: 'https://auth.x.ai/oauth2/device/code',
  tokenUrl: 'https://auth.x.ai/oauth2/token',
  scope: 'openid profile email offline_access grok-cli:access api:access conversations:read conversations:write workspaces:read workspaces:write',
  referrer: 'grok-build',
  proxyUrl: 'https://cli-chat-proxy.grok.com/v1',
  version: '1.0.41',
};

/** Kimi expects its CLI's identity headers on every request. */
const kimiHeaders = (deviceId: string): Record<string, string> => ({
  'User-Agent': `kimi-code-cli/${KIMI.version}`,
  'X-Msh-Platform': 'kimi_code_cli',
  'X-Msh-Version': KIMI.version,
  'X-Msh-Device-Name': 'quota-tracker',
  'X-Msh-Device-Model': 'web',
  'X-Msh-Os-Version': '1.0',
  'X-Msh-Device-Id': deviceId,
});

const grokHeaders = (token?: string, userId?: string): Record<string, string> => ({
  Accept: 'application/json',
  'x-grok-client-version': GROK.version,
  'x-grok-client-identifier': 'grok-shell',
  'x-grok-client-mode': 'headless',
  'User-Agent': `grok-shell/${GROK.version} (linux; x86_64)`,
  'X-XAI-Token-Auth': 'xai-grok-cli',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...(userId ? { 'x-userid': userId } : {}),
});

const form = (o: Record<string, string>) => new URLSearchParams(o);

/** Maps an OAuth device-flow poll answer onto the statuses the app understands. */
function deviceStatus(d: Record<string, unknown> | null): 'pending' | 'slow_down' | 'expired' | 'denied' | null {
  const e = d?.error;
  if (e === 'authorization_pending') return 'pending';
  if (e === 'slow_down') return 'slow_down';
  if (e === 'expired_token') return 'expired';
  if (e === 'access_denied') return 'denied';
  return null;
}

/**
 * Identity providers a Kiro "Your organization" (enterprise) sign-in can use. Microsoft Entra ID is the main one.
 * Same allowlist as OmniRoute, so a pasted token endpoint can only ever point at a real identity provider.
 */
const IDP_HOSTS = [
  'login.microsoftonline.com', 'login.microsoftonline.us', 'login.partner.microsoftonline.cn', 'login.microsoft.com',
  'login.windows.net', 'sts.windows.net', '.okta.com', '.oktapreview.com', '.okta-emea.com', '.auth0.com', '.onelogin.com',
  '.pingidentity.com', '.pingone.com', 'accounts.google.com', 'oauth2.googleapis.com', '.amazoncognito.com',
];

export function validateIdpEndpoint(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.toLowerCase();
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    return IDP_HOSTS.some((h) => (h.startsWith('.') ? host.endsWith(h) : host === h)) ? u.toString() : null;
  } catch {
    return null;
  }
}

const scopeText = (v: unknown): string =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string').join(' ').trim() : typeof v === 'string' ? v.trim() : '';

/** Manus's documented API. Needs an API key from the person's Manus developer settings. */
export const MANUS = { usageUrl: 'https://api.manus.ai/v2/usage.availableCredits' };

/** Reads the email out of a JWT access token without verifying it (it only labels the account). */
export function jwtEmail(token: unknown): string | undefined {
  if (typeof token !== 'string') return undefined;
  try {
    const part = token.split('.')[1];
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')));
    const e = payload.email ?? payload.preferred_username ?? payload.upn;
    return typeof e === 'string' ? e.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

type Profile = 'ide' | 'cli';
const antigravityUserAgent = (p: Profile) =>
  p === 'cli'
    ? `antigravity/cli/${ANTIGRAVITY.version.cli} (aidev_client; os_type=darwin; arch=arm64; auth_method=consumer)`
    : `antigravity/${ANTIGRAVITY.version.ide} darwin/arm64 google-api-nodejs-client/10.3.0`;

/** Headers for quota reads. */
const antigravityContentHeaders = (p: Profile, token: string) => ({
  'Content-Type': 'application/json',
  'User-Agent': p === 'cli' ? antigravityUserAgent('cli') : `antigravity/ide/${ANTIGRAVITY.version.ide} darwin/arm64`,
  Authorization: `Bearer ${token}`,
});

/** Headers for project discovery right after sign-in. */
const antigravityBootstrapHeaders = (p: Profile, token: string): Record<string, string> =>
  p === 'cli'
    ? antigravityContentHeaders('cli', token)
    : { 'Content-Type': 'application/json', 'User-Agent': antigravityUserAgent('ide'), 'X-Goog-Api-Client': 'gl-node/22.21.1', Authorization: `Bearer ${token}` };

function antigravityProjectId(data: unknown): string {
  const project = (data as { cloudaicompanionProject?: unknown } | null)?.cloudaicompanionProject;
  if (typeof project === 'string') return project;
  const id = (project as { id?: unknown } | null)?.id;
  return typeof id === 'string' ? id : '';
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
export type ServerEnv = { ANTIGRAVITY_OAUTH_CLIENT_SECRET?: string };

/** Picks the settings this server needs out of an environment, forgiving stray spaces and quotes around the value. */
export function resolveServerEnv(src: Record<string, string | undefined>): ServerEnv {
  const clean = (v: string | undefined) => {
    const t = (v ?? '').trim().replace(/^(['"])(.*)\1$/, '$2').trim();
    return t === '' ? undefined : t;
  };
  return { ANTIGRAVITY_OAUTH_CLIENT_SECRET: clean(src.ANTIGRAVITY_OAUTH_CLIENT_SECRET) };
}

const GOOGLE_NOT_SET_UP =
  'Google sign-in is not set up on this server. Add ANTIGRAVITY_OAUTH_CLIENT_SECRET: locally, put it in a file named .env.local (with the leading dot) next to package.json and restart npm run dev; on Vercel, add it under Project Settings, Environment Variables and redeploy.';
export interface Reply {
  status: number;
  body: Record<string, unknown>;
}

const fail = (status: number, error: string): Reply => ({ status, body: { ok: false, error } });
const ok = (body: Record<string, unknown>): Reply => ({ status: 200, body: { ok: true, ...body } });

const str = (v: unknown, max = 8192): string | null => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : null);
const KINDS: string[] = ['github', 'claude', 'codex', 'antigravity', 'cursor', 'kiro', 'manus', 'kilocode', 'kimi', 'grok'];
const isKind = (v: unknown): v is ConnectorKind => typeof v === 'string' && KINDS.includes(v);

async function json(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const githubHeaders = (token: string) => ({
  Authorization: `token ${token}`,
  Accept: 'application/json',
  'X-GitHub-Api-Version': GITHUB.apiVersion,
  'User-Agent': `GitHubCopilotChat/${GITHUB.version}`,
  'Editor-Version': `copilot/${GITHUB.version}`,
  'Editor-Plugin-Version': `copilot-chat/${GITHUB.version}`,
});

/** Reads the account id and email out of an OpenAI id_token without verifying it (it only labels the account). */
export function readIdToken(idToken: unknown): { accountId?: string; plan?: string; email?: string } {
  if (typeof idToken !== 'string') return {};
  try {
    const part = idToken.split('.')[1];
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')));
    const auth = payload['https://api.openai.com/auth'] ?? {};
    return { accountId: auth.chatgpt_account_id, plan: auth.chatgpt_plan_type, email: payload.email };
  } catch {
    return {};
  }
}

export async function handle(body: unknown, f: FetchLike = (u, i) => fetch(u, i), now = new Date(), env: ServerEnv = {}): Promise<Reply> {
  if (!body || typeof body !== 'object') return fail(400, 'Bad request.');
  const b = body as Record<string, unknown>;
  try {
    switch (b.action) {
      case 'github.start': {
        const res = await f(GITHUB.deviceCodeUrl, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: GITHUB.clientId, scope: GITHUB.scope }),
        });
        const d = (await json(res)) as Record<string, unknown> | null;
        if (!res.ok || !d?.device_code) return fail(502, 'GitHub did not start the sign-in.');
        return ok({
          deviceCode: d.device_code, userCode: d.user_code, verificationUri: d.verification_uri,
          expiresIn: d.expires_in, interval: d.interval,
        });
      }
      case 'github.poll': {
        const deviceCode = str(b.deviceCode);
        if (!deviceCode) return fail(400, 'Missing device code.');
        const res = await f(GITHUB.tokenUrl, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GITHUB.clientId, device_code: deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          }),
        });
        const d = (await json(res)) as Record<string, unknown> | null;
        if (typeof d?.access_token === 'string') return ok({ status: 'ok', accessToken: d.access_token });
        const e = d?.error;
        if (e === 'authorization_pending') return ok({ status: 'pending' });
        if (e === 'slow_down') return ok({ status: 'slow_down' });
        if (e === 'expired_token') return ok({ status: 'expired' });
        if (e === 'access_denied') return ok({ status: 'denied' });
        return fail(502, 'GitHub returned an unexpected answer.');
      }
      case 'claude.exchange': {
        const raw = str(b.code);
        const verifier = str(b.verifier);
        const state = str(b.state) ?? '';
        if (!raw || !verifier) return fail(400, 'Missing code.');
        // The page shows "code#state"; paste either form.
        const [code, codeState] = raw.trim().split('#');
        const res = await f(CLAUDE.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            code, state: codeState || state, grant_type: 'authorization_code', client_id: CLAUDE.clientId,
            redirect_uri: CLAUDE.redirectUri, code_verifier: verifier,
          }),
        });
        const d = (await json(res)) as Record<string, unknown> | null;
        if (!res.ok || typeof d?.access_token !== 'string') return fail(400, 'Claude did not accept that code. Start again and paste the new one.');
        return ok({ accessToken: d.access_token, refreshToken: d.refresh_token, expiresIn: d.expires_in });
      }
      case 'codex.exchange': {
        const code = str(b.code);
        const verifier = str(b.verifier);
        if (!code || !verifier) return fail(400, 'Missing code.');
        const res = await f(CODEX.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body: new URLSearchParams({
            grant_type: 'authorization_code', client_id: CODEX.clientId, code, redirect_uri: CODEX.redirectUri, code_verifier: verifier,
          }),
        });
        const d = (await json(res)) as Record<string, unknown> | null;
        if (!res.ok || typeof d?.access_token !== 'string') return fail(400, 'OpenAI did not accept that address. Start again and paste the new one.');
        const id = readIdToken(d.id_token);
        return ok({ accessToken: d.access_token, refreshToken: d.refresh_token, expiresIn: d.expires_in, accountId: id.accountId, email: id.email, plan: id.plan });
      }
      case 'google.exchange': {
        const secret = env.ANTIGRAVITY_OAUTH_CLIENT_SECRET;
        if (!secret) return fail(503, GOOGLE_NOT_SET_UP);
        const code = str(b.code);
        const profile: Profile = b.profile === 'cli' ? 'cli' : 'ide';
        if (!code) return fail(400, 'Missing code.');
        const res = await f(ANTIGRAVITY.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'User-Agent': antigravityUserAgent(profile) },
          body: new URLSearchParams({
            grant_type: 'authorization_code', client_id: ANTIGRAVITY.clientId, client_secret: secret, code, redirect_uri: loopbackRedirect(b.redirectUri) ?? ANTIGRAVITY.redirectUri,
          }),
        });
        const d = (await json(res)) as Record<string, unknown> | null;
        if (!res.ok || typeof d?.access_token !== 'string') return fail(400, 'Google did not accept that address. Start again and paste the new one.');
        const token = d.access_token;
        // Who signed in, and which Cloud project their quotas belong to.
        const info = await f(`${ANTIGRAVITY.userInfoUrl}?alt=json`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
        const email = info?.ok ? ((await json(info)) as { email?: string } | null)?.email : undefined;
        let projectId = '';
        for (const host of ANTIGRAVITY.bootstrapHosts) {
          try {
            const r = await f(`${host}/v1internal:loadCodeAssist`, {
              method: 'POST', headers: antigravityBootstrapHeaders(profile, token), body: JSON.stringify({ metadata: ANTIGRAVITY.metadata }),
            });
            if (r.ok) {
              projectId = antigravityProjectId(await json(r));
              if (projectId) break;
            }
          } catch {
            /* try the next host */
          }
        }
        return ok({ accessToken: token, refreshToken: d.refresh_token, expiresIn: d.expires_in, email, projectId, profile });
      }
      case 'cursor.poll': {
        const uuid = str(b.uuid, 128);
        const verifier = str(b.verifier, 256);
        if (!uuid || !verifier) return fail(400, 'Missing sign-in details.');
        const res = await f(`${CURSOR.pollUrl}?uuid=${encodeURIComponent(uuid)}&verifier=${encodeURIComponent(verifier)}`);
        if (res.status === 404) return ok({ status: 'pending' });
        const d = (await json(res)) as Record<string, unknown> | null;
        if (!res.ok || typeof d?.accessToken !== 'string' || typeof d?.refreshToken !== 'string') return fail(502, 'Cursor did not finish the sign-in.');
        return ok({ status: 'ok', accessToken: d.accessToken, refreshToken: d.refreshToken, email: jwtEmail(d.accessToken) });
      }
      case 'kiro.start': {
        const loginProvider = b.loginProvider === 'Github' ? 'Github' : 'Google';
        const res = await f(KIRO.authorizeUrl, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: KIRO.clientId, loginProvider }),
        });
        const d = (await json(res)) as Record<string, unknown> | null;
        if (!res.ok || typeof d?.deviceCode !== 'string') return fail(502, 'Kiro did not start the sign-in.');
        return ok({
          deviceCode: d.deviceCode, userCode: d.userCode, authUrl: d.verificationUriComplete,
          expiresIn: Math.floor((Number(d.expiresInMilliseconds) || 300000) / 1000), interval: Math.floor((Number(d.intervalInMilliseconds) || 5000) / 1000),
        });
      }
      case 'kiro.poll': {
        const deviceCode = str(b.deviceCode);
        if (!deviceCode) return fail(400, 'Missing device code.');
        const res = await f(KIRO.pollUrl, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceCode, clientId: KIRO.clientId }),
        });
        const d = (await json(res)) as Record<string, unknown> | null;
        const progress = d?.error ?? d?.status;
        if (progress === 'authorization_pending') return ok({ status: 'pending' });
        if (progress === 'slow_down') return ok({ status: 'slow_down' });
        if (!res.ok || d?.error) return fail(400, 'Kiro sign-in failed or was cancelled. Start again.');
        if (typeof d?.accessToken !== 'string') return fail(502, 'Kiro returned an unexpected answer.');
        return ok({ status: 'ok', accessToken: d.accessToken, refreshToken: d.refreshToken, profileArn: d.profileArn, email: jwtEmail(d.accessToken) });
      }
      case 'kiro.import': {
        const refreshToken = str(b.refreshToken, 8192);
        const clientId = str(b.clientId, 256);
        const endpoint = validateIdpEndpoint(b.tokenEndpoint);
        const scope = scopeText(b.scope ?? b.scopes);
        if (!refreshToken || !clientId || !scope) return fail(400, 'The sign-in details need a refresh token, client id, and scopes.');
        if (!endpoint) return fail(400, 'The token endpoint must be an https address on a known identity provider such as login.microsoftonline.com.');
        const res = await f(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body: form({ grant_type: 'refresh_token', client_id: clientId, refresh_token: refreshToken, scope }),
        });
        const d = (await json(res)) as Record<string, unknown> | null;
        if (!res.ok || typeof d?.access_token !== 'string') return fail(400, 'Your organization’s sign-in rejected that refresh token. Sign in to Kiro again and copy the new details.');
        return ok({
          accessToken: d.access_token, refreshToken: d.refresh_token ?? refreshToken, email: jwtEmail(d.access_token),
          profileArn: str(b.profileArn, 512) ?? undefined, idp: { clientId, tokenEndpoint: endpoint, scope },
        });
      }
      case 'kilo.start': {
        const res = await f(KILO.codesUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        if (res.status === 429) return fail(429, 'Kilo has too many pending sign-ins. Try again in a few minutes.');
        const d = (await json(res)) as Record<string, unknown> | null;
        if (!res.ok || typeof d?.code !== 'string') return fail(502, 'Kilo did not start the sign-in.');
        return ok({ deviceCode: d.code, userCode: d.code, authUrl: d.verificationUrl, expiresIn: Number(d.expiresIn) || 300, interval: 3 });
      }
      case 'kilo.poll': {
        const code = str(b.deviceCode, 128);
        if (!code) return fail(400, 'Missing code.');
        const res = await f(`${KILO.codesUrl}/${encodeURIComponent(code)}`);
        if (res.status === 202) return ok({ status: 'pending' });
        if (res.status === 403) return ok({ status: 'denied' });
        if (res.status === 410) return ok({ status: 'expired' });
        const d = (await json(res)) as Record<string, unknown> | null;
        if (!res.ok) return fail(502, 'Kilo returned an unexpected answer.');
        if (d?.status === 'approved' && typeof d.token === 'string') return ok({ status: 'ok', accessToken: d.token, email: typeof d.userEmail === 'string' ? d.userEmail : undefined });
        return ok({ status: 'pending' });
      }
      case 'kimi.start': {
        const deviceId = str(b.deviceId, 128);
        if (!deviceId) return fail(400, 'Missing device id.');
        const res = await f(KIMI.deviceUrl, {
          method: 'POST', headers: { ...kimiHeaders(deviceId), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: form({ client_id: KIMI.clientId }),
        });
        const d = (await json(res)) as Record<string, unknown> | null;
        if (!res.ok || typeof d?.device_code !== 'string') return fail(502, 'Kimi did not start the sign-in.');
        return ok({ deviceCode: d.device_code, userCode: d.user_code, authUrl: d.verification_uri_complete ?? d.verification_uri, expiresIn: Number(d.expires_in) || 600, interval: Number(d.interval) || 5 });
      }
      case 'kimi.poll': {
        const deviceCode = str(b.deviceCode);
        const deviceId = str(b.deviceId, 128);
        if (!deviceCode || !deviceId) return fail(400, 'Missing sign-in details.');
        const res = await f(KIMI.tokenUrl, {
          method: 'POST', headers: { ...kimiHeaders(deviceId), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body: form({ client_id: KIMI.clientId, device_code: deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }),
        });
        const d = (await json(res)) as Record<string, unknown> | null;
        if (typeof d?.access_token === 'string') return ok({ status: 'ok', accessToken: d.access_token, refreshToken: d.refresh_token, email: jwtEmail(d.access_token) });
        const s = deviceStatus(d);
        if (s) return ok({ status: s });
        return fail(502, 'Kimi returned an unexpected answer.');
      }
      case 'grok.start': {
        const res = await f(GROK.deviceUrl, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'x-grok-client-version': GROK.version, 'x-grok-client-surface': 'ui' },
          body: form({ client_id: GROK.clientId, scope: GROK.scope, referrer: GROK.referrer }),
        });
        const d = (await json(res)) as Record<string, unknown> | null;
        if (!res.ok || typeof d?.device_code !== 'string' || typeof d?.user_code !== 'string') return fail(502, 'xAI did not start the sign-in.');
        const uri = String(d.verification_uri_complete ?? d.verification_uri ?? '');
        // Only ever hand back an x.ai address, so a bad response cannot send the person elsewhere.
        if (!/^https:\/\/([a-z0-9-]+\.)*x\.ai(\/|$)/i.test(uri) && !/^https:\/\/([a-z0-9-]+\.)*grok\.com(\/|$)/i.test(uri)) return fail(502, 'xAI returned an unexpected sign-in address.');
        return ok({ deviceCode: d.device_code, userCode: d.user_code, authUrl: uri, expiresIn: Number(d.expires_in) || 1800, interval: Number(d.interval) || 5 });
      }
      case 'grok.poll': {
        const deviceCode = str(b.deviceCode);
        if (!deviceCode) return fail(400, 'Missing code.');
        const res = await f(GROK.tokenUrl, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'x-grok-client-version': GROK.version, 'x-grok-client-surface': 'ui' },
          body: form({ client_id: GROK.clientId, device_code: deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }),
        });
        const d = (await json(res)) as Record<string, unknown> | null;
        if (typeof d?.access_token === 'string') return ok({ status: 'ok', accessToken: d.access_token, refreshToken: d.refresh_token, email: jwtEmail(d.id_token) ?? jwtEmail(d.access_token) });
        const s = deviceStatus(d);
        if (s) return ok({ status: s });
        return fail(502, 'xAI returned an unexpected answer.');
      }
      case 'refresh': {
        const refreshToken = str(b.refreshToken);
        if (!refreshToken || (b.kind !== 'claude' && b.kind !== 'codex' && b.kind !== 'antigravity' && b.kind !== 'cursor' && b.kind !== 'kiro' && b.kind !== 'kimi' && b.kind !== 'grok')) return fail(400, 'Cannot refresh this sign-in.');
        if (b.kind === 'antigravity' && !env.ANTIGRAVITY_OAUTH_CLIENT_SECRET) return fail(503, GOOGLE_NOT_SET_UP);
        const idp = b.kind === 'kiro' && b.idp && typeof b.idp === 'object' ? (b.idp as Record<string, unknown>) : null;
        const idpEndpoint = idp ? validateIdpEndpoint(idp.tokenEndpoint) : null;
        if (idp && !idpEndpoint) return fail(400, 'Cannot refresh this sign-in.');
        const res =
          idp && idpEndpoint
            ? await f(idpEndpoint, {
                method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
                body: form({ grant_type: 'refresh_token', client_id: String(idp.clientId ?? ''), refresh_token: refreshToken, scope: scopeText(idp.scope) }),
              })
            : b.kind === 'kimi'
            ? await f(KIMI.tokenUrl, {
                method: 'POST', headers: { ...kimiHeaders(str(b.deviceId, 128) ?? 'unknown'), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
                body: form({ grant_type: 'refresh_token', client_id: KIMI.clientId, refresh_token: refreshToken }),
              })
            : b.kind === 'grok'
              ? await f(GROK.tokenUrl, {
                  method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'x-grok-client-version': GROK.version },
                  body: form({ grant_type: 'refresh_token', client_id: GROK.clientId, refresh_token: refreshToken }),
                })
              : b.kind === 'cursor'
            ? await f(CURSOR.refreshUrl, { method: 'POST', headers: { Authorization: `Bearer ${refreshToken}`, 'Content-Type': 'application/json' }, body: '{}' })
            : b.kind === 'kiro'
              ? await f(KIRO.refreshUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ refreshToken }) })
              : b.kind === 'antigravity'
            ? await f(ANTIGRAVITY.tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
                body: new URLSearchParams({
                  grant_type: 'refresh_token', refresh_token: refreshToken, client_id: ANTIGRAVITY.clientId, client_secret: env.ANTIGRAVITY_OAUTH_CLIENT_SECRET as string,
                }),
              })
            : b.kind === 'claude'
            ? await f(CLAUDE.tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: CLAUDE.clientId }),
              })
            : await f(CODEX.tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
                body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: CODEX.clientId, scope: CODEX.scope }),
              });
        const d = (await json(res)) as Record<string, unknown> | null;
        // Cursor and Kiro answer in camelCase, Google, Claude, and OpenAI in snake_case.
        const access = d?.access_token ?? d?.accessToken;
        if (!res.ok || typeof access !== 'string') return fail(401, 'The sign-in expired. Connect the account again.');
        return ok({ accessToken: access, refreshToken: d?.refresh_token ?? d?.refreshToken ?? refreshToken, expiresIn: d?.expires_in ?? d?.expiresIn });
      }
      case 'quota': {
        const token = str(b.accessToken);
        if (!token || !isKind(b.kind)) return fail(400, 'Missing sign-in.');
        let res: Response;
        let result: QuotaResult;
        if (b.kind === 'github') {
          res = await f(GITHUB.usageUrl, { headers: githubHeaders(token) });
          if (res.ok) result = parseGithub(await json(res));
          else return fail(res.status === 401 || res.status === 403 ? 401 : 502, 'GitHub would not return Copilot usage for this sign-in.');
        } else if (b.kind === 'claude') {
          res = await f(CLAUDE.usageUrl, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': `claude-code/${CLAUDE.version}`, 'anthropic-beta': 'oauth-2025-04-20' },
          });
          if (res.ok) result = parseClaude(await json(res));
          else return fail(res.status === 401 || res.status === 403 ? 401 : res.status === 429 ? 429 : 502, res.status === 429 ? 'Claude is rate limiting usage checks. Try again in a few minutes.' : 'Claude would not return usage for this sign-in.');
        } else if (b.kind === 'kilocode') {
          const params = new URLSearchParams({ batch: '1', input: JSON.stringify({ '0': null }) });
          res = await f(`${KILO.passUrl}?${params}`, {
            headers: { Authorization: `Bearer ${token}`, 'X-KILOCODE-EDITORNAME': KILO.editor, 'Content-Type': 'application/json', Accept: 'application/json' },
          });
          if (!res.ok) return fail(res.status === 401 || res.status === 403 ? 401 : 502, 'Kilo would not return usage for this sign-in.');
          result = parseKiloPass(await json(res));
        } else if (b.kind === 'kimi') {
          const deviceId = str(b.deviceId, 128);
          if (!deviceId) return fail(400, 'Missing device id.');
          res = await f(KIMI.usageUrl, { headers: { ...kimiHeaders(deviceId), Authorization: `Bearer ${token}`, Accept: 'application/json' } });
          if (!res.ok) return fail(res.status === 401 || res.status === 403 ? 401 : 502, 'Kimi would not return usage for this sign-in.');
          result = parseKimi(await json(res));
        } else if (b.kind === 'grok') {
          const userRes = await f(`${GROK.proxyUrl}/user?include=subscription`, { headers: grokHeaders(token) });
          if (userRes.status === 401 || userRes.status === 403) return fail(401, 'xAI rejected this sign-in.');
          const user = userRes.ok ? ((await json(userRes)) as Record<string, unknown> | null) : null;
          const userId = typeof user?.userId === 'string' ? user.userId : undefined;
          res = await f(`${GROK.proxyUrl}/billing?format=credits`, { headers: grokHeaders(token, userId) });
          if (!res.ok) return fail(res.status === 401 || res.status === 403 ? 401 : 502, 'xAI would not return billing for this sign-in.');
          result = parseGrok(await json(res), user);
        } else if (b.kind === 'manus') {
          res = await f(MANUS.usageUrl, { headers: { 'x-manus-api-key': token, Accept: 'application/json' } });
          if (!res.ok) return fail(res.status === 401 || res.status === 403 ? 401 : res.status === 429 ? 429 : 502, res.status === 401 || res.status === 403 ? 'Manus rejected that API key.' : 'Manus would not return credits right now.');
          result = parseManus(await json(res));
        } else if (b.kind === 'cursor') {
          res = await f(CURSOR.usageUrl, {
            method: 'POST',
            headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Connect-Protocol-Version': '1', 'User-Agent': 'quota-tracker' },
            body: '{}',
          });
          if (!res.ok) return fail(res.status === 401 || res.status === 403 ? 401 : 502, 'Cursor would not return usage for this sign-in.');
          result = parseCursor(await json(res));
        } else if (b.kind === 'kiro') {
          const profileArn = str(b.profileArn, 512);
          const auth: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
          // Organization (Microsoft Entra and similar) sign-ins must say so, or Kiro rejects the profile.
          if (b.external === true) auth.TokenType = 'EXTERNAL_IDP';
          const payload = { origin: 'AI_EDITOR', ...(profileArn ? { profileArn } : {}), resourceType: 'AGENTIC_REQUEST' };
          const params = new URLSearchParams({ origin: 'AI_EDITOR', ...(profileArn ? { profileArn } : {}), resourceType: 'AGENTIC_REQUEST', isEmailRequired: 'true' });
          const attempts: (() => Promise<Response>)[] = [
            () => f(KIRO.usageUrl, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/x-amz-json-1.0', 'x-amz-target': 'AmazonCodeWhispererService.GetUsageLimits' }, body: JSON.stringify(payload) }),
            () => f(`${KIRO.usageUrl}/getUsageLimits?${params}`, { headers: { ...auth, 'x-amz-user-agent': 'aws-sdk-js/1.0.0 KiroIDE', 'user-agent': 'aws-sdk-js/1.0.0 KiroIDE' } }),
            () => f(`${KIRO.qUsageUrl}/getUsageLimits?${params}`, { headers: auth }),
          ];
          let data: unknown = null;
          let status = 502;
          for (const run of attempts) {
            try {
              const r = await run();
              if (r.ok) {
                data = await json(r);
                status = 200;
                break;
              }
              status = r.status;
            } catch {
              /* try the next endpoint */
            }
          }
          if (status !== 200) return fail(status === 401 || status === 403 ? 401 : 502, 'Kiro would not return usage for this sign-in.');
          result = parseKiro(data);
        } else if (b.kind === 'antigravity') {
          const profile: Profile = b.profile === 'cli' ? 'cli' : 'ide';
          const projectId = str(b.projectId, 256);
          let data: unknown = null;
          let status = 502;
          for (const host of ANTIGRAVITY.quotaHosts) {
            try {
              const r = await f(`${host}/v1internal:retrieveUserQuotaSummary`, {
                method: 'POST', headers: antigravityContentHeaders(profile, token), body: JSON.stringify(projectId ? { project: projectId } : {}),
              });
              if (r.ok) {
                data = await json(r);
                status = 200;
                break;
              }
              status = r.status;
            } catch {
              /* try the next host */
            }
          }
          if (status !== 200) return fail(status === 401 || status === 403 ? 401 : 502, 'Google would not return Antigravity usage for this sign-in.');
          result = parseAntigravity(data);
        } else {
          const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
          const accountId = str(b.accountId, 256);
          if (accountId) headers['chatgpt-account-id'] = accountId;
          res = await f(CODEX.usageUrl, { headers });
          if (res.ok) result = parseCodex(await json(res), now);
          else return fail(res.status === 401 || res.status === 403 ? 401 : 502, 'ChatGPT would not return Codex usage for this sign-in.');
        }
        return ok({ result });
      }
      default:
        return fail(400, 'Unknown action.');
    }
  } catch {
    return fail(502, 'Could not reach the provider.');
  }
}
