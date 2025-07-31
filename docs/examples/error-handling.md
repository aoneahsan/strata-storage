# Error Handling Examples

Learn how to properly handle errors in Strata Storage.

## Basic Error Handling

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();

try {
  await storage.set('key', 'value');
} catch (error) {
  console.error('Storage error:', error);
}
```

## Error Types

```typescript
import {
  StrataError,
  QuotaExceededError,
  EncryptionError,
  NotFoundError,
  ValidationError
} from 'strata-storage';

try {
  await storage.set('large-data', hugeObject);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    console.error('Storage quota exceeded');
    // Clear old data or use different storage
  } else if (error instanceof ValidationError) {
    console.error('Invalid data:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Encryption Error Handling

```typescript
try {
  // Try to decrypt with wrong password
  const data = await storage.get('encrypted-key', {
    encryptionPassword: 'wrong-password'
  });
} catch (error) {
  if (error instanceof EncryptionError) {
    console.error('Decryption failed - wrong password?');
    // Prompt user for correct password
  }
}
```

## Fallback Strategies

```typescript
async function saveWithFallback(key: string, value: any) {
  const storages = ['indexedDB', 'localStorage', 'memory'];
  
  for (const storage of storages) {
    try {
      await storage.set(key, value, { storage });
      console.log(`Saved to ${storage}`);
      return;
    } catch (error) {
      console.warn(`Failed to save to ${storage}:`, error);
    }
  }
  
  throw new Error('All storage methods failed');
}
```

## Graceful Degradation

```typescript
class ResilientStorage {
  private storage: Strata;
  
  constructor() {
    this.storage = new Strata({
      onError: this.handleError.bind(this)
    });
  }
  
  private handleError(error: Error, operation: string) {
    console.error(`Storage ${operation} failed:`, error);
    
    // Report to analytics
    analytics.track('storage_error', {
      operation,
      error: error.message,
      type: error.constructor.name
    });
  }
  
  async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const value = await this.storage.get<T>(key);
      return value ?? defaultValue;
    } catch (error) {
      console.warn(`Failed to get ${key}, using default`);
      return defaultValue;
    }
  }
}
```

## Async Error Boundaries

```typescript
// React example
import { Component, ErrorInfo } from 'react';

class StorageErrorBoundary extends Component<Props, State> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (error instanceof StrataError) {
      console.error('Storage error:', error);
      // Handle storage-specific errors
    }
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Storage error occurred. Please refresh.</div>;
    }
    
    return this.props.children;
  }
}
```

## Retry Logic

```typescript
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (error instanceof QuotaExceededError) {
        // Don't retry quota errors
        throw error;
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError!;
}

// Usage
const data = await retryOperation(() => 
  storage.get('flaky-key')
);
```

## Error Reporting

```typescript
const storage = new Strata({
  onError: async (error, context) => {
    // Log locally
    console.error('Storage error:', error, context);
    
    // Report to error tracking service
    if (window.Sentry) {
      Sentry.captureException(error, {
        tags: {
          storage_operation: context.operation,
          storage_type: context.storage
        },
        extra: context
      });
    }
  }
});
```

## See Also

- [Error Types API](../api/errors.md)
- [Best Practices](../guides/best-practices.md)
- [Debugging Guide](../guides/debugging.md)