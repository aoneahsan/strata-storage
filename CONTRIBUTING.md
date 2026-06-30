# Contributing to Strata Storage

Thank you for your interest in improving Strata Storage! 🎉 This guide explains how the
project is governed, how to get the access you need, the coding standards your change must
meet, and how a change reaches `main`.

> **TL;DR** — `main` is protected. Nobody pushes to it directly except the maintainer.
> Every other change lands through a **pull request that needs one maintainer approval and
> green CI** before it can merge. Want to help regularly? [Ask for contributor
> access](#becoming-a-contributor).

## Table of contents

- [Governance &amp; branch protection](#governance--branch-protection)
- [Becoming a contributor](#becoming-a-contributor)
- [Reporting bugs &amp; requesting features](#reporting-bugs--requesting-features)
- [Development setup](#development-setup)
- [Coding standards](#coding-standards)
- [Commit conventions](#commit-conventions)
- [Pull request process](#pull-request-process)
- [Code of conduct](#code-of-conduct)
- [Recognition &amp; support](#recognition--support)

## Governance &amp; branch protection

Strata Storage is maintained by [Ahsan Mahmood](https://aoneahsan.com) (`@aoneahsan`). The
`main` branch is the single source of truth for releases and is protected by a GitHub
**ruleset**:

- **No direct pushes to `main`.** Every change arrives through a pull request — there is no
  exception for collaborators.
- **One approving review is required** before a pull request can merge.
- **CI must be green.** The `Package` check (`yarn typecheck` + `yarn build` + `yarn lint`)
  must pass on the pull request.
- **Force-pushes and branch deletion on `main` are blocked.**
- **The maintainer (`@aoneahsan`) is the only bypass.** Only the repository owner can push to
  `main` directly, so the release history stays clean and intentional. No one else — including
  contributors with write access — can bypass review.

This means anyone can propose a change, the maintainer reviews and approves it, and the
project keeps a reviewed, auditable history.

## Becoming a contributor

You do **not** need any special access to contribute. There are two paths:

### 1. Fork &amp; pull request (anyone, no access required)

This is the standard open-source flow and works for everyone:

1. **Fork** this repository to your own account.
2. Create a branch in your fork (`feat/my-change`).
3. Make your change and push it to your fork.
4. Open a **pull request** against `aoneahsan/strata-storage:main`.

The maintainer reviews it; once approved and CI is green, it is merged.

### 2. Request collaborator (write) access — for regular contributors

If you intend to contribute regularly and would rather work in branches **inside** this
repository instead of a fork, request to become a collaborator:

1. Open an issue using the **“Contributor access request”** template (or a regular issue
   titled `Contributor access request`), **or** email **aoneahsan@gmail.com**.
2. Tell us briefly: who you are, what you would like to work on, and any prior open-source
   work (a link to past PRs/repos helps).
3. The maintainer grants write access at their discretion.

> **Write access does not let you push to `main`.** Even collaborators must open a pull
> request and get it approved — branch protection still applies. Write access only lets you
> push **feature branches** to this repository instead of maintaining a fork.

## Reporting bugs &amp; requesting features

Use **[GitHub Issues](https://github.com/aoneahsan/strata-storage/issues)**. Search existing
issues first to avoid duplicates.

A good **bug report** includes a clear title, steps to reproduce, expected vs. actual
behavior, and your environment:

- Strata Storage version (e.g. `2.8.1`)
- Platform (Web / iOS / Android) and browser/OS version
- Framework, if any (React / Vue / Angular / Capacitor)

A good **feature request** explains the use case (why it’s needed), a proposed API or
behavior, and any alternatives you considered.

## Development setup

### Prerequisites

- **Node.js ≥ 24.13.0** and **Yarn** — this is a **Yarn-only** project (no `npm`/`pnpm` for
  local work; only `yarn.lock` is committed).
- Git.
- For native work: Xcode 14+ (iOS) and/or Android Studio (Android `minSdk` 23).

### Local development

```bash
# 1. Fork, then clone your fork
git clone https://github.com/<your-username>/strata-storage.git
cd strata-storage

# 2. Install dependencies
yarn install

# 3. Run the quality gates (these ARE the test suite — see below)
yarn typecheck
yarn build
yarn lint
```

> This project has **no automated test runner** — a deliberate decision. Quality is enforced
> by `yarn typecheck` + `yarn build` + `yarn lint`. These three must pass locally and in CI.

To exercise a change in a real app, use the demo:

```bash
cd example-apps/demo-app
yarn install
yarn start   # run this yourself — maintainers do not start dev servers for you
```

## Coding standards

These reflect the project’s architecture. A change that violates them will be asked to
change before merge.

- **Zero runtime dependencies in the core.** Never add a `dependencies` entry. React, Vue,
  Angular, `@capacitor/core`, and `firebase` are **optional peer dependencies** only.
- **ESM only, TypeScript strict.** No CommonJS output. Code must pass `tsc --noEmit` with the
  project’s strict config and ship no source maps.
- **Keep all six entry points in sync.** `.`, `./capacitor`, `./firebase`, `./react`,
  `./vue`, `./angular` form the public contract — never break it, and update every relevant
  one together.
- **Adapters implement `BaseAdapter`.** New storage backends extend `BaseAdapter` and honor
  its contract (capabilities, lifecycle, value wrapper).
- **Public APIs carry JSDoc** with at least one `@example`.
- **Log through the project’s logger, never `console.*` directly** in library code.
- **Prettier + ESLint** decide formatting and style. Run `yarn lint` (and `yarn lint:fix` to
  auto-fix) before opening a PR. `yarn lint` must report zero problems.
- **No `TODO`/`FIXME`/placeholder code** in merged changes — finish the work or open an issue.
- **Security:** sensitive data uses the secure adapters (Keychain/Keystore); never store
  secrets in plain text; encrypt at rest where appropriate.

### Adding a storage adapter (example)

```typescript
// src/adapters/web/MyAdapter.ts
import { BaseAdapter } from '@/core/BaseAdapter';

export class MyAdapter extends BaseAdapter {
  readonly name = 'myStorage' as const;
  readonly capabilities = { persistent: true, synchronous: false /* … */ };

  async initialize(): Promise<void> {
    /* setup */
  }

  async get<T>(key: string): Promise<StorageValue<T> | null> {
    /* implementation */
  }
  // …other required BaseAdapter methods
}
```

Then verify with `yarn typecheck && yarn build && yarn lint` and document the adapter.

## Commit conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `build`, `ci`, `chore`.

```bash
feat(adapters): add WebSQL fallback adapter
fix(encryption): correct AES-GCM IV reuse on rapid writes
docs(readme): document the npx cap sync step
```

## Pull request process

1. **Sync with `main`** and rebase your branch on the latest `upstream/main`.
2. **Run the gates** — `yarn typecheck && yarn build && yarn lint` must all pass. CI runs the
   same `Package` check and your PR cannot merge until it is green.
3. **Use a Conventional-Commit PR title** and fill in the PR description: what changed, why,
   and `Fixes #123` for related issues. Flag any breaking change clearly.
4. **Keep PRs focused.** One logical change per PR is easier to review and approve.
5. **Do not force-push to `main`** (you can’t — it’s blocked) and don’t expect to merge your
   own PR; a maintainer reviews, approves, and merges.

### What reviewers look for

- The quality gates pass and CI is green.
- The change matches the [coding standards](#coding-standards) and keeps the six entry points
  consistent.
- Public API changes are documented (JSDoc + docs) and don’t silently break the contract.
- The change is scoped, readable, and free of leftover debug/`console`/`TODO` code.

## Code of conduct

Be respectful, welcoming, considerate, and patient. Disagreement is fine; keep it
professional. Harassment or abusive behavior is not tolerated. Reports go to
**aoneahsan@gmail.com**.

## Recognition &amp; support

Contributors appear in the repository’s
[contributors list](https://github.com/aoneahsan/strata-storage/graphs/contributors) and in
release notes for significant work.

Strata Storage is free and MIT-licensed. If it helps you and you’d like to give back, you can
support the maintainer at **[aoneahsan.com/payment](https://aoneahsan.com/payment?project-id=strata-storage&project-identifier=strata-storage)**. Support is never required to contribute or to use the project.

---

**Thank you for contributing to Strata Storage!** 🚀 — maintained by
[Ahsan Mahmood](https://aoneahsan.com) · aoneahsan@gmail.com
