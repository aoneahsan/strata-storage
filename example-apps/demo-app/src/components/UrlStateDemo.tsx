import { useCallback, useEffect, useState } from 'react';
import { defineStorage, URLAdapter } from 'strata-storage';

/**
 * 2.5.0: URL-state adapter.
 *
 * URLAdapter persists each key as a URL parameter — query string by default
 * (`?strata.<key>=...`) or the hash fragment. Great for shareable/bookmarkable
 * UI state (filters, tabs, the value below) that survives reloads and round-
 * trips through back/forward navigation.
 *
 * It is NOT auto-registered (URLs have ~2000-char limits), so we register it
 * explicitly. The default param prefix is `strata.`.
 */
const urlStorage = defineStorage();
urlStorage.registerAdapter(new URLAdapter());

const URL_KEY = 'demoColor';
const PARAM_NAME = `strata.${URL_KEY}`;
const COLORS = ['red', 'green', 'blue', 'violet', 'orange'] as const;

export default function UrlStateDemo() {
  const [selected, setSelected] = useState('');
  const [queryString, setQueryString] = useState('');

  const refreshFromUrl = useCallback(() => {
    setQueryString(window.location.search || '(empty)');
  }, []);

  useEffect(() => {
    // Load any existing value from the URL on mount (e.g. after a reload / shared link).
    const load = async () => {
      const existing = await urlStorage.get<string>(URL_KEY, { storage: 'url' });
      if (existing) setSelected(existing);
      refreshFromUrl();
    };
    load();
    // Reflect back/forward navigation that changes the param.
    window.addEventListener('popstate', refreshFromUrl);
    return () => window.removeEventListener('popstate', refreshFromUrl);
  }, [refreshFromUrl]);

  const pickColor = async (color: string) => {
    await urlStorage.set(URL_KEY, color, { storage: 'url' });
    setSelected(color);
    refreshFromUrl();
  };

  const clearColor = async () => {
    await urlStorage.remove(URL_KEY, { storage: 'url' });
    setSelected('');
    refreshFromUrl();
  };

  return (
    <div className="card">
      <h2 className="card-title">URL-State Adapter</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
        <code>URLAdapter</code> reflects the value in the query string under{' '}
        <code>{PARAM_NAME}</code>. Pick a color, then reload or share the URL — the choice is
        restored from the address bar. Best for small, shareable state (URLs cap near 2000 chars).
      </p>

      <div className="btn-group">
        {COLORS.map((color) => (
          <button
            key={color}
            className={selected === color ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => pickColor(color)}
          >
            {color}
          </button>
        ))}
        <button className="btn btn-danger" onClick={clearColor}>
          Clear
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Selected: </span>
        <code>{selected || '(none)'}</code>
      </div>
      <div style={{ marginTop: 8 }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Live <code>window.location.search</code>:{' '}
        </span>
        <code style={{ wordBreak: 'break-all' }}>{queryString}</code>
      </div>
    </div>
  );
}
