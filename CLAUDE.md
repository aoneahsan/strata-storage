# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Strata Storage** is a zero-dependency universal storage plugin providing a unified API for all storage operations across web, Android, and iOS platforms. Currently in planning phase with no implementation yet.

**NPM Package**: strata-storage  
**Developer**: Ahsan Mahmood  
**GitHub**: https://github.com/aoneahsan/strata-storage  

## Critical Requirements

### ZERO DEPENDENCIES Philosophy
- **NEVER** add any npm packages as runtime dependencies
- **NEVER** use official Capacitor plugins as dependencies
- All functionality must be implemented from scratch
- Only TypeScript allowed as devDependency
- Direct native API communication through Capacitor's bridge

### Build & Development Commands

```bash
# Install dev dependencies only
yarn install

# Build TypeScript
yarn build

# Run tests (when implemented)
yarn test

# Lint code
yarn lint

# Check types
yarn typecheck
```

## Architecture Overview

### Directory Structure
```
strata-storage/
├── src/
│   ├── core/               # Main Strata class and base functionality
│   ├── adapters/           # Storage adapters for each type
│   │   ├── web/           # Browser storage implementations
│   │   └── capacitor/     # Mobile storage implementations
│   ├── features/          # Encryption, compression, sync, etc.
│   ├── integrations/      # Framework-specific integrations
│   └── plugin/            # Capacitor plugin setup
├── ios/                   # iOS native implementation (Swift)
├── android/               # Android native implementation (Kotlin/Java)
├── tests/
├── examples/
└── docs/
```

### Core Implementation Areas

1. **Web Storage Adapters** (Pure JavaScript):
   - LocalStorage/SessionStorage wrappers
   - IndexedDB Promise-based implementation
   - Cookie parser/serializer from scratch
   - Cache API abstraction
   - Memory storage using Map

2. **Native Implementations**:
   - iOS: UserDefaults, SQLite, Keychain, FileManager (Swift)
   - Android: SharedPreferences, SQLite, EncryptedSharedPreferences, File operations (Kotlin/Java)

3. **Built-in Features**:
   - Encryption: Web Crypto API (web) / Native crypto (mobile)
   - Compression: Pure JS implementation (LZ-string algorithm)
   - Cross-tab sync: BroadcastChannel / storage events
   - Query engine: Pure TypeScript implementation
   - TTL support: Automatic expiration handling

## Development Guidelines

### API Design Principles
```typescript
// Single consistent API across all platforms
await storage.set('key', value);
await storage.get('key');
await storage.remove('key');
await storage.clear();

// Configuration per operation
await storage.set('key', value, { 
  storage: 'indexedDB',
  encrypt: true,
  compress: true,
  ttl: 3600000 
});
```

### Implementation Approach

1. **Start with Memory adapter** as baseline (Map implementation)
2. **Build web adapters** using native browser APIs
3. **Create Capacitor plugin structure** for mobile features
4. **Implement native code** for iOS and Android
5. **Add advanced features** (encryption, compression, sync)

### Testing Strategy
- Unit tests for each adapter
- Integration tests for cross-platform functionality
- Manual testing on iOS/Android devices
- Use Vitest or Cypress (not Jest)

## Key Development Notes

- Maximum 500 lines per file
- Use absolute imports with route aliases (@/)
- Named props over positional props
- Proper TypeScript types for everything
- Document every public function
- Follow existing code style in the codebase
- Run lint/typecheck after completing modules
- Keep UI responsive across all devices

## Platform-Specific Considerations

### Web Platform
- Feature detection for storage availability
- Automatic fallbacks (IndexedDB → localStorage → memory)
- Handle quota exceeded errors gracefully
- Cross-origin restrictions for cookies

### iOS Platform
- Use UserDefaults for preferences
- Keychain for secure storage
- SQLite3 for database storage
- Handle iOS app sandbox restrictions

### Android Platform
- SharedPreferences for simple key-value
- EncryptedSharedPreferences for secure data
- SQLite for structured data
- Handle Android storage permissions

## Current Status

**Phase**: Documentation and planning completed  
**Implementation**: Not started  
**Next Steps**: 
1. Initialize yarn project with TypeScript
2. Set up directory structure
3. Implement core Strata class
4. Build Memory adapter first
5. Add web storage adapters