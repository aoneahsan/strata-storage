# Changelog

All notable changes to Strata Storage will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
See [MIGRATION.md](../MIGRATION.md) for detailed migration instructions from v1.x to v2.x.

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

Found a bug or have a feature request? Please create an issue on [GitHub](https://github.com/aoneahsan/strata-storage/issues).

## Links

- [GitHub Repository](https://github.com/aoneahsan/strata-storage)
- [NPM Package](https://www.npmjs.com/package/strata-storage)
- [Documentation](https://github.com/aoneahsan/strata-storage/tree/main/docs)
