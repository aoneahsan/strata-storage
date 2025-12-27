# CLAUDE.md - Strata Storage Demo App

This is a sub-project of strata-storage. See root CLAUDE.md for full project guidelines.

## Project Info

**Name**: Strata Storage Demo App
**Type**: React + Vite + Capacitor
**Purpose**: Demonstrates all strata-storage features
**Parent**: strata-storage (workspace)

## Dev Server Port

| App | Port | Status |
|-----|------|--------|
| Demo App | 5947 | Registered in ~/.dev-ports.json |

### Port Management Rule (CRITICAL)

**NEVER use common/default ports** like 3000, 3001, 4000, 5000, 5173, 8000, 8080, etc.

**Three-Location Sync Required:**
1. **Project Config** - package.json dev script (`--port 5947`)
2. **This CLAUDE.md** - documented above
3. **Global Registry** - `~/.dev-ports.json` under key `strata-storage-demo`

**Verification:** Before starting dev server, verify all 3 locations match.

## Commands

```bash
# Development
pnpm dev

# Build
pnpm build

# Preview production build
pnpm preview
```

## Features Demonstrated

- Basic operations (set, get, remove, clear)
- Object storage with automatic serialization
- Encryption with password protection
- LZ-string compression
- TTL with automatic expiration
- Tag-based organization and queries
- Cross-tab synchronization
- Persistence verification across sessions

## Structure

```
demo-app/
├── src/
│   ├── hooks/useStorage.ts    # Storage hooks
│   ├── pages/                 # Feature demo pages
│   ├── App.tsx               # Main app with routing
│   └── main.tsx              # Entry point
├── package.json
├── vite.config.ts
└── capacitor.config.ts
```

## Dependencies

Uses `strata-storage` from workspace (`workspace:*`).

## Last Updated

2025-12-27
