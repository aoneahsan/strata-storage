# CLAUDE.md

**Last Updated:** 2026-10-21

**Context verified:** 2026-10-21. **Next routine review:** 2026-11-20. Public package `main` inside `../strata-storage-root/`; sibling docs and private marketing site are separate Git repositories. Use Yarn; never add an owner-created client package. The private legacy combined checkout is read-only.


Repository guidance for AI coding agents lives in [AGENTS.md](./AGENTS.md). See
that file for the project overview, structure, hard rules, and local-development
commands.

**Consumer-reported package issues → `docs/REPORTED-ISSUES.md`** (open queue, `### ISSUE-` sections; fix
here → MOVE the entry to `docs/RESOLVED-ISSUES.md` with date + fixing version). Read both queues for current status and the next unused issue ID; numbers are never reused.

**Agent-owed follow-ups → root `PENDING-TASKS.md`** — currently empty; history in `docs/DONE-TASKS.md`.
**Human-only tasks → `docs/MANUAL-TASKS.md`** (`npm publish` is agent-automated since 2026-07-25).

🔴 **The current version lives in `package.json` and `CHANGELOG.md` — NOT here.** This file carried a
hand-copied version for two releases and was wrong about both the published `latest` and a pending
publish its own sibling file recorded as done (that was `ISSUE-06`). Read the version from those two
files; a fourth copy will drift again. `yarn build` fails if the README's version row disagrees with
`package.json`.

The 2026-10-21 maintenance pass fixed ISSUE-14's same-key raw localStorage import deletion and passed immutable install, typecheck, lint, build, the 18-case ownership gate, README version gate, and focused raw-import regression checks.

**Documentation site is a SEPARATE repo** (split out 2026-07-25):
[aoneahsan/strata-storage-docs](https://github.com/aoneahsan/strata-storage-docs) →
https://stratastorage-docs.aoneahsan.com · local checkout `../strata-storage-docs`. Doc content changes go
there, not here — `docs/` in this repo is internal records only.


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
