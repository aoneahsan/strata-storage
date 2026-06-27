import { defineStorage } from 'strata-storage';
import { createStrataHooks } from 'strata-storage/react';

/**
 * 2.5.0: Provider-free, Zustand-style usage.
 *
 * `defineStorage()` returns a ready-to-use instance (standard web adapters
 * pre-registered, lazy init on first use). `createStrataHooks(instance)` binds
 * the React hooks to it at module scope — no <StrataProvider> anywhere in the
 * tree. Persist to localStorage so the value survives a reload.
 */
const providerFreeStorage = defineStorage({ defaultStorages: ['localStorage'] });

const { useStorage } = createStrataHooks(providerFreeStorage);

export default function ProviderFreeDemo() {
  // useStorage returns [value, setValue, loading] — same shape as Zustand-ish hooks.
  const [name, setName, loading] = useStorage<string>('demo:providerFreeName', '');

  return (
    <div className="card">
      <h2 className="card-title">Provider-Free Hooks</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
        <code>defineStorage()</code> + <code>createStrataHooks()</code> from{' '}
        <code>strata-storage/react</code> — no <code>&lt;StrataProvider&gt;</code> in the tree.
        Bound once at module scope, used directly in this component. The value persists to
        localStorage and survives a reload.
      </p>
      <div className="input-group">
        <label htmlFor="provider-free-name">Your name (auto-persisted)</label>
        <input
          id="provider-free-name"
          className="input"
          type="text"
          placeholder={loading ? 'Loading...' : 'Type your name...'}
          value={name ?? ''}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {name ? (
        <div className="badge badge-success">Stored: {name}</div>
      ) : (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Nothing stored yet. Type above, then reload the page — it persists.
        </p>
      )}
    </div>
  );
}
