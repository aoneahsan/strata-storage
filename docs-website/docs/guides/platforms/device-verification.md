# Device Verification Guide — Native Storage (v2.6.0)

> **Audience:** The package author (or a contributor who has Xcode and Android Studio available).
>
> **Purpose:** The quality gates (typecheck + build + lint) cover the JS/TS layer but cannot reach the native bridge. Every change to the iOS Swift or Android Java code must be verified by hand on a simulator or real device. This guide gives you the exact steps and the expected results so nothing is skipped.
>
> **v2.6.0 scope:** SQLite multi-store isolation, value round-trip shape, `size(true)` response, the new Filesystem backend, and `androidx.security 1.1.0` on Android.

---

## Contents

1. [Why native verification cannot be automated](#1-why-native-verification-cannot-be-automated)
2. [Host app setup](#2-host-app-setup)
3. [Test matrix](#3-test-matrix)
   - [3.1 Preferences (UserDefaults / SharedPreferences)](#31-preferences-userdefaults--sharedpreferences)
   - [3.2 Secure (Keychain / EncryptedSharedPreferences)](#32-secure-keychain--encryptedsharedpreferences)
   - [3.3 SQLite](#33-sqlite)
   - [3.4 Filesystem (new in v2.6.0)](#34-filesystem-new-in-v260)
   - [3.5 `isAvailable` per storage type](#35-isavailable-per-storage-type)
4. [Expected-vs-actual checklist](#4-expected-vs-actual-checklist)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Why native verification cannot be automated

The Capacitor bridge serialises every call from JavaScript to a native method registered in `StrataStoragePlugin.m`. In any web/Node environment `isCapacitor()` returns `false` and every `StrataStorage.*` call goes to the web fallback — there is no way to boot an iOS or Android runtime outside a real device or simulator.

This means four things cannot be verified outside a real device:

- **SQLite multi-store** — whether two `SqliteAdapter` instances with different `database`/`table` values produce physically separate tables on disk.
- **Value round-trip shape** — whether native `get` returns the full `StorageValue` wrapper (with `created`, `updated`, `expires`, `tags`, `metadata`) rather than just the inner value.
- **`size(true)`** — whether the native side populates the `detailed.keys / values / metadata` byte breakdown.
- **Filesystem** — whether reads and writes actually land in the app's documents directory on both platforms.

The CAP_PLUGIN macro in `StrataStoragePlugin.m` is the registration point: if a method is missing from that list, every JS call to it silently returns `undefined`. Check that list first whenever a method appears unavailable.

---

## 2. Host app setup

You need a Capacitor app that lists `strata-storage` as a local dependency. The demo app at `example-apps/demo-app/` is the canonical choice. If you prefer a clean scratch app, the steps below create one from nothing.

### 2.1 Create (or reuse) a Capacitor host app

```bash
# Option A — use the existing demo app
cd /path/to/strata-storage/example-apps/demo-app
yarn install

# Option B — create a minimal host from scratch
mkdir strata-verify && cd strata-verify
yarn init -y
yarn add @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init StrataVerify com.example.strataverify --web-dir dist
```

### 2.2 Point to your local build of strata-storage

Build the package first, then use a `file:` reference so the host app sees your exact native source.

```bash
# From the strata-storage root
yarn build

# In your host app's package.json, add:
# "strata-storage": "file:../../"   (adjust the relative path)
yarn install
```

### 2.3 Add native platforms (skip if they already exist)

```bash
npx cap add ios
npx cap add android
```

### 2.4 Sync

Sync must be run every time you rebuild `strata-storage` or touch any native file.

```bash
npx cap sync ios
npx cap sync android
```

`cap sync` copies the built JS bundle and the native plugin into the Xcode and Gradle projects. It does not install CocoaPods.

### 2.5 iOS — CocoaPods / SPM

```bash
cd ios/App
pod install
cd ../..
```

If the project uses Swift Package Manager instead of CocoaPods, open `ios/App/App.xcworkspace` in Xcode, navigate to **File > Packages > Resolve Package Versions**, and wait for resolution to finish.

Open the workspace — never the `.xcodeproj` directly:

```bash
npx cap open ios
# or: open ios/App/App.xcworkspace
```

Select a simulator or connected device in the Xcode toolbar, then press **Run** (⌘R).

### 2.6 Android — Gradle sync

```bash
npx cap open android
```

Android Studio opens. Wait for **Gradle sync** to complete (progress bar at the bottom). If sync fails, check **Build > Sync Project with Gradle Files** and review the **Build** output pane for errors.

Select an emulator or connected device in the device dropdown, then press **Run** (the green triangle).

### 2.7 Plumbing the test script into the app

The simplest approach is to add a button in the host app that calls a `runStorageTests()` function and prints results to a visible `<pre>` element or to the native log. The snippets in §3 are self-contained async functions you can call from that button. Use `console.log` (visible in Xcode's device console and in `adb logcat`) to capture pass/fail output while you work through the matrix.

---

## 3. Test matrix

All snippets use `defineStorage()` from `strata-storage`. Import it at the top of your test file:

```typescript
import { defineStorage } from 'strata-storage';
import { PreferencesAdapter } from 'strata-storage/capacitor';
import { SecureAdapter } from 'strata-storage/capacitor';
import { SqliteAdapter } from 'strata-storage/capacitor';
import { FilesystemAdapter } from 'strata-storage/capacitor';
```

Each section is independent. You can run them in any order and in isolation.

---

### 3.1 Preferences (UserDefaults / SharedPreferences)

**Native backing:** `NSUserDefaults` on iOS, `SharedPreferences` on Android. Data persists across app restarts but is not encrypted. Do not store tokens or credentials here.

```typescript
async function testPreferences() {
  const storage = defineStorage({
    adapters: [new PreferencesAdapter()],
    defaultStorages: ['preferences'],
  });
  await storage.initialize();

  // --- set / get round-trip ---
  await storage.set('pref_test_key', 'hello-native', { storage: 'preferences' });
  const got = await storage.get<string>('pref_test_key', { storage: 'preferences' });
  console.assert(got === 'hello-native', 'FAIL preferences: get after set');

  // --- keys ---
  await storage.set('pref_key_a', 1, { storage: 'preferences' });
  await storage.set('pref_key_b', 2, { storage: 'preferences' });
  const keys = await storage.keys({ storage: 'preferences' });
  console.assert(keys.includes('pref_test_key'), 'FAIL preferences: keys missing pref_test_key');
  console.assert(keys.includes('pref_key_a'), 'FAIL preferences: keys missing pref_key_a');

  // --- remove ---
  await storage.remove('pref_key_a', { storage: 'preferences' });
  const afterRemove = await storage.keys({ storage: 'preferences' });
  console.assert(!afterRemove.includes('pref_key_a'), 'FAIL preferences: key still present after remove');

  // --- clear ---
  await storage.clear({ storage: 'preferences' });
  const afterClear = await storage.keys({ storage: 'preferences' });
  console.assert(afterClear.length === 0, 'FAIL preferences: keys not empty after clear');

  console.log('PASS preferences');
}
```

**Expected results:**

| Step | Expected |
|------|----------|
| `get` after `set` | Returns `'hello-native'` (string, not null) |
| `keys` | Array includes both written keys |
| `keys` after `remove` | `pref_key_a` absent; other keys present |
| `keys` after `clear` | Empty array `[]` |

**Persistence check:** Stop the app completely (swipe away on iOS, force-stop on Android), relaunch it, and call `storage.get('pref_test_key', { storage: 'preferences' })` before calling `clear`. It must still return `'hello-native'`.

---

### 3.2 Secure (Keychain / EncryptedSharedPreferences)

**Native backing:** iOS Keychain (`SecItemAdd`/`SecItemCopyMatching`); Android `EncryptedSharedPreferences` backed by `androidx.security:security-crypto 1.1.0`. The encryption is managed entirely by the OS — no application-level key is required.

**Android note:** `androidx.security 1.1.0` (stable) is a hard requirement for v2.6.0. Open `android/app/build.gradle` and confirm `implementation "androidx.security:security-crypto:1.1.0"` (not an alpha tag). If Gradle sync fails after this change, run **File > Sync Project with Gradle Files** from Android Studio; the most common fix is bumping `compileSdkVersion` to 34.

```typescript
async function testSecure() {
  const storage = defineStorage({
    adapters: [new SecureAdapter()],
    defaultStorages: ['secure'],
  });
  await storage.initialize();

  const secret = 'super-secret-token-abc123';
  await storage.set('secure_token', secret, { storage: 'secure' });

  // --- basic round-trip ---
  const got = await storage.get<string>('secure_token', { storage: 'secure' });
  console.assert(got === secret, 'FAIL secure: get after set');

  // --- keys and remove ---
  const keys = await storage.keys({ storage: 'secure' });
  console.assert(keys.includes('secure_token'), 'FAIL secure: key missing from keys()');

  await storage.remove('secure_token', { storage: 'secure' });
  const gone = await storage.get<string>('secure_token', { storage: 'secure' });
  console.assert(gone === null, 'FAIL secure: key still readable after remove');

  console.log('PASS secure');
}
```

**Persistence across app restart:** This is the most important property of the Secure adapter. After calling `set`, force-quit the app and relaunch. Then:

```typescript
// Run this in isolation AFTER relaunching the app — do NOT call clear() before restarting
const storage = defineStorage({
  adapters: [new SecureAdapter()],
  defaultStorages: ['secure'],
});
await storage.initialize();
const token = await storage.get<string>('secure_token', { storage: 'secure' });
console.assert(token === 'super-secret-token-abc123', 'FAIL secure: not persisted across restart');
console.log('PASS secure persistence');
```

**Expected results:**

| Step | Expected |
|------|----------|
| `get` after `set` | Returns the exact secret string |
| `keys` | Contains `'secure_token'` |
| `get` after `remove` | Returns `null` |
| `get` after app restart | Returns the exact secret string (Keychain / EncryptedSharedPreferences survived the restart) |

---

### 3.3 SQLite

SQLite receives the most changes in v2.6.0. There are four things to verify: (a) the full `StorageValue` wrapper survives a round-trip, (b) TTL expiry returns null after the deadline, (c) two adapter instances with different `database`/`table` do not share data, and (d) `size(true)` returns the `detailed` breakdown.

#### 3.3a Value round-trip with tags, TTL, and metadata

```typescript
async function testSqliteRoundTrip() {
  const sqlite = new SqliteAdapter({ database: 'strata', table: 'storage' });
  const storage = defineStorage({
    adapters: [sqlite],
    defaultStorages: ['sqlite'],
  });
  await storage.initialize();

  const payload = {
    userId: 'u_001',
    profile: { name: 'Alice', role: 'admin' },
    scores: [10, 20, 30],
  };

  await storage.set('rt_test', payload, {
    storage: 'sqlite',
    tags: ['user', 'profile'],
    expires: Date.now() + 60_000,          // 60 s from now
    metadata: { source: 'verify-run' },
  });

  const wrapper = await sqlite.get<typeof payload>('rt_test');

  // Shape assertions — these all fail if native returns a bare value instead of the wrapper
  console.assert(wrapper !== null, 'FAIL sqlite round-trip: get returned null');
  console.assert(typeof wrapper?.created === 'number', 'FAIL sqlite round-trip: created missing');
  console.assert(typeof wrapper?.updated === 'number', 'FAIL sqlite round-trip: updated missing');
  console.assert(typeof wrapper?.expires === 'number', 'FAIL sqlite round-trip: expires missing');
  console.assert(Array.isArray(wrapper?.tags), 'FAIL sqlite round-trip: tags not an array');
  console.assert(wrapper?.tags?.includes('profile'), 'FAIL sqlite round-trip: tag "profile" missing');
  console.assert(wrapper?.metadata?.source === 'verify-run', 'FAIL sqlite round-trip: metadata wrong');

  // Value shape
  console.assert(wrapper?.value?.userId === 'u_001', 'FAIL sqlite round-trip: value.userId wrong');
  console.assert(wrapper?.value?.scores?.length === 3, 'FAIL sqlite round-trip: value.scores length wrong');

  console.log('PASS sqlite round-trip');
}
```

**What is being verified:** Before v2.6.0 the native `get` handler returned the raw column bytes rather than the full `StorageValue<T>` object. The JS adapter does `result.value as StorageValue<T>` — if native sends back only the inner value, all the shape checks above fail.

#### 3.3b TTL expiry

```typescript
async function testSqliteTtl() {
  const sqlite = new SqliteAdapter({ database: 'strata', table: 'storage' });
  const storage = defineStorage({
    adapters: [sqlite],
    defaultStorages: ['sqlite'],
  });
  await storage.initialize();

  // Write with a 1-second TTL
  await storage.set('ttl_test', 'ephemeral', {
    storage: 'sqlite',
    expires: Date.now() + 1_000,
  });

  // Immediately readable
  const before = await storage.get<string>('ttl_test', { storage: 'sqlite' });
  console.assert(before === 'ephemeral', 'FAIL sqlite TTL: not readable before expiry');

  // Wait for expiry
  await new Promise(resolve => setTimeout(resolve, 1_500));

  const after = await storage.get<string>('ttl_test', { storage: 'sqlite' });
  console.assert(after === null, 'FAIL sqlite TTL: key still readable after expiry');

  console.log('PASS sqlite TTL');
}
```

#### 3.3c Multi-store isolation (new in v2.6.0)

This is the core of the multi-store contract: two `SqliteAdapter` instances with different `database` or `table` parameters must map to separate physical tables and never bleed data into each other.

```typescript
async function testSqliteMultiStore() {
  // Adapter A — database 'alpha', table 'main'
  const adapterA = new SqliteAdapter({ database: 'alpha', table: 'main' });
  const storageA = defineStorage({
    adapters: [adapterA],
    defaultStorages: ['sqlite'],
  });
  await storageA.initialize();

  // Adapter B — database 'beta', table 'main'
  const adapterB = new SqliteAdapter({ database: 'beta', table: 'main' });
  const storageB = defineStorage({
    adapters: [adapterB],
    defaultStorages: ['sqlite'],
  });
  await storageB.initialize();

  // Write the SAME key with different values to each store
  await storageA.set('collision_key', 'value-from-alpha', { storage: 'sqlite' });
  await storageB.set('collision_key', 'value-from-beta', { storage: 'sqlite' });

  const fromA = await storageA.get<string>('collision_key', { storage: 'sqlite' });
  const fromB = await storageB.get<string>('collision_key', { storage: 'sqlite' });

  console.assert(fromA === 'value-from-alpha', 'FAIL sqlite multi-store: alpha value wrong');
  console.assert(fromB === 'value-from-beta', 'FAIL sqlite multi-store: beta value wrong');
  console.assert(fromA !== fromB, 'FAIL sqlite multi-store: stores are not isolated');

  // Clearing one store must not affect the other
  await storageA.clear({ storage: 'sqlite' });
  const afterClearA = await storageA.get<string>('collision_key', { storage: 'sqlite' });
  const stillInB = await storageB.get<string>('collision_key', { storage: 'sqlite' });

  console.assert(afterClearA === null, 'FAIL sqlite multi-store: clear did not remove from alpha');
  console.assert(stillInB === 'value-from-beta', 'FAIL sqlite multi-store: clear leaked into beta');

  console.log('PASS sqlite multi-store');
}
```

**What is being verified:** Before v2.6.0 the `database` and `table` parameters were passed through the JS adapter but the native handler ignored them, mapping every adapter to the same `strata_storage.db / storage` table. Both stores would return whichever value was written last. After the fix, `alpha.db` and `beta.db` are distinct files on disk.

#### 3.3d `size(true)` shape

```typescript
async function testSqliteDetailedSize() {
  const sqlite = new SqliteAdapter({ database: 'strata', table: 'storage' });
  const storage = defineStorage({
    adapters: [sqlite],
    defaultStorages: ['sqlite'],
  });
  await storage.initialize();

  // Seed a couple of entries so size is non-zero
  await storage.set('sz_a', { x: 1 }, { storage: 'sqlite', tags: ['t1'] });
  await storage.set('sz_b', 'plain string', { storage: 'sqlite' });

  const info = await sqlite.size(true);

  console.assert(typeof info.total === 'number', 'FAIL sqlite size: total not a number');
  console.assert(typeof info.count === 'number', 'FAIL sqlite size: count not a number');
  console.assert(info.count >= 2, 'FAIL sqlite size: count below 2 after seeding');

  // v2.6.0 contract — these must be populated when detailed=true
  console.assert(info.detailed !== undefined, 'FAIL sqlite size: detailed undefined');
  console.assert(typeof info.detailed?.keys === 'number', 'FAIL sqlite size: detailed.keys not a number');
  console.assert(typeof info.detailed?.values === 'number', 'FAIL sqlite size: detailed.values not a number');
  console.assert(typeof info.detailed?.metadata === 'number', 'FAIL sqlite size: detailed.metadata not a number');

  // Sanity: the sum of the three columns should be close to total
  const colSum = (info.detailed?.keys ?? 0) + (info.detailed?.values ?? 0) + (info.detailed?.metadata ?? 0);
  // Allow for padding / overhead — just check it's within an order of magnitude
  console.assert(colSum > 0 && colSum <= info.total * 5, 'FAIL sqlite size: column sum implausible');

  console.log('PASS sqlite size detailed', info);
}
```

**Expected `info` shape:**

```json
{
  "total": 312,
  "count": 2,
  "detailed": {
    "keys": 10,
    "values": 280,
    "metadata": 22
  }
}
```

Exact byte values will vary by device and row content; what matters is that all three `detailed` fields are present and non-negative.

---

### 3.4 Filesystem (new in v2.6.0)

**Native backing:** one JSON file per key, written under a dedicated subdirectory of the app's sandboxed storage:

- iOS: `<NSDocumentsDirectory>/strata_storage/<sanitised-key>.json`
- Android: `<Context.getFilesDir()>/strata_storage/<sanitised-key>.json`

The full `StorageValue` wrapper is JSON-serialised and written as file content. `keys()` lists the directory. `size()` sums the file sizes.

```typescript
async function testFilesystem() {
  const fsAdapter = new FilesystemAdapter();

  // Confirm the adapter reports itself as available on-device
  const available = await fsAdapter.isAvailable();
  console.assert(available === true, 'FAIL filesystem: isAvailable() returned false — plugin not wired?');

  const storage = defineStorage({
    adapters: [fsAdapter],
    defaultStorages: ['filesystem'],
  });
  await storage.initialize();

  // --- set / get ---
  const testValue = { report: 'q1-2026', lines: 42 };
  await storage.set('fs_doc', testValue, { storage: 'filesystem' });

  const got = await storage.get<typeof testValue>('fs_doc', { storage: 'filesystem' });
  console.assert(got?.report === 'q1-2026', 'FAIL filesystem: get after set — report field wrong');
  console.assert(got?.lines === 42, 'FAIL filesystem: get after set — lines field wrong');

  // --- keys ---
  await storage.set('fs_doc_b', 'extra', { storage: 'filesystem' });
  const keys = await storage.keys({ storage: 'filesystem' });
  console.assert(keys.includes('fs_doc'), 'FAIL filesystem: keys missing fs_doc');
  console.assert(keys.includes('fs_doc_b'), 'FAIL filesystem: keys missing fs_doc_b');

  // --- remove ---
  await storage.remove('fs_doc_b', { storage: 'filesystem' });
  const afterRemove = await storage.keys({ storage: 'filesystem' });
  console.assert(!afterRemove.includes('fs_doc_b'), 'FAIL filesystem: key present after remove');

  // --- size ---
  const sizeInfo = await fsAdapter.size();
  console.assert(typeof sizeInfo.total === 'number' && sizeInfo.total > 0, 'FAIL filesystem: size().total not positive');
  console.assert(sizeInfo.count >= 1, 'FAIL filesystem: size().count is 0 after writing');

  // --- clear ---
  await storage.clear({ storage: 'filesystem' });
  const afterClear = await storage.keys({ storage: 'filesystem' });
  console.assert(afterClear.length === 0, 'FAIL filesystem: keys not empty after clear');

  console.log('PASS filesystem');
}
```

**Physical file verification (optional but recommended):**

On iOS simulator you can confirm the file actually exists via the Xcode Device & Simulators window: **Window > Devices and Simulators**, select your simulator, click the settings icon next to the app, and choose **Download Container**. Unzip the `.xcappdata` and look for `AppData/Documents/strata_storage/fs_doc.json`.

On Android emulator, use Android Studio's **Device File Explorer** (bottom-right panel): navigate to `data/data/<your.app.id>/files/strata_storage/`. After a successful `set`, `fs_doc.json` should be visible there.

---

### 3.5 `isAvailable` per storage type

Call `isAvailable()` on each adapter before running the full test matrix to confirm the plugin bridge is connected. If any of these return `false` unexpectedly, see §5 Troubleshooting.

```typescript
async function testIsAvailable() {
  const prefs = new PreferencesAdapter();
  const secure = new SecureAdapter();
  const sqlite = new SqliteAdapter();
  const fs = new FilesystemAdapter();

  const results = {
    preferences: await prefs.isAvailable(),
    secure: await secure.isAvailable(),
    sqlite: await sqlite.isAvailable(),
    filesystem: await fs.isAvailable(),
  };

  console.log('isAvailable results:', results);

  // All four must be true on both platforms
  Object.entries(results).forEach(([name, val]) => {
    console.assert(val === true, `FAIL isAvailable: ${name} returned false`);
  });

  console.log('PASS isAvailable');
}
```

**Expected platform matrix:**

| Storage type | iOS simulator | iOS real device | Android emulator | Android real device |
|---|:---:|:---:|:---:|:---:|
| `preferences` | `true` | `true` | `true` | `true` |
| `secure` | `true` | `true` | `true` | `true` |
| `sqlite` | `true` | `true` | `true` | `true` |
| `filesystem` | `true` | `true` | `true` | `true` |

`isAvailable()` returns `false` on the web (non-Capacitor) platform by design — `isCapacitor()` guards the check. Running these tests in a browser tab will always return `false`.

---

## 4. Expected-vs-actual checklist

Print or copy this table. Tick each cell as you work through the test matrix on each platform. A cell is green when the `console.assert` calls all pass and the log prints `PASS <section>`.

| Test | iOS Simulator | iOS Real Device | Android Emulator | Android Real Device |
|---|:---:|:---:|:---:|:---:|
| **isAvailable — preferences** | ☐ | ☐ | ☐ | ☐ |
| **isAvailable — secure** | ☐ | ☐ | ☐ | ☐ |
| **isAvailable — sqlite** | ☐ | ☐ | ☐ | ☐ |
| **isAvailable — filesystem** | ☐ | ☐ | ☐ | ☐ |
| **Preferences — set / get** | ☐ | ☐ | ☐ | ☐ |
| **Preferences — keys** | ☐ | ☐ | ☐ | ☐ |
| **Preferences — remove** | ☐ | ☐ | ☐ | ☐ |
| **Preferences — clear** | ☐ | ☐ | ☐ | ☐ |
| **Preferences — persistence across restart** | ☐ | ☐ | ☐ | ☐ |
| **Secure — set / get** | ☐ | ☐ | ☐ | ☐ |
| **Secure — remove** | ☐ | ☐ | ☐ | ☐ |
| **Secure — persistence across restart** | ☐ | ☐ | ☐ | ☐ |
| **SQLite — value round-trip (wrapper shape)** | ☐ | ☐ | ☐ | ☐ |
| **SQLite — TTL expiry returns null** | ☐ | ☐ | ☐ | ☐ |
| **SQLite — multi-store isolation** | ☐ | ☐ | ☐ | ☐ |
| **SQLite — size(true) shape** | ☐ | ☐ | ☐ | ☐ |
| **Filesystem — isAvailable** | ☐ | ☐ | ☐ | ☐ |
| **Filesystem — set / get** | ☐ | ☐ | ☐ | ☐ |
| **Filesystem — keys / remove** | ☐ | ☐ | ☐ | ☐ |
| **Filesystem — size** | ☐ | ☐ | ☐ | ☐ |
| **Filesystem — clear** | ☐ | ☐ | ☐ | ☐ |
| **Filesystem — file visible in Documents dir** | ☐ | ☐ | ☐ | ☐ |
| **Android: androidx.security 1.1.0 Gradle sync** | — | — | ☐ | ☐ |

---

## 5. Troubleshooting

### Plugin not registered — every call returns `undefined`

The JavaScript layer receives `undefined` from all native calls when the `CAP_PLUGIN` macro in `StrataStoragePlugin.m` is missing a method or the file was not compiled into the native target. Check:

1. Open `ios/Plugin/StrataStoragePlugin.m` and confirm the method you are calling appears in the `CAP_PLUGIN(StrataStoragePlugin, "StrataStorage", ...)` block. The full list for v2.6.0 should be:
   ```
   isAvailable, get, set, remove, clear, keys, size, query,
   getUserDefaults, setUserDefaults, getKeychain, setKeychain
   ```
   Filesystem operations go through the generic `get/set/remove/clear/keys/size` methods with `storage: 'filesystem'` — they do not require separate CAP_PLUGIN entries.
2. Run `npx cap sync ios` again to force-copy the updated `.m` file into the Xcode project, then clean the build (**Product > Clean Build Folder**, ⇧⌘K) and rebuild.

### iOS: `pod install` fails or plugin not found

- Confirm `strata-storage` appears in `ios/App/Podfile` (CocoaPods-based projects) after `cap sync`. If it does not, check that `node_modules/strata-storage/StrataStorage.podspec` exists and is valid.
- Run `pod repo update` then `pod install` again if the repo cache is stale.
- For SPM: make sure the local file reference in the Xcode package list points to the correct `strata-storage` directory. After `yarn build` re-runs, the SPM cache may need to be reset via **File > Packages > Reset Package Caches**.

### Android: `isAvailable()` returns `false` for `secure`

`EncryptedSharedPreferences` requires API level 23 (Android 6.0). Confirm `android/app/build.gradle` has `minSdkVersion 23` or higher. If the test runs on an older emulator image, upgrade the AVD to API 23+.

`androidx.security:security-crypto 1.1.0` (stable) may require bumping `compileSdkVersion` to 34. If Gradle sync fails with a `minCompileSdk(34)` error, update:

```groovy
// android/app/build.gradle
android {
    compileSdkVersion 34
    defaultConfig {
        minSdkVersion 23
        targetSdkVersion 34
    }
}
```

### Android: Gradle sync error `Could not resolve androidx.security:security-crypto:1.1.0`

Ensure the `google()` repository is listed in `android/build.gradle` (project-level):

```groovy
allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
```

Then run **File > Sync Project with Gradle Files**.

### SQLite multi-store: both stores return the same value

The native `get`/`set`/`clear`/`keys` handlers receive `database` and `table` from the JS options object. If both stores still collide after the v2.6.0 update, log the raw Capacitor call options in the native handler to confirm the parameters arrive. On Android this is `call.getString("database")` in the Java handler; on iOS it is `call.getString("database")` in the Swift handler. A `nil` return means the JS adapter is not passing the parameter.

### Filesystem: `isAvailable()` returns `false`

The `FilesystemAdapter.isAvailable()` calls `StrataStorage.isAvailable({ storage: 'filesystem' })` through the plugin. The native handler must handle the `'filesystem'` case explicitly and return `{ available: true }`. If the handler has no `filesystem` branch it will fall through to an error or return `false`. Confirm the native dispatch table covers all four storage types.

### Xcode: `StrataStoragePlugin` class not found at runtime

Clean derived data — in Xcode go to **Product > Clean Build Folder** (⇧⌘K), delete `~/Library/Developer/Xcode/DerivedData`, then rebuild. If the class is still not found, confirm `StrataStoragePlugin.swift` is included in the target's **Compile Sources** build phase.

---

*Last updated: 2026-05-27 — covers strata-storage v2.6.0 native changes.*
