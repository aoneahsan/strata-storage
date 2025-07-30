# Getting Started with Strata 🚀

Welcome to Strata! This guide will help you get up and running with the **zero-dependency** universal storage plugin in minutes.

## What Makes Strata Special?

Before we dive in, here's what sets Strata apart:

- **🚫 Zero Dependencies**: Not a single runtime dependency. Everything is built from scratch.
- **📦 One Package**: Install once, use everywhere - web, iOS, Android, Node.js
- **🔧 Batteries Included**: Encryption, compression, sync, queries - all built-in
- **⚡ Native Performance**: Direct API access, no wrapper overhead
- **🛡️ Future Proof**: Will never break due to dependency updates

## Table of Contents

1. [Installation](#installation)
2. [Basic Usage](#basic-usage)
3. [Platform Setup](#platform-setup)
4. [Common Use Cases](#common-use-cases)
5. [Best Practices](#best-practices)
6. [Framework Integration](#framework-integration)
7. [Troubleshooting](#troubleshooting)

## Installation

### The Beauty of Zero Dependencies

Strata has **ZERO runtime dependencies**! This means:

- ⚡ Faster installation
- 📦 Smaller bundle size
- 🔒 No security vulnerabilities from dependencies
- 🎯 No version conflicts
- 💪 Complete control

### For All Projects

```bash
# Using npm
npm install strata-storage

# Using yarn
yarn add strata-storage

# Using pnpm
pnpm add strata-storage
```

That's it! No additional dependencies needed. Strata includes everything:

- ✅ All web storage implementations
- ✅ Native iOS/Android code (when using with Capacitor)
- ✅ Encryption, compression, and sync features
- ✅ Framework integrations

### For Capacitor Projects

```bash
# Install Strata
npm install strata-storage

# Just sync - no additional dependencies needed!
npx cap sync
```

Strata includes its own native implementations for iOS and Android. No need to install separate Capacitor plugins!

## Basic Usage

### 1. Import and Initialize

```typescript
import { Strata } from 'strata-storage';

// Create instance with defaults
const storage = new Strata();

// That's it! No configuration needed
// Strata automatically:
// - Detects your platform
// - Selects the best storage
// - Sets up encryption support
// - Enables all features
```

### 2. Store Data

```typescript
// Store simple values
await storage.set('username', 'john_doe');
await storage.set('theme', 'dark');

// Store objects
await storage.set('user', {
	id: 1,
	name: 'John Doe',
	email: 'john@example.com',
});

// Store with expiration
await storage.set('session', sessionData, {
	ttl: 3600000, // 1 hour
});

// Store with built-in encryption
await storage.set('secret', sensitiveData, {
	encrypt: true, // Uses Web Crypto API or native crypto
});

// Store with built-in compression
await storage.set('large-data', bigObject, {
	compress: true, // Pure JS compression algorithm
});
```

### 3. Retrieve Data

```typescript
// Get values
const username = await storage.get('username');
const user = await storage.get('user');

// Get with default value
const theme = (await storage.get('theme')) || 'light';

// Type-safe retrieval
interface User {
	id: number;
	name: string;
	email: string;
}

const user = await storage.get<User>('user');
```

### 4. Remove Data

```typescript
// Remove single item
await storage.remove('session');

// Clear all data
await storage.clear();

// Clear by pattern
await storage.clear({ pattern: 'temp-*' });
```

## Platform Setup

### Web Application

```typescript
import { Strata, StorageStrategy } from 'strata-storage';

const storage = new Strata({
	platform: 'web',
	strategy: StorageStrategy.PERFORMANCE_FIRST,
	// All adapters are built-in, just enable what you need
	adapters: {
		memory: true,
		localStorage: true,
		indexedDB: true,
		cookies: {
			enabled: true,
			secure: window.location.protocol === 'https:',
		},
	},
});
```

### React Native / Capacitor

```typescript
import { Strata } from 'strata-storage';

// Strata automatically detects the platform
const storage = new Strata({
	platform: 'auto', // Detects iOS/Android/Web automatically
	strategy: StorageStrategy.PERSISTENCE_FIRST,
	// Native storage is built-in!
	native: {
		preferences: true, // iOS: UserDefaults, Android: SharedPreferences
		sqlite: true, // Native SQLite implementation
		secure: true, // iOS: Keychain, Android: EncryptedSharedPreferences
		filesystem: true, // Native file system access
	},
});
```

### Node.js

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata({
	platform: 'node',
	adapters: {
		memory: true,
		filesystem: {
			enabled: true,
			directory: './data',
		},
		sqlite: {
			enabled: true,
			filename: './data/storage.db',
		},
	},
});
```

### Zero-Configuration Usage

```typescript
// Strata works out of the box with smart defaults
const storage = new Strata();

// Automatically uses the best available storage:
// - Memory for temporary data
// - IndexedDB for large data on web
// - SQLite on mobile platforms
// - Automatic fallbacks if storage isn't available
```

## Common Use Cases

### 1. User Preferences

```typescript
// Create a preferences namespace
const preferences = storage.namespace('preferences');

// Save preferences
await preferences.set('theme', 'dark');
await preferences.set('language', 'en');
await preferences.set('notifications', {
	email: true,
	push: false,
});

// Load all preferences
const theme = await preferences.get('theme');
const language = await preferences.get('language');
```

### 2. Authentication & Sessions

```typescript
// Store auth token with built-in encryption
await storage.set('auth_token', token, {
	encrypt: true, // Uses Web Crypto API on web, native crypto on mobile
	storage: 'secure', // Automatically uses Keychain (iOS) or EncryptedSharedPreferences (Android)
});

// Store session with expiration
await storage.set(
	'session',
	{
		userId: user.id,
		loginTime: Date.now(),
	},
	{
		ttl: 24 * 60 * 60 * 1000, // 24 hours
	}
);

// Check if user is authenticated
const isAuthenticated = await storage.has('auth_token');
```

### 3. Caching API Responses

```typescript
class APICache {
	constructor(private storage: Strata) {}

	async fetch(url: string, options?: RequestInit) {
		// Check cache first
		const cached = await this.storage.get(url);
		if (cached) {
			return cached;
		}

		// Fetch from network
		const response = await fetch(url, options);
		const data = await response.json();

		// Cache the response
		await this.storage.set(url, data, {
			ttl: 5 * 60 * 1000, // 5 minutes
			tags: ['api-cache'],
		});

		return data;
	}

	async clearCache() {
		await this.storage.clear({ tags: ['api-cache'] });
	}
}

const apiCache = new APICache(storage);
const userData = await apiCache.fetch('/api/user/123');
```

### 4. Offline Queue

```typescript
class OfflineQueue {
	private queue = storage.namespace('offline-queue');

	async add(action: any) {
		const id = Date.now().toString();
		await this.queue.set(id, {
			...action,
			timestamp: Date.now(),
			retries: 0,
		});
	}

	async process() {
		const keys = await this.queue.keys();

		for (const key of keys) {
			const action = await this.queue.get(key);

			try {
				await this.executeAction(action);
				await this.queue.remove(key);
			} catch (error) {
				action.retries++;
				if (action.retries >= 3) {
					await this.queue.remove(key);
				} else {
					await this.queue.set(key, action);
				}
			}
		}
	}

	private async executeAction(action: any) {
		// Execute the queued action
		return fetch(action.url, action.options);
	}
}

// Usage
const offlineQueue = new OfflineQueue();

// Queue action when offline
if (!navigator.onLine) {
	await offlineQueue.add({
		url: '/api/data',
		options: { method: 'POST', body: JSON.stringify(data) },
	});
}

// Process queue when online
window.addEventListener('online', () => {
	offlineQueue.process();
});
```

### 5. Real-time Synchronization

```typescript
// Subscribe to changes
storage.subscribe('user-settings', (change) => {
	console.log('Settings changed:', change);
	updateUI(change.newValue);
});

// Cross-tab synchronization (built-in!)
storage.subscribe(
	'*',
	(change) => {
		if (change.source === 'remote') {
			console.log('Data changed in another tab:', change);
		}
	},
	{ crossTab: true }
);

// Sync between storages (no external dependencies!)
const storage = new Strata({
	sync: {
		enabled: true,
		storages: ['localStorage', 'indexedDB'],
		interval: 5000,
	},
});
```

## Quick Migration Guide

Switching to Strata from other storage libraries is easy:

### From LocalForage

```typescript
// Before (LocalForage)
import localforage from 'localforage';
await localforage.setItem('key', value);
const val = await localforage.getItem('key');

// After (Strata) - Same API, zero dependencies!
import { Strata } from 'strata-storage';
const storage = new Strata();
await storage.set('key', value);
const val = await storage.get('key');
```

### From Capacitor Preferences

```typescript
// Before (Capacitor Preferences)
import { Preferences } from '@capacitor/preferences';
await Preferences.set({ key: 'name', value: 'Max' });
const { value } = await Preferences.get({ key: 'name' });

// After (Strata) - Simpler API, no dependencies!
await storage.set('name', 'Max');
const value = await storage.get('name');
```

### From Ionic Storage

```typescript
// Before (Ionic Storage)
import { Storage } from '@ionic/storage-angular';
const storage = await storage.create();
await storage.set('key', value);

// After (Strata) - No setup needed!
import { Strata } from 'strata-storage';
const storage = new Strata();
await storage.set('key', value);
```

## Best Practices

### 1. Use Namespaces

Organize your data with namespaces:

```typescript
const userStorage = storage.namespace('user');
const cacheStorage = storage.namespace('cache');
const tempStorage = storage.namespace('temp');

// Clear only temporary data
await tempStorage.clear();
```

### 2. Handle Errors Gracefully

```typescript
try {
	await storage.set('data', largeData);
} catch (error) {
	if (error.code === 'QUOTA_EXCEEDED') {
		// Clear cache and retry
		await storage.clear({ tags: ['cache'] });
		await storage.set('data', largeData);
	}
}
```

### 3. Use Appropriate Storage

```typescript
// Memory for temporary data (built-in Map implementation)
await storage.set('temp-calculation', result, {
	storage: 'memory',
});

// IndexedDB for large data (native browser API)
await storage.set('large-dataset', data, {
	storage: 'indexedDB',
});

// Secure storage for sensitive data
// Automatically uses platform-specific secure storage
await storage.set('user-credentials', credentials, {
	storage: 'secure',
	encrypt: true,
});
```

### 4. Leverage Built-in Features

```typescript
// Built-in encryption (Web Crypto API / Native)
await storage.set('sensitive', data, { encrypt: true });

// Built-in compression (Pure JS implementation)
await storage.set('large-data', data, { compress: true });

// Built-in sync across storages
const storage = new Strata({
	sync: {
		enabled: true,
		storages: ['localStorage', 'indexedDB'],
	},
});
```

### 5. Zero-Dependency Benefits

Since Strata has no dependencies:

```typescript
// No version conflicts - ever!
// Your storage will never break due to a dependency update

// Smaller bundle size
// Only includes the features you actually use

// Better security
// No supply chain attacks through compromised dependencies

// Predictable behavior
// All code is under your control

// Easy debugging
// Step through all code in your debugger
```

## Framework Integration

### React

```typescript
import { useStrata, StrataProvider } from 'strata-storage/react';

// Wrap your app
function App() {
	return (
		<StrataProvider config={{ strategy: StorageStrategy.PERFORMANCE_FIRST }}>
			<YourApp />
		</StrataProvider>
	);
}

// Use in components
function UserProfile() {
	const [user, setUser] = useStrata<User>('user', null);
	const [loading, setLoading] = useState(!user);

	useEffect(() => {
		if (user) setLoading(false);
	}, [user]);

	if (loading) return <div>Loading...</div>;

	return (
		<div>
			<h1>{user?.name}</h1>
			<button onClick={() => setUser({ ...user, name: 'New Name' })}>
				Update Name
			</button>
		</div>
	);
}
```

### Vue 3

```typescript
import { useStrata } from 'strata-storage/vue';

export default {
	setup() {
		const { data: user, set: setUser, loading } = useStrata('user', null);

		const updateUser = () => {
			setUser({ ...user.value, updated: Date.now() });
		};

		return {
			user,
			updateUser,
			loading,
		};
	},
};
```

### Angular

```typescript
import { StrataModule } from 'strata-storage/angular';

// Add to module
@NgModule({
	imports: [
		StrataModule.forRoot({
			strategy: StorageStrategy.PERSISTENCE_FIRST,
		}),
	],
})
export class AppModule {}

// Use in component
@Component({
	selector: 'app-user',
	template: `
		<div *ngIf="user$ | async as user">
			{{ user.name }}
		</div>
	`,
})
export class UserComponent implements OnInit {
	user$ = this.strata.watch<User>('user');

	constructor(private strata: StrataService) {}

	async updateUser(name: string) {
		const user = await this.strata.get<User>('user');
		await this.strata.set('user', { ...user, name });
	}
}
```

## Troubleshooting

### Storage Not Available

```typescript
// Check adapter availability
const isIndexedDBAvailable = await storage.isAdapterAvailable('indexedDB');

if (!isIndexedDBAvailable) {
	console.warn('IndexedDB not available, using fallback');
}

// Get available adapters
const available = await storage.getAvailableAdapters();
console.log('Available storage:', available);

// Strata automatically handles fallbacks, but you can check manually
const info = storage.getStorageInfo();
console.log('Storage capabilities:', info);
```

### Quota Exceeded

```typescript
// Handle quota errors
try {
	await storage.set('large-data', data);
} catch (error) {
	if (error.code === 'QUOTA_EXCEEDED') {
		// Get storage size
		const size = await storage.size({ detailed: true });
		console.log('Storage usage:', size);

		// Clear old data
		await storage.clear({
			tags: ['cache'],
			expiredOnly: true,
		});

		// Retry with compression (built-in LZ compression)
		await storage.set('large-data', data, { compress: true });
	}
}
```

### Performance Issues

```typescript
// Enable performance monitoring
const storage = new Strata({
	debug: {
		enabled: true,
		logPerformance: true,
	},
	performance: {
		slowThreshold: 100, // Log operations > 100ms
	},
});

// Get performance stats
const stats = storage.getStats();
console.log('Performance:', stats);

// Built-in optimizations
const storage = new Strata({
	cache: {
		enabled: true, // In-memory LRU cache
		maxSize: '100MB',
	},
	compression: {
		enabled: true, // Automatic compression
		threshold: 1024, // Compress data > 1KB
	},
});
```

### Cross-Platform Issues

```typescript
// Platform detection is built-in
const storage = new Strata({
	platform: 'auto', // Automatically detects platform
});

// Check current platform
const platform = storage.getPlatform();
console.log('Running on:', platform);

// Platform-specific features work automatically
// - Web: Uses IndexedDB, localStorage, etc.
// - iOS: Uses UserDefaults, Keychain, SQLite
// - Android: Uses SharedPreferences, EncryptedSharedPreferences, SQLite
```

### Native Storage Access

```typescript
// Direct access to native implementations
if (storage.getPlatform() === 'ios') {
	// Automatically uses iOS Keychain for secure storage
	await storage.set('secure-data', data, { storage: 'secure' });
}

if (storage.getPlatform() === 'android') {
	// Automatically uses Android EncryptedSharedPreferences
	await storage.set('secure-data', data, { storage: 'secure' });
}

// Or let Strata handle it automatically
await storage.set('secure-data', data, {
	secure: true, // Uses platform-appropriate secure storage
});
```

### Common Issues & Solutions

#### 1. "Module not found" errors

```bash
# This should never happen with Strata!
# We have zero dependencies, so no missing modules
```

#### 2. Version conflicts

```bash
# Also impossible with Strata!
# No dependencies = no conflicts
```

#### 3. Bundle size concerns

```typescript
// Use tree-shaking to include only what you need
import { Strata } from 'strata-storage';

// Or import specific features
import { Strata, MemoryAdapter, LocalStorageAdapter } from 'strata-storage';
```

#### 4. Debugging storage operations

```typescript
// Enable verbose logging
const storage = new Strata({
	debug: {
		enabled: true,
		verbosity: 'verbose',
		logOperations: true,
	},
});

// All code is in your node_modules/strata-storage
// You can step through it with your debugger!
```

### Migration from Other Storage Libraries

If you're migrating from other storage libraries:

```typescript
// From localForage
// Before: localforage.setItem('key', value)
// After:
await storage.set('key', value);

// From @capacitor/preferences
// Before: await Preferences.set({ key: 'key', value: 'value' })
// After:
await storage.set('key', 'value');

// From @ionic/storage
// Before: await storage.set('key', value)
// After: (same API!)
await storage.set('key', value);

// Strata's API is designed to be familiar and intuitive
```

## Next Steps

1. **Explore Advanced Features**: Check out the [Features Documentation](FEATURES.md) for advanced capabilities - all built-in, no dependencies needed!

2. **API Reference**: See the complete [API Documentation](API.md) for all available methods.

3. **Configuration**: Learn about all configuration options in the [Configuration Guide](CONFIGURATION.md).

4. **Examples**: Browse the `/examples` directory for complete sample applications.

5. **Contributing**: Want to contribute? Check out our [Contributing Guide](CONTRIBUTING.md).

## Why Zero Dependencies?

Strata is built with **zero runtime dependencies** because we believe in:

### 🚀 Performance

- No dependency overhead
- Smaller bundle size
- Faster installation
- Optimized code paths

### 🔒 Security

- No supply chain vulnerabilities
- No compromised dependencies
- Complete code audit possible
- You control every line

### 💪 Reliability

- No breaking changes from deps
- No version conflicts
- Works offline (no npm issues)
- Predictable behavior

### 🎯 Simplicity

- One package to install
- No dependency tree to manage
- Easy to understand
- Easy to debug

## Support

- **Documentation**: [https://www.npmjs.com/package/strata-storage](https://www.npmjs.com/package/strata-storage)
- **GitHub Issues**: [https://github.com/aoneahsan/strata-storage/issues](https://github.com/aoneahsan/strata-storage/issues)

## The Strata Promise

When you use Strata, you're not just getting a storage library. You're getting:

- ✅ **Zero dependencies** - Forever
- ✅ **One API** - For all platforms
- ✅ **Built-in everything** - Encryption, compression, sync
- ✅ **Native performance** - Direct API access
- ✅ **Future proof** - No dependency deprecation

Happy coding with Strata! 🎉

_Building the future of storage, one line of dependency-free code at a time._
