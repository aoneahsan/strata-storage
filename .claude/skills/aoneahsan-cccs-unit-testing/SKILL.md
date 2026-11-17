---
name: aoneahsan-cccs-unit-testing
description: 'Unit testing with Vitest and React Testing Library: the three pre-approved required-minimum classes written automatically and the longer list needing an explicit ask, why tests never outgrow the feature, proving an assertion fails against a planted defect, mocking at the service boundary, and the Vitest 4 config breaks. Use when adding or reviewing tests, setting up a test runner, deciding whether something is worth testing, or when a suite passes alone and fails in sequence.'
metadata:
  author: aoneahsan
  source: custom-skills/_source-understanding/urls/motion-and-vitest.md
---

# Unit testing

**The app is the deliverable. Tests are a thin floor under it, never a project of their own.**

## 🔴 The required minimum is pre-approved. Everything else is asked for

**Owner grant 2026-08-14** — *"do not go too deep in them… i approve only the required ones… so you can do the
required bear minimum tests automatically and always mainly focus on app development"*
(`~/.claude/rules/dev-workflow.md`). Three classes are written **without asking**:

1. A **parity/contract assertion that parses an approved artefact** — the click dummy, the frozen-URL list, the
   plan registry. Its drift is silent and nothing else looks for it.
2. **Pure logic whose wrongness is invisible** — entitlement limits, money, dates and timezones, streak
   arithmetic, URL-state codecs.
3. **One smoke test per build-time generator** — a generator that emits nothing still exits 0.

Anything beyond those three: **ask first**. And 🔴 **tests never outgrow the feature** — if the test work is
exceeding the feature work, stop and ask. When a test is written, this is its shape: a small suite over logic
that is genuinely hard to get right, and nothing else. The failure this prevents is both extremes — no tests at
all, or a snapshot swamp that breaks on every styling change and proves nothing.

## What earns a test

| Category | Why |
|---|---|
| **Pure logic** — calculations, derivations, predicates | deterministic, easy to test, expensive when wrong |
| **Zod schemas** | the boundary between untrusted input and the app |
| **Unit conversions** — kg↔lb, ml↔oz, cm↔ft | silent corruption; an off-by-2.2 looks plausible |
| **Date and timezone maths** | 🔴 the daily-log boundary is a real bug source — "today" at 23:00 UTC+5 is not "today" in UTC |
| **Store reducers / state transitions** | pure functions with real branching |
| **Service mappers** — API/DB shape → domain shape | where a renamed column silently becomes `undefined` |
| **Query builders** | a missing `limit` or filter is a production incident |
| **Offline outbox replay** | replay-once semantics are the whole point of the feature |
| **Entitlement / limit evaluation** | governs what a paying user can do |

## What does not

| Not this | Because |
|---|---|
| **Markup snapshots** | breaks on every styling change, asserts nothing about behaviour |
| Styling, layout, spacing | the gallery and a real browser show this; a test cannot |
| Third-party library behaviour | that is their test suite |
| Trivial getters, pass-through wrappers | no branching, no risk |
| Framework wiring — that a route renders | E2E covers it, against a real build |

**Zero snapshot files.** `toMatchSnapshot()` is banned. It generates green tests that pass through genuine
regressions and fail on cosmetic ones — the exact inversion of what a test is for.

## 🔴 A new assertion is proven to FAIL before it is trusted

Plant the real defect the test exists to catch — delete the section, drop the axis, change the limit — watch
**that** assertion go red, restore, and record the message you saw. Changing a constant until something breaks
proves only that the file runs. This matters most for the pre-approved parity class: those defects are silent
by definition, so **a parity test nobody has watched fail is indistinguishable from one asserting nothing.**

## Coverage is a floor on core modules

```ts
coverage: {
  provider: 'v8',
  thresholds: {
    // A FLOOR on what matters. Never a global percentage.
    'src/lib/units/**':      {statements: 95, branches: 90},
    'src/lib/date/**':       {statements: 95, branches: 90},
    'src/services/**/map*.ts': {statements: 90},
  },
}
```

**A global percentage drives tests for getters** — the cheapest way to raise a number is to test the code
that never breaks. Name the modules that must be covered instead.

## Mock at the service boundary

Mock **your own service module**, not the network and not the client library:

```ts
vi.mock('@/services/metrics', () => ({
  fetchMetrics: vi.fn().mockResolvedValue([{id: '1', value: 72}]),
}));
```

Mocking the Supabase client means asserting against its fluent chain, so the test breaks when the *query*
is refactored even though behaviour is identical. Mocking the network means maintaining fixtures of someone
else's wire format. The service boundary is yours, stable, and the thing you actually depend on.

## 🔴 Vitest 4 traps

| Trap | Effect |
|---|---|
| **`vi.restoreAllMocks()` no longer resets `vi.fn()`** — only `vi.spyOn()` | call history leaks between tests; the suite passes individually and fails in sequence. Use `vi.resetAllMocks()` or explicit `mockClear()` |
| `workspace` field removed → **`projects`** | a carried-forward v3 config fails to load |
| Pool options moved to top level; `maxThreads`/`maxForks` → **`maxWorkers`** | silently ignored config |
| `coverage.all` and `coverage.ignoreEmptyLines` removed | aligns with the floor rule above |

## Writing the tests

- **`@testing-library/user-event`, never `fireEvent`.** `fireEvent.click` dispatches one event; a real click
  is pointerdown → mousedown → focus → pointerup → mouseup → click. Components that depend on focus order
  pass under `fireEvent` and fail for users.
- **Query by role, then label, then text. Test ids last.** A role query asserts the accessible name exists —
  it fails when a control becomes unreachable, which is a bug worth catching.
- **Fake timers for scheduling and reminder logic**, with `vi.setSystemTime()` for date-dependent code so
  "today" is not the machine's today.
- **RAC components:** `@react-aria/test-utils` provides ARIA pattern testers — see
  `aoneahsan-cccs-react-aria/references/migration-and-patterns.md`.

For the Vitest + RTL setup, the date/timezone recipes and the outbox test, read `references/setup.md`.

## Related skills

`aoneahsan-cccs-web-e2e-testing` (the other half — real flows in a real browser) · `-verification` (fresh
output as evidence) · `-debugging` (root-cause before writing a regression test) · `-typescript` (types
remove whole categories of test).
