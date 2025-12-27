import { useState } from 'react';
import { getStorage } from '../hooks/useStorage';

export default function AdvancedFeaturesPage() {
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [ttlValue, setTtlValue] = useState<string | null>(null);

  const storage = getStorage();

  const handleEncryptedStore = async () => {
    try {
      const secretData = { apiKey: 'sk_live_xxxxx', refreshToken: 'rt_xxxxx' };
      await storage.set('demo:secret', secretData, {
        encrypt: true,
        encryptionPassword: 'mySecretPassword123',
      });
      setResult('Encrypted data stored! The value is encrypted at rest.');
      setStatus('success');
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const handleEncryptedGet = async () => {
    try {
      const data = await storage.get('demo:secret', {
        decrypt: true,
        encryptionPassword: 'mySecretPassword123',
      });
      if (data) {
        setResult(`Decrypted: ${JSON.stringify(data, null, 2)}`);
        setStatus('success');
      } else {
        setResult('No encrypted data found. Store some first!');
        setStatus('error');
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const handleCompressedStore = async () => {
    try {
      const largeData = Array(100)
        .fill(null)
        .map((_, i) => ({
          id: i,
          content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        }));
      await storage.set('demo:compressed', largeData, { compress: true });
      const sizeWithoutCompression = JSON.stringify(largeData).length;
      setResult(`Stored ${largeData.length} items. Original size: ${sizeWithoutCompression} bytes`);
      setStatus('success');
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const handleCompressedGet = async () => {
    try {
      const data = await storage.get('demo:compressed', { decompress: true });
      if (data && Array.isArray(data)) {
        setResult(`Retrieved ${data.length} compressed items`);
        setStatus('success');
      } else {
        setResult('No compressed data found. Store some first!');
        setStatus('error');
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const handleTTLStore = async () => {
    try {
      await storage.set('demo:session', { token: 'abc123', user: 'demo' }, { ttl: 60000 });
      setResult('Stored with 60 second TTL. Data will expire automatically.');
      setStatus('success');
      checkTTL();
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const checkTTL = async () => {
    try {
      const remaining = await storage.getTTL('demo:session');
      if (remaining !== null && remaining > 0) {
        setTtlValue(`${Math.ceil(remaining / 1000)}s remaining`);
      } else {
        setTtlValue('Expired or no TTL');
      }
    } catch {
      setTtlValue('Error checking TTL');
    }
  };

  const handleCleanup = async () => {
    try {
      const count = await storage.cleanupExpired();
      setResult(`Cleaned up ${count} expired items`);
      setStatus('success');
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const handleExport = async () => {
    try {
      const exported = await storage.export({ pretty: true });
      setResult(`Exported data:\n${exported}`);
      setStatus('success');
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  return (
    <div>
      <h1 className="page-title">Advanced Features</h1>
      <p className="page-desc">Encryption, compression, TTL, and more.</p>

      <div className="card">
        <h2 className="card-title">Encryption</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Encrypt sensitive data at rest using Web Crypto API (web) or native crypto (mobile).
        </p>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={handleEncryptedStore}>
            Store Encrypted
          </button>
          <button className="btn btn-secondary" onClick={handleEncryptedGet}>
            Get Decrypted
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Compression</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Compress large data using LZ-string algorithm. Zero dependencies.
        </p>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={handleCompressedStore}>
            Store Compressed
          </button>
          <button className="btn btn-secondary" onClick={handleCompressedGet}>
            Get Decompressed
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">TTL (Time-To-Live)</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Automatically expire data after a specified duration.
        </p>
        {ttlValue && (
          <div className="badge badge-success" style={{ marginBottom: 12 }}>
            {ttlValue}
          </div>
        )}
        <div className="btn-group">
          <button className="btn btn-primary" onClick={handleTTLStore}>
            Store with 60s TTL
          </button>
          <button className="btn btn-secondary" onClick={checkTTL}>
            Check TTL
          </button>
          <button className="btn btn-danger" onClick={handleCleanup}>
            Cleanup Expired
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Export Data</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Export all storage data as JSON for backup or debugging.
        </p>
        <button className="btn btn-primary" onClick={handleExport}>
          Export All
        </button>
      </div>

      {result && (
        <div className="result">
          <div className="result-label">Result</div>
          <pre className={`result-value ${status}`}>{result}</pre>
        </div>
      )}
    </div>
  );
}
