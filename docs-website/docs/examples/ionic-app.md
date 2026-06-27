# Ionic App Examples

Complete examples of using Strata Storage in Ionic applications.

## Basic Ionic Setup

```typescript
import { Injectable } from '@angular/core';
import { Strata } from 'strata-storage';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storage: Strata;
  
  constructor(private platform: Platform) {
    this.initializeStorage();
  }
  
  async initializeStorage() {
    await this.platform.ready();
    
    this.storage = new Strata({
      namespace: 'ionic-app',
      defaultStorages: this.platform.is('capacitor')
        ? ['secure', 'sqlite', 'preferences']
        : ['indexedDB', 'localStorage']
    });
  }
}
```

## User Preferences

```typescript
import { Component, OnInit } from '@angular/core';
import { StorageService } from './storage.service';

@Component({
  selector: 'app-settings',
  template: `
    <ion-content>
      <ion-list>
        <ion-item>
          <ion-label>Dark Mode</ion-label>
          <ion-toggle [(ngModel)]="darkMode" (ionChange)="toggleDarkMode()"></ion-toggle>
        </ion-item>
        <ion-item>
          <ion-label>Language</ion-label>
          <ion-select [(ngModel)]="language" (ionChange)="changeLanguage()">
            <ion-select-option value="en">English</ion-select-option>
            <ion-select-option value="es">Spanish</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>
    </ion-content>
  `
})
export class SettingsPage implements OnInit {
  darkMode = false;
  language = 'en';
  
  constructor(private storage: StorageService) {}
  
  async ngOnInit() {
    const prefs = await this.storage.get('user-preferences');
    if (prefs) {
      this.darkMode = prefs.darkMode || false;
      this.language = prefs.language || 'en';
    }
  }
  
  async toggleDarkMode() {
    await this.savePreferences();
    document.body.classList.toggle('dark', this.darkMode);
  }
  
  async changeLanguage() {
    await this.savePreferences();
    // Apply language change
  }
  
  private async savePreferences() {
    await this.storage.set('user-preferences', {
      darkMode: this.darkMode,
      language: this.language,
      updatedAt: Date.now()
    });
  }
}
```

## Authentication Guard

```typescript
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private storage: StorageService,
    private router: Router
  ) {}
  
  async canActivate(): Promise<boolean> {
    const token = await this.storage.get('auth-token');
    
    if (token && !this.isTokenExpired(token)) {
      return true;
    }
    
    await this.router.navigate(['/login']);
    return false;
  }
  
  private isTokenExpired(token: any): boolean {
    if (!token.expiresAt) return false;
    return Date.now() > token.expiresAt;
  }
}
```

## Offline Data Service

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Network } from '@capacitor/network';
import { from, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  constructor(
    private http: HttpClient,
    private storage: StorageService
  ) {}
  
  getData(endpoint: string) {
    return from(Network.getStatus()).pipe(
      switchMap(status => {
        if (status.connected) {
          // Online: fetch fresh data
          return this.http.get(`/api/${endpoint}`).pipe(
            switchMap(data => {
              // Cache for offline use
              return from(this.storage.set(`cache:${endpoint}`, data, {
                ttl: 3600000 // 1 hour
              })).pipe(
                switchMap(() => of(data))
              );
            })
          );
        } else {
          // Offline: use cached data
          return from(this.storage.get(`cache:${endpoint}`));
        }
      }),
      catchError(error => {
        // Fallback to cache on error
        return from(this.storage.get(`cache:${endpoint}`));
      })
    );
  }
}
```

## Form Draft Saving

```typescript
@Component({
  selector: 'app-post-editor',
  template: `
    <ion-content>
      <form [formGroup]="postForm">
        <ion-item>
          <ion-label position="floating">Title</ion-label>
          <ion-input formControlName="title"></ion-input>
        </ion-item>
        <ion-item>
          <ion-label position="floating">Content</ion-label>
          <ion-textarea formControlName="content" rows="10"></ion-textarea>
        </ion-item>
      </form>
    </ion-content>
  `
})
export class PostEditorPage implements OnInit, OnDestroy {
  postForm: FormGroup;
  private draftKey = 'post-draft';
  private autoSaveSubscription: Subscription;
  
  constructor(
    private fb: FormBuilder,
    private storage: StorageService
  ) {
    this.postForm = this.fb.group({
      title: [''],
      content: ['']
    });
  }
  
  async ngOnInit() {
    // Load draft
    const draft = await this.storage.get(this.draftKey);
    if (draft) {
      this.postForm.patchValue(draft);
    }
    
    // Auto-save drafts
    this.autoSaveSubscription = this.postForm.valueChanges
      .pipe(debounceTime(1000))
      .subscribe(async (value) => {
        await this.storage.set(this.draftKey, {
          ...value,
          savedAt: Date.now()
        });
      });
  }
  
  ngOnDestroy() {
    this.autoSaveSubscription?.unsubscribe();
  }
  
  async publish() {
    // Publish post...
    // Clear draft after successful publish
    await this.storage.remove(this.draftKey);
  }
}
```

## Shopping Cart

```typescript
@Injectable({
  providedIn: 'root'
})
export class CartService {
  cart$ = new BehaviorSubject<CartItem[]>([]);
  
  constructor(private storage: StorageService) {
    this.loadCart();
  }
  
  private async loadCart() {
    const cart = await this.storage.get('shopping-cart') || [];
    this.cart$.next(cart);
  }
  
  async addItem(product: Product) {
    const cart = this.cart$.value;
    const existing = cart.find(item => item.id === product.id);
    
    if (existing) {
      existing.quantity++;
    } else {
      cart.push({
        ...product,
        quantity: 1
      });
    }
    
    await this.saveCart(cart);
  }
  
  async removeItem(productId: string) {
    const cart = this.cart$.value.filter(item => item.id !== productId);
    await this.saveCart(cart);
  }
  
  private async saveCart(cart: CartItem[]) {
    this.cart$.next(cart);
    await this.storage.set('shopping-cart', cart, {
      sync: true // Sync across tabs/devices
    });
  }
}
```

## Image Caching

```typescript
import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Pipe({ name: 'cachedImage' })
export class CachedImagePipe implements PipeTransform {
  constructor(
    private storage: StorageService,
    private sanitizer: DomSanitizer
  ) {}
  
  async transform(url: string): Promise<SafeUrl> {
    const cacheKey = `image:${url}`;
    
    // Check cache
    const cached = await this.storage.get(cacheKey);
    if (cached) {
      return this.sanitizer.bypassSecurityTrustUrl(cached);
    }
    
    // Fetch and cache
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const base64 = await this.blobToBase64(blob);
      
      // Cache with compression
      await this.storage.set(cacheKey, base64, {
        compress: true,
        ttl: 86400000 // 24 hours
      });
      
      return this.sanitizer.bypassSecurityTrustUrl(base64);
    } catch {
      return url; // Fallback to original URL
    }
  }
  
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }
}
```

## See Also

- [Angular Integration](./frameworks/angular.md)
- [Capacitor App Example](./capacitor-app.md)
- [Web App Example](./web-app.md)