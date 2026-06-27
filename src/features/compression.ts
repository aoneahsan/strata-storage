/**
 * Compression Feature - Pure JavaScript LZ-string implementation
 * Zero-dependency compression/decompression for storage values
 */

import { CompressionError } from '@/utils/errors';

/**
 * Compression configuration
 */
export interface CompressionConfig {
  /**
   * Compression algorithm. Only the bundled zero-dependency LZ codec is
   * implemented (`'lz'`); the field is kept for forward compatibility.
   */
  algorithm?: 'lz';
  threshold?: number; // Minimum size in bytes to compress
  level?: number; // Compression level (1-9)
}

/**
 * Compressed data structure
 */
export interface CompressedData {
  data: string; // Base64 encoded compressed data
  algorithm: string;
  originalSize: number;
  compressedSize: number;
}

/**
 * Compression manager using pure JavaScript LZ-string algorithm
 */
export class CompressionManager {
  private config: Required<CompressionConfig>;

  constructor(config: CompressionConfig = {}) {
    this.config = {
      algorithm: config.algorithm || 'lz',
      threshold: config.threshold || 1024, // 1KB default threshold
      level: config.level || 6,
    };
  }

  /**
   * Compress data using LZ-string algorithm
   */
  async compress(data: unknown): Promise<CompressedData | unknown> {
    try {
      const jsonStr = JSON.stringify(data);
      const originalSize = new Blob([jsonStr]).size;

      // Skip compression if below threshold
      if (originalSize < this.config.threshold) {
        return data;
      }

      // Compress using LZ algorithm
      const compressed = this.lzCompress(jsonStr);
      const compressedSize = new Blob([compressed]).size;

      // Only use compression if it reduces size
      if (compressedSize >= originalSize) {
        return data;
      }

      return {
        // Tag the on-disk format so decompress() can pick the right decoder.
        // Older releases wrote `algorithm: 'lz'` with a UTF-16-char codec that
        // corrupted non-Latin1 data; the current byte-LZW format is tagged
        // distinctly and old 'lz' payloads still read via the legacy path.
        data: compressed,
        algorithm: CompressionManager.FORMAT,
        originalSize,
        compressedSize,
      };
    } catch (error) {
      throw new CompressionError(`Compression failed: ${error}`);
    }
  }

  /**
   * Decompress data
   */
  async decompress<T = unknown>(compressedData: CompressedData): Promise<T> {
    try {
      if (!this.isCompressedData(compressedData)) {
        return compressedData as T;
      }

      // Route by stored format tag: the current byte-LZW format vs. the legacy
      // UTF-16-char codec written by <= 2.7.0 (algorithm 'lz'), so existing
      // compressed-at-rest values keep decoding after upgrade.
      const decompressed =
        compressedData.algorithm === CompressionManager.FORMAT
          ? this.lzDecompress(compressedData.data)
          : this.legacyLzDecompress(compressedData.data);
      return JSON.parse(decompressed) as T;
    } catch (error) {
      throw new CompressionError(`Decompression failed: ${error}`);
    }
  }

  /**
   * Check if data is compressed
   */
  isCompressedData(data: unknown): data is CompressedData {
    return (
      typeof data === 'object' &&
      data !== null &&
      'data' in data &&
      'algorithm' in data &&
      'originalSize' in data &&
      'compressedSize' in data
    );
  }

  // Format tag stored in CompressedData.algorithm for the current byte-LZW
  // codec. Payloads written by <= 2.7.0 are tagged 'lz' and decode via the
  // legacy path; anything tagged FORMAT uses the current decoder.
  private static readonly FORMAT = 'lz-u8';

  // Freeze the LZW dictionary at 16 bits so every token serializes to exactly
  // two bytes; both encoder and decoder stop growing the dictionary at the same
  // point, staying in sync. 0xFFFF entries is ample for storage-sized values;
  // beyond it, already-learned phrases still compress, just no new ones.
  private static readonly LZW_MAX_CODE = 0xffff;

  /**
   * LZ compression over UTF-8 bytes.
   *
   * The alphabet is bytes (0–255), so the literal-vs-dictionary-code
   * discriminator (`< 256`) on decompress is correct for ALL input — including
   * CJK / emoji / symbols whose code points are ≥ 256. (Operating on raw UTF-16
   * chars previously misclassified any such literal as a dictionary code and
   * silently corrupted the stored value, or threw on read.)
   */
  private lzCompress(uncompressed: string): string {
    const bytes = new TextEncoder().encode(uncompressed);
    if (bytes.length === 0) return '';

    const dictionary = new Map<string, number>();
    let nextCode = 256;
    const tokens: number[] = [];

    let phrase = String.fromCharCode(bytes[0]); // byte-string (each char 0–255)
    for (let i = 1; i < bytes.length; i++) {
      const current = String.fromCharCode(bytes[i]);
      const combined = phrase + current;
      if (dictionary.has(combined)) {
        phrase = combined;
      } else {
        // `phrase` is always either a single byte (literal) or an existing
        // dictionary entry, so the lookup below is always defined.
        tokens.push(phrase.length === 1 ? phrase.charCodeAt(0) : dictionary.get(phrase)!);
        if (nextCode <= CompressionManager.LZW_MAX_CODE) {
          dictionary.set(combined, nextCode++);
        }
        phrase = current;
      }
    }
    tokens.push(phrase.length === 1 ? phrase.charCodeAt(0) : dictionary.get(phrase)!);

    // Serialize each token as a 16-bit big-endian value, then base64.
    const out = new Uint8Array(tokens.length * 2);
    for (let i = 0; i < tokens.length; i++) {
      out[i * 2] = (tokens[i] >> 8) & 0xff;
      out[i * 2 + 1] = tokens[i] & 0xff;
    }
    return this.bytesToBase64(out);
  }

  /**
   * LZ decompression — inverse of {@link lzCompress}, reconstructing UTF-8 bytes
   * then decoding them back to the original string.
   */
  private lzDecompress(compressed: string): string {
    if (!compressed) return '';

    const inBytes = this.base64ToBytes(compressed);
    const tokenCount = inBytes.length >> 1;
    if (tokenCount === 0) return '';

    const dictionary = new Map<number, string>();
    let nextCode = 256;

    const readToken = (i: number): number => (inBytes[i * 2] << 8) | inBytes[i * 2 + 1];

    // The first token is always a literal byte (the dictionary starts empty).
    let oldPhrase = String.fromCharCode(readToken(0));
    const out: string[] = [oldPhrase];

    for (let i = 1; i < tokenCount; i++) {
      const code = readToken(i);
      let phrase: string;
      if (code < 256) {
        phrase = String.fromCharCode(code);
      } else if (dictionary.has(code)) {
        phrase = dictionary.get(code)!;
      } else {
        // Classic LZW edge: the code equals the entry we are about to define.
        phrase = oldPhrase + oldPhrase.charAt(0);
      }

      out.push(phrase);
      if (nextCode <= CompressionManager.LZW_MAX_CODE) {
        dictionary.set(nextCode++, oldPhrase + phrase.charAt(0));
      }
      oldPhrase = phrase;
    }

    // `out` holds byte-strings; rebuild the byte sequence and UTF-8 decode it.
    const joined = out.join('');
    const bytes = new Uint8Array(joined.length);
    for (let i = 0; i < joined.length; i++) {
      bytes[i] = joined.charCodeAt(i) & 0xff;
    }
    return new TextDecoder().decode(bytes);
  }

  private static readonly B64_CHARS =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  /** Base64-encode raw bytes (btoa when available, else a pure-JS fallback). */
  private bytesToBase64(bytes: Uint8Array): string {
    if (typeof btoa !== 'undefined') {
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      return btoa(binary);
    }

    const chars = CompressionManager.B64_CHARS;
    let result = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const a = bytes[i];
      const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
      const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
      const bitmap = (a << 16) | (b << 8) | c;
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i + 1 < bytes.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i + 2 < bytes.length ? chars.charAt(bitmap & 63) : '=';
    }
    return result;
  }

  /** Decode a base64 string back to raw bytes (atob when available, else pure-JS). */
  private base64ToBytes(input: string): Uint8Array {
    if (typeof atob !== 'undefined') {
      const binary = atob(input);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i) & 0xff;
      }
      return bytes;
    }

    const chars = CompressionManager.B64_CHARS;
    const clean = input.replace(/[^A-Za-z0-9+/]/g, '');
    const bytes: number[] = [];
    for (let i = 0; i < clean.length; i += 4) {
      const e1 = chars.indexOf(clean.charAt(i));
      const e2 = chars.indexOf(clean.charAt(i + 1));
      const e3 = chars.indexOf(clean.charAt(i + 2));
      const e4 = chars.indexOf(clean.charAt(i + 3));
      const bitmap =
        (e1 << 18) | (Math.max(e2, 0) << 12) | (Math.max(e3, 0) << 6) | Math.max(e4, 0);
      bytes.push((bitmap >> 16) & 255);
      if (e3 !== -1) bytes.push((bitmap >> 8) & 255);
      if (e4 !== -1) bytes.push(bitmap & 255);
    }
    return new Uint8Array(bytes);
  }

  /**
   * Legacy decoder for payloads written by <= 2.7.0 (algorithm 'lz'): the
   * original UTF-16-char LZW over the raw string with a `decodeURIComponent`
   * base64 layer. Kept read-only so existing compressed-at-rest values still
   * decode after upgrading to the current byte-LZW codec. (That codec corrupted
   * non-Latin1 input, so legacy payloads are Latin1 in practice.)
   */
  private legacyLzDecompress(compressed: string): string {
    if (!compressed) return '';

    const decoded =
      typeof atob !== 'undefined'
        ? decodeURIComponent(escape(atob(compressed)))
        : this.legacyDecodeFromBase64(compressed);

    const dictionary = new Map<number, string>();
    let currentChar = decoded.charAt(0);
    let oldPhrase = currentChar;
    const out = [currentChar];
    let code = 256;

    for (let i = 1; i < decoded.length; i++) {
      const currentCode = decoded.charCodeAt(i);
      const phrase =
        currentCode < 256
          ? decoded.charAt(i)
          : dictionary.get(currentCode) || oldPhrase + currentChar;
      out.push(phrase);
      currentChar = phrase.charAt(0);
      dictionary.set(code, oldPhrase + currentChar);
      code++;
      oldPhrase = phrase;
    }

    return out.join('');
  }

  private legacyDecodeFromBase64(input: string): string {
    const chars = `${CompressionManager.B64_CHARS}=`;
    let result = '';
    const clean = input.replace(/[^A-Za-z0-9+/]/g, '');
    for (let i = 0; i < clean.length; i += 4) {
      const e1 = chars.indexOf(clean.charAt(i));
      const e2 = chars.indexOf(clean.charAt(i + 1));
      const e3 = chars.indexOf(clean.charAt(i + 2));
      const e4 = chars.indexOf(clean.charAt(i + 3));
      const bitmap = (e1 << 18) | (e2 << 12) | (e3 << 6) | e4;
      result += String.fromCharCode((bitmap >> 16) & 255);
      if (e3 !== 64 && e3 !== -1) result += String.fromCharCode((bitmap >> 8) & 255);
      if (e4 !== 64 && e4 !== -1) result += String.fromCharCode(bitmap & 255);
    }
    return result;
  }

  /**
   * Get compression ratio
   */
  getCompressionRatio(compressedData: CompressedData): number {
    return compressedData.compressedSize / compressedData.originalSize;
  }

  /**
   * Get savings percentage
   */
  getSavingsPercentage(compressedData: CompressedData): number {
    return (
      ((compressedData.originalSize - compressedData.compressedSize) /
        compressedData.originalSize) *
      100
    );
  }
}
