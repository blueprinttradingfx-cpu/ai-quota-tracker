import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { isIos } from './install';

const file = (p: string) => new URL(`../${p}`, import.meta.url);
const text = (p: string) => readFileSync(file(p), 'utf8');
const png = (p: string) => {
  const b = readFileSync(file(p));
  return { sig: b.subarray(0, 8).toString('hex'), w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};
const PNG_SIG = '89504e470d0a1a0a';

describe('web app manifest', () => {
  const m = JSON.parse(text('public/manifest.webmanifest'));
  it('has what browsers need to offer installation', () => {
    expect(m.name).toBeTruthy();
    expect(m.short_name.length).toBeLessThanOrEqual(12);
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/');
    expect(m.scope).toBe('/');
    expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(m.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it('lists real PNG icons at the sizes it claims, including a maskable one', () => {
    const sizes = new Set<string>();
    for (const icon of m.icons) {
      const img = png(`public${icon.src}`);
      expect(img.sig, icon.src).toBe(PNG_SIG);
      expect(`${img.w}x${img.h}`, icon.src).toBe(icon.sizes);
      sizes.add(icon.sizes);
    }
    expect(sizes.has('192x192') && sizes.has('512x512')).toBe(true);
    expect(m.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
  });
  it('has an Apple touch icon and a favicon', () => {
    expect(png('public/icons/apple-touch-icon.png')).toMatchObject({ sig: PNG_SIG, w: 180, h: 180 });
    expect(png('public/icons/favicon-48.png').sig).toBe(PNG_SIG);
  });
});

describe('page tags and hosting', () => {
  const html = text('index.html');
  it('links the manifest, icons, and phone settings', () => {
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('rel="apple-touch-icon" href="/icons/apple-touch-icon.png"');
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('name="apple-mobile-web-app-capable"');
    expect(html).toContain('viewport-fit=cover');
  });
  it('serves the app for any path except the API, and never caches the service worker', () => {
    const v = JSON.parse(text('vercel.json'));
    expect(v.rewrites[0]).toEqual({ source: '/((?!api/).*)', destination: '/index.html' });
    const sw = v.headers.find((h: { source: string }) => h.source === '/sw.js');
    expect(sw.headers).toContainEqual({ key: 'Cache-Control', value: 'no-cache' });
  });
});

describe('service worker', () => {
  const src = text('public/sw.js');
  function load() {
    const listeners: Record<string, (e: unknown) => void> = {};
    const store = new Map<string, Response>();
    const key = (r: unknown) => (typeof r === 'string' ? r : (r as { url: string }).url);
    const caches = {
      open: async () => ({ addAll: async () => {}, put: async (k: unknown, v: Response) => void store.set(key(k), v) }),
      match: async (r: unknown) => store.get(key(r)),
      keys: async () => [],
      delete: async () => true,
    };
    const self = { addEventListener: (t: string, f: (e: unknown) => void) => void (listeners[t] = f), location: { origin: 'https://app.test' }, skipWaiting: () => {}, clients: { claim: () => {} } };
    const fetchMock = vi.fn();
    new Function('self', 'caches', 'fetch', 'Response', 'URL', src)(self, caches, fetchMock, Response, URL);
    /** Fires a fetch event and returns the response the worker gave, or null when it left the request alone. */
    const run = async (req: { method?: string; url: string; mode?: string }) => {
      const box: { p: Promise<Response> | null } = { p: null };
      listeners.fetch({ request: { method: 'GET', mode: 'cors', ...req }, respondWith: (p: Promise<Response>) => void (box.p = p) });
      const res = box.p ? await box.p : null;
      await new Promise((r) => setTimeout(r, 0)); // let background cache writes finish
      return res;
    };
    return { run, fetchMock, store };
  }

  it('leaves the sign-in API, other sites, and non-GET requests alone', async () => {
    const { run, fetchMock } = load();
    expect(await run({ url: 'https://app.test/api/connect' })).toBeNull();
    expect(await run({ url: 'https://app.test/api/connect', method: 'POST' })).toBeNull();
    expect(await run({ url: 'https://api.anthropic.com/api/oauth/usage' })).toBeNull();
    expect(await run({ url: 'https://app.test/', method: 'POST' })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('opens the app offline from the last page it saw', async () => {
    const { run, fetchMock } = load();
    fetchMock.mockResolvedValueOnce(new Response('<html>app</html>', { status: 200 }));
    expect(await (await run({ url: 'https://app.test/', mode: 'navigate' }))!.text()).toBe('<html>app</html>');
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    expect(await (await run({ url: 'https://app.test/auth/callback?code=x', mode: 'navigate' }))!.text()).toBe('<html>app</html>');
  });
  it('serves built files from the saved copy after the first load', async () => {
    const { run, fetchMock } = load();
    fetchMock.mockResolvedValueOnce(new Response('console.log(1)', { status: 200 }));
    await run({ url: 'https://app.test/assets/index-abc.js' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await (await run({ url: 'https://app.test/assets/index-abc.js' }))!.text()).toBe('console.log(1)');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('does not save failed responses', async () => {
    const { run, fetchMock, store } = load();
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 500 }));
    await run({ url: 'https://app.test/assets/missing.js' });
    expect(store.size).toBe(0);
  });
});

describe('install helper', () => {
  it('recognizes iPhone, iPad, and iPadOS pretending to be a Mac', () => {
    expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
    expect(isIos('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(true);
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true);
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false);
    expect(isIos('Mozilla/5.0 (Linux; Android 14) Chrome/120')).toBe(false);
  });
});
