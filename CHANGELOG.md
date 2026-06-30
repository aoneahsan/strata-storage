# Changelog

All notable changes to Strata Storage will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.8.1] - 2026-06-30

Documentation and metadata release — **no runtime code changes**, no API changes. Safe drop-in
upgrade from 2.8.0.

### Changed

- **Bug reports now route to GitHub Issues.** `package.json` `bugs.url` →
  `https://github.com/aoneahsan/strata-storage/issues`, and the README "Support" section leads with
  opening a GitHub issue (the marketing-site contact form remains a secondary channel).
- **AI Integration Guide refreshed to 2.8.1** and made more complete for AI coding agents:
  the Capacitor section now documents the required `npx cap sync` native-setup step and the
  `registerCapacitorAdapters(storage)` helper, and a troubleshooting entry covers the TypeScript
  `moduleResolution: "bundler" | "nodenext"` requirement for the typed subpath exports
  (`strata-storage/react` · `/vue` · `/angular` · `/capacitor` · `/firebase`).
- **README** gained a `npx cap sync` note in the iOS/Android section, an explicit GitHub repo link,
  and a cleaned-up Links/Support section (removed a stray internal auto-generated links block).

## [2.8.0] - 2026-06-27

Licensing change — **Strata Storage is now released under the MIT License** (relicensed from
Apache-2.0). MIT is the most widely adopted permissive open-source license, with no patent or
attribution-in-docs clauses; the only condition is retaining the copyright and license notice. This
is a *loosening* of terms and requires no code changes on your part.

### Changed

- **License: Apache-2.0 → MIT.** The `LICENSE` file now contains the standard MIT text, and the
  `license` field in `package.json` is `"MIT"`. The previous non-standard "Additional Terms" appended
  to the Apache license have been removed; the "Strata Storage" name remains a trademark of the
  maintainer (covered by trademark law, not the code license). Versions published at or before 2.7.1
  remain available under Apache-2.0 — only 2.8.0 and later are MIT.
- **Repository secret posture for public release.** `.gitignore` now ignores real `.env` files and
  tracks only `*.env.example` templates (the repo previously tracked real env files as a private
  repo). A pre-publication audit of the working tree and full git history confirmed no real secrets
  are present.

## [2.7.1] - 2026-06-25

Correctness release: an internal audit found several defects in 2.7.0 —
including a broken TypeScript types entry, a silent compression data-loss bug,
and a TTL-expiry crash — all fixed here. No manual migration is required
(legacy compressed values still decode).

### Fixed

- **Published types were unusable** — `dist/index.d.ts` re-exported from a
  non-existent `./types.js`, so `import type { … } from 'strata-storage'` failed
  to compile for every TypeScript consumer under `nodenext`/`bundler`. The build
  now resolves directory-barrel imports to `/index.js`.
- **Compression silently corrupted non-Latin1 data** — the bundled LZ codec
  misread any character ≥ U+0100 (CJK, emoji, many symbols) above the
  compression threshold, returning garbage or throwing on read. The codec now
  operates over UTF-8 bytes with fixed-width tokens. Values compressed by ≤ 2.7.0
  still decode via a legacy read path, so **no data migration is needed**.
- **TTL expiry could crash** — reading an expired entry on
  localStorage/sessionStorage/cookie recursed `getSync → removeSync` into a stack
  overflow (Cache hung asynchronously). This fired on its own via the periodic
  TTL cleanup. Removal now reads the raw stored value without re-triggering the
  expiry path, and only when a change listener needs the old value.
- **Firebase** — Firestore/Realtime writes threw on `undefined` wrapper fields
  (`expires`/`tags`/`metadata` on a plain write); those are now stripped before
  writing. `enableFirebaseSync()` now attaches the adapters to the active set, so
  a top-level `subscribe()`/`keys()`/`clear()`/`size()` includes them
  immediately.
- **Namespace isolation** — keys containing `:` could collide across namespaces
  (`ns 'a' + key 'b:c'` vs `ns 'a:b' + key 'c'`); namespace prefixes are now
  encoded so they can never alias.
- **Default storage** — a bare `new Strata({})` / `defineStorage()` with no
  config defaulted to memory-only; it now prefers persistent backends first
  (`localStorage → indexedDB → sessionStorage → memory`), matching the default
  `storage` singleton and the documented behavior.
- **Conflict resolution** — the default `'latest'` cross-tab strategy now keeps
  the most-recent write by timestamp (tabs converge) instead of last-received.
- **Cross-tab `clear()`** now propagates to non-localStorage backends
  (memory/indexedDB/cache), matching `set`/`remove`.
- **Failed `initialize()`** no longer caches the rejection permanently — a later
  call can retry.
- **Query** — `$nin` now handles array-valued fields correctly; exclusion-mode
  projection (`{ field: 0 }`) now actually excludes; projection paths are
  prototype-pollution-safe. `clear({ expiredOnly })` now reclaims rows on SQLite.
- **Migration** — rolling back across a migration with no `down()` now throws
  instead of silently lowering the stored version without reverting data.
- **TTL `expireAfter`** is now past-guarded like `expireAt`, and the pre-init
  expiration fallback matches `TTLManager` precedence.
- **Cookie & Cache adapters** now use the shared serialize/deserialize, so
  `Date`/`Map`/`Set` values round-trip with the same fidelity as localStorage.
- **Memory adapter** clones via `structuredClone`, so `Map`/`Set`/typed arrays
  round-trip (its advertised `binary: true` now holds).
- **Cookie** rejects key names containing cookie-separator or control characters
  (cookie-attribute / extra-cookie injection hardening).

### Documentation

- Rewrote the Docusaurus API reference and AI-agent docs to match the real API:
  corrected the error-class hierarchy (all extend `StrataError`), the `query()`
  data model (matches the decoded value's bare fields — wrapper fields aren't
  queryable), TTL/sync/compression config field names, the `StorageChange` shape
  (no `type` field), the real React/Vue hooks, and the valid import subpaths.
  Removed inaccurate API references throughout the guides and examples.
- `llms-full.txt` is now regenerated by the docs `build` script (the `prebuild`
  hook did not run under Yarn 4), so it cannot go stale.

## [2.7.0] - 2026-06-24

Audit-driven correctness and truthfulness release: documented behavior now
matches the code across the core engine, web/native adapters, and integrations.

### Fixed
- Combined `compress` + `encrypt` write/read pipeline now round-trips correctly.
- `clear({ olderThan })` is honored instead of being ignored.
- Key/value validation is enforced (invalid keys/values are rejected clearly).
- `close()` now resets internal state so the instance can be re-initialized.
- `import()` and `snapshot()`/`restore()` round-trip metadata (TTL, tags, etc.).
- Auto-backup no longer self-nests (backups of backups).
- `QueryOptions` (`limit`/`skip`/`sort`/`select`) are honored by `query()`.
- `query()` now decodes (deserialize/decompress/decrypt) returned results.
- Multi-adapter TTL cleanup runs across every registered adapter.
- Namespace key isolation is implemented (namespaced keys no longer collide).
- Encryption works in Node/SSR (no reliance on browser-only globals).
- Plugin web option forwarding: web plugin now forwards per-call options.
- `SessionStorageAdapter` uses the shared serialize helper (consistent encoding).
- iOS preferences are scoped to the plugin (no full `UserDefaults` domain wipe).
- Android secure storage rejects API < 23 with a clear error (secure storage
  requires API 23+).
- Android filesystem adapter uses atomic writes (staging + rename).
- Android preferences/secure adapters round-trip the full `StorageValue` wrapper.
- `scripts/configure.js` ESM fix.

### Changed
- Default storage preference order is now persistent-first.
- **Compression is restricted to the `lz` algorithm** — `gzip` was never
  implemented; the option type is now `algorithm?: 'lz'`.
- SQLite `transactional` flag is set to `false` (batch writes are best-effort,
  not wrapped in a single transaction).
- Lint configuration split for clearer rule scoping.
- `firebase` is declared as an optional peer dependency.
- Added a `./package.json` entry to the package `exports` map.

### Removed
- Dead `strategy` config option and the unused `StorageStrategy` type
  (type cleanup; this never affected runtime behavior).

### Security
- **Authenticated AES-CBC (Encrypt-then-MAC).** CBC-encrypted payloads now carry
  an HMAC-SHA256 tag over `iv ‖ ciphertext` (computed with a separate,
  domain-separated derived key) that is verified *before* decryption, closing a
  ciphertext-malleability gap. **Breaking for pre-existing CBC ciphertexts
  only**: data written before this release has no tag and now fails closed with
  a clear "re-encrypt" error on read. **AES-GCM data — the default — is
  unaffected.** Migration: re-encrypt affected values (read with the old build,
  write with the new one) or switch them to GCM.
- **PBKDF2 default raised to 600,000 iterations** (was 100,000). Backward
  compatible — the iteration count stored with each ciphertext is used on
  decrypt, so existing data still opens.
- **Password no longer retained as a key-cache key** — derived-key cache entries
  are keyed by a hash, not the raw passphrase.
- **`generatePassword` is now unbiased** (rejection sampling instead of modulo).
- **Cross-tab sync hardening** — origin IDs use `crypto.randomUUID()` and inbound
  `BroadcastChannel` messages are validated before use.
- **Query `getNestedValue` matches own properties only** (no prototype-chain
  traversal).
- **SQLite identifiers are validated and rejected, not sanitized.** `database`
  and `table` (the only values that cannot be SQL-bound) must match
  `^[A-Za-z_][A-Za-z0-9_]*$`; a non-conforming name is rejected with a clear
  error at the public boundary instead of being silently stripped. The native
  iOS/Android layers apply the same allow-list as defense-in-depth. All other
  values remain bound parameters.

### Performance
- **SQLite `keys()`/`query()` no longer do an N+1 of native round-trips.** The
  native layer filters expired rows in SQL and `query()` returns the full value
  wrapper for every non-expired row in a single round-trip; the adapter dropped
  its per-key `get()` loops. A new native `cleanupExpired` reclaims expired rows
  in one `DELETE` on the TTL tick.
- **Native adapters skip the read-before-write when nobody is observing.**
  `set()`/`remove()` only fetch the previous value (an extra bridge round-trip)
  when a change subscriber is attached.

## [2.6.1] - 2026-05-29

### Documentation
- README and `AI-INTEGRATION-GUIDE.md` refreshed to surface the 2.6.0 features
  that landed but were not yet covered in the bundled docs: SQLite multi-store
  (`(database, table)` isolation), the native filesystem backend, and the
  `size(true)` byte breakdown. Both now link the new
  `docs/guides/platforms/device-verification.md`.
- The `package-polish-v2.5` tracker's `phase09.5` items are marked shipped
  (delivered in 2.6.0); kept for resumable history.

### Maintenance
- Bumped 5 devDependencies to their latest patches: `@angular/common`,
  `@angular/core`, `@angular/forms` 21.2.14 → 21.2.15;
  `eslint-plugin-prettier` 5.5.5 → 5.5.6; `vue` 3.5.34 → 3.5.35. devDeps only,
  no runtime change.

### Notes
- **No runtime or API change vs 2.6.0.** This release republishes the package
  with up-to-date bundled documentation so consumers browsing npm see the
  current feature set. The native iOS/Android code paths still require
  on-device verification (see device-verification guide).

## [2.6.0] - 2026-05-27

### Added
- **SQLite multi-store** — the `database` and `table` options are now honored on
  iOS and Android, so multiple independent SQLite stores (distinct database files
  and/or tables) no longer collapse into a single physical table. Use separate
  `defineStorage` instances (or distinct `database`/`table` config) to keep
  stores isolated.
- **Native filesystem backend** — `FilesystemAdapter` now works on iOS and
  Android (it was previously unavailable on every platform). One file per key
  under the app's documents/files directory (`strata_storage/`), storing the full
  value wrapper as JSON, with atomic writes; `isAvailable()` now returns `true`.
- **`size(true)`** — native SQLite and filesystem backends now
  return the `{ keys, values, metadata }` byte breakdown (the flag was previously
  ignored, returning only `{ total, count }`).

### Fixed
- **SQLite value round-trip** — native `get` now returns the full `StorageValue`
  wrapper (`{ value, created, updated, expires, tags, metadata }`) instead of a
  raw blob, so TTL, tags, and metadata survive a write→read cycle on iOS and
  Android. Corrupt/legacy rows are treated as a miss instead of throwing.
- **Filesystem key/temp-file collision** — in-flight temp files now live in a
  reserved staging subdirectory, so a key whose name resembles a temp file (e.g.
  `"backup.tmp"`) is never skipped by `keys()`/`size()` or wrongly deleted by
  `clear()`.
- **`size().total` consistency** — native backends now include key bytes in
  `total`, matching the web adapters' convention.
- **iOS SQLite bind safety** — text/blob binds use `SQLITE_TRANSIENT`, removing a
  latent use-after-free for transient Swift buffers.

### Changed
- **`androidx.security:security-crypto`** upgraded `1.1.0-alpha06` → `1.1.0`
  (stable). The `EncryptedSharedPreferences` / `MasterKey` API is unchanged.
- The native SQLite database file now resolves from the `database` option
  (default `strata_storage` → `strata_storage.db`); table identifiers are
  sanitized to `[A-Za-z0-9_]`. Stored values remain bound parameters.
- Marketing website tooling migrated to Yarn 4 (Corepack).

### Notes
- The native iOS/Android changes in this release are code-complete and reviewed
  but require on-device verification — follow
  `docs/guides/platforms/device-verification.md`. Web/browser functionality is
  validated by the quality gates (typecheck + build + lint); the project ships no
  automated test runner.

## [2.5.0] - 2026-05-26

### Added
- **Framework-agnostic, provider-free usage** — `defineStorage()` returns a
  ready-to-use instance you can create once and use anywhere, with no
  Provider/DI required (Zustand-style). `createStrataHooks(instance)` (React),
  `createStrataComposables(instance)` (Vue), and `provideStrata(instance)`
  (Angular) bind to a created instance; the Provider/Plugin/Service APIs remain
  optional.
- **Synchronous API** — `getSync`/`setSync`/`removeSync`/`hasSync`/`keysSync`/
  `clearSync` for sync-capable adapters (memory, localStorage, sessionStorage,
  cookies, url). Async-only backends (indexedDB, cache, native) throw a clear
  error; sync set with encrypt/compress also throws (those are async).
- **URL-state adapter** (`URLAdapter`) — persist state in the query string
  (default) or hash fragment, with `popstate`/`hashchange` change events.
- **Disaster recovery** (all opt-in) — FNV-1a integrity checksums with
  corruption detection, durable write-verify-readback, mirroring to backup
  adapters with read-repair, and `snapshot()`/`restore()` plus scheduled
  `autoBackup`.
- Exported integrity helpers (`computeChecksum`/`verifyChecksum`) and error
  classes (e.g. `IntegrityError`) for `instanceof` use.

### Fixed
- **The React/Vue/Angular entry points are now actually built and shipped** —
  `strata-storage/react|vue|angular` previously resolved to files that were
  never compiled into `dist/`, so every framework import failed.
- Multi-adapter operations (`keys`/`clear`/`size`/`subscribe` with no explicit
  `storage`) now span all registered adapters instead of only the default.
- Cross-tab sync now applies received changes to local memory/IndexedDB/cache
  adapters (previously broadcasts were sent but never applied).
- AES-CBC now uses a correct 16-byte IV.
- Security: prototype-pollution guards in deep-merge/import/restore, ReDoS-capped
  regex, and `SameSite=Lax` + automatic `Secure` cookie defaults.
- iOS native plugin now registers with Capacitor (it had no registration and was
  non-functional); added missing native methods on iOS and Android; Keychain
  accessibility hardened.

### Changed
- All diagnostic output now routes through a level-gated internal logger
  (default `warn`); the library no longer writes to the consumer console by
  default. Toggle with `new Strata({ debug: { enabled: true } })`.
- Dependencies updated to latest stable (including TypeScript 6 and ESLint 10).
  The default instance initializes lazily, so importing the package performs no
  I/O. Current quality gates are typecheck, build, lint, and CI; the project no
  longer ships an automated test runner.

## [2.1.0] - 2024-01-30

### Added
- Complete native iOS implementation (Swift)
- Complete native Android implementation (Java)  
- Enhanced error messages for platform-specific functions
- Comprehensive JSDoc documentation for all public APIs
- Pattern matching support for `keys()` and `clear()` methods
- Prefix support for clearing storage
- Apache 2.0 license with patent protection
- Security policy (SECURITY.md)
- Contributing guidelines (CONTRIBUTING.md)
- Support documentation (SUPPORT.md)
- Code of Conduct
- Issue templates

### Fixed
- iOS and Android method signature consistency
- Android constructor issues for SharedPreferences and EncryptedStorage
- TypeScript type warnings throughout codebase
- Platform detection for Capacitor environment
- Web plugin error messages now suggest alternatives

### Changed
- License from MIT to Apache 2.0
- Documentation moved to organized folders (.github/, docs/)
- Improved README with comprehensive feature links
- Project status updated to "Production Ready"

### Documentation
- Added caching patterns guide
- Added session management patterns
- Added TTL feature documentation
- Enhanced all adapter documentation
- Improved API reference with examples

## [2.0.4] - 2024-01-29

### Added
- Provider-less architecture (like Zustand)
- Zero-dependency implementation
- Dynamic adapter loading
- Comprehensive documentation structure

### Fixed
- Bundle size optimizations
- Tree-shaking improvements

## [2.0.2] - 2024-01-28

### Fixed
- Added missing LICENSE file
- Added .npmignore file to exclude unnecessary files from npm package

## [2.0.1] - 2025-08-06

### Fixed
- Fixed BaseAdapter and StorageAdapter interface mismatch where `subscribe` and `close` methods were incorrectly marked as optional
- Fixed adapter initialization flow to prevent double initialization
- Fixed "No available storage adapters found" error by improving adapter detection and initialization
- Memory adapter now correctly works as fallback
- Improved error messages to show which adapters were tried and which are registered

### Added
- Complete React + Capacitor example app with comprehensive testing interface
- Test coverage for all web storage adapters (Memory, LocalStorage, SessionStorage, IndexedDB, Cache, Cookies)
- Visual test interface showing real-time operation status
- Support for Android and iOS platforms in example app

### Changed
- Default storage preference order now includes multiple fallbacks: memory, localStorage, sessionStorage, indexedDB
- Singleton storage instance now properly initializes on first use
- Better TypeScript types for storage operations

### Documentation
- Added comprehensive example app documentation
- Updated README with link to working example
- Added test results showing all adapters working correctly

## [2.0.0] - Initial 2.x release
- Initial implementation of Strata Storage
- Zero-dependency architecture
- Universal storage API
- Multiple adapter support