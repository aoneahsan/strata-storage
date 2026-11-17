# The ORCID work record — fields, visibility, and the rest of the profile

Depth behind `SKILL.md`. Read when editing a work by hand in the ORCID UI, or when the profile itself (not
just its works) needs attention.

## The work record, field by field

| ORCID field | Required | What to put | Comes from BibTeX? |
|---|---|---|---|
| **Work type** | ✅ | `Software` for anything built and shipped; `Website` for a content-first site | ❌ **never** — always *Other* on import; set by hand |
| **Title** | ✅ | `<Product Name>: <plain descriptor>` | ✅ `title` |
| Subtitle | | Usually unnecessary — the descriptor is already in the title | ❌ |
| Translated title | | Only for a genuinely bilingual product | ❌ |
| **Publication date** | | Year of first public release. Get it from the repository's first commit or the package's first publish — never today's date | ✅ `year` |
| **Work identifier** | | DOI, ISBN, ARK, or **URL** as a last resort | Partly — BibTeX carries only DOI/ISBN/ISSN |
| **URL** | | The project's single main link | ✅ `url` |
| Citation | | The BibTeX entry itself; ORCID stores and re-exports it | ✅ whole entry |
| Description | | One or two honest sentences | partly via `note` |
| Contributors | | Only real contributors, with their own ORCID iDs where known | ✅ `author` |
| Language / Country | | Optional | ❌ |

## Visibility

Every work carries its own visibility, independent of the record's default:

| Level | Who sees it | Use for |
|---|---|---|
| **Everyone** | public | anything you would put on a CV — the default for these works |
| **Trusted parties** | orgs you have authorised | rarely useful here |
| **Only me** | you | a work you want recorded but not advertised |

Set the record-level default under **Account settings → Visibility preferences**; it applies to *newly added*
items only, so a bulk import inherits whatever the default was at import time. Check it before importing 23
works rather than editing 23 afterwards.

## The rest of the profile

Works are the bulk of it, but the sections above them are what a reader actually skims:

- **Biography** — a short paragraph. Same voice as the GitHub profile: what you build, what stack, what it
  runs on. `aoneahsan-cccs-copywriting` applies; no hype, no invented numbers.
- **Websites & social links** — portfolio, GitHub, LinkedIn, npm, company site. Every URL probe-verified.
- **Keywords** — the terms someone would search to find this kind of work. Reuse the `keywords` already
  written into the `.bib` corpus so the two agree.
- **Employment / Education / Invited positions** — factual, dated, and consistent with the CV at
  `aoneahsan.com/cv`. A mismatch between the ORCID record and the public CV is worse than an empty section.
- **Also known as** — name variants that appear as an author elsewhere.

## The Zenodo DOI route

Worth it when a project is public, stable, and you want it formally citable.

1. The GitHub repository must be **public** — Zenodo cannot see a private one.
2. Enable the repository in Zenodo's GitHub integration.
3. Cut a GitHub **release**. Zenodo archives that tag and mints a DOI.
4. Connect ORCID in Zenodo, and the work is pushed onto the record — typed correctly, with a real identifier,
   no BibTeX involved.
5. **Remove that project from `aoneahsan-all-works.bib`**, or the same work arrives twice by two routes and
   will not group, because only one copy carries the DOI.

A DOI is permanent and public. It is the owner's decision, not a default — ask.

## What breaks a record

| Mistake | Consequence |
|---|---|
| Importing, then never retyping | 23 works sit as *Other* — accurate but imprecise for a developer portfolio |
| Using today's year as the publication date | Misrepresents a multi-year body of work as written this week |
| Listing a store channel that 404s | The record claims a distribution that a reader cannot reach |
| Inventing a DOI | Fabricated identifier — never |
| Importing a DOI-bearing work by BibTeX as well | Duplicate works that cannot group |
| Renaming a citation key after import | The next import creates a duplicate instead of updating |
