# Filesystem Adapter

Native file system storage for large files and documents.

## Overview

The Filesystem adapter provides direct access to the device's file system, enabling storage of large files, binary data, and complex directory structures.

### Capabilities

| Feature | Support |
|---------|----------|
| Persistence | ✅ Yes |
| Synchronous | ❌ No (async) |
| Observable | ✅ Yes |
| Searchable | ✅ Yes (limited) |
| Iterable | ✅ Yes |
| Capacity | Unlimited |
| Performance | 📁 Variable |
| TTL Support | ✅ Yes (manual) |
| Batch Support | ✅ Yes |
| Transaction Support | ❌ No |

## Usage

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();
await storage.initialize();

// Store file data
await storage.set('document.pdf', fileData, { 
  storage: 'filesystem' 
});
```

## Configuration

```typescript
const storage = new Strata({
  adapters: {
    filesystem: {
      directory: 'StrataStorage',
      encoding: 'utf8',
      recursive: true
    }
  }
});
```

## Directory Structure

```
Documents/
└── StrataStorage/
    ├── data/
    │   ├── user_123.json
    │   └── config.json
    ├── cache/
    │   └── temp_files/
    └── media/
        ├── images/
        └── videos/
```

## Use Cases

### 1. File Management

```typescript
class FileManager {
  async saveFile(name: string, data: Blob) {
    const base64 = await this.blobToBase64(data);
    
    await storage.set(`files/${name}`, {
      data: base64,
      type: data.type,
      size: data.size,
      created: Date.now()
    }, { storage: 'filesystem' });
  }
  
  async getFile(name: string): Promise<Blob | null> {
    const file = await storage.get(`files/${name}`, {
      storage: 'filesystem'
    });
    
    if (!file) return null;
    
    return this.base64ToBlob(file.data, file.type);
  }
  
  async listFiles(pattern?: string) {
    const keys = await storage.keys(pattern, {
      storage: 'filesystem'
    });
    
    return keys.filter(key => key.startsWith('files/'));
  }
}
```

### 2. Document Storage

```typescript
class DocumentStore {
  async saveDocument(doc: Document) {
    const path = `documents/${doc.category}/${doc.id}`;
    
    await storage.set(path, {
      metadata: doc.metadata,
      content: doc.content,
      attachments: doc.attachments
    }, { storage: 'filesystem' });
  }
  
  async getDocumentsByCategory(category: string) {
    return await storage.query({
      key: { startsWith: `documents/${category}/` }
    }, { storage: 'filesystem' });
  }
}
```

### 3. Media Cache

```typescript
class MediaCache {
  async cacheImage(url: string, imageData: ArrayBuffer) {
    const hash = await this.hashUrl(url);
    const path = `cache/images/${hash}`;
    
    await storage.set(path, {
      url,
      data: imageData,
      cached: Date.now()
    }, {
      storage: 'filesystem',
      ttl: 604800000 // 7 days
    });
  }
  
  async getCachedImage(url: string) {
    const hash = await this.hashUrl(url);
    const path = `cache/images/${hash}`;
    
    return await storage.get(path, {
      storage: 'filesystem'
    });
  }
}
```

## Platform Specifics

### iOS File Locations

```typescript
enum iOSDirectory {
  Documents = 'DOCUMENTS',      // User documents
  Data = 'DATA',               // App data
  Cache = 'CACHE',             // Cache files
  External = 'EXTERNAL',       // External storage
  ExternalStorage = 'EXTERNAL_STORAGE'
}
```

### Android File Locations

```typescript
enum AndroidDirectory {
  Files = 'FILES',             // App-specific files
  Cache = 'CACHE',             // Cache directory
  External = 'EXTERNAL',       // External storage
  ExternalFiles = 'EXTERNAL_FILES',
  Data = 'DATA'
}
```

## Best Practices

1. **Directory Organization**: Use logical directory structures
2. **File Naming**: Use consistent naming conventions
3. **Cleanup**: Implement regular cleanup for temporary files
4. **Permissions**: Handle storage permissions properly
5. **Error Handling**: Handle disk space errors gracefully

## Performance Tips

1. **Async Operations**: All file operations are asynchronous
2. **Batch Reads**: Read multiple files in parallel
3. **Stream Large Files**: Use streaming for very large files
4. **Cache Metadata**: Cache file listings and metadata

## Limitations

1. **Platform Restrictions**: Different access rules per platform
2. **Storage Permissions**: Requires permissions on Android
3. **iCloud Backup**: Consider backup implications on iOS
4. **File Size**: Very large files may cause memory issues

## See Also

- [Storage Adapters Overview](../README.md)
- [Platform Guide - iOS](../../../guides/platforms/ios.md)
- [Platform Guide - Android](../../../guides/platforms/android.md)