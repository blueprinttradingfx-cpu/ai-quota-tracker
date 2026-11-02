import { beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import App from './App';
import AccountCard from './components/AccountCard';
import ProviderPicker from './components/ProviderPicker';
import { PROVIDERS, PROVIDER_BY_ID } from './config/providers';
import { computeMarks } from './config/marks';
import { buildViews } from './view';
import type { Account } from './types';
import { applyTheme, THEME_COLOR, type ThemeDoc } from './theme';
import { loadPrefs } from './prefs';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  };
});

const hours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const acct = (over: Partial<Account> = {}): Account => ({
  id: 'a1', providerId: 'claude', account: 'me@example.com', login: 'google', plan: '', tag: 'work', note: '', active: true,
  usage: { session: { used: 90, next: hours(2) }, weekly: { used: 20, next: hours(60), anchor: true } }, ...over,
});

describe('rendering', () => {
  it('shows the onboarding screen when there are no accounts', () => {
    const html = renderToString(<App />);
    expect(html).toContain('Every quota, one place');
    expect(html).toContain('Add your first account');
    expect(html).toContain('Claude Code'); // sign-in shortcut chips
    expect(html).not.toContain('Need attention');
  });

  it('shows the summary, filters, provider group, and account cards', () => {
    mem.set('quota-tracker-v4', JSON.stringify({ version: 4, accounts: [acct(), acct({ id: 'a2', account: 'other@example.com', usage: { session: { used: 10, next: hours(1) } } })] }));
    const html = renderToString(<App />);
    expect(html).toContain('Need attention');
    expect(html).toContain('Next reset');
    expect(html).toContain('Claude Code');
    expect(html).toContain('me@example.com');
    expect(html).toContain('% left');
    expect(html).toContain('Resets in');
    expect(html).toContain('Filters');
    expect(html).toContain('Add account to Claude Code');
    expect(html).toContain('Open Claude Code website');
  });

  it('marks critical accounts with a symbol as well as a color', () => {
    const [v] = buildViews({ accounts: [acct()] });
    const html = renderToString(<AccountCard view={v} now={new Date()} compact={false} onUsed={() => {}} onStart={() => {}} onReset={() => {}} onToggleActive={() => {}} onEdit={() => {}} onDuplicate={() => {}} onDelete={() => {}} />);
    expect(html).toContain('✖');
    expect(html).toContain('Critical');
    expect(html).toContain('role="progressbar"');
  });

  it('hides manual controls for a connected account and shows its freshness', () => {
    const connected = acct({ connection: 'claude', syncedAt: new Date(Date.now() - 5 * 60_000).toISOString() });
    const [v] = buildViews({ accounts: [connected] });
    const html = renderToString(<AccountCard view={v} now={new Date()} compact={false} onUsed={() => {}} onStart={() => {}} onReset={() => {}} onToggleActive={() => {}} onEdit={() => {}} onDuplicate={() => {}} onDelete={() => {}} connectable />);
    expect(html).toContain('Live');
    expect(html).toContain('Refresh');
    expect(html).not.toContain('Used for');
    expect(html).not.toContain('Sign in to fetch quotas');
  });

  it('offers sign-in on an unconnected account of a supported provider', () => {
    const [v] = buildViews({ accounts: [acct()] });
    const html = renderToString(<AccountCard view={v} now={new Date()} compact={false} onUsed={() => {}} onStart={() => {}} onReset={() => {}} onToggleActive={() => {}} onEdit={() => {}} onDuplicate={() => {}} onDelete={() => {}} connectable />);
    expect(html).toContain('Sign in to fetch quotas');
    expect(html).toContain('Used for');
  });

  it('has a view toggle, and compact mode swaps the detailed windows for one-line rows', () => {
    mem.set('quota-tracker-v4', JSON.stringify({ version: 4, accounts: [acct()] }));
    const detailed = renderToString(<App />);
    expect(detailed).toContain('aria-label="Compact view"');
    expect(detailed).toContain('aria-label="Detailed view"');
    expect(detailed).not.toContain('Compact view</label>'); // no longer buried in the filter panel
    const [v] = buildViews({ accounts: [acct()] });
    const props = { view: v, now: new Date(), onUsed: () => {}, onStart: () => {}, onReset: () => {}, onToggleActive: () => {}, onEdit: () => {}, onDuplicate: () => {}, onDelete: () => {}, connectable: true };
    const compact = renderToString(<AccountCard {...props} compact />);
    expect(compact).toContain('class="card compact"');
    expect(compact).toContain('class="crow"');
    expect(compact).not.toContain('Used for');
    expect(compact).not.toContain('role="progressbar"');
    expect(compact).toContain('Sign in to fetch quotas');
    expect(renderToString(<AccountCard {...props} compact={false} />)).not.toContain('class="crow"');
  });

  it('remembers the chosen view', () => {
    mem.set('quota-tracker-v4', JSON.stringify({ version: 4, accounts: [acct()] }));
    mem.set('quota-tracker-prefs-v1', JSON.stringify({ compact: true }));
    expect(renderToString(<App />)).toContain('class="card compact"');
  });

  it('lists sign-in providers first in the picker, under their own heading', () => {
    const html = renderToString(<ProviderPicker providers={PROVIDERS.filter((p) => !p.deprecated)} counts={{}} signIn={new Set(['claude', 'cursor'])} onPick={() => {}} onClose={() => {}} />);
    expect(html.indexOf('Sign-in supported')).toBeGreaterThan(-1);
    expect(html.indexOf('Track by hand')).toBeGreaterThan(html.indexOf('Sign-in supported'));
    expect(html.indexOf('Claude Code')).toBeLessThan(html.indexOf('Track by hand'));
  });
});

describe('provider marks', () => {
  it('gives every provider its own short mark', () => {
    const marks = computeMarks(PROVIDERS);
    expect(marks.size).toBe(PROVIDERS.length);
    expect(new Set(marks.values()).size).toBe(PROVIDERS.length);
    for (const m of marks.values()) expect(m.length).toBeGreaterThanOrEqual(1);
  });
  it('keeps the OmniRoute mark where it is unique and separates the colliding ones', () => {
    const marks = computeMarks(PROVIDERS);
    expect(marks.get('kimi-coding')).not.toBe(marks.get('kilocode'));
    expect(marks.get('antigravity')).not.toBe(marks.get('anthropic'));
    expect(marks.get(PROVIDER_BY_ID.get('claude')!.id)).toBeTruthy();
  });
});

describe('theme', () => {
  const fakeDoc = (initial: Record<string, string> = {}) => {
    const attrs = { ...initial };
    const meta: Record<string, string> = {};
    const doc: ThemeDoc = {
      documentElement: {
        getAttribute: (n) => attrs[n] ?? null,
        setAttribute: (n, v) => void (attrs[n] = v),
        removeAttribute: (n) => void delete attrs[n],
      },
      querySelector: () => ({ setAttribute: (n, v) => void (meta[n] = v) }),
    };
    return { doc, attrs, meta };
  };

  it('sets and clears the theme attribute and the browser bar color', () => {
    const { doc, attrs, meta } = fakeDoc();
    applyTheme('dark', false, doc);
    expect(attrs['data-theme']).toBe('dark');
    expect(meta.content).toBe(THEME_COLOR.dark);
    applyTheme('light', true, doc);
    expect(attrs['data-theme']).toBe('light');
    expect(meta.content).toBe(THEME_COLOR.light);
    applyTheme('system', true, doc);
    expect(attrs['data-theme']).toBeUndefined();
    expect(attrs['data-theme-by']).toBeUndefined();
    expect(meta.content).toBe(THEME_COLOR.dark); // the device is dark
  });

  it('leaves a theme chosen by a host page alone when set to match the device', () => {
    const { doc, attrs, meta } = fakeDoc({ 'data-theme': 'dark' });
    applyTheme('system', false, doc);
    expect(attrs['data-theme']).toBe('dark');
    expect(meta.content).toBe(THEME_COLOR.dark);
  });

  it('remembers the choice, ignores junk, and defaults to the device', () => {
    expect(loadPrefs().theme).toBe('system');
    mem.set('quota-tracker-prefs-v1', JSON.stringify({ theme: 'dark' }));
    expect(loadPrefs().theme).toBe('dark');
    mem.set('quota-tracker-prefs-v1', JSON.stringify({ theme: 'purple' }));
    expect(loadPrefs().theme).toBe('system');
  });

  it('offers the theme choice in the settings menu', () => {
    mem.set('quota-tracker-v4', JSON.stringify({ version: 4, accounts: [acct()] }));
    const html = renderToString(<App />);
    expect(html).toContain('aria-label="Settings"');
  });
});
