# Installation

## Prerequisites

- Node.js 18.0.0 or higher
- TypeScript 5.0 or higher (optional but recommended)
- Capacitor 5.0 or higher (for mobile platforms)

## Package Installation

### Using npm
```bash
npm install strata-storage
```

### Using yarn
```bash
yarn add strata-storage
```

### Using pnpm
```bash
pnpm add strata-storage
```

## Quick Setup

The easiest way to get started is using our configuration wizard:

```bash
npx strata-storage configure
```

This interactive CLI will:
- Detect your project type (React, Vue, Angular, etc.)
- Configure storage options
- Generate configuration files
- Create example code
- Install necessary dependencies

## Manual Setup

### 1. Basic Configuration

Create a `strata.config.js` file:

```javascript
export default {
  // Default storage types in order of preference
  defaultStorages: ['indexedDB', 'localStorage', 'memory'],
  
  // Enable features as needed
  encryption: {
    enabled: true,
    password: process.env.STRATA_ENCRYPTION_KEY
  },
  
  compression: {
    enabled: true,
    threshold: 1024 // Only compress if > 1KB
  },
  
  sync: {
    enabled: true,
    debounce: 100
  },
  
  ttl: {
    defaultTTL: 3600000, // 1 hour
    autoCleanup: true
  }
};
```

### 2. TypeScript Configuration

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["strata-storage"],
    "paths": {
      "strata-storage": ["node_modules/strata-storage/dist"],
      "strata-storage/*": ["node_modules/strata-storage/dist/*"]
    }
  }
}
```

### 3. Framework-Specific Setup

#### React

```jsx
import { StrataProvider } from 'strata-storage/react';
import config from './strata.config';

function App() {
  return (
    <StrataProvider config={config}>
      <YourApp />
    </StrataProvider>
  );
}
```

#### Vue 3

```javascript
import { createApp } from 'vue';
import { StrataPlugin } from 'strata-storage/vue';
import config from './strata.config';

const app = createApp(App);
app.use(StrataPlugin, config);
```

#### Angular

```typescript
import { StrataModule } from 'strata-storage/angular';
import config from './strata.config';

@NgModule({
  imports: [
    StrataModule.forRoot(config)
  ]
})
export class AppModule {}
```

## Platform-Specific Setup

### Capacitor (iOS/Android)

1. Install Capacitor if not already installed:
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

2. Add platforms:
```bash
npx cap add ios
npx cap add android
```

3. Sync the plugin:
```bash
npx cap sync
```

### iOS Additional Setup

For Keychain access, add to `Info.plist`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>Store secure data with biometric protection</string>
```

### Android Additional Setup

For encrypted storage, ensure minimum SDK version in `android/variables.gradle`:

```gradle
ext {
    minSdkVersion = 23
}
```

## Environment Variables

For sensitive configuration, use environment variables:

```bash
# .env
STRATA_ENCRYPTION_KEY=your-secret-key
STRATA_DEFAULT_STORAGE=indexedDB
STRATA_SYNC_ENABLED=true
```

Then in your config:

```javascript
export default {
  encryption: {
    enabled: true,
    password: process.env.STRATA_ENCRYPTION_KEY
  },
  defaultStorages: [process.env.STRATA_DEFAULT_STORAGE || 'memory']
};
```

## Build Configuration

### Webpack

No special configuration needed - Strata Storage is zero-dependency.

### Vite

Add to `vite.config.js` if using SSR:

```javascript
export default {
  ssr: {
    noExternal: ['strata-storage']
  }
};
```

### Next.js

For server-side rendering, initialize only on client:

```jsx
import dynamic from 'next/dynamic';

const StrataProvider = dynamic(
  () => import('strata-storage/react').then(mod => mod.StrataProvider),
  { ssr: false }
);
```

## Verify Installation

Create a test file to verify everything is working:

```javascript
import { Strata } from 'strata-storage';

async function test() {
  const storage = new Strata();
  await storage.initialize();
  
  await storage.set('test', { message: 'Hello Strata!' });
  const value = await storage.get('test');
  
  console.log('Success:', value);
}

test().catch(console.error);
```

## Next Steps

- [Quick Start Guide](./quick-start.md)
- [Basic Usage](./guides/basic-usage.md)
- [Framework Integration](./frameworks/react.md)
- [API Reference](./api/core.md)

## Troubleshooting

### Module Resolution Issues

If you encounter module resolution issues:

1. Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

2. Check TypeScript paths configuration
3. Ensure you're importing from the correct path

### Platform-Specific Issues

- **iOS**: Run `npx cap sync ios` after installation
- **Android**: Run `npx cap sync android` after installation
- **Web**: Ensure your bundler supports ES modules

For more help, see our [troubleshooting guide](./advanced/debugging.md) or [open an issue](https://github.com/aoneahsan/strata-storage/issues).