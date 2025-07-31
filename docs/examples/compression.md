# Compression Examples

Examples of using compression features in Strata Storage.

## Basic Compression

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();

// Compress large data
const largeData = { 
  // ... large object with repeated data 
};

await storage.set('large-dataset', largeData, {
  compress: true
});
```

## Automatic Compression

```typescript
const storage = new Strata({
  compression: {
    enabled: true,
    threshold: 1024 // Auto-compress data > 1KB
  }
});

// Automatically compressed if > 1KB
await storage.set('user-list', largeUserArray);

// Not compressed if < 1KB
await storage.set('small-config', { theme: 'dark' });
```

## Selective Compression

```typescript
// Compress JSON data
await storage.set('api-response', jsonData, {
  compress: true
});

// Don't compress already compressed data
await storage.set('image-blob', imageBlob, {
  compress: false
});

// Don't compress encrypted data (compress first)
await storage.set('secure-data', data, {
  compress: true,
  encrypt: true // Compress then encrypt
});
```

## Compression Stats

```typescript
async function getCompressionStats() {
  const keys = await storage.keys();
  let totalOriginal = 0;
  let totalCompressed = 0;
  
  for (const key of keys) {
    const metadata = await storage.getMetadata(key);
    if (metadata.compressed) {
      totalOriginal += metadata.originalSize;
      totalCompressed += metadata.compressedSize;
    }
  }
  
  return {
    totalOriginal,
    totalCompressed,
    ratio: (totalCompressed / totalOriginal * 100).toFixed(2) + '%',
    saved: formatBytes(totalOriginal - totalCompressed)
  };
}
```

## Conditional Compression

```typescript
class SmartCompression {
  private storage: Strata;
  
  async store(key: string, value: any) {
    const serialized = JSON.stringify(value);
    const shouldCompress = this.shouldCompress(serialized);
    
    await this.storage.set(key, value, {
      compress: shouldCompress
    });
    
    if (shouldCompress) {
      console.log(`Compressed ${key}: ${serialized.length} bytes`);
    }
  }
  
  shouldCompress(data: string): boolean {
    // Don't compress if too small
    if (data.length < 500) return false;
    
    // Don't compress if already compressed (entropy check)
    const entropy = this.calculateEntropy(data);
    if (entropy > 0.95) return false;
    
    // Compress text-like data
    return true;
  }
  
  calculateEntropy(str: string): number {
    const len = str.length;
    const frequencies = {};
    
    for (const char of str) {
      frequencies[char] = (frequencies[char] || 0) + 1;
    }
    
    let entropy = 0;
    for (const count of Object.values(frequencies)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    
    return entropy / 8; // Normalize
  }
}
```

## Bulk Compression

```typescript
async function compressOldData(days = 30) {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  const keys = await storage.keys();
  
  for (const key of keys) {
    const metadata = await storage.getMetadata(key);
    
    if (!metadata.compressed && metadata.created < cutoff) {
      const value = await storage.get(key);
      await storage.set(key, value, { compress: true });
      console.log(`Compressed old data: ${key}`);
    }
  }
}
```

## See Also

- [Compression Guide](../guides/features/compression.md)
- [Performance Optimization](./performance.md)
- [Configuration](./configuration.md)