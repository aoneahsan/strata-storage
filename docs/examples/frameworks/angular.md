# Angular Framework Examples

Using Strata Storage with Angular applications.

## Installation

```bash
npm install strata-storage
```

## Module Setup

```typescript
import { NgModule } from '@angular/core';
import { StrataModule } from 'strata-storage/angular';

@NgModule({
  imports: [
    StrataModule.forRoot({
      namespace: 'my-angular-app',
      defaultStorages: ['indexedDB', 'localStorage']
    })
  ]
})
export class AppModule { }
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

- [Angular Services API](../../api/integrations/angular.md)
- [React Examples](./react.md)
- [Vue Examples](./vue.md)