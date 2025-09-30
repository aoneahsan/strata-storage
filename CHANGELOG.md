# Changelog

All notable changes to Strata Storage will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [2.0.1] - Previous version
- Initial implementation of Strata Storage
- Zero-dependency architecture
- Universal storage API
- Multiple adapter support