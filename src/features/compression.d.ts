/**
 * Compression Feature - Pure JavaScript LZ-string implementation
 * Zero-dependency compression/decompression for storage values
 */
/**
 * Compression configuration
 */
export interface CompressionConfig {
    algorithm?: 'lz' | 'gzip';
    threshold?: number;
    level?: number;
}
/**
 * Compressed data structure
 */
export interface CompressedData {
    data: string;
    algorithm: string;
    originalSize: number;
    compressedSize: number;
}
/**
 * Compression manager using pure JavaScript LZ-string algorithm
 */
export declare class CompressionManager {
    private config;
    constructor(config?: CompressionConfig);
    /**
     * Compress data using LZ-string algorithm
     */
    compress(data: unknown): Promise<CompressedData | unknown>;
    /**
     * Decompress data
     */
    decompress<T = unknown>(compressedData: CompressedData): Promise<T>;
    /**
     * Check if data is compressed
     */
    isCompressedData(data: unknown): data is CompressedData;
    /**
     * LZ-string compression implementation
     */
    private lzCompress;
    /**
     * LZ-string decompression implementation
     */
    private lzDecompress;
    /**
     * Base64 encoding for compressed data
     */
    private encodeToBase64;
    /**
     * Base64 decoding for compressed data
     */
    private decodeFromBase64;
    /**
     * Get compression ratio
     */
    getCompressionRatio(compressedData: CompressedData): number;
    /**
     * Get savings percentage
     */
    getSavingsPercentage(compressedData: CompressedData): number;
}
//# sourceMappingURL=compression.d.ts.map