# Unit testing — overview

## Purpose

The LifeWell rebuild inherits a codebase with **zero tests** across 192,669 lines, and the owner now wants
core units covered. Without a stated line that becomes one of two failures: nothing gets tested, or the suite
fills with markup snapshots that break on every styling change and pass through real regressions.

This skill draws the line. It names the categories that earn a test — the ones where being wrong is silent
and expensive — and names, equally explicitly, what does not. It also carries the Vitest 4 changes that break
a config carried forward from v3, including one that makes a suite pass individually and fail in sequence.

**Scope note:** the fleet writes automated tests only when explicitly asked. This skill governs *how* when
that request comes; it is not a licence to add tests to every task.

## What this skill does

- Gives the **earns-a-test list** — pure logic, Zod schemas, unit conversions, date/timezone maths, reducers,
  service mappers, query builders, outbox replay, entitlement evaluation — with the reason each is on it.
- Gives the **does-not list**, and **bans snapshot files** outright with the reasoning.
- Expresses **coverage as a floor on named core modules**, never a global percentage, and says why a global
  number actively drives bad tests.
- Fixes mocking at the **service boundary** rather than the network or the client library.
- Carries the **Vitest 4 traps**, including `vi.restoreAllMocks()` no longer resetting `vi.fn()`.
- Requires **`user-event` over `fireEvent`** and role queries over test ids, with the failure each prevents.
- Points at `@react-aria/test-utils` for RAC components.

## When it gets invoked

- The owner asks for tests on a module.
- Setting up a test runner in a new project.
- "Is this worth testing?" / "what should we test here?"
- A suite passes individually and fails when run together.
- Reviewing a pull request that adds tests.
- Migrating a Vitest 3 config to 4.

## Where it applies

| Scope | Applies |
|---|---|
| Project types | Web projects on Vite/Vitest |
| Stack override | The concern is *test the logic that is silently expensive to get wrong, and nothing else*. A Flutter project satisfies it with `flutter_test` over the same categories — see `aoneahsan-cccs-flutter-e2e-testing` for that stack's verification half. |

## Sources

| Source | Record |
|---|---|
| Vitest 4.0 / 4.1 release material (fetched 2026-07-25) | `_source-understanding/urls/motion-and-vitest.md` |
| `@react-aria/test-utils`, via the installed Adobe skill | `_source-understanding/urls/react-aria.md` |
| The rebuild's Definition of Done and the zero-tests finding | `code/production-projects/lifewell-project-root/00-REBUILD-MASTER-PROMPT.md` |

## Related skills

- `aoneahsan-cccs-web-e2e-testing` — real flows in a real browser; the other half of the gate
- `aoneahsan-cccs-verification` — the requirement that a claim carries fresh output
- `aoneahsan-cccs-debugging` — root-cause first, then a regression test
- `aoneahsan-cccs-react-aria` — the ARIA pattern testers for RAC components

## Maintenance

- **Living registries this skill points at:** `~/.claude/rules/dev-workflow.md` when present — it carries the
  standing "no automated tests unless asked" rule this skill operates under.
- **Last reviewed:** 2026-07-25
