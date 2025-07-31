# Installation

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- For mobile development: Capacitor 5.x or 6.x

## Installing Strata Storage

### Using npm

```bash
npm install strata-storage
```

### Using yarn

```bash
yarn add strata-storage
```

## Platform-Specific Setup

### Web (Browser)

No additional setup required. Strata Storage works out of the box in all modern browsers.

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();
await storage.initialize();
```

### Capacitor (iOS/Android)

For Capacitor projects, you need to install and sync the native platforms:

```bash
# Install Capacitor if not already installed
npm install @capacitor/core @capacitor/cli

# Sync native projects
npx cap sync
```

#### iOS Additional Setup

Add the following to your `Info.plist` if using encrypted storage:

```xml
<key>NSFaceIDUsageDescription</key>
<string>This app uses Face ID to secure your data</string>
```

#### Android Additional Setup

No additional permissions required. The plugin automatically handles storage permissions.

### React Native

Strata Storage currently supports Capacitor-based mobile apps. React Native support is planned for future releases.

## TypeScript Configuration

Strata Storage is written in TypeScript and includes type definitions. No additional configuration needed.

For optimal TypeScript support, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "node",
    "strict": true
  }
}
```

## Verify Installation

Create a simple test to verify the installation:

```typescript
import { Strata } from 'strata-storage';

async function testStorage() {
  const storage = new Strata();
  await storage.initialize();
  
  // Test basic operations
  await storage.set('test', 'Hello Strata!');
  const value = await storage.get('test');
  console.log(value); // Should output: "Hello Strata!"
  
  // Check available storage types
  const types = storage.getAvailableStorageTypes();
  console.log('Available storage types:', types);
}

testStorage();
```

## Framework-Specific Installation

### React

```bash
npm install strata-storage
```

```tsx
import { useStorage } from 'strata-storage/react';

function MyComponent() {
  const [user, setUser] = useStorage('user', null);
  // ...
}
```

### Vue

```bash
npm install strata-storage
```

```vue
<script setup>
import { useStorage } from 'strata-storage/vue';

const user = useStorage('user', null);
</script>
```

### Angular

```bash
npm install strata-storage
```

```typescript
import { StrataModule } from 'strata-storage/angular';

@NgModule({
  imports: [StrataModule.forRoot()]
})
export class AppModule { }
```

## Next Steps

- Continue to [Quick Start](./quick-start.md) guide
- Learn about [Configuration](./configuration.md) options
- Explore [API Reference](../api/README.md)