# Overview — `aoneahsan-cccs-firestore`

## Purpose

Firestore data modelling, security rules and indexes. Its organising concern is that the two most common
Firestore production failures — missing permissions and missing indexes — are both invisible during
development and both surface on real user pages.

## What this skill does

- Requires the **query → rules → index audit** backed by `docs/firestore-queries.json`, re-run on any
  data-layer change, so every query is verified against a rule and an index before deploy.
- Carries the two traps that make these bugs invisible: **testing as an admin** passes every role gate and
  hides rules bugs (recorded as having masked total production breakage twice), and a denied write is often a
  **side-effect write** — a counter, tag or audit row — rather than the primary document.
- Applies the **read budget** to the data model: 20 default, 50 max, cursor pagination, server-side
  filter/sort, and counting via `getCountFromServer` or a counter field rather than by reading documents.
- Sets modelling guidance around query shape rather than entity shape: denormalise for list reads, one
  composite index per filter+sort combination, arrays versus subcollections, and the absence of text search.
- Records the fleet direction that search-heavy features move to a database with real text search rather than
  being forced into Firestore.
- States that rules — not client-side role checks — are the security boundary, with deny-by-default and
  readability as a security property.

## When it gets invoked

- Designing a collection or document shape.
- Writing or reviewing a query.
- Editing `firestore.rules` or `firestore.indexes.json`.
- Users hit "Missing or insufficient permissions" or "The query requires an index".
- Adding search, filtering or counting to a feature.

## Where it applies

Every project using Firestore.

## Sources

`_source-understanding/files/generic-project-rules.md` (R-033 — the daily audit and its stated motivation),
`_source-understanding/files/prompt-logs.md` (the read-quota incident, the admin-testing trap and its two
recorded occurrences, the neonDB direction).

## Related skills

`aoneahsan-cccs-firebase` (project setup and the deploy hazard) · `-react-api-tanstack-query` (the budget in
client terms) · `-react-state-zustand` (what does not belong in a store).

## Maintenance

The canonical budget lives at `~/.claude/rules/data-fetch-budget.md`. The neonDB direction has no global rule
yet and is flagged in the prompt-logs record.
