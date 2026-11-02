# Quota Tracker

See usage and reset countdowns for every provider account in one place.
No database. Enter usage by hand, or connect Manus, Cursor, Kiro, Antigravity (Google), GitHub Copilot, Claude, or Codex to read their quotas automatically
through a small serverless function.

**Stack:** Vite, React 18, TypeScript, plus one Vercel function (`api/connect.ts`). Data is saved in the browser's `localStorage`.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # reset-schedule tests
npm run build    # type-check + production build to dist/
```

## Install as an app (PWA)

The built site is an installable web app: it has a manifest, icons (including a maskable one and an Apple touch icon), and a
service worker that lets it open offline. Open the deployed site over HTTPS and use the browser's install option
(Chrome and Edge: the install icon in the address bar, or **Install app** in this app's ⋯ menu; iPhone: Share, then Add to Home
Screen, also offered in the ⋯ menu). Nothing is cached about your accounts beyond the app's own files: the sign-in and quota
requests (`/api/`) are never touched by the service worker, and accounts stay in `localStorage`.

Things to know: installing needs HTTPS (localhost counts for testing). The service worker is only registered in the built app, not
`npm run dev`. On iPhone, an installed app has its own storage, separate from Safari, so use Backup and restore to move your
accounts across. After a deploy, the app picks up the new version the next time it is opened online. `scripts/make-icons.py`
regenerates the icons.

## Deploy to Vercel

1. Push this folder to a Git repository.
2. In Vercel choose **Add New, Project** and import the repository.
3. Vercel detects Vite. Keep the defaults (build `npm run build`, output `dist`) and deploy.

Or from the CLI: `npx vercel`, then `npx vercel --prod`.

## How it works

Two entities: **providers** and **accounts**.

- **Providers are global config, owned by the maintainer.** They live in `src/config/providers.ts`, generated from
  OmniRoute's provider catalog (id, name, alias, category, brand color, mark, website) for the providers OmniRoute can
  read usage for, plus 17 market-scan additions (Groq, Mistral, Cerebras, and others) checked separately. Each provider lists its quota windows (for example Claude: "Session (5h)"
  and "Weekly (7d)"). Users cannot add, edit, or delete providers in the app.
- **Users add accounts.** Tap **Add account**, choose a provider (or tap **+** on a provider that already has accounts),
  enter the account name and the login it uses (Google, X, Microsoft, GitHub, email, API key). All of that provider's
  quotas appear on the account right away.
- **Then enter usage.** Type a number or tap the quick **+**. A rolling window (the 5-hour session) starts counting at
  first use. Weekly, monthly, and daily windows need that account's reset time entered once ("Set reset"); it then
  repeats on its own.

**Plans.** A provider can define plans that change which windows apply or how big they are. Manus has Standard (4,000
monthly credits), Customizable (8,000), Extended (40,000), and Free (daily refresh only); picking the plan on the account
sizes its windows. Manus is not in OmniRoute's catalog, so it is filled in from Manus's own help center and docs. Its
300 daily refresh credits reset at 00:00 UTC (shown in your local time), and monthly credits refresh on the account's
subscription date, which you enter once with "Set reset".

Providers being shut down carry a `deprecated` note: they are hidden from the picker, kept for existing accounts, and
shown with an "Ending" badge. See `PROVIDER_STATUS.md` for the availability and free-tier findings for every provider (stored in `src/config/research.ts`).

Providers whose quota windows are not mapped yet carry one generic "Usage" window. Refine them in the config file.
Window ids are saved with each account's usage, so keep them stable.

## Connect an account to fetch quotas

The app can sign in to a provider and read its quotas itself, the way OmniRoute does. Add an account for one of these
providers and it goes straight to sign-in; existing accounts have a **Sign in to fetch quotas** button.

- **Antigravity and Antigravity CLI (Google sign-in):** opens Google's sign-in, so you use your Google account directly.
  Afterwards the browser tries to open a `localhost:51121` page that will not load. That is expected: copy the full address and
  paste it back. Quotas come as Gemini and Claude & GPT pools, each with a 5-hour and a weekly window. This needs one server
  setting: add `ANTIGRAVITY_OAUTH_CLIENT_SECRET` (see `.env.example`) to the Vercel project's environment variables, and to
  `.env.local` for `npm run dev`. Without it, Google sign-in shows a clear "not set up" message. The value is Google's
  installed-app credential for its own Antigravity app, which OmniRoute also uses; keep it out of git.
- **Manus (API key):** Manus documents an API for reading credits, so this one needs no sign-in tricks. Create a key in your
  Manus developer settings, paste it into the connect dialog, and the daily refresh and monthly credits fill in. The plan is
  detected from the monthly allowance (4,000 Standard, 8,000 Customizable, 40,000 Extended, none Free). Weekly refresh
  cadences are not shown because the app has no weekly refresh window.
- **Cursor:** opens cursor.com's sign-in (Google, GitHub, or email). Nothing to copy: the dialog polls Cursor and finishes by
  itself. Quotas are the billing cycle's total, Auto + Composer, and API percentages.
- **Kiro:** pick Google or GitHub, enter the code Kiro shows, and approve. Credits come from Kiro's usage limits.
  **Microsoft:** Kiro's "Your organization" sign-in uses Microsoft Entra ID (or Okta and similar). It has no code flow, and OmniRoute
  only supports it by importing what the Kiro app saved, so this does the same. Sign in to Kiro with it once, choose "Your
  organization (Microsoft)", paste `~/.aws/sso/cache/kiro-auth-token.json` and the `profileArn` from
  `kiro.kiroagent/profile.json` (in Kiro's settings folder). Only the refresh token and sign-in settings are sent. The token
  endpoint must be https on a known identity provider (Microsoft, Okta, Auth0, OneLogin, Ping, Cognito, or Google), and
  usage requests are marked as organization tokens. AWS Builder ID and IAM Identity Center are not supported yet.
- **Kimi Code, Grok Build, Kilo Code:** each opens its own sign-in page in a new tab (Google or any other login it offers) and
  shows a short code. Approve it and the window finishes by itself. Kimi gives a 5-hour and a weekly window, Grok Build a weekly
  credit percentage, and Kilo Code its Kilo Pass monthly allowance. A plain Kilo credit balance has no reset, so it is not shown,
  and an account with no active Kilo Pass shows no windows.
- **GitHub Copilot:** shows a short code. Enter it at github.com/login/device and sign in to GitHub there. The window updates by itself once you approve.
- **Claude:** opens Claude's sign-in in a new tab. After you sign in, Claude shows a code; paste it back.
- **Codex (ChatGPT):** opens OpenAI's sign-in. Afterwards the browser tries to open a `localhost:1455` page that will
  not load. That is expected: copy the full address and paste it back.

**Coming back to the app.** For Antigravity (Google) and Codex the provider redirects the browser to a localhost address. If this
app is what answers at that address, the sign-in finishes by itself: the app recognizes the `?code=&state=` in its own address,
exchanges the code, reads the quotas, and shows a notice. The pending sign-in is kept in the browser for 15 minutes so a new tab
can complete what the first tab started, and the state must match or it is rejected. `npm run dev` now uses port 1455 (and refuses to start if it is taken), because OpenAI only redirects Codex to
`localhost:1455` and Google accepts any local port, so one port serves every provider with no pasting. On a deployed site the
redirect cannot reach the app: OpenAI fixes the address at localhost:1455 and Google's app only allows localhost, so both
fall back to copying the address from the browser. Pasting submits by itself, and coming back to the tab with the address on
the clipboard finishes the sign-in (the browser may ask permission to read the clipboard once).

Quotas are then read on connect, every 10 minutes while the page is open, and with **Refresh**. Expired Claude and
Codex sign-ins refresh automatically; if that fails, the account asks you to connect again. **Disconnect** deletes the token.

How it works: the browser cannot call these providers' login and usage endpoints directly, so `api/connect.ts` (a Vercel
function, code in `src/connect/server.ts`) forwards each request to a fixed list of provider hosts and stores nothing.
`npm run dev` serves the same route locally. Parsers and flows follow OmniRoute's (`src/connect/providers.ts`).

Things to know before relying on it:

- **Terms of service.** Except for Manus (an official API key), the sign-ins use the public client ids of each vendor's own CLI or IDE (the same ones OmniRoute uses),
  not a sign-in made for third-party apps. A provider may not allow that and could limit an account. The app says so and
  asks for confirmation before connecting.
- **Unofficial endpoints.** The usage endpoints are internal to each vendor and can change without notice. Nothing here was
  tested against the live services when it was written; the parsers are covered by tests built from OmniRoute's field names.
  If a provider changes, the account shows an error and the manual numbers keep working.
- **Tokens.** Stored in this browser in plain text (separately from accounts, so never in backups) and passed through your
  site's function to reach the provider. Anyone with access to the browser profile could read them.
- **Abuse.** The function only talks to the fixed hosts and rejects other origins, but it has no rate limit. Add one (for
  example in Vercel's firewall) if you publish the site widely.
- **Other providers** (CodeBuddy, Qoder, Cline/ClinePass, Devin CLI, and the rest) stay manual until their sign-ins are ported.

## Features

- Light, dark, or match-the-device theme from the settings menu (⋯ in the top bar). The choice is remembered, applied before the
  first paint so a dark choice never flashes light, and the phone's browser bar color follows it. A test checks text contrast in both themes.
- Accounts grouped under their provider (brand avatar, category), with **+** to add an account; folded state is remembered
- Login logos, plan and tag labels, pause an account, duplicate for another login
- Status levels (healthy, low, critical, paused) with counts, filters, urgency sorting, search, compact layout
- Backup: copy or download JSON, then Replace or Merge. Older saved data converts automatically.

## Notes

- Data is stored per browser and per site address. A different device, browser, or domain starts empty.
  Use **Data** to copy or download a backup and paste it into the other browser.
- Times use the device's local time zone.
- Reset types: rolling window, daily, weekly, monthly (day clamped to month length). Rolling windows go idle when they end and restart at your next use.
- The page must be open (or reopened) for usage to clear. On return it catches up automatically.
- Open tabs of the same site stay in sync.

## Layout

- `src/schedule.ts` reset math, `src/schedule.test.ts` its tests
- `src/config/providers.ts` the global provider list, `src/legacy.ts` converts older saved layouts
- `src/status.ts` low/critical thresholds (15% and 40%), `src/prefs.ts` remembered filters
- `src/storage.ts` localStorage load/save, v1 migration, backup validation
- `src/components/` account card, provider picker, account form, data backup dialog
