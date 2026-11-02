import { useState } from 'react';
import { useDismiss } from './Toasts';

export interface MenuItem {
  label: string;
  run: () => void;
  danger?: boolean;
  hidden?: boolean;
  /** Shows a check mark, for the current choice in a group of options. */
  checked?: boolean;
}

/** A "more actions" button that opens a short list. */
export default function OverflowMenu({ items, label = 'More actions' }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const shown = items.filter((i) => !i.hidden);
  return (
    <div className="menu" ref={ref}>
      <button type="button" className="icon" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          {shown.map((i) => (
            <button
              key={i.label}
              type="button"
              role={i.checked === undefined ? 'menuitem' : 'menuitemradio'}
              aria-checked={i.checked}
              className={i.danger ? 'danger-item' : ''}
              onClick={() => {
                setOpen(false);
                i.run();
              }}
            >
              {i.checked !== undefined && <span className="tick" aria-hidden="true">{i.checked ? '✓' : ''}</span>}
              {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
