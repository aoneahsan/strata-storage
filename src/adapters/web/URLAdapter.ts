/**
 * URL Adapter - persists state in the page URL.
 *
 * Stores each key as a URL parameter, either in the query string (`?k=v`) or in
 * the hash fragment (`#k=v`), selectable via config. Useful for shareable /
 * bookmarkable UI state (filters, tabs, pagination) that should survive reloads
 * and round-trip through navigation. Inherently synchronous.
 *
 * Limitations (documented honestly):
 * - URLs have practical length limits (~2000 chars in some browsers/servers), so
 *   this adapter is for small, simple, serializable state — not bulk data.
 * - Query mode is visible to the server on navigation; hash mode is client-only.
 * - Not available outside a browser (SSR/Node) — `isAvailable()` returns false.
 */

import { BaseAdapter } from '@/core/BaseAdapter';
import type { StorageType, StorageCapabilities, StorageValue, ClearOptions } from '@/types';
import { serialize, deserialize } from '@/utils';
import { logger } from '@/utils/logger';

/** Configuration for the URL adapter. */
export interface URLAdapterConfig {
  /** Where to store params: query string (default) or hash fragment. */
  mode?: 'query' | 'hash';
  /** Prefix applied to every param name to avoid collisions (default `strata.`). */
  prefix?: string;
  /** History strategy when writing (default `replace` — no new history entry). */
  history?: 'push' | 'replace';
  /** Soft warning threshold for total URL length in chars (default 2000). */
  maxLength?: number;
}

export class URLAdapter extends BaseAdapter {
  readonly name: StorageType = 'url';
  readonly capabilities: StorageCapabilities = {
    persistent: false, // lives only as long as the URL does
    synchronous: true, // URL access is synchronous
    observable: true, // popstate / hashchange
    transactional: false,
    queryable: true, // via BaseAdapter scan
    maxSize: 2000, // practical URL length budget
    binary: false,
    encrypted: false,
    crossTab: false,
  };

  private mode: 'query' | 'hash' = 'query';
  private prefix = 'strata.';
  private historyMode: 'push' | 'replace' = 'replace';
  private maxLength = 2000;
  private snapshot = new Map<string, string>();
  private changeListener?: () => void;

  async isAvailable(): Promise<boolean> {
    return (
      typeof window !== 'undefined' &&
      typeof window.location !== 'undefined' &&
      typeof window.history !== 'undefined'
    );
  }

  async initialize(config?: URLAdapterConfig): Promise<void> {
    if (config?.mode) this.mode = config.mode;
    if (config?.prefix !== undefined) this.prefix = config.prefix;
    if (config?.history) this.historyMode = config.history;
    if (typeof config?.maxLength === 'number') this.maxLength = config.maxLength;

    if (typeof window === 'undefined') return;

    // Seed the snapshot and listen for external navigation (back/forward, manual
    // edits) so subscribers are notified of changes that did not originate here.
    this.snapshot = this.snapshotParams();
    this.changeListener = () => this.handleExternalChange();
    const event = this.mode === 'hash' ? 'hashchange' : 'popstate';
    window.addEventListener(event, this.changeListener);
  }

  // --- Synchronous core ------------------------------------------------------

  getSync<T = unknown>(key: string): StorageValue<T> | null {
    const raw = this.readParams().get(this.prefix + key);
    if (raw === null) return null;

    let value: StorageValue<T>;
    try {
      value = deserialize(raw) as StorageValue<T>;
    } catch (error) {
      logger.debug(`URLAdapter: failed to parse key "${key}"`, error);
      return null;
    }

    if (this.isExpired(value)) {
      this.removeSync(key);
      return null;
    }
    return value;
  }

  setSync<T = unknown>(key: string, value: StorageValue<T>): void {
    const params = this.readParams();
    const oldRaw = params.get(this.prefix + key);
    const serialized = serialize(value);
    params.set(this.prefix + key, serialized);
    this.writeParams(params);

    const total = this.estimateLength(params);
    if (total > this.maxLength) {
      logger.debug(
        `URLAdapter: URL length (${total}) exceeds soft limit (${this.maxLength}); ` +
          `consider a different storage for large values.`,
      );
    }

    const oldValue = oldRaw !== null ? this.tryDeserialize(oldRaw) : undefined;
    this.emitChange(key, oldValue, value.value, 'local');
  }

  removeSync(key: string): void {
    const params = this.readParams();
    const oldRaw = params.get(this.prefix + key);
    if (oldRaw === null) return;
    params.delete(this.prefix + key);
    this.writeParams(params);
    this.emitChange(key, this.tryDeserialize(oldRaw), undefined, 'local');
  }

  hasSync(key: string): boolean {
    const value = this.getSync(key);
    return value !== null;
  }

  keysSync(pattern?: string | RegExp): string[] {
    const keys: string[] = [];
    for (const name of this.readParams().keys()) {
      if (name.startsWith(this.prefix)) {
        keys.push(name.slice(this.prefix.length));
      }
    }
    return this.filterKeys(keys, pattern);
  }

  clearSync(options?: ClearOptions): void {
    const pattern = options?.pattern || options?.prefix;
    const params = this.readParams();
    let changed = false;

    for (const key of this.keysSync()) {
      let shouldDelete = true;
      if (pattern) {
        shouldDelete = this.filterKeys([key], pattern).length > 0;
      }
      if (shouldDelete && options?.tags) {
        const value = this.getSync(key);
        if (!value?.tags || !options.tags.some((tag) => value.tags?.includes(tag))) {
          shouldDelete = false;
        }
      }
      if (shouldDelete && options?.expiredOnly) {
        const value = this.getSync(key);
        if (!value || !this.isExpired(value)) {
          shouldDelete = false;
        }
      }
      if (shouldDelete) {
        params.delete(this.prefix + key);
        changed = true;
      }
    }

    if (changed) {
      this.writeParams(params);
      this.emitChange('*', undefined, undefined, 'local');
    }
  }

  // --- Async API delegates to the synchronous core ---------------------------

  async get<T = unknown>(key: string): Promise<StorageValue<T> | null> {
    return this.getSync<T>(key);
  }

  async set<T = unknown>(key: string, value: StorageValue<T>): Promise<void> {
    this.setSync(key, value);
  }

  async remove(key: string): Promise<void> {
    this.removeSync(key);
  }

  async has(key: string): Promise<boolean> {
    return this.hasSync(key);
  }

  async keys(pattern?: string | RegExp): Promise<string[]> {
    return this.keysSync(pattern);
  }

  async clear(options?: ClearOptions): Promise<void> {
    this.clearSync(options);
  }

  async close(): Promise<void> {
    if (this.changeListener && typeof window !== 'undefined') {
      const event = this.mode === 'hash' ? 'hashchange' : 'popstate';
      window.removeEventListener(event, this.changeListener);
      this.changeListener = undefined;
    }
    await super.close();
  }

  // --- Internals -------------------------------------------------------------

  private readParams(): URLSearchParams {
    if (typeof window === 'undefined') return new URLSearchParams();
    if (this.mode === 'hash') {
      const hash = window.location.hash.replace(/^#/, '');
      return new URLSearchParams(hash);
    }
    return new URLSearchParams(window.location.search);
  }

  private writeParams(params: URLSearchParams): void {
    if (typeof window === 'undefined') return;
    const query = params.toString();

    if (this.mode === 'hash') {
      const url = `${window.location.pathname}${window.location.search}${query ? `#${query}` : ''}`;
      window.history[this.historyMode === 'push' ? 'pushState' : 'replaceState']({}, '', url);
    } else {
      const url = new URL(window.location.href);
      url.search = query;
      window.history[this.historyMode === 'push' ? 'pushState' : 'replaceState'](
        {},
        '',
        url.toString(),
      );
    }
  }

  private estimateLength(params: URLSearchParams): number {
    if (typeof window === 'undefined') return params.toString().length;
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`.length;
  }

  private tryDeserialize(raw: string): unknown {
    try {
      return (deserialize(raw) as StorageValue).value;
    } catch {
      return undefined;
    }
  }

  // Diff the URL against the last known snapshot and emit per-key changes for
  // anything that changed externally (back/forward navigation, manual edits).
  private snapshotParams(): Map<string, string> {
    const map = new Map<string, string>();
    for (const [name, value] of this.readParams().entries()) {
      map.set(name, value);
    }
    return map;
  }

  private handleExternalChange(): void {
    const next = this.snapshotParams();
    const allNames = new Set<string>([...this.snapshot.keys(), ...next.keys()]);
    for (const name of allNames) {
      if (!name.startsWith(this.prefix)) continue;
      const before = this.snapshot.get(name);
      const after = next.get(name);
      if (before === after) continue;

      const key = name.slice(this.prefix.length);
      this.emitChange(
        key,
        before !== undefined ? this.tryDeserialize(before) : undefined,
        after !== undefined ? this.tryDeserialize(after) : undefined,
        'remote',
      );
    }

    this.snapshot = next;
  }
}
