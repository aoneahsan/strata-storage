# Strata Storage Migration Guide

## Migrating to Provider-less Architecture (v2.0+)

Strata Storage now follows a provider-less architecture similar to Zustand, where the core library works everywhere by default, and platform-specific features (like Capacitor) are opt-in.

### Breaking Changes

1. **Capacitor adapters are no longer automatically registered**
   - Previously: Capacitor adapters were automatically loaded when Capacitor was detected
   - Now: You must explicitly import and register Capacitor adapters

2. **Import paths have changed for Capacitor features**
   - Previously: All exports were available from the main entry point
   - Now: Capacitor-specific exports are in `strata-storage/capacitor`

### Migration Steps

#### 1. Update imports for Capacitor adapters

**Before:**
```typescript
import { 
  Strata, 
  PreferencesAdapter, 
  SqliteAdapter,
  SecureAdapter,
  FilesystemAdapter 
} from 'strata-storage';
```

**After:**
```typescript
// Core imports from main entry
import { Strata } from 'strata-storage';

// Capacitor imports from subpath
import { 
  PreferencesAdapter, 
  SqliteAdapter,
  SecureAdapter,
  FilesystemAdapter,
  registerCapacitorAdapters
} from 'strata-storage/capacitor';
```

#### 2. Explicitly register Capacitor adapters

**Before:**
```typescript
// Capacitor adapters were automatically registered
const storage = new Strata();
await storage.initialize();

// Could immediately use Capacitor storages
await storage.set('key', 'value', { storage: 'preferences' });
```

**After:**
```typescript
import { Strata } from 'strata-storage';
import { registerCapacitorAdapters } from 'strata-storage/capacitor';

const storage = new Strata();

// Explicitly register Capacitor adapters if needed
if (window.Capacitor) {
  await registerCapacitorAdapters(storage);
}

await storage.initialize();

// Now you can use Capacitor storages
await storage.set('key', 'value', { storage: 'preferences' });
```

#### 3. Update default storage configuration

**Before:**
```typescript
// On Capacitor, defaults included native storages automatically
const storage = new Strata(); // defaulted to ['preferences', 'sqlite', 'indexedDB', 'localStorage', 'memory']
```

**After:**
```typescript
// Defaults are now web-only
const storage = new Strata(); // defaults to ['indexedDB', 'localStorage', 'memory']

// To include Capacitor storages in defaults:
const storage = new Strata({
  defaultStorages: ['preferences', 'sqlite', 'indexedDB', 'localStorage', 'memory']
});
await registerCapacitorAdapters(storage);
await storage.initialize();
```

### Usage Examples

#### Web-only project (no Capacitor)
```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();
await storage.initialize();

// Works with web storages out of the box
await storage.set('key', 'value'); // Uses indexedDB by default
```

#### Capacitor project (opt-in native features)
```typescript
import { Strata } from 'strata-storage';
import { registerCapacitorAdapters } from 'strata-storage/capacitor';

const storage = new Strata({
  defaultStorages: ['preferences', 'indexedDB', 'localStorage', 'memory']
});

// Register Capacitor adapters
await registerCapacitorAdapters(storage);
await storage.initialize();

// Now you can use native storages
await storage.set('secure-key', 'secret', { storage: 'secure' });
await storage.set('pref-key', 'value', { storage: 'preferences' });
```

#### Using the convenience function
```typescript
import { createCapacitorStrata } from 'strata-storage/capacitor';

// This automatically registers Capacitor adapters
const storage = await createCapacitorStrata({
  defaultStorages: ['preferences', 'sqlite', 'localStorage']
});

// Ready to use with Capacitor adapters
await storage.set('key', 'value', { storage: 'sqlite' });
```

### Benefits of the New Architecture

1. **Smaller bundle size**: Web-only projects don't include Capacitor-specific code
2. **Better tree-shaking**: Unused adapters can be eliminated by bundlers
3. **Clearer dependencies**: Explicit imports make it clear what features are being used
4. **Platform flexibility**: Easy to add support for other platforms without affecting core
5. **Progressive enhancement**: Start with web, add native features as needed

### Troubleshooting

**Issue: "Adapter not available" errors after upgrading**
- Make sure you've called `registerCapacitorAdapters()` before using Capacitor storages

**Issue: TypeScript errors on Capacitor imports**
- Update your imports to use `strata-storage/capacitor` for Capacitor-specific features

**Issue: Build errors with new import paths**
- Ensure your bundler supports package.json `exports` field (most modern bundlers do)
- Update your TypeScript to version 4.7+ for full exports support

### Need Help?

- Check the [examples](./examples) folder for updated usage patterns
- Open an issue on [GitHub](https://github.com/aoneahsan/strata-storage/issues)
- Review the [README](./README.md) for comprehensive documentation