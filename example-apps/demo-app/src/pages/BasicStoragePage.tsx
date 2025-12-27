import { useState } from 'react';
import { getStorage } from '../hooks/useStorage';

export default function BasicStoragePage() {
  const [key, setKey] = useState('demo:myKey');
  const [value, setValue] = useState('Hello, Strata!');
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);

  const storage = getStorage();

  const handleSet = async () => {
    try {
      await storage.set(key, value);
      setResult(`Stored: "${value}" with key "${key}"`);
      setStatus('success');
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const handleGet = async () => {
    try {
      const stored = await storage.get(key);
      if (stored !== null) {
        setResult(`Retrieved: ${JSON.stringify(stored)}`);
        setStatus('success');
      } else {
        setResult(`Key "${key}" not found`);
        setStatus('error');
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const handleRemove = async () => {
    try {
      await storage.remove(key);
      setResult(`Removed key "${key}"`);
      setStatus('success');
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const handleClear = async () => {
    try {
      await storage.clear();
      setResult('Storage cleared');
      setStatus('success');
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const handleStoreObject = async () => {
    try {
      const obj = {
        id: Date.now(),
        name: 'Test User',
        settings: { theme: 'dark', notifications: true },
      };
      await storage.set('demo:user', obj);
      setResult(`Stored object: ${JSON.stringify(obj, null, 2)}`);
      setStatus('success');
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const handleGetObject = async () => {
    try {
      const obj = await storage.get('demo:user');
      if (obj) {
        setResult(`Retrieved object:\n${JSON.stringify(obj, null, 2)}`);
        setStatus('success');
      } else {
        setResult('No user object found. Store one first!');
        setStatus('error');
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  return (
    <div>
      <h1 className="page-title">Basic Storage</h1>
      <p className="page-desc">Fundamental set, get, and remove operations.</p>

      <div className="card">
        <h2 className="card-title">String Storage</h2>
        <div className="input-group">
          <label>Key</label>
          <input className="input" type="text" value={key} onChange={(e) => setKey(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Value</label>
          <input className="input" type="text" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={handleSet}>
            Set
          </button>
          <button className="btn btn-secondary" onClick={handleGet}>
            Get
          </button>
          <button className="btn btn-danger" onClick={handleRemove}>
            Remove
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Object Storage</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Strata automatically serializes complex objects.
        </p>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={handleStoreObject}>
            Store User Object
          </button>
          <button className="btn btn-secondary" onClick={handleGetObject}>
            Get User Object
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Clear All</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Remove all data from storage.
        </p>
        <button className="btn btn-danger" onClick={handleClear}>
          Clear Storage
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
