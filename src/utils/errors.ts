/**
 * Custom error classes for Strata Storage
 */

/**
 * Base error class for all Strata errors
 */
export class StrataError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'StrataError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when storage quota is exceeded
 */
export class QuotaExceededError extends StrataError {
  constructor(message = 'Storage quota exceeded', details?: unknown) {
    super(message, 'QUOTA_EXCEEDED', details);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Error thrown when adapter is not available
 */
export class AdapterNotAvailableError extends StrataError {
  constructor(adapterName: string, details?: unknown) {
    super(`Storage adapter '${adapterName}' is not available`, 'ADAPTER_NOT_AVAILABLE', details);
    this.name = 'AdapterNotAvailableError';
  }
}

/**
 * Error thrown when operation is not supported
 */
export class NotSupportedError extends StrataError {
  constructor(operation: string, adapterName?: string, details?: unknown) {
    const message = adapterName
      ? `Operation '${operation}' is not supported by ${adapterName} adapter`
      : `Operation '${operation}' is not supported`;
    super(message, 'NOT_SUPPORTED', details);
    this.name = 'NotSupportedError';
  }
}

/**
 * Error thrown when encryption fails
 */
export class EncryptionError extends StrataError {
  constructor(message = 'Encryption operation failed', details?: unknown) {
    super(message, 'ENCRYPTION_ERROR', details);
    this.name = 'EncryptionError';
  }
}

/**
 * Error thrown when compression fails
 */
export class CompressionError extends StrataError {
  constructor(message = 'Compression operation failed', details?: unknown) {
    super(message, 'COMPRESSION_ERROR', details);
    this.name = 'CompressionError';
  }
}

/**
 * Error thrown when serialization fails
 */
export class SerializationError extends StrataError {
  constructor(message = 'Serialization failed', details?: unknown) {
    super(message, 'SERIALIZATION_ERROR', details);
    this.name = 'SerializationError';
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends StrataError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when transaction fails
 */
export class TransactionError extends StrataError {
  constructor(message = 'Transaction failed', details?: unknown) {
    super(message, 'TRANSACTION_ERROR', details);
    this.name = 'TransactionError';
  }
}

/**
 * Error thrown when migration fails
 */
export class MigrationError extends StrataError {
  constructor(message: string, details?: unknown) {
    super(message, 'MIGRATION_ERROR', details);
    this.name = 'MigrationError';
  }
}

/**
 * Error thrown when sync operation fails
 */
export class SyncError extends StrataError {
  constructor(message = 'Sync operation failed', details?: unknown) {
    super(message, 'SYNC_ERROR', details);
    this.name = 'SyncError';
  }
}

/**
 * Check if error is a Strata error
 */
export function isStrataError(error: unknown): error is StrataError {
  return error instanceof StrataError;
}

/**
 * General storage error
 */
export class StorageError extends StrataError {
  constructor(message: string, details?: unknown) {
    super(message, 'STORAGE_ERROR', details);
    this.name = 'StorageError';
  }
}

/**
 * Error thrown when a key is not found
 */
export class NotFoundError extends StrataError {
  constructor(key: string, details?: unknown) {
    super(`Key '${key}' not found`, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

/**
 * Check if error is a quota exceeded error
 */
export function isQuotaError(error: unknown): boolean {
  if (error instanceof QuotaExceededError) return true;

  // Check for native quota errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('quota') ||
      message.includes('storage exhausted') ||
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }

  return false;
}
