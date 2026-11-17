# The three sanctioned exceptions — in full

**Last Updated:** 2026-11-06 (third exception, owner decision) · Split out of `SKILL.md` when it exceeded the
size budget.

`SKILL.md` states the rule (every web storage API goes through strata) and names these three. This file is the
detail. **Each exists because something else already owns the contract**: *timing* in the first case, *format*
in the second, *the service-worker lifecycle* in the third. Nothing else qualifies, and **a new exception is
added to this file or it is a violation.**

## 1. The pre-paint theme script — timing

An inline `<head>` script runs **before any module loads**, so no API exists for it to call; it reads the raw
key. What makes that safe is reading exactly what strata wrote, and recording the coupling beside **both**
halves so a prefix change cannot silently reintroduce the flash.

Two things it must get right:

- **The physical key is `<namespace>:` + key** (`myapp:theme`). The adapter `prefix` never reaches the adapter
  through `defineStorage`, so the namespace is what you will actually find on disk — and per
  `references/namespacing.md`, that claim is contested across projects, so **read the key back and pin it with
  a test** rather than trusting either observation.
- **The stored value is a JSON wrapper**, so the script needs `JSON.parse(raw).value` — never the raw string.
  A script that treats the raw string as the value silently gets `undefined` and falls back to the default
  theme, which looks exactly like "the preference did not save".

The snippet itself, and the contract comment that must sit beside both halves:
`aoneahsan-cccs-tailwind-v4`, its tokens reference.

Why the failure is nasty: a wrong key or a missing `.value` produces **a theme flash with nothing in the
console**. No error, no failed test, just a visible flicker that reviewers report as "feels cheap".

## 2. A cookie whose FORMAT is owned elsewhere

The cookie adapter writes `encodeURIComponent(JSON.stringify(wrapper))`, so a cookie that something else
**parses** cannot round-trip: a server reading `locale` would receive a URL-encoded strata envelope rather than
`en`.

Where the format is a contract with a backend, a consent framework or an analytics vendor, write it directly and
**say so in a comment naming who owns the format** — the comment is what stops a later cleanup pass "fixing"
the exception back into a bug.

**Narrow on purpose.** `HttpOnly` cookies are untouchable from JS anyway, so this covers only JS-written,
server-read cookies. Everything else — including every cookie your own code both writes and reads — goes
through strata.

## 3. A takeover service worker deleting its predecessor's caches — lifecycle

**Owner decision, 2026-11-06 (NetCage decision #131).** His answer, verbatim: *"Add it to the rule
(Recommended)"*. The question: *"The website's service worker deletes the old `netcage-v*` caches that the
earlier caching worker left in returning visitors' browsers. The fleet storage rule allows only strata-storage to
touch the Cache API, with exactly two sanctioned exceptions, and a service worker can't load strata. Which fix?"*
The option he chose: *"Record in strata's sanctioned-exceptions file, with your words, that a takeover worker may
delete its own predecessor's caches by name. Nothing changes for visitors."*

A network-only takeover worker (the web layer of `aoneahsan-cccs-update-flow`) runs in the service-worker
scope, where nothing that imports strata is loaded. The caches it removes were created by an earlier worker,
never by strata, so the contract belongs to the **worker lifecycle**: on `activate`, the new worker clears what
its predecessor left.

**Narrow on purpose:**

- only inside the worker's `activate` handler;
- only `caches.keys()` and `caches.delete(name)`, never `caches.open`, `put` or `match`, because the worker
  stores nothing (a PWA with no caching);
- only names carrying the project's own predecessor prefix (NetCage: `netcage-v*`), never every cache on the
  origin;
- with a comment beside the call that names this exception, so a later sweep does not "fix" it back into a bug.

Anything that stores data in the Cache API goes through strata's `cache` adapter, from the page.

## Moved out of SKILL.md on 2026-10-01 for the 1,100-word body cap

Not new law — the full text the skill body now summarises and points at.

### Why the pre-paint script reads every axis

1. **The pre-paint theme script** — it runs before any module loads, so nothing exists for it to call. It must
   read the *physical* key (`<namespace>:` + key) and `JSON.parse(raw).value`, never the raw string.
   🔴 **And it reads EVERY preference axis, not just the theme** — a modern theme control carries nine
   (appearance, colour treatment, radius, density, text size, typeface, panel background, cursor, motion), and
   applying density or text size a frame late **reflows the whole page**, which is worse than a colour flash.
   Iterate one table; hand-writing the reads is how five of nine get dropped silently
   (`aoneahsan-cccs-react-theming`).

Each exists because something else already owns the contract — **timing** in the first case, **format** in the
second, **the worker lifecycle** in the third (added 2026-11-06). **Nothing else qualifies; a new exception is
added to that file or it is a violation.**

## Summary as stated in the skill body (moved from SKILL.md)

Both, with the traps that make each fail silently (a theme flash with nothing in the console; a server
receiving a URL-encoded envelope instead of `en`): **`references/web-storage-exceptions.md`**.
