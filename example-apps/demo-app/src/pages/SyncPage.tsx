import { useState, useEffect, useRef } from 'react';
import { getStorage } from '../hooks/useStorage';
import type { StorageChange } from 'strata-storage';

interface SyncLog {
  id: number;
  time: string;
  key: string;
  source: string;
  type: 'set' | 'remove';
}

export default function SyncPage() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [counter, setCounter] = useState(0);
  const [message, setMessage] = useState('');
  const logIdRef = useRef(0);

  const storage = getStorage();

  useEffect(() => {
    const loadCounter = async () => {
      const stored = await storage.get<number>('demo:syncCounter');
      if (stored !== null) {
        setCounter(stored);
      }
    };
    loadCounter();

    const unsubscribe = storage.subscribe((change: StorageChange) => {
      if (change.key.startsWith('demo:sync')) {
        setSyncLogs((prev) => [
          {
            id: ++logIdRef.current,
            time: new Date().toLocaleTimeString(),
            key: change.key,
            source: change.source || 'unknown',
            type: change.newValue !== null ? 'set' : 'remove',
          },
          ...prev.slice(0, 19),
        ]);

        if (change.key === 'demo:syncCounter') {
          setCounter(typeof change.newValue === 'number' ? change.newValue : 0);
        }
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const increment = async () => {
    const newValue = counter + 1;
    await storage.set('demo:syncCounter', newValue);
    setCounter(newValue);
  };

  const decrement = async () => {
    const newValue = Math.max(0, counter - 1);
    await storage.set('demo:syncCounter', newValue);
    setCounter(newValue);
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    await storage.set('demo:syncMessage', {
      text: message,
      timestamp: Date.now(),
    });
    setMessage('');
  };

  const clearLogs = () => {
    setSyncLogs([]);
    logIdRef.current = 0;
  };

  return (
    <div>
      <h1 className="page-title">Cross-Tab Sync</h1>
      <p className="page-desc">
        Changes sync in real-time across browser tabs using BroadcastChannel API.
      </p>

      <div className="card">
        <h2 className="card-title">Instructions</h2>
        <ol style={{ paddingLeft: 20, color: 'var(--color-text-muted)' }}>
          <li>Open this page in multiple browser tabs</li>
          <li>Modify the counter or send a message in one tab</li>
          <li>Watch changes appear instantly in all other tabs</li>
        </ol>
      </div>

      <div className="card">
        <h2 className="card-title">Synced Counter</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-secondary" onClick={decrement}>
            -
          </button>
          <span style={{ fontSize: '2rem', fontWeight: 700, minWidth: 60, textAlign: 'center' }}>
            {counter}
          </span>
          <button className="btn btn-primary" onClick={increment}>
            +
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Send Synced Message</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button className="btn btn-primary" onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>Sync Events Log</h2>
          <button className="btn btn-secondary" onClick={clearLogs} style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
            Clear
          </button>
        </div>
        {syncLogs.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>
            No sync events yet. Make changes to see them appear here.
          </p>
        ) : (
          <div className="log-list">
            {syncLogs.map((log) => (
              <div key={log.id} className="log-item">
                <span style={{ color: 'var(--color-text-muted)' }}>{log.time}</span>
                <span style={{ margin: '0 8px' }}>|</span>
                <span className={`badge ${log.type === 'set' ? 'badge-success' : 'badge-error'}`}>
                  {log.type}
                </span>
                <span style={{ margin: '0 8px' }}>|</span>
                <code>{log.key}</code>
                <span style={{ margin: '0 8px' }}>|</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{log.source}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
