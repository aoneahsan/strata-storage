# AGENTS.md

Guidance for humans and AI coding agents working in this repository.

**Consumer-reported package issues → `docs/REPORTED-ISSUES.md`** (open queue, `### ISSUE-` sections; fix
here → MOVE the entry to `docs/RESOLVED-ISSUES.md` with date + fixing version; **3 open** as of
2026-07-29 — the empty-prefix localStorage issue, docs version drift, and an unscoped
`subscribe()` that throws).

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
- Human-only tasks (incl. `npm publish`): [`docs/MANUAL-TASKS.md`](docs/MANUAL-TASKS.md)


## Sub-agents & Skills — Main-Context-First (IRON-SOLID)
Default/built-in sub-agents (`general-purpose`, `Explore`, `Plan`, `claude`, `fork`, …) do NOT have
access to `/skills`, so delegating to them silently SKIPS the skills RULE #0 requires. Do all
skill-relevant work in the **MAIN context**; use a sub-agent ONLY when a **custom** agent exists in
`.claude/agents/` for that job; a default `Explore`/`Plan` agent is allowed ONLY for read-only,
no-skill search/exploration. When a relevant skill is missing, **install/enable it** rather than
proceeding skill-less. (Owner directive 2026-07-11; full text in `~/.claude/CLAUDE.md`.)

<!-- RULE:main-context-model-workflow v2026-07-16 -->
## Main-Context + Skills + Model Workflow (IRON-SOLID — CRITICAL)
1. **NO default/built-in sub-agents** (`general-purpose`, `Explore`, `Plan`, `claude`, `fork`, …) for ANY work in
   this project — they cannot invoke /skills, which RULE #0 makes mandatory. Do ALL work (planning, implementation,
   review, exploration) in the MAIN context. A sub-agent is allowed ONLY when a CUSTOM agent exists in
   `.claude/agents/` for that exact job.
2. **Skills always:** before any task, scan the available-skills list and invoke EVERY relevant skill; if a needed
   skill is missing, download/enable/install it (or use the nearest installed equivalent and say so) — never
   proceed skill-less.
3. **Model workflow:** PLAN and REVIEW on **Fable 5**; EXECUTE the approved plan on **Opus 4.8**. Plans in
   `~/.claude/plans/`; multi-phase features keep a resumable tracker (`docs/features/<slug>/00-tracker.json`),
   resumed rather than re-planned from zero.

Global records (rules, policy, audit reports) live in the `ahsan-notebook` repo at
`static/assets/claude-code/`; the `~/.claude/…` paths are symlinks into it. Full text: `~/.claude/CLAUDE.md`.
(Owner directives 2026-07-11 / 2026-07-14; fleet-rolled 2026-07-16.)

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
