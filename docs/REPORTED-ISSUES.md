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

### ISSUE-09 — `defineStorage()` registers ALL six web adapters regardless of `defaultStorages`, so the expiry sweep reaches `sessionStorage` keys the instance was never meant to touch

**Status:** 🔴 OPEN · **Reported:** 2026-08-25 from LabFlow (private repo `aoneahsan/lab-system`,
Phase B wave 1 of the rebuild) · **Affects:** `strata-storage@2.8.5`, `defineStorage()` /
`registerWebAdapters()`, `src/core/BaseAdapter.ts` `cleanupExpired()`

#### Symptom

Every page load logged, at **error** level:

```
[strata-storage] Failed to get key _cltk from sessionStorage: SyntaxError: Unexpected token 's', "ts3hsf" is not valid JSON
```

`_cltk` is **Microsoft Clarity's** session key. It is written to `sessionStorage` by the Clarity tag, is
not JSON, and has nothing to do with this package.

#### Why this is NOT a duplicate of ISSUE-01 or ISSUE-08

ISSUE-01 is the empty-prefix `localStorage` case and ISSUE-08 is the per-adapter `prefix` option not
reaching the adapter. This is a third, separate fact, and it is the one that makes the other two
unavoidable rather than merely awkward:

🔴 **`defaultStorages` selects which adapters are READ, not which are REGISTERED.** `defineStorage()` is
`registerWebAdapters(new Strata(config))`, which registers all six web adapters unconditionally. The
expiry sweep in `BaseAdapter.cleanupExpired()` then enumerates every key in **every registered adapter**
and deserialises it — so an instance that only ever reads `localStorage` still walks `sessionStorage`,
`indexedDB`, cookies and the Cache API on a timer.

🔴 **Measured, not inferred:** setting `defaultStorages: ['localStorage']` was tried **first** and did
**not** fix it — re-driving the app produced the identical line. Only constructing `Strata` directly and
registering `MemoryAdapter` + `LocalStorageAdapter` by hand stopped it.

🔴 **The instance was namespaced and it made no difference.** It was constructed with
`namespace: 'labflow'` and still read, parsed and error-logged about `_cltk`. A namespaced storage
library should never read, parse, or log about a key outside its own namespace — that is the defect,
independently of which adapter the key lives in.

#### Repro

Any page that loads both strata-storage and Microsoft Clarity. Without Clarity:

```js
sessionStorage.setItem('_cltk', 'ts3hsf');   // any foreign, non-JSON raw string
const s = defineStorage({ namespace: 'anything', defaultStorages: ['localStorage'] });
await s.initialize();
await s.cleanupExpired();                     // → logger.error for a sessionStorage key
```

#### Suggested fix

Register only the adapters the instance will use, and make the sweep namespace-aware: enumerate keys
carrying the instance's own prefix and skip everything else rather than deserialising it to find out. A
foreign key that fails to parse should never reach `logger.error` — the package learning it cannot parse
somebody else's value is not an application error.

#### Worked around in the reporting project

`labflow/src/lib/storage/index.ts` constructs `Strata` directly and registers only `MemoryAdapter` and
`LocalStorageAdapter`. The workaround is in place, so nothing is blocked here — this is filed so the
package can fix the cause.

---

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

#### Second consumer, independently — ClearHire, 2026-08-22, on `2.8.5`

Reported from ClearHire (private repo `aoneahsan/clearhire`, branch `redevelop-v1`), found by USING the app
in a browser rather than by any gate. Same root cause, four minor versions later, so recording it here rather
than opening a duplicate.

```
[strata-storage] Failed to get key _cltk from sessionStorage: SyntaxError:
Unexpected non-whitespace character after JSON at position 1
```

Chain: `TTLManager.cleanup` → `Strata.cleanupAllAdapters` → `SessionStorageAdapter.keys` → `keysSync` →
`getSync` → `deserialize`. It fires **twice on every page load** — once from `cleanupExpired` and once from
`cleanupAllAdapters`.

**🔴 What is new here, and it is not the adapter.** LabFlow's trigger was `logger-level`, a key **LabFlow
itself writes**. ClearHire's is `_cltk` (measured value `1psy75t`), written by **Microsoft Clarity** — a
third-party SDK. The consumer does not control that key, cannot change its format, and cannot stop it being
written without removing analytics the product is required to carry. So the "it is the other app's unusual
value" reading of ISSUE-01 does not survive a second data point: **any origin running any third-party script
that uses raw-string storage reproduces this**, which is most origins.

**🔴 AND THE DOCUMENTED MITIGATION DOES NOT WORK — this is the part worth triaging on.** The interim
mitigation above tells consumers to pass `defineStorage({ adapters: { localStorage: { prefix: 'myapp:' } } })`.
**ISSUE-08 in this same file reports that this config never reaches the adapter and is a silent no-op.**
Read together: a consumer whose trigger is a third-party key has *no* available remedy — they cannot change
the foreign value (it is not theirs) and the prefix workaround does not take effect. That combination is
what makes suggested fix 2 (treat a `deserialize()` failure as "not ours" — return `null`, log at `debug`)
worth shipping as a patch on its own, ahead of the data-migrating fix 1.

**Downstream status (ClearHire):** not worked around. `console.*` is banned there and the noise comes from
this package's own logger, so the fix belongs here. Recorded in that project's wave-3 tracker as `D-W3-05`.

#### Resolution

- [ ] Fixed in version: `______` · date: `__________` · approach: `__________`
- [ ] Confirmed against the LabFlow repro above (foreign non-JSON key no longer produces an error log, and
      `keys()` no longer returns keys the adapter never wrote)
- [ ] Confirmed against the ClearHire case: with Microsoft Clarity active (`_cltk` in `sessionStorage`), a
      page load produces no `strata-storage` error log

---

### ISSUE-06 — Version claims in the repo's own docs contradict `package.json` and each other

**Status:** 🟡 OPEN · **Reported:** 2026-07-29 while refreshing the global `aoneahsan-cccs-strata-storage`
skill · **Affects:** documentation only — no runtime impact · **Severity:** low

#### Symptom

Three in-repo statements about the current version disagree, so an agent or contributor reading any one of
them alone reaches a false conclusion about what is released:

| Source | Claim |
|---|---|
| `package.json:3` | version is **`2.8.5`** |
| `CHANGELOG.md:8,16` | `[2.8.5] - 2026-07-25` and `[2.8.4] - 2026-07-25` both released |
| `CLAUDE.md:11-13` | npm `latest` is **`2.8.2`, a bad release**; "the repo is at **2.8.3** … **awaiting `npm publish` by the owner**" |
| `docs/MANUAL-TASKS.md:17-18,43` | `2.8.3` "was published 2026-07-25 and is now `latest`"; the publish row is ticked **done** 2026-07-25 |

`CLAUDE.md` is contradicted by `MANUAL-TASKS.md` on whether 2.8.3 shipped, and by `package.json` +
`CHANGELOG.md` on the current version — it is two releases stale and still describes a publish that its own
sibling file records as completed.

Separately, **ISSUE-01 above carries `Affects: strata-storage@2.8.1`** while remaining open through 2.8.5.
A reader on 2.8.5 can reasonably read that header as "already fixed", which is the opposite of the truth,
and consumer skills copied the ≤2.8.1 framing.

#### Why it matters

`CLAUDE.md` is the first file an agent reads in this repo, and it is the one asserting a bad `latest` and a
pending publish. Acting on it produces a wrong deprecation call, a duplicate publish attempt, or a version
bump from the wrong base.

#### Suggested fix (docs only)

1. Refresh `CLAUDE.md:8-13` to the real state: current version, the actual open-issue count, and the 2.8.2
   deprecation status as recorded in `docs/MANUAL-TASKS.md` — or replace the version prose with a pointer to
   `MANUAL-TASKS.md`/`CHANGELOG.md` so there is one home for it rather than three.
2. Change ISSUE-01's header to `Affects: ≤ 2.8.5 (still open)`, or add "still reproduces on `<version>`" and
   keep it current as versions ship — an `Affects:` pinned to first-sighting reads as a fixed range.
3. Consider making the version line in `CLAUDE.md` a pointer rather than a value; a hand-copied version
   number in a fourth place will drift again.

#### Resolution

- [ ] Fixed in version: `______` · date: `__________` · approach: `__________`
- [ ] `CLAUDE.md`, `MANUAL-TASKS.md`, `CHANGELOG.md` and `package.json` agree; ISSUE-01's affected range is
      current

**Last updated:** 2026-07-29 (ISSUE-06 added — version-claim drift across `CLAUDE.md`, `MANUAL-TASKS.md` and
`package.json`, plus ISSUE-01's stale `Affects:` range. Earlier, 2026-07-25: interim mitigation documented in
the README; owner decision noted on the ISSUE-01 fix path. Resolved entries from that pass — ISSUE-02 …
ISSUE-05 — are in `docs/RESOLVED-ISSUES.md`.)

---

### ISSUE-07 — An unscoped `subscribe()` throws, because it attaches to adapters that cannot subscribe

**Reported by:** LifeWell click dummy (`lifewell-project-root/click-dummy/db.js`) · 2026-07-29
**Affected version:** 2.8.5 (current) · **Severity:** high — it kills application boot
**Symptom (verbatim):**

```
NotSupportedError: Operation 'subscribe' is not supported by indexedDB adapter
    at J.subscribe (strata.iife.js:1:49502)
    at i (strata.iife.js:1:36939)
    at c.subscribe (strata.iife.js:1:36979)
```

**Repro.** Create an instance that registers the default web adapters, then subscribe with no options —
the shape the docs describe as "omit options to hear every adapter":

```js
const storage = defineStorage({ adapters: { localStorage: { prefix: 'app:' } } });
storage.subscribe(change => render(change));   // throws
```

**Root cause.** `Strata.subscribe` fans the subscription out across every registered adapter and does not
skip the ones whose `subscribe` is unimplemented. `IndexedDBAdapter.subscribe` throws `NotSupportedError`
rather than returning a no-op unsubscribe, so the first unsupported adapter aborts the whole call. Because
the default registration includes `indexedDB`, the documented "hear everything" form is unusable on any
instance built with the defaults.

**Consequence.** The throw propagates out of whatever set up the subscription — in our case the store's
boot promise — so the app does not start. There is no partial-success path: the caller cannot tell which
adapters did attach.

**Suggested fix (in preference order).**
1. `subscribe()` skips adapters that do not implement it, and returns an unsubscribe closing over the ones
   that did. An observer that hears fewer backends is the expected outcome of "hear every adapter" when
   some cannot speak.
2. Failing that, have `IndexedDBAdapter.subscribe` return a no-op unsubscribe instead of throwing —
   `NotSupportedError` is right for a direct call and wrong for a fan-out.
3. At minimum, document that the options-less form is unsafe whenever `indexedDB` or `cache` is
   registered, which is every default instance.

**Consumer workaround (in use).** Scope every subscription to a backend that supports it:

```js
storage.subscribe(cb, { storage: 'localStorage' });
```

**Note.** Cross-tab change delivery for `localStorage` needs no `sync` feature — the adapter attaches a
`storage`-event listener itself — so the scoped form loses nothing for the common case.

---

### ISSUE-08 — `defineStorage({ adapters: { localStorage: { prefix } } })` never reaches the adapter, so the documented ISSUE-01 mitigation is a silent no-op

**Status:** 🔴 OPEN · **Reported:** 2026-07-30 from the HabitForge click dummy
(`habitforge-project-root/click-dummy`) · **Affects:** `strata-storage@2.8.5`

#### Symptom

The per-adapter `prefix` is the mitigation ISSUE-01 tells consumers to apply, and the fleet skill
(`aoneahsan-cccs-strata-storage`) has been instructing every project to write it. It does nothing: values
are stored at the bare logical key and `adapter.prefix` stays `""`.

#### Repro (measured, not inferred)

Reading the physical key straight back out of a `localStorage` stand-in:

```js
const s = defineStorage({
  adapters: { localStorage: { prefix: 'hf-dummy:' } },
  defaultStorages: ['localStorage'],
});
s.setSync('axis:theme', 'dark');
// physical keys -> ["axis:theme"]        expected ["hf-dummy:axis:theme"]
// s.getRegistry().get('localStorage').prefix -> ""   expected "hf-dummy:"
```

The adapter itself is correct — it is only `defineStorage` that drops the option:

```js
const a = new LocalStorageAdapter();
console.log(a.prefix);                       // ""
await a.initialize({ prefix: 'hf-dummy:' });
console.log(a.prefix);                       // "hf-dummy:"   ← honoured
a.setSync('k', 'v');
// physical keys -> ["hf-dummy:k"]           ← correct
```

So `initialize({ prefix })` works and the config path to it does not.

| What the consumer writes | Physical key | `adapter.prefix` |
|---|---|---|
| `defineStorage({ prefix: 'x:' })` | `theme` | `""` — already documented as a no-op |
| `defineStorage({ adapters: { localStorage: { prefix: 'x:' } } })` | `theme` | **`""` — this issue** |
| `new LocalStorageAdapter()` + `initialize({ prefix: 'x:' })` | `x:theme` | `"x:"` |
| `defineStorage({ namespace: 'x' })` | `x:theme` | `""` |

#### Why it matters more than it looks

ISSUE-01's guidance is the only isolation advice consumers are given, and it is reachable only through
`defineStorage` — so **every project that followed it is still running the empty default** and believes
otherwise. That is worse than no guidance, because it removes the prompt to check.

It bites hardest on `file://`, where **every document shares a single origin**: an unprefixed dummy or
local tool writing keys named `habits`, `settings` or `theme` collides with every other local page the
user has ever opened.

#### Suggested fix

Pass the per-adapter config through to `adapter.initialize()` in `defineStorage`'s adapter setup — the
adapter already accepts and honours it, so this looks like a plumbing gap rather than a design decision.
If the intent is that `namespace` supersedes `prefix`, then say so in ISSUE-01 and in the docs, and
consider deprecating the per-adapter `prefix` so it cannot be written silently.

#### Two related findings from the same session, both worth folding into the docs

1. **`defaultStorages` does not protect the sync path.** It reads as an ordered fallback list. With
   `localStorage` unavailable, `defineStorage({ defaultStorages: ['localStorage','memory'] }).setSync(...)`
   still selected `localStorage` and threw `SerializationError: Failed to store key k in localStorage`
   rather than falling through to `memory`. Consumers must probe availability themselves.
2. **The ISSUE-01 sweep is latent, not live, on 2.8.5 — good news worth recording.** After
   `defineStorage(...)`, `adapter.ttlCleanupInterval` was **not set** (no timer started), and an explicit
   `cleanupExpired()` did **not** delete planted foreign keys carrying a past `expires`
   (`someOtherApp:session`, `plainForeignKey` both survived). ISSUE-01's data-loss path therefore did not
   reproduce in this configuration. Worth confirming against a real browser before softening ISSUE-01's
   severity.

**Consumer workaround (in use).** `defineStorage({ namespace: 'hf-dummy' })` — it does prefix the physical
key (`hf-dummy:axis:theme`), and a second instance without the namespace reads `null` for the same logical
key, so the partition is real.
