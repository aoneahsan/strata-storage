# AGENTS.md

**Last Updated:** 2026-10-21

**Context verified:** 2026-10-21. **Next routine review:** 2026-11-20. Public package `main` inside `../strata-storage-root/`; sibling docs and private marketing site are separate Git repositories. Use Yarn; never add an owner-created client package. The private legacy combined checkout is read-only.


Guidance for humans and AI coding agents working in this repository.

**Consumer-reported package issues → `docs/REPORTED-ISSUES.md`** (open queue, `### ISSUE-` sections; fix
here → MOVE the entry to `docs/RESOLVED-ISSUES.md` with date + fixing version). Read both queues for current status and the next unused issue ID; numbers are never reused.

**Agent-owed follow-ups → root [`PENDING-TASKS.md`](PENDING-TASKS.md)** — currently empty; history in
[`docs/DONE-TASKS.md`](docs/DONE-TASKS.md). **Human-only tasks → [`docs/MANUAL-TASKS.md`](docs/MANUAL-TASKS.md)** (`npm publish` is
agent-automated since 2026-07-25).

🔴 **The current version lives in `package.json` and `CHANGELOG.md` — NOT here.** A hand-copied version in
a guidance file drifted across two releases and misreported both the published `latest` and a pending
publish its sibling file recorded as done (that was `ISSUE-06`). `yarn build` fails if the README's
version row disagrees with `package.json`.

## What this is

**Strata Storage** is a zero-dependency, universal storage library and Capacitor
plugin. One unified API (`get` / `set` / `remove` / `query` / `subscribe`, both
sync and async) across the web (localStorage, IndexedDB, cookies, Cache API, URL),
Node/SSR, and native iOS/Android (Preferences, SQLite, Keychain/Keystore,
filesystem) — with optional React, Vue, Angular, Capacitor, and Firebase bindings.

> Built and maintained with the help of AI coding agents (Claude Code). Every
> change is human-reviewed and gated by typecheck + lint + build before release.

## Project shape

- `src/` — the library. Six public entry points kept in sync: main, `capacitor`,
  `firebase`, `react`, `vue`, `angular`.
- `src/adapters/` — storage backends; every adapter implements `BaseAdapter`.
- `src/features/` — encryption, compression, TTL, query, sync, migration, recovery.
- `src/integrations/` — framework bindings (optional peer deps).
- `ios/`, `android/` — native plugin sources.
- `docs/` — internal records only (the reported/resolved issue queue). **The public
  documentation site lives in its own repo:** [aoneahsan/strata-storage-docs](https://github.com/aoneahsan/strata-storage-docs)
  → https://stratastorage-docs.aoneahsan.com (split out 2026-07-25; local checkout at
  `../strata-storage-docs`). Doc content changes go there, not here.
- `example-apps/demo-app/` — a runnable feature demo.

## Hard rules

- **Zero runtime dependencies in the core.** React/Vue/Angular/Capacitor/Firebase
  are *optional* peers — never add a hard `dependencies` entry.
- **Don't break the public API.** All six entry points stay in sync; adapters must
  implement the `BaseAdapter` contract.
- **Sensitive data uses secure adapters** (Keychain/Keystore) — never store
  credentials in plain text.

## Local development

Requires Node >= 24.13 and Yarn (Berry).

```bash
yarn install
yarn typecheck   # TypeScript strict
yarn lint        # ESLint (check only)
yarn build       # custom ESM build → dist/ (all six entry points)
```

Quality gates are typecheck + lint + build — these are the project's checks (there
is no separate test runner, by design).

The 2026-10-21 maintenance pass fixed ISSUE-14 so same-key raw localStorage imports retain the migrated value. Immutable install, typecheck, lint, build, the package's 18-case ownership gate, README version gate, and focused raw-import regression checks passed for the 3.1.1 release.

## Contributing &amp; governance

`main` is protected by a GitHub ruleset: **no direct pushes** — every change lands
through a **pull request that needs one maintainer approval + green CI** (the
`Package` check). Force-push and deletion of `main` are blocked. **Only the
maintainer (`@aoneahsan`) can push to `main` directly.** Contribute by forking and
opening a PR, or [request contributor (write) access](./CONTRIBUTING.md#becoming-a-contributor)
to work in-repo — write access still cannot bypass review on `main`.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) (full coding standards + PR process) and
[`.github/CODE_OF_CONDUCT.md`](.github/CODE_OF_CONDUCT.md). Report security issues
via [`.github/SECURITY.md`](.github/SECURITY.md).

## Links

- **Marketing site (live):** https://stratastorage.aoneahsan.com
- **Documentation site (live):** https://stratastorage-docs.aoneahsan.com (AI agents: `/ai` ·
  `/llms.txt` · `/llms-full.txt`) — its own repo:
  [aoneahsan/strata-storage-docs](https://github.com/aoneahsan/strata-storage-docs)
- **npm:** https://www.npmjs.com/package/strata-storage
- **Repo:** https://github.com/aoneahsan/strata-storage
- AI integration quick reference: [`AI-INTEGRATION-GUIDE.md`](AI-INTEGRATION-GUIDE.md)
- Human-only tasks: [`docs/MANUAL-TASKS.md`](docs/MANUAL-TASKS.md) · agent-owed follow-ups: [`PENDING-TASKS.md`](PENDING-TASKS.md)


<!-- RULE:orcid-bibtex v2026-07-25 -->
## ORCID / BibTeX record

This project is published as a work on ORCID **0009-0006-2311-8687** (Ahsan Mahmood). Its BibTeX entry lives at
`~/Documents/ahsan-work/ahsan-notebook/static/assets/personal/orcid-project-projects-files/strata-storage.bib`, beside a
combined `aoneahsan-all-works.bib` used for a single import.

On **"update ORCID profile info"**: regenerate that file from this project's portfolio-info file and its
**probe-verified** live URLs, refresh the combined file in the same edit, and invoke
`aoneahsan-cccs-orcid-profile` + `aoneahsan-cccs-bibtex` (agent: `aoneahsan-ccca-orcid`). Never invent a URL, a
DOI or a release year — an unreachable channel is omitted, never claimed. Importing, and the work-type retype
that BibTeX cannot perform, are owner-only steps recorded in that folder's `MANUAL-TASKS.md`.

## Stop-work Git gate

<!-- RULE:stop-work-git-gate v2026-10-20 -->

Before stopping, commit every legitimate change and work-progress checkpoint in this repository and each independent nested repository, fetch and merge the designated upstream, push the documented working branch, then verify an empty worktree and `0 0` ahead/behind. Never stash, discard, reset, rebase, or force-push. If synchronization is blocked, report the exact repository, branch, blocker, and next action instead of calling the work complete. The full workflow remains authoritative in `~/.claude/rules/git-workflow.md`.
