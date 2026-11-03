# strata-storage — Reported Issues (open queue)

The ONE place consumers/agents report strata-storage issues for the owner to fix HERE (in this package).
**Open entries only** — each one a `### ISSUE-NN — <title>` section with full detail (symptom, verbatim
errors, repro, affected version, root cause if diagnosed, reporter project + date). On fixing: MOVE the
entry to `docs/RESOLVED-ISSUES.md` (add resolution date + the fixing npm version) and mirror any
consumer-relevant guidance into the docs. External reporters may also use GitHub Issues; entries here are
the authoritative fix queue. Fleet rule: `~/.claude/rules/project-issue-reporting.md` (owner machines).

🔴 **The next issue is `ISSUE-16`.** Numbers are never reused, even after an entry is archived — the next
id is one past the highest that has ever existed in either file. `ISSUE-09` was briefly assigned twice
(2026-08-25 LabFlow/ClearHire and 2026-09-01 Trizlink); the later filing was renumbered to `ISSUE-10`
when both were resolved.

---

## Open

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
