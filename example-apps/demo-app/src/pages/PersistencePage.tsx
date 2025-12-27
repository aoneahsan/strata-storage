import { useState, useEffect } from 'react';
import { getStorage } from '../hooks/useStorage';

interface PersistenceData {
  createdAt: number;
  visits: number;
  lastVisit: number;
  notes: string[];
}

export default function PersistencePage() {
  const [data, setData] = useState<PersistenceData | null>(null);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);

  const storage = getStorage();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      let stored = await storage.get<PersistenceData>('demo:persistence');

      if (!stored) {
        stored = {
          createdAt: Date.now(),
          visits: 1,
          lastVisit: Date.now(),
          notes: [],
        };
      } else {
        stored = {
          ...stored,
          visits: stored.visits + 1,
          lastVisit: Date.now(),
        };
      }

      await storage.set('demo:persistence', stored);
      setData(stored);
    } catch (err) {
      console.error('Failed to load persistence data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !data) return;

    const updated = {
      ...data,
      notes: [...data.notes, newNote.trim()],
    };

    await storage.set('demo:persistence', updated);
    setData(updated);
    setNewNote('');
  };

  const clearNote = async (index: number) => {
    if (!data) return;

    const updated = {
      ...data,
      notes: data.notes.filter((_, i) => i !== index),
    };

    await storage.set('demo:persistence', updated);
    setData(updated);
  };

  const resetAll = async () => {
    await storage.remove('demo:persistence');
    setData({
      createdAt: Date.now(),
      visits: 1,
      lastVisit: Date.now(),
      notes: [],
    });
    await storage.set('demo:persistence', {
      createdAt: Date.now(),
      visits: 1,
      lastVisit: Date.now(),
      notes: [],
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (start: number) => {
    const diff = Date.now() - start;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading persistence data...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Persistence Test</h1>
      <p className="page-desc">
        This data persists across page reloads and app restarts. Close and reopen to verify.
      </p>

      <div className="card">
        <h2 className="card-title">Session Info</h2>
        <div className="stats-grid">
          <div className="stat">
            <div className="stat-value">{data?.visits || 0}</div>
            <div className="stat-label">Total Visits</div>
          </div>
          <div className="stat">
            <div className="stat-value">{data?.notes.length || 0}</div>
            <div className="stat-label">Saved Notes</div>
          </div>
        </div>
        <div style={{ marginTop: 16, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          <p>
            <strong>First visit:</strong> {data ? formatDate(data.createdAt) : 'N/A'}
            <span style={{ marginLeft: 8 }}>({data ? formatDuration(data.createdAt) : ''})</span>
          </p>
          <p>
            <strong>Last visit:</strong> {data ? formatDate(data.lastVisit) : 'N/A'}
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Persistent Notes</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Add notes that persist across sessions. Test by refreshing or reopening the app.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            className="input"
            type="text"
            placeholder="Write a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
          />
          <button className="btn btn-primary" onClick={addNote}>
            Add
          </button>
        </div>
        {data?.notes && data.notes.length > 0 ? (
          <ul style={{ listStyle: 'none' }}>
            {data.notes.map((note, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--color-bg)',
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <span>{note}</span>
                <button
                  className="btn btn-danger"
                  style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                  onClick={() => clearNote(i)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: 'var(--color-text-muted)' }}>No notes yet. Add one above!</p>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">Reset</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Clear all persistence data and start fresh.
        </p>
        <button className="btn btn-danger" onClick={resetAll}>
          Reset All Data
        </button>
      </div>

      <div className="card">
        <h2 className="card-title">How to Test</h2>
        <ol style={{ paddingLeft: 20, color: 'var(--color-text-muted)' }}>
          <li>Add some notes above</li>
          <li>Refresh this page (F5 or Cmd+R)</li>
          <li>Verify your notes and visit count persist</li>
          <li>Close the browser completely</li>
          <li>Reopen and navigate back here</li>
          <li>Your data should still be here!</li>
        </ol>
      </div>
    </div>
  );
}
