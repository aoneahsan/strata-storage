# CLAUDE.md

Repository guidance for AI coding agents lives in [AGENTS.md](./AGENTS.md). See
that file for the project overview, structure, hard rules, and local-development
commands.

**Consumer-reported package issues → `docs/REPORTED-ISSUES.md`** (open queue, `### ISSUE-` sections; fix
here → MOVE the entry to `docs/RESOLVED-ISSUES.md` with date + fixing version). **The queue is currently
empty** — all ten entries filed to date are resolved. Next id is `ISSUE-11`; numbers are never reused.

**Agent-owed follow-ups → root `PENDING-TASKS.md`** (`TASK-001`: the 3.0.0 default key prefix).
**Human-only tasks → `docs/MANUAL-TASKS.md`** (`npm publish` is agent-automated since 2026-07-25).

🔴 **The current version lives in `package.json` and `CHANGELOG.md` — NOT here.** This file carried a
hand-copied version for two releases and was wrong about both the published `latest` and a pending
publish its own sibling file recorded as done (that was `ISSUE-06`). Read the version from those two
files; a fourth copy will drift again. `yarn build` fails if the README's version row disagrees with
`package.json`.

**Documentation site is a SEPARATE repo** (split out 2026-07-25):
[aoneahsan/strata-storage-docs](https://github.com/aoneahsan/strata-storage-docs) →
https://stratastorage-docs.aoneahsan.com · local checkout `../strata-storage-docs`. Doc content changes go
there, not here — `docs/` in this repo is internal records only.


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
