import { beforeEach, describe, expect, it } from 'vitest';
import type { Account, Provider, WindowSpec } from './types';
import { advanceAccounts, advanceUsage, materialize, resetDate, scheduledNext, soonestReset, startRolling, stepFrom } from './schedule';
import { accountStatus, levelOf, remainingPercent } from './status';
import { mergeStores, parseStore, serialize } from './storage';
import { PROVIDER_BY_ID, PROVIDERS } from './config/providers';
import { RESEARCH } from './config/research';
import { buildViews } from './view';
import { ANTIGRAVITY_PROFILE, CONNECTOR_BY_PROVIDER, parseAntigravity, parseClaude, parseCodex, parseCursor, parseGithub, parseGrok, parseKiloPass, parseKimi, parseKiro, parseManus, parseReset } from './connect/providers';
import { challengeFor, newPkce } from './connect/pkce';
import { antigravityAuthUrl, claudeAuthUrl, codexAuthUrl, parseClaudeCode, parseCodexCallback, redirectFor, returnsToThisApp } from './connect/auth';
import { exchangeCallback, readCallback } from './connect/callback';
import { clearPending, loadPending, PENDING_TTL_MS, savePending } from './connect/pending';
import { ANTIGRAVITY, CLAUDE, CODEX, CURSOR, GITHUB, GROK, KILO, KIMI, KIRO, MANUS, handle, jwtEmail, loopbackRedirect, readIdToken, resolveServerEnv, validateIdpEndpoint } from './connect/server';
import { applyResult, call, ConnectError, fetchQuota, readingToUsage } from './connect/client';
import { getCreds, setCreds } from './connect/creds';

const spec = (over: Partial<WindowSpec> = {}): WindowSpec => ({
  id: 's', name: 'Quota', type: 'daily', hours: 5, total: 100, unit: '%', step: 1, time: '06:00', ...over,
});
const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe('scheduledNext (shared provider schedule)', () => {
  it('daily: later today, or tomorrow once the time has passed', () => {
    expect(scheduledNext(spec(), local(2026, 10, 23, 5))).toEqual(local(2026, 10, 23, 6));
    expect(scheduledNext(spec(), local(2026, 10, 23, 6))).toEqual(local(2026, 10, 24, 6));
  });
  it('weekly: next matching weekday, or null when it is set per account', () => {
    const w = spec({ type: 'weekly', dow: 1 });
    expect(scheduledNext(w, local(2026, 10, 23, 12))).toEqual(local(2026, 10, 26, 6));
    expect(scheduledNext(spec({ type: 'weekly' }), local(2026, 10, 23))).toBeNull();
  });
  it('monthly: clamps to the month length, null without a day', () => {
    const w = spec({ type: 'monthly', dom: 31 });
    expect(scheduledNext(w, local(2026, 2, 1))).toEqual(local(2026, 2, 28, 6));
    expect(scheduledNext(w, local(2026, 2, 28, 7))).toEqual(local(2026, 3, 31, 6));
    expect(scheduledNext(spec({ type: 'monthly' }), local(2026, 2, 1))).toBeNull();
  });
  it('daily without a shared time is entered per account', () => {
    expect(scheduledNext(spec({ time: undefined }), local(2026, 10, 23))).toBeNull();
  });
  it('utc: reads the shared time as UTC regardless of the local time zone', () => {
    const w = spec({ type: 'daily', time: '00:00', utc: true });
    expect(scheduledNext(w, new Date(Date.UTC(2026, 9, 23, 10, 0)))).toEqual(new Date(Date.UTC(2026, 9, 24, 0, 0)));
    expect(scheduledNext(w, new Date(Date.UTC(2026, 9, 23, 0, 0)))).toEqual(new Date(Date.UTC(2026, 9, 24, 0, 0)));
    const monthly = spec({ type: 'monthly', time: '00:00', dom: 31, utc: true });
    expect(scheduledNext(monthly, new Date(Date.UTC(2026, 1, 1)))).toEqual(new Date(Date.UTC(2026, 1, 28)));
  });
  it('rolling windows have no fixed schedule', () => {
    expect(scheduledNext(spec({ type: 'rolling' }), new Date())).toBeNull();
  });
});

describe('advanceUsage', () => {
  it('rolling: untouched while running, idle once the window ends', () => {
    const s = spec({ type: 'rolling', hours: 5 });
    const running = { used: 40, next: local(2026, 10, 23, 10).toISOString() };
    expect(advanceUsage(s, running, local(2026, 10, 23, 9))).toBe(running);
    const after = advanceUsage(s, running, local(2026, 10, 23, 11))!;
    expect(after.used).toBe(0);
    expect(after.next).toBeUndefined();
  });
  it('rolling with no usage stays idle', () => {
    expect(advanceUsage(spec({ type: 'rolling' }), undefined, new Date())).toBeUndefined();
  });
  it('shared schedule: sets the first reset, then clears usage when it passes', () => {
    const first = advanceUsage(spec(), { used: 30 }, local(2026, 10, 23, 7))!;
    expect(new Date(first.next!)).toEqual(local(2026, 10, 24, 6));
    expect(first.used).toBe(30);
    const later = advanceUsage(spec(), first, local(2026, 10, 24, 7))!;
    expect(later.used).toBe(0);
    expect(new Date(later.next!)).toEqual(local(2026, 10, 25, 6));
  });
  it('per-account weekly reset: stays unset until entered, then repeats weekly from it', () => {
    const s = spec({ type: 'weekly' });
    expect(advanceUsage(s, { used: 5 }, local(2026, 10, 23))).toEqual({ used: 5 });
    const entered = { used: 5, anchor: true, next: local(2026, 10, 26, 9).toISOString() };
    const after = advanceUsage(s, entered, local(2026, 10, 27))!;
    expect(after.used).toBe(0);
    expect(new Date(after.next!)).toEqual(local(2026, 11, 2, 9));
  });
  it('per-account monthly reset on the 31st does not drift after a short month', () => {
    const s = spec({ type: 'monthly' });
    let u = { used: 1, anchor: true, day: 31, next: local(2026, 1, 31, 9).toISOString() };
    u = advanceUsage(s, u, local(2026, 2, 1))! as typeof u;
    expect(new Date(u.next!)).toEqual(local(2026, 2, 28, 9));
    u = advanceUsage(s, u, local(2026, 3, 1))! as typeof u;
    expect(new Date(u.next!)).toEqual(local(2026, 3, 31, 9));
  });
});

describe('advanceAccounts', () => {
  const provider: Provider = { id: 'p', name: 'P', category: 'oauth', windows: [spec({ id: 'a' }), spec({ id: 'b', type: 'rolling' })] };
  const acct = (usage: Account['usage']): Account => ({
    id: 'x', providerId: 'p', account: '', login: '', plan: '', tag: '', note: '', active: true, usage,
  });
  it('returns the same array when nothing is due', () => {
    const list = [acct({ a: { used: 3, next: local(2026, 10, 24, 6).toISOString() } })];
    expect(advanceAccounts([provider], list, local(2026, 10, 23, 7))).toBe(list);
  });
  it('clears only the windows whose reset has passed', () => {
    const list = [acct({ a: { used: 3, next: local(2026, 10, 23, 6).toISOString() }, b: { used: 9, next: local(2026, 10, 24).toISOString() } })];
    const [out] = advanceAccounts([provider], list, local(2026, 10, 23, 7));
    expect(out.usage.a.used).toBe(0);
    expect(out.usage.b.used).toBe(9);
  });
});

describe('helpers', () => {
  it('startRolling adds the window length', () => {
    expect(new Date(startRolling(spec({ hours: 5 }), local(2026, 10, 23, 1)))).toEqual(local(2026, 10, 23, 6));
  });
  it('resetDate ignores passed or missing resets; soonestReset picks the earliest', () => {
    const now = local(2026, 10, 23);
    const a = materialize(spec({ id: '1' }), { used: 0, next: local(2026, 10, 25).toISOString() });
    const b = materialize(spec({ id: '2' }), { used: 0, next: local(2026, 10, 24).toISOString() });
    const old = materialize(spec({ id: '3' }), { used: 0, next: local(2026, 10, 22).toISOString() });
    expect(resetDate(old, now)).toBeNull();
    expect(soonestReset([a, b, old], now)).toEqual(local(2026, 10, 24));
  });
  it('stepFrom keeps the entered day of month', () => {
    const w = materialize(spec({ type: 'monthly' }), { used: 0, anchor: true, day: 30, next: local(2026, 1, 30).toISOString() });
    expect(stepFrom(w, local(2026, 1, 30), local(2026, 2, 1))).toEqual(local(2026, 2, 28));
  });
});

describe('status', () => {
  const win = (used: number, total = 100) => materialize(spec({ total }), { used });
  it('maps remaining percent to levels', () => {
    expect(levelOf(10)).toBe('critical');
    expect(levelOf(30)).toBe('alert');
    expect(levelOf(80)).toBe('ok');
    expect(remainingPercent(win(0, 0))).toBeNull();
  });
  it('uses the worst window, and handles paused and unlimited accounts', () => {
    expect(accountStatus(true, [win(10)])).toBe('ok');
    expect(accountStatus(true, [win(10), win(70)])).toBe('alert');
    expect(accountStatus(true, [win(70), win(10), win(95)])).toBe('critical');
    expect(accountStatus(true, [win(5, 0)])).toBe('empty');
    expect(accountStatus(false, [win(95)])).toBe('paused');
  });
});

describe('provider config', () => {
  it('has unique provider ids and unique window ids inside each provider', () => {
    expect(new Set(PROVIDERS.map((p) => p.id)).size).toBe(PROVIDERS.length);
    for (const p of PROVIDERS) {
      expect(p.windows.length).toBeGreaterThan(0);
      expect(new Set(p.windows.map((w) => w.id)).size).toBe(p.windows.length);
    }
  });
  it('every provider has an http(s) website, with no referral parameters', () => {
    for (const p of PROVIDERS) {
      expect(p.website, p.id).toMatch(/^https:\/\//);
      expect(p.website, p.id).not.toMatch(/aff=/);
    }
  });
  it('marks Amazon Q as deprecated so the picker can hide it', () => {
    expect(PROVIDER_BY_ID.get('amazon-q')!.deprecated).toMatch(/2027/);
    expect(PROVIDERS.filter((p) => p.deprecated).map((p) => p.id)).toEqual(['amazon-q']);
  });
  it('carries OmniRoute attributes and the known windows', () => {
    const claude = PROVIDER_BY_ID.get('claude')!;
    expect(claude.name).toBe('Claude Code');
    expect(claude.color).toBe('#D97757');
    expect(claude.windows.map((w) => w.id)).toEqual(['session', 'weekly']);
    expect(PROVIDER_BY_ID.get('github')!.windows.map((w) => w.id)).toEqual(['premium_interactions', 'chat', 'completions']);
    expect(PROVIDER_BY_ID.has('kimi')).toBe(false); // hidden from OmniRoute's dashboard
  });
});

describe('provider research', () => {
  it('covers every provider and nothing else', () => {
    expect(Object.keys(RESEARCH).sort()).toEqual(PROVIDERS.map((p) => p.id).sort());
    for (const p of PROVIDERS) expect(p.research, p.id).toBeDefined();
  });
  it('uses valid verdicts, availability values, and https sources', () => {
    for (const p of PROVIDERS) {
      const r = p.research!;
      expect(['yes', 'limited', 'no', 'unclear'], p.id).toContain(r.freeTier.verdict);
      expect(['active', 'unclear'], p.id).toContain(r.availability);
      expect(r.freeTier.note.length, p.id).toBeGreaterThan(10);
      for (const u of [...r.sources, r.freeTier.infoUrl, r.freeTier.detailsUrl].filter(Boolean)) expect(u as string, p.id).toMatch(/^https:\/\//);
    }
  });
  it('keeps the findings the research reported', () => {
    expect(PROVIDERS.filter((p) => p.research!.availability === 'unclear').map((p) => p.id)).toEqual(['crof']);
    expect(PROVIDER_BY_ID.get('manus')!.research!.freeTier.verdict).toBe('yes');
    expect(PROVIDER_BY_ID.get('claude')!.research!.freeTier.verdict).toBe('no');
    expect(PROVIDER_BY_ID.get('kiro')!.research!.freeTier.note).toMatch(/50 credits/);
  });
  it('includes the market-scan providers with documented allowances as real windows', () => {
    expect(PROVIDERS).toHaveLength(74);
    for (const id of ['together', 'groq', 'cerebras', 'mistral', 'nvidia', 'cohere', 'exa-search', 'brave-search', 'serpapi', 'replicate', 'portkey']) {
      expect(PROVIDER_BY_ID.has(id), id).toBe(true);
    }
    expect(PROVIDER_BY_ID.get('exa-search')!.windows[0]).toMatchObject({ total: 10, unit: '$', type: 'monthly' });
    expect(PROVIDER_BY_ID.get('serpapi')!.windows[0]).toMatchObject({ total: 250, unit: 'searches' });
    expect(PROVIDER_BY_ID.get('groq')!.research!.freeTier.verdict).toBe('yes');
    expect(PROVIDER_BY_ID.get('together')!.research!.freeTier.verdict).toBe('no');
  });
  it('uses promptql.io, not the mistyped domain from the catalog', () => {
    expect(PROVIDER_BY_ID.get('promptql')!.website).toBe('https://promptql.io');
  });
});

describe('storage', () => {
  const acct = (over: Record<string, unknown>) => ({
    id: 'a', login: 'google', plan: '', tag: '', note: '', active: true, ...over,
  });
  it('converts the old per-account layout onto the global provider config', () => {
    const legacy = [
      {
        ...acct({ provider: 'Claude Code', account: 'a@x.com' }),
        windows: [
          { id: 'w1', name: 'Session', used: 10, total: 50, unit: 'prompts', step: 1, type: 'rolling', time: '00:00', dow: 1, dom: 1, hours: 5, next: local(2026, 10, 24).toISOString() },
          { id: 'w2', name: 'Weekly', used: 20, total: 400, unit: 'prompts', step: 1, type: 'weekly', time: '09:00', dow: 5, dom: 1, hours: 5, next: local(2026, 10, 30).toISOString() },
        ],
      },
      { ...acct({ id: 'b', provider: 'Nonexistent Corp', account: 'z' }), windows: [] },
    ];
    const { accounts } = parseStore(JSON.stringify({ version: 2, accounts: legacy }));
    expect(accounts).toHaveLength(1); // providers outside the global list are dropped
    expect(accounts[0].providerId).toBe('claude');
    expect(accounts[0].usage.session.used).toBe(10);
    expect(accounts[0].usage.weekly).toMatchObject({ used: 20, anchor: true });
  });
  it('moves the previous user-defined-provider layout onto the config', () => {
    const v3 = {
      version: 3,
      providers: [{ id: 'x1', name: 'Kiro', windows: [{ id: 's1', name: 'Credits', type: 'monthly', hours: 5, total: 100, unit: '%', step: 1 }] }],
      accounts: [{ ...acct({ id: 'c1', providerId: 'x1' }), usage: { s1: { used: 5 } } }],
    };
    const { accounts } = parseStore(JSON.stringify(v3));
    expect(accounts[0].providerId).toBe('kiro');
    expect(accounts[0].usage).toEqual({ credits: { used: 5, next: undefined, anchor: undefined, day: undefined, last: undefined } });
  });
  it('round-trips the current format, drops unknown providers, and rejects junk', () => {
    const store = { accounts: [{ ...acct({ id: 'k', providerId: 'claude' }), usage: { session: { used: 3 } } }, acct({ id: 'u', providerId: 'nope' })] };
    const back = parseStore(serialize(store as never));
    expect(back.accounts.map((a) => a.id)).toEqual(['k']);
    expect(back.accounts[0].usage.session.used).toBe(3);
    expect(() => parseStore('{"nope":1}')).toThrow();
  });
  it('merge appends accounts and renames colliding ids', () => {
    const mk = (id: string) => ({ ...acct({ id, providerId: 'claude' }), usage: {} }) as never;
    const out = mergeStores({ accounts: [mk('1')] }, { accounts: [mk('1'), mk('2')] });
    expect(out.accounts).toHaveLength(3);
    expect(new Set(out.accounts.map((a) => a.id)).size).toBe(3);
  });
});

describe('Manus and plans', () => {
  const account = (plan: string) => ({
    accounts: [{ id: 'm', providerId: 'manus', account: 'me', login: 'google' as const, plan, tag: '', note: '', active: true, usage: {} }],
  });
  it('is configured from Manus documentation', () => {
    const m = PROVIDER_BY_ID.get('manus')!;
    expect(m.windows.map((w) => w.id)).toEqual(['daily_refresh', 'monthly']);
    expect(m.windows[0]).toMatchObject({ total: 300, type: 'daily', time: '00:00', utc: true });
    expect(m.plans!.map((p) => p.name)).toEqual(['Standard', 'Customizable', 'Extended', 'Free']);
  });
  it('sizes the monthly window from the plan, and defaults to the first plan', () => {
    const monthly = (plan: string) => buildViews(account(plan))[0].windows.find((w) => w.id === 'monthly')?.total;
    expect(monthly('Standard')).toBe(4000);
    expect(monthly('Customizable')).toBe(8000);
    expect(monthly('Extended')).toBe(40000);
    expect(monthly('')).toBe(4000);
    expect(buildViews(account(''))[0].planName).toBe('Standard');
  });
  it('the Free plan has only the daily refresh window', () => {
    const [v] = buildViews(account('Free'));
    expect(v.windows.map((w) => w.id)).toEqual(['daily_refresh']);
  });
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('quota parsers', () => {
  it('parseReset reads ISO, epoch seconds, epoch milliseconds, and rejects junk', () => {
    expect(parseReset('2026-10-26T15:00:00Z')).toBe('2026-10-26T15:00:00.000Z');
    expect(parseReset(1792940400)).toBe('2026-10-25T15:00:00.000Z');
    expect(parseReset(1792940400000)).toBe('2026-10-25T15:00:00.000Z');
    expect(parseReset(null)).toBeNull();
    expect(parseReset('nope')).toBeNull();
  });
  it('github: snapshots by percent or by entitlement, skipping unlimited', () => {
    const r = parseGithub({
      copilot_plan: 'individual_pro',
      quota_reset_date: '2026-11-01',
      quota_snapshots: {
        premium_interactions: { entitlement: 300, remaining: 75, percent_remaining: 25, unlimited: false },
        chat: { unlimited: true },
        completions: { entitlement: 200, remaining: 150 },
      },
    });
    expect(r.plan).toBe('individual_pro');
    expect(r.windows.premium_interactions.usedPercent).toBe(75);
    expect(r.windows.completions.usedPercent).toBe(25);
    expect(r.windows.chat).toBeUndefined();
    expect(r.windows.premium_interactions.resetAt).toMatch(/^2026-11-01/);
  });
  it('github: the free plan reports what is left of a monthly allowance', () => {
    const r = parseGithub({ limited_user_quotas: { chat: 30, completions: 1500 }, monthly_quotas: { chat: 50, completions: 2000 }, limited_user_reset_date: '2026-11-01' });
    expect(r.windows.chat.usedPercent).toBe(40);
    expect(r.windows.completions.usedPercent).toBe(25);
  });
  it('claude: five_hour is the session and seven_day the weekly window', () => {
    const r = parseClaude({ five_hour: { utilization: 42, resets_at: '2026-10-26T15:00:00Z' }, seven_day: { utilization: 7.5, resets_at: '2026-10-30T00:00:00Z' }, seven_day_opus: { utilization: 1 } });
    expect(r.windows.session).toEqual({ usedPercent: 42, resetAt: '2026-10-26T15:00:00.000Z' });
    expect(r.windows.weekly.usedPercent).toBe(7.5);
    expect(Object.keys(r.windows)).toEqual(['session', 'weekly']);
  });
  it('codex: windows are labelled by their real length, and a never-started window is idle', () => {
    const now = new Date('2026-10-26T12:00:00Z');
    const r = parseCodex({
      plan_type: 'plus',
      rate_limit: {
        primary_window: { used_percent: 30, limit_window_seconds: 18000, reset_after_seconds: 3600 },
        secondary_window: { used_percent: 0, limit_window_seconds: 604800, reset_after_seconds: 604800 },
      },
    }, now);
    expect(r.plan).toBe('plus');
    expect(r.windows.session).toEqual({ usedPercent: 30, resetAt: '2026-10-26T13:00:00.000Z' });
    expect(r.windows.weekly).toEqual({ usedPercent: 0, resetAt: null });
    // a 7-day primary window is weekly, not a session
    const w = parseCodex({ rate_limit: { primary_window: { used_percent: 10, limit_window_seconds: 604800, reset_at: 1793000000 } } }, now);
    expect(Object.keys(w.windows)).toEqual(['weekly']);
  });
});

describe('sign-in helpers', () => {
  it('computes the RFC 7636 example challenge', async () => {
    expect(await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
    const p = await newPkce();
    expect(p.verifier.length).toBeGreaterThanOrEqual(43);
    expect(p.challenge).toBe(await challengeFor(p.verifier));
  });
  it('builds the Claude and Codex sign-in addresses', () => {
    const c = new URL(claudeAuthUrl('CH', 'ST'));
    expect(c.origin + c.pathname).toBe('https://claude.ai/oauth/authorize');
    expect(c.searchParams.get('client_id')).toBe(CLAUDE.clientId);
    expect(c.searchParams.get('redirect_uri')).toBe(CLAUDE.redirectUri);
    expect(c.searchParams.get('code_challenge')).toBe('CH');
    expect(c.searchParams.get('state')).toBe('ST');
    const x = new URL(codexAuthUrl('CH', 'ST'));
    expect(x.searchParams.get('redirect_uri')).toBe('http://localhost:1455/auth/callback');
    expect(x.searchParams.get('originator')).toBe('codex_cli_rs');
  });
  it('reads the pasted Codex address and checks the state', () => {
    expect(parseCodexCallback('http://localhost:1455/auth/callback?code=abc&state=S1', 'S1')).toEqual({ code: 'abc' });
    expect(parseCodexCallback('?code=abc&state=S1', 'S1')).toEqual({ code: 'abc' });
    expect(parseCodexCallback('http://localhost:1455/auth/callback?code=abc&state=OTHER', 'S1')).toHaveProperty('error');
    expect(parseCodexCallback('http://localhost:1455/auth/callback?error=access_denied', 'S1')).toHaveProperty('error');
    expect(parseCodexCallback('', 'S1')).toHaveProperty('error');
  });
  it('reads the pasted Claude code in either form', () => {
    expect(parseClaudeCode('abc#S1', 'S1')).toEqual({ code: 'abc#S1' });
    expect(parseClaudeCode('abc', 'S1')).toEqual({ code: 'abc' });
    expect(parseClaudeCode('abc#WRONG', 'S1')).toHaveProperty('error');
  });
  it('reads the account id and email from an id_token', () => {
    const payload = btoa(JSON.stringify({ email: 'me@x.com', 'https://api.openai.com/auth': { chatgpt_account_id: 'acc_1', chatgpt_plan_type: 'plus' } }));
    expect(readIdToken(`h.${payload}.s`)).toEqual({ accountId: 'acc_1', plan: 'plus', email: 'me@x.com' });
    expect(readIdToken('garbage')).toEqual({});
  });
});

describe('sign-in server', () => {
  const seen: { url: string; init?: RequestInit }[] = [];
  const route = (map: Record<string, () => Response>) => async (url: string, init?: RequestInit) => {
    seen.push({ url, init });
    const hit = Object.keys(map).find((k) => url.startsWith(k));
    if (!hit) throw new Error('unexpected ' + url);
    return map[hit]();
  };
  const body = (i?: RequestInit) => String(i?.body);

  it('starts and polls the GitHub device flow', async () => {
    seen.length = 0;
    const f = route({
      [GITHUB.deviceCodeUrl]: () => json({ device_code: 'D', user_code: 'ABCD-1234', verification_uri: 'https://github.com/login/device', expires_in: 900, interval: 5 }),
      [GITHUB.tokenUrl]: () => json({ error: 'authorization_pending' }),
    });
    const s = await handle({ action: 'github.start' }, f);
    expect(s.body).toMatchObject({ ok: true, userCode: 'ABCD-1234', deviceCode: 'D' });
    expect(body(seen[0].init)).toContain('client_id=Iv1.b507a08c87ecfe98');
    expect((await handle({ action: 'github.poll', deviceCode: 'D' }, f)).body).toMatchObject({ status: 'pending' });
    const done = route({ [GITHUB.tokenUrl]: () => json({ access_token: 'gho_x' }) });
    expect((await handle({ action: 'github.poll', deviceCode: 'D' }, done)).body).toMatchObject({ status: 'ok', accessToken: 'gho_x' });
    const gone = route({ [GITHUB.tokenUrl]: () => json({ error: 'expired_token' }) });
    expect((await handle({ action: 'github.poll', deviceCode: 'D' }, gone)).body).toMatchObject({ status: 'expired' });
  });
  it('exchanges a Claude code, splitting code and state', async () => {
    seen.length = 0;
    const f = route({ [CLAUDE.tokenUrl]: () => json({ access_token: 'A', refresh_token: 'R', expires_in: 3600 }) });
    const r = await handle({ action: 'claude.exchange', code: 'thecode#thestate', verifier: 'V', state: 'S' }, f);
    expect(r.body).toMatchObject({ ok: true, accessToken: 'A', refreshToken: 'R' });
    expect(JSON.parse(body(seen[0].init))).toMatchObject({ code: 'thecode', state: 'thestate', code_verifier: 'V', grant_type: 'authorization_code' });
    const bad = route({ [CLAUDE.tokenUrl]: () => json({ error: 'invalid_grant' }, 400) });
    expect((await handle({ action: 'claude.exchange', code: 'x', verifier: 'V' }, bad)).status).toBe(400);
  });
  it('exchanges a Codex code as a form and returns the account id', async () => {
    seen.length = 0;
    const payload = btoa(JSON.stringify({ email: 'me@x.com', 'https://api.openai.com/auth': { chatgpt_account_id: 'acc_1' } }));
    const f = route({ [CODEX.tokenUrl]: () => json({ access_token: 'A', refresh_token: 'R', id_token: `h.${payload}.s` }) });
    const r = await handle({ action: 'codex.exchange', code: 'C', verifier: 'V' }, f);
    expect(r.body).toMatchObject({ ok: true, accessToken: 'A', accountId: 'acc_1', email: 'me@x.com' });
    expect(body(seen[0].init)).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A1455%2Fauth%2Fcallback');
  });
  it('reads quotas with the right headers per provider', async () => {
    seen.length = 0;
    const f = route({
      [GITHUB.usageUrl]: () => json({ quota_snapshots: { chat: { entitlement: 10, remaining: 5 } } }),
      [CLAUDE.usageUrl]: () => json({ five_hour: { utilization: 10 } }),
      [CODEX.usageUrl]: () => json({ rate_limit: { primary_window: { used_percent: 5, limit_window_seconds: 18000 } } }),
    });
    const g = await handle({ action: 'quota', kind: 'github', accessToken: 'T' }, f);
    expect((g.body.result as { windows: Record<string, { usedPercent: number }> }).windows.chat.usedPercent).toBe(50);
    expect((seen[0].init!.headers as Record<string, string>).Authorization).toBe('token T');
    await handle({ action: 'quota', kind: 'claude', accessToken: 'T' }, f);
    expect((seen[1].init!.headers as Record<string, string>)['anthropic-beta']).toBe('oauth-2025-04-20');
    await handle({ action: 'quota', kind: 'codex', accessToken: 'T', accountId: 'acc_1' }, f);
    expect((seen[2].init!.headers as Record<string, string>)['chatgpt-account-id']).toBe('acc_1');
  });
  it('maps rejected tokens to 401, rate limits to 429, and rejects bad requests', async () => {
    const unauthorized = route({ [CLAUDE.usageUrl]: () => json({}, 401) });
    expect((await handle({ action: 'quota', kind: 'claude', accessToken: 'T' }, unauthorized)).status).toBe(401);
    const limited = route({ [CLAUDE.usageUrl]: () => json({}, 429) });
    expect((await handle({ action: 'quota', kind: 'claude', accessToken: 'T' }, limited)).status).toBe(429);
    expect((await handle({ action: 'nope' })).status).toBe(400);
    expect((await handle(null)).status).toBe(400);
    expect((await handle({ action: 'quota', kind: 'evil', accessToken: 'T' })).status).toBe(400);
    expect((await handle({ action: 'quota', kind: 'claude' })).status).toBe(400);
  });
  it('only ever contacts the fixed provider hosts', async () => {
    seen.length = 0;
    const f = route({ [CLAUDE.usageUrl]: () => json({}) });
    await handle({ action: 'quota', kind: 'claude', accessToken: 'T', url: 'https://evil.example' }, f);
    expect(seen.every((s) => new URL(s.url).host === 'api.anthropic.com')).toBe(true);
  });
});

describe('client', () => {
  const mem = new Map<string, string>();
  beforeEach(() => {
    mem.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  });
  const provider = PROVIDER_BY_ID.get('claude')!;
  const account = (over = {}) => ({ id: 'a1', providerId: 'claude', account: '', login: '' as const, plan: '', tag: '', note: '', active: true, usage: {}, ...over });

  it('scales a percent reading to the window size', () => {
    expect(readingToUsage(100, 42.567, '2026-10-26T15:00:00.000Z')).toEqual({ used: 42.57, next: '2026-10-26T15:00:00.000Z' });
    expect(readingToUsage(300, 50, null)).toEqual({ used: 150, next: undefined });
  });
  it('writes a result onto the account and fills in a blank email and plan', () => {
    const at = new Date('2026-10-26T12:00:00Z');
    const a = applyResult(account(), provider, { windows: { session: { usedPercent: 30, resetAt: '2026-10-26T15:00:00.000Z' } }, email: 'me@x.com', plan: 'pro' }, 'claude', at);
    expect(a.usage.session).toEqual({ used: 30, next: '2026-10-26T15:00:00.000Z' });
    expect(a).toMatchObject({ connection: 'claude', account: 'me@x.com', plan: 'pro', syncedAt: at.toISOString() });
    const kept = applyResult(account({ account: 'mine', plan: 'max' }), provider, { windows: {}, email: 'other@x.com', plan: 'pro' }, 'claude', at);
    expect(kept).toMatchObject({ account: 'mine', plan: 'max' });
  });
  it('turns a failed proxy call into a readable error', async () => {
    await expect(call({ action: 'x' }, async () => { throw new TypeError('x'); })).rejects.toBeInstanceOf(ConnectError);
    await expect(call({ action: 'x' }, async () => json({ ok: false, error: 'Nope.' }, 400))).rejects.toThrow('Nope.');
    await expect(call({ action: 'x' }, async () => new Response('', { status: 404 }))).rejects.toThrow(/Vercel/);
  });
  it('refreshes an expired Claude sign-in once, then reads the quota', async () => {
    setCreds('a1', { kind: 'claude', accessToken: 'old', refreshToken: 'R1' });
    const actions: string[] = [];
    const f = async (_url: string, init?: RequestInit) => {
      const b = JSON.parse(String(init?.body));
      actions.push(`${b.action}:${b.accessToken ?? ''}`);
      if (b.action === 'quota' && b.accessToken === 'old') return json({ ok: false, error: 'expired' }, 401);
      if (b.action === 'refresh') return json({ ok: true, accessToken: 'new', refreshToken: 'R2' });
      return json({ ok: true, result: { windows: { session: { usedPercent: 10, resetAt: null } } } });
    };
    const r = await fetchQuota('a1', f);
    expect(r.kind).toBe('claude');
    expect(actions).toEqual(['quota:old', 'refresh:', 'quota:new']);
    expect(getCreds('a1')).toMatchObject({ accessToken: 'new', refreshToken: 'R2' });
  });
  it('forgets the sign-in when it cannot be refreshed', async () => {
    setCreds('a1', { kind: 'github', accessToken: 'gone' });
    await expect(fetchQuota('a1', async () => json({ ok: false, error: 'bad' }, 401))).rejects.toMatchObject({ status: 401 });
    expect(getCreds('a1')).toBeUndefined();
    await expect(fetchQuota('nobody')).rejects.toMatchObject({ status: 401 });
  });
});

describe('Google sign-in (Antigravity)', () => {
  const sample = {
    groups: [
      { displayName: 'Gemini Models', groupId: 'gemini', buckets: [
        { window: '5h', remaining: { remainingFraction: 0.75, resetTime: '2026-10-26T15:00:00Z' } },
        { bucketId: 'weekly-quota', displayName: 'Weekly', remainingFraction: 0.5, resetTime: '2026-10-30T00:00:00Z' },
      ] },
      { displayName: 'Claude & GPT Models', buckets: [
        { displayName: 'Session (5 hour)', remaining: { remainingFraction: 1 } },
        { window: '7d', disabled: true, remaining: { remainingFraction: 0.1 } },
        { window: 'weekly', remaining: { remainingFraction: 0.2, resetTime: 1793000000 } },
      ] },
    ],
  };
  it('parses groups and buckets into per-group session and weekly windows', () => {
    const r = parseAntigravity(sample);
    expect(r.windows.gemini_session).toEqual({ usedPercent: 25, resetAt: '2026-10-26T15:00:00.000Z' });
    expect(r.windows.gemini_weekly).toEqual({ usedPercent: 50, resetAt: '2026-10-30T00:00:00.000Z' });
    expect(r.windows.claude_gpt_session).toEqual({ usedPercent: 0, resetAt: null });
    expect(r.windows.claude_gpt_weekly.usedPercent).toBe(80);
    expect(parseAntigravity({ quotaSummary: { groups: sample.groups } }).windows.gemini_session.usedPercent).toBe(25);
    expect(parseAntigravity(null).windows).toEqual({});
  });
  it('is configured for both Antigravity providers, with matching window ids', () => {
    expect(CONNECTOR_BY_PROVIDER.antigravity).toBe('antigravity');
    expect(CONNECTOR_BY_PROVIDER.agy).toBe('antigravity');
    expect(ANTIGRAVITY_PROFILE).toEqual({ antigravity: 'ide', agy: 'cli' });
    for (const id of ['antigravity', 'agy']) {
      expect(PROVIDER_BY_ID.get(id)!.windows.map((w) => w.id)).toEqual(['gemini_session', 'gemini_weekly', 'claude_gpt_session', 'claude_gpt_weekly']);
    }
  });
  it('builds the Google sign-in address without PKCE or openid', () => {
    const u = new URL(antigravityAuthUrl('ST'));
    expect(u.origin + u.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(u.searchParams.get('client_id')).toBe(ANTIGRAVITY.clientId);
    expect(u.searchParams.get('redirect_uri')).toBe('http://localhost:51121/callback');
    expect(u.searchParams.get('access_type')).toBe('offline');
    expect(u.searchParams.get('prompt')).toBe('consent');
    expect(u.searchParams.get('scope')).not.toMatch(/openid/);
    expect(u.searchParams.has('code_challenge')).toBe(false);
  });

  const seen: { url: string; init?: RequestInit }[] = [];
  const f = async (url: string, init?: RequestInit) => {
    seen.push({ url, init });
    if (url === ANTIGRAVITY.tokenUrl) return json({ access_token: 'GA', refresh_token: 'GR', expires_in: 3599 });
    if (url.startsWith(ANTIGRAVITY.userInfoUrl)) return json({ email: 'me@gmail.com' });
    if (url.endsWith(':loadCodeAssist')) return json({ cloudaicompanionProject: { id: 'proj-1' } });
    if (url.endsWith(':retrieveUserQuotaSummary')) return json(sample);
    throw new Error('unexpected ' + url);
  };
  it('is switched off without the client secret', async () => {
    expect((await handle({ action: 'google.exchange', code: 'C' }, f)).status).toBe(503);
    expect((await handle({ action: 'refresh', kind: 'antigravity', refreshToken: 'R' }, f)).status).toBe(503);
  });
  it('exchanges the code with the secret, then finds the email and project', async () => {
    seen.length = 0;
    const r = await handle({ action: 'google.exchange', code: 'C', profile: 'cli' }, f, new Date(), { ANTIGRAVITY_OAUTH_CLIENT_SECRET: 'sekrit' });
    expect(r.body).toMatchObject({ ok: true, accessToken: 'GA', refreshToken: 'GR', email: 'me@gmail.com', projectId: 'proj-1', profile: 'cli' });
    const form = String(seen[0].init?.body);
    expect(form).toContain('client_secret=sekrit');
    expect(form).toContain('grant_type=authorization_code');
    expect(JSON.stringify(r.body)).not.toContain('sekrit');
    const lca = seen.find((s) => s.url.endsWith(':loadCodeAssist'))!;
    expect(JSON.parse(String(lca.init?.body))).toEqual({ metadata: ANTIGRAVITY.metadata });
    expect((lca.init!.headers as Record<string, string>)['User-Agent']).toMatch(/^antigravity\/cli\//);
  });
  it('reads quotas from the project, and refreshes with the secret', async () => {
    seen.length = 0;
    const q = await handle({ action: 'quota', kind: 'antigravity', accessToken: 'GA', projectId: 'proj-1', profile: 'ide' }, f);
    expect((q.body.result as { windows: Record<string, unknown> }).windows).toHaveProperty('gemini_weekly');
    expect(JSON.parse(String(seen[0].init?.body))).toEqual({ project: 'proj-1' });
    expect((seen[0].init!.headers as Record<string, string>)['User-Agent']).toMatch(/^antigravity\/ide\//);
    seen.length = 0;
    const rf = await handle({ action: 'refresh', kind: 'antigravity', refreshToken: 'GR' }, f, new Date(), { ANTIGRAVITY_OAUTH_CLIENT_SECRET: 'sekrit' });
    expect(rf.body).toMatchObject({ ok: true, accessToken: 'GA' });
    expect(String(seen[0].init?.body)).toContain('grant_type=refresh_token');
  });
});

describe('Cursor, Kiro, and Manus', () => {
  const jwt = (p: object) => `h.${btoa(JSON.stringify(p))}.s`;
  const hdr = (i?: RequestInit) => i?.headers as Record<string, string>;
  const seen: { url: string; init?: RequestInit }[] = [];
  const route = (map: Record<string, () => Response>) => async (url: string, init?: RequestInit) => {
    seen.push({ url, init });
    const hit = Object.keys(map).find((k) => url.startsWith(k));
    if (!hit) throw new Error('unexpected ' + url);
    return map[hit]();
  };

  it('all three are configured with matching window ids', () => {
    expect(CONNECTOR_BY_PROVIDER).toMatchObject({ cursor: 'cursor', kiro: 'kiro', manus: 'manus' });
    expect(PROVIDER_BY_ID.get('cursor')!.windows.map((w) => w.id)).toEqual(['total', 'auto_composer', 'api']);
    expect(PROVIDER_BY_ID.get('kiro')!.windows.map((w) => w.id)).toEqual(['credits']);
    expect(PROVIDER_BY_ID.get('manus')!.windows.map((w) => w.id)).toEqual(['daily_refresh', 'monthly']);
  });

  it('cursor: one billing cycle shared by total, auto, and api windows', () => {
    const r = parseCursor({ billingCycleEnd: '1793000000000', planUsage: { limit: 2000, includedSpend: 500, totalPercentUsed: 25, autoPercentUsed: 10, apiPercentUsed: 40 } });
    expect(r.windows.total).toEqual({ usedPercent: 25, resetAt: '2026-10-26T07:33:20.000Z' });
    expect(r.windows.auto_composer.usedPercent).toBe(10);
    expect(r.windows.api.usedPercent).toBe(40);
    expect(parseCursor({ planUsage: { limit: 2000, includedSpend: 500 } }).windows.total.usedPercent).toBe(25);
    expect(parseCursor({}).windows).toEqual({});
  });
  it('kiro: credits from the usage breakdown, with the plan and reset', () => {
    const r = parseKiro({
      nextDateReset: 1793000000,
      subscriptionInfo: { subscriptionTitle: 'KIRO PRO' },
      usageBreakdownList: [{ resourceType: 'CREDIT', currentUsageWithPrecision: 120, usageLimitWithPrecision: 1000 }],
    });
    expect(r.plan).toBe('KIRO PRO');
    expect(r.windows.credits).toEqual({ usedPercent: 12, resetAt: '2026-10-26T07:33:20.000Z' });
    const trial = parseKiro({ usageBreakdownList: [{ resourceType: 'CREDIT', currentUsageWithPrecision: 0, usageLimitWithPrecision: 0, freeTrialInfo: { currentUsageWithPrecision: 50, usageLimitWithPrecision: 500 } }] });
    expect(trial.windows.credits.usedPercent).toBe(10);
    expect(parseKiro({ usageBreakdownList: [] }).windows).toEqual({});
  });
  it('manus: daily refresh and monthly credits from the documented fields, plan from the quota', () => {
    const body = { ok: true, data: { total_credits: 4000, periodic_credits: 3000, pro_monthly_credits: 4000, refresh_credits: 75, max_refresh_credits: 300, next_refresh_time: 1793000000, refresh_interval: 'daily', current_period_end: 1795000000 } };
    const r = parseManus(body);
    expect(r.windows.daily_refresh).toEqual({ usedPercent: 75, resetAt: '2026-10-26T07:33:20.000Z' });
    expect(r.windows.monthly.usedPercent).toBe(25);
    expect(r.plan).toBe('Standard');
    expect(parseManus({ data: { pro_monthly_credits: 40000, periodic_credits: 40000 } }).plan).toBe('Extended');
    expect(parseManus({ data: { pro_monthly_credits: 0 } }).plan).toBe('Free');
    // a weekly refresh cadence has no matching window, so it is left out rather than mislabelled
    expect(parseManus({ data: { refresh_interval: 'weekly', max_refresh_credits: 100, refresh_credits: 10 } }).windows.daily_refresh).toBeUndefined();
  });
  it('reads the email out of a JWT', () => {
    expect(jwtEmail(jwt({ email: 'Me@X.com' }))).toBe('me@x.com');
    expect(jwtEmail('nope')).toBeUndefined();
  });

  it('cursor server: pending on 404, tokens on success, refresh with the refresh token', async () => {
    const pending = route({ [CURSOR.pollUrl]: () => new Response('', { status: 404 }) });
    expect((await handle({ action: 'cursor.poll', uuid: 'U', verifier: 'V' }, pending)).body).toMatchObject({ status: 'pending' });
    seen.length = 0;
    const done = route({ [CURSOR.pollUrl]: () => json({ accessToken: jwt({ email: 'me@x.com' }), refreshToken: 'R' }) });
    const r = await handle({ action: 'cursor.poll', uuid: 'U', verifier: 'V' }, done);
    expect(r.body).toMatchObject({ status: 'ok', refreshToken: 'R', email: 'me@x.com' });
    expect(seen[0].url).toBe(`${CURSOR.pollUrl}?uuid=U&verifier=V`);
    seen.length = 0;
    const rf = route({ [CURSOR.refreshUrl]: () => json({ accessToken: 'A2', refreshToken: 'R2' }) });
    const out = await handle({ action: 'refresh', kind: 'cursor', refreshToken: 'R' }, rf);
    expect(out.body).toMatchObject({ ok: true, accessToken: 'A2', refreshToken: 'R2' });
    expect(hdr(seen[0].init).Authorization).toBe('Bearer R');
  });
  it('cursor server: reads usage with the Connect headers', async () => {
    seen.length = 0;
    const f = route({ [CURSOR.usageUrl]: () => json({ planUsage: { totalPercentUsed: 40 } }) });
    const r = await handle({ action: 'quota', kind: 'cursor', accessToken: 'T' }, f);
    expect((r.body.result as { windows: Record<string, { usedPercent: number }> }).windows.total.usedPercent).toBe(40);
    expect(hdr(seen[0].init)['Connect-Protocol-Version']).toBe('1');
    expect(seen[0].init?.method).toBe('POST');
  });
  it('kiro server: device sign-in with Google or GitHub, polling, refresh, and usage fallbacks', async () => {
    seen.length = 0;
    const start = route({ [KIRO.authorizeUrl]: () => json({ deviceCode: 'D', userCode: 'WXYZ', verificationUriComplete: 'https://kiro.dev/device?user_code=WXYZ', expiresInMilliseconds: 300000, intervalInMilliseconds: 5000 }) });
    const s = await handle({ action: 'kiro.start', loginProvider: 'Github' }, start);
    expect(s.body).toMatchObject({ ok: true, userCode: 'WXYZ', expiresIn: 300, interval: 5 });
    expect(JSON.parse(String(seen[0].init?.body))).toEqual({ clientId: 'kiro-cli', loginProvider: 'Github' });
    expect(JSON.parse(String((await (async () => { seen.length = 0; await handle({ action: 'kiro.start', loginProvider: 'weird' }, start); return seen[0].init; })())?.body)).loginProvider).toBe('Google');
    const pending = route({ [KIRO.pollUrl]: () => json({ error: 'authorization_pending' }, 400) });
    expect((await handle({ action: 'kiro.poll', deviceCode: 'D' }, pending)).body).toMatchObject({ status: 'pending' });
    const ok = route({ [KIRO.pollUrl]: () => json({ accessToken: jwt({ email: 'k@x.com' }), refreshToken: 'R', profileArn: 'arn:aws:codewhisperer:us-east-1:1:profile/X' }) });
    expect((await handle({ action: 'kiro.poll', deviceCode: 'D' }, ok)).body).toMatchObject({ status: 'ok', email: 'k@x.com', profileArn: 'arn:aws:codewhisperer:us-east-1:1:profile/X' });
    const denied = route({ [KIRO.pollUrl]: () => json({ error: 'access_denied' }, 400) });
    expect((await handle({ action: 'kiro.poll', deviceCode: 'D' }, denied)).status).toBe(400);
    seen.length = 0;
    const rf = route({ [KIRO.refreshUrl]: () => json({ accessToken: 'A2', refreshToken: 'R2' }) });
    expect((await handle({ action: 'refresh', kind: 'kiro', refreshToken: 'R' }, rf)).body).toMatchObject({ accessToken: 'A2', refreshToken: 'R2' });
    expect(JSON.parse(String(seen[0].init?.body))).toEqual({ refreshToken: 'R' });
    // usage: the first endpoint fails, the second answers
    seen.length = 0;
    let n = 0;
    const g = async (url: string, init?: RequestInit) => {
      seen.push({ url, init });
      return n++ === 0 ? json({}, 500) : json({ usageBreakdownList: [{ resourceType: 'CREDIT', currentUsageWithPrecision: 10, usageLimitWithPrecision: 100 }] });
    };
    const q = await handle({ action: 'quota', kind: 'kiro', accessToken: 'T', profileArn: 'arn:x' }, g);
    expect((q.body.result as { windows: Record<string, { usedPercent: number }> }).windows.credits.usedPercent).toBe(10);
    expect(JSON.parse(String(seen[0].init?.body))).toMatchObject({ origin: 'AI_EDITOR', profileArn: 'arn:x', resourceType: 'AGENTIC_REQUEST' });
    expect(seen[1].url).toContain('/getUsageLimits?');
  });
  it('manus server: sends the key in the documented header and maps rejections', async () => {
    seen.length = 0;
    const f = route({ [MANUS.usageUrl]: () => json({ ok: true, data: { pro_monthly_credits: 4000, periodic_credits: 1000 } }) });
    const r = await handle({ action: 'quota', kind: 'manus', accessToken: 'KEY' }, f);
    expect((r.body.result as { plan?: string }).plan).toBe('Standard');
    expect(hdr(seen[0].init)['x-manus-api-key']).toBe('KEY');
    expect(seen[0].url).toBe('https://api.manus.ai/v2/usage.availableCredits');
    const no = route({ [MANUS.usageUrl]: () => json({ ok: false }, 401) });
    expect((await handle({ action: 'quota', kind: 'manus', accessToken: 'bad' }, no)).status).toBe(401);
  });
  it('a Manus result sets the account plan from the provider plans, and keeps a manual plan elsewhere', () => {
    const at = new Date('2026-10-26T12:00:00Z');
    const manus = PROVIDER_BY_ID.get('manus')!;
    const a = applyResult({ id: 'm', providerId: 'manus', account: '', login: '' as const, plan: 'Standard', tag: '', note: '', active: true, usage: {} }, manus, { windows: { monthly: { usedPercent: 25, resetAt: null } }, plan: 'Extended' }, 'manus', at);
    expect(a.plan).toBe('Extended');
    expect(a.usage.monthly.used).toBe(10000); // 25% of the Extended plan's 40,000 credits
  });
});

describe('Kilo Code, Kimi Code, and Grok Build', () => {
  const jwt = (p: object) => `h.${btoa(JSON.stringify(p))}.s`;
  const hdr = (i?: RequestInit) => i?.headers as Record<string, string>;
  const seen: { url: string; init?: RequestInit }[] = [];
  const route = (map: Record<string, () => Response>) => async (url: string, init?: RequestInit) => {
    seen.push({ url, init });
    const hit = Object.keys(map).find((k) => url.startsWith(k));
    if (!hit) throw new Error('unexpected ' + url);
    return map[hit]();
  };

  it('are configured with matching window ids', () => {
    expect(CONNECTOR_BY_PROVIDER).toMatchObject({ kilocode: 'kilocode', 'kimi-coding': 'kimi', 'grok-cli': 'grok' });
    expect(PROVIDER_BY_ID.get('kilocode')!.windows.map((w) => w.id)).toEqual(['kilo_pass']);
    expect(PROVIDER_BY_ID.get('kimi-coding')!.windows.map((w) => w.id)).toEqual(['session', 'weekly']);
    expect(PROVIDER_BY_ID.get('grok-cli')!.windows.map((w) => w.id)).toEqual(['weekly']);
  });

  it('kilo: the Kilo Pass allowance as one monthly window, nothing without a live pass', () => {
    const body = [{ result: { data: { json: { subscription: { status: 'active', currentPeriodBaseCreditsUsd: 19, currentPeriodBonusCreditsUsd: 1, currentPeriodUsageUsd: 5, nextBillingAt: '2026-11-01T00:00:00Z' } } } } }];
    const r = parseKiloPass(body);
    expect(r.windows.kilo_pass).toEqual({ usedPercent: 25, resetAt: '2026-11-01T00:00:00.000Z' });
    expect(r.plan).toBe('Kilo Pass');
    expect(parseKiloPass([{ result: { data: { json: { subscription: { status: 'canceled', currentPeriodBaseCreditsUsd: 19 } } } } }]).windows).toEqual({});
    expect(parseKiloPass({}).windows).toEqual({});
  });
  it('kimi: weekly from usage, the 5-hour window from limits, ratios as a fallback', () => {
    const r = parseKimi({ data: {
      usage: { limit: 100, used: 40, resetTime: '2026-10-30T00:00:00Z' },
      limits: [{ window: { duration: 300, timeUnit: 'TIME_UNIT_MINUTE' }, detail: { limit: 50, remaining: 10, resetTime: '2026-10-26T15:00:00Z' } }],
    } });
    expect(r.windows.weekly.usedPercent).toBe(40);
    expect(r.windows.session).toEqual({ usedPercent: 80, resetAt: '2026-10-26T15:00:00.000Z' });
    const fb = parseKimi({ usages: { limit_5h: { used_ratio: 0.25, reset_time: '2026-10-26T15:00:00Z' }, limit_7d: { used_ratio: 0.5 } } });
    expect(fb.windows.session.usedPercent).toBe(25);
    expect(fb.windows.weekly.usedPercent).toBe(50);
    expect(parseKimi({ limits: [{ window: { duration: 2, timeUnit: 'TIME_UNIT_DAY' }, detail: { limit: 10, used: 1 } }] }).windows).toEqual({});
  });
  it('grok: weekly credits with the period end and the subscription tier', () => {
    const r = parseGrok({ config: { creditUsagePercent: 35, currentPeriod: { end: '2026-10-30T00:00:00Z' } } }, { subscriptionTier: 'SuperGrok' });
    expect(r.windows.weekly).toEqual({ usedPercent: 35, resetAt: '2026-10-30T00:00:00.000Z' });
    expect(r.plan).toBe('SuperGrok');
    expect(parseGrok({}).windows).toEqual({});
  });

  it('kilo server: starts a code, maps poll statuses, and reads the pass with the editor header', async () => {
    seen.length = 0;
    const start = route({ [KILO.codesUrl]: () => json({ code: 'ABC123', verificationUrl: 'https://kilo.ai/device-auth?code=ABC123', expiresIn: 600 }) });
    expect((await handle({ action: 'kilo.start' }, start)).body).toMatchObject({ ok: true, deviceCode: 'ABC123', authUrl: 'https://kilo.ai/device-auth?code=ABC123', interval: 3 });
    for (const [status, expected] of [[202, 'pending'], [403, 'denied'], [410, 'expired']] as const) {
      const f = route({ [KILO.codesUrl]: () => new Response('', { status }) });
      expect((await handle({ action: 'kilo.poll', deviceCode: 'ABC123' }, f)).body).toMatchObject({ status: expected });
    }
    const ok = route({ [KILO.codesUrl]: () => json({ status: 'approved', token: 'TOK', userEmail: 'k@x.com' }) });
    expect((await handle({ action: 'kilo.poll', deviceCode: 'ABC123' }, ok)).body).toMatchObject({ status: 'ok', accessToken: 'TOK', email: 'k@x.com' });
    seen.length = 0;
    const pass = route({ [KILO.passUrl]: () => json([{ result: { data: { json: { subscription: { currentPeriodBaseCreditsUsd: 10, currentPeriodUsageUsd: 2 } } } } }]) });
    const q = await handle({ action: 'quota', kind: 'kilocode', accessToken: 'TOK' }, pass);
    expect((q.body.result as { windows: Record<string, { usedPercent: number }> }).windows.kilo_pass.usedPercent).toBe(20);
    expect(hdr(seen[0].init)['X-KILOCODE-EDITORNAME']).toBe('quota-tracker');
  });
  it('kimi server: identity headers on every call, device flow, refresh, and usage', async () => {
    seen.length = 0;
    const start = route({ [KIMI.deviceUrl]: () => json({ device_code: 'D', user_code: 'KIMI-1', verification_uri_complete: 'https://www.kimi.com/code/authorize_device?user_code=KIMI-1', expires_in: 600, interval: 5 }) });
    expect((await handle({ action: 'kimi.start' }, start)).status).toBe(400); // device id is required
    const s = await handle({ action: 'kimi.start', deviceId: 'dev-1' }, start);
    expect(s.body).toMatchObject({ ok: true, userCode: 'KIMI-1', interval: 5 });
    expect(hdr(seen[0].init)['X-Msh-Device-Id']).toBe('dev-1');
    expect(hdr(seen[0].init)['X-Msh-Platform']).toBe('kimi_code_cli');
    expect(String(seen[0].init?.body)).toContain(`client_id=${KIMI.clientId}`);
    const pending = route({ [KIMI.tokenUrl]: () => json({ error: 'authorization_pending' }, 400) });
    expect((await handle({ action: 'kimi.poll', deviceCode: 'D', deviceId: 'dev-1' }, pending)).body).toMatchObject({ status: 'pending' });
    const done = route({ [KIMI.tokenUrl]: () => json({ access_token: jwt({ email: 'u@x.com' }), refresh_token: 'R' }) });
    expect((await handle({ action: 'kimi.poll', deviceCode: 'D', deviceId: 'dev-1' }, done)).body).toMatchObject({ status: 'ok', refreshToken: 'R', email: 'u@x.com' });
    seen.length = 0;
    const rf = route({ [KIMI.tokenUrl]: () => json({ access_token: 'A2', refresh_token: 'R2' }) });
    expect((await handle({ action: 'refresh', kind: 'kimi', refreshToken: 'R', deviceId: 'dev-1' }, rf)).body).toMatchObject({ accessToken: 'A2', refreshToken: 'R2' });
    expect(String(seen[0].init?.body)).toContain('grant_type=refresh_token');
    seen.length = 0;
    const u = route({ [KIMI.usageUrl]: () => json({ usage: { limit: 10, used: 5 } }) });
    const q = await handle({ action: 'quota', kind: 'kimi', accessToken: 'T', deviceId: 'dev-1' }, u);
    expect((q.body.result as { windows: Record<string, { usedPercent: number }> }).windows.weekly.usedPercent).toBe(50);
    expect(hdr(seen[0].init).Authorization).toBe('Bearer T');
    expect((await handle({ action: 'quota', kind: 'kimi', accessToken: 'T' }, u)).status).toBe(400);
  });
  it('grok server: device flow, only x.ai sign-in addresses, refresh, and billing with the user id', async () => {
    seen.length = 0;
    const start = route({ [GROK.deviceUrl]: () => json({ device_code: 'D', user_code: 'ABCD-EFGH', verification_uri: 'https://accounts.x.ai/device', verification_uri_complete: 'https://accounts.x.ai/device?user_code=ABCD-EFGH', expires_in: 1800, interval: 5 }) });
    expect((await handle({ action: 'grok.start' }, start)).body).toMatchObject({ ok: true, userCode: 'ABCD-EFGH', authUrl: 'https://accounts.x.ai/device?user_code=ABCD-EFGH' });
    expect(String(seen[0].init?.body)).toContain('referrer=grok-build');
    const evil = route({ [GROK.deviceUrl]: () => json({ device_code: 'D', user_code: 'A-B', verification_uri: 'https://evil.example/login' }) });
    expect((await handle({ action: 'grok.start' }, evil)).status).toBe(502);
    const pending = route({ [GROK.tokenUrl]: () => json({ error: 'authorization_pending' }, 400) });
    expect((await handle({ action: 'grok.poll', deviceCode: 'D' }, pending)).body).toMatchObject({ status: 'pending' });
    const done = route({ [GROK.tokenUrl]: () => json({ access_token: 'A', refresh_token: 'R', id_token: jwt({ email: 'g@x.com' }) }) });
    expect((await handle({ action: 'grok.poll', deviceCode: 'D' }, done)).body).toMatchObject({ status: 'ok', email: 'g@x.com' });
    const rf = route({ [GROK.tokenUrl]: () => json({ access_token: 'A2', refresh_token: 'R2' }) });
    expect((await handle({ action: 'refresh', kind: 'grok', refreshToken: 'R' }, rf)).body).toMatchObject({ accessToken: 'A2' });
    seen.length = 0;
    const billing = route({
      [`${GROK.proxyUrl}/user`]: () => json({ userId: 'u-1', subscriptionTier: 'SuperGrok' }),
      [`${GROK.proxyUrl}/billing`]: () => json({ config: { creditUsagePercent: 12, currentPeriod: { end: '2026-10-30T00:00:00Z' } } }),
    });
    const q = await handle({ action: 'quota', kind: 'grok', accessToken: 'T' }, billing);
    expect((q.body.result as { plan?: string; windows: Record<string, { usedPercent: number }> }).windows.weekly.usedPercent).toBe(12);
    expect((q.body.result as { plan?: string }).plan).toBe('SuperGrok');
    expect(hdr(seen[1].init)['x-userid']).toBe('u-1');
    expect(hdr(seen[0].init)['X-XAI-Token-Auth']).toBe('xai-grok-cli');
  });
});

describe('Kiro organization (Microsoft) sign-in', () => {
  const jwt = (p: object) => `h.${btoa(JSON.stringify(p))}.s`;
  const hdr = (i?: RequestInit) => i?.headers as Record<string, string>;
  const ENDPOINT = 'https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token';
  const seen: { url: string; init?: RequestInit }[] = [];
  const f = async (url: string, init?: RequestInit) => {
    seen.push({ url, init });
    if (url === ENDPOINT) return json({ access_token: jwt({ preferred_username: 'Me@Corp.com' }), refresh_token: 'R2', expires_in: 3600 });
    if (url.startsWith(KIRO.usageUrl)) return json({ usageBreakdownList: [{ resourceType: 'CREDIT', currentUsageWithPrecision: 5, usageLimitWithPrecision: 50 }] });
    throw new Error('unexpected ' + url);
  };
  const details = { refreshToken: 'R1', clientId: 'cid', tokenEndpoint: ENDPOINT, scope: 'openid offline_access', profileArn: 'arn:aws:codewhisperer:us-east-1:1:profile/X' };

  it('accepts only https endpoints on a known identity provider', () => {
    expect(validateIdpEndpoint(ENDPOINT)).toBe(ENDPOINT);
    expect(validateIdpEndpoint('https://dev-123.okta.com/oauth2/v1/token')).toContain('okta.com');
    for (const bad of ['http://login.microsoftonline.com/x', 'https://evil.example/token', 'https://login.microsoftonline.com.evil.example/token', 'https://user:pw@login.microsoftonline.com/x', 'nope', 42]) {
      expect(validateIdpEndpoint(bad)).toBeNull();
    }
  });
  it('reads Entra tokens that carry preferred_username or upn instead of email', () => {
    expect(jwtEmail(jwt({ preferred_username: 'A@B.com' }))).toBe('a@b.com');
    expect(jwtEmail(jwt({ upn: 'u@b.com' }))).toBe('u@b.com');
  });
  it('imports the saved details by refreshing at the organization identity provider', async () => {
    seen.length = 0;
    const r = await handle({ action: 'kiro.import', ...details, scope: undefined, scopes: ['openid', 'offline_access'] }, f);
    expect(r.body).toMatchObject({ ok: true, refreshToken: 'R2', email: 'me@corp.com', profileArn: details.profileArn, idp: { clientId: 'cid', tokenEndpoint: ENDPOINT, scope: 'openid offline_access' } });
    const form = String(seen[0].init?.body);
    expect(form).toContain('grant_type=refresh_token');
    expect(form).toContain('client_id=cid');
    expect(form).toContain('scope=openid+offline_access');
    expect(form).not.toContain('client_secret');
  });
  it('refuses missing details and endpoints outside the allowlist, without any request', async () => {
    seen.length = 0;
    expect((await handle({ action: 'kiro.import', ...details, tokenEndpoint: 'https://evil.example/token' }, f)).status).toBe(400);
    expect((await handle({ action: 'kiro.import', ...details, scope: '' }, f)).status).toBe(400);
    expect((await handle({ action: 'kiro.import', ...details, clientId: undefined }, f)).status).toBe(400);
    expect(seen).toHaveLength(0);
    const rejected = async () => json({ error: 'invalid_grant' }, 400);
    expect((await handle({ action: 'kiro.import', ...details }, rejected)).status).toBe(400);
  });
  it('refreshes through the identity provider, and never through an unlisted host', async () => {
    seen.length = 0;
    const ok = await handle({ action: 'refresh', kind: 'kiro', refreshToken: 'R1', idp: { clientId: 'cid', tokenEndpoint: ENDPOINT, scope: 'openid offline_access' } }, f);
    expect(ok.body).toMatchObject({ ok: true, refreshToken: 'R2' });
    expect(seen[0].url).toBe(ENDPOINT);
    seen.length = 0;
    const bad = await handle({ action: 'refresh', kind: 'kiro', refreshToken: 'R1', idp: { clientId: 'cid', tokenEndpoint: 'https://evil.example/t', scope: 's' } }, f);
    expect(bad.status).toBe(400);
    expect(seen).toHaveLength(0);
  });
  it('marks usage requests from an organization sign-in with TokenType EXTERNAL_IDP', async () => {
    seen.length = 0;
    await handle({ action: 'quota', kind: 'kiro', accessToken: 'T', profileArn: 'arn:x', external: true }, f);
    expect(hdr(seen[0].init).TokenType).toBe('EXTERNAL_IDP');
    seen.length = 0;
    await handle({ action: 'quota', kind: 'kiro', accessToken: 'T', profileArn: 'arn:x' }, f);
    expect(hdr(seen[0].init).TokenType).toBeUndefined();
  });
});

describe('redirect back to the app', () => {
  const mem = new Map<string, string>();
  beforeEach(() => {
    mem.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  });
  const NOW = 1_800_000_000_000;
  const pend = (over = {}) => ({ kind: 'codex' as const, accountId: 'a1', providerId: 'codex', verifier: 'V', state: 'S1', redirectUri: CODEX.redirectUri, at: NOW - 1000, ...over });

  it('ignores addresses that are not a sign-in redirect', () => {
    expect(readCallback('', NOW)).toEqual({ status: 'none' });
    expect(readCallback('?tab=1', NOW)).toEqual({ status: 'none' });
    expect(readCallback('?code=abc', NOW)).toEqual({ status: 'none' }); // no state, so not ours
  });
  it('accepts a redirect whose state matches a sign-in this browser started', () => {
    savePending(pend());
    const r = readCallback('?code=abc&state=S1', NOW);
    expect(r).toMatchObject({ status: 'ready', code: 'abc' });
    expect(r.status === 'ready' && r.pending.accountId).toBe('a1');
  });
  it('rejects unknown, mismatched, expired, and error redirects', () => {
    expect(readCallback('?code=abc&state=S1', NOW)).toMatchObject({ status: 'error' }); // nothing pending
    savePending(pend());
    expect(readCallback('?code=abc&state=OTHER', NOW)).toMatchObject({ status: 'error' });
    expect(readCallback('?code=abc&state=S1', NOW + PENDING_TTL_MS + 5000)).toMatchObject({ status: 'error' });
    expect(readCallback('?error=access_denied&state=S1', NOW)).toMatchObject({ status: 'error', message: expect.stringContaining('access_denied') });
    clearPending();
    expect(loadPending()).toBeNull();
  });
  it('trades the code for tokens the way the paste flow does', async () => {
    const calls: Record<string, unknown>[] = [];
    const f = async (_u: string, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)));
      return json({ ok: true, accessToken: 'A', refreshToken: 'R' });
    };
    const g = await exchangeCallback(pend({ kind: 'antigravity', redirectUri: 'http://localhost:1455/auth/callback', profile: 'cli' }), 'CODE', f);
    expect(calls[0]).toMatchObject({ action: 'google.exchange', code: 'CODE', profile: 'cli', redirectUri: 'http://localhost:1455/auth/callback' });
    expect(g).toMatchObject({ accessToken: 'A', profile: 'cli' });
    await exchangeCallback(pend(), 'CODE', f);
    expect(calls[1]).toMatchObject({ action: 'codex.exchange', code: 'CODE', verifier: 'V' });
    await expect(exchangeCallback(pend({ kind: 'claude' }), 'CODE', f)).rejects.toThrow();
  });
  it('uses this app as the Google redirect on localhost, and the fixed addresses elsewhere', () => {
    const local = { hostname: 'localhost', origin: 'http://localhost:1455', port: '1455' };
    const other = { hostname: 'localhost', origin: 'http://localhost:5173', port: '5173' };
    const prod = { hostname: 'quota.example.com', origin: 'https://quota.example.com', port: '' };
    expect(redirectFor('antigravity', other)).toBe('http://localhost:5173/auth/callback');
    expect(redirectFor('antigravity', prod)).toBe(ANTIGRAVITY.redirectUri);
    expect(redirectFor('codex', other)).toBe('http://localhost:1455/auth/callback');
    expect(returnsToThisApp('antigravity', other)).toBe(true);
    expect(returnsToThisApp('antigravity', prod)).toBe(false);
    expect(returnsToThisApp('codex', local)).toBe(true);
    expect(returnsToThisApp('codex', other)).toBe(false);
    expect(new URL(antigravityAuthUrl('S', 'http://localhost:5173/auth/callback')).searchParams.get('redirect_uri')).toBe('http://localhost:5173/auth/callback');
  });
  it('the server only accepts loopback redirects for Google', async () => {
    expect(loopbackRedirect('http://localhost:5173/auth/callback')).toBe('http://localhost:5173/auth/callback');
    expect(loopbackRedirect('http://127.0.0.1:3000/callback')).toBe('http://127.0.0.1:3000/callback');
    for (const bad of ['https://evil.example/cb', 'http://localhost.evil.example:80/cb', 'http://localhost/cb', 'javascript:alert(1)', 42, undefined]) expect(loopbackRedirect(bad)).toBeNull();
    const seen: string[] = [];
    const f = async (url: string, init?: RequestInit) => {
      if (url === ANTIGRAVITY.tokenUrl) seen.push(String(init?.body));
      if (url === ANTIGRAVITY.tokenUrl) return json({ access_token: 'GA', refresh_token: 'GR' });
      return json({});
    };
    const env = { ANTIGRAVITY_OAUTH_CLIENT_SECRET: 's' };
    await handle({ action: 'google.exchange', code: 'C', redirectUri: 'http://localhost:5173/auth/callback' }, f, new Date(), env);
    await handle({ action: 'google.exchange', code: 'C', redirectUri: 'https://evil.example/cb' }, f, new Date(), env);
    expect(seen[0]).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback');
    expect(seen[1]).toContain(encodeURIComponent(ANTIGRAVITY.redirectUri));
  });
});

describe('server settings', () => {
  it('finds the client secret and forgives spaces and quotes', () => {
    expect(resolveServerEnv({ ANTIGRAVITY_OAUTH_CLIENT_SECRET: 'abc' }).ANTIGRAVITY_OAUTH_CLIENT_SECRET).toBe('abc');
    expect(resolveServerEnv({ ANTIGRAVITY_OAUTH_CLIENT_SECRET: '  "abc"  ' }).ANTIGRAVITY_OAUTH_CLIENT_SECRET).toBe('abc');
    expect(resolveServerEnv({ ANTIGRAVITY_OAUTH_CLIENT_SECRET: "'abc'" }).ANTIGRAVITY_OAUTH_CLIENT_SECRET).toBe('abc');
  });
  it('treats an empty or missing value as not set', () => {
    expect(resolveServerEnv({}).ANTIGRAVITY_OAUTH_CLIENT_SECRET).toBeUndefined();
    expect(resolveServerEnv({ ANTIGRAVITY_OAUTH_CLIENT_SECRET: '' }).ANTIGRAVITY_OAUTH_CLIENT_SECRET).toBeUndefined();
    expect(resolveServerEnv({ ANTIGRAVITY_OAUTH_CLIENT_SECRET: '   ' }).ANTIGRAVITY_OAUTH_CLIENT_SECRET).toBeUndefined();
  });
  it('the not-set-up message says where the file goes', async () => {
    const r = await handle({ action: 'google.exchange', code: 'C' }, async () => json({}), new Date(), resolveServerEnv({}));
    expect(r.status).toBe(503);
    expect(String(r.body.error)).toMatch(/\.env\.local/);
    expect(String(r.body.error)).toMatch(/leading dot/);
  });
});
