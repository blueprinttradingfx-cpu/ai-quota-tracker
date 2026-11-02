import { useEffect, useMemo, useRef, useState } from 'react';
import type { FreeVerdict, ProviderConfig } from '../types';
import { CATEGORY_LABEL } from '../config/providers';
import ProviderAvatar from './ProviderAvatar';

interface Props {
  providers: ProviderConfig[];
  counts: Record<string, number>;
  /** Providers that can sign in and read their own quotas. */
  signIn: Set<string>;
  onPick: (id: string) => void;
  onClose: () => void;
}

const FREE_BADGE: Record<FreeVerdict, string | null> = {
  yes: 'Free tier',
  limited: 'Trial or credits',
  no: null,
  unclear: 'Free tier unclear',
};

export default function ProviderPicker({ providers, counts, signIn, onPick, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return providers
      .filter((p) => !freeOnly || p.research?.freeTier.verdict === 'yes' || p.research?.freeTier.verdict === 'limited')
      .filter((p) => !s || [p.name, p.id, p.alias ?? '', CATEGORY_LABEL[p.category]].join(' ').toLowerCase().includes(s))
      .sort((a, b) => Number(signIn.has(b.id)) - Number(signIn.has(a.id)) || a.name.localeCompare(b.name));
  }, [providers, q, freeOnly, signIn]);

  return (
    <dialog ref={ref} onClose={onClose}>
      <div className="fm">
        <h2>Choose a provider</h2>
        <input className="search" type="search" placeholder="Search providers" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Search providers" />
        <label className="chk">
          <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
          Only providers with a free tier or trial
        </label>
        <div className="plist">
          {list.map((p, i) => (
            <div key={p.id} className="prowwrap">
              {(i === 0 || signIn.has(list[i - 1].id) !== signIn.has(p.id)) && (
                <div className="psec">{signIn.has(p.id) ? 'Sign-in supported' : 'Track by hand'}</div>
              )}
              <button
                type="button"
                className="prow"
                onClick={() => {
                  onPick(p.id);
                  ref.current?.close();
                }}
              >
                <ProviderAvatar provider={p} size={34} />
                <span className="pmain">
                  <span className="pname">
                    {p.name}
                    <span className="badge">{CATEGORY_LABEL[p.category]}</span>
                    {p.research?.availability === 'unclear' && <span className="badge warn">Status unclear</span>}
                    {p.research && FREE_BADGE[p.research.freeTier.verdict] && (
                      <span className="badge tag">{FREE_BADGE[p.research.freeTier.verdict]}</span>
                    )}
                  </span>
                  <span className="pq">{p.windows.map((w) => w.name).join(' · ')}</span>
                  {p.research?.freeTier.note && <span className="pfree">{p.research.freeTier.note}</span>}
                </span>
                {counts[p.id] > 0 && <span className="pcount">{counts[p.id]}</span>}
              </button>
            </div>
          ))}
          {list.length === 0 && <div className="empty">No providers match.</div>}
        </div>
        <div className="fa">
          <button type="button" onClick={() => ref.current?.close()}>Cancel</button>
        </div>
      </div>
    </dialog>
  );
}
