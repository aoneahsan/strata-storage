/**
 * Query Engine Feature
 * Zero-dependency implementation of MongoDB-like query operators
 */
import type { QueryCondition } from '@/types';
/**
 * Query engine for advanced data filtering
 */
export declare class QueryEngine {
    /**
     * Check if a value matches a query condition
     */
    matches(value: unknown, condition: QueryCondition): boolean;
    /**
     * Check if object has query operators
     */
    private hasOperators;
    /**
     * Match value against operators
     */
    private matchesOperators;
    /**
     * Match single operator
     */
    private matchesOperator;
    /**
     * Match object against condition
     */
    private matchesObject;
    /**
     * Get nested value from object using dot notation
     */
    private getNestedValue;
    /**
     * Check equality with proper type handling
     */
    private equals;
    /**
     * Compare values
     */
    private compare;
    /**
     * Match regex pattern
     */
    private matchesRegex;
    /**
     * Get JavaScript type of value
     */
    private getType;
    /**
     * Handle null/undefined matching
     */
    private matchesNull;
    /**
     * Sort array of items by multiple fields
     */
    sort<T>(items: T[], sortBy: Record<string, 1 | -1>): T[];
    /**
     * Project/transform objects based on projection spec
     */
    project<T>(item: T, projection: Record<string, 0 | 1 | boolean>): Partial<T>;
    /**
     * Set nested value in object using dot notation
     */
    private setNestedValue;
    /**
     * Delete nested value from object using dot notation
     */
    private deleteNestedValue;
}
/**
 * Create a query engine instance
 */
export declare function createQueryEngine(): QueryEngine;
//# sourceMappingURL=query.d.ts.map