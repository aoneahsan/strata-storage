---
name: aoneahsan-cccs-orcid-profile
description: 'The owner''s ORCID record: which work type each product takes and why an imported work never arrives as Software, what ORCID accepts as an identifier and what that means for grouping, the biography, keywords, websites and employment sections, and when a DOI is worth minting. Use when adding or updating works on ORCID.'
metadata:
  author: aoneahsan
  source: ORCID support documentation + BibTeX-to-work-type mapping, researched 2026-07-25
---

# ORCID profile

ORCID is a persistent identifier plus a record of works. For this owner the works are **shipped software**,
not papers — which is exactly the case ORCID's import tooling handles worst.

**The standard:** every work on the record is real, publicly reachable, and typed correctly — and the record
never claims a distribution channel that does not resolve.

## When to use

- Adding, updating or removing works on the ORCID record.
- Deciding a work's **type** or **visibility**.
- Any request phrased as "update ORCID profile info" / "add my projects to ORCID".
- Choosing whether a project deserves a DOI.

**Not for:** the mechanics of writing the `.bib` file itself — that is `aoneahsan-cccs-bibtex`.

## 🔴 Import can never set "Software"

ORCID's BibTeX importer maps entry types through a fixed table. `@misc` becomes work category
`other_output`, type **Other**. **No BibTeX entry type produces "Software."**

So the flow is always: import as *Other* → **retype by hand in the ORCID UI**. Never claim a corpus is
"imported as Software", and never invent a non-standard entry type hoping the parser cooperates — an
unrecognised type silently falls back, which is worse than a known fallback.

Record the retype as an owner-only checklist row (`aoneahsan-cccs-documentation` → `MANUAL-TASKS.md`); it
needs an ORCID login, so no agent can do it.

## Work types

| Product | ORCID work type |
|---|---|
| Web app, mobile app, CLI, library, browser extension | **Software** |
| A portfolio or brand site whose substance is content | **Website** (Software is also defensible) |
| Written documentation published as a site | **Other** or **Website** |

## Identifiers decide grouping

ORCID groups versions of a work by **identifier**. BibTeX carries only **DOI, ISBN and ISSN** — a `url` is
metadata, not an identifier. Self-published software therefore does **not** group or deduplicate, and that is
expected rather than a defect to engineer around.

A DOI changes that. Zenodo mints one from a GitHub release and pushes the work to ORCID directly, bypassing
BibTeX entirely — but **the repository must be public.** When a project has a DOI, remove it from the BibTeX
corpus so the same work is not imported twice by two routes.

## Honest framing

The same rule that governs a store listing governs this record. A work is listed when it is **publicly
reachable** — probe it. A project whose store listing 404s is still listed (the software exists), but its
`note` must not name that channel. Never inflate a `year`, never invent a DOI, never describe unreleased work
as published.

## Going deeper

- `references/work-record.md` — the full field-by-field work record, visibility levels, the profile sections
  beyond works, and the Zenodo DOI route.

## Related skills

`aoneahsan-cccs-bibtex` (writing the files this skill consumes) · `aoneahsan-cccs-copywriting` (title and
description wording) · `aoneahsan-cccs-documentation` (where the manual-task checklist lives).

<!-- Living corpus (link, never copy): ahsan-notebook/static/assets/personal/orcid-project-projects-files/ -->
