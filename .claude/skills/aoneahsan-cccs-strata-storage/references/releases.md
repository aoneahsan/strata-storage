# strata-storage release history — moved out of SKILL.md

Moved here **verbatim** on 2026-09-02. `SKILL.md` had reached 1,395 words against the 1,100-word hard cap
(`validate-system.py`), and two full release sections is precisely the depth `references/` exists to hold.
Nothing was reworded. The clauses a caller must hold *without* opening this file stayed behind in `SKILL.md`;
what follows is the narrative behind them — read it when a project is pinned to an older version, or when you
need to know why a workaround in someone's code exists.

---

## 3.0.0 (2026-09-01) — the `strata:` key prefix

**3.0.0 (2026-09-01) prefixes `localStorage`/`sessionStorage` keys with `strata:`.** Existing data
migrates itself on read (per key, never a bulk sweep, never a non-envelope, never overwriting), so most
projects need nothing.

🔴 **A project MUST set `keyPrefix: false` when anything OUTSIDE this library reads a physical key.**
The two that keep appearing in this fleet are exactly the sanctioned exceptions above: **a pre-paint theme
script** and **a logger reading its own level**. Both know the exact key name; a prefix changes it
underneath them, and migration cannot fix a hard-coded reader. Frozen physical key names are the same
case. Check for those readers **before** bumping a project.

```ts
export const storage = defineStorage({ keyPrefix: false });          // frozen keys / external readers
export const storage = defineStorage({ migrateLegacyKeys: false });  // a sibling app is still on 2.x
```

Unchanged by 3.0.0: cookies (already `strata_`), indexedDB, cache, memory, url. `namespace` composes —
the physical key is `<keyPrefix><namespace>:<key>`.

---

## 2.9.0 (2026-09-01) — the shape check

**Everything the old guidance in this skill worked around was fixed in `2.9.0` (2026-09-01).** A project
pinned below it still has the defects. Bump first, then read the rest of this section.

**What changed: a web adapter now identifies its own keys by SHAPE, not by name.** `localStorage`,
`sessionStorage` and cookies are shared with every script on the origin and the default prefix is empty, so
`startsWith('')` matched everything there. A key counts as ours only when its stored value is a
`StorageValue` envelope. Consequences worth carrying:

- The `Failed to get key … is not valid JSON` stream is gone (Clarity's `_cltk` was the usual trigger).
  **A foreign value is no longer an error** — it is skipped at `debug`.
- `keys()` returns only what this library wrote, the TTL sweep cannot delete a foreign key, and `clear()`
  cannot wipe the origin. 🔴 Both of those data-loss paths were **measured firing** on 2.8.5, not theoretical.
- 🔴 **The corollary to teach a project:** a key written to the same area by anything else is **invisible to
  `keys()` by design**. That is the fix, not a bug. `setLogLevel('debug')` (now exported) names each skip.

🔴 **`prefix` is no longer a no-op — the older claim in this skill is retired.** Per-adapter config is applied
synchronously at registration, so it holds for `setSync`/`getSync` issued before `initialize()` resolves,
which is the window that made it look broken. Both forms work now:

```ts
export const storage = defineStorage({
  namespace: 'myapp',                              // physical keys -> `myapp:<key>`
  adapters: {
    localStorage: { prefix: 'myapp:' },            // ALSO works as of 2.9.0
    sessionStorage: false, cookies: false,          // opts them out of REGISTRATION
  },
});
```

⚠️ **But prefixing is now hygiene, not safety.** Isolation comes from the shape check. Set a namespace for a
clean keyspace; do not tell a project it is what keeps the library off other people's keys.

🔴 **`defaultStorages` is the preference order for the DEFAULT adapter — never a registration list.**
Operations with no explicit `storage` span every *registered* adapter. Use `adapters: { <name>: false }` to
narrow the set. Misreading this is what produced ISSUE-09. It **does** now protect the sync path: `setSync`
falls through to the next usable backend instead of throwing.

🔴 **Still true, and still the rule: never assume the physical key.** Write one, read it back out of the raw
store, and pin it with a test — especially where a pre-paint script depends on it, because that failure is a
silent theme flash with nothing in the console.

⚠️ **A consumer with FROZEN physical key names should know 3.0.0 is coming**: it gives the web adapters a real
default prefix with migrate-on-read and an opt-out. Anyone reading a physical key directly (a pre-paint script,
a logger reading its own level) must take the opt-out. Tracked as `TASK-001` in the package's
`PENDING-TASKS.md`.

**`references/namespacing.md`** — the probe table, the contested lifewell-vs-habitforge measurement, and what
a namespace does and does not buy. Read it before changing a namespace or debugging a key that "should" exist.

## Moved out of SKILL.md on 2026-10-01 for the 1,100-word body cap

Not new law — evidence and history the skill body now points at.

### The shape check was measured, and `subscribe()` once aborted boot

- **A web adapter identifies its own keys by SHAPE** — a value is ours only if it is a `StorageValue`
  envelope. So the TTL sweep cannot delete a foreign key and `clear()` cannot wipe the origin. 🔴 Both
  data-loss paths were **measured firing** on 2.8.5.

🔴 **Scope `subscribe()` to a backend that supports it** when only one matters, normally
`{ storage: 'localStorage' }`, and always call the returned unsubscribe. On the supported floor the unscoped
form is safe — non-observable backends are skipped. (Below 2.9.0 it was mandatory: the unscoped form aborted
boot with `NotSupportedError` from IndexedDB, ISSUE-07. `references/releases.md`.)

## The five rules 2.9.0 left behind (moved from SKILL.md)

`2.9.0` closed ISSUE-01/06/07/08/09/10; a project pinned below it still has the defects.

- **A web adapter identifies its own keys by SHAPE** — a value is ours only if it is a `StorageValue`
  envelope. So the TTL sweep cannot delete a foreign key and `clear()` cannot wipe the origin.
- 🔴 **The corollary to teach a project:** a key written to the same area by anything else is **invisible to
  `keys()` by design** — that is the fix, not a bug. `setLogLevel('debug')` names each skip.
- ⚠️ **Prefixing is hygiene, not safety** — isolation comes from the shape check.
- 🔴 **`defaultStorages` is the preference order for the DEFAULT adapter, never a registration list.** An
  operation with no explicit `storage` spans every *registered* adapter; narrow it with
  `adapters: { <name>: false }`. Misreading this produced ISSUE-09.
- 🔴 **Never assume the physical key** — write one, read it back from the raw store, pin it with a test.
