# Compression API

Automatic data compression to reduce storage size and optimize performance.

## Overview

Strata Storage includes built-in compression using a pure JavaScript implementation of the LZ-string algorithm. This reduces storage footprint for large objects while maintaining fast performance.

## Configuration

### Global Compression

Enable compression for all data:

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata({
  compression: {
    enabled: true,
    threshold: 1024, // Only compress data larger than 1KB
    level: 'default' // Compression level: 'fast' | 'default' | 'best'
  }
});

await storage.initialize();

// All large objects are now automatically compressed
await storage.set('largeData', bigObject);
```

### Per-Operation Compression

Compress specific values:

```typescript
const storage = new Strata(); // No global compression
await storage.initialize();

// Normal storage
await storage.set('small', 'value'); // Not compressed

// Compressed storage
await storage.set('large', bigObject, {
  compress: true
});
```

## API Reference

### CompressionConfig

Configuration options for compression:

```typescript
interface CompressionConfig {
  enabled: boolean; // Enable/disable compression
  threshold?: number; // Minimum size in bytes to compress (default: 1024)
  level?: 'fast' | 'default' | 'best'; // Compression level (default: 'default')
  algorithm?: 'lz-string'; // Compression algorithm (currently only lz-string)
}
```

### SetOptions.compress

Per-operation compression flag:

```typescript
interface SetOptions {
  compress?: boolean; // Override global compression setting
  // ... other options
}
```

## Methods

### Automatic Compression/Decompression

Compression and decompression happen automatically:

```typescript
// Data is compressed when stored
await storage.set('data', largeObject, { compress: true });

// Data is decompressed when retrieved
const data = await storage.get('data'); // Returns original object
```

### Manual Compression

Access compression utilities directly:

```typescript
import { compress, decompress } from 'strata-storage';

const data = 'Large string data...'.repeat(1000);

// Compress
const compressed = compress(data);
console.log(`Original: ${data.length} bytes`);
console.log(`Compressed: ${compressed.length} bytes`);

// Decompress
const decompressed = decompress(compressed);
console.log(decompressed === data); // true
```

### Check If Compressed

Determine if stored data is compressed:

```typescript
const info = await storage.getInfo('key');
console.log(info.compressed); // true/false
console.log(info.originalSize); // Size before compression
console.log(info.compressedSize); // Size after compression
console.log(info.compressionRatio); // Ratio (e.g., 0.3 = 70% reduction)
```

## Compression Levels

### fast

Fastest compression with moderate size reduction:

```typescript
const storage = new Strata({
  compression: {
    enabled: true,
    level: 'fast'
  }
});
```

- **Speed**: Very fast
- **Ratio**: ~40-60% reduction
- **Use case**: Real-time applications, frequent writes

### default

Balanced compression speed and size:

```typescript
const storage = new Strata({
  compression: {
    enabled: true,
    level: 'default' // Default setting
  }
});
```

- **Speed**: Fast
- **Ratio**: ~50-70% reduction
- **Use case**: Most applications

### best

Maximum compression at the cost of speed:

```typescript
const storage = new Strata({
  compression: {
    enabled: true,
    level: 'best'
  }
});
```

- **Speed**: Slower
- **Ratio**: ~60-80% reduction
- **Use case**: Large data, infrequent writes, storage-constrained environments

## Examples

### Basic Compression

```typescript
const storage = new Strata({
  compression: {
    enabled: true,
    threshold: 1024 // Compress data > 1KB
  }
});

await storage.initialize();

// Small data - not compressed
await storage.set('small', 'Hello'); // 5 bytes, not compressed

// Large data - compressed
await storage.set('large', 'x'.repeat(2000), {
  compress: true
}); // 2000 bytes, compressed
```

### Selective Compression

```typescript
const storage = new Strata();
await storage.initialize();

// Don't compress structured data (poor compression ratio)
await storage.set('config', { theme: 'dark', lang: 'en' });

// Compress text data (good compression ratio)
await storage.set('article', longArticleText, { compress: true });

// Compress JSON arrays (moderate compression ratio)
await storage.set('logs', largeLogArray, { compress: true });
```

### Compression with Encryption

Compress before encrypting for best results:

```typescript
const storage = new Strata({
  compression: {
    enabled: true,
    threshold: 512
  },
  encryption: {
    enabled: true,
    password: 'secure-key'
  }
});

await storage.initialize();

// Data is compressed first, then encrypted
await storage.set('sensitiveData', largeSecretData);
```

### Dynamic Threshold

Adjust compression threshold based on storage availability:

```typescript
async function getCompressionThreshold(): Promise<number> {
  const quota = await navigator.storage.estimate();
  const available = quota.quota! - quota.usage!;

  if (available < 10 * 1024 * 1024) { // Less than 10MB available
    return 512; // Compress aggressively
  } else if (available < 100 * 1024 * 1024) { // Less than 100MB
    return 1024; // Normal compression
  } else {
    return 10240; // Only compress very large data
  }
}

const storage = new Strata({
  compression: {
    enabled: true,
    threshold: await getCompressionThreshold()
  }
});
```

### Compression Analytics

Track compression effectiveness:

```typescript
class CompressionTracker {
  private storage: Strata;
  private stats = {
    totalOriginalSize: 0,
    totalCompressedSize: 0,
    compressionCount: 0
  };

  constructor() {
    this.storage = new Strata({
      compression: { enabled: true, threshold: 1024 }
    });
  }

  async init() {
    await this.storage.initialize();
  }

  async set(key: string, value: any) {
    const originalSize = JSON.stringify(value).length;

    await this.storage.set(key, value, { compress: true });

    const info = await this.storage.getInfo(key);

    if (info.compressed) {
      this.stats.totalOriginalSize += originalSize;
      this.stats.totalCompressedSize += info.compressedSize;
      this.stats.compressionCount++;
    }
  }

  getStats() {
    const avgRatio = this.stats.totalCompressedSize / this.stats.totalOriginalSize;
    const savedBytes = this.stats.totalOriginalSize - this.stats.totalCompressedSize;

    return {
      ...this.stats,
      averageCompressionRatio: avgRatio,
      totalBytesSaved: savedBytes,
      percentSaved: ((1 - avgRatio) * 100).toFixed(2) + '%'
    };
  }
}

// Usage
const tracker = new CompressionTracker();
await tracker.init();
await tracker.set('data1', largeData1);
await tracker.set('data2', largeData2);

console.log(tracker.getStats());
// {
//   totalOriginalSize: 50000,
//   totalCompressedSize: 15000,
//   compressionCount: 2,
//   averageCompressionRatio: 0.3,
//   totalBytesSaved: 35000,
//   percentSaved: '70.00%'
// }
```

## Performance Considerations

### When to Use Compression

**✅ Good compression candidates:**
- Text content (articles, logs, JSON strings)
- Repetitive data
- Large arrays with similar items
- Base64-encoded data

**❌ Poor compression candidates:**
- Already compressed data (images, videos)
- Encrypted data (no patterns to compress)
- Very small data (<1KB overhead not worth it)
- Highly random data

### Compression Impact

```typescript
// Example compression ratios:

// Text (excellent compression)
const text = 'Lorem ipsum...'.repeat(100);
// Original: 100KB → Compressed: 15KB (85% reduction)

// JSON array (good compression)
const logs = Array(1000).fill({ timestamp: Date.now(), level: 'info' });
// Original: 50KB → Compressed: 20KB (60% reduction)

// Mixed object (moderate compression)
const data = { users: [...], settings: {...}, cache: {...} };
// Original: 30KB → Compressed: 18KB (40% reduction)

// Random data (poor compression)
const random = crypto.getRandomValues(new Uint8Array(10000));
// Original: 10KB → Compressed: 10.5KB (no reduction, overhead)
```

### Performance Benchmarks

Average compression/decompression times:

| Data Size | Level   | Compress | Decompress |
|-----------|---------|----------|------------|
| 10 KB     | fast    | ~1 ms    | ~0.5 ms    |
| 10 KB     | default | ~2 ms    | ~0.5 ms    |
| 10 KB     | best    | ~5 ms    | ~0.5 ms    |
| 100 KB    | fast    | ~10 ms   | ~5 ms      |
| 100 KB    | default | ~20 ms   | ~5 ms      |
| 100 KB    | best    | ~50 ms   | ~5 ms      |
| 1 MB      | fast    | ~100 ms  | ~50 ms     |
| 1 MB      | default | ~200 ms  | ~50 ms     |
| 1 MB      | best    | ~500 ms  | ~50 ms     |

## Best Practices

### 1. Set Appropriate Threshold

```typescript
// ❌ BAD - Too low, compresses everything
const storage = new Strata({
  compression: { enabled: true, threshold: 10 }
});

// ✅ GOOD - Only compress larger data
const storage = new Strata({
  compression: { enabled: true, threshold: 1024 }
});
```

### 2. Choose Right Level

```typescript
// Real-time app - prioritize speed
const realtimeStorage = new Strata({
  compression: { enabled: true, level: 'fast' }
});

// Storage-constrained app - prioritize size
const mobileStorage = new Strata({
  compression: { enabled: true, level: 'best' }
});
```

### 3. Combine with Right Storage Adapter

```typescript
// IndexedDB can handle large data without compression
await storage.set('largeData', data, {
  storage: 'indexedDB',
  compress: false
});

// localStorage has size limits - use compression
await storage.set('largeData', data, {
  storage: 'localStorage',
  compress: true
});
```

### 4. Don't Compress Already Compressed Data

```typescript
// ❌ BAD - Double compression
const imageBase64 = '...'; // Already compressed
await storage.set('image', imageBase64, { compress: true });

// ✅ GOOD - Skip compression
await storage.set('image', imageBase64, { compress: false });
```

## Error Handling

```typescript
import { CompressionError } from 'strata-storage';

try {
  await storage.set('data', largeData, { compress: true });
} catch (error) {
  if (error instanceof CompressionError) {
    console.error('Compression failed:', error.message);
    // Fallback: Store without compression
    await storage.set('data', largeData, { compress: false });
  }
}
```

## See Also

- [Encryption API](./encryption.md)
- [TTL API](./ttl.md)
- [Storage Adapters](../adapters/README.md)
