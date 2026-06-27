# Vue Framework Examples

Using Strata Storage with Vue 3 applications.

## Installation

```bash
yarn add strata-storage
```

`vue` is an optional peer dependency (`>= 3.5.26`).

## Provider-Free Usage (recommended, 2.5.0+)

No plugin install required. Create one instance with `defineStorage()` and bind the composables to it with `createStrataComposables()`, then use them in any component's `setup()`.

```typescript
// storage.ts
import { defineStorage } from 'strata-storage';
import { createStrataComposables } from 'strata-storage/vue';

export const storage = defineStorage({ defaultStorages: ['indexedDB', 'localStorage'] });
export const { useStorage, useStorageQuery, useStorageTTL, useStorageSize } =
  createStrataComposables(storage);
```

```vue
<script setup lang="ts">
import { useStorage } from './storage';

// value is a reactive Ref<T | null>
const { value: theme, update, loading } = useStorage<string>('theme', 'light');
</script>

<template>
  <button v-if="!loading" @click="update(theme === 'light' ? 'dark' : 'light')">
    Theme: {{ theme }}
  </button>
</template>
```

`useStorage(key, defaultValue?, options?)` returns `{ value, loading, error, refresh, update, remove }` — `value` is a reactive `Ref`, `update(next)` writes (or removes when `next` is `null`). The built-in composables (`useStorage`, `useStorageQuery`, `useStorageTTL`, `useStorageSize`) also accept an optional `Strata` instance as a trailing argument if you prefer not to pre-bind them.

You can also use the instance directly — it works immediately, no setup call:

```typescript
import { storage } from './storage';

await storage.set('lastSeen', Date.now());
```

## Plugin-Based Setup (classic)

The `StrataPlugin` still works for apps that prefer dependency injection. Install it once; the composables then resolve the instance from Vue's `provide`/`inject`.

```typescript
import { createApp } from 'vue';
import { StrataPlugin } from 'strata-storage/vue';
import App from './App.vue';

createApp(App)
  .use(StrataPlugin, { defaultStorages: ['indexedDB', 'localStorage'] })
  .mount('#app');
```

```vue
<script setup lang="ts">
import { useStorage } from 'strata-storage/vue';

const { value: username, update } = useStorage<string>('username', 'Guest');
</script>
```

## Composables

### Two-way binding with `useStorage`

`useStorage` returns `{ value, update, ... }` (not a bare ref). Wrap it in a `computed` getter/setter to drive `v-model`.

```vue
<template>
  <div>
    <input v-model="username" />
    <p>Stored: {{ value }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStorage } from 'strata-storage/vue';

const { value, update } = useStorage<string>('username', 'Guest');

// Bridge the reactive value + update() into a v-model-friendly proxy
const username = computed({
  get: () => value.value ?? '',
  set: (next: string) => update(next),
});
</script>
```

### Reactive object state with `useStorage`

Store a whole settings object under one key and mirror it into a local `reactive` for `v-model`.

```vue
<template>
  <div v-if="!loading">
    <h3>Settings</h3>
    <label>
      <input type="checkbox" v-model="settings.darkMode" />
      Dark Mode
    </label>
    <label>
      <input type="checkbox" v-model="settings.notifications" />
      Notifications
    </label>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import { useStorage } from 'strata-storage/vue';

interface Settings {
  darkMode: boolean;
  notifications: boolean;
}

const { value, update, loading } = useStorage<Settings>('app-settings', {
  darkMode: false,
  notifications: true,
});

// Local reactive copy for v-model; persisted back on every change
const settings = reactive<Settings>({ darkMode: false, notifications: true });
watch(value, (v) => v && Object.assign(settings, v), { immediate: true });
watch(settings, (next) => update({ ...next }), { deep: true });
</script>
```

## Plugin Installation

```javascript
// main.js
import { createApp } from 'vue';
import { StrataPlugin } from 'strata-storage/vue';

const app = createApp(App);

app.use(StrataPlugin, {
  namespace: 'my-app',
  defaultStorages: ['indexedDB', 'localStorage']
});

app.mount('#app');
```

## Advanced Examples

### Reactive Queries

```vue
<template>
  <div>
    <select v-model="filter">
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
    
    <ul>
      <li v-for="user in users" :key="user.key">
        {{ user.value.name }} - {{ user.value.status }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStorageQuery } from 'strata-storage/vue';

const filter = ref('active');
// query() matches the stored value's own fields with bare names (wrapper fields
// like `key`/`tags` are not queryable). Give user records a `status` field.
const users = useStorageQuery(
  computed(() => ({
    status: filter.value
  }))
);
</script>
```

### Form Persistence

Persist a draft with the built-in `useStorage` composable: mirror the stored object into a local `reactive` and write it back on every edit. (For a reusable wrapper, see the `useFormPersistence` composable in the [Vue Composables example](../vue-composables.md).)

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="form.name" placeholder="Name" />
    <input v-model="form.email" type="email" placeholder="Email" />
    <textarea v-model="form.message" placeholder="Message"></textarea>
    <button type="submit">Submit</button>
    <p v-if="loading">Saving draft…</p>
  </form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import { useStorage } from 'strata-storage/vue';

interface ContactForm {
  name: string;
  email: string;
  message: string;
}

const { value, update, remove, loading } = useStorage<ContactForm>('contact-form', {
  name: '',
  email: '',
  message: '',
});

// Local reactive mirror, auto-saved on every edit
const form = reactive<ContactForm>({ name: '', email: '', message: '' });
watch(value, (v) => v && Object.assign(form, v), { immediate: true });
watch(form, (next) => update({ ...next }), { deep: true });

const handleSubmit = async () => {
  await submitToAPI({ ...form });
  await remove(); // clear the saved draft
};
</script>
```

## See Also

- [Vue Composables Example](../vue-composables.md)
- [React Examples](./react.md)
- [Angular Examples](./angular.md)