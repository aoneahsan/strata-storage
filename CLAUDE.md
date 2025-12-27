# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**Strata Storage** is a zero-dependency universal storage plugin providing a unified API for all storage operations across web, Android, and iOS platforms.

**Version**: 2.4.1 (Production)
**NPM Package**: strata-storage
**Developer**: Ahsan Mahmood
**GitHub**: https://github.com/aoneahsan/strata-storage
**License**: Apache 2.0

## Dev Server Ports

- Demo App: 5947
- Marketing Website: 5948

## Build & Development Commands

```bash
# Install dependencies (pnpm workspace)
pnpm install

# Build main package
pnpm build

# Build specific workspace
pnpm --filter strata-storage-demo build
pnpm --filter strata-storage-website build

# Run tests
pnpm test

# Lint code
pnpm lint

# Type check
pnpm typecheck
```

## Project Structure

```
strata-storage/
├── src/                      # Main library source
│   ├── core/                # Strata class, BaseAdapter, Registry
│   ├── adapters/            # Storage adapters
│   │   ├── web/            # Browser: Memory, LocalStorage, IndexedDB, etc.
│   │   └── capacitor/      # Mobile: Preferences, SQLite, Secure, Filesystem
│   ├── features/           # Encryption, compression, TTL, query, sync
│   ├── integrations/       # React, Vue, Angular integrations
│   └── plugin/             # Capacitor plugin definitions
├── example-apps/            # Workspace apps
│   ├── demo-app/           # React + Vite + Capacitor demo
│   └── marketing-website/  # React + Vite + Radix UI + Firebase
├── ios/                     # iOS native code (Swift)
├── android/                 # Android native code (Kotlin)
├── docs/                    # Documentation
└── tests/                   # Test suite (Vitest)
```

## Critical Requirements

### ZERO DEPENDENCIES Philosophy
- **NEVER** add runtime dependencies
- All functionality implemented from scratch
- Only devDependencies allowed
- Direct native API communication via Capacitor bridge

### ESLint Configuration
- **NEVER** use `@eslint/js` package (versioning issues)
- Use `typescript-eslint` directly
- See `eslint.config.mjs` for proper configuration

### Unused Code Policy
- DELETE unused imports/variables entirely
- Only use `_` prefix for: function params (interface requirements), catch errors, array destructuring
- NEVER rename unused variables with `_` - just delete them

### React Hooks Dependencies
- Only add dependencies that SHOULD trigger re-execution
- Use `// eslint-disable-next-line react-hooks/exhaustive-deps` for intentional omissions
- Stable refs, setState, dispatch don't need to be dependencies

## Key Features (v2.4.1)

### Storage Adapters (9 total)
**Web**: Memory, LocalStorage, SessionStorage, IndexedDB, Cookies, Cache API
**Mobile**: Preferences, SQLite, Secure, Filesystem

### Advanced Features
- Encryption: AES-GCM via Web Crypto API / Native crypto
- Compression: LZ-string based (zero dependencies)
- TTL: Automatic expiration with cleanup
- Query Engine: Operators ($lt, $gte, $regex), tags, conditions
- Cross-Tab Sync: BroadcastChannel API
- Observer Pattern: Fine-grained change subscriptions

### Framework Integrations
- React: `strata-storage/react`
- Vue: `strata-storage/vue`
- Angular: `strata-storage/angular`

## Development Guidelines

- Max 500 lines per file
- Use absolute imports with @/ alias
- Named props over positional
- Full TypeScript types
- Document public functions
- Run lint/typecheck after changes
- Mobile-first responsive design
- Use Vitest for tests (not Jest)

### SVG Assets
- ALWAYS create SVG for icons/logos/graphics
- NEVER use raster formats unless necessary
- Store in appropriate directories (assets/icons/, public/)

## Marketing Website

Location: `example-apps/marketing-website/`
Stack: React + Vite + Radix UI + Tailwind + Firebase

### Firebase Configuration
Required env variables (see `.env.example`):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Analytics (3 Platforms)
- Firebase Analytics (via Firebase SDK)
- Microsoft Clarity: `VITE_CLARITY_PROJECT_ID`
- Amplitude: `VITE_AMPLITUDE_API_KEY`

Analytics service tracks: page views, button clicks, navigation, form submissions, API calls, errors, user properties.

### Pages
- Home, Features, Docs, Login, Feedback, Dashboard
- Code Access, Privacy, Terms, Sitemap, 404

## Example Demo App

Location: `example-apps/demo-app/`
Stack: React + Vite + Capacitor

Demonstrates all strata-storage features:
- Basic operations (set, get, remove)
- Object storage with serialization
- Encryption with password
- Compression
- TTL with expiration
- Tag-based queries
- Cross-tab sync
- Persistence verification

## Last Updated

- CLAUDE.md: 2025-12-27
- Project Structure: 2025-12-27
- Analytics Integration: 2025-12-27
