# strata-storage — Resolved Issues (history)

Entries move here from `docs/REPORTED-ISSUES.md` when fixed — resolution date + the fixing npm version
added, original detail kept, never deleted. Fleet rule: `~/.claude/rules/project-issue-reporting.md`
(owner machines).

---

> **2026-09-01 — the entire open queue closed in `2.9.0`.** Six entries from five consumer projects
> (LabFlow, ClearHire, HabitForge, LifeWell, Trizlink). Four of them were one root cause seen from four
> angles: web adapters share a storage area with every other script on the origin, and the default empty
> key prefix made a name test match everything there. Fixed by identifying our own data by **shape** — a
> stored value counts as ours only if it is a `StorageValue` envelope. Every fix below was verified by
> driving the reporter's own repro in a real browser against published `2.8.5` first, then against the
> release. `docs/REPORTED-ISSUES.md` is now empty.

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

#### ✅ Resolution — fixed in `2.9.0`, 2026-09-01

**Approach: ownership by SHAPE, not by name.** An adapter now treats a key as its own only when the
stored value deserializes into a `StorageValue` envelope (`isStorageEnvelope`, exported). With an empty
prefix a name test cannot distinguish our data from another script's; shape can. `keys()`, the TTL sweep
and `clear()` are all bounded by it, and a value we cannot read is skipped at `debug` — a foreign value
is not an error, it is evidence the key belongs to somebody else.

🔴 **The owner decision this entry asked for is answered, and neither of the two options offered was
taken.** Suggested fix 1 (default the adapters to a `strata:` namespace) is data-migrating and was
deferred to **3.0.0** — see root `PENDING-TASKS.md` `TASK-001`; it will be built *on* this release,
because deciding whether a bare key is ours during a migrate-on-read is exactly what the shape check
answers. Suggested fix 2 (tolerate non-JSON) fixes only the log noise. The shape check delivers the
isolation of 1 with the compatibility of 2: no key moves, nothing needs migrating.

🔴 **Correction to this entry's own severity assessment.** ISSUE-08's related finding 2 recorded the
data-loss path as "latent, not live on 2.8.5". Driving the repro in a real browser against published
2.8.5 showed it **firing**: a planted foreign key `someOtherApp:session` holding valid JSON with a past
`expires` was **deleted**, and an unfiltered `clear()` removed **3 of 3** planted foreign keys. The
earlier reading came from a configuration where `Strata.cleanupExpired()` returns early because the TTL
manager does not exist before `initialize()`.

**Verified in Chrome (Chrome for Testing), published 2.8.5 → local 2.9.0:**

| Check | 2.8.5 | 2.9.0 |
|---|---|---|
| LabFlow repro — `logger-level` = `warn` produces an error log | ✗ 4 errors | ✓ 0 |
| ClearHire/Trizlink repro — `_cltk` in `sessionStorage` produces an error log | ✗ 3 errors | ✓ 0 |
| `keys()` returns foreign keys | ✗ leaked `foreignJson` | ✓ none |
| Foreign key with a past `expires` survives the sweep | ✗ deleted | ✓ intact |
| `clear()` leaves foreign keys alone | ✗ 0/3 survived | ✓ 3/3 survived, ours still cleared |

- [x] Fixed in version: `2.9.0` · date: `2026-09-01` · approach: shape-based ownership
- [x] Confirmed against the LabFlow repro (no error log; `keys()` returns only our own keys)
- [x] Confirmed against the ClearHire case (`_cltk` present, page load produces no `strata-storage` error)

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

#### ✅ Resolution — fixed in `2.9.0`, 2026-09-01

`CLAUDE.md` and `AGENTS.md` no longer carry a version value at all — the prose that claimed npm `latest`
was `2.8.2` with `2.8.3` "awaiting publish" is replaced by a pointer to `CHANGELOG.md` and
`docs/MANUAL-TASKS.md`, so there is one home for the fact instead of four. ISSUE-01's stale
`Affects: 2.8.1` framing is moot now that it is closed.

🔴 **Corrected with a gate, not just an edit.** `yarn build` now fails when the README's at-a-glance
`| **Version** | \`x.y.z\` |` row disagrees with `package.json`, and when the row is missing entirely.
That row is what npmjs.com renders, it is hand-maintained, and it had already shipped stale once (2.8.5).
The gate was watched failing against both shapes — a wrong version and a deleted row — before being
trusted.

- [x] Fixed in version: `2.9.0` · date: `2026-09-01` · approach: single source + a build gate
- [x] `CLAUDE.md`, `MANUAL-TASKS.md`, `CHANGELOG.md` and `package.json` agree

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

#### ✅ Resolution — fixed in `2.9.0`, 2026-09-01

**Suggested fix 1 was taken.** `Strata.subscribe` skips adapters whose `capabilities.observable` is
false and returns an unsubscribe closing over the ones that did attach — an observer that hears fewer
backends is the expected outcome of "hear every adapter" when some cannot speak. A `subscribe()` that
throws from inside a custom adapter is caught and skipped too, so one misbehaving adapter cannot cost the
caller every other subscription. Naming a non-observable backend **explicitly** now logs a warning that
says the subscription will never fire, rather than failing silently — the caller asked for something
specific.

**Verified in Chrome, LifeWell's exact two lines**, on a default instance registering `indexedDB`:

| Check | 2.8.5 | 2.9.0 |
|---|---|---|
| `storage.subscribe(cb)` with no options | ✗ `NotSupportedError: Operation 'subscribe' is not supported by indexedDB adapter` | ✓ no throw |
| callback still receives a `localStorage` change | ✗ never fired | ✓ fired |

The consumer workaround (`{ storage: 'localStorage' }`) remains valid and is still the tighter thing to
write when only one backend matters.

- [x] Fixed in version: `2.9.0` · date: `2026-09-01` · approach: skip non-observable adapters in the fan-out

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

#### ✅ Resolution — fixed in `2.9.0`, 2026-09-01

**The reporter's diagnosis was right and the cause was one level further down.** `initializeAdapters()`
did forward the per-adapter config — but the **synchronous API is deliberately usable before
`initialize()` resolves** (`selectAdapterSync` falls back to the registry), so an adapter reached that
way had never been configured and its `prefix` was still `""`. The repro is synchronous (`s.setSync(...)`
with no `await`), which is exactly that window. That is also why
`getRegistry().get('localStorage').prefix` read `""`.

Adapters now apply configuration **synchronously at registration** via a new `configure()` step, so the
prefix is live before any operation, sync or async. `initialize(config)` still works unchanged and calls
the same code. The late-registration path in `selectAdapter()`, which called `initialize()` with no
config at all, now passes it.

**Both related findings are fixed too, not just noted:**

1. **`defaultStorages` now protects the sync path.** It reads as an ordered fallback list and behaved as
   one only for the async API. `selectAdapterSync` walks the list and picks the first backend that is
   *synchronously usable*, via a new optional `isAvailableSync()`. Verified: with `localStorage` writes
   blocked, `defineStorage({ defaultStorages: ['localStorage','memory'] }).setSync('k','v')` threw
   `QuotaExceededError` on 2.8.5 and lands in `memory` on 2.9.0.
2. **The sweep was NOT latent — see the correction under ISSUE-01.** Measured live in a browser against
   published 2.8.5, a planted foreign key carrying a past `expires` was deleted and `clear()` removed all
   three planted foreign keys. The "did not reproduce" reading came from `Strata.cleanupExpired()`
   returning early before `initialize()` creates the TTL manager.

**Verified in Chrome, HabitForge's exact repro:**

| | 2.8.5 | 2.9.0 |
|---|---|---|
| physical keys after `setSync('axis:theme','dark')` | `["axis:theme"]` | `["hf-dummy:axis:theme"]` |
| `getRegistry().get('localStorage').prefix` | `""` | `"hf-dummy:"` |

The `namespace` workaround remains valid and unchanged. 🔴 Note the isolation reasoning has moved on:
after 2.9.0 neither a prefix nor a namespace is what keeps this library off other applications' keys —
shape-based ownership is. A prefix is now for a clean keyspace, not for safety.

- [x] Fixed in version: `2.9.0` · date: `2026-09-01` · approach: synchronous `configure()` at registration

---

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

#### ✅ Resolution — fixed in `2.9.0`, 2026-09-01

**Both halves of this report are addressed, and the second one is the real fix.**

1. **Registration is now controllable.** `adapters: { <name>: false }` opts an adapter out of
   *registration*, not merely initialization — `defineStorage` passes its config to
   `registerWebAdapters`, so an instance that only uses `localStorage` can register only what it needs.
2. **The sweep is harmless regardless.** 🔴 This is the part that matters, because the reporter's core
   objection — *"a namespaced storage library should never read, parse, or log about a key outside its own
   namespace"* — is now true **by construction, in every adapter, whatever is registered**. Ownership is
   decided by envelope shape, so a foreign key is never parsed-to-find-out, never returned by `keys()`,
   never deleted by the sweep, and never reaches `logger.error`.

🔴 **`defaultStorages` was behaving as documented, and the documentation was too thin.** It is the
preference order for choosing the *default* adapter; multi-adapter operations deliberately span
everything registered. That sentence existed nowhere, which is what made the behaviour read as a bug.
It is now stated in the README config table, in the code, and on the docs site.

**Verified in Chrome:** with `_cltk` = `ts3hsf` in `sessionStorage` and an instance configured
`{ defaultStorages: ['localStorage'] }`, a full sweep across every registered adapter produced **7
`logger.error` lines on 2.8.5 and 0 on 2.9.0**. Raising the level with the newly-exported
`setLogLevel('debug')` shows the skip instead:
`sessionStorage: skipping key "_cltk" — value is not readable as sessionStorage data (not written by this adapter).`

The LabFlow workaround (constructing `Strata` directly and registering two adapters by hand) can be
removed; `defineStorage` is safe again.

- [x] Fixed in version: `2.9.0` · date: `2026-09-01` · approach: shape-based ownership + registration opt-out

---

### ISSUE-10 — With no namespace, TTL cleanup reads every other script's sessionStorage keys and logs an error for each


**Reported by:** Trizlink (`trizlink/src/services/storage.ts`, live at trizlink.com) · 2026-09-01
**Affected version:** 2.8.5 (current) · **Severity:** medium — no crash; a permanent error stream
**Symptom (verbatim, from the browser console on every page):**

```
Failed to get key _cltk from sessionStorage: SyntaxError: Unexpected token 'j', "jkl9..." is not valid JSON
```

**Repro.** Build an instance with **no namespace** — which is the correct configuration for any app whose
physical storage keys are frozen and cannot gain a prefix — then let the TTL sweep run on a page that also
loads a third-party script writing to `sessionStorage` (Microsoft Clarity writes `_cltk`):

```js
const storage = defineStorage();          // no namespace, so prefix === ''
// …anything that triggers the periodic sweep, or an explicit:
await storage.cleanupExpired();
```

**Root cause.** `SessionStorageAdapter.keysSync` selects its own keys with
`fullKey.startsWith(this.prefix)` (`src/adapters/web/SessionStorageAdapter.ts:226`). With no namespace the
prefix is the empty string, and **every string starts with the empty string** — so the adapter claims every
key in a storage area it shares with every other script on the page. `BaseAdapter.cleanupExpired`
(`src/core/BaseAdapter.ts:69-82`) then calls `get()` on each, and `getSync` runs `deserialize` — a
`JSON.parse` — over a value the library never wrote (`SessionStorageAdapter.ts:78`).

**Consequence.** `getSync` catches the parse failure and returns `null`, so nothing breaks — but it reports
it through `logger.error` first (`SessionStorageAdapter.ts:88`). Any consumer that routes its logger into an
error tracker therefore receives one report per foreign key per sweep, forever. On Trizlink that is Sentry,
and the noise is on every page a visitor loads.

🔴 **The failure is in the classification, not the parse.** A value that is not a `StorageValue` envelope on
a key this library never wrote is not an error — it is evidence the key belongs to somebody else, which is
the ordinary case in a shared storage area. Reporting it as a failure asserts something untrue about the
consumer's own data.

**Suggested fix.** Where the prefix is empty the adapter cannot identify its own keys by name, so it must
identify them by shape: treat a value that does not deserialize into a `StorageValue` envelope as *not ours*
— skip it silently in `keysSync` and `cleanupExpired`, and reserve `logger.error` for a key that carries our
envelope and still fails. A parse failure would then be a real defect again, which it currently cannot be.

**Why the consumer cannot work around it.** Trizlink's nine device storage keys are frozen
(`02-FROZEN-CONTRACTS.md`), so adding a namespace would change every physical key and sign every installed
user out. The namespace workaround recorded under ISSUE-01 is unavailable here by design.

#### ✅ Resolution — fixed in `2.9.0`, 2026-09-01

🔴 **Renumbered from a second `ISSUE-09` on filing into the resolved queue.** This entry and the
LabFlow/ClearHire one were both filed as `ISSUE-09`; that one was reported first (2026-08-25) and keeps
the number. A number is never reused.

**The reporter's suggested fix is what shipped, in the reporter's own words:** *"where the prefix is
empty the adapter cannot identify its own keys by name, so it must identify them by shape."* That is
exactly `isStorageEnvelope`. `keysSync` and the sweep skip anything that is not our envelope, and
`logger.error` is now reserved for a key that carries our envelope and still fails — so, as the report
put it, a parse failure is a real defect again, which it previously could not be.

**Verified against trizlink's exact configuration** (`src/services/storage.ts`, both instances verbatim —
`themeStorage` with `namespace: 'trizlink'`, `deviceStorage` with none):

| Check | Result on 2.9.0 |
|---|---|
| `logger.error` lines during a full sweep with `_cltk` present | **0** |
| Physical keys written | `trizlink-auth-storage`, `trizlink:logLevel`, `trizlink:theme` — **unchanged** |
| Pre-paint contract (`trizlink:<axis>` → `JSON.parse(raw).value`) | resolves, `"dark"` |
| `logger.ts` direct read of the bare `trizlink:logLevel` | resolves |
| Skip visible at `debug` level | yes, naming the key and the reason |

🔴 **The frozen contract is honoured: no key moved.** `02-FROZEN-CONTRACTS.md` §9 freezes trizlink's nine
device keys against renaming, and this release changes none of them — which is precisely why the
default-namespace option was deferred to 3.0.0 rather than shipped here. Trizlink needs a version bump
and no code change.

- [x] Fixed in version: `2.9.0` · date: `2026-09-01` · approach: shape-based ownership

---

### ISSUE-02 — `dist/package.json` declared the package name, so `npm publish` from `dist/` would ship the wrong tree

**Status:** ✅ RESOLVED · **Reported + fixed:** 2026-07-25 during the package-standard pass ·
**Affected:** every published version up to and including `2.8.3` · **Fixed in:** unreleased (next publish) ·
**Severity:** 🔴 critical — packaging

#### Symptom

Two `package.json` files in the repository declared `"name": "strata-storage"`:

```text
strata-storage  2.8.3  ./package.json
strata-storage  2.8.3  ./dist/package.json      ← generated by scripts/build.js, and shipped in the tarball
```

`npm publish` resolves the package from the **current working directory**. With a complete second manifest
inside `dist/`, `cd dist && npm publish` succeeds and publishes the contents of `dist/` as
`strata-storage@<version>` — no README of record, no `AI-INTEGRATION-GUIDE.md`, no native `ios/`/`android/`
sources — and npm reports success.

#### Root cause

`scripts/build.js` built a full distribution manifest and wrote it to `dist/package.json`, copying `name`,
`version`, `description`, `exports`, `author`, `license`, `repository`, `bugs`, `homepage`, `keywords`,
`peerDependencies`, `capacitor` and `engines` from the root manifest.

None of it was ever used. Consumer resolution is governed entirely by the **root** manifest's `exports`
map, which forbids deep imports into `dist/`, so the nested `exports` block was unreachable. The only
field doing work was `type: "module"`, and the root manifest already declares that.

This is the structural enabler of the **2.8.2 incident** (2026-06-30): a publish from a stale tree whose
compiled output was byte-identical to 2.8.1 but whose bundled documentation had reverted, dropping the
required `npx cap sync` instructions. It passed typecheck, lint, build and install, and sat as `latest`
for 25 days.

#### Fix

`scripts/build.js` now writes a two-field module marker and nothing else:

```json
{
  "type": "module",
  "sideEffects": false
}
```

With no `name` and no `version`, `npm publish` inside `dist/` fails immediately instead of succeeding
wrongly. `type` keeps the emitted `.js` files pinned to ESM and `sideEffects` keeps bundlers tree-shaking a
deep import; resolution behaviour is unchanged.

#### Verified

- `find . -name package.json -not -path '*/node_modules/*'` now reports exactly one `strata-storage`.
- `yarn build` green; all 13 `exports` targets still resolve on disk.
- The packed tarball installs into a clean directory and every entry point imports.

---

### ISSUE-03 — `CHANGELOG.md` was missing from the published tarball

**Status:** ✅ RESOLVED · **Reported + fixed:** 2026-07-25 · **Affected:** `2.8.3` and earlier ·
**Fixed in:** unreleased (next publish)

#### Symptom

`npm pack --dry-run` listed 117 files with no `CHANGELOG.md`, so an installed copy of the package carried
no version history — the one file a consumer reads to decide whether an upgrade is safe. That mattered
more than usual here, because 2.8.2's deprecation notice and the reason for it live in that file.

#### Root cause

`files` in `package.json` is an allowlist, and `CHANGELOG.md` was not on it. npm always adds
`package.json`, the README, the LICENSE and the `main` entry regardless of `files` — but **not** the
changelog. The `files` array named only `dist/`, `ios/`, `android/`, `scripts/`, the podspec and
`AI-INTEGRATION-GUIDE.md`, so the changelog was silently dropped.

#### Fix

Added `"CHANGELOG.md"` to `files`, plus `"README.md"` and `"LICENSE"` explicitly — the latter two were
already included implicitly, and naming them makes the intent readable rather than relying on npm's
defaults.

#### Verified

`npm pack --dry-run` now lists `CHANGELOG.md`, and it is present in the extracted tarball.

---

### ISSUE-04 — `package.json` metadata gaps: no `funding`, `homepage` pointed away from the docs, non-canonical `repository.url`

**Status:** ✅ RESOLVED · **Reported + fixed:** 2026-07-25 · **Affected:** `2.8.3` and earlier ·
**Fixed in:** unreleased (next publish)

#### Symptom

Confirmed against the live registry (`https://registry.npmjs.org/strata-storage/latest`):

```text
version: 2.8.3 | homepage: https://stratastorage.aoneahsan.com | funding: undefined
```

1. **`funding` absent** — npm's funding link and `npm fund` showed nothing for this package.
2. **`homepage` pointed at the marketing site**, so npmjs.com's primary link sent readers to marketing
   copy rather than to the documentation they were looking for.
3. **`repository.url` was `https://github.com/…` without the `git+` scheme prefix** npm expects for a git
   remote.

The repository URL itself resolves — `https://api.github.com/repos/aoneahsan/strata-storage` returns 200,
`visibility: public` — so the "Repository" link on npmjs.com was never broken.

#### Fix

```jsonc
"repository": { "type": "git", "url": "git+https://github.com/aoneahsan/strata-storage.git" },
"homepage": "https://stratastorage-docs.aoneahsan.com",
"funding": "https://aoneahsan.com/payment?project-id=strata-storage&project-identifier=strata-storage"
```

The marketing site remains linked from the README's Links table, so nothing became less discoverable.

#### Verified

Both URLs probed at 200; the funding link is the standard support form with both query parameters.

---

### ISSUE-05 — the post-install banner taught a superseded API and overclaimed Node support

**Status:** ✅ RESOLVED · **Reported + fixed:** 2026-07-25 · **Affected:** `2.8.3` and earlier ·
**Fixed in:** unreleased (next publish)

#### Symptom

`scripts/postinstall.js` runs on every install and prints the first code a new user sees. It showed:

```text
📚 Quick Start:
   import { Strata } from "strata-storage";
   const storage = new Strata();
   await storage.initialize();
   await storage.set("key", "value");
```

That still works, but it is not the documented entry point — the README teaches the default `storage`
instance, which needs no `initialize()` call. The banner also claimed the package "Works everywhere - Web,
Node.js, Mobile", which overstates Node: outside a browser only the `memory` adapter is available, so
nothing persists across processes. Its Capacitor branch mentioned `yarn cap sync` in passing rather than
presenting it as the required step it is.

Documentation drift inside the shipped tarball is precisely the failure class that produced the 2.8.2
incident, so the banner is treated as release content rather than decoration.

#### Fix

The snippet now matches the README's Quick Start exactly, the Capacitor branch leads with `npx cap sync`
and states plainly that native adapters fail on device without it, and the feature list no longer claims
first-class Node support.

#### Verified

`node scripts/postinstall.js` runs clean, and its snippet is the README's Quick Start body.

---

**Last updated:** 2026-07-25 (ISSUE-02 … ISSUE-05 resolved during the package-standard pass)
