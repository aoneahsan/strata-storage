import { Link } from 'react-router-dom';
import { useStorageValue } from '../hooks/useStorage';

const features = [
  { path: '/basic', title: 'Basic Storage', desc: 'Set, get, remove operations' },
  { path: '/advanced', title: 'Advanced Features', desc: 'Encryption, compression, TTL' },
  { path: '/query', title: 'Query Engine', desc: 'Tags, filters, operators' },
  { path: '/sync', title: 'Cross-Tab Sync', desc: 'Real-time synchronization' },
  { path: '/persistence', title: 'Persistence Test', desc: 'Verify data survives restart' },
];

export default function HomePage() {
  const { value: visitCount, set: setVisitCount } = useStorageValue('demo:visitCount', 0);

  const incrementVisit = async () => {
    await setVisitCount(visitCount + 1);
  };

  return (
    <div>
      <h1 className="page-title">Strata Storage Demo</h1>
      <p className="page-desc">
        Zero-dependency universal storage for web, Android, and iOS. Explore each feature below.
      </p>

      <div className="card">
        <h2 className="card-title">Quick Stats</h2>
        <div className="stats-grid">
          <div className="stat">
            <div className="stat-value">{visitCount}</div>
            <div className="stat-label">Page Visits</div>
          </div>
          <div className="stat">
            <div className="stat-value">9</div>
            <div className="stat-label">Adapters</div>
          </div>
          <div className="stat">
            <div className="stat-value">0</div>
            <div className="stat-label">Dependencies</div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={incrementVisit}>
            Count Visit
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Features</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {features.map((f) => (
            <Link
              key={f.path}
              to={f.path}
              style={{
                display: 'block',
                padding: '12px 16px',
                background: 'var(--color-bg)',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontWeight: 600 }}>{f.title}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{f.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Platform Support</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Strata Storage works identically across all platforms:
        </p>
        <ul style={{ paddingLeft: 20, color: 'var(--color-text-muted)' }}>
          <li>
            <strong>Web:</strong> LocalStorage, SessionStorage, IndexedDB, Cookies, Cache API, Memory
          </li>
          <li>
            <strong>iOS:</strong> UserDefaults, Keychain, SQLite, FileManager
          </li>
          <li>
            <strong>Android:</strong> SharedPreferences, EncryptedSharedPreferences, SQLite, File Storage
          </li>
        </ul>
      </div>
    </div>
  );
}
