import { useEffect, useRef, useState } from 'react';
import type { Store } from '../types';
import { mergeStores, parseStore, serialize } from '../storage';

interface Props {
  store: Store;
  onChange: (s: Store) => void;
  onClose: () => void;
}

export default function DataDialog({ store, onChange, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState(() => serialize(store));
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Copied.');
    } catch {
      setMsg('Copy failed. Select the text and copy it manually.');
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quota-tracker-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const apply = (mode: 'replace' | 'merge') => {
    try {
      const incoming = parseStore(text);
      onChange(mode === 'replace' ? incoming : mergeStores(store, incoming));
      ref.current?.close();
    } catch {
      setMsg('That is not a valid backup.');
    }
  };

  return (
    <dialog ref={ref} onClose={onClose}>
      <div className="fm">
        <h2>Data</h2>
        <p className="mut sm nomargin">
          Your providers, quota windows, and accounts live only in this browser. Copy or download this backup to move
          them to another device, then paste it there. Replace swaps everything; Merge adds the pasted providers and
          accounts to the ones you have.
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
        <div className="err">{msg}</div>
        <div className="fa">
          <button type="button" onClick={() => ref.current?.close()}>Close</button>
          <button type="button" onClick={download}>Download</button>
          <button type="button" onClick={copy}>Copy</button>
          <button type="button" onClick={() => apply('merge')}>Merge</button>
          <button type="button" className="pri" onClick={() => apply('replace')}>Replace</button>
        </div>
      </div>
    </dialog>
  );
}
