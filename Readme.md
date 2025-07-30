# Strata Storage Plugin - Project Brief

Plugin Name: Strata
A unified storage abstraction layer
Logo Concept
A stylized stack of translucent layers in gradient colors (blue to purple), representing different storage layers seamlessly integrated. The layers slightly offset to create depth and show interconnection.
Tagline
"One API. Every Storage. Everywhere."
Description
Strata is a powerful, type-safe storage abstraction layer that unifies all web and mobile storage technologies under a single, elegant API. Whether you're storing data in localStorage, IndexedDB, SQLite, or native mobile preferences, Strata handles it all seamlessly across web, iOS, and Android platforms.

## Project Overview

**Goal**: Create a comprehensive storage plugin that provides a single, unified API for handling all storage operations across web, Android, and iOS platforms.

**Core Concept**: "1 single API definition" that works with all possible storage options on any platform, with intelligent fallbacks and automatic storage selection.

**ZERO DEPENDENCIES**: This plugin will be built with absolutely NO external dependencies - not even official Capacitor plugins. Everything will be implemented from scratch for maximum control, minimal bundle size, and zero dependency conflicts.

## Key Requirements

### 1. Cross-Platform Support

- **Web/Browser**: Support all browser storage APIs
- **Android**: Native Android storage via Capacitor
- **iOS**: Native iOS storage via Capacitor
- **Capacitor**: Use as middleware between mobile and web, but the plugin should work in plain web projects without Capacitor

### 2. Storage Types to Support

#### Web/Browser Storage:

- LocalStorage
- SessionStorage
- IndexedDB
- Cache API
- Cookies
- Memory (in-memory storage)

#### Mobile Storage (via Capacitor):

- Capacitor Preferences
- SQLite
- Filesystem
- Native secure storage (Keychain on iOS, Encrypted SharedPreferences on Android)

### 3. Single API Principle

Users should be able to use one consistent API for all operations:

```typescript
// Same API works everywhere
await storage.set('key', value);
await storage.get('key');
await storage.remove('key');
await storage.clear();
await storage.subscribe('key', callback);
```

### 4. Zero Dependencies Philosophy

- **NO external dependencies** - not even official Capacitor plugins
- Direct communication with native APIs through Capacitor's bridge
- Custom implementation of all storage mechanisms
- Complete control over every aspect of storage
- Minimal bundle size and maximum performance

### 4. Configuration Requirements

- Users can configure default storage preferences
- Users can override storage choice per API call
- Support for multiple storages simultaneously
- Ability to read from one storage and write to another

Example:

```typescript
// Default configuration
const storage = new Strata({
	defaultStorages: ['sqlite', 'indexedDB', 'localStorage'],
});

// Override per call
await storage.set('key', value, { storage: 'localStorage' });
await storage.set('key', value, { storage: ['sqlite', 'indexedDB'] }); // Multiple storages
```

### 5. Core Implementations Required (From Scratch)

Since we're building with zero dependencies, we need to implement:

#### Web Implementations:

- **Cookie Parser**: Parse `document.cookie` string, handle encoding/decoding
- **IndexedDB Wrapper**: Promise-based wrapper around IndexedDB API
- **Cache API Wrapper**: Clean abstraction over browser Cache API
- **Crypto Utilities**: Encryption/decryption using Web Crypto API
- **Compression**: LZ-string or similar algorithm in pure JavaScript
- **Base64 Utilities**: Encoding/decoding for binary data

#### Capacitor Bridge:

- **Plugin Registration**: Using Capacitor's `registerPlugin`
- **Method Definitions**: TypeScript interfaces for native methods
- **Error Handling**: Consistent error propagation from native to JS

#### Native Implementations (iOS):

- **UserDefaults Wrapper**: Swift code for preferences
- **SQLite Integration**: Swift SQLite3 implementation
- **Keychain Access**: Swift Security framework integration
- **File Manager**: Swift FileManager operations

#### Native Implementations (Android):

- **SharedPreferences**: Kotlin/Java implementation
- **SQLite Database**: Android SQLite implementation
- **Encrypted Preferences**: Android security library usage
- **File Operations**: Android file system access

## Reference Plugins

### ALL PLUGINS BELOW ARE FOR REFERENCE ONLY - DO NOT ADD AS DEPENDENCIES

### Capacitor Plugins (Study their implementation, Study but don't add as dependencies):

1. **@capacitor/preferences** - https://www.npmjs.com/package/@capacitor/preferences

   - Study how they communicate with native preferences APIs
   - Reference their TypeScript to native bridge implementation
   - Learn their iOS UserDefaults and Android SharedPreferences approach

2. **@capacitor/filesystem** - https://www.npmjs.com/package/@capacitor/filesystem
   - Study their file operation implementations
   - Reference their path handling and permissions
   - Learn their base64 encoding/decoding approach

### Community Capacitor Plugins (Study but don't add as dependencies):

3. **@capacitor-community/sqlite** - https://www.npmjs.com/package/@capacitor-community/sqlite

   - Study their SQLite implementation
   - Implement our own SQLite adapter based on their approach

4. **@capgo/capacitor-data-storage-sqlite** - https://www.npmjs.com/package/@capgo/capacitor-data-storage-sqlite

   - Study their key-value over SQLite approach
   - Reference their encryption implementation

5. **fs-capacitor** - https://www.npmjs.com/package/fs-capacitor

   - Study filesystem operations
   - Reference for file-based storage

6. **capacitor-plugin-webview-cache** - https://www.npmjs.com/package/capacitor-plugin-webview-cache

   - Study cache management
   - Reference for cache operations

7. **@coeps/capacitor-plugin-ios-cookie-mover** - https://www.npmjs.com/package/@coeps/capacitor-plugin-ios-cookie-mover
   - Study iOS cookie handling
   - Reference for cookie management

### Web Storage Reference Libraries (Study but don't add as dependencies):

8. **localforage** - https://www.npmjs.com/package/localforage

   - Study their storage detection and fallback mechanism
   - Reference their IndexedDB/WebSQL/localStorage abstraction
   - Use their driver architecture as inspiration

9. **store2** - https://www.npmjs.com/package/store2

   - Study their namespace support
   - Reference their cross-browser compatibility approach
   - Learn from their plugin system

10. **idb** - https://www.npmjs.com/package/idb

    - Study their minimal IndexedDB wrapper
    - Reference their Promise-based API
    - Use their TypeScript patterns

11. **idb-keyval** - https://www.npmjs.com/package/idb-keyval

    - Study their simple key-value API over IndexedDB
    - Reference for simplified IndexedDB usage

12. **lowdb** - https://www.npmjs.com/package/lowdb

    - Study their JSON database approach
    - Reference their adapter pattern
    - Learn from their query syntax

13. **dexie** - https://www.npmjs.com/package/dexie

    - Study their advanced IndexedDB features
    - Reference their query builder
    - Learn from their migration system

14. **rxdb** - https://www.npmjs.com/package/rxdb

    - Study their reactive database approach
    - Reference their real-time sync
    - Learn from their multi-tab support

15. **js-cookie** - https://www.npmjs.com/package/js-cookie

    - Study cookie handling
    - Reference their encoding/decoding
    - Use for cookie adapter implementation

16. **@walletconnect/keyvaluestorage** - https://www.npmjs.com/package/@walletconnect/keyvaluestorage

    - Study their storage abstraction
    - Reference their React Native support

17. **@parcel/cache** - https://www.npmjs.com/package/@parcel/cache
    - Study cache implementation patterns

## Implementation Rules

### 1. ZERO Dependencies Rule

**CRITICAL**: This plugin must have ABSOLUTELY ZERO external dependencies:

- Do NOT add ANY npm packages as dependencies
- Do NOT use official Capacitor plugins
- Do NOT use any third-party libraries
- Everything must be implemented from scratch
- Direct native API communication through Capacitor's bridge
- Pure JavaScript/TypeScript implementation for web APIs

**Benefits of Zero Dependencies**:

- No version conflicts
- Minimal bundle size
- Complete control over implementation
- No breaking changes from dependencies
- Faster installation
- Better security (no supply chain attacks)

### 2. Native API Communication

For Capacitor/mobile features:

- Use Capacitor's `registerPlugin` to create native bridges
- Implement native code for iOS (Swift) and Android (Kotlin/Java)
- Study reference plugins to understand native implementations
- Create our own native modules for each platform

### 2. Technology Stack

- **TypeScript**: Use for the entire project (only dev dependency)
- **Latest ES Features**: Use modern JavaScript features
- **Build System**: Custom build setup with TypeScript compiler
- **Testing**: Build test utilities from scratch
- **Documentation**: TSDoc for all public APIs
- **NO Runtime Dependencies**: Everything implemented from scratch
- **Native Code**: Swift for iOS, Kotlin/Java for Android

### 3. Plugin Architecture

Create a modular architecture with:

- **Core**: Main Strata class and base functionality
- **Adapters**: Separate adapter for each storage type
- **Strategies**: Storage selection strategies
- **Features**: Encryption, compression, sync, etc.
- **Integrations**: Framework-specific integrations

### 4. API Design Principles

- **Consistency**: Same API across all platforms
- **Type Safety**: Full TypeScript support with generics
- **Async First**: All operations return Promises
- **Graceful Degradation**: Automatic fallbacks
- **Developer Experience**: Clear errors, good defaults

## Features to Implement

### Core Features

1. **Basic Operations**

   - get/set/remove/clear/has/keys/size

2. **Batch Operations**

   - setMany/getMany/removeMany

3. **Subscriptions**

   - subscribe/unsubscribe to changes
   - Cross-tab synchronization

4. **Namespacing**

   - Create isolated storage spaces

5. **Querying** (for database storages)
   - MongoDB-like query syntax
   - Indexing support

### Advanced Features

1. **Encryption**

   - Built-in encryption/decryption
   - Per-item or whole-storage encryption

2. **Compression**

   - Automatic compression for large data
   - Multiple compression algorithms

3. **Sync Engine**

   - Sync between different storages
   - Conflict resolution

4. **TTL Support**

   - Automatic expiration
   - Cleanup of expired items

5. **Migrations**

   - Version-based data migrations
   - Automatic migration running

6. **Transactions**

   - ACID transactions for supported storages
   - Rollback support

7. **Import/Export**
   - Backup and restore functionality
   - Multiple format support

## Project Structure

```
strata-storage/
├── src/
│   ├── core/
│   │   ├── Strata.ts              # Main class
│   │   ├── AdapterRegistry.ts     # Adapter management
│   │   ├── StorageAdapter.ts      # Base adapter interface
│   │   └── Strategy.ts            # Storage strategies
│   ├── adapters/
│   │   ├── web/
│   │   │   ├── MemoryAdapter.ts
│   │   │   ├── LocalStorageAdapter.ts
│   │   │   ├── SessionStorageAdapter.ts
│   │   │   ├── IndexedDBAdapter.ts
│   │   │   ├── CacheAdapter.ts
│   │   │   └── CookieAdapter.ts
│   │   └── capacitor/
│   │       ├── PreferencesAdapter.ts
│   │       ├── SQLiteAdapter.ts
│   │       ├── FilesystemAdapter.ts
│   │       └── SecureStorageAdapter.ts
│   ├── features/
│   │   ├── encryption/         # Pure JS crypto implementation
│   │   ├── compression/        # Pure JS compression
│   │   ├── sync/
│   │   ├── query/
│   │   └── migration/
│   ├── integrations/
│   │   ├── react/
│   │   ├── vue/
│   │   └── angular/
│   └── plugin/                 # Capacitor plugin setup
│       └── definitions.ts      # Native method definitions
├── ios/                        # iOS native implementation
│   └── Plugin/
│       ├── Plugin.swift
│       ├── PreferencesStorage.swift
│       ├── SQLiteStorage.swift
│       ├── KeychainStorage.swift
│       └── FileSystemStorage.swift
├── android/                    # Android native implementation
│   └── src/main/java/
│       ├── Plugin.java
│       ├── PreferencesStorage.java
│       ├── SQLiteStorage.java
│       ├── SecureStorage.java
│       └── FileSystemStorage.java
├── tests/
├── examples/
└── docs/
```

## Development Approach

### Phase 1: Core Implementation

1. Create base Strata class
2. Implement adapter interface
3. Create Memory and LocalStorage adapters (pure JS)
4. Basic get/set/remove operations

### Phase 2: Web Adapters (Pure JavaScript)

1. IndexedDB adapter with full features
2. SessionStorage adapter
3. Cookie adapter (custom cookie parsing)
4. Cache API adapter

### Phase 3: Capacitor Plugin Structure

1. Set up Capacitor plugin architecture
2. Create TypeScript interfaces for native communication
3. Implement registerPlugin setup
4. Create bridge for native method calls

### Phase 4: Native Implementations

1. **iOS (Swift)**:
   - UserDefaults implementation
   - SQLite implementation
   - Keychain implementation
   - File system operations
2. **Android (Kotlin/Java)**:
   - SharedPreferences implementation
   - SQLite implementation
   - Encrypted SharedPreferences
   - File system operations

### Phase 5: Advanced Features

1. Query engine for database storages
2. Sync engine
3. Encryption/compression (pure JS implementation)
4. Migrations and transactions

### Phase 6: Framework Integrations

1. React hooks and providers
2. Vue composition API
3. Angular services
4. Svelte stores

## Success Criteria

1. **Single API**: One consistent API that works everywhere
2. **ZERO Dependencies**: Absolutely no external npm dependencies
3. **Self-Contained**: Complete implementation including native code
4. **Platform Agnostic**: Works in web-only projects and with Capacitor
5. **Feature Complete**: All storage types and features implemented
6. **Well Tested**: Comprehensive test coverage
7. **Well Documented**: Complete API documentation and examples
8. **Developer Friendly**: Excellent TypeScript support and DX
9. **Minimal Bundle Size**: Due to zero dependencies
10. **Maximum Control**: No breaking changes from external packages

## Getting Started for Implementation

1. Set up TypeScript project with modern configuration
2. **DO NOT install any npm dependencies**
3. Create the plugin structure:
   ```bash
   mkdir -p src/core src/adapters/web src/adapters/capacitor
   mkdir -p ios/Plugin android/src/main/java
   ```
4. Your package.json should look like this:
   ```json
   {
   	"name": "strata-storage",
   	"version": "1.0.0",
   	"description": "Zero-dependency universal storage plugin",
   	"main": "dist/index.js",
   	"types": "dist/index.d.ts",
   	"scripts": {
   		"build": "tsc",
   		"test": "node test-runner.js"
   	},
   	"dependencies": {},
   	"devDependencies": {
   		"typescript": "^5.0.0",
   		"@types/node": "^20.0.0"
   	},
   	"peerDependencies": {
   		"@capacitor/core": "^5.0.0"
   	},
   	"peerDependenciesMeta": {
   		"@capacitor/core": {
   			"optional": true
   		}
   	}
   }
   ```
5. Start with core Strata class and adapter interface
6. Implement Memory adapter as baseline (pure JS Map)
7. Add LocalStorage adapter with all features (using window.localStorage)
8. Implement cookie handling from scratch (document.cookie parsing)
9. Build IndexedDB adapter using native IndexedDB API
10. Create Capacitor plugin structure for mobile features
11. Implement native iOS code in Swift
12. Implement native Android code in Kotlin/Java
13. Test each adapter thoroughly across platforms

## Implementation Guidelines

### For Web APIs:

- Use native browser APIs directly (localStorage, IndexedDB, etc.)
- Implement cookie parsing/serialization from scratch
- Use built-in crypto.subtle for encryption
- Implement compression algorithms in pure JS

### For Native Features:

- Study reference plugins' native code
- Implement Swift code for iOS storage APIs
- Implement Kotlin/Java code for Android storage APIs
- Use Capacitor's plugin bridge for communication

### For Advanced Features:

- Query engine: Implement in pure TypeScript
- Encryption: Use Web Crypto API for web, native crypto for mobile
- Compression: Implement algorithms like LZ-string in pure JS
- Sync: Build on top of the adapter layer

## Important Notes

- Every adapter should implement ALL features where possible
- Use feature detection to determine available storages
- Graceful degradation is crucial
- Performance matters - implement caching and optimization
- Security is important - proper encryption implementation
- Think about developer experience at every step

## Zero Dependencies: Benefits & Challenges

### Benefits:

- **No Version Conflicts**: Never worry about dependency updates breaking your code
- **Minimal Bundle Size**: Only ship the code you actually need
- **Maximum Performance**: No overhead from unused features
- **Complete Control**: Every line of code is yours to optimize
- **Better Security**: No supply chain vulnerabilities
- **Easier Debugging**: All code is in your project
- **No License Issues**: Your code, your license

### Challenges & Solutions:

- **More Code to Write**: But you gain complete understanding and control
- **Native Platform Code**: Study reference implementations thoroughly
- **Testing Complexity**: Build comprehensive test suite from day one
- **Maintenance**: But no surprise breaking changes from dependencies

### Key Implementation Areas:

1. **Cookie Handling**: Parse and serialize cookies manually
2. **Crypto**: Use Web Crypto API and native platform crypto
3. **Compression**: Implement LZ-based algorithms in pure JS
4. **Native Bridge**: Use Capacitor's registerPlugin directly
5. **SQL Parsing**: Build simple SQL query builder for SQLite
6. **File Operations**: Direct native API calls for filesystem

This is a comprehensive storage solution that will be the "one storage plugin to rule them all" - making storage operations simple and consistent across all platforms while providing advanced features when needed, all with ZERO external dependencies!

## Final Emphasis: True Zero Dependencies

**Remember**:

- If you're thinking of adding a dependency, DON'T
- If you think you need a library for something, IMPLEMENT IT
- If it seems like a lot of work, remember the BENEFITS
- Every line of code should be OURS

This is not just a storage plugin - it's a statement that modern web development can be done without the bloat of countless dependencies. We're building something pure, fast, and completely self-contained.

**The Challenge**: Build the best storage plugin ever created with exactly 0 runtime dependencies.

**The Reward**: A plugin that will never break due to dependency issues, runs faster than any alternative, and gives developers complete confidence in their storage layer.
