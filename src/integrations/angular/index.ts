/**
 * Angular integration for Strata Storage
 */

import {
  Injectable,
  InjectionToken,
  Inject,
  Optional,
  OnDestroy,
  NgModule,
  ModuleWithProviders,
} from '@angular/core';
import {
  Observable,
  BehaviorSubject,
  Subject,
  from,
  interval,
  combineLatest,
  throwError,
} from 'rxjs';
import {
  map,
  switchMap,
  catchError,
  takeUntil,
  distinctUntilChanged,
  shareReplay,
  startWith,
  filter,
} from 'rxjs/operators';
import { Strata } from '@/core/Strata';
import type { StrataConfig, StorageOptions, StorageChange } from '@/types';

// Configuration token
export const STRATA_CONFIG = new InjectionToken<StrataConfig>('strata.config');

/**
 * Strata Service - Main service for storage operations
 */
@Injectable({
  providedIn: 'root',
})
export class StrataService implements OnDestroy {
  private strata: Strata;
  private destroy$ = new Subject<void>();
  private initialized$ = new BehaviorSubject<boolean>(false);
  private changes$ = new Subject<StorageChange>();

  constructor(@Optional() @Inject(STRATA_CONFIG) config?: StrataConfig) {
    this.strata = new Strata(config);
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.strata.initialize();
      this.initialized$.next(true);

      // Subscribe to all storage changes
      this.strata.subscribe((change) => {
        this.changes$.next(change);
      });
    } catch (error) {
      console.error('Failed to initialize Strata:', error);
      this.initialized$.next(false);
    }
  }

  /**
   * Wait for initialization
   */
  get ready$(): Observable<boolean> {
    return this.initialized$.pipe(
      filter((initialized) => initialized),
      startWith(false),
    );
  }

  /**
   * Get storage changes observable
   */
  get changes(): Observable<StorageChange> {
    return this.changes$.asObservable();
  }

  /**
   * Get a value from storage
   */
  get<T = unknown>(key: string, options?: StorageOptions): Observable<T | null> {
    return this.ready$.pipe(
      switchMap(() => from(this.strata.get<T>(key, options))),
      catchError((error) => {
        console.error(`Failed to get key ${key}:`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Set a value in storage
   */
  set<T = unknown>(key: string, value: T, options?: StorageOptions): Observable<void> {
    return this.ready$.pipe(
      switchMap(() => from(this.strata.set(key, value, options))),
      catchError((error) => {
        console.error(`Failed to set key ${key}:`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Remove a value from storage
   */
  remove(key: string, options?: StorageOptions): Observable<void> {
    return this.ready$.pipe(
      switchMap(() => from(this.strata.remove(key, options))),
      catchError((error) => {
        console.error(`Failed to remove key ${key}:`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Check if key exists
   */
  has(key: string, options?: StorageOptions): Observable<boolean> {
    return this.ready$.pipe(
      switchMap(() => from(this.strata.has(key, options))),
      catchError(() => from([false])),
    );
  }

  /**
   * Clear storage
   */
  clear(options?: StorageOptions): Observable<void> {
    return this.ready$.pipe(
      switchMap(() => from(this.strata.clear(options))),
      catchError((error) => {
        console.error('Failed to clear storage:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get all keys
   */
  keys(pattern?: string | RegExp, options?: StorageOptions): Observable<string[]> {
    return this.ready$.pipe(
      switchMap(() => from(this.strata.keys(pattern, options))),
      catchError(() => from([[]])),
    );
  }

  /**
   * Query storage
   */
  query<T = unknown>(
    condition: any,
    options?: StorageOptions,
  ): Observable<Array<{ key: string; value: T }>> {
    return this.ready$.pipe(
      switchMap(() => from(this.strata.query<T>(condition, options))),
      catchError(() => from([[]])),
    );
  }

  /**
   * Get storage size
   */
  size(detailed?: boolean): Observable<{ total: number; count: number }> {
    return this.ready$.pipe(
      switchMap(() => from(this.strata.size(detailed))),
      catchError(() => from([{ total: 0, count: 0 }])),
    );
  }

  /**
   * Watch a specific key
   */
  watch<T = unknown>(key: string, options?: StorageOptions): Observable<T | null> {
    return combineLatest([
      this.get<T>(key, options),
      this.changes.pipe(
        filter((change) => change.key === key),
        map((change) => change.newValue as T),
      ),
    ]).pipe(
      map(([initial]) => initial),
      distinctUntilChanged(),
      shareReplay(1),
      takeUntil(this.destroy$),
    );
  }

  /**
   * Get TTL for a key
   */
  getTTL(key: string, options?: StorageOptions): Observable<number | null> {
    return this.ready$.pipe(
      switchMap(() => from(this.strata.getTTL(key, options))),
      catchError(() => from([null])),
    );
  }

  /**
   * Extend TTL
   */
  extendTTL(key: string, extension: number, options?: StorageOptions): Observable<void> {
    return this.ready$.pipe(
      switchMap(() => from(this.strata.extendTTL(key, extension, options))),
      catchError((error) => {
        console.error(`Failed to extend TTL for key ${key}:`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Make key persistent
   */
  persist(key: string, options?: StorageOptions): Observable<void> {
    return this.ready$.pipe(
      switchMap(() => from(this.strata.persist(key, options))),
      catchError((error) => {
        console.error(`Failed to persist key ${key}:`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Generate secure password
   */
  generatePassword(length?: number): string {
    return this.strata.generatePassword(length);
  }

  /**
   * Hash data
   */
  hash(data: string): Observable<string> {
    return from(this.strata.hash(data));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.strata.close();
  }
}

/**
 * Storage pipe for template usage
 */
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'storage',
  pure: false,
})
export class StoragePipe implements PipeTransform {
  private value: any = null;
  private key: string | null = null;
  private subscription: any;

  constructor(private strata: StrataService) {}

  transform(key: string, defaultValue?: any): any {
    if (this.key !== key) {
      this.key = key;
      this.dispose();
      this.subscription = this.strata
        .watch(key)
        .subscribe((value) => (this.value = value ?? defaultValue));
    }
    return this.value;
  }

  ngOnDestroy(): void {
    this.dispose();
  }

  private dispose(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}

/**
 * TTL pipe for displaying time to live
 */
@Pipe({
  name: 'ttl',
  pure: false,
})
export class TTLPipe implements PipeTransform {
  private ttl: string | null = null;
  private key: string | null = null;
  private subscription: any;

  constructor(private strata: StrataService) {}

  transform(key: string): string | null {
    if (this.key !== key) {
      this.key = key;
      this.dispose();

      // Update TTL every second
      this.subscription = interval(1000)
        .pipe(
          startWith(0),
          switchMap(() => this.strata.getTTL(key)),
        )
        .subscribe((milliseconds) => {
          if (milliseconds === null || milliseconds <= 0) {
            this.ttl = null;
          } else {
            this.ttl = this.formatTTL(milliseconds);
          }
        });
    }
    return this.ttl;
  }

  ngOnDestroy(): void {
    this.dispose();
  }

  private dispose(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  private formatTTL(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

/**
 * Storage directive for form inputs
 */
import { Directive, Input, HostListener, OnInit, OnDestroy } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[strataStorage]',
})
export class StorageDirective implements OnInit, OnDestroy {
  @Input('strataStorage') key!: string;
  @Input() strataOptions?: StorageOptions;
  @Input() strataDebounce = 500;

  private subscription: any;
  private timeout: any;

  constructor(
    private control: NgControl,
    private strata: StrataService,
  ) {}

  ngOnInit(): void {
    // Load initial value
    this.subscription = this.strata.get(this.key, this.strataOptions).subscribe((value) => {
      if (value !== null && this.control.control) {
        this.control.control.setValue(value, { emitEvent: false });
      }
    });
  }

  @HostListener('input', ['$event.target.value'])
  @HostListener('change', ['$event.target.value'])
  onValueChange(value: any): void {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.strata.set(this.key, value, this.strataOptions).subscribe();
    }, this.strataDebounce);
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    clearTimeout(this.timeout);
  }
}

/**
 * Strata Module
 */
@NgModule({
  declarations: [StoragePipe, TTLPipe, StorageDirective],
  exports: [StoragePipe, TTLPipe, StorageDirective],
})
export class StrataModule {
  static forRoot(config?: StrataConfig): ModuleWithProviders<StrataModule> {
    return {
      ngModule: StrataModule,
      providers: [{ provide: STRATA_CONFIG, useValue: config }, StrataService],
    };
  }
}

// Re-export types
export type { Strata, StrataConfig, StorageOptions, StorageChange };
