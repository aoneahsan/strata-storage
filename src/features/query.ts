/**
 * Query Engine Feature
 * Zero-dependency implementation of MongoDB-like query operators
 */

import type { QueryCondition, QueryOperators } from '@/types';

/**
 * Query engine for advanced data filtering
 */
export class QueryEngine {
  /**
   * Check if a value matches a query condition
   */
  matches(value: unknown, condition: QueryCondition): boolean {
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
      return this.matchesOperators(value, condition as QueryOperators);
    }

    // Handle nested object matching
    if (typeof value === 'object' && value !== null) {
      return this.matchesObject(value as Record<string, unknown>, condition);
    }

    return false;
  }

  /**
   * Check if object has query operators
   */
  private hasOperators(obj: object): boolean {
    return Object.keys(obj).some((key) => key.startsWith('$'));
  }

  /**
   * Match value against operators
   */
  private matchesOperators(value: unknown, operators: QueryOperators): boolean {
    for (const [op, operand] of Object.entries(operators)) {
      if (!this.matchesOperator(value, op as keyof QueryOperators, operand)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Match single operator
   */
  private matchesOperator(
    value: unknown,
    operator: keyof QueryOperators,
    operand: unknown,
  ): boolean {
    switch (operator) {
      case '$eq':
        return this.equals(value, operand);

      case '$ne':
        return !this.equals(value, operand);

      case '$gt':
        return this.compare(value, operand as number | string) > 0;

      case '$gte':
        return this.compare(value, operand as number | string) >= 0;

      case '$lt':
        return this.compare(value, operand as number | string) < 0;

      case '$lte':
        return this.compare(value, operand as number | string) <= 0;

      case '$in':
        if (!Array.isArray(operand)) return false;
        // If value is an array, check if any operand value is in the array
        if (Array.isArray(value)) {
          return operand.some((v) => value.some((item) => this.equals(item, v)));
        }
        // Otherwise check if value equals any operand value
        return operand.some((v) => this.equals(value, v));

      case '$nin':
        return Array.isArray(operand) && !operand.some((v) => this.equals(value, v));

      case '$regex':
        return this.matchesRegex(value, operand as string | RegExp);

      case '$exists':
        return (value !== undefined) === Boolean(operand);

      case '$type':
        return this.getType(value) === operand;

      case '$and':
        return Array.isArray(operand) && operand.every((cond) => this.matches(value, cond));

      case '$or':
        return Array.isArray(operand) && operand.some((cond) => this.matches(value, cond));

      case '$not':
        return !this.matches(value, operand as QueryCondition);

      default:
        return false;
    }
  }

  /**
   * Match object against condition
   */
  private matchesObject(obj: Record<string, unknown>, condition: QueryCondition): boolean {
    for (const [key, value] of Object.entries(condition)) {
      if (key.startsWith('$')) {
        // Top-level operator
        if (!this.matchesOperator(obj, key as keyof QueryOperators, value)) {
          return false;
        }
      } else {
        // Property match
        const objValue = this.getNestedValue(obj, key);
        if (!this.matches(objValue, value as QueryCondition)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Check equality with proper type handling
   */
  private equals(a: unknown, b: unknown): boolean {
    // Handle null/undefined
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (a === undefined || b === undefined) return false;

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, i) => this.equals(val, b[i]));
    }

    // Handle objects
    if (typeof a === 'object' && typeof b === 'object') {
      const aKeys = Object.keys(a as object);
      const bKeys = Object.keys(b as object);
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every((key) =>
        this.equals((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
      );
    }

    // Default comparison
    return a === b;
  }

  /**
   * Compare values
   */
  private compare(a: unknown, b: unknown): number {
    // Handle null/undefined
    if (a === b) return 0;
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;

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
  private matchesRegex(value: unknown, pattern: string | RegExp): boolean {
    if (typeof value !== 'string') return false;

    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    return regex.test(value);
  }

  /**
   * Get JavaScript type of value
   */
  private getType(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (value instanceof RegExp) return 'regexp';
    return typeof value;
  }

  /**
   * Handle null/undefined matching
   */
  private matchesNull(value: null | undefined, condition: QueryCondition): boolean {
    // Direct null/undefined comparison
    if (condition === null || condition === undefined) {
      return value === condition;
    }

    // Handle operators
    if (typeof condition === 'object' && this.hasOperators(condition)) {
      return this.matchesOperators(value, condition as QueryOperators);
    }

    return false;
  }

  /**
   * Sort array of items by multiple fields
   */
  sort<T>(items: T[], sortBy: Record<string, 1 | -1>): T[] {
    const sorted = [...items];
    const sortKeys = Object.entries(sortBy);

    sorted.sort((a, b) => {
      for (const [key, direction] of sortKeys) {
        const aVal = this.getNestedValue(a as Record<string, unknown>, key);
        const bVal = this.getNestedValue(b as Record<string, unknown>, key);
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
  project<T>(item: T, projection: Record<string, 0 | 1 | boolean>): Partial<T> {
    const result: Record<string, unknown> = {};
    const isInclusion = Object.values(projection).some((v) => v === 1 || v === true);

    if (isInclusion) {
      // Inclusion mode - only include specified fields
      for (const [key, include] of Object.entries(projection)) {
        if (include === 1 || include === true) {
          const value = this.getNestedValue(item as Record<string, unknown>, key);
          if (value !== undefined) {
            this.setNestedValue(result, key, value);
          }
        }
      }
    } else {
      // Exclusion mode - include all except specified fields
      result.value = { ...(item as object) };
      for (const [key, exclude] of Object.entries(projection)) {
        if (exclude === 0 || exclude === false) {
          this.deleteNestedValue(result, key);
        }
      }
    }

    return result as Partial<T>;
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Delete nested value from object using dot notation
   */
  private deleteNestedValue(obj: Record<string, unknown>, path: string): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        return;
      }
      current = current[part] as Record<string, unknown>;
    }

    delete current[parts[parts.length - 1]];
  }
}

/**
 * Create a query engine instance
 */
export function createQueryEngine(): QueryEngine {
  return new QueryEngine();
}
