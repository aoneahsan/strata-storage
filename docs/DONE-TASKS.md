# strata-storage — Completed Tasks

History of agent-owed tasks from `PENDING-TASKS.md`. Entries are **moved** here on completion with their
date and the release that closed them, never deleted. 🔴 A number is never reused: the next id is one past
the highest that has ever existed in either file.

---

### DONE-001 — 3.0.0: a real default key prefix, with migrate-on-read and an opt-out


**Agreed:** 2026-09-01, owner decision, during the 2.9.0 issue-queue pass.
**Depends on:** `2.9.0` (shipped) — specifically `isStorageEnvelope`.

**What.** Give the web adapters a real default key prefix (`strata:`) instead of the empty string, so the
library's keys are distinguishable by name and not only by shape.

**Why it is a major version.** It changes where every existing consumer's data lives. Every key written by
every version up to 2.9.0 is stored unprefixed; a new default makes all of it unreadable on upgrade with
no error — reads simply return `null`.

**Why it depends on 2.9.0 rather than replacing it.** A safe migration is read-through: on a miss at
`strata:<key>`, look for the bare `<key>`, and if it is ours, rewrite it under the prefix. Deciding
whether a bare key is *ours* — with no prefix to go on, in an area shared with every other script on the
origin — is exactly what `isStorageEnvelope` answers. Without it, migrate-on-read would adopt other
applications' keys.

**What it must ship with:**

1. **Migrate-on-read**, gated on the envelope check, so no consumer loses data on upgrade.
2. 🔴 **An opt-out that is documented and easy** — `namespace: false` or an explicit
   `adapters: { localStorage: { prefix: '' } }` — for consumers whose physical key names are frozen.
3. A migration note in the README and on the docs site, and a major-version CHANGELOG entry.

🔴 **The opt-out is not optional, and here is the measured reason.** Trizlink
(`trizlink-project-root/trizlink`) reads two physical keys directly, bypassing this library because both
reads happen before it exists:

- `src/services/logger.ts:32` reads `trizlink:logLevel` straight from `localStorage`; that key is written
  by an instance with **no namespace**, so a default prefix would have this library write
  `strata:trizlink:logLevel` while the logger keeps reading the bare key — the two diverge permanently.
- `src/lib/theme-axes.ts:186` — the pre-paint script — reads `trizlink:<axis>` the same way.

And `trizlink-project-root/02-FROZEN-CONTRACTS.md` §9 freezes its nine device keys against renaming
precisely because moving one signs every installed user out or discards the theme they chose. Trizlink is
not unusual: any consumer with a pre-paint script or a frozen key set is in the same position.

**Not in scope:** changing what `namespace` does today. It already prefixes, it is unaffected, and
consumers using it need no migration.

---

#### ✅ DONE — shipped in `3.0.0`, 2026-09-01

`localStorage` and `sessionStorage` default to `DEFAULT_WEB_KEY_PREFIX = 'strata:'` (exported).

**All three things this task required shipped:**

1. **Migrate-on-read**, gated on `isStorageEnvelope` — `LocalStorageAdapter.adoptLegacyKey()`. Per key,
   on read; never a bulk sweep, because a sweep would adopt every unprefixed envelope on the origin,
   including keys belonging to an instance that opted out or a sibling app still on 2.x. It moves rather
   than copies (a copy diverges silently the moment anything writes), and it never overwrites a value
   already at the prefixed key.
2. **The opt-out**: `keyPrefix: false`, one line, instance-level. `adapters.<name>.prefix` still wins
   over it, and `migrateLegacyKeys: false` disables adoption separately.
3. **Migration notes** in `CHANGELOG.md`, `README.md` §Limitations + the config table, and the docs site.

**Verified in Chrome, 13 assertions**, including the two that matter most: a foreign `_cltk` is never
adopted, and a directly constructed adapter (`plugin/web.ts`'s `strata_prefs_` instance) never steals
bare keys. 🔴 One assertion was found **half-oriented and corrected before being trusted** — the
never-overwrite check could not go red, because `getSync` short-circuits on
`parseOwnValue(...) ?? adoptLegacyKey(...)` and a valid prefixed value means adoption never runs. The
guard's real job is a prefixed slot holding something that is *not* our envelope; the assertion was
rewritten to reach it, and only then did the planted defect fail.

🔴 **The trizlink case this task was written around is verified**: with `keyPrefix: false`, its two
instances still write exactly `trizlink-auth-storage`, `trizlink:logLevel` and `trizlink:theme`, and the
pre-paint contract still resolves. `02-FROZEN-CONTRACTS.md` §9 holds.

**Closed:** 2026-09-01 · commit: see `git log --oneline` for the 3.0.0 release commit.

---

### DONE-002 — the TTL interval keeps a Node process alive until `close()`


**Found while working on:** the 2.9.0 publish gate (smoke-installing the tarball), 2026-09-01. Not a
reported issue and not caused by that release — pre-existing behaviour, filed so it is not lost.

**What.** `BaseAdapter.startTTLCleanup()` and `Strata`'s own cleanup timer both use `setInterval`. In Node
an outstanding interval keeps the event loop alive, so a script that creates an instance and finishes its
work **never exits** unless it calls `storage.close()`. Measured: a smoke script doing one `set`/`get`
against the `memory` adapter hung until killed at 120s.

**Why it is not urgent.** Browsers are unaffected (the page owns the lifetime), and `close()` already
clears both timers, so there is a correct way to write it today. It bites short-lived Node processes: a
build step, a CLI, a test runner, an SSR warmup script.

**Fix.** Call `.unref()` on both timers where it exists — `const t = setInterval(...); t.unref?.()`. It is
a no-op in browsers (`setInterval` returns a number there, so the optional call simply does nothing) and
in Node it lets the process exit while leaving the timer working for as long as the process lives.

**Also worth checking in the same pass:** `startAutoBackup()`'s timer, same shape.

---

**Last updated:** 2026-09-01 (created — TASK-001 recorded when 2.9.0 closed the reported-issue queue.)

#### ✅ DONE — shipped in `3.0.0`, 2026-09-01

`.unref?.()` on all three timers: `BaseAdapter`'s TTL interval, `Strata`'s cross-adapter cleanup interval,
and the auto-backup interval. A no-op in browsers (`setInterval` returns a number there, so the optional
call does nothing); in Node it lets the process exit while the timer keeps working for as long as the
process lives.

**Verified:** a script that creates an instance, does one `set`/`get` and never calls `close()` hung until
killed at 120s before, and now exits in **0s** with code 0.

**Closed:** 2026-09-01 · found while smoke-installing the 2.9.0 tarball.

---

**Last updated:** 2026-09-01 (DONE-001 and DONE-002 moved here on the 3.0.0 release.)
