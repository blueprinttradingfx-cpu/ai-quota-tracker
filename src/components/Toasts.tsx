import { useCallback, useEffect, useRef, useState } from 'react';

export interface Toast {
  id: number;
  text: string;
  tone?: 'ok' | 'error';
  action?: { label: string; run: () => void };
}

/** Small, self-dismissing messages. Actions (like Undo) keep the toast around a little longer. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (text: string, opts: { tone?: Toast['tone']; action?: Toast['action']; ms?: number } = {}) => {
      const id = next.current++;
      setToasts((t) => [...t.slice(-2), { id, text, tone: opts.tone, action: opts.action }]);
      setTimeout(() => dismiss(id), opts.ms ?? (opts.action ? 7000 : 4500));
      return id;
    },
    [dismiss],
  );
  return { toasts, push, dismiss };
}

export function ToastHost({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast${t.tone === 'error' ? ' bad' : ''}`}>
          <span>{t.text}</span>
          {t.action && (
            <button
              type="button"
              className="tact"
              onClick={() => {
                t.action!.run();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" className="tx" aria-label="Dismiss" onClick={() => dismiss(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

/** Closes a popover on outside click or Escape. */
export function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}
