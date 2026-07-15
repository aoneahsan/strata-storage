# Issues recorded from the LabFlow project (found while implementing strata-storage in LabFlow)

> **Source:** the **LabFlow** project (private repo `aoneahsan/lab-system`), which consumes this package.
> These are issues in **strata-storage itself**, filed here so they are fixed in this package rather than
> worked around downstream.
>
> **Please mark each issue RESOLVED in this file (with the version that fixes it + the date) once the fix
> is implemented and confirmed.** Keep the entry — do not delete it — so the history stays reviewable.

| # | Title | Status | Found | Affects |
|---|---|---|---|---|
| 1 | Empty-prefix adapters claim the ENTIRE localStorage namespace and log errors on foreign non-JSON values | 🔴 OPEN | 2026-07-15 (LabFlow) | `v2.8.1` (current), web `LocalStorageAdapter` / `SessionStorageAdapter` |

---

## ISSUE 1 — Empty-prefix adapters claim the entire `localStorage` namespace, then error-log on other apps' keys

**Status:** 🔴 OPEN · **Reported:** 2026-07-15 from LabFlow · **Affects:** `strata-storage@2.8.1`,
`src/adapters/web/LocalStorageAdapter.ts` (and `SessionStorageAdapter.ts`, same shape)

### Symptom (as seen in LabFlow)

Console noise on every TTL cleanup tick / `keys()` call, of the form:

```
Failed to get key logger-level from localStorage: SyntaxError: Unexpected token 'w', "warn" is not valid JSON
```

It is non-fatal — `getSync()` catches per key and the sweep continues — but it pollutes the console of a
production app with errors that look like application faults, and it does so for a key **strata-storage
does not own**.

### Root cause (verified against this repo's source, not inferred)

1. `LocalStorageAdapter.prefix` defaults to `''` (`constructor(prefix = '')`, line ~40).
2. `keysSync()` (line ~250) enumerates **all** of `localStorage` and keeps every key where
   `fullKey?.startsWith(this.prefix)`. **With an empty prefix, `startsWith('')` is `true` for every key**,
   so the adapter treats every key written by *any* other code on that origin as its own.
3. For each such key it calls `getSync(key)` (line ~97), which does `deserialize(item)` and therefore
   `JSON.parse`s the raw value.
4. Any foreign key holding a **non-JSON raw string** throws, and the `catch` logs at **error** level
   (`logger.error(\`Failed to get key ${key} from ${this.name}:\`, error)`).
5. `BaseAdapter.cleanupExpired()` (`src/core/BaseAdapter.ts` line ~69) is a per-key sweep built on
   `keys()` + `get()`, so the automatic TTL tick walks the whole foreign namespace and reproduces this on
   a timer.

In LabFlow the trigger is its centralized logger's own `localStorage` key (`logger-level`), whose value is
an intentional raw string (`warn`, not `"warn"`). That key is written and read by LabFlow's logger and is
none of strata-storage's business — the package should not be parsing it at all.

### Repro

```js
localStorage.setItem('logger-level', 'warn');          // any foreign, non-JSON raw string
const s = new Strata();                                 // default config → empty prefix
await s.initialize();
await s.cleanupExpired();                               // → logger.error for the foreign key
```

### Suggested fix (package-side — pick one; 1 is the real fix)

1. **Namespace-scope the sweep (preferred).** Don't let an empty prefix mean "everything". Either default the
   web adapters to a real namespace (e.g. `strata:`), or track adapter-owned keys explicitly so `keysSync()`
   can never return a key this adapter didn't write. This also fixes the more serious latent problem below.
2. **Tolerate non-JSON.** A `deserialize()` failure means "not one of ours / not readable" — treat it as a
   skip (return `null`) and log at **debug**, not `error`. Cheap, and correct regardless of prefix.
3. Ideally both: (1) for correctness, (2) for defensiveness.

### Why this matters beyond the log noise (please read before triaging as cosmetic)

With an empty prefix the adapter doesn't just *read* foreign keys — `keysSync()` reports them as strata keys,
so anything built on `keys()` operates on data the package doesn't own. `cleanupExpired()` calls
`remove(key)` for any key whose parsed value happens to carry an `expires` field in the past, and
`clear()`'s "clear all with our prefix" branch (line ~196) would match every key on the origin. A foreign
key that *is* valid JSON with an `expires` property could therefore be **deleted from another app's
storage**. The LabFlow case is benign only because its value fails to parse.

### Downstream status (LabFlow)

Not worked around in LabFlow — its logger's raw-string value is intentional and its "no `console.*`, one
centralized logger" rule is IRON-SOLID, so the correct fix is here. LabFlow records this in
`docs/PROJECT-RECORD.md` §9 as a known, non-fatal, third-party console-noise item pending this package.

### Resolution

- [ ] Fixed in version: `______` · date: `__________` · approach: `__________`
- [ ] Confirmed against the LabFlow repro above (foreign non-JSON key no longer produces an error log, and
      `keys()` no longer returns keys the adapter never wrote)
