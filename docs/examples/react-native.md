# React Native Examples

Complete examples of using Strata Storage in React Native applications.

## Basic Setup

```typescript
import { Strata } from 'strata-storage';
import { Platform } from 'react-native';

const storage = new Strata({
  namespace: 'myapp',
  defaultStorages: Platform.select({
    ios: ['secure', 'sqlite', 'preferences'],
    android: ['secure', 'sqlite', 'preferences']
  })
});
```

## Secure Storage Example

```typescript
// Store sensitive data
await storage.set('auth-token', token, {
  storage: 'secure',
  encrypt: true
});

// Biometric protection
await storage.set('payment-info', cardDetails, {
  storage: 'secure',
  biometric: true
});
```

## Offline Data Sync

```typescript
import NetInfo from '@react-native-community/netinfo';

class OfflineSync {
  private storage: Strata;
  private syncQueue: string[] = [];
  
  constructor() {
    this.storage = new Strata();
    this.setupNetworkListener();
  }
  
  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.syncPendingData();
      }
    });
  }
  
  async saveData(key: string, data: any) {
    await this.storage.set(key, data);
    this.syncQueue.push(key);
    
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      await this.syncPendingData();
    }
  }
}
```

## AsyncStorage Migration

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

async function migrateFromAsyncStorage() {
  const storage = new Strata();
  
  // Get all AsyncStorage keys
  const keys = await AsyncStorage.getAllKeys();
  
  // Migrate each item
  for (const key of keys) {
    const value = await AsyncStorage.getItem(key);
    if (value) {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(value);
        await storage.set(key, parsed);
      } catch {
        // Store as string if not JSON
        await storage.set(key, value);
      }
    }
  }
  
  // Clear AsyncStorage after migration
  await AsyncStorage.clear();
}
```

## React Native Hooks

```typescript
import { useState, useEffect } from 'react';
import { Strata } from 'strata-storage';

function useStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const storage = new Strata();
  
  useEffect(() => {
    storage.get(key).then(stored => {
      if (stored !== null) {
        setValue(stored);
      }
      setLoading(false);
    });
  }, [key]);
  
  const updateValue = async (newValue: T) => {
    setValue(newValue);
    await storage.set(key, newValue);
  };
  
  return [value, updateValue, loading] as const;
}

// Usage
function Settings() {
  const [theme, setTheme] = useStorage('theme', 'light');
  const [notifications, setNotifications] = useStorage('notifications', true);
  
  return (
    <View>
      <Switch
        value={theme === 'dark'}
        onValueChange={(isDark) => setTheme(isDark ? 'dark' : 'light')}
      />
    </View>
  );
}
```

## Background Task Storage

```typescript
import BackgroundFetch from 'react-native-background-fetch';

BackgroundFetch.configure({
  minimumFetchInterval: 15,
  stopOnTerminate: false,
  startOnBoot: true
}, async (taskId) => {
  const storage = new Strata();
  
  // Store background task data
  await storage.set('last-background-sync', {
    timestamp: Date.now(),
    taskId
  });
  
  // Perform sync
  await syncDataInBackground();
  
  BackgroundFetch.finish(taskId);
});
```

## Large Data Handling

```typescript
import RNFS from 'react-native-fs';

class LargeDataStorage {
  private storage: Strata;
  
  async storeLargeFile(key: string, data: any) {
    const filePath = `${RNFS.DocumentDirectoryPath}/${key}.json`;
    
    // Write to file
    await RNFS.writeFile(filePath, JSON.stringify(data), 'utf8');
    
    // Store reference in Strata
    await this.storage.set(key, {
      type: 'file-reference',
      path: filePath,
      size: data.length,
      created: Date.now()
    });
  }
  
  async getLargeFile(key: string) {
    const ref = await this.storage.get(key);
    if (ref?.type === 'file-reference') {
      const content = await RNFS.readFile(ref.path, 'utf8');
      return JSON.parse(content);
    }
    return null;
  }
}
```

## Navigation State Persistence

```typescript
import { NavigationContainer } from '@react-navigation/native';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState();
  const storage = new Strata();

  useEffect(() => {
    const restoreState = async () => {
      const savedState = await storage.get('navigation-state');
      if (savedState) {
        setInitialState(savedState);
      }
      setIsReady(true);
    };

    restoreState();
  }, []);

  if (!isReady) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer
      initialState={initialState}
      onStateChange={(state) =>
        storage.set('navigation-state', state)
      }
    >
      <AppNavigator />
    </NavigationContainer>
  );
}
```

## See Also

- [Capacitor Platform Guide](../guides/platforms/capacitor.md)
- [React Integration](./frameworks/react.md)
- [Capacitor App Example](./capacitor-app.md)