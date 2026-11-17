---
name: aoneahsan-cccs-bibtex
description: 'BibTeX as a maintained file format: entry types and the ORCID mapping table, the field contract for software works, ASCII and LaTeX escaping, brace protection, stable citation keys so re-import updates rather than duplicates, the entry-count ceiling. Use when writing a .bib, importing a bibliography, or debugging a mangled import.'
metadata:
  author: aoneahsan
  source: ORCID BibTeX import + troubleshooting documentation, researched 2026-07-25
---

# BibTeX

A `.bib` file here is not a LaTeX artefact — it is **the transport format for the ORCID record**. It is
generated from project data, verified, and imported. Treat it as generated output: regenerate, never hand-edit.

**The standard:** ASCII-only, one entry per project file, a stable citation key, and every `url` probe-verified
before import.

## When to use

- Writing or regenerating any `.bib` file.
- An import failed, imported nothing, or imported mangled characters.
- Choosing or changing a citation key.

**Not for:** deciding what a work *is* on ORCID — its type, identifier or visibility. That is
`aoneahsan-cccs-orcid-profile`.

## Entry type decides the ORCID work type

The importer uses a fixed table. It never reads your intent.

| BibTeX | ORCID work type |
|---|---|
| `@misc`, `@booklet`, `@unpublished` | **Other** |
| `@article` | journal-article |
| `@book` / `@inbook`, `@incollection` | book / book-chapter |
| `@inproceedings`, `@conference`, `@proceedings` | conference-paper |
| `@techreport` | report |
| `@manual` | manual |
| `@phdthesis` | dissertation |

**Software is not reachable from any entry type.** `@misc` is correct for software precisely because it is the
honest catch-all; the type is then fixed by hand after import. Do not invent `@software` — an unrecognised
type falls back silently, which is harder to notice than a known fallback.

## The field contract

```bibtex
@misc{aoneahsan-ztools-2023,
  title        = {{ZTools}: A Privacy-First Browser-Based Utility Toolbox},
  author       = {Mahmood, Ahsan},
  year         = {2023},
  howpublished = {Web application, Android application and Chrome extension},
  url          = {https://ztools.zaions.com},
  note         = {Software. Author: Ahsan Mahmood (ORCID 0009-0006-2311-8687). Distribution: ...},
  keywords     = {developer tools, web utilities, privacy}
}
```

- **`{{Name}}`** — the inner braces stop a style lowercasing a product name or acronym.
- **`author = {Mahmood, Ahsan}`** — `Last, First`, so the parser cannot guess the surname wrongly.
- **`year`** is the real first-release year, from the repository's first commit or the package's first
  publish. Never today's date.
- **`url`** is the single main link, probe-verified. Only DOI/ISBN/ISSN act as *identifiers*; a url is metadata.

## 🔴 ASCII only

ORCID imports bytes as encoded and mangles what it does not expect. **No en-dashes, curly quotes, arrows,
accents or emoji** — anywhere, including inside `note`. Escape `& % $ # _` as `\&` `\%` `\$` `\#` `\_`.

Verify rather than trust: `python3 -c "open('f.bib','rb').read().decode('ascii')"` must not raise.

## Keys, layout, and failure

- **`aoneahsan-<slug>-<year>`.** Stable keys make a re-import **update**; a renamed key creates a duplicate.
  Never renumber a key that has been imported.
- **One `<slug>.bib` per project, plus a combined file** — the per-project file is the regeneration unit and
  isolates a bad entry instantly. Regenerate the combined file in the same edit, or the two drift.
- **Files of 50+ entries are known to fail.** Under that, bisect a failing file by halves — or just import
  the per-project files and see which one breaks.

## Going deeper

- `references/authoring.md` — the full field reference, escaping table, generation recipe, and the
  verification commands.

## Related skills

`aoneahsan-cccs-orcid-profile` (what the work should say and be typed as) · `aoneahsan-cccs-copywriting`
(title and description wording) · `aoneahsan-cccs-markdown` (the README that documents a corpus).

<!-- Living corpus (link, never copy): ahsan-notebook/static/assets/personal/orcid-project-projects-files/ -->
