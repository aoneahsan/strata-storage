/**
 * Custom error classes for Strata Storage
 */
/**
 * Base error class for all Strata errors
 */
export declare class StrataError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
/**
 * Error thrown when storage quota is exceeded
 */
export declare class QuotaExceededError extends StrataError {
    constructor(message?: string, details?: unknown);
}
/**
 * Error thrown when adapter is not available
 */
export declare class AdapterNotAvailableError extends StrataError {
    constructor(adapterName: string, details?: unknown);
}
/**
 * Error thrown when operation is not supported
 */
export declare class NotSupportedError extends StrataError {
    constructor(operation: string, adapterName?: string, details?: unknown);
}
/**
 * Error thrown when encryption fails
 */
export declare class EncryptionError extends StrataError {
    constructor(message?: string, details?: unknown);
}
/**
 * Error thrown when compression fails
 */
export declare class CompressionError extends StrataError {
    constructor(message?: string, details?: unknown);
}
/**
 * Error thrown when serialization fails
 */
export declare class SerializationError extends StrataError {
    constructor(message?: string, details?: unknown);
}
/**
 * Error thrown when validation fails
 */
export declare class ValidationError extends StrataError {
    constructor(message: string, details?: unknown);
}
/**
 * Error thrown when transaction fails
 */
export declare class TransactionError extends StrataError {
    constructor(message?: string, details?: unknown);
}
/**
 * Error thrown when migration fails
 */
export declare class MigrationError extends StrataError {
    constructor(message: string, details?: unknown);
}
/**
 * Error thrown when sync operation fails
 */
export declare class SyncError extends StrataError {
    constructor(message?: string, details?: unknown);
}
/**
 * Check if error is a Strata error
 */
export declare function isStrataError(error: unknown): error is StrataError;
/**
 * General storage error
 */
export declare class StorageError extends StrataError {
    constructor(message: string, details?: unknown);
}
/**
 * Error thrown when a key is not found
 */
export declare class NotFoundError extends StrataError {
    constructor(key: string, details?: unknown);
}
/**
 * Check if error is a quota exceeded error
 */
export declare function isQuotaError(error: unknown): boolean;
//# sourceMappingURL=errors.d.ts.map