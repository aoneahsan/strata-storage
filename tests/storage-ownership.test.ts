/**
 * The storage-ownership predicate, read from the built package.
 *
 * `isStorageEnvelope` decides whether a key in a SHARED storage area belongs to this library. Permissive, and we are
 * back to reading, logging about and deleting other applications' data (ISSUE-01, ISSUE-09); strict, and we stop
 * recognising our own. Neither failure is visible to typecheck, lint or a green build.
 */
import { describe, expect, it } from 'vitest';
import { isStorageEnvelope } from '../dist/utils/index.js';

const envelope = (extra: Record<string, unknown> = {}) => ({ value: 'v', created: 1, updated: 2, ...extra });

const CASES: ReadonlyArray<readonly [string, unknown, boolean]> = [
  // Foreign values seen in the wild. `ts3hsf` is Microsoft Clarity's `_cltk`; `warn` is a consumer logger's own level key.
  ['clarity _cltk raw string', 'ts3hsf', false],
  ['logger-level raw string', 'warn', false],
  ['foreign JSON object', { a: 1 }, false],
  ['foreign JSON array', [1, 2, 3], false],
  ['foreign object carrying a value key', { value: 'v' }, false],
  ['null', null, false],
  ['undefined', undefined, false],
  ['number', 42, false],
  ['string', 'plain', false],
  // Near-misses: shaped like ours but not written by us.
  ['envelope missing created', { value: 'v', updated: 2 }, false],
  ['envelope with non-numeric updated', { value: 'v', created: 1, updated: 'x' }, false],
  ['envelope with NaN created', { value: 'v', created: NaN, updated: 2 }, false],
  ['envelope with non-numeric expires', envelope({ expires: 'soon' }), false],
  // Ours, in every shape a write path produces.
  ['plain envelope', envelope(), true],
  ['envelope holding null', envelope({ value: null }), true],
  ['envelope with expires', envelope({ expires: Date.now() }), true],
  ['envelope with tags + metadata', envelope({ tags: ['a'], metadata: { b: 1 } }), true],
  ['envelope with created 0', { value: 'v', created: 0, updated: 0 }, true],
];

describe('isStorageEnvelope', () => {
  it.each(CASES)('%s → %s', (_name, input, expected) => {
    expect(isStorageEnvelope(input)).toBe(expected);
  });
});
