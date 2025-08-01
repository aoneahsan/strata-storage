"use strict";
/**
 * Custom error classes for Strata Storage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundError = exports.StorageError = exports.SyncError = exports.MigrationError = exports.TransactionError = exports.ValidationError = exports.SerializationError = exports.CompressionError = exports.EncryptionError = exports.NotSupportedError = exports.AdapterNotAvailableError = exports.QuotaExceededError = exports.StrataError = void 0;
exports.isStrataError = isStrataError;
exports.isQuotaError = isQuotaError;
/**
 * Base error class for all Strata errors
 */
class StrataError extends Error {
    code;
    details;
    constructor(message, code, details) {
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
exports.StrataError = StrataError;
/**
 * Error thrown when storage quota is exceeded
 */
class QuotaExceededError extends StrataError {
    constructor(message = 'Storage quota exceeded', details) {
        super(message, 'QUOTA_EXCEEDED', details);
        this.name = 'QuotaExceededError';
    }
}
exports.QuotaExceededError = QuotaExceededError;
/**
 * Error thrown when adapter is not available
 */
class AdapterNotAvailableError extends StrataError {
    constructor(adapterName, details) {
        super(`Storage adapter '${adapterName}' is not available`, 'ADAPTER_NOT_AVAILABLE', details);
        this.name = 'AdapterNotAvailableError';
    }
}
exports.AdapterNotAvailableError = AdapterNotAvailableError;
/**
 * Error thrown when operation is not supported
 */
class NotSupportedError extends StrataError {
    constructor(operation, adapterName, details) {
        const message = adapterName
            ? `Operation '${operation}' is not supported by ${adapterName} adapter`
            : `Operation '${operation}' is not supported`;
        super(message, 'NOT_SUPPORTED', details);
        this.name = 'NotSupportedError';
    }
}
exports.NotSupportedError = NotSupportedError;
/**
 * Error thrown when encryption fails
 */
class EncryptionError extends StrataError {
    constructor(message = 'Encryption operation failed', details) {
        super(message, 'ENCRYPTION_ERROR', details);
        this.name = 'EncryptionError';
    }
}
exports.EncryptionError = EncryptionError;
/**
 * Error thrown when compression fails
 */
class CompressionError extends StrataError {
    constructor(message = 'Compression operation failed', details) {
        super(message, 'COMPRESSION_ERROR', details);
        this.name = 'CompressionError';
    }
}
exports.CompressionError = CompressionError;
/**
 * Error thrown when serialization fails
 */
class SerializationError extends StrataError {
    constructor(message = 'Serialization failed', details) {
        super(message, 'SERIALIZATION_ERROR', details);
        this.name = 'SerializationError';
    }
}
exports.SerializationError = SerializationError;
/**
 * Error thrown when validation fails
 */
class ValidationError extends StrataError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * Error thrown when transaction fails
 */
class TransactionError extends StrataError {
    constructor(message = 'Transaction failed', details) {
        super(message, 'TRANSACTION_ERROR', details);
        this.name = 'TransactionError';
    }
}
exports.TransactionError = TransactionError;
/**
 * Error thrown when migration fails
 */
class MigrationError extends StrataError {
    constructor(message, details) {
        super(message, 'MIGRATION_ERROR', details);
        this.name = 'MigrationError';
    }
}
exports.MigrationError = MigrationError;
/**
 * Error thrown when sync operation fails
 */
class SyncError extends StrataError {
    constructor(message = 'Sync operation failed', details) {
        super(message, 'SYNC_ERROR', details);
        this.name = 'SyncError';
    }
}
exports.SyncError = SyncError;
/**
 * Check if error is a Strata error
 */
function isStrataError(error) {
    return error instanceof StrataError;
}
/**
 * General storage error
 */
class StorageError extends StrataError {
    constructor(message, details) {
        super(message, 'STORAGE_ERROR', details);
        this.name = 'StorageError';
    }
}
exports.StorageError = StorageError;
/**
 * Error thrown when a key is not found
 */
class NotFoundError extends StrataError {
    constructor(key, details) {
        super(`Key '${key}' not found`, 'NOT_FOUND', details);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Check if error is a quota exceeded error
 */
function isQuotaError(error) {
    if (error instanceof QuotaExceededError)
        return true;
    // Check for native quota errors
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (message.includes('quota') ||
            message.includes('storage exhausted') ||
            error.name === 'QuotaExceededError' ||
            error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    }
    return false;
}
//# sourceMappingURL=errors.js.map