import { useEffect, useRef, useState } from 'react';
import type { Account, ProviderConfig } from '../types';
import { ANTIGRAVITY_PROFILE, type ConnectorKind, type QuotaResult } from '../connect/providers';
import { call, ConnectError } from '../connect/client';
import { antigravityAuthUrl, claudeAuthUrl, codexAuthUrl, parseCallback, parseClaudeCode, redirectFor, returnsToThisApp } from '../connect/auth';
import { savePending } from '../connect/pending';
import { getCreds } from '../connect/creds';
import { newPkce } from '../connect/pkce';
import { CURSOR } from '../connect/server';

export interface Connected {
  accessToken: string;
  refreshToken?: string;
  accountId?: string;
  email?: string;
  plan?: string;
  projectId?: string;
  profile?: 'ide' | 'cli';
  profileArn?: string;
  deviceId?: string;
  idp?: { clientId: string; tokenEndpoint: string; scope: string };
  result: QuotaResult;
}

interface Props {
  account: Account;
  provider: ProviderConfig;
  kind: ConnectorKind;
  onDone: (c: Connected) => void;
  onClose: () => void;
}

type Tokens = Omit<Connected, 'result'>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TITLE: Record<ConnectorKind, string> = {
  github: 'GitHub', claude: 'Claude', codex: 'ChatGPT', antigravity: 'Google', cursor: 'Cursor', kiro: 'Kiro', manus: 'Manus',
  kilocode: 'Kilo Code', kimi: 'Kimi', grok: 'xAI',
};
/** Providers that sign in with a code and a poll, and the prefix of their server actions. */
const DEVICE_PREFIX: Partial<Record<ConnectorKind, string>> = { github: 'github', kiro: 'kiro', kilocode: 'kilo', kimi: 'kimi', grok: 'grok' };
/** Providers with an official way for apps to read credits need no warning. */
const OFFICIAL: ConnectorKind[] = ['manus'];

export default function ConnectAccountDialog({ account, provider, kind, onDone, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const alive = useRef(true);
  const pkce = useRef<{ verifier: string; challenge: string; state: string } | null>(null);
  const deviceId = useRef(crypto.randomUUID());
  const redirect = useRef('');
  const [selfReturn, setSelfReturn] = useState(false);
  const [agreed, setAgreed] = useState(OFFICIAL.includes(kind));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [device, setDevice] = useState<{ userCode: string; uri: string } | null>(null);
  const [authUrl, setAuthUrl] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [pasted, setPasted] = useState('');
  const [kiroVia, setKiroVia] = useState<'Google' | 'Github' | 'Org'>('Google');
  const [orgArn, setOrgArn] = useState('');

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    // The provider may send the person back to a different tab of this app, which finishes the sign-in itself.
    const onStorage = () => {
      if (getCreds(account.id)) ref.current?.close();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      alive.current = false;
      window.removeEventListener('storage', onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fail = (e: unknown) => {
    setBusy(false);
    setWaiting(false);
    setError(e instanceof ConnectError ? e.message : 'Something went wrong. Try again.');
  };

  /** With a token in hand, read the quotas and hand everything back. */
  const finish = async (tokens: Tokens) => {
    try {
      const { result } = await call<{ result: QuotaResult }>({
        action: 'quota', kind, accessToken: tokens.accessToken, accountId: tokens.accountId, projectId: tokens.projectId,
        profile: tokens.profile, profileArn: tokens.profileArn, deviceId: tokens.deviceId, external: tokens.idp ? true : undefined,
      });
      if (!alive.current) return;
      onDone({ ...tokens, result });
      ref.current?.close();
    } catch (e) {
      if (alive.current) fail(e);
    }
  };

  /** GitHub, Kiro, Kilo Code, Kimi, and Grok: show a code, then poll until it is approved. */
  const startDevice = async () => {
    setError('');
    setBusy(true);
    const prefix = DEVICE_PREFIX[kind];
    if (!prefix) return;
    try {
      const s = await call<{ deviceCode: string; userCode: string; verificationUri?: string; authUrl?: string; expiresIn: number; interval: number }>({
        action: `${prefix}.start`, loginProvider: kiroVia === 'Org' ? 'Google' : kiroVia, deviceId: deviceId.current,
      });
      const uri = s.verificationUri ?? s.authUrl ?? '';
      setDevice({ userCode: s.userCode, uri });
      if (kind !== 'github' && uri) window.open(uri, '_blank', 'noopener');
      let wait = Math.max(3, Number(s.interval) || 5);
      const until = Date.now() + (Number(s.expiresIn) || 600) * 1000;
      while (alive.current && Date.now() < until) {
        await sleep(wait * 1000);
        if (!alive.current) return;
        const p = await call<{ status: string; accessToken?: string; refreshToken?: string; profileArn?: string; email?: string }>({
          action: `${prefix}.poll`, deviceCode: s.deviceCode, deviceId: deviceId.current,
        });
        if (p.status === 'ok' && p.accessToken) {
          return void (await finish({ accessToken: p.accessToken, refreshToken: p.refreshToken, profileArn: p.profileArn, email: p.email, deviceId: kind === 'kimi' ? deviceId.current : undefined }));
        }
        if (p.status === 'slow_down') wait += 5;
        if (p.status === 'expired') throw new ConnectError('The code expired. Start again.', 400);
        if (p.status === 'denied') throw new ConnectError('Sign-in was cancelled.', 400);
      }
      if (alive.current) throw new ConnectError('The code expired. Start again.', 400);
    } catch (e) {
      if (alive.current) fail(e);
    }
  };

  /** Kiro "Your organization" (Microsoft Entra and similar): the details come from the Kiro app's own files. */
  const importOrg = async () => {
    setError('');
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(pasted);
    } catch {
      return setError('That is not valid JSON. Paste the whole contents of kiro-auth-token.json.');
    }
    const refreshToken = typeof parsed.refreshToken === 'string' ? parsed.refreshToken : '';
    const clientId = typeof parsed.clientId === 'string' ? parsed.clientId : '';
    const tokenEndpoint = typeof parsed.tokenEndpoint === 'string' ? parsed.tokenEndpoint : '';
    const scope = Array.isArray(parsed.scopes) ? parsed.scopes.join(' ') : typeof parsed.scope === 'string' ? parsed.scope : typeof parsed.scopes === 'string' ? parsed.scopes : '';
    const profileArn = orgArn.trim() || (typeof parsed.profileArn === 'string' ? parsed.profileArn : '');
    if (!refreshToken || !clientId || !tokenEndpoint || !scope) return setError('The file needs refreshToken, clientId, tokenEndpoint, and scopes. Make sure you signed in with “Your organization”.');
    if (!profileArn) return setError('Add the profile ARN from Kiro’s profile.json.');
    setBusy(true);
    try {
      // Only what the server needs is sent. The access token in the file is ignored.
      const t = await call<{ accessToken: string; refreshToken?: string; email?: string; profileArn?: string; idp: { clientId: string; tokenEndpoint: string; scope: string } }>({
        action: 'kiro.import', refreshToken, clientId, tokenEndpoint, scope, profileArn,
      });
      await finish(t);
    } catch (e) {
      fail(e);
    }
  };

  /** Cursor: sign in on cursor.com, no code to copy; this window polls until Cursor confirms. */
  const startCursor = async () => {
    setError('');
    const p = await newPkce();
    const uuid = crypto.randomUUID();
    const url = `${CURSOR.loginUrl}?${new URLSearchParams({ challenge: p.challenge, uuid, mode: 'login', redirectTarget: 'cli' })}`;
    setAuthUrl(url);
    setWaiting(true);
    window.open(url, '_blank', 'noopener');
    try {
      const until = Date.now() + 5 * 60 * 1000;
      while (alive.current && Date.now() < until) {
        await sleep(3000);
        if (!alive.current) return;
        const r = await call<{ status: string; accessToken?: string; refreshToken?: string; email?: string }>({ action: 'cursor.poll', uuid, verifier: p.verifier });
        if (r.status === 'ok' && r.accessToken) return void (await finish({ accessToken: r.accessToken, refreshToken: r.refreshToken, email: r.email }));
      }
      if (alive.current) throw new ConnectError('Sign-in timed out. Start again.', 400);
    } catch (e) {
      if (alive.current) fail(e);
    }
  };

  /** Claude, Codex, Google: sign in on the provider's page, then come back (or paste a code or address). */
  const startPkce = async () => {
    setError('');
    const p = await newPkce();
    pkce.current = p;
    const here = { hostname: window.location.hostname, origin: window.location.origin, port: window.location.port };
    const redirectUri = kind === 'antigravity' ? redirectFor('antigravity', here) : kind === 'codex' ? redirectFor('codex', here) : '';
    redirect.current = redirectUri;
    if (kind === 'antigravity' || kind === 'codex') {
      setSelfReturn(returnsToThisApp(kind, here));
      // Saved so the page the provider sends you back to can finish this sign-in.
      savePending({ kind, accountId: account.id, providerId: account.providerId, verifier: p.verifier, state: p.state, redirectUri, profile: ANTIGRAVITY_PROFILE[account.providerId], at: Date.now() });
    }
    const url = kind === 'claude' ? claudeAuthUrl(p.challenge, p.state) : kind === 'antigravity' ? antigravityAuthUrl(p.state, redirectUri) : codexAuthUrl(p.challenge, p.state);
    setAuthUrl(url);
    window.open(url, '_blank', 'noopener');
  };

  const submitPaste = async (text: string = pasted) => {
    const p = pkce.current;
    if (!p) return;
    setError('');
    setBusy(true);
    try {
      if (kind === 'claude') {
        const r = parseClaudeCode(text, p.state);
        if ('error' in r) return fail(new ConnectError(r.error, 400));
        const t = await call<{ accessToken: string; refreshToken?: string }>({ action: 'claude.exchange', code: r.code, verifier: p.verifier, state: p.state });
        await finish(t);
      } else if (kind === 'antigravity') {
        const r = parseCallback(text, p.state);
        if ('error' in r) return fail(new ConnectError(r.error, 400));
        const profile = ANTIGRAVITY_PROFILE[account.providerId] ?? 'ide';
        const t = await call<{ accessToken: string; refreshToken?: string; email?: string; projectId?: string }>({ action: 'google.exchange', code: r.code, profile, redirectUri: redirect.current || undefined });
        await finish({ ...t, profile });
      } else {
        const r = parseCallback(text, p.state);
        if ('error' in r) return fail(new ConnectError(r.error, 400));
        const t = await call<{ accessToken: string; refreshToken?: string; accountId?: string; email?: string; plan?: string }>({ action: 'codex.exchange', code: r.code, verifier: p.verifier });
        await finish(t);
      }
    } catch (e) {
      fail(e);
    }
  };

  // After signing in on another tab, coming back with the address on the clipboard finishes the sign-in with no pasting.
  const submitRef = useRef(submitPaste);
  submitRef.current = submitPaste;
  useEffect(() => {
    if (!authUrl || (kind !== 'codex' && kind !== 'antigravity') || selfReturn) return;
    const onFocus = async () => {
      try {
        const text = await navigator.clipboard.readText();
        const state = pkce.current?.state;
        if (state && text.includes(`state=${state}`) && /[?&]code=/.test(text)) {
          setPasted(text);
          void submitRef.current(text);
        }
      } catch {
        /* clipboard access denied or unavailable: the person pastes instead */
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [authUrl, kind, selfReturn]);

  const submitKey = async () => {
    setError('');
    if (!pasted.trim()) return setError('Paste your API key.');
    setBusy(true);
    await finish({ accessToken: pasted.trim() });
  };

  const device_kinds = kind in DEVICE_PREFIX;
  const paste_kinds = kind === 'claude' || kind === 'codex' || kind === 'antigravity';

  return (
    <dialog ref={ref} onClose={onClose}>
      <div className="fm">
        <h2>{kind === 'manus' ? 'Connect with an API key' : 'Sign in to fetch quotas'}</h2>
        <p className="nomargin">
          <b>{provider.name}</b>
          {account.account && <span className="mut"> · {account.account}</span>}
        </p>

        {!agreed ? (
          <>
            <p className="mut sm nomargin">
              You sign in on {TITLE[kind]}’s own page, including any Google, Microsoft, or GitHub login it offers. This app then reads your
              quota and keeps the sign-in token in this browser, in plain text. Tokens pass through this site’s server to reach the
              provider, and are not stored or logged there.
            </p>
            <p className="dep">
              This uses {TITLE[kind]}’s own app sign-in, not one made for third-party apps. The provider’s terms may not allow that, and
              in the worst case it can lead to the account being limited. Continue only for accounts you accept that risk for.
            </p>
            <label className="chk">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />I understand and want to continue
            </label>
          </>
        ) : kind === 'manus' ? (
          <>
            <p className="mut sm nomargin">
              Manus lets you read your credits with an API key, which is its documented way for apps to do this. Create one in your{' '}
              <a href="https://manus.im/app#settings/developers" target="_blank" rel="noopener noreferrer">Manus developer settings</a>{' '}
              (Create API Key), copy it, and paste it here. It is stored in this browser, in plain text, and sent through this site’s
              server only to read your credits. Anyone with the key has full access to your Manus account, so revoke it there if you lose this device.
            </p>
            <label>
              Manus API key
              <input type="password" value={pasted} onChange={(e) => setPasted(e.target.value)} autoComplete="off" placeholder="Paste the key" />
            </label>
          </>
        ) : device_kinds ? (
          device ? (
            <>
              {kind === 'github' ? <p className="nomargin">1. Open GitHub and enter this code:</p> : <p className="nomargin">1. {TITLE[kind]}’s sign-in opened in a new tab. Check it shows this code:</p>}
              <div className="code">{device.userCode}</div>
              <a className="pri linkbtn" href={device.uri} target="_blank" rel="noopener noreferrer">Open {device.uri.replace(/^https?:\/\//, '').split('?')[0]}</a>
              <p className="mut sm nomargin">2. Approve the request. This window updates by itself, so keep it open.</p>
            </>
          ) : kind === 'github' ? (
            <p className="mut sm nomargin">You will get a short code to enter on GitHub, where you sign in to your GitHub account.</p>
          ) : kind !== 'kiro' ? (
            <p className="mut sm nomargin">{TITLE[kind]}’s sign-in page opens in a new tab, where you can sign in with Google or any other login it offers. Approve the request and this window finishes by itself.</p>
          ) : (
            <>
              <p className="mut sm nomargin nomargin">Choose how you sign in to Kiro.</p>
              <div className="lgrow" role="group" aria-label="Kiro sign-in">
                {(['Google', 'Github', 'Org'] as const).map((v) => (
                  <button key={v} type="button" className={`lgbtn${kiroVia === v ? ' on' : ''}`} aria-pressed={kiroVia === v} onClick={() => setKiroVia(v)}>
                    {v === 'Github' ? 'GitHub' : v === 'Org' ? 'Your organization (Microsoft)' : v}
                  </button>
                ))}
              </div>
              {kiroVia === 'Org' ? (
                <>
                  <p className="mut sm nomargin">
                    Kiro’s “Your organization” sign-in uses Microsoft Entra ID (or Okta and similar) and has no code flow, so this reads the
                    details Kiro already saved. Sign in to Kiro with it once, then paste the contents of{' '}
                    <code>~/.aws/sso/cache/kiro-auth-token.json</code> below, and the <code>profileArn</code> from{' '}
                    <code>kiro.kiroagent/profile.json</code> in Kiro’s settings folder. Only the refresh token and sign-in settings are sent; they
                    stay in this browser, and anyone with them can use your Kiro account.
                  </p>
                  <label>
                    kiro-auth-token.json
                    <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} spellCheck={false} placeholder='{ "refreshToken": "…", "clientId": "…", "tokenEndpoint": "https://login.microsoftonline.com/…", "scopes": […] }' />
                  </label>
                  <label>
                    Profile ARN
                    <input value={orgArn} onChange={(e) => setOrgArn(e.target.value)} placeholder="arn:aws:codewhisperer:us-east-1:…:profile/…" autoComplete="off" />
                  </label>
                </>
              ) : (
                <p className="mut sm nomargin">AWS Builder ID and IAM Identity Center sign-ins are not supported yet.</p>
              )}
            </>
          )
        ) : kind === 'cursor' ? (
          waiting ? (
            <>
              <p className="nomargin">
                Sign in on the Cursor tab that opened (Google, GitHub, or email).{' '}
                <a href={authUrl} target="_blank" rel="noopener noreferrer">Open it again</a>
              </p>
              <p className="mut sm nomargin">Waiting for Cursor to confirm. This window updates by itself, so keep it open.</p>
            </>
          ) : (
            <p className="mut sm nomargin">A Cursor sign-in page opens in a new tab. Nothing to copy or paste.</p>
          )
        ) : authUrl ? (
          <>
            <p className="nomargin">
              1. Sign in in the tab that opened. <a href={authUrl} target="_blank" rel="noopener noreferrer">Open it again</a>
            </p>
            <p className="mut sm nomargin">
              {kind === 'claude'
                ? '2. Claude then shows a code. Copy it and paste it below.'
                : kind === 'antigravity'
                  ? selfReturn
                    ? '2. Sign in with the Google account you use for Antigravity. You come back to this app and it finishes by itself. If it does not, paste the address from the address bar below.'
                    : '2. Sign in with the Google account you use for Antigravity. Afterwards the browser tries to open a localhost page that will not load. That is expected. Copy the full address from the address bar and paste it below, or just come back to this tab with it copied.'
                  : selfReturn
                    ? '2. Sign in. You come back to this app and it finishes by itself. If it does not, paste the address from the address bar below.'
                    : '2. After you sign in, the browser tries to open localhost:1455, which will not load. That is expected. Copy the full address from the address bar and paste it below (or just come back to this tab with it copied). Running this app on localhost:1455 skips this step.'}
            </p>
            <label>
              {kind === 'claude' ? 'Code from Claude' : 'Address from the browser'}
              <input
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                onPaste={(e) => {
                  const t = e.clipboardData.getData('text');
                  if (t.trim()) {
                    e.preventDefault();
                    setPasted(t);
                    void submitPaste(t);
                  }
                }}
                placeholder={kind === 'claude' ? 'abc123…#state' : kind === 'antigravity' ? 'http://localhost:51121/callback?code=…' : 'http://localhost:1455/auth/callback?code=…'}
                autoComplete="off"
              />
            </label>
          </>
        ) : (
          <p className="mut sm nomargin">A {TITLE[kind]} sign-in page opens in a new tab.</p>
        )}

        {error && <div className="err">{error}</div>}

        <div className="fa">
          <button type="button" onClick={() => ref.current?.close()}>Cancel</button>
          {agreed && kind === 'manus' && (
            <button type="button" className="pri" disabled={busy || !pasted.trim()} onClick={() => void submitKey()}>{busy ? 'Reading…' : 'Connect'}</button>
          )}
          {agreed && device_kinds && !device && !(kind === 'kiro' && kiroVia === 'Org') && (
            <button type="button" className="pri" disabled={busy} onClick={() => void startDevice()}>{busy ? 'Starting…' : 'Get a code'}</button>
          )}
          {agreed && kind === 'kiro' && kiroVia === 'Org' && !device && (
            <button type="button" className="pri" disabled={busy || !pasted.trim()} onClick={() => void importOrg()}>{busy ? 'Connecting…' : 'Connect'}</button>
          )}
          {agreed && kind === 'cursor' && !waiting && (
            <button type="button" className="pri" onClick={() => void startCursor()}>Open sign-in</button>
          )}
          {agreed && paste_kinds && !authUrl && (
            <button type="button" className="pri" onClick={() => void startPkce()}>Open sign-in</button>
          )}
          {agreed && paste_kinds && authUrl && (
            <button type="button" className="pri" disabled={busy || !pasted.trim()} onClick={() => void submitPaste()}>{busy ? 'Connecting…' : 'Connect'}</button>
          )}
        </div>
      </div>
    </dialog>
  );
}
