# User Authentication Example

Complete example of managing user authentication with Strata Storage.

## Basic Authentication Flow

```typescript
import { Strata } from 'strata-storage';

class AuthManager {
  private storage: Strata;
  
  constructor() {
    this.storage = new Strata({
      namespace: 'auth',
      encryption: {
        enabled: true,
        password: process.env.STORAGE_ENCRYPTION_KEY
      }
    });
  }
  
  async login(email: string, password: string) {
    try {
      // Call your API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) throw new Error('Login failed');
      
      const data = await response.json();
      
      // Store auth data
      await this.storage.set('auth_token', data.token, {
        encrypt: true,
        ttl: data.expiresIn * 1000 // Convert to milliseconds
      });
      
      await this.storage.set('user', data.user, {
        encrypt: true
      });
      
      await this.storage.set('refresh_token', data.refreshToken, {
        encrypt: true,
        storage: 'secure' // Use Keychain/Keystore on mobile
      });
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }
  
  async logout() {
    // Clear all auth data
    await this.storage.remove('auth_token');
    await this.storage.remove('user');
    await this.storage.remove('refresh_token');
    
    // Notify other tabs
    await this.storage.set('auth_event', { type: 'logout' }, {
      ttl: 1000 // Expires quickly
    });
  }
  
  async getToken() {
    return await this.storage.get('auth_token');
  }
  
  async getUser() {
    return await this.storage.get('user');
  }
  
  async isAuthenticated() {
    const token = await this.getToken();
    return token !== null;
  }
}
```

## Token Refresh

```typescript
class TokenManager extends AuthManager {
  private refreshPromise: Promise<string> | null = null;
  
  async getValidToken(): Promise<string | null> {
    const token = await this.getToken();
    
    if (!token) {
      // Try to refresh using refresh token
      return await this.refreshToken();
    }
    
    // Check if token is about to expire
    const ttl = await this.storage.getTTL('auth_token');
    if (ttl && ttl < 300000) { // Less than 5 minutes
      // Refresh proactively
      return await this.refreshToken();
    }
    
    return token;
  }
  
  async refreshToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return await this.refreshPromise;
    }
    
    this.refreshPromise = this.doRefresh();
    
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }
  
  private async doRefresh(): Promise<string | null> {
    const refreshToken = await this.storage.get('refresh_token');
    
    if (!refreshToken) {
      await this.logout();
      return null;
    }
    
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      
      if (!response.ok) throw new Error('Refresh failed');
      
      const data = await response.json();
      
      // Update tokens
      await this.storage.set('auth_token', data.token, {
        encrypt: true,
        ttl: data.expiresIn * 1000
      });
      
      if (data.refreshToken) {
        await this.storage.set('refresh_token', data.refreshToken, {
          encrypt: true,
          storage: 'secure'
        });
      }
      
      return data.token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.logout();
      return null;
    }
  }
}
```

## Multi-Tab Synchronization

```typescript
class SyncedAuthManager extends TokenManager {
  private listeners: Set<(authenticated: boolean) => void> = new Set();
  
  constructor() {
    super();
    this.setupSync();
  }
  
  private setupSync() {
    // Listen for auth changes from other tabs
    this.storage.subscribe((change) => {
      if (change.source === 'remote') {
        if (change.key === 'auth_token') {
          const authenticated = change.newValue !== null;
          this.notifyListeners(authenticated);
        } else if (change.key === 'auth_event') {
          if (change.newValue?.type === 'logout') {
            this.notifyListeners(false);
          }
        }
      }
    });
  }
  
  onAuthChange(callback: (authenticated: boolean) => void) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }
  
  private notifyListeners(authenticated: boolean) {
    this.listeners.forEach(callback => callback(authenticated));
  }
}
```

## Biometric Authentication

```typescript
class BiometricAuthManager extends SyncedAuthManager {
  async enableBiometric() {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');
    
    // Store credentials for biometric access
    await this.storage.set('biometric_enabled', true, {
      storage: 'secure'
    });
    
    // Store user ID for biometric login
    await this.storage.set('biometric_user_id', user.id, {
      storage: 'secure'
    });
  }
  
  async loginWithBiometric() {
    const enabled = await this.storage.get('biometric_enabled');
    if (!enabled) throw new Error('Biometric not enabled');
    
    // Verify biometric (platform specific)
    const verified = await this.verifyBiometric();
    if (!verified) throw new Error('Biometric verification failed');
    
    // Get stored user ID
    const userId = await this.storage.get('biometric_user_id');
    
    // Call API with user ID
    const response = await fetch('/api/auth/biometric', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    
    const data = await response.json();
    
    // Store new tokens
    await this.storage.set('auth_token', data.token, {
      encrypt: true,
      ttl: data.expiresIn * 1000
    });
    
    await this.storage.set('user', data.user, {
      encrypt: true
    });
    
    return data;
  }
  
  private async verifyBiometric(): Promise<boolean> {
    // Platform-specific implementation
    if ('TouchID' in window) {
      // iOS TouchID/FaceID
      return await window.TouchID.verify();
    } else if ('BiometricAuth' in window) {
      // Android
      return await window.BiometricAuth.verify();
    } else {
      // Web - use WebAuthn
      return await this.verifyWebAuthn();
    }
  }
}
```

## Session Management

```typescript
class SessionManager extends BiometricAuthManager {
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private activityTimer: NodeJS.Timeout | null = null;
  
  async startSession() {
    await this.storage.set('session_start', Date.now());
    await this.storage.set('last_activity', Date.now());
    
    this.startActivityMonitoring();
  }
  
  private startActivityMonitoring() {
    // Monitor user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const updateActivity = async () => {
      await this.storage.set('last_activity', Date.now(), {
        ttl: this.sessionTimeout,
        sliding: true
      });
      
      this.resetSessionTimer();
    };
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
  }
  
  private resetSessionTimer() {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }
    
    this.activityTimer = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.sessionTimeout);
  }
  
  private async handleSessionTimeout() {
    // Check if still authenticated
    const token = await this.getToken();
    if (!token) return;
    
    // Show warning or auto-logout
    const extend = confirm('Your session is about to expire. Extend?');
    
    if (extend) {
      await this.extendSession();
    } else {
      await this.logout();
    }
  }
  
  async extendSession() {
    const token = await this.refreshToken();
    if (token) {
      await this.storage.set('last_activity', Date.now());
      this.resetSessionTimer();
    }
  }
}
```

## React Integration

```typescript
// AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { SessionManager } from './SessionManager';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithBiometric: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth] = useState(() => new SessionManager());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check initial auth state
    checkAuth();
    
    // Listen for auth changes
    const unsubscribe = auth.onAuthChange(async (authenticated) => {
      if (authenticated) {
        const userData = await auth.getUser();
        setUser(userData);
      } else {
        setUser(null);
      }
    });
    
    return unsubscribe;
  }, []);
  
  const checkAuth = async () => {
    try {
      if (await auth.isAuthenticated()) {
        const userData = await auth.getUser();
        setUser(userData);
        await auth.startSession();
      }
    } finally {
      setLoading(false);
    }
  };
  
  const login = async (email: string, password: string) => {
    const data = await auth.login(email, password);
    setUser(data.user);
    await auth.startSession();
  };
  
  const logout = async () => {
    await auth.logout();
    setUser(null);
  };
  
  const loginWithBiometric = async () => {
    const data = await auth.loginWithBiometric();
    setUser(data.user);
    await auth.startSession();
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      loginWithBiometric
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

## API Interceptor

```typescript
// Setup axios interceptor
import axios from 'axios';

const authManager = new TokenManager();

// Request interceptor
axios.interceptors.request.use(async (config) => {
  const token = await authManager.getValidToken();
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Response interceptor
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const newToken = await authManager.refreshToken();
      
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);
```

## Security Best Practices

```typescript
class SecureAuthManager extends SessionManager {
  constructor() {
    super();
    
    // Additional security configuration
    this.storage = new Strata({
      namespace: 'auth',
      encryption: {
        enabled: true,
        password: this.generateSecurePassword(),
        iterations: 100000 // High PBKDF2 iterations
      }
    });
  }
  
  private generateSecurePassword(): string {
    // Combine multiple sources for encryption key
    const sources = [
      process.env.STORAGE_KEY,
      navigator.userAgent,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset()
    ];
    
    return sources.join('|');
  }
  
  async login(email: string, password: string) {
    // Add CSRF protection
    const csrf = await this.getCSRFToken();
    
    // Use secure headers
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify({ email, password })
    });
    
    // ... rest of login logic
  }
  
  private async getCSRFToken(): Promise<string> {
    let token = await this.storage.get('csrf_token');
    
    if (!token) {
      const response = await fetch('/api/auth/csrf');
      const data = await response.json();
      token = data.token;
      
      await this.storage.set('csrf_token', token, {
        ttl: 3600000 // 1 hour
      });
    }
    
    return token;
  }
}
```

## See Also

- [Encryption Guide](../guides/features/encryption.md)
- [Cross-Tab Sync Example](./cross-tab-sync.md)
- [React Hooks Example](./react-hooks.md)