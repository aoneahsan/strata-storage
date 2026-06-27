import { useState } from 'react';
import { defineStorage } from 'strata-storage';

/**
 * 2.5.0: Synchronous API.
 *
 * getSync / setSync / removeSync / hasSync / keysSync / clearSync work on
 * sync-capable adapters (memory, localStorage, sessionStorage, cookies, url).
 * No await needed — handy for synchronous render paths and simple key/value use.
 *
 * Caveats (demonstrated honestly below):
 * - Async-only backends (indexedDB, cache, native) throw on sync calls.
 * - setSync cannot encrypt or compress (those operations are async).
 */
const syncStorage = defineStorage({ defaultStorages: ['localStorage'] });

const SYNC_KEY = 'demo:syncApiValue';

export default function SyncApiDemo() {
  const [draft, setDraft] = useState('');
  // Read synchronously on first render — no loading state needed.
  const [stored, setStored] = useState<string | null>(() => syncStorage.getSync<string>(SYNC_KEY));
  const [keys, setKeys] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [noteStatus, setNoteStatus] = useState<'success' | 'error' | null>(null);

  const handleSetSync = () => {
    if (!draft.trim()) return;
    syncStorage.setSync(SYNC_KEY, draft); // synchronous, no await
    setStored(syncStorage.getSync<string>(SYNC_KEY));
    setDraft('');
    setNote(`setSync wrote "${draft}" with no await.`);
    setNoteStatus('success');
  };

  const handleGetSync = () => {
    const value = syncStorage.getSync<string>(SYNC_KEY);
    const exists = syncStorage.hasSync(SYNC_KEY);
    setStored(value);
    setNote(`getSync → ${JSON.stringify(value)} | hasSync → ${exists}`);
    setNoteStatus('success');
  };

  const handleKeysSync = () => {
    const found = syncStorage.keysSync();
    setKeys(found);
    setNote(`keysSync found ${found.length} key(s) across sync-capable adapters.`);
    setNoteStatus('success');
  };

  const handleRemoveSync = () => {
    syncStorage.removeSync(SYNC_KEY);
    setStored(null);
    setKeys([]);
    setNote('removeSync deleted the key synchronously.');
    setNoteStatus('success');
  };

  const handleAsyncBackendError = () => {
    try {
      // indexedDB is async-only — getSync must throw a clear, typed error.
      syncStorage.getSync(SYNC_KEY, { storage: 'indexedDB' });
      setNote('Unexpected: no error thrown for an async-only backend.');
      setNoteStatus('error');
    } catch (err) {
      setNote(
        `Expected error from sync call on async-only backend: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      setNoteStatus('success');
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">Synchronous API</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
        <code>setSync</code>/<code>getSync</code> and friends on a localStorage-backed instance — no{' '}
        <code>await</code>. Async-only backends (indexedDB) throw a clear error.
      </p>

      <div className="input-group">
        <label htmlFor="sync-draft">Value to store</label>
        <input
          id="sync-draft"
          className="input"
          type="text"
          placeholder="Type a value..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSetSync()}
        />
      </div>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={handleSetSync}>
          setSync
        </button>
        <button className="btn btn-secondary" onClick={handleGetSync}>
          getSync / hasSync
        </button>
        <button className="btn btn-secondary" onClick={handleKeysSync}>
          keysSync
        </button>
        <button className="btn btn-danger" onClick={handleRemoveSync}>
          removeSync
        </button>
        <button className="btn btn-secondary" onClick={handleAsyncBackendError}>
          Try sync on indexedDB
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Current synchronous value:{' '}
        </span>
        <code>{stored === null ? '(none)' : JSON.stringify(stored)}</code>
      </div>

      {keys.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Keys: </span>
          {keys.map((k) => (
            <code key={k} style={{ marginRight: 8 }}>
              {k}
            </code>
          ))}
        </div>
      )}

      {note && (
        <div className="result" style={{ marginTop: 12 }}>
          <div className="result-label">Result</div>
          <pre className={`result-value ${noteStatus}`}>{note}</pre>
        </div>
      )}
    </div>
  );
}
