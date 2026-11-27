# strata-storage — Reported Issues (open queue)

The ONE place consumers/agents report strata-storage issues for the owner to fix HERE (in this package).
**Open entries only** — each one a `### ISSUE-NN — <title>` section with full detail (symptom, verbatim
errors, repro, affected version, root cause if diagnosed, reporter project + date). On fixing: MOVE the
entry to `docs/RESOLVED-ISSUES.md` (add resolution date + the fixing npm version) and mirror any
consumer-relevant guidance into the docs. External reporters may also use GitHub Issues; entries here are
the authoritative fix queue. Fleet rule: `~/.claude/rules/project-issue-reporting.md` (owner machines).

🔴 **The next issue is `ISSUE-27`.** Numbers are never reused, even after an entry is archived — the next
id is one past the highest that has ever existed in either file. `ISSUE-09` was briefly assigned twice
(2026-08-25 LabFlow/ClearHire and 2026-09-01 Trizlink); the later filing was renumbered to `ISSUE-10`
when both were resolved.

---

## Open

### ISSUE-26 — /about shows a different header menu, and the brand files have no public download

**Status:** OPEN · **Reported:** 2026-11-27 from the product PDF series (point-of-view batches 2–11) · **Affects:** `strata-storage-website` (`/about` header), the brand kit

**Symptom.** `https://stratastorage.aoneahsan.com/about` shows a different header menu from the home page. The brand files have no public download, so a writer or partner can't get the mark.

**Suggested fix.** Use the shared header on `/about`; publish a brand download (SVG and PNG lockups) on the website or the docs.

### ISSUE-25 — This queue says the next is ISSUE-16, but ISSUE-17 to ISSUE-22 exist and ISSUE-16 is in neither file

**Status:** OPEN · **Reported:** 2026-11-27 from the product PDF series · **Affects:** `docs/REPORTED-ISSUES.md`, `docs/RESOLVED-ISSUES.md`

**Symptom.** The "next issue" line said `ISSUE-16` while ISSUE-17 to ISSUE-22 were already filed, and no file holds an ISSUE-16. (Filing ISSUE-23 to ISSUE-26 moved the line to ISSUE-27.)

**Suggested fix.** Find what ISSUE-16 was (git log of both files) and restore it to the right file, or record that the number was skipped.

### ISSUE-24 — The brand kit README still calls older marks live

**Status:** OPEN · **Reported:** 2026-11-27 from the product PDF series · **Affects:** `brand-kit/README.md`

**Symptom.** The kit README still lists older marks as the ones in use; they were replaced on 10 Nov (favicon, docs logo) and by 16 Nov (package README).

**Suggested fix.** Update the "live marks" list in the kit README to what ships now.

### ISSUE-23 — The README says query() matches tags; the source and docs say tags can't be queried

**Status:** OPEN · **Reported:** 2026-11-27 from the product PDF series · **Affects:** `README.md` (query section); `Strata.query`

**Symptom.** The README says `query()` matches tags. `Strata.query` decodes each value and matches only its fields, and the docs say tags cannot be queried. A developer following the README gets no results for a tag query.

**Suggested fix.** Correct the README (or add tag matching to `query()` and document it).

### ISSUE-11 — Android `EncryptedStorage.java` compiles against a deprecated Jetpack API

- **Symptom:** every consumer's Gradle build prints `Note: …/node_modules/strata-storage/android/src/main/java/com/strata/storage/EncryptedStorage.java uses or overrides a deprecated API. Recompile with -Xlint:deprecation for details.`
- **Where:** `android/src/main/java/com/strata/storage/EncryptedStorage.java:7-42`. It uses
  `androidx.security.crypto.EncryptedSharedPreferences` and `MasterKey`
  (`androidx.security:security-crypto:1.1.0`, `android/build.gradle:58`). Jetpack deprecated both;
  the library has no successor API.
- **Affected:** `strata-storage@3.0.0`, the current release. Reproduced 2026-09-23 with
  `yarn android:build:debug` in ClearHire (`clearhire-project-root/clearhire`, Capacitor 8.5.2, AGP from
  the Capacitor 8 template). The build succeeds; this is a deprecation note, not a failure.
- **Expected fix:** move the encrypted adapter to a supported primitive. The usual path is Android
  Keystore (AES-GCM key) plus a plain `SharedPreferences` or DataStore holding the ciphertext. It needs a
  migrate-on-read from the old `EncryptedSharedPreferences` file, so existing encrypted values survive. Keep
  the API 23+ refusal.
- **Workaround:** none needed yet; the deprecated API still works.
- **Rechecked 2026-11-04:** `security-crypto` 1.1.0 is still the newest release (Google Maven metadata, last
  updated 2025-07-30), so there is no in-library upgrade that clears the note, and an
  `@SuppressWarnings("deprecation")` would only hide it. The fix is a format migration, so it ships as its own
  minor release: (1) a new `KeystoreCipher` holding an AES-256-GCM key in `AndroidKeyStore` under a new alias,
  writing `base64(iv || ciphertext)` into a plain `SharedPreferences` file named `<name>.v2`; (2) on first open,
  if the legacy `EncryptedSharedPreferences` file exists, read every entry through it, write each into the v2
  store, verify the count, then delete the legacy file. A failed migration leaves the legacy file in place and
  serves reads from it; (3) keep `security-crypto` as a dependency only for that read-once path, and drop it a
  major later; (4) keep the API 23 refusal. Prove the change on a debug build that starts with legacy data and
  keeps its values after the upgrade.
- **Found while working on:** the 2026-09-23 fleet package baseline rollout
  (`~/Documents/ahsan-work/code/docs/tracking/package-baseline-rollout-2026-09-23-tracker.json`). Priority:
  low, but it must be done before security-crypto is removed.

---

Before this entry, all ten filed issues were resolved and recorded in
[`docs/RESOLVED-ISSUES.md`](./RESOLVED-ISSUES.md). The last six — `ISSUE-01`, `06`, `07`, `08`, `09` and
`10`, reported by LabFlow, ClearHire, HabitForge, LifeWell and Trizlink — were closed together in
**`2.9.0`** on 2026-09-01, each verified by driving the reporter's own repro in a real browser against
published `2.8.5` and then against the release.

**Known and deliberate, not a defect:** since `2.9.0` a web adapter identifies its own data by shape, so a
key written to the same storage area by anything other than this library is invisible to `keys()` by
design. `setLogLevel('debug')` reports each skip with its key and reason. The related **3.0.0** work — a
real default key prefix with migrate-on-read and an opt-out — is tracked in the root
[`PENDING-TASKS.md`](../PENDING-TASKS.md) as `TASK-001`, not here: it is planned work, not a reported bug.

**Last updated:** 2026-10-31 (ISSUE-15 resolved in 3.1.4). Earlier: 2026-10-21 (ISSUE-14 resolved in 3.1.1). Earlier: 2026-09-23 (ISSUE-11 filed from the fleet package baseline). Earlier 2026-09-01 (queue emptied — all six open entries fixed in 2.9.0 and moved to
`docs/RESOLVED-ISSUES.md`; the duplicate `ISSUE-09` renumbered to `ISSUE-10` on the way out.)

### ISSUE-17 — README statements the code no longer supports
- **Found:** 2026-11-03, while writing the LinkedIn series from the code (3.1.4).
- **What:** (1) `README.md:444` still lists the foreign-key console errors as a "Known open defect"; 2.9.0 fixed it.
  (2) `README.md:87` says "Automated test suite: none" while `README.md:455` and 2 Vitest files say otherwise.
  (3) `docs/RESOLVED-ISSUES.md` ISSUE-06 still carries an "OPEN" status line. (4) The docs site uses blue `#2563eb`,
  not the website's Signal Coral palette.
- **Fix:** correct the README lines and the resolved entry; theme the docs site from the website tokens. **Priority:** low.

### ISSUE-18 — the website writes around Strata and states sessionStorage history wrongly
- **Found:** 2026-11-03, while capturing the LinkedIn cards (live stratastorage.aoneahsan.com).
- **What:** (1) `strata-storage-website/src/stores/theme-store.ts:101` persists `strata-storage-theme` straight to localStorage
  on every visit, outside Strata (the site's own rule is that nothing else touches storage); (2) the home migration
  section and the 3.0.0 changelog say sessionStorage keys used `strata:` since 3.0, true only from 3.1.0 (ISSUE-13);
  (3) `public/favicon.svg` and `public/strata-logo.svg` are the old indigo mark; (4) the site's "Not the right tool
  when" list has 3 items, the README 4.
- **Fix:** route the theme store through Strata (or remove it), correct the two texts, replace the old marks, align the
  list. **Priority:** medium (1), low (2)–(4).

### ISSUE-19 — importing the main entry builds a default singleton, so `defineStorage` alone carries every web adapter
- **Found:** 2026-11-22, in a private Capacitor 8 consumer app (3.1.4 and 3.1.7).
- **What:** `dist/index.js` creates `const storage = defineStorage({ defaultStorages: [`localStorage`, `indexedDB`, `sessionStorage`, `memory`] })` at module top level, so importing `defineStorage` also builds a `Strata` instance and registers every web adapter. A consumer that only calls `defineStorage` carries about 120 KB of library code it never uses, and `"sideEffects": false` in `package.json` tells bundlers the module is pure when it is not. The consumer loads the package lazily, off its first screen, to keep its first-load budget.
- **Fix:** move the default singleton out of the main entry (a `strata-storage/default` subpath, or a lazy `getDefaultStorage()`), so the main entry is side-effect free and `sideEffects: false` becomes true. **Priority:** high (first-load size for every web consumer).

### ISSUE-20 — the Android keep rules never reach consuming apps
- **Found:** 2026-11-22, same consumer, release-health pass.
- **What:** `android/build.gradle:40` lists `proguard-rules.pro` under `proguardFiles`, which applies only to the library's own minified build. Without `consumerProguardFiles`, an app that enables R8 strips classes Strata reaches by reflection, so each consumer has to copy the rules by hand.
- **Fix:** add `consumerProguardFiles 'proguard-rules.pro'` (or a dedicated `consumer-rules.pro`) to `defaultConfig`. **Priority:** high (release builds).

### ISSUE-21 — EncryptedStorage uses the deprecated androidx.security EncryptedSharedPreferences
- **Found:** 2026-11-22, same consumer, Android build warnings.
- **What:** `android/src/main/java/com/strata/storage/EncryptedStorage.java:7` and `:37` build on `androidx.security.crypto.EncryptedSharedPreferences`, which androidx has deprecated; every consumer build warns.
- **Fix:** move the encrypted adapter to a supported store (Tink-backed keys with DataStore, or the Keystore directly), keeping the stored data readable across the upgrade. **Priority:** medium.

### ISSUE-22 — the Android module still uses Groovy DSL syntax Gradle is retiring
- **Found:** 2026-11-22, same consumer, Gradle 8.14.3 warnings.
- **What:** the consumer's `./gradlew assembleDebug --warning-mode all` reports Groovy DSL deprecations from this module's `android/build.gradle` (property assignments without `=`), which Gradle 10 will reject.
- **Fix:** switch to `propName = value` assignments throughout `android/build.gradle` and re-run with `--warning-mode all` until it is clean. **Priority:** low.
