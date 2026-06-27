import { useState } from 'react';
import { defineStorage, IntegrityError } from 'strata-storage';

/**
 * 2.5.0: Disaster recovery (all opt-in).
 *
 * - snapshot() returns a portable, checksum-stamped backup string.
 * - restore() validates the checksum and throws IntegrityError on a corrupted
 *   backup. We demo a clean round-trip AND a tampered-backup rejection.
 * - A separate instance with `integrity: true` writes an FNV-1a checksum on
 *   every value and verifies it on read (corruption detection at rest).
 */
const drStorage = defineStorage({ defaultStorages: ['localStorage'] });

// Integrity-enabled instance: every write stores a checksum; every read verifies it.
const integrityStorage = defineStorage({
  defaultStorages: ['localStorage'],
  integrity: true,
});

const SEED_KEYS = ['dr:alpha', 'dr:beta', 'dr:gamma'] as const;

export default function DisasterRecoveryDemo() {
  const [snapshotStr, setSnapshotStr] = useState<string | null>(null);
  const [log, setLog] = useState<string | null>(null);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);

  const seedData = async () => {
    await drStorage.set('dr:alpha', { id: 1, label: 'first' });
    await drStorage.set('dr:beta', { id: 2, label: 'second' });
    await drStorage.set('dr:gamma', { id: 3, label: 'third' });
    const present = await Promise.all(SEED_KEYS.map((k) => drStorage.has(k)));
    setLog(`Seeded 3 keys. Present: ${present.filter(Boolean).length}/3`);
    setStatus('success');
  };

  const runRoundTrip = async () => {
    try {
      // 1. snapshot — checksum-stamped backup of everything in this instance.
      const snap = await drStorage.snapshot({ pretty: false });
      setSnapshotStr(snap);

      // 2. clear — wipe the instance to simulate data loss.
      await drStorage.clear();
      const afterClear = await Promise.all(SEED_KEYS.map((k) => drStorage.has(k)));

      // 3. restore — bring everything back from the snapshot.
      await drStorage.restore(snap);
      const afterRestore = await Promise.all(SEED_KEYS.map((k) => drStorage.has(k)));
      const restoredValue = await drStorage.get('dr:beta');

      setLog(
        [
          `1) snapshot() captured ${snap.length} bytes`,
          `2) clear() → present after clear: ${afterClear.filter(Boolean).length}/3`,
          `3) restore() → present after restore: ${afterRestore.filter(Boolean).length}/3`,
          `   recovered dr:beta = ${JSON.stringify(restoredValue)}`,
        ].join('\n'),
      );
      setStatus(afterRestore.every(Boolean) ? 'success' : 'error');
    } catch (err) {
      setLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('error');
    }
  };

  const restoreCorrupted = async () => {
    if (!snapshotStr) {
      setLog('Run the round-trip first to create a snapshot, then corrupt it.');
      setStatus('error');
      return;
    }
    // Tamper with the snapshot payload so the embedded checksum no longer matches.
    const tampered = snapshotStr.replace('first', 'tampered-value');
    try {
      await drStorage.restore(tampered);
      setLog('Unexpected: corrupted snapshot restored without error.');
      setStatus('error');
    } catch (err) {
      const isIntegrity = err instanceof IntegrityError;
      setLog(
        `Corruption detected (caught ${isIntegrity ? 'IntegrityError' : 'error'}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      setStatus('success');
    }
  };

  const runIntegrity = async () => {
    try {
      await integrityStorage.set('integrity:token', { secret: 'xyz', n: 42 });
      const value = await integrityStorage.get('integrity:token');
      // Also show the per-operation `durable` write (read-back-verify) option.
      await integrityStorage.set('integrity:durable', 'guarded', { durable: true });
      const durable = await integrityStorage.get('integrity:durable');
      setLog(
        [
          'integrity: true → checksum written + verified on read.',
          `read back integrity:token = ${JSON.stringify(value)}`,
          `durable write read back integrity:durable = ${JSON.stringify(durable)}`,
        ].join('\n'),
      );
      setStatus('success');
    } catch (err) {
      setLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('error');
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">Disaster Recovery</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
        <code>snapshot()</code> → <code>clear()</code> → <code>restore()</code> round-trip,
        checksum-verified backups, and an <code>integrity: true</code> instance that detects
        corruption at rest. All opt-in.
      </p>

      <div className="btn-group">
        <button className="btn btn-secondary" onClick={seedData}>
          1. Seed Data
        </button>
        <button className="btn btn-primary" onClick={runRoundTrip}>
          2. Snapshot → Clear → Restore
        </button>
        <button className="btn btn-danger" onClick={restoreCorrupted}>
          3. Restore Corrupted Backup
        </button>
        <button className="btn btn-secondary" onClick={runIntegrity}>
          Integrity Checksum Demo
        </button>
      </div>

      {log && (
        <div className="result" style={{ marginTop: 12 }}>
          <div className="result-label">Result</div>
          <pre className={`result-value ${status}`}>{log}</pre>
        </div>
      )}
    </div>
  );
}
