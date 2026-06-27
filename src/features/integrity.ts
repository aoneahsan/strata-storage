/**
 * Integrity feature — fast, zero-dependency checksums to detect data corruption.
 *
 * Uses FNV-1a (32-bit) over the serialized value. This is NOT cryptographic and
 * is not meant to resist tampering — it cheaply detects accidental corruption
 * (truncated writes, bit flips, partial storage). For tamper resistance, use
 * the encryption feature instead.
 */

import { serialize } from '@/utils';

/** Compute an FNV-1a (32-bit) checksum of an arbitrary serializable value. */
export function computeChecksum(value: unknown): string {
  const str = serialize(value);
  let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime, kept in 32-bit range
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Verify a value against an expected checksum. Returns true when no checksum was
 * stored (nothing to verify) so this is safe to call unconditionally.
 */
export function verifyChecksum(value: unknown, expected: string | undefined): boolean {
  if (!expected) return true;
  return computeChecksum(value) === expected;
}
