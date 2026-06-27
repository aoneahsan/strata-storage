# Compression Guide

Guide for using compression features in Strata Storage to optimize storage space.

## Overview

Strata Storage includes built-in LZ-string compression to automatically reduce storage size for large data.

## Quick Start

```typescript
import { Strata } from 'strata-storage';

// Enable compression globally
const storage = new Strata({
  compression: {
    enabled: true,
    threshold: 1024 // Compress data > 1KB
  }
});

// Or per operation
await storage.set('large_data', data, {
  compress: true
});
```

## Configuration

```typescript
interface CompressionConfig {
  enabled?: boolean;      // Enable by default
  algorithm?: 'lz';       // Compression algorithm
  threshold?: number;     // Size threshold in bytes (1024)
}
```

## Usage Examples

### Automatic Compression

```typescript
// Automatically compress large data
const storage = new Strata({
  compression: {
    enabled: true,
    threshold: 5000 // 5KB
  }
});

// This will be compressed if > 5KB
await storage.set('dataset', largeDataset);
```

### Manual Compression

```typescript
// Force compression regardless of size
await storage.set('data', smallData, {
  compress: true
});

// Disable compression for specific data
await storage.set('already_compressed', zipFile, {
  compress: false
});
```

### Compression Detection

```typescript
import { CompressionManager } from 'strata-storage';

// Measure how a value compresses with the CompressionManager
const compression = new CompressionManager({ threshold: 1024 });
const result = await compression.compress(value);

if (compression.isCompressedData(result)) {
  console.log('Original size:', result.originalSize);
  console.log('Compressed size:', result.compressedSize);
  console.log('Savings %:', compression.getSavingsPercentage(result));
}
```

## Compression Strategies

### 1. Selective Compression

```typescript
class SmartCompression {
  async store(key: string, value: unknown) {
    const serialized = JSON.stringify(value);
    const shouldCompress = this.shouldCompress(serialized);
    
    await storage.set(key, value, {
      compress: shouldCompress
    });
  }
  
  shouldCompress(data: string): boolean {
    // Don't compress already compressed formats
    if (this.isCompressed(data)) return false;
    
    // Check compression ratio
    const ratio = this.estimateCompressionRatio(data);
    return ratio > 0.3; // 30% reduction
  }
}
```

### 2. Type-Based Compression

```typescript
// Compress specific data types
async function storeWithCompression(key: string, value: unknown) {
  const options: StorageOptions = {};
  
  if (typeof value === 'string' && value.length > 1000) {
    options.compress = true;
  } else if (Array.isArray(value) && value.length > 100) {
    options.compress = true;
  } else if (value instanceof ArrayBuffer) {
    options.compress = false; // Binary data
  }
  
  await storage.set(key, value, options);
}
```

### 3. Compression + Encryption

```typescript
// Compress before encryption for better security
await storage.set('sensitive_data', largeData, {
  compress: true,  // First compress
  encrypt: true    // Then encrypt
});
// Order: Original → Compressed → Encrypted → Stored
```

## Performance Considerations

### Compression Overhead

| Data Size | Compression Time | Decompression Time |
|-----------|-----------------|-------------------|
| 1KB       | <1ms           | <1ms              |
| 10KB      | 1-2ms          | <1ms              |
| 100KB     | 5-10ms         | 2-5ms             |
| 1MB       | 50-100ms       | 20-50ms           |

### When to Use Compression

✅ **Good for:**
- JSON data with repetitive structure
- Text content (logs, documents)
- CSV or tabular data
- Large configuration objects

❌ **Avoid for:**
- Already compressed data (images, videos, zip)
- Small data (<1KB)
- Binary data
- Frequently accessed data (CPU overhead)

## Platform-Specific Notes

### Web Browser Limits

```typescript
// localStorage has ~10MB limit
// Compression helps fit more data
const storage = new Strata({
  compression: {
    enabled: true,
    threshold: 500 // Lower threshold for web
  }
});
```

### Mobile Optimization

```typescript
// Balance compression with battery usage
const storage = new Strata({
  compression: {
    enabled: true,
    threshold: 10000 // Higher threshold on mobile
  }
});
```

## Monitoring Compression

```typescript
import { CompressionManager } from 'strata-storage';

class CompressionMonitor {
  private compression = new CompressionManager({ threshold: 1024 });

  async getCompressionStats() {
    const keys = await storage.keys();
    let totalOriginal = 0;
    let totalCompressed = 0;
    
    for (const key of keys) {
      const value = await storage.get(key);
      const result = await this.compression.compress(value);
      if (this.compression.isCompressedData(result)) {
        totalOriginal += result.originalSize;
        totalCompressed += result.compressedSize;
      }
    }
    
    return {
      totalOriginal,
      totalCompressed,
      ratio: totalCompressed / totalOriginal,
      saved: totalOriginal - totalCompressed
    };
  }
}
```

## Best Practices

1. **Set Appropriate Thresholds**: Don't compress tiny data
2. **Test Compression Ratios**: Measure actual benefits
3. **Consider Access Patterns**: Frequent access = less compression
4. **Combine with Other Features**: Compression + TTL for caches
5. **Monitor Performance**: Track compression overhead

## Troubleshooting

### Compression Not Working

```typescript
// Debug compression
const storage = new Strata({
  compression: { enabled: true },
  debug: true,
  onLog: (level, msg, data) => {
    if (msg.includes('compress')) {
      console.log('Compression:', data);
    }
  }
});
```

### Data Corruption

```typescript
import { CompressionError } from 'strata-storage';

// Handle compression/decompression errors
try {
  const data = await storage.get('compressed_key');
} catch (error) {
  if (error instanceof CompressionError) {
    console.error('Failed to decompress value:', error.message);
    // Remove or re-write the corrupted entry as needed
    await storage.remove('compressed_key');
  }
}
```

## See Also

- [API Reference - Compression](../../api/features/compression.md)
- [Storage Adapters](../../api/adapters/)