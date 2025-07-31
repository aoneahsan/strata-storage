# Cookie Adapter

HTTP cookie storage for server-accessible data.

## Overview

The Cookie adapter provides storage through HTTP cookies, enabling data sharing between client and server. Limited in size but useful for authentication and cross-subdomain data.

### Capabilities

| Feature | Support |
|---------|----------|
| Persistence | ✅ Yes |
| Synchronous | ✅ Yes |
| Observable | ❌ No |
| Searchable | ✅ Yes (limited) |
| Iterable | ✅ Yes |
| Capacity | ~4KB per cookie |
| Performance | 🐌 Slow |
| TTL Support | ✅ Yes (native) |
| Batch Support | ✅ Yes |
| Transaction Support | ❌ No |

## Usage

```typescript
import { Strata } from 'strata-storage';

const storage = new Strata();
await storage.initialize();

// Explicitly use cookie storage
await storage.set('sessionId', id, { 
  storage: 'cookies',
  ttl: 86400000 // 24 hours
});
```

## Configuration

```typescript
const storage = new Strata({
  adapters: {
    cookies: {
      domain: '.example.com',
      path: '/',
      secure: true,
      sameSite: 'Lax',
      prefix: 'app_'
    }
  }
});
```

### Configuration Options

- `domain` (string): Cookie domain (default: current domain)
- `path` (string): Cookie path (default: '/')
- `secure` (boolean): HTTPS only (default: true in production)
- `sameSite` ('Strict' | 'Lax' | 'None'): SameSite attribute
- `prefix` (string): Prefix for cookie names
- `encode` (function): Custom encoding function
- `decode` (function): Custom decoding function

## Features

### Server Accessibility

```typescript
// Cookies are sent with HTTP requests
await storage.set('authToken', token, {
  storage: 'cookies',
  ttl: 3600000 // 1 hour
});

// Server can read via Cookie header
// Cookie: app_authToken=...
```

### Cross-Subdomain Sharing

```typescript
// Share across subdomains
const storage = new Strata({
  adapters: {
    cookies: {
      domain: '.example.com' // Available to all subdomains
    }
  }
});

await storage.set('sharedData', data, { 
  storage: 'cookies' 
});
// Available on app.example.com, api.example.com, etc.
```

### Native Expiration

```typescript
// Cookies support native expiration
await storage.set('tempSession', sessionData, {
  storage: 'cookies',
  ttl: 1800000 // 30 minutes
});
// Browser automatically removes expired cookies
```

## Use Cases

### 1. Authentication Tokens

```typescript
class AuthManager {
  async setAuthToken(token: string, rememberMe: boolean) {
    await storage.set('authToken', token, {
      storage: 'cookies',
      ttl: rememberMe ? 604800000 : 3600000, // 7 days or 1 hour
      secure: true,
      sameSite: 'Strict'
    });
  }
  
  async getAuthToken() {
    return await storage.get('authToken', {
      storage: 'cookies'
    });
  }
  
  async clearAuth() {
    await storage.remove('authToken', {
      storage: 'cookies'
    });
  }
  
  async refreshToken() {
    const token = await this.getAuthToken();
    if (!token) return null;
    
    const newToken = await api.refreshToken(token);
    await this.setAuthToken(newToken, true);
    return newToken;
  }
}
```

### 2. User Preferences (Cross-Domain)

```typescript
class PreferenceSync {
  private config = {
    storage: 'cookies' as const,
    domain: '.mycompany.com',
    secure: true,
    sameSite: 'Lax' as const
  };
  
  async setLanguage(lang: string) {
    await storage.set('lang', lang, {
      ...this.config,
      ttl: 31536000000 // 1 year
    });
  }
  
  async setTimezone(tz: string) {
    await storage.set('tz', tz, {
      ...this.config,
      ttl: 31536000000
    });
  }
  
  async getPreferences() {
    const lang = await storage.get('lang', this.config);
    const tz = await storage.get('tz', this.config);
    return { lang, tz };
  }
}
```

### 3. A/B Testing

```typescript
class ABTestManager {
  async assignUserToTest(testName: string) {
    const existing = await storage.get(`ab_${testName}`, {
      storage: 'cookies'
    });
    
    if (existing) return existing;
    
    const variant = Math.random() > 0.5 ? 'A' : 'B';
    
    await storage.set(`ab_${testName}`, variant, {
      storage: 'cookies',
      ttl: 2592000000, // 30 days
      path: '/',
      domain: '.example.com'
    });
    
    return variant;
  }
  
  async getTestVariant(testName: string) {
    return await storage.get(`ab_${testName}`, {
      storage: 'cookies'
    }) || 'control';
  }
}
```

### 4. Analytics & Tracking

```typescript
class AnalyticsTracker {
  async trackVisitor() {
    let visitorId = await storage.get('visitorId', {
      storage: 'cookies'
    });
    
    if (!visitorId) {
      visitorId = generateUUID();
      await storage.set('visitorId', visitorId, {
        storage: 'cookies',
        ttl: 63072000000, // 2 years
        secure: true,
        sameSite: 'Lax'
      });
    }
    
    // Track visit
    await storage.set('lastVisit', Date.now(), {
      storage: 'cookies',
      ttl: 1800000 // 30 minutes for session
    });
    
    return visitorId;
  }
}
```

## Size Limitations

### Cookie Size Limits

```typescript
// Cookies have strict size limits
const maxCookieSize = 4096; // 4KB including name

// Check size before storing
function checkCookieSize(name: string, value: string) {
  const cookieString = `${name}=${encodeURIComponent(value)}`;
  if (cookieString.length > maxCookieSize) {
    throw new Error(`Cookie too large: ${cookieString.length} bytes`);
  }
}

// Split large data across multiple cookies
class ChunkedCookieStorage {
  async setLarge(key: string, data: unknown) {
    const serialized = JSON.stringify(data);
    const chunks = this.chunkString(serialized, 3000); // Leave room for metadata
    
    for (let i = 0; i < chunks.length; i++) {
      await storage.set(`${key}_${i}`, chunks[i], {
        storage: 'cookies'
      });
    }
    
    await storage.set(`${key}_count`, chunks.length, {
      storage: 'cookies'
    });
  }
  
  async getLarge(key: string) {
    const count = await storage.get(`${key}_count`, {
      storage: 'cookies'
    });
    
    if (!count) return null;
    
    const chunks = [];
    for (let i = 0; i < count; i++) {
      const chunk = await storage.get(`${key}_${i}`, {
        storage: 'cookies'
      });
      chunks.push(chunk);
    }
    
    return JSON.parse(chunks.join(''));
  }
  
  private chunkString(str: string, size: number) {
    const chunks = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.slice(i, i + size));
    }
    return chunks;
  }
}
```

## Security Considerations

### 1. Secure Cookies

```typescript
// Always use secure cookies in production
const isProduction = process.env.NODE_ENV === 'production';

const storage = new Strata({
  adapters: {
    cookies: {
      secure: isProduction,
      sameSite: 'Strict',
      httpOnly: false // Note: JS accessible cookies
    }
  }
});
```

### 2. CSRF Protection

```typescript
class CSRFProtection {
  async generateToken() {
    const token = generateSecureToken();
    
    await storage.set('csrfToken', token, {
      storage: 'cookies',
      secure: true,
      sameSite: 'Strict',
      ttl: 3600000 // 1 hour
    });
    
    return token;
  }
  
  async validateToken(token: string) {
    const stored = await storage.get('csrfToken', {
      storage: 'cookies'
    });
    
    return token === stored;
  }
}
```

### 3. Cookie Encryption

```typescript
// Encrypt sensitive cookie data
class SecureCookieStorage {
  async setSecure(key: string, value: unknown, password: string) {
    // First encrypt the value
    const encrypted = await encrypt(JSON.stringify(value), password);
    
    // Then store in cookie
    await storage.set(key, encrypted, {
      storage: 'cookies',
      secure: true,
      sameSite: 'Strict'
    });
  }
  
  async getSecure(key: string, password: string) {
    const encrypted = await storage.get(key, {
      storage: 'cookies'
    });
    
    if (!encrypted) return null;
    
    const decrypted = await decrypt(encrypted, password);
    return JSON.parse(decrypted);
  }
}
```

## Cookie Attributes

### SameSite Options

```typescript
// Strict - Only same-site requests
await storage.set('strictCookie', value, {
  storage: 'cookies',
  sameSite: 'Strict'
});

// Lax - Same-site + top-level navigation
await storage.set('laxCookie', value, {
  storage: 'cookies',
  sameSite: 'Lax'
});

// None - Cross-site (requires Secure)
await storage.set('crossSiteCookie', value, {
  storage: 'cookies',
  sameSite: 'None',
  secure: true
});
```

### Path Scoping

```typescript
// Scope cookies to specific paths
await storage.set('adminToken', token, {
  storage: 'cookies',
  path: '/admin',
  secure: true
});

// API-specific cookie
await storage.set('apiKey', key, {
  storage: 'cookies',
  path: '/api',
  domain: 'api.example.com'
});
```

## Performance Optimization

### 1. Minimize Cookie Usage

```typescript
// Store only essential data in cookies
class SessionManager {
  async createSession(userData: User) {
    const sessionId = generateSessionId();
    
    // Store only ID in cookie
    await storage.set('sid', sessionId, {
      storage: 'cookies',
      ttl: 3600000
    });
    
    // Store full data in IndexedDB
    await storage.set(`session:${sessionId}`, userData, {
      storage: 'indexedDB'
    });
  }
}
```

### 2. Batch Cookie Operations

```typescript
// Batch multiple cookie operations
class CookieBatch {
  private pending: Array<{ key: string; value: unknown; options: any }> = [];
  
  add(key: string, value: unknown, options?: any) {
    this.pending.push({ key, value, options });
  }
  
  async commit() {
    for (const { key, value, options } of this.pending) {
      await storage.set(key, value, {
        storage: 'cookies',
        ...options
      });
    }
    this.pending = [];
  }
}
```

## Browser Compatibility

### Cookie Limits by Browser

| Browser | Max Cookies | Max Size | Total Size |
|---------|-------------|----------|------------|
| Chrome | 180 | 4KB | 720KB |
| Firefox | 150 | 4KB | 600KB |
| Safari | 600 | 4KB | 2.4MB |
| Edge | 180 | 4KB | 720KB |

## Best Practices

1. **Keep Cookies Small**: Store only essential data
2. **Use Appropriate Expiration**: Set reasonable TTLs
3. **Secure by Default**: Always use secure cookies in production
4. **Proper Domain Scoping**: Use the most restrictive domain possible
5. **Avoid Sensitive Data**: Don't store passwords or tokens in plain text
6. **Monitor Cookie Count**: Stay within browser limits
7. **Use SameSite**: Protect against CSRF attacks

## See Also

- [Storage Adapters Overview](../README.md)
- [Security Guide](../../../guides/security.md)
- [LocalStorage Adapter](./localstorage.md) - Client-only storage
- [Secure Storage Adapter](../capacitor/secure.md) - For sensitive data