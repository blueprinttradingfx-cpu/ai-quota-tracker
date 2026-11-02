/**
 * Parsers for the quota endpoints that GitHub Copilot, Claude, and Codex expose to their own apps.
 * Field names and window rules follow OmniRoute's usage fetchers (open-sse/services/usage/*).
 * These are the vendors' internal endpoints, not published APIs, so they can change without notice.
 */

export type ConnectorKind = 'github' | 'claude' | 'codex' | 'antigravity' | 'cursor' | 'kiro' | 'manus' | 'kilocode' | 'kimi' | 'grok';

/** Provider ids that can sign in and read quotas directly. */
export const CONNECTOR_BY_PROVIDER: Record<string, ConnectorKind> = {
  antigravity: 'antigravity',
  agy: 'antigravity',
  cursor: 'cursor',
  kiro: 'kiro',
  manus: 'manus',
  kilocode: 'kilocode',
  'kimi-coding': 'kimi',
  'grok-cli': 'grok',
  github: 'github',
  claude: 'claude',
  codex: 'codex',
};

/** Antigravity (IDE) and Antigravity CLI sign in the same way but identify as different clients. */
export const ANTIGRAVITY_PROFILE: Record<string, 'ide' | 'cli'> = { antigravity: 'ide', agy: 'cli' };

export interface WindowReading {
  /** 0-100. */
  usedPercent: number;
  resetAt: string | null;
}

export interface QuotaResult {
  /** Keyed by our window id (session, weekly, premium_interactions, ...). */
  windows: Record<string, WindowReading>;
  plan?: string;
  email?: string;
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

export function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** ISO string, epoch seconds, epoch milliseconds, or a numeric string; null when unusable. */
export function parseReset(v: unknown): string | null {
  if (v == null || v === '') return null;
  let d: Date;
  const n = num(v);
  if (n != null) d = new Date(n < 1e12 ? n * 1000 : n);
  else if (typeof v === 'string') d = new Date(v);
  else return null;
  return Number.isNaN(d.getTime()) || d.getTime() <= 0 ? null : d.toISOString();
}

export function parseGithub(data: unknown): QuotaResult {
  const out: QuotaResult = { windows: {} };
  if (!isObj(data)) return out;
  if (typeof data.copilot_plan === 'string') out.plan = data.copilot_plan;
  if (typeof data.login === 'string') out.email = data.login;

  const snapshots = data.quota_snapshots;
  if (isObj(snapshots)) {
    const reset = parseReset(data.quota_reset_date ?? data.quotaResetDate);
    for (const id of ['premium_interactions', 'chat', 'completions']) {
      const s = snapshots[id];
      if (!isObj(s) || s.unlimited === true) continue;
      const pr = num(s.percent_remaining ?? s.percentRemaining);
      const ent = num(s.entitlement ?? s.total);
      const rem = num(s.remaining ?? s.quota_remaining);
      let used: number | null = null;
      if (pr != null) used = 100 - pr;
      else if (ent != null && ent > 0 && rem != null) used = ((ent - rem) / ent) * 100;
      if (used != null) out.windows[id] = { usedPercent: clamp(used), resetAt: reset };
    }
    return out;
  }

  // Plans without snapshots report what is left of a monthly allowance.
  const left = data.limited_user_quotas;
  const totals = data.monthly_quotas;
  if (isObj(left) && isObj(totals)) {
    const reset = parseReset(data.limited_user_reset_date ?? data.limitedUserResetDate);
    for (const id of ['premium_interactions', 'chat', 'completions']) {
      const total = num(totals[id]);
      const remaining = num(left[id]);
      if (total != null && total > 0 && remaining != null) {
        out.windows[id] = { usedPercent: clamp(((total - Math.min(remaining, total)) / total) * 100), resetAt: reset };
      }
    }
  }
  return out;
}

export function parseClaude(data: unknown): QuotaResult {
  const out: QuotaResult = { windows: {} };
  if (!isObj(data)) return out;
  for (const [key, id] of [['five_hour', 'session'], ['seven_day', 'weekly']] as const) {
    const w = data[key];
    if (!isObj(w)) continue;
    const u = num(w.utilization);
    if (u != null) out.windows[id] = { usedPercent: clamp(u), resetAt: parseReset(w.resets_at ?? w.resetsAt) };
  }
  return out;
}

const WEEK_SECONDS = 6 * 24 * 3600;

export function parseCodex(data: unknown, now: Date): QuotaResult {
  const out: QuotaResult = { windows: {} };
  if (!isObj(data)) return out;
  if (typeof data.plan_type === 'string') out.plan = data.plan_type;
  if (typeof data.email === 'string') out.email = data.email;
  const limit = isObj(data.rate_limit) ? data.rate_limit : data;
  const windows = [limit.primary_window, limit.secondary_window];
  windows.forEach((w, i) => {
    if (!isObj(w)) return;
    const used = num(w.used_percent ?? w.usedPercent);
    if (used == null) return;
    const seconds = num(w.limit_window_seconds ?? w.limitWindowSeconds);
    // Labels follow the real window length: a 7-day primary window is weekly, not a session.
    const id = seconds != null ? (seconds >= WEEK_SECONDS ? 'weekly' : 'session') : i === 0 ? 'session' : 'weekly';
    if (out.windows[id]) return;
    const resetAtField = num(w.reset_at ?? w.resetAt);
    const after = num(w.reset_after_seconds ?? w.resetAfterSeconds);
    let resetAt: string | null = null;
    if (resetAtField != null && resetAtField > 0) resetAt = parseReset(resetAtField);
    else if (after != null && after > 0) resetAt = new Date(now.getTime() + after * 1000).toISOString();
    // A window that has never started still counts down from its full length; treat it as idle.
    if (used === 0 && seconds != null && after != null && after >= seconds) resetAt = null;
    out.windows[id] = { usedPercent: clamp(used), resetAt };
  });
  return out;
}

/** Maps a quota group's name onto the ids we use: "Gemini Models" is gemini, Claude and GPT share one pool. */
function antigravityGroupId(displayName: unknown, id: unknown): string | null {
  const text = `${String(id ?? '')} ${String(displayName ?? '')}`.toLowerCase();
  if (text.includes('gemini')) return 'gemini';
  if (text.includes('claude') || text.includes('gpt')) return 'claude_gpt';
  const fallback = String(displayName ?? id ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return fallback || null;
}

function antigravityWindow(bucket: Record<string, unknown>): 'session' | 'weekly' | null {
  const explicit = String(bucket.window ?? '').trim().toLowerCase();
  if (explicit === '5h' || explicit === 'session') return 'session';
  if (explicit === 'weekly' || explicit === '7d') return 'weekly';
  const text = `${String(bucket.bucketId ?? '')} ${String(bucket.displayName ?? '')}`.toLowerCase();
  if (/\b5h\b|five[-\s]?hour|\bsession\b/.test(text)) return 'session';
  if (/\bweekly\b|\b7d\b|seven[-\s]?day/.test(text)) return 'weekly';
  return null;
}

/** Antigravity's retrieveUserQuotaSummary: groups of buckets, each a 5-hour session or weekly window. */
export function parseAntigravity(data: unknown): QuotaResult {
  const out: QuotaResult = { windows: {} };
  if (!isObj(data)) return out;
  const nested = isObj(data.quotaSummary) ? data.quotaSummary : null;
  const groups = Array.isArray(data.groups) ? data.groups : nested && Array.isArray(nested.groups) ? nested.groups : [];
  for (const g of groups) {
    if (!isObj(g)) continue;
    const gid = antigravityGroupId(g.displayName, g.groupId ?? g.id);
    if (!gid || !Array.isArray(g.buckets)) continue;
    for (const b of g.buckets) {
      if (!isObj(b) || b.disabled === true) continue;
      const window = antigravityWindow(b);
      const key = window ? `${gid}_${window}` : null;
      if (!key || out.windows[key]) continue;
      const remaining = isObj(b.remaining) ? b.remaining : {};
      const fraction = num(remaining.remainingFraction ?? b.remainingFraction);
      if (fraction == null || fraction < 0) continue;
      const resetAt = parseReset(remaining.resetTime ?? b.resetTime);
      // No reset time and a full allowance means the window has not started (or has no limit).
      out.windows[key] = { usedPercent: clamp((1 - Math.min(1, fraction)) * 100), resetAt };
    }
  }
  return out;
}

/** Cursor's GetCurrentPeriodUsage: one billing cycle with a total and per-feature percentages. */
export function parseCursor(data: unknown): QuotaResult {
  const out: QuotaResult = { windows: {} };
  if (!isObj(data) || !isObj(data.planUsage)) return out;
  const plan = data.planUsage;
  const limit = num(plan.limit ?? plan.limitCents ?? plan.totalLimitCents);
  const spent = num(plan.includedSpend ?? plan.usedCents ?? plan.used ?? plan.totalSpend);
  let total = num(plan.totalPercentUsed ?? plan.percentUsed);
  if (total == null && limit != null && limit > 0 && spent != null) total = (spent / limit) * 100;
  if (total == null) return out;
  const resetAt = parseReset(data.billingCycleEnd ?? plan.billingCycleEnd);
  out.windows.total = { usedPercent: clamp(total), resetAt };
  out.windows.auto_composer = { usedPercent: clamp(num(plan.autoPercentUsed) ?? 0), resetAt };
  out.windows.api = { usedPercent: clamp(num(plan.apiPercentUsed) ?? 0), resetAt };
  return out;
}

/** Kiro's GetUsageLimits: usage breakdowns per resource type, all resetting on nextDateReset. */
export function parseKiro(data: unknown): QuotaResult {
  const out: QuotaResult = { windows: {} };
  if (!isObj(data)) return out;
  const sub = isObj(data.subscriptionInfo) ? data.subscriptionInfo : null;
  if (sub && typeof sub.subscriptionTitle === 'string' && sub.subscriptionTitle.trim()) out.plan = sub.subscriptionTitle.trim();
  const user = isObj(data.userInfo) ? data.userInfo : null;
  if (user && typeof user.email === 'string') out.email = user.email;
  const list = Array.isArray(data.usageBreakdownList) ? data.usageBreakdownList.filter(isObj) : [];
  const main = list.find((b) => String(b.resourceType ?? '').toLowerCase() === 'credit') ?? list.find((b) => (num(b.usageLimitWithPrecision) ?? 0) > 0) ?? list[0];
  if (!main) return out;
  let used = num(main.currentUsageWithPrecision) ?? 0;
  let limit = num(main.usageLimitWithPrecision) ?? 0;
  // Accounts on a free trial can have the allowance only in freeTrialInfo.
  if (limit <= 0 && isObj(main.freeTrialInfo)) {
    used = num(main.freeTrialInfo.currentUsageWithPrecision) ?? 0;
    limit = num(main.freeTrialInfo.usageLimitWithPrecision) ?? 0;
  }
  if (limit <= 0) return out;
  out.windows.credits = { usedPercent: clamp((used / limit) * 100), resetAt: parseReset(data.nextDateReset ?? data.resetDate) };
  return out;
}

/** Manus's usage.availableCredits (API key). Accepts the wrapped or the bare data object. */
export function parseManus(body: unknown): QuotaResult {
  const out: QuotaResult = { windows: {} };
  const data = isObj(body) && isObj(body.data) ? body.data : body;
  if (!isObj(data)) return out;
  const max = num(data.max_refresh_credits);
  const left = num(data.refresh_credits);
  if (data.refresh_interval === 'daily' && max != null && max > 0 && left != null) {
    const next = num(data.next_refresh_time);
    out.windows.daily_refresh = { usedPercent: clamp((1 - Math.min(left, max) / max) * 100), resetAt: next != null && next > 0 ? parseReset(next) : null };
  }
  const quota = num(data.pro_monthly_credits);
  const periodic = num(data.periodic_credits);
  if (quota != null && quota > 0 && periodic != null) {
    const end = num(data.current_period_end);
    out.windows.monthly = { usedPercent: clamp((1 - Math.min(periodic, quota) / quota) * 100), resetAt: end != null && end > 0 ? parseReset(end) : null };
    out.plan = quota >= 40000 ? 'Extended' : quota >= 8000 ? 'Customizable' : 'Standard';
  } else if (quota === 0) {
    out.plan = 'Free';
  }
  return out;
}

/** Kilo Code's Kilo Pass: a monthly credit allowance. The plain credit balance has no reset, so it is not a window. */
export function parseKiloPass(body: unknown): QuotaResult {
  const out: QuotaResult = { windows: {} };
  const item = Array.isArray(body) ? body[0] : body;
  const result = isObj(item) ? item.result : null;
  const data = isObj(result) ? result.data : null;
  const root = isObj(data) && isObj(data.json) ? data.json : isObj(data) ? data : isObj(item) ? item : null;
  const sub = root && isObj(root.subscription) ? root.subscription : null;
  if (!sub || (sub.currentPeriodBaseCreditsUsd == null && sub.currentPeriodUsageUsd == null)) return out;
  if (typeof sub.status === 'string' && !['active', 'past_due', 'trialing'].includes(sub.status)) return out;
  const total = (num(sub.currentPeriodBaseCreditsUsd) ?? 0) + (num(sub.currentPeriodBonusCreditsUsd) ?? 0);
  if (total <= 0) return out;
  out.windows.kilo_pass = {
    usedPercent: clamp(((num(sub.currentPeriodUsageUsd) ?? 0) / total) * 100),
    resetAt: parseReset(sub.nextBillingAt ?? sub.nextRenewalAt),
  };
  out.plan = 'Kilo Pass';
  return out;
}

const HOUR_MS_UNITS: Record<string, number> = { TIME_UNIT_MINUTE: 1 / 60, TIME_UNIT_HOUR: 1, TIME_UNIT_DAY: 24, TIME_UNIT_WEEK: 168 };

function kimiDetail(detail: unknown): WindowReading | null {
  if (!isObj(detail)) return null;
  const limit = num(detail.limit ?? detail.Limit);
  if (limit == null || limit <= 0) return null;
  const used = num(detail.used ?? detail.Used);
  const remaining = num(detail.remaining ?? detail.Remaining);
  const spent = used ?? (remaining == null ? 0 : limit - remaining);
  return { usedPercent: clamp((spent / limit) * 100), resetAt: parseReset(detail.resetTime ?? detail.reset_at ?? detail.resetAt) };
}

/** Kimi Code's usages: a weekly allowance in `usage`, shorter windows in `limits`, or membership ratios. */
export function parseKimi(body: unknown): QuotaResult {
  const out: QuotaResult = { windows: {} };
  const root = isObj(body) && isObj(body.data) ? body.data : body;
  if (!isObj(root)) return out;
  const weekly = kimiDetail(root.usage);
  if (weekly) out.windows.weekly = weekly;
  for (const item of Array.isArray(root.limits) ? root.limits : []) {
    if (!isObj(item) || !isObj(item.window)) continue;
    const reading = kimiDetail(item.detail);
    const duration = num(item.window.duration);
    const unit = HOUR_MS_UNITS[String(item.window.timeUnit)];
    if (!reading || duration == null || unit == null) continue;
    const hours = duration * unit;
    const id = hours <= 6 ? 'session' : hours >= 160 ? 'weekly' : null;
    if (id && !out.windows[id]) out.windows[id] = reading;
  }
  const ratios = isObj(root.usages) ? root.usages : null;
  if (ratios) {
    for (const [key, id] of [['limit_5h', 'session'], ['limit_7d', 'weekly']] as const) {
      const r = ratios[key];
      const ratio = isObj(r) ? num(r.used_ratio ?? r.usedRatio) : null;
      if (isObj(r) && ratio != null && !out.windows[id]) out.windows[id] = { usedPercent: clamp(ratio * 100), resetAt: parseReset(r.reset_time ?? r.resetTime ?? r.resetAt) };
    }
  }
  return out;
}

/** Grok Build's billing: credits used this period as a percentage. */
export function parseGrok(billing: unknown, user?: unknown): QuotaResult {
  const out: QuotaResult = { windows: {} };
  const tier = isObj(user) && typeof user.subscriptionTier === 'string' ? user.subscriptionTier : undefined;
  if (tier) out.plan = tier;
  const config = isObj(billing) && isObj(billing.config) ? billing.config : null;
  if (!config) return out;
  const used = num(config.creditUsagePercent) ?? 0;
  const period = isObj(config.currentPeriod) ? config.currentPeriod : null;
  out.windows.weekly = { usedPercent: clamp(used), resetAt: parseReset(period?.end) };
  return out;
}
