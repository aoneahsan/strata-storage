# BibTeX — overview

## Purpose

The owner maintains a BibTeX corpus for one reason: it is the only route that gets self-published **software**
onto an ORCID record in bulk. ORCID's Search & Link tools cover publishers and datasets, not apps and npm
packages, so a hand-generated `.bib` file is the mechanism.

That makes these files **generated transport artefacts**, not documents. They are produced from project data,
verified against live URLs, imported, and regenerated whenever a project changes. This skill exists so a
session treats them that way instead of hand-editing them into drift.

Established 2026-07-25 alongside `aoneahsan-cccs-orcid-profile`, when 23 projects were prepared for import.

## What this skill does

- Maps every BibTeX entry type to the ORCID work type it produces — and explains why `@misc` is correct for
  software despite landing as *Other*.
- Sets the field contract for a software work: brace protection, author form, real release year, url.
- Enforces **ASCII-only** content, with the escaping table for the characters that must be escaped.
- Defines the citation-key convention that makes a re-import update rather than duplicate.
- Defines the file layout — one file per project plus a combined import file — and how to debug a failing
  import by bisection.

## When it gets invoked

- "regenerate the bib files" / "update the BibTeX"
- "the ORCID import failed" / "the characters came out wrong"
- "what should the citation key be?"
- Any edit under `personal/orcid-project-projects-files/`.
- Any task that produces a bibliography for a reference manager.

## Where it applies

| Scope | Applies |
|---|---|
| Project types | Any project that becomes a work on the ORCID record |
| Stack override | Not stack-specific — BibTeX is the format regardless of what the project is built in |

## Sources

| Source | Record |
|---|---|
| ORCID: importing works from a BibTeX file | researched 2026-07-25 |
| ORCID: BibTeX issues and troubleshooting (encoding, 50+ entry failures, bisection) | researched 2026-07-25 |
| BibTeX entry type → ORCID work type mapping | researched 2026-07-25 |

## Related skills

- `aoneahsan-cccs-orcid-profile` — decides what the work is; this skill writes the file
- `aoneahsan-cccs-copywriting` — the wording inside `title` and `note`
- `aoneahsan-cccs-markdown` — the README documenting a corpus folder

## Maintenance

- **Living corpus this skill points at:** `ahsan-notebook/static/assets/personal/orcid-project-projects-files/`
- **Last reviewed:** 2026-07-25
