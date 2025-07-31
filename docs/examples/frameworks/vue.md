# Vue Framework Examples

Using Strata Storage with Vue 3 applications.

## Installation

```bash
npm install strata-storage
```

## Basic Setup

```vue
<script setup>
import { createStrata } from 'strata-storage/vue';

const storage = createStrata({
  namespace: 'my-vue-app'
});
</script>
```

## Composables

### useStorageValue

```vue
<template>
  <div>
    <input v-model="username" />
    <p>Stored: {{ username }}</p>
  </div>
</template>

<script setup>
import { useStorageValue } from 'strata-storage/vue';

const username = useStorageValue('username', 'Guest');
</script>
```

### useStorageState

```vue
<template>
  <div>
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

<script setup>
import { useStorageState } from 'strata-storage/vue';

const settings = useStorageState('app-settings', {
  darkMode: false,
  notifications: true
});
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
const users = useStorageQuery(
  computed(() => ({
    key: { $startsWith: 'user:' },
    'value.status': filter.value
  }))
);
</script>
```

### Form Persistence

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="form.name" placeholder="Name" />
    <input v-model="form.email" type="email" placeholder="Email" />
    <textarea v-model="form.message" placeholder="Message"></textarea>
    <button type="submit">Submit</button>
    <p v-if="isDirty">Draft saved</p>
  </form>
</template>

<script setup>
import { useFormStorage } from 'strata-storage/vue';

const { form, isDirty, reset } = useFormStorage('contact-form', {
  name: '',
  email: '',
  message: ''
});

const handleSubmit = async () => {
  // Submit form
  await submitToAPI(form.value);
  reset();
};
</script>
```

## See Also

- [Vue Composables API](../../api/integrations/vue.md)
- [React Examples](./react.md)
- [Angular Examples](./angular.md)