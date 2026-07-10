# AGENTS.md

Guidance for humans and AI coding agents working in this repository.

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
- `docs-website/` — the public documentation site (Docusaurus).
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

## Docs

- Usage & API reference: https://stratastorage-docs.aoneahsan.com (AI agents: `/ai`)
- AI integration quick reference: [`AI-INTEGRATION-GUIDE.md`](AI-INTEGRATION-GUIDE.md)


## Sub-agents & Skills — Main-Context-First (IRON-SOLID)
Default/built-in sub-agents (`general-purpose`, `Explore`, `Plan`, `claude`, `fork`, …) do NOT have
access to `/skills`, so delegating to them silently SKIPS the skills RULE #0 requires. Do all
skill-relevant work in the **MAIN context**; use a sub-agent ONLY when a **custom** agent exists in
`.claude/agents/` for that job; a default `Explore`/`Plan` agent is allowed ONLY for read-only,
no-skill search/exploration. When a relevant skill is missing, **install/enable it** rather than
proceeding skill-less. (Owner directive 2026-07-11; full text in `~/.claude/CLAUDE.md`.)
