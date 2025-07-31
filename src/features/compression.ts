/**
 * Compression Feature - Pure JavaScript LZ-string implementation
 * Zero-dependency compression/decompression for storage values
 */

import { CompressionError } from '@/utils/errors';

/**
 * Compression configuration
 */
export interface CompressionConfig {
  algorithm?: 'lz' | 'gzip';
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
        data: compressed,
        algorithm: this.config.algorithm,
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

      const decompressed = this.lzDecompress(compressedData.data);
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

  /**
   * LZ-string compression implementation
   */
  private lzCompress(uncompressed: string): string {
    if (uncompressed == null) return '';
    const context: Map<string, number> = new Map();
    const out: string[] = [];
    let currentChar: string;
    let phrase = uncompressed.charAt(0);
    let code = 256;
    
    for (let i = 1; i < uncompressed.length; i++) {
      currentChar = uncompressed.charAt(i);
      
      if (context.has(phrase + currentChar)) {
        phrase += currentChar;
      } else {
        if (phrase.length > 1) {
          out.push(String.fromCharCode(context.get(phrase)!));
        } else {
          out.push(phrase);
        }
        
        context.set(phrase + currentChar, code);
        code++;
        phrase = currentChar;
      }
    }
    
    if (phrase.length > 1) {
      out.push(String.fromCharCode(context.get(phrase)!));
    } else {
      out.push(phrase);
    }
    
    return this.encodeToBase64(out.join(''));
  }

  /**
   * LZ-string decompression implementation
   */
  private lzDecompress(compressed: string): string {
    if (compressed == null) return '';
    if (compressed === '') return '';
    
    const decoded = this.decodeFromBase64(compressed);
    const dictionary: Map<number, string> = new Map();
    let currentChar = decoded.charAt(0);
    let oldPhrase = currentChar;
    let out = [currentChar];
    let code = 256;
    let phrase: string;
    
    for (let i = 1; i < decoded.length; i++) {
      const currentCode = decoded.charCodeAt(i);
      
      if (currentCode < 256) {
        phrase = decoded.charAt(i);
      } else {
        phrase = dictionary.get(currentCode) || (oldPhrase + currentChar);
      }
      
      out.push(phrase);
      currentChar = phrase.charAt(0);
      dictionary.set(code, oldPhrase + currentChar);
      code++;
      oldPhrase = phrase;
    }
    
    return out.join('');
  }

  /**
   * Base64 encoding for compressed data
   */
  private encodeToBase64(input: string): string {
    if (typeof btoa !== 'undefined') {
      // Browser environment
      return btoa(unescape(encodeURIComponent(input)));
    }
    
    // Pure JS implementation for Node.js or other environments
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let result = '';
    let i = 0;
    
    while (i < input.length) {
      const a = input.charCodeAt(i++);
      const b = i < input.length ? input.charCodeAt(i++) : 0;
      const c = i < input.length ? input.charCodeAt(i++) : 0;
      
      const bitmap = (a << 16) | (b << 8) | c;
      
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i - 2 < input.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < input.length ? chars.charAt(bitmap & 63) : '=';
    }
    
    return result;
  }

  /**
   * Base64 decoding for compressed data
   */
  private decodeFromBase64(input: string): string {
    if (typeof atob !== 'undefined') {
      // Browser environment
      return decodeURIComponent(escape(atob(input)));
    }
    
    // Pure JS implementation
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let result = '';
    let i = 0;
    
    input = input.replace(/[^A-Za-z0-9+/]/g, '');
    
    while (i < input.length) {
      const encoded1 = chars.indexOf(input.charAt(i++));
      const encoded2 = chars.indexOf(input.charAt(i++));
      const encoded3 = chars.indexOf(input.charAt(i++));
      const encoded4 = chars.indexOf(input.charAt(i++));
      
      const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
      
      result += String.fromCharCode((bitmap >> 16) & 255);
      if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
      if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
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
    return ((compressedData.originalSize - compressedData.compressedSize) / compressedData.originalSize) * 100;
  }
}