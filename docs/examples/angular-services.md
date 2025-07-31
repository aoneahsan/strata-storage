# Angular Services Examples

Custom Angular services for Strata Storage integration.

## Core Storage Service

```typescript
import { Injectable } from '@angular/core';
import { Strata, StrataConfig } from 'strata-storage';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storage: Strata;
  private cache = new Map<string, BehaviorSubject<any>>();
  
  constructor() {
    this.storage = new Strata({
      namespace: 'angular-app',
      defaultStorages: ['indexedDB', 'localStorage']
    });
  }
  
  get<T>(key: string): Observable<T | null> {
    return from(this.storage.get<T>(key));
  }
  
  set<T>(key: string, value: T, options?: any): Observable<void> {
    // Update cache if exists
    if (this.cache.has(key)) {
      this.cache.get(key)!.next(value);
    }
    return from(this.storage.set(key, value, options));
  }
  
  remove(key: string): Observable<void> {
    // Clear cache
    if (this.cache.has(key)) {
      this.cache.get(key)!.next(null);
      this.cache.delete(key);
    }
    return from(this.storage.remove(key));
  }
  
  // Reactive value with cache
  watch<T>(key: string, defaultValue: T): Observable<T> {
    if (!this.cache.has(key)) {
      const subject = new BehaviorSubject<T>(defaultValue);
      this.cache.set(key, subject);
      
      // Load initial value
      this.storage.get<T>(key).then(value => {
        if (value !== null) {
          subject.next(value);
        }
      });
      
      // Subscribe to changes
      this.storage.subscribe((change) => {
        if (change.key === key) {
          subject.next(change.newValue);
        }
      });
    }
    
    return this.cache.get(key)!.asObservable();
  }
}
```

## Auth Storage Service

```typescript
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { StorageService } from './storage.service';

interface AuthData {
  token: string;
  user: User;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthStorageService {
  private authSubject = new BehaviorSubject<AuthData | null>(null);
  readonly auth$ = this.authSubject.asObservable();
  readonly isAuthenticated$ = this.auth$.pipe(
    map(auth => !!auth && !this.isExpired(auth))
  );
  
  constructor(
    private storage: StorageService,
    private router: Router
  ) {
    this.loadAuth();
  }
  
  private async loadAuth() {
    const auth = await this.storage.get<AuthData>('auth').toPromise();
    if (auth && !this.isExpired(auth)) {
      this.authSubject.next(auth);
    }
  }
  
  async login(token: string, user: User) {
    const authData: AuthData = {
      token,
      user,
      expiresAt: Date.now() + 3600000 // 1 hour
    };
    
    await this.storage.set('auth', authData, {
      encrypt: true
    }).toPromise();
    
    this.authSubject.next(authData);
    await this.router.navigate(['/dashboard']);
  }
  
  async logout() {
    await this.storage.remove('auth').toPromise();
    this.authSubject.next(null);
    await this.router.navigate(['/login']);
  }
  
  private isExpired(auth: AuthData): boolean {
    return Date.now() > auth.expiresAt;
  }
}
```

## Cache Service

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  constructor(
    private storage: StorageService,
    private http: HttpClient
  ) {}
  
  get<T>(
    key: string,
    fetcher: () => Observable<T>,
    options?: {
      ttl?: number;
      forceRefresh?: boolean;
    }
  ): Observable<T> {
    const ttl = options?.ttl || 300000; // 5 minutes default
    
    if (options?.forceRefresh) {
      return this.fetchAndCache(key, fetcher, ttl);
    }
    
    return this.storage.get<T>(key).pipe(
      switchMap(cached => {
        if (cached !== null) {
          return of(cached);
        }
        return this.fetchAndCache(key, fetcher, ttl);
      }),
      catchError(() => this.fetchAndCache(key, fetcher, ttl))
    );
  }
  
  private fetchAndCache<T>(
    key: string,
    fetcher: () => Observable<T>,
    ttl: number
  ): Observable<T> {
    return fetcher().pipe(
      tap(data => {
        this.storage.set(key, data, { ttl }).subscribe();
      })
    );
  }
  
  invalidate(pattern: string | RegExp) {
    this.storage.query({
      key: { $matches: pattern }
    }).then(items => {
      items.forEach(item => {
        this.storage.remove(item.key);
      });
    });
  }
}
```

## Settings Service

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';

interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: boolean;
  dataUsage: 'wifi' | 'always' | 'never';
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private settings$ = new BehaviorSubject<AppSettings>({
    theme: 'auto',
    language: 'en',
    notifications: true,
    dataUsage: 'wifi'
  });
  
  readonly theme$ = this.settings$.pipe(
    map(s => s.theme),
    distinctUntilChanged()
  );
  
  constructor(private storage: StorageService) {
    this.loadSettings();
  }
  
  private async loadSettings() {
    const stored = await this.storage.get<AppSettings>('settings').toPromise();
    if (stored) {
      this.settings$.next({ ...this.settings$.value, ...stored });
    }
  }
  
  async updateSettings(updates: Partial<AppSettings>) {
    const newSettings = { ...this.settings$.value, ...updates };
    this.settings$.next(newSettings);
    
    await this.storage.set('settings', newSettings).toPromise();
    
    // Apply settings
    if (updates.theme) {
      this.applyTheme(updates.theme);
    }
    if (updates.language) {
      this.applyLanguage(updates.language);
    }
  }
  
  private applyTheme(theme: string) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  
  private applyLanguage(language: string) {
    // Language change logic
  }
}
```

## Form Draft Service

```typescript
import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { debounceTime, filter } from 'rxjs/operators';
import { StorageService } from './storage.service';

@Injectable()
export class FormDraftService {
  private subscriptions = new Map<string, any>();
  
  constructor(private storage: StorageService) {}
  
  autosave(key: string, form: FormGroup, debounce = 1000) {
    // Load existing draft
    this.storage.get(key).subscribe(draft => {
      if (draft && !form.dirty) {
        form.patchValue(draft);
      }
    });
    
    // Save on changes
    const sub = form.valueChanges.pipe(
      debounceTime(debounce),
      filter(() => form.valid)
    ).subscribe(value => {
      this.storage.set(key, {
        ...value,
        savedAt: Date.now()
      }).subscribe();
    });
    
    this.subscriptions.set(key, sub);
  }
  
  clear(key: string) {
    this.storage.remove(key).subscribe();
    const sub = this.subscriptions.get(key);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(key);
    }
  }
  
  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
```

## Sync Service

```typescript
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { StorageService } from './storage.service';

interface SyncEvent {
  type: 'added' | 'updated' | 'removed';
  key: string;
  value?: any;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private syncEvents$ = new Subject<SyncEvent>();
  readonly events$ = this.syncEvents$.asObservable();
  
  constructor(private storage: StorageService) {
    this.initSync();
  }
  
  private initSync() {
    // Enable cross-tab sync
    this.storage.storage.subscribe((change) => {
      if (change.source === 'remote') {
        this.syncEvents$.next({
          type: change.newValue === null ? 'removed' : 
                change.oldValue === null ? 'added' : 'updated',
          key: change.key,
          value: change.newValue,
          timestamp: Date.now()
        });
      }
    });
  }
  
  broadcast(key: string, data: any) {
    // Broadcast to all tabs
    this.storage.set(`broadcast:${key}`, {
      data,
      timestamp: Date.now()
    }, {
      ttl: 5000 // Auto-cleanup after 5 seconds
    }).subscribe();
  }
  
  onBroadcast(key: string) {
    return this.events$.pipe(
      filter(event => event.key === `broadcast:${key}`),
      map(event => event.value?.data)
    );
  }
}
```

## Query Service

```typescript
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class QueryService {
  constructor(private storage: StorageService) {}
  
  find<T>(filter: any, options?: QueryOptions): Observable<T[]> {
    return from(this.storage.storage.query(filter, options)).pipe(
      map(results => results.map(r => r.value))
    );
  }
  
  findOne<T>(filter: any): Observable<T | null> {
    return this.find<T>(filter, { limit: 1 }).pipe(
      map(results => results[0] || null)
    );
  }
  
  count(filter: any): Observable<number> {
    return from(this.storage.storage.query(filter)).pipe(
      map(results => results.length)
    );
  }
  
  aggregate<T>(filter: any, aggregation: {
    groupBy?: string;
    sum?: string;
    avg?: string;
    count?: boolean;
  }): Observable<any> {
    return this.find<T>(filter).pipe(
      map(results => {
        if (aggregation.groupBy) {
          return this.groupBy(results, aggregation);
        }
        return this.aggregateAll(results, aggregation);
      })
    );
  }
  
  private groupBy(results: any[], aggregation: any) {
    const groups = {};
    results.forEach(item => {
      const key = item[aggregation.groupBy];
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    
    return Object.entries(groups).map(([key, items]: [string, any[]]) => ({
      [aggregation.groupBy]: key,
      count: items.length,
      sum: aggregation.sum ? items.reduce((acc, i) => acc + i[aggregation.sum], 0) : undefined,
      avg: aggregation.avg ? items.reduce((acc, i) => acc + i[aggregation.avg], 0) / items.length : undefined
    }));
  }
}
```

## Storage Module

```typescript
import { NgModule, ModuleWithProviders } from '@angular/core';
import { StorageService } from './storage.service';
import { StrataConfig } from 'strata-storage';

@NgModule()
export class StorageModule {
  static forRoot(config?: StrataConfig): ModuleWithProviders<StorageModule> {
    return {
      ngModule: StorageModule,
      providers: [
        {
          provide: 'STORAGE_CONFIG',
          useValue: config
        },
        StorageService
      ]
    };
  }
}

// app.module.ts
import { StorageModule } from './storage/storage.module';

@NgModule({
  imports: [
    StorageModule.forRoot({
      namespace: 'my-app',
      sync: { enabled: true }
    })
  ]
})
export class AppModule {}
```

## See Also

- [Angular Integration](./frameworks/angular.md)
- [React Hooks](./react-hooks.md)
- [Vue Composables](./vue-composables.md)