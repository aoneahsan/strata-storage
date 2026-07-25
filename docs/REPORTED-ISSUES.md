# strata-storage — Reported Issues (open queue)

The ONE place consumers/agents report strata-storage issues for the owner to fix HERE (in this package).
**Open entries only** — each one a `### ISSUE-NN — <title>` section with full detail (symptom, verbatim
errors, repro, affected version, root cause if diagnosed, reporter project + date). On fixing: MOVE the
entry to `docs/RESOLVED-ISSUES.md` (add resolution date + the fixing npm version) and mirror any
consumer-relevant guidance into the docs. External reporters may also use GitHub Issues; entries here are
the authoritative fix queue. Fleet rule: `~/.claude/rules/project-issue-reporting.md` (owner machines).

> Migrated 2026-07-20 from the root file `LABFLOW-REPORTED-ISSUES.md` (now removed; content preserved
> verbatim below, and in git history).

---

## Open

### ISSUE-01 — Empty-prefix adapters claim the entire `localStorage` namespace, then error-log on other apps' keys

**Status:** 🔴 OPEN · **Reported:** 2026-07-15 from LabFlow (private repo `aoneahsan/lab-system`) ·
**Affects:** `strata-storage@2.8.1`, `src/adapters/web/LocalStorageAdapter.ts` (and
`SessionStorageAdapter.ts`, same shape)

#### Symptom (as seen in LabFlow)

Console noise on every TTL cleanup tick / `keys()` call, of the form:

```
Failed to get key logger-level from localStorage: SyntaxError: Unexpected token 'w', "warn" is not valid JSON
```

It is non-fatal — `getSync()` catches per key and the sweep continues — but it pollutes the console of a
production app with errors that look like application faults, and it does so for a key **strata-storage
does not own**.

#### Root cause (verified against this repo's source, not inferred)

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

#### Repro

```js
localStorage.setItem('logger-level', 'warn');          // any foreign, non-JSON raw string
const s = new Strata();                                 // default config → empty prefix
await s.initialize();
await s.cleanupExpired();                               // → logger.error for the foreign key
```

#### Suggested fix (package-side — pick one; 1 is the real fix)

1. **Namespace-scope the sweep (preferred).** Don't let an empty prefix mean "everything". Either default the
   web adapters to a real namespace (e.g. `strata:`), or track adapter-owned keys explicitly so `keysSync()`
   can never return a key this adapter didn't write. This also fixes the more serious latent problem below.
2. **Tolerate non-JSON.** A `deserialize()` failure means "not one of ours / not readable" — treat it as a
   skip (return `null`) and log at **debug**, not `error`. Cheap, and correct regardless of prefix.
3. Ideally both: (1) for correctness, (2) for defensiveness.

#### Why this matters beyond the log noise (please read before triaging as cosmetic)

With an empty prefix the adapter doesn't just *read* foreign keys — `keysSync()` reports them as strata keys,
so anything built on `keys()` operates on data the package doesn't own. `cleanupExpired()` calls
`remove(key)` for any key whose parsed value happens to carry an `expires` field in the past, and
`clear()`'s "clear all with our prefix" branch (line ~196) would match every key on the origin. A foreign
key that *is* valid JSON with an `expires` property could therefore be **deleted from another app's
storage**. The LabFlow case is benign only because its value fails to parse.

#### Downstream status (LabFlow)

Not worked around in LabFlow — its logger's raw-string value is intentional and its "no `console.*`, one
centralized logger" rule is IRON-SOLID, so the correct fix is here. LabFlow records this in
`docs/PROJECT-RECORD.md` §9 as a known, non-fatal, third-party console-noise item pending this package.

#### Interim mitigation — now documented publicly (2026-07-25)

Still OPEN. Pending a fix, the package README states the defect plainly under **Limitations** and gives
consumers the workaround that exists today, since `initializeAdapters()` forwards adapter config through
to `adapter.initialize()`:

```typescript
defineStorage({ adapters: { localStorage: { prefix: 'myapp:' } } });
```

#### ⚠️ The real fix needs an owner decision — it is data-migrating, not just a code change

Suggested fix 1 ("default the web adapters to a real namespace, e.g. `strata:`") **changes where every
existing consumer's data lives.** Every key written by every prior version was stored unprefixed; a new
default prefix makes all of it unreadable on upgrade, with no error — reads simply return `null`. That is
a breaking change requiring a major version and a migration path (read-through to the unprefixed key,
rewrite under the prefix), not a patch.

Suggested fix 2 (treat a `deserialize()` failure as "not ours" — return `null`, log at `debug` instead of
`error`) is safe, non-breaking, and fixes the reported console-noise symptom on its own. It does **not**
fix the underlying namespace-claiming problem, which is the part with data-loss potential.

Owner decision needed on which path to take, and whether fix 2 ships first as a patch.

#### Resolution

- [ ] Fixed in version: `______` · date: `__________` · approach: `__________`
- [ ] Confirmed against the LabFlow repro above (foreign non-JSON key no longer produces an error log, and
      `keys()` no longer returns keys the adapter never wrote)

**Last updated:** 2026-07-25 (interim mitigation documented in the README; owner decision noted on the fix
path. Resolved entries from the same pass — ISSUE-02 … ISSUE-05 — are in `docs/RESOLVED-ISSUES.md`.)
