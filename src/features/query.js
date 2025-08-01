"use strict";
/**
 * Query Engine Feature
 * Zero-dependency implementation of MongoDB-like query operators
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryEngine = void 0;
exports.createQueryEngine = createQueryEngine;
/**
 * Query engine for advanced data filtering
 */
class QueryEngine {
    /**
     * Check if a value matches a query condition
     */
    matches(value, condition) {
        // Handle null/undefined values
        if (value === null || value === undefined) {
            return this.matchesNull(value, condition);
        }
        // If condition is not an object, use direct equality
        if (typeof condition !== 'object' || condition === null) {
            return this.equals(value, condition);
        }
        // Handle special operators
        if (this.hasOperators(condition)) {
            return this.matchesOperators(value, condition);
        }
        // Handle nested object matching
        if (typeof value === 'object' && value !== null) {
            return this.matchesObject(value, condition);
        }
        return false;
    }
    /**
     * Check if object has query operators
     */
    hasOperators(obj) {
        return Object.keys(obj).some((key) => key.startsWith('$'));
    }
    /**
     * Match value against operators
     */
    matchesOperators(value, operators) {
        for (const [op, operand] of Object.entries(operators)) {
            if (!this.matchesOperator(value, op, operand)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Match single operator
     */
    matchesOperator(value, operator, operand) {
        switch (operator) {
            case '$eq':
                return this.equals(value, operand);
            case '$ne':
                return !this.equals(value, operand);
            case '$gt':
                return this.compare(value, operand) > 0;
            case '$gte':
                return this.compare(value, operand) >= 0;
            case '$lt':
                return this.compare(value, operand) < 0;
            case '$lte':
                return this.compare(value, operand) <= 0;
            case '$in':
                return Array.isArray(operand) && operand.some((v) => this.equals(value, v));
            case '$nin':
                return Array.isArray(operand) && !operand.some((v) => this.equals(value, v));
            case '$regex':
                return this.matchesRegex(value, operand);
            case '$exists':
                return (value !== undefined) === Boolean(operand);
            case '$type':
                return this.getType(value) === operand;
            case '$and':
                return Array.isArray(operand) && operand.every((cond) => this.matches(value, cond));
            case '$or':
                return Array.isArray(operand) && operand.some((cond) => this.matches(value, cond));
            case '$not':
                return !this.matches(value, operand);
            default:
                return false;
        }
    }
    /**
     * Match object against condition
     */
    matchesObject(obj, condition) {
        for (const [key, value] of Object.entries(condition)) {
            if (key.startsWith('$')) {
                // Top-level operator
                if (!this.matchesOperator(obj, key, value)) {
                    return false;
                }
            }
            else {
                // Property match
                const objValue = this.getNestedValue(obj, key);
                if (!this.matches(objValue, value)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            if (typeof current === 'object' && part in current) {
                current = current[part];
            }
            else {
                return undefined;
            }
        }
        return current;
    }
    /**
     * Check equality with proper type handling
     */
    equals(a, b) {
        // Handle null/undefined
        if (a === b)
            return true;
        if (a === null || b === null)
            return false;
        if (a === undefined || b === undefined)
            return false;
        // Handle dates
        if (a instanceof Date && b instanceof Date) {
            return a.getTime() === b.getTime();
        }
        // Handle arrays
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length)
                return false;
            return a.every((val, i) => this.equals(val, b[i]));
        }
        // Handle objects
        if (typeof a === 'object' && typeof b === 'object') {
            const aKeys = Object.keys(a);
            const bKeys = Object.keys(b);
            if (aKeys.length !== bKeys.length)
                return false;
            return aKeys.every((key) => this.equals(a[key], b[key]));
        }
        // Default comparison
        return a === b;
    }
    /**
     * Compare values
     */
    compare(a, b) {
        // Handle null/undefined
        if (a === b)
            return 0;
        if (a === null || a === undefined)
            return -1;
        if (b === null || b === undefined)
            return 1;
        // Handle dates
        if (a instanceof Date && b instanceof Date) {
            return a.getTime() - b.getTime();
        }
        // Handle numbers
        if (typeof a === 'number' && typeof b === 'number') {
            return a - b;
        }
        // Handle strings
        if (typeof a === 'string' && typeof b === 'string') {
            return a.localeCompare(b);
        }
        // Type mismatch - convert to string for comparison
        return String(a).localeCompare(String(b));
    }
    /**
     * Match regex pattern
     */
    matchesRegex(value, pattern) {
        if (typeof value !== 'string')
            return false;
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        return regex.test(value);
    }
    /**
     * Get JavaScript type of value
     */
    getType(value) {
        if (value === null)
            return 'null';
        if (value === undefined)
            return 'undefined';
        if (Array.isArray(value))
            return 'array';
        if (value instanceof Date)
            return 'date';
        if (value instanceof RegExp)
            return 'regexp';
        return typeof value;
    }
    /**
     * Handle null/undefined matching
     */
    matchesNull(value, condition) {
        // Direct null/undefined comparison
        if (condition === null || condition === undefined) {
            return value === condition;
        }
        // Handle operators
        if (typeof condition === 'object' && this.hasOperators(condition)) {
            return this.matchesOperators(value, condition);
        }
        return false;
    }
    /**
     * Sort array of items by multiple fields
     */
    sort(items, sortBy) {
        const sorted = [...items];
        const sortKeys = Object.entries(sortBy);
        sorted.sort((a, b) => {
            for (const [key, direction] of sortKeys) {
                const aVal = this.getNestedValue(a, key);
                const bVal = this.getNestedValue(b, key);
                const comparison = this.compare(aVal, bVal);
                if (comparison !== 0) {
                    return comparison * direction;
                }
            }
            return 0;
        });
        return sorted;
    }
    /**
     * Project/transform objects based on projection spec
     */
    project(item, projection) {
        const result = {};
        const isInclusion = Object.values(projection).some((v) => v === 1 || v === true);
        if (isInclusion) {
            // Inclusion mode - only include specified fields
            for (const [key, include] of Object.entries(projection)) {
                if (include === 1 || include === true) {
                    const value = this.getNestedValue(item, key);
                    if (value !== undefined) {
                        this.setNestedValue(result, key, value);
                    }
                }
            }
        }
        else {
            // Exclusion mode - include all except specified fields
            result.value = { ...item };
            for (const [key, exclude] of Object.entries(projection)) {
                if (exclude === 0 || exclude === false) {
                    this.deleteNestedValue(result, key);
                }
            }
        }
        return result;
    }
    /**
     * Set nested value in object using dot notation
     */
    setNestedValue(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!(part in current) || typeof current[part] !== 'object') {
                current[part] = {};
            }
            current = current[part];
        }
        current[parts[parts.length - 1]] = value;
    }
    /**
     * Delete nested value from object using dot notation
     */
    deleteNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!(part in current) || typeof current[part] !== 'object') {
                return;
            }
            current = current[part];
        }
        delete current[parts[parts.length - 1]];
    }
}
exports.QueryEngine = QueryEngine;
/**
 * Create a query engine instance
 */
function createQueryEngine() {
    return new QueryEngine();
}
//# sourceMappingURL=query.js.map