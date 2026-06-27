# Error Classes

Strata Storage provides custom error classes for better error handling and debugging.

## Error Hierarchy

```
Error
└── StrataError
    ├── StorageError
    ├── NotFoundError
    ├── QuotaExceededError
    ├── AdapterNotAvailableError
    ├── NotSupportedError
    ├── EncryptionError
    ├── CompressionError
    ├── SerializationError
    ├── IntegrityError
    ├── ValidationError
    ├── TransactionError
    ├── MigrationError
    └── SyncError
```

Every error class extends `StrataError` **directly** — `StorageError` is a sibling,
not a parent of `NotFoundError`/`QuotaExceededError`/etc. To catch any library
error, use `instanceof StrataError`.

## Base Error Classes

### StrataError

Base error class for all Strata-specific errors.

```typescript
class StrataError extends Error {
  constructor(message: string, code: string, details?: unknown);
  readonly name: string;
  readonly code: string;
  readonly details?: unknown;
}
```

Every Strata error carries a string `code` (e.g. `'QUOTA_EXCEEDED'`,
`'NOT_FOUND'`) and an optional `details` payload.

#### Example

```typescript
try {
  // Some operation
} catch (error) {
  if (error instanceof StrataError) {
    console.error('Strata error:', error.message);
    console.error('Code:', error.code);
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
}
```

## Storage Errors

### StorageError

General storage operation errors.

```typescript
class StorageError extends StrataError {
  constructor(message: string, details?: unknown);
}
```

#### Common Causes
- Storage adapter failures
- Invalid storage operations
- General storage system errors

### NotFoundError

Thrown when a requested item is not found.

```typescript
class NotFoundError extends StrataError {
  constructor(key: string, details?: unknown);
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
    console.log(error.message); // Key 'nonexistent' not found
  }
}
```

### QuotaExceededError

Thrown when storage quota is exceeded.

```typescript
class QuotaExceededError extends StrataError {
  constructor(message?: string, details?: unknown);
}
```

#### Example

```typescript
try {
  await storage.set('largeData', veryLargeObject);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    console.error('Storage quota exceeded:', error.message);
    // Clear old data or use different storage
  }
}
```

### AdapterNotAvailableError

Thrown when a requested storage adapter is not available.

```typescript
class AdapterNotAvailableError extends StrataError {
  constructor(adapterName: string, details?: unknown);
}
```

#### Example

```typescript
try {
  await storage.set('data', value, { storage: 'indexedDB' });
} catch (error) {
  if (error instanceof AdapterNotAvailableError) {
    console.error(error.message); // Storage adapter 'indexedDB' is not available
    // Fall back to different storage
  }
}
```

### NotSupportedError

Thrown when an operation is not supported.

```typescript
class NotSupportedError extends StrataError {
  constructor(operation: string, adapterName?: string, details?: unknown);
}
```

#### Example

```typescript
try {
  await storage.query({ /* complex query */ });
} catch (error) {
  if (error instanceof NotSupportedError) {
    console.error(error.message);
  }
}
```

## Feature Errors

### EncryptionError

Errors related to encryption operations.

```typescript
class EncryptionError extends StrataError {
  constructor(message?: string, details?: unknown);
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
  constructor(message?: string, details?: unknown);
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
  constructor(message?: string, details?: unknown);
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
  constructor(message: string, details?: unknown);
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
  constructor(message?: string, details?: unknown);
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
  constructor(message: string, details?: unknown);
}
```

#### Example

```typescript
try {
  await migrationManager.migrate(adapter, targetVersion);
} catch (error) {
  if (error instanceof MigrationError) {
    console.error('Migration failed:', error.message);
  }
}
```

### SyncError

Synchronization errors.

```typescript
class SyncError extends StrataError {
  constructor(message?: string, details?: unknown);
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
function isQuotaError(error: unknown): boolean;
```

Returns `true` for a `QuotaExceededError`, and also for native browser quota
errors detected by name/message (e.g. `QuotaExceededError`,
`NS_ERROR_DOM_QUOTA_REACHED`, or messages containing "quota").

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
  } else if (error instanceof StrataError) {
    // Handle any other Strata error
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
    console.error(`Code: ${error.code}`);
    if (error.details) {
      console.error('Details:', error.details);
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
    return 'The requested item could not be found.';
  } else if (error instanceof AdapterNotAvailableError) {
    return 'Storage is not available in your browser.';
  } else if (error instanceof StrataError) {
    return 'Storage operation failed. Please try again.';
  }
  return 'An unexpected error occurred.';
}
```

## Next Steps

- Read about [Storage Adapters](../adapters/README.md)
- See [API Reference](../README.md)