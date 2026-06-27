# Angular Framework Examples

Using Strata Storage with Angular applications.

## Installation

```bash
yarn add strata-storage
```

`@angular/core` and `@angular/forms` are optional peer dependencies (`>= 21.0.6`).

## Provider-Free Setup (recommended, 2.5.0+)

For standalone Angular apps, `provideStrata()` registers `StrataService` for injection. Pass a pre-created instance (provider-free pattern) or a config object — both are supported. The instance is held in the `STRATA_INSTANCE` injection token.

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { defineStorage } from 'strata-storage';
import { provideStrata } from 'strata-storage/angular';
import { AppComponent } from './app/app.component';

const storage = defineStorage({ defaultStorages: ['indexedDB', 'localStorage'] });

bootstrapApplication(AppComponent, {
  providers: [
    provideStrata(storage),
    // or, to let it build the instance from config:
    // provideStrata({ defaultStorages: ['indexedDB', 'localStorage'] }),
  ],
});
```

`StrataService` exposes the storage operations as RxJS Observables, gated on initialization:

```typescript
import { Component, OnInit } from '@angular/core';
import { StrataService } from 'strata-storage/angular';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  template: `<div *ngIf="user">{{ user.name }}</div>`,
})
export class UserProfileComponent implements OnInit {
  user: any;

  constructor(private storage: StrataService) {}

  ngOnInit() {
    // get() returns Observable<T | null>
    this.storage.get('current-user').subscribe((u) => (this.user = u));
  }

  updateUser(data: any) {
    this.storage.set('current-user', data).subscribe(() => (this.user = data));
  }
}
```

`watch(key)` emits the current value and re-emits on changes; `ready$` resolves once the instance is initialized.

## Module-Based Setup (classic)

The NgModule path still works. `StrataModule.forRoot(config)` builds an instance from config and provides `StrataService`, the `storage`/`ttl` pipes, and the `[strataStorage]` directive.

```typescript
import { NgModule } from '@angular/core';
import { StrataModule } from 'strata-storage/angular';

@NgModule({
  imports: [
    StrataModule.forRoot({
      defaultStorages: ['indexedDB', 'localStorage'],
    }),
  ],
})
export class AppModule {}
```

## Service Injection

```typescript
import { Component, OnInit } from '@angular/core';
import { StrataService } from 'strata-storage/angular';

@Component({
  selector: 'app-user-profile',
  template: `
    <div *ngIf="user">
      <h2>{{ user.name }}</h2>
      <p>{{ user.email }}</p>
    </div>
  `
})
export class UserProfileComponent implements OnInit {
  user: any;

  constructor(private storage: StrataService) {}

  async ngOnInit() {
    this.user = await this.storage.get('current-user');
  }

  async updateUser(data: any) {
    await this.storage.set('current-user', data);
    this.user = data;
  }
}
```

## Pipes

```typescript
@Component({
  template: `
    <div>
      <!-- Async storage pipe -->
      <p>Username: {{ 'username' | storage | async }}</p>
      
      <!-- TTL pipe -->
      <p>Expires in: {{ 'session' | ttl | async }}</p>
    </div>
  `
})
export class ExampleComponent {}
```

## Reactive Forms with Storage

```typescript
import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { StrataService } from 'strata-storage/angular';

@Component({
  selector: 'app-settings',
  template: `
    <form [formGroup]="settingsForm" (ngSubmit)="save()">
      <label>
        <input type="checkbox" formControlName="darkMode">
        Dark Mode
      </label>
      <label>
        <input type="checkbox" formControlName="notifications">
        Notifications
      </label>
      <button type="submit">Save</button>
    </form>
  `
})
export class SettingsComponent {
  settingsForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private storage: StrataService
  ) {
    this.settingsForm = this.fb.group({
      darkMode: [false],
      notifications: [true]
    });
    
    this.loadSettings();
  }

  async loadSettings() {
    const saved = await this.storage.get('settings');
    if (saved) {
      this.settingsForm.patchValue(saved);
    }
  }

  async save() {
    await this.storage.set('settings', this.settingsForm.value);
  }
}
```

## Observable Integration

```typescript
import { Component } from '@angular/core';
import { StrataService } from 'strata-storage/angular';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-todo-list',
  template: `
    <ul>
      <li *ngFor="let todo of todos$ | async">
        {{ todo.text }}
      </li>
    </ul>
  `
})
export class TodoListComponent {
  todos$: Observable<any[]>;

  constructor(private storage: StrataService) {
    this.todos$ = this.storage.watch('todos', []);
  }
}
```

## See Also

- [Angular Services Example](../angular-services.md)
- [React Examples](./react.md)
- [Vue Examples](./vue.md)