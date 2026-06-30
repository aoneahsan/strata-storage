# Changelog

All notable changes to Strata Storage will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.8.1] - 2026-06-30

Documentation and metadata release — **no runtime code changes, no API changes**. Bug reports now
route to [GitHub Issues](https://github.com/aoneahsan/strata-storage/issues); the AI Integration
Guide documents the `npx cap sync` native step, the `registerCapacitorAdapters()` helper, and the
TypeScript `moduleResolution: "bundler" | "nodenext"` requirement for subpath types. See the root
`CHANGELOG.md` for the full list.

## [2.8.0] - 2026-06-27

**License change: Apache-2.0 → MIT.** A loosening of terms requiring no code changes on your part —
the only condition is retaining the copyright and license notice. Versions at or before 2.7.1 remain
available under Apache-2.0; 2.8.0 and later are MIT.

## [2.7.0] - 2026-06-24

Audit-driven correctness and truthfulness release. No public API surface was
removed beyond dead config; the focus is making documented behavior match the
code. See the root `CHANGELOG.md` for the full itemized list.

### Fixed
- Combined `compress` + `encrypt` pipeline now round-trips correctly.
- `clear({ olderThan })`, key/value validation, and `close()` state reset behave
  as documented.
- `import()`/`snapshot()` round-trip metadata; auto-backup no longer self-nests.
- `QueryOptions` (`limit`/`skip`/`sort`/`select`) are honored and `query()`
  decodes results; multi-adapter TTL cleanup and namespace key isolation work.
- Encryption works in Node/SSR environments.

### Changed
- Default storage order is now persistent-first.
- **Compression is restricted to the `lz` algorithm** — `gzip` was never
  implemented and the option type is now `algorithm?: 'lz'`.

### Removed
- Dead `strategy` config and the unused `StorageStrategy` type (type cleanup).

## [2.6.1] - 2026-05-29

### Changed
- Documentation patch release: README and AI integration guide were refreshed to
  cover the 2.6.0 native parity features.
- Development dependency patch updates only; no runtime/API behavior changed
  from 2.6.0.

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

## [2.4.1] - 2024-12-26

### Added
- Framework integration exports for React, Vue, and Angular
- Comprehensive root README.md
- Complete reference documentation (changelog, troubleshooting, FAQ)
- Missing API feature documentation
- SVG assets policy in CLAUDE.md

### Fixed
- Package.json exports now include framework integrations
- Node.js version requirement aligned with documentation (18.0.0+)
- Broken links in documentation

### Changed
- Updated documentation structure for better navigation
- Improved installation instructions

## [2.4.0] - 2024-12-20

### Added
- Firebase adapter integration
- Enhanced TypeScript types
- Capacitor plugin structure

### Changed
- Improved error handling across all adapters
- Optimized IndexedDB performance

### Fixed
- Cross-tab sync issues in Safari
- TTL expiration edge cases

## [2.3.0] - 2024-12-15

### Added
- Advanced query engine with tag-based filtering
- Data migration utilities
- Compression threshold configuration
- Custom serialization support

### Changed
- Improved encryption performance
- Better memory management for large datasets

### Fixed
- Memory leak in subscription system
- Edge cases in TTL cleanup

## [2.2.0] - 2024-12-10

### Added
- Cross-tab synchronization feature
- BroadcastChannel support for modern browsers
- Storage event fallback for older browsers

### Changed
- Enhanced subscription API
- Improved event handling

### Fixed
- Race conditions in concurrent operations
- Storage quota detection in private browsing

## [2.1.0] - 2024-12-05

### Added
- Compression support using LZ-string algorithm
- Configurable compression threshold
- Automatic compression for large objects

### Changed
- Optimized serialization/deserialization
- Improved type safety

### Fixed
- Issues with null/undefined values
- Circular reference handling

## [2.0.0] - 2024-12-01

### Added
- Complete rewrite with zero dependencies
- Native mobile support via Capacitor
- Encryption using Web Crypto API
- TTL (Time-To-Live) support
- Multiple storage adapter system

### Changed
- **BREAKING**: New API design for consistency
- **BREAKING**: Removed dependency on @capacitor/preferences
- **BREAKING**: Changed configuration structure

### Removed
- All external runtime dependencies

### Migration Guide
See [MIGRATION.md](../migration.md) for detailed migration instructions from v1.x to v2.x.

## [1.5.0] - 2024-11-15

### Added
- Cookie storage adapter
- Cache API adapter
- FileSystem adapter for Capacitor

### Fixed
- IndexedDB transaction handling
- Safari private browsing detection

## [1.4.0] - 2024-11-01

### Added
- SQLite adapter for mobile platforms
- Secure storage using Keychain (iOS) and EncryptedSharedPreferences (Android)
- Batch operations support

### Changed
- Improved error messages
- Better TypeScript types

## [1.3.0] - 2024-10-15

### Added
- React hooks integration
- Vue composables
- Angular services

### Fixed
- Memory adapter data persistence issues
- Edge cases in localStorage fallback

## [1.2.0] - 2024-10-01

### Added
- IndexedDB adapter with Promise-based API
- Automatic fallback chain
- Storage availability detection

### Changed
- Enhanced platform detection
- Improved error handling

## [1.1.0] - 2024-09-15

### Added
- SessionStorage adapter
- Memory storage adapter
- Configuration validation

### Fixed
- localStorage quota exceeded handling
- Type serialization edge cases

## [1.0.0] - 2024-09-01

### Added
- Initial release
- Basic localStorage adapter
- TypeScript support
- Core Strata class
- Simple get/set/remove/clear operations

## Version Numbering

- **Major version** (X.0.0): Breaking changes, API changes
- **Minor version** (0.X.0): New features, backward compatible
- **Patch version** (0.0.X): Bug fixes, backward compatible

## Support Policy

- **Current version** (2.x): Full support, active development
- **Previous major version** (1.x): Security fixes only for 6 months after 2.0 release
- **Older versions**: No longer supported

## Reporting Issues

Found a bug or have a feature request? Please [contact us](https://stratastorage.aoneahsan.com/contact).

## Links

- [Website](https://stratastorage.aoneahsan.com)
- [NPM Package](https://www.npmjs.com/package/strata-storage)
- [Documentation](https://stratastorage-docs.aoneahsan.com)
