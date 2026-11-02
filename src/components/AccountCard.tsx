import { useState } from 'react';
import type { AccountView, QuotaWindow } from '../types';
import { formatNumber, formatRemaining, formatWhen, toLocalInput } from '../format';
import { resetDate } from '../schedule';
import { accountStatus, levelOf, remainingPercent, statusColor, STATUS_LABEL, type StatusKey } from '../status';
import { LOGIN_LABEL } from '../logins';
import LoginIcon from './LoginIcon';
import OverflowMenu from './OverflowMenu';

interface Props {
  view: AccountView;
  now: Date;
  compact: boolean;
  onUsed: (w: QuotaWindow, used: number) => void;
  onStart: (w: QuotaWindow) => void;
  /** iso = the reset time, or null to clear it. */
  onReset: (w: QuotaWindow, iso: string | null) => void;
  onToggleActive: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  connectable?: boolean;
  syncError?: string;
  syncing?: boolean;
  onConnect?: () => void;
  onRefresh?: () => void;
  onDisconnect?: () => void;
}

/** Status is shown with a symbol as well as a color, so it does not rely on color alone. */
const GLYPH: Record<StatusKey, string> = { critical: '✖', alert: '▲', ok: '●', empty: '○', paused: '⏸' };

const STALE_MS = 30 * 60 * 1000;

function ResetEditor({ w, onSave, onClose }: { w: QuotaWindow; onSave: (iso: string | null) => void; onClose: () => void }) {
  const [v, setV] = useState(toLocalInput(w.next));
  const valid = !Number.isNaN(new Date(v).getTime());
  return (
    <div className="ed">
      <input type="datetime-local" value={v} onChange={(e) => setV(e.target.value)} aria-label="Reset date and time" />
      <button type="button" className="mini pri" disabled={!valid} onClick={() => { onSave(new Date(v).toISOString()); onClose(); }}>Save</button>
      {w.next && (
        <button type="button" className="mini" onClick={() => { onSave(null); onClose(); }}>Clear</button>
      )}
      <button type="button" className="mini" onClick={onClose}>Cancel</button>
    </div>
  );
}

function Window({ w, now, live, onUsed, onStart, onReset }: { w: QuotaWindow; now: Date; live: boolean } & Pick<Props, 'onUsed' | 'onStart' | 'onReset'>) {
  const [editing, setEditing] = useState(false);
  const at = resetDate(w, now);
  const pct = remainingPercent(w);
  const color = pct == null ? 'var(--ac)' : statusColor(levelOf(pct));
  const commit = (raw: string) => {
    const n = Math.max(0, Number(raw) || 0);
    if (n !== w.used) onUsed(w, n);
  };
  return (
    <div className="win">
      <div className="wh">
        <span className="wn">{w.name || 'Quota'}</span>
        <span className="pct" style={{ color }}>{pct == null ? 'No limit' : `${Math.round(pct)}% left`}</span>
      </div>
      {pct == null ? null : (
        <div className="bar" role="progressbar" aria-label={`${w.name || 'Quota'} remaining`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
          <i style={{ width: `${pct}%`, background: color }} />
        </div>
      )}
      <div className="wr">
        {at ? (
          <>
            <span className="rst">↻ Resets in {formatRemaining(at.getTime() - now.getTime())}</span>
            <span className="when">{formatWhen(at)}</span>
          </>
        ) : w.type === 'rolling' ? (
          <span className="when">Window starts at first use</span>
        ) : live ? (
          <span className="when">Reset time not reported</span>
        ) : (
          <button type="button" className="link" onClick={() => setEditing(true)}>Set reset time</button>
        )}
      </div>

      {!live && (
        <>
          <div className="wu">
            <label className="used">
              Used
              <input
                key={`${w.id}:${w.used}`}
                type="number" min="0" step="any" inputMode="decimal" defaultValue={w.used}
                aria-label={`Used for ${w.name || 'quota'}`}
                onBlur={(e) => commit(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              {w.total > 0 && <span className="mut">of {formatNumber(w.total)}</span>} <span className="mut">{w.unit}</span>
            </label>
            <button type="button" className="mini" onClick={() => onUsed(w, w.used + w.step)} aria-label={`Add ${formatNumber(w.step)} to used`}>+{formatNumber(w.step)}</button>
          </div>
          <div className="wl">
            <button type="button" className="link" onClick={() => onUsed(w, 0)}>Clear</button>
            {w.type === 'rolling' && !at && <button type="button" className="link" onClick={() => onStart(w)}>Start now</button>}
            {at && <button type="button" className="link" onClick={() => setEditing((e) => !e)}>Change reset</button>}
          </div>
        </>
      )}
      {editing && <ResetEditor w={w} onSave={(iso) => onReset(w, iso)} onClose={() => setEditing(false)} />}
    </div>
  );
}

function WindowCompact({ w, now }: { w: QuotaWindow; now: Date }) {
  const at = resetDate(w, now);
  const pct = remainingPercent(w);
  const color = pct == null ? 'var(--ac)' : statusColor(levelOf(pct));
  return (
    <div className="crow">
      <span className="wn">{w.name || 'Quota'}</span>
      <span className="cbar">{pct != null && <i style={{ width: `${pct}%`, background: color }} />}</span>
      <span className="cval">
        <b style={{ color }}>{pct == null ? '-' : `${Math.round(pct)}%`}</b>
        {' · '}
        {at ? formatRemaining(at.getTime() - now.getTime()) : w.type === 'rolling' ? 'idle' : 'no reset'}
      </span>
    </div>
  );
}

export default function AccountCard({
  view, now, compact, onUsed, onStart, onReset, onToggleActive, onEdit, onDuplicate, onDelete,
  connectable, syncError, syncing, onConnect, onRefresh, onDisconnect,
}: Props) {
  const { account: a, windows } = view;
  const status = accountStatus(a.active, windows);
  const live = !!a.connection;
  const age = a.syncedAt ? now.getTime() - new Date(a.syncedAt).getTime() : null;
  const stale = age != null && age > STALE_MS;
  const at = (w: QuotaWindow) => resetDate(w, now)?.getTime() ?? Infinity;
  const sorted = [...windows].sort((x, y) => at(x) - at(y));

  return (
    <section className={`card${a.active ? '' : ' off'}${compact ? ' compact' : ''}`} style={{ borderLeftColor: a.active ? statusColor(status) : 'var(--bd)' }}>
      <header className="chead">
        <div className="who">
          <div className="pv">
            <LoginIcon method={a.login} />
            <span className="an">{a.account || (a.login ? LOGIN_LABEL[a.login] : 'Account')}</span>
            {view.planName && <span className="badge">{view.planName}</span>}
            {a.tag && <span className="badge tag">{a.tag}</span>}
          </div>
          {!compact && a.note && <div className="note">{a.note}</div>}
        </div>
        <span className="st" style={{ color: statusColor(status) }}>
          <span aria-hidden="true">{GLYPH[status]}</span> {STATUS_LABEL[status]}
        </span>
        <OverflowMenu
          items={[
            { label: 'Edit', run: onEdit },
            { label: 'Duplicate', run: onDuplicate },
            { label: a.active ? 'Pause' : 'Resume', run: onToggleActive },
            { label: 'Disconnect sign-in', run: () => onDisconnect?.(), hidden: !live },
            { label: 'Delete', run: onDelete, danger: true },
          ]}
        />
      </header>

      {live && (
        <div className={`live${stale ? ' stale' : ''}`}>
          <span aria-hidden="true">{stale ? '◌' : '●'}</span>{' '}
          {a.syncedAt ? `${stale ? 'Last read' : 'Live'} · ${formatRemaining(age ?? 0)} ago` : 'Connected'}
          <button type="button" className="link" disabled={syncing} onClick={onRefresh}>{syncing ? 'Reading…' : 'Refresh'}</button>
        </div>
      )}
      {syncError && <div className="err" role="alert">{syncError}</div>}

      {windows.length === 0 && <div className="when">This provider has no quota windows yet.</div>}
      {sorted.map((w) =>
        compact ? (
          <WindowCompact key={w.id} w={w} now={now} />
        ) : (
          <Window key={w.id} w={w} now={now} live={live} onUsed={onUsed} onStart={onStart} onReset={onReset} />
        ),
      )}

      {connectable && !live && (
        <button type="button" className={compact ? 'pri mini connect' : 'pri block'} onClick={onConnect}>
          {view.provider.id === 'manus' ? 'Connect with API key' : 'Sign in to fetch quotas'}
        </button>
      )}
    </section>
  );
}
