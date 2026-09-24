/**
 * SessionStorage Adapter - Browser sessionStorage implementation
 * Provides session-scoped storage with 5-10MB limit
 */

import { LocalStorageAdapter, DEFAULT_WEB_KEY_PREFIX } from './LocalStorageAdapter';
import { StorageError } from '@/utils/errors';
import type { StorageType, StorageCapabilities } from '@/types';

/**
 * Browser sessionStorage adapter.
 *
 * 🔴 This class overrides ONLY what actually differs: the identity, the
 * capabilities, and which `Storage` object to talk to. Everything else is
 * inherited, because `LocalStorageAdapter` routes every read and write through
 * `getStorage()`.
 *
 * It used to re-implement `get`/`set`/`remove`/`clear`/`keys`/`size`/`subscribe`
 * — ~230 lines differing only by naming `window.sessionStorage`. That is how one
 * defect became two issue numbers: the copy carried its own
 * `logger.error('Failed to get key … from sessionStorage')`, so fixing the
 * localStorage path left the sessionStorage path untouched, and the reports came
 * back separately (ISSUE-01 for `localStorage`, ISSUE-09 for `sessionStorage`,
 * one root cause). Keep the override surface minimal so that cannot recur.
 */
export class SessionStorageAdapter extends LocalStorageAdapter {
  readonly name: StorageType = 'sessionStorage';
  readonly capabilities: StorageCapabilities = {
    persistent: false, // Only for session
    synchronous: true, // window.sessionStorage backend is synchronous
    observable: true,
    transactional: false,
    queryable: true,
    maxSize: 10 * 1024 * 1024, // Typically 5-10MB
    binary: false,
    encrypted: false,
    crossTab: false, // Session storage is per-tab
  };

  // Same default as localStorage — 3.0.0 documented both as prefixed but this
  // override left sessionStorage bare (ISSUE-13).
  constructor(prefix = DEFAULT_WEB_KEY_PREFIX) {
    super(prefix);
  }

  /**
   * Check if sessionStorage is available
   */
  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return false;
    }
    return this.isAvailableSync();
  }

  /**
   * The backing Storage object. This is the ONLY thing that differs from the
   * parent — every inherited method reads and writes through it.
   */
  protected getStorage(): Storage {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      throw new StorageError(`${this.name} is not available in this environment (no window).`);
    }
    return window.sessionStorage;
  }
}
