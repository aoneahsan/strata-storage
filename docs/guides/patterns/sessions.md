# Session Management Patterns

## Overview

Session management is crucial for maintaining user state across requests and page refreshes. Strata Storage provides robust, secure, and cross-platform session management capabilities with built-in encryption, TTL, and synchronization features.

## Core Session Concepts

### Session Types

1. **Browser Sessions** - Temporary, cleared on browser close
2. **Persistent Sessions** - Survive browser restarts
3. **Secure Sessions** - Encrypted sensitive data
4. **Distributed Sessions** - Synchronized across tabs/devices

## Basic Session Implementation

```typescript
import { Strata } from 'strata-storage';

class SessionManager {
  private storage: Strata;
  private sessionId: string;
  
  constructor() {
    this.storage = new Strata({
      defaultStorage: 'sessionStorage', // Browser session
      fallbackStorage: 'localStorage',  // Persistent fallback
      encryption: {
        enabled: true,
        password: process.env.SESSION_SECRET
      },
      ttl: {
        default: 1800000, // 30 minutes
        sliding: true     // Reset on activity
      }
    });
    
    this.sessionId = this.getOrCreateSessionId();
  }
  
  private getOrCreateSessionId(): string {
    let id = this.storage.get('session-id');
    if (!id) {
      id = this.generateSessionId();
      this.storage.set('session-id', id);
    }
    return id;
  }
  
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async setSessionData(key: string, value: any): Promise<void> {
    await this.storage.set(`session:${this.sessionId}:${key}`, value);
  }
  
  async getSessionData(key: string): Promise<any> {
    return this.storage.get(`session:${this.sessionId}:${key}`);
  }
  
  async clearSession(): Promise<void> {
    const keys = await this.storage.keys(`session:${this.sessionId}:`);
    await Promise.all(keys.map(key => this.storage.remove(key)));
  }
}
```

## Advanced Session Patterns

### 1. User Authentication Session

```typescript
interface UserSession {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  loginTime: number;
  lastActivity: number;
  expiresAt: number;
}

class AuthSessionManager {
  private storage: Strata;
  private readonly SESSION_KEY = 'auth-session';
  private readonly REFRESH_TOKEN_KEY = 'refresh-token';
  
  constructor() {
    this.storage = new Strata({
      defaultStorage: 'secure', // Use secure storage on mobile
      fallbackStorage: 'localStorage',
      encryption: {
        enabled: true,
        algorithm: 'AES-GCM',
        keySize: 256
      }
    });
  }
  
  async createSession(user: UserSession, rememberMe: boolean = false): Promise<void> {
    const sessionDuration = rememberMe 
      ? 30 * 24 * 60 * 60 * 1000  // 30 days
      : 24 * 60 * 60 * 1000;       // 24 hours
    
    const session: UserSession = {
      ...user,
      loginTime: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + sessionDuration
    };
    
    await this.storage.set(this.SESSION_KEY, session, {
      ttl: sessionDuration,
      sliding: true,
      encrypt: true,
      tags: ['auth', 'user', `user:${user.userId}`]
    });
    
    // Store refresh token separately
    if (rememberMe) {
      await this.storeRefreshToken(user.userId);
    }
  }
  
  async getSession(): Promise<UserSession | null> {
    const session = await this.storage.get<UserSession>(this.SESSION_KEY);
    
    if (!session) {
      // Try to restore from refresh token
      return this.restoreFromRefreshToken();
    }
    
    // Update last activity
    if (session) {
      session.lastActivity = Date.now();
      await this.storage.set(this.SESSION_KEY, session, {
        sliding: true
      });
    }
    
    return session;
  }
  
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null && session.expiresAt > Date.now();
  }
  
  async hasPermission(permission: string): Promise<boolean> {
    const session = await this.getSession();
    return session?.permissions.includes(permission) || false;
  }
  
  async extendSession(): Promise<void> {
    const session = await this.getSession();
    if (session) {
      session.expiresAt = Date.now() + (60 * 60 * 1000); // Extend by 1 hour
      await this.storage.set(this.SESSION_KEY, session, {
        ttl: 60 * 60 * 1000,
        sliding: true
      });
    }
  }
  
  async logout(): Promise<void> {
    await Promise.all([
      this.storage.remove(this.SESSION_KEY),
      this.storage.remove(this.REFRESH_TOKEN_KEY),
      this.storage.clear({ tags: ['auth'] })
    ]);
  }
  
  private async storeRefreshToken(userId: string): Promise<void> {
    const token = this.generateSecureToken();
    await this.storage.set(this.REFRESH_TOKEN_KEY, {
      token,
      userId,
      createdAt: Date.now()
    }, {
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
      encrypt: true
    });
  }
  
  private async restoreFromRefreshToken(): Promise<UserSession | null> {
    const refreshData = await this.storage.get<{
      token: string;
      userId: string;
    }>(this.REFRESH_TOKEN_KEY);
    
    if (!refreshData) return null;
    
    // Validate refresh token with server
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: refreshData.token })
      });
      
      if (response.ok) {
        const userData = await response.json();
        await this.createSession(userData, true);
        return userData;
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
    }
    
    return null;
  }
  
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}
```

### 2. Multi-Tab Session Synchronization

```typescript
class SyncedSessionManager {
  private storage: Strata;
  private syncChannel: BroadcastChannel;
  private localState: Map<string, any> = new Map();
  
  constructor() {
    this.storage = new Strata({
      defaultStorage: 'localStorage',
      sync: {
        enabled: true,
        broadcastChannel: 'session-sync'
      }
    });
    
    this.syncChannel = new BroadcastChannel('session-sync');
    this.setupSyncListeners();
  }
  
  private setupSyncListeners(): void {
    // Listen for changes from other tabs
    this.syncChannel.addEventListener('message', async (event) => {
      const { type, key, value } = event.data;
      
      switch (type) {
        case 'session-update':
          this.localState.set(key, value);
          this.onSessionUpdate(key, value);
          break;
          
        case 'session-logout':
          this.localState.clear();
          this.onSessionLogout();
          break;
          
        case 'session-refresh':
          await this.refreshLocalSession();
          break;
      }
    });
    
    // Listen for storage changes
    this.storage.subscribe('session:*', (change) => {
      if (change.source === 'remote') {
        this.localState.set(change.key, change.newValue);
        this.onSessionUpdate(change.key, change.newValue);
      }
    });
  }
  
  async updateSession(key: string, value: any): Promise<void> {
    // Update storage
    await this.storage.set(`session:${key}`, value);
    
    // Update local state
    this.localState.set(key, value);
    
    // Broadcast to other tabs
    this.syncChannel.postMessage({
      type: 'session-update',
      key,
      value
    });
  }
  
  async getSessionValue(key: string): Promise<any> {
    // Try local state first
    if (this.localState.has(key)) {
      return this.localState.get(key);
    }
    
    // Fall back to storage
    const value = await this.storage.get(`session:${key}`);
    if (value) {
      this.localState.set(key, value);
    }
    
    return value;
  }
  
  async logout(): Promise<void> {
    // Clear storage
    await this.storage.clear({ prefix: 'session:' });
    
    // Clear local state
    this.localState.clear();
    
    // Notify other tabs
    this.syncChannel.postMessage({ type: 'session-logout' });
  }
  
  private async refreshLocalSession(): Promise<void> {
    const keys = await this.storage.keys('session:*');
    for (const key of keys) {
      const value = await this.storage.get(key);
      this.localState.set(key.replace('session:', ''), value);
    }
  }
  
  private onSessionUpdate(key: string, value: any): void {
    // Trigger UI updates
    window.dispatchEvent(new CustomEvent('session-changed', {
      detail: { key, value }
    }));
  }
  
  private onSessionLogout(): void {
    // Redirect to login
    window.location.href = '/login';
  }
}
```

### 3. Server-Synchronized Sessions

```typescript
class ServerSyncedSession {
  private storage: Strata;
  private syncInterval: number = 60000; // 1 minute
  private syncTimer?: NodeJS.Timer;
  
  constructor() {
    this.storage = new Strata({
      defaultStorage: 'indexedDB',
      encryption: { enabled: true }
    });
    
    this.startSync();
  }
  
  private startSync(): void {
    this.syncTimer = setInterval(() => {
      this.syncWithServer();
    }, this.syncInterval);
    
    // Sync immediately
    this.syncWithServer();
  }
  
  private async syncWithServer(): Promise<void> {
    try {
      // Get local session
      const localSession = await this.storage.get('session');
      if (!localSession) return;
      
      // Sync with server
      const response = await fetch('/api/session/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': localSession.id
        },
        body: JSON.stringify({
          lastSync: localSession.lastSync || 0,
          data: localSession.data
        })
      });
      
      if (response.ok) {
        const serverSession = await response.json();
        
        // Merge server changes
        const merged = this.mergeSessionData(localSession, serverSession);
        
        await this.storage.set('session', {
          ...merged,
          lastSync: Date.now()
        });
      } else if (response.status === 401) {
        // Session expired on server
        await this.clearSession();
      }
    } catch (error) {
      console.error('Session sync failed:', error);
      // Continue with local session
    }
  }
  
  private mergeSessionData(local: any, server: any): any {
    // Implement conflict resolution
    // Server wins for auth data, local wins for UI state
    return {
      ...local,
      auth: server.auth,
      user: server.user,
      permissions: server.permissions,
      ui: local.ui,
      preferences: local.preferences,
      serverData: server.data,
      localData: local.data
    };
  }
  
  async updateSessionData(path: string, value: any): Promise<void> {
    const session = await this.storage.get('session') || {};
    
    // Update nested path
    const parts = path.split('.');
    let current = session;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
    
    await this.storage.set('session', session);
    
    // Trigger immediate sync for important updates
    if (path.startsWith('auth') || path.startsWith('user')) {
      this.syncWithServer();
    }
  }
  
  async clearSession(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    await this.storage.remove('session');
    
    // Notify server
    try {
      await fetch('/api/session/logout', { method: 'POST' });
    } catch (error) {
      console.error('Failed to notify server of logout:', error);
    }
  }
}
```

### 4. Guest to User Session Migration

```typescript
class SessionMigration {
  private storage: Strata;
  
  async migrateGuestToUser(userId: string): Promise<void> {
    // Get all guest session data
    const guestKeys = await this.storage.keys('guest:*');
    const guestData: Record<string, any> = {};
    
    for (const key of guestKeys) {
      const value = await this.storage.get(key);
      const newKey = key.replace('guest:', `user:${userId}:`);
      guestData[newKey] = value;
    }
    
    // Store under user namespace
    await Promise.all(
      Object.entries(guestData).map(([key, value]) =>
        this.storage.set(key, value)
      )
    );
    
    // Merge cart items
    await this.mergeCartItems(userId);
    
    // Merge preferences
    await this.mergePreferences(userId);
    
    // Clear guest data
    await this.storage.clear({ prefix: 'guest:' });
  }
  
  private async mergeCartItems(userId: string): Promise<void> {
    const guestCart = await this.storage.get('guest:cart') || [];
    const userCart = await this.storage.get(`user:${userId}:cart`) || [];
    
    // Merge carts, avoiding duplicates
    const merged = [...userCart];
    
    for (const item of guestCart) {
      const existing = merged.find(i => i.productId === item.productId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        merged.push(item);
      }
    }
    
    await this.storage.set(`user:${userId}:cart`, merged);
  }
  
  private async mergePreferences(userId: string): Promise<void> {
    const guestPrefs = await this.storage.get('guest:preferences') || {};
    const userPrefs = await this.storage.get(`user:${userId}:preferences`) || {};
    
    // User preferences take precedence
    const merged = {
      ...guestPrefs,
      ...userPrefs
    };
    
    await this.storage.set(`user:${userId}:preferences`, merged);
  }
}
```

## Session Security

### 1. Secure Token Storage

```typescript
class SecureTokenManager {
  private storage: Strata;
  
  constructor() {
    this.storage = new Strata({
      defaultStorage: 'secure', // Keychain on iOS, Keystore on Android
      fallbackStorage: 'memory', // Never persist to disk
      encryption: {
        enabled: true,
        algorithm: 'AES-GCM',
        keySize: 256
      }
    });
  }
  
  async storeTokens(tokens: {
    access: string;
    refresh: string;
    idToken?: string;
  }): Promise<void> {
    // Store tokens with different TTLs
    await Promise.all([
      this.storage.set('access-token', tokens.access, {
        ttl: 15 * 60 * 1000, // 15 minutes
        encrypt: true
      }),
      this.storage.set('refresh-token', tokens.refresh, {
        ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
        encrypt: true
      }),
      tokens.idToken && this.storage.set('id-token', tokens.idToken, {
        ttl: 60 * 60 * 1000, // 1 hour
        encrypt: true
      })
    ]);
  }
  
  async getAccessToken(): Promise<string | null> {
    let token = await this.storage.get<string>('access-token');
    
    if (!token) {
      // Try to refresh
      token = await this.refreshAccessToken();
    }
    
    return token;
  }
  
  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = await this.storage.get<string>('refresh-token');
    if (!refreshToken) return null;
    
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      
      if (response.ok) {
        const { accessToken } = await response.json();
        await this.storage.set('access-token', accessToken, {
          ttl: 15 * 60 * 1000,
          encrypt: true
        });
        return accessToken;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    
    return null;
  }
  
  async clearTokens(): Promise<void> {
    await Promise.all([
      this.storage.remove('access-token'),
      this.storage.remove('refresh-token'),
      this.storage.remove('id-token')
    ]);
  }
}
```

### 2. Session Fingerprinting

```typescript
class SessionFingerprint {
  private storage: Strata;
  
  async createFingerprint(): Promise<string> {
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      colorDepth: screen.colorDepth,
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      timestamp: Date.now()
    };
    
    const hash = await this.hashFingerprint(fingerprint);
    
    await this.storage.set('session-fingerprint', {
      hash,
      data: fingerprint
    }, {
      encrypt: true,
      ttl: 24 * 60 * 60 * 1000
    });
    
    return hash;
  }
  
  async validateFingerprint(): Promise<boolean> {
    const stored = await this.storage.get<{
      hash: string;
      data: any;
    }>('session-fingerprint');
    
    if (!stored) return false;
    
    const current = await this.createFingerprint();
    
    // Allow some flexibility for changing conditions
    return this.isFingerprintSimilar(stored.hash, current);
  }
  
  private async hashFingerprint(data: any): Promise<string> {
    const json = JSON.stringify(data);
    const encoder = new TextEncoder();
    const buffer = encoder.encode(json);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  private isFingerprintSimilar(stored: string, current: string): boolean {
    // Implement similarity check (e.g., allow minor changes)
    // This is simplified; in production, use more sophisticated comparison
    return stored === current;
  }
}
```

## Session Analytics

```typescript
class SessionAnalytics {
  private storage: Strata;
  
  async trackSession(): Promise<void> {
    const sessionId = this.generateSessionId();
    
    const session = {
      id: sessionId,
      startTime: Date.now(),
      pageViews: [],
      events: [],
      device: this.getDeviceInfo(),
      referrer: document.referrer,
      entryPage: window.location.pathname
    };
    
    await this.storage.set('analytics-session', session, {
      ttl: 30 * 60 * 1000, // 30 minutes
      sliding: true
    });
    
    this.setupTracking();
  }
  
  private setupTracking(): void {
    // Track page views
    window.addEventListener('popstate', () => {
      this.trackPageView();
    });
    
    // Track events
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.track) {
        this.trackEvent(target.dataset.track, target.dataset);
      }
    });
    
    // Track session end
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });
  }
  
  private async trackPageView(): Promise<void> {
    const session = await this.storage.get<any>('analytics-session');
    if (!session) return;
    
    session.pageViews.push({
      path: window.location.pathname,
      timestamp: Date.now(),
      duration: 0
    });
    
    // Update duration of previous page
    if (session.pageViews.length > 1) {
      const prev = session.pageViews[session.pageViews.length - 2];
      prev.duration = Date.now() - prev.timestamp;
    }
    
    await this.storage.set('analytics-session', session, {
      sliding: true
    });
  }
  
  private async trackEvent(name: string, data: any): Promise<void> {
    const session = await this.storage.get<any>('analytics-session');
    if (!session) return;
    
    session.events.push({
      name,
      data,
      timestamp: Date.now()
    });
    
    await this.storage.set('analytics-session', session, {
      sliding: true
    });
  }
  
  private async endSession(): Promise<void> {
    const session = await this.storage.get<any>('analytics-session');
    if (!session) return;
    
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    
    // Send to analytics service
    await this.sendAnalytics(session);
    
    // Clear session
    await this.storage.remove('analytics-session');
  }
  
  private async sendAnalytics(session: any): Promise<void> {
    try {
      await fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });
    } catch (error) {
      // Store for later retry
      await this.storage.set(`analytics-queue:${session.id}`, session, {
        ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }
  }
  
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getDeviceInfo(): any {
    return {
      type: this.getDeviceType(),
      screen: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };
  }
  
  private getDeviceType(): string {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
}
```

## Best Practices

1. **Use appropriate storage types** for different session data
2. **Encrypt sensitive session data** always
3. **Implement proper session expiration** with TTL
4. **Use sliding expiration** for active sessions
5. **Synchronize sessions across tabs** for better UX
6. **Handle session migration** when users authenticate
7. **Implement session fingerprinting** for security
8. **Clean up expired sessions** regularly
9. **Monitor session analytics** for insights
10. **Test session behavior** across platforms

## Common Issues and Solutions

### Issue: Session Lost on Page Refresh
```typescript
// Use persistent storage
const storage = new Strata({
  defaultStorage: 'localStorage', // Survives refresh
  fallbackStorage: 'indexedDB'
});
```

### Issue: Session Not Syncing Across Tabs
```typescript
// Enable sync
const storage = new Strata({
  sync: {
    enabled: true,
    broadcastChannel: 'session-sync'
  }
});
```

### Issue: Session Security Concerns
```typescript
// Use encryption and secure storage
const storage = new Strata({
  defaultStorage: 'secure',
  encryption: {
    enabled: true,
    algorithm: 'AES-GCM'
  }
});
```

## Related Documentation

- [Security Guide](../features/encryption.md)
- [TTL Management](../../api/features/ttl.md)
- [Sync Features](../features/sync.md)
- [Platform Guide](../platforms/)