import type { QuotaWindow } from './types';

export type Level = 'critical' | 'alert' | 'ok';
export type StatusKey = Level | 'empty' | 'paused';

/** Remaining percent at or below this is critical. */
export const CRITICAL_AT = 15;
/** Remaining percent at or below this (and above critical) is an alert. */
export const HEALTHY_ABOVE = 40;

export function remainingPercent(w: QuotaWindow): number | null {
  if (w.total <= 0) return null;
  return Math.max(0, Math.min(100, 100 - (w.used / w.total) * 100));
}

export function levelOf(pct: number): Level {
  if (pct <= CRITICAL_AT) return 'critical';
  if (pct <= HEALTHY_ABOVE) return 'alert';
  return 'ok';
}

/** Worst level among limited windows, 'empty' when nothing is measurable, 'paused' when switched off. */
export function accountStatus(active: boolean, windows: QuotaWindow[]): StatusKey {
  if (!active) return 'paused';
  let worst: Level | null = null;
  for (const w of windows) {
    const pct = remainingPercent(w);
    if (pct == null) continue;
    const l = levelOf(pct);
    if (l === 'critical') return 'critical';
    if (l === 'alert' || worst == null) worst = worst === 'alert' ? 'alert' : l;
  }
  return worst ?? 'empty';
}

export function statusColor(s: StatusKey | null): string {
  switch (s) {
    case 'critical':
      return 'var(--bad)';
    case 'alert':
      return 'var(--warn)';
    case 'ok':
      return 'var(--ok)';
    default:
      return 'var(--ac)';
  }
}

export const STATUS_LABEL: Record<StatusKey, string> = {
  critical: 'Critical',
  alert: 'Low',
  ok: 'Healthy',
  empty: 'No limit set',
  paused: 'Paused',
};
