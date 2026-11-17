# ORCID profile — overview

## Purpose

ORCID gives a researcher a persistent identifier and a record of their works. The owner's works are **shipped
software products**, not journal articles — the case ORCID's tooling supports least well. This skill exists so
a session adding projects to ORCID **0009-0006-2311-8687** knows the two facts that decide the whole approach
up front: an imported work always arrives typed *Other*, and without a DOI nothing groups.

Established 2026-07-25, when the owner asked for all 23 flagship projects to be imported into ORCID via
BibTeX. Researching the importer first turned what looked like a mechanical file-generation task into one with
a mandatory manual step — which is now recorded rather than discovered again.

## What this skill does

- Picks the correct ORCID **work type** for each kind of product the owner ships.
- Explains why the BibTeX importer cannot assign *Software*, and where the retype step belongs.
- Explains what ORCID accepts as an **identifier**, and the grouping consequences of not having one.
- Sets the honesty bar for a work record: probe-verified reachability, real release years, no invented DOIs.
- Says when a **Zenodo DOI** is worth minting, and what changes once a work has one.

## When it gets invoked

- "update ORCID profile info" / "update my ORCID"
- "add my projects to ORCID" / "import works into ORCID"
- "what work type should this be?"
- "should I get a DOI for this?"
- Any edit to the corpus at `personal/orcid-project-projects-files/`.

## Where it applies

| Scope | Applies |
|---|---|
| Project types | Any project that becomes a work on the record — app, package, CLI, extension, site |
| Stack override | Not stack-specific. The record describes the product, never its implementation |

## Sources

| Source | Record |
|---|---|
| ORCID support: importing works from BibTeX, adding works manually, work types | researched 2026-07-25 |
| BibTeX entry type → ORCID work type mapping (CASRAI output types) | researched 2026-07-25 |
| Owner decision: `@misc` + manual retype, over accepting *Other* | 2026-07-25 |

## Related skills

- `aoneahsan-cccs-bibtex` — writes the files this skill decides the content of
- `aoneahsan-cccs-copywriting` — the title and description wording inside a work record
- `aoneahsan-cccs-documentation` — where the owner-only retype checklist lives

## Maintenance

- **Living corpus this skill points at:** `ahsan-notebook/static/assets/personal/orcid-project-projects-files/`
- **Last reviewed:** 2026-07-25
