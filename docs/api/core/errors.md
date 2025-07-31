# Error Classes

Strata Storage provides custom error classes for better error handling and debugging.

## Error Hierarchy

```
Error
└── StrataError
    ├── StorageError
    │   ├── NotFoundError
    │   ├── QuotaExceededError
    │   ├── AdapterNotAvailableError
    │   └── NotSupportedError
    ├── EncryptionError
    ├── CompressionError
    ├── SerializationError
    ├── ValidationError
    ├── TransactionError
    ├── MigrationError
    └── SyncError
```

## Base Error Classes

### StrataError

Base error class for all Strata-specific errors.

```typescript
class StrataError extends Error {
  constructor(message: string, cause?: Error);
  readonly name: string;
  readonly cause?: Error;
}
```

#### Example

```typescript
try {
  // Some operation
} catch (error) {
  if (error instanceof StrataError) {
    console.error('Strata error:', error.message);
    if (error.cause) {
      console.error('Caused by:', error.cause);
    }
  }
}
```

## Storage Errors

### StorageError

General storage operation errors.

```typescript
class StorageError extends StrataError {
  constructor(message: string, cause?: Error);
}
```

#### Common Causes
- Storage adapter failures
- Invalid storage operations
- General storage system errors

### NotFoundError

Thrown when a requested item is not found.

```typescript
class NotFoundError extends StorageError {
  constructor(key: string);
  readonly key: string;
}
```

#### Example

```typescript
try {
  const value = await storage.get('nonexistent');
  if (!value) {
    throw new NotFoundError('nonexistent');
  }
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log(`Key not found: ${error.key}`);
  }
}
```

### QuotaExceededError

Thrown when storage quota is exceeded.

```typescript
class QuotaExceededError extends StorageError {
  constructor(
    storage: string,
    available?: number,
    required?: number
  );
  readonly storage: string;
  readonly available?: number;
  readonly required?: number;
}
```

#### Example

```typescript
try {
  await storage.set('largeData', veryLargeObject);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    console.error(`Storage quota exceeded for ${error.storage}`);
    console.log(`Available: ${error.available}, Required: ${error.required}`);
    // Clear old data or use different storage
  }
}
```

### AdapterNotAvailableError

Thrown when a requested storage adapter is not available.

```typescript
class AdapterNotAvailableError extends StorageError {
  constructor(adapter: string, reason?: string);
  readonly adapter: string;
  readonly reason?: string;
}
```

#### Example

```typescript
try {
  await storage.set('data', value, { storage: 'indexedDB' });
} catch (error) {
  if (error instanceof AdapterNotAvailableError) {
    console.error(`${error.adapter} not available: ${error.reason}`);
    // Fall back to different storage
  }
}
```

### NotSupportedError

Thrown when an operation is not supported.

```typescript
class NotSupportedError extends StorageError {
  constructor(operation: string, adapter?: string);
  readonly operation: string;
  readonly adapter?: string;
}
```

#### Example

```typescript
try {
  await storage.query({ /* complex query */ });
} catch (error) {
  if (error instanceof NotSupportedError) {
    console.error(`Operation ${error.operation} not supported by ${error.adapter}`);
  }
}
```

## Feature Errors

### EncryptionError

Errors related to encryption operations.

```typescript
class EncryptionError extends StrataError {
  constructor(message: string, cause?: Error);
}
```

#### Common Causes
- Missing or invalid password
- Corrupted encrypted data
- Unsupported encryption algorithm
- Web Crypto API not available

#### Example

```typescript
try {
  await storage.set('secure', data, { encrypt: true });
} catch (error) {
  if (error instanceof EncryptionError) {
    console.error('Encryption failed:', error.message);
  }
}
```

### CompressionError

Errors related to compression operations.

```typescript
class CompressionError extends StrataError {
  constructor(message: string, cause?: Error);
}
```

#### Common Causes
- Invalid compressed data
- Decompression failures
- Unsupported compression algorithm

### SerializationError

Errors during data serialization/deserialization.

```typescript
class SerializationError extends StrataError {
  constructor(message: string, cause?: Error);
}
```

#### Common Causes
- Circular references in objects
- Unsupported data types
- Corrupted serialized data

#### Example

```typescript
const circularObj = { name: 'test' };
circularObj.self = circularObj;

try {
  await storage.set('circular', circularObj);
} catch (error) {
  if (error instanceof SerializationError) {
    console.error('Cannot serialize circular reference');
  }
}
```

### ValidationError

Data validation errors.

```typescript
class ValidationError extends StrataError {
  constructor(message: string, field?: string);
  readonly field?: string;
}
```

#### Common Causes
- Invalid configuration
- Invalid query conditions
- Schema validation failures

### TransactionError

Transaction-related errors.

```typescript
class TransactionError extends StrataError {
  constructor(message: string, cause?: Error);
}
```

#### Common Causes
- Transaction conflicts
- Transaction timeouts
- Rollback failures

### MigrationError

Migration operation errors.

```typescript
class MigrationError extends StrataError {
  constructor(
    message: string,
    version?: number,
    cause?: Error
  );
  readonly version?: number;
}
```

#### Example

```typescript
try {
  await migrationManager.migrate(migrations);
} catch (error) {
  if (error instanceof MigrationError) {
    console.error(`Migration failed at version ${error.version}`);
  }
}
```

### SyncError

Synchronization errors.

```typescript
class SyncError extends StrataError {
  constructor(message: string, cause?: Error);
}
```

#### Common Causes
- BroadcastChannel not available
- Sync message parsing errors
- Conflict resolution failures

## Utility Functions

### isStrataError()

Type guard for Strata errors.

```typescript
function isStrataError(error: unknown): error is StrataError {
  return error instanceof StrataError;
}
```

### isQuotaError()

Type guard for quota errors.

```typescript
function isQuotaError(error: unknown): error is QuotaExceededError {
  return error instanceof QuotaExceededError;
}
```

## Error Handling Best Practices

### 1. Specific Error Handling

```typescript
try {
  await storage.set('data', value);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    // Handle quota exceeded
    await storage.clear({ olderThan: Date.now() - 86400000 });
    await storage.set('data', value); // Retry
  } else if (error instanceof EncryptionError) {
    // Handle encryption error
    console.error('Encryption failed, storing unencrypted');
    await storage.set('data', value, { encrypt: false });
  } else if (error instanceof StorageError) {
    // Handle other storage errors
    console.error('Storage error:', error.message);
  } else {
    // Unexpected error
    throw error;
  }
}
```

### 2. Error Recovery

```typescript
async function saveWithFallback(key: string, value: unknown) {
  const storageTypes: StorageType[] = ['indexedDB', 'localStorage', 'memory'];
  
  for (const storage of storageTypes) {
    try {
      await storage.set(key, value, { storage });
      return storage;
    } catch (error) {
      if (error instanceof AdapterNotAvailableError) {
        continue; // Try next storage
      }
      throw error; // Unrecoverable error
    }
  }
  
  throw new StorageError('No storage available');
}
```

### 3. Error Logging

```typescript
function logStrataError(error: unknown) {
  if (error instanceof StrataError) {
    console.error(`[${error.name}] ${error.message}`);
    if (error.cause) {
      console.error('Caused by:', error.cause);
    }
    
    // Log additional context
    if (error instanceof QuotaExceededError) {
      console.error(`Storage: ${error.storage}`);
      console.error(`Available: ${error.available}, Required: ${error.required}`);
    } else if (error instanceof MigrationError) {
      console.error(`Migration version: ${error.version}`);
    }
  }
}
```

### 4. User-Friendly Error Messages

```typescript
function getUserMessage(error: unknown): string {
  if (error instanceof QuotaExceededError) {
    return 'Storage space is full. Please free up some space.';
  } else if (error instanceof EncryptionError) {
    return 'Failed to encrypt data. Please check your password.';
  } else if (error instanceof NotFoundError) {
    return `Item "${error.key}" not found.`;
  } else if (error instanceof AdapterNotAvailableError) {
    return 'Storage is not available in your browser.';
  } else if (error instanceof StorageError) {
    return 'Storage operation failed. Please try again.';
  }
  return 'An unexpected error occurred.';
}
```

## Next Steps

- Read about [Storage Adapters](../adapters/README.md)
- Learn about [Error Recovery Strategies](../../guides/features/error-recovery.md)
- See [API Reference](../README.md)