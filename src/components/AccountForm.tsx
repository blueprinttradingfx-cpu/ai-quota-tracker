import { useEffect, useRef, useState } from 'react';
import type { Account, LoginMethod, PlanSpec } from '../types';
import { LOGIN_KEYS, LOGIN_LABEL } from '../logins';
import LoginIcon from './LoginIcon';

interface Props {
  initial: Account;
  providerName: string;
  plans?: PlanSpec[];
  isNew: boolean;
  tags: string[];
  onSave: (a: Account) => void;
  onClose: () => void;
}

export default function AccountForm({ initial, providerName, plans, isNew, tags, onSave, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [f, setF] = useState({
    account: initial.account, login: initial.login as LoginMethod, plan: plans?.some((p) => p.name === initial.plan) ? initial.plan : (plans?.[0]?.name ?? initial.plan), tag: initial.tag, note: initial.note,
  });

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const set = (k: 'account' | 'plan' | 'tag' | 'note') => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = () => {
    onSave({
      ...initial,
      account: f.account.trim(),
      login: f.login,
      plan: f.plan.trim(),
      tag: f.tag.trim(),
      note: f.note.trim(),
    });
    ref.current?.close();
  };

  return (
    <dialog ref={ref} onClose={onClose}>
      <form className="fm" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <h2>{isNew ? `Add account to ${providerName}` : `Edit ${providerName} account`}</h2>
        <label>
          Account
          <input value={f.account} onChange={set('account')} placeholder="e.g. work@gmail.com" autoComplete="off" autoFocus />
        </label>
        <div className="lgp">
          <span className="lbl">Signed in with</span>
          <div className="lgrow" role="group" aria-label="Signed in with">
            {LOGIN_KEYS.map((k) => (
              <button
                key={k || 'none'}
                type="button"
                className={`lgbtn${f.login === k ? ' on' : ''}`}
                aria-pressed={f.login === k}
                onClick={() => setF((p) => ({ ...p, login: k }))}
              >
                <LoginIcon method={k} size={15} />
                {LOGIN_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
        {plans && (
          <label>
            Plan
            <select value={f.plan} onChange={set('plan')}>
              {plans.map((p) => (
                <option key={p.name} value={p.name}>{p.detail ?? p.name}</option>
              ))}
            </select>
          </label>
        )}
        <details>
          <summary>{plans ? 'More (tag, note)' : 'More (plan, tag, note)'}</summary>
          <div className="fm inner">
            {!plans && (
              <label>
                Plan
                <input value={f.plan} onChange={set('plan')} placeholder="e.g. Free, Pro" autoComplete="off" />
              </label>
            )}
            <label>
              Tag
              <input value={f.tag} onChange={set('tag')} list="tags" placeholder="e.g. work" autoComplete="off" />
            </label>
            <datalist id="tags">{tags.map((t) => <option key={t} value={t} />)}</datalist>
            <label>
              Note
              <input value={f.note} onChange={set('note')} placeholder="Optional" autoComplete="off" />
            </label>
          </div>
        </details>
        <div className="fa">
          <button type="button" onClick={() => ref.current?.close()}>Cancel</button>
          <button type="submit" className="pri">Save</button>
        </div>
      </form>
    </dialog>
  );
}
