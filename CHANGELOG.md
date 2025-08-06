# Changelog

## [2.0.2] - 2025-08-06

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