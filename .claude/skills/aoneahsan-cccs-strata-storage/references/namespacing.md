# Namespacing — the probe evidence behind the rule (ISSUE-01)

> 🔴 **SUPERSEDED IN PART, 2026-09-01 — read this first.** Everything below was measured against
> `2.8.5`, and **`2.9.0` fixed the defects it describes** (ISSUE-01, 07, 08, 09, 10 are all closed).
> The measurements stay because they are the evidence; the **conclusions drawn from them no longer
> hold**:
>
> - **"Both `prefix` forms are silent no-ops" — no longer true.** Per-adapter config is applied
>   synchronously at registration in 2.9.0. The reason it looked broken is now known and is *not* what
>   this file guessed: the sync API is usable **before `initialize()` resolves**, and that window was
>   unconfigured. The probes below were synchronous, which is why they saw `""`.
> - 🔴 **"Treat the sweep as a latent risk, not a live one" — WRONG, corrected by measurement.** See
>   the correction at that paragraph.
> - **"`defaultStorages` does not protect the sync path" — fixed in 2.9.0.**
> - **A namespace is no longer what keeps the library off other keys.** Shape-based ownership is.
>   Namespacing is now for a clean keyspace.
>
> Current guidance: `SKILL.md`. This file is kept for the probe method and the historical record.


**Last Updated:** 2026-07-30 · Split out of `SKILL.md` when it exceeded the size budget. `SKILL.md` carries the
verdict and the actionable rule; this file carries the measurements they rest on, because they contradict each
other and a future session needs to see why.

## Why isolation matters at all

The web adapters default to prefix `''`, and `startsWith('')` matches **every** key on the origin. So an
unprefixed instance's housekeeping walks keys it does not own: the 60-second TTL sweep `JSON.parse`s other
apps' values (error-level console noise), and `cleanupExpired()` is documented as able to **delete a foreign
key** whose value happens to carry a past `expires` field. That is data loss, not cosmetics — which is why
`SKILL.md` states the namespace rule as a 🔴.

**It bites hardest on `file://`, where every document shares one origin.** A click dummy opened by
double-clicking writes into the same store as every other local page the owner has ever opened — the habitforge
probe found 24 foreign keys sitting on that origin.

## The measurement — `defineStorage` does not pass `prefix` down

Probed against **2.8.5** (habitforge click dummy), reading the physical key back out of `localStorage`:

| What you write | Physical key | `adapter.prefix` |
|---|---|---|
| `defineStorage({ prefix: 'myapp:' })` | `theme` | `""` — documented no-op |
| `defineStorage({ adapters: { localStorage: { prefix: 'myapp:' } } })` | `theme` | **`""` — ALSO a no-op** |
| `new LocalStorageAdapter()` + `initialize({ prefix: 'myapp:' })` | `myapp:theme` | `"myapp:"` |
| **`defineStorage({ namespace: 'myapp' })`** | **`myapp:theme`** | `""` |

The adapter honours `prefix` perfectly — `defineStorage` just never passes it down. So the only isolation
reachable through the normal API is `namespace`.

This corrects an earlier version of the guidance that said "there is no top-level `prefix`, configure per
adapter". The first half is true; **the second half does not work either**, and telling projects to write a
line that does nothing is worse than saying nothing.

Verified isolation: a second `defineStorage()` **without** the namespace reads `null` for the same logical key,
so namespaced values are genuinely partitioned.

## ⚠️ CONTESTED — a second project on the SAME version disagrees

lifewell (`redevelop-v1`, strata **2.8.5**, jsdom) uses the per-adapter form above and its keys **are**
physically prefixed: reading `localStorage` back gives `lifewell:theme` holding the JSON envelope, asserted by
`src/lib/storage.test.ts` including a negative control that detects an unprefixed key. Same version, same call
shape, opposite result to the habitforge probe.

### A THIRD measurement, 2026-08-03 — and it breaks the tie toward "it works"

clearhire's click dummy probed all three forms **in headless Chrome over `file://`**, against the vendored
IIFE build of npm `strata-storage@2.8.5`, reading the physical key back out of a real `localStorage`:

| Form | Physical key |
|---|---|
| `defineStorage({ prefix: 'ch:' })` | `probe` — no-op, agrees with habitforge |
| `defineStorage({ adapters: { localStorage: { prefix: 'ch:' } } })` | **`ch:probe` — it worked**, agreeing with lifewell |
| `defineStorage({ namespace: 'clearhire' })` | `clearhire:probe` — works |

So the per-adapter form is now **2 for 3**, and the one dissent (habitforge) is the oldest. That is enough to
say the form is not simply a no-op — and **not** enough to recommend it, because nobody has identified what
distinguishes the runs. Two of the three ran in a real browser and agree; the disagreeing one did too, so
"jsdom vs browser" does **not** explain it. Adapter construction order or a differing `initialize()` path
remain the open candidates.

🔴 **`namespace` is still the answer**, for the reason that survives the disagreement entirely: it is the only
form that has produced a prefixed key in every single measurement. Choosing the contested form to save a
config line is trading a known-good mechanism for an unexplained one.

🔴 **The actionable rule is the same either way, and it is the one that belongs in your head: never assume the
physical key. Write one, read it back out of the raw store, and pin it with a test.** Especially where a
pre-paint script depends on it — there the failure is a silent theme flash with nothing in the console.

## What the namespace does and does not buy

It stops *your* keys colliding with another app's on a shared origin — the failure that actually bites. It does
**not** narrow the adapter's own sweep, which still walks every key.

~~On the good-news side, that sweep is less dangerous than this guidance once claimed: on 2.8.5 the cleanup
timer is **not started** by `defineStorage`, and a direct `cleanupExpired()` did **not** delete planted
foreign keys carrying a past `expires`. Treat the sweep as a **latent** risk, not a live one.~~

🔴 **CORRECTED 2026-09-01 — that conclusion was wrong, and it under-rated a live data-loss bug.** Driving the
same scenario in a real browser against published 2.8.5: a planted foreign key `someOtherApp:session` holding
valid JSON with a past `expires` **was deleted**, and an unfiltered `clear()` removed **3 of 3** planted
foreign keys. The sweep was **live**, not latent.

**Why the original probe missed it, and the lesson:** `Strata.cleanupExpired()` returns `0` immediately when
`this.ttlManager` is undefined, and the TTL manager is only created by `initialize()`. The probe called
`cleanupExpired()` without awaiting initialization, so it measured a method that had returned before doing
anything — and "no keys were deleted" was read as "the sweep is safe" rather than "the sweep did not run".
🔴 **A negative result from a call that no-opped is not evidence of safety.** Confirm the operation actually
executed before drawing a conclusion from its not having done harm.

## ⚠️ `defaultStorages` does not protect the sync path

It reads like an ordered fallback list, so `['localStorage','memory']` looks safe. It is not: with
`localStorage` absent, `setSync` still selected it and threw `SerializationError`.

**Probe availability yourself** — a real write/read/delete inside a `try` — and pass the one adapter that
works. This matters most in a click dummy, where Safari and locked-down profiles are exactly the hosts that
lack the adapter.

## Reporting

ISSUE-01 is **CLOSED** — fixed in `2.9.0` (2026-09-01), along with ISSUE-06/07/08/09/10; the package's open
queue is empty. A package bug found while integrating goes to the package repo's
`docs/REPORTED-ISSUES.md` with full detail (`aoneahsan-cccs-report-project-issues`); ISSUE-01 is the model
entry for the level of detail expected.
