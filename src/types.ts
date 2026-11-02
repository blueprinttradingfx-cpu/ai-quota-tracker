export type ResetType = 'rolling' | 'daily' | 'weekly' | 'monthly';
export type LoginMethod = '' | 'google' | 'x' | 'microsoft' | 'github' | 'email' | 'apikey' | 'other';

/** One limit a provider enforces (e.g. "Session (5h)"). Set up once per provider. */
export interface WindowSpec {
  id: string;
  name: string;
  type: ResetType;
  /** Window length. Used by rolling windows, which start at first use. */
  hours: number;
  /** Limit. Percent-based by default, matching what providers show. */
  total: number;
  unit: string;
  /** Amount added by the quick "+" button. */
  step: number;
  /** Shared reset schedule. Leave out to set the reset time per account instead. */
  time?: string;
  /** The shared reset time is in UTC rather than the viewer's local time. */
  utc?: boolean;
  /** 0 = Sunday. Weekly only. */
  dow?: number;
  /** 1-31. Monthly only. */
  dom?: number;
}

export type ProviderCategory =
  | 'oauth' | 'apikey' | 'web-app' | 'web-cookie' | 'search' | 'noauth' | 'local' | 'cloud-agent' | 'upstream-proxy';

export type FreeVerdict = 'yes' | 'limited' | 'no' | 'unclear';

export interface FreeTier {
  verdict: FreeVerdict;
  note: string;
  /** Official plan or pricing page. */
  infoUrl?: string;
  detailsUrl?: string;
}

/** Availability and free-tier findings for a provider. */
export interface ProviderResearch {
  availability: 'active' | 'unclear';
  /** ISO date of the check. */
  checkedAt: string;
  /** What the check found, as plain text. */
  evidence: string;
  sources: string[];
  freeTier: FreeTier;
  /** Also confirmed by an independent search. */
  crossChecked?: boolean;
}

/** A plan tier that changes which windows apply or how large they are. */
export interface PlanSpec {
  name: string;
  /** Longer label for the plan picker, e.g. "Standard · $20/mo · 4,000 credits". */
  detail?: string;
  /** Limit per window id, replacing the window's default. */
  totals?: Record<string, number>;
  /** Window ids that apply. Leave out when every window does. */
  windows?: string[];
}

/**
 * A provider and the quota windows every one of its accounts has. Defined once in
 * src/config/providers.ts by the maintainer; users never edit these.
 */
export interface ProviderConfig {
  id: string;
  name: string;
  alias?: string;
  category: ProviderCategory;
  /** Brand color, from OmniRoute's provider catalog. */
  color?: string;
  /** Short mark shown in the avatar, e.g. "GL". */
  textIcon?: string;
  website?: string;
  hasFree?: boolean;
  /** Set when the provider is being shut down. It stays for existing accounts but is hidden from the picker. */
  deprecated?: string;
  /** Latest availability and free-tier research. */
  research?: ProviderResearch;
  windows: WindowSpec[];
  /** First plan is the default. Providers without plans use the same windows for every account. */
  plans?: PlanSpec[];
}
export type Provider = ProviderConfig;

/** What one account has used of one window. */
export interface Usage {
  used: number;
  /** ISO timestamp of the upcoming reset. */
  next?: string;
  /** True when the reset time was entered for this account and repeats from that date. */
  anchor?: boolean;
  /** Day of month of the entered reset (keeps monthly resets on the 31st from drifting). */
  day?: number;
  last?: string;
}

/** One login on one provider. */
export interface Account {
  id: string;
  providerId: string;
  account: string;
  login: LoginMethod;
  plan: string;
  tag: string;
  note: string;
  /** Paused accounts are dimmed and left out of the summary. */
  active: boolean;
  /** Keyed by the provider's WindowSpec id. */
  usage: Record<string, Usage>;
  /** Set when the account signed in with its provider and reads its own quotas. */
  connection?: 'github' | 'claude' | 'codex' | 'antigravity' | 'cursor' | 'kiro' | 'manus' | 'kilocode' | 'kimi' | 'grok';
  /** ISO time of the last quota read. */
  syncedAt?: string;
}

export interface Store {
  accounts: Account[];
}

/** A window spec joined with one account's usage. */
export interface QuotaWindow extends WindowSpec {
  used: number;
  next?: string;
  anchor?: boolean;
  last?: string;
}

export interface AccountView {
  account: Account;
  provider: ProviderConfig;
  /** The plan in effect: the account's choice, the provider's default plan, or the free-text plan. */
  planName: string;
  windows: QuotaWindow[];
}
