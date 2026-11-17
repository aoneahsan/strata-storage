---
name: aoneahsan-cccs-firestore
description: 'Firestore data modelling, security rules and indexes: the query-rules-index audit that prevents production permission and index errors, the read budget, denormalisation for query shape, counting without reading. Use when designing a collection, writing a query, editing rules, adding an index, or on a missing-permission error.'
metadata:
  author: aoneahsan
  source: custom-skills/_source-understanding/files/generic-project-rules.md
---

# Firestore

## 🔴 The query → rules → index audit

Without it, *"almost every deployment ends with users hitting 'Missing or insufficient permissions' or 'The
query requires an index' on real pages."* Both are silent locally, because the emulator and an admin account
mask them.

Maintain **`docs/firestore-queries.json`**: every query in the codebase, with its collection, operation,
fields, filters, `orderBy` and composite needs. For each, verify a matching rule allows the intended access
**and** a matching composite index exists. Then deploy both. Re-scan on any data-layer change.

**Test as a NON-admin user.** An admin passes every `isModOrAdmin()` gate, so rules bugs vanish. This has
masked total production breakage twice — a feature read "PASS" while being 100% broken for every ordinary
user, because the only run was as an admin.

🔴 **A LIST query must prove its rule from its OWN filters** — a rule reading `resource.data.ownerUid` needs
`where('ownerUid','==',uid)` on **every** list, count and aggregation, even on a subcollection of an owned
parent; **`sum()`/`average()` need the aggregated field in the composite index**. Prove it with a live 403-vs-200
probe as a non-admin. Read `references/patterns.md` → "A LIST query must prove its rule" before writing a list
query; law: `~/.claude/rules/data-fetch-budget.md`.

And when a write fails, **suspect the side-effect writes** — tags, counters, audit rows — not just the primary
document. The primary is often allowed while a helper write is what is denied.

## The read budget governs the model

Default page size **20**, hard max **50**, cursor pagination, server-side filtering and sorting, counts by
aggregation. A query without a limit is a bug regardless of collection size. Full rule:
`~/.claude/rules/data-fetch-budget.md`.

**Count with `getCountFromServer()`** — one read per 1,000 index entries — or a maintained counter field.
Never read documents to count them.

## 🔴 The 50,000-read daily quota belongs to the live users — an agent never spends it (owner, 2026-10-03)

Spark gives a project **50,000 document reads a day, shared by every user, the admin panel and you.** When it
is gone Firestore answers **429 `Quota exceeded` to every read until midnight Pacific**, and nothing but
waiting brings it back (Blaze is never the fix — `~/.claude/rules/00-house-rules.md`).

**Before any bulk read of a LIVE project** — a migration, an export, a backfill, an audit, a copy tool, a
dry run of one:

1. **Size it first with count queries** (`runAggregationQuery` / `getCountFromServer`: one read per 1,000
   index entries). Never learn a collection's size by reading it.
2. **A run plus its dry runs must stay under 10,000 reads a day** on a project with real users. A dry run
   reads exactly as much as the real run — count every attempt, including the failed ones.
3. **A collection too big for that is not read while users depend on Firestore.** Move the users off first,
   then copy it in runs with a hard `--max-reads` cap and a resumable cursor (order by a timestamp, store the
   watermark). Or copy counts instead of rows.
4. **A tool that can read more than 1,000 documents takes a read budget as a required argument** and stops
   at it; a default of "everything" is a defect.
5. If the quota is hit anyway: **stop, tell the owner at once** with the reset time and what live users lose
   until then, and record it in the project's tracker.

The 2026-10-03 incident (two dry runs exhausted the quota for ~19 hours): `references/patterns.md` → "The quota
incident".

## Model for the query, not for the entity

Firestore has no joins and **no substring search**. Design around the reads you will actually issue:

- **Denormalise** what a list needs onto the document — a fan-out write is cheaper than N reads per render.
- **Composite index per filter+sort combination.** Adding a sort to an existing filter needs a new index.
- **Arrays** with `array-contains` for many-to-many; a subcollection when children are numerous or
  independently queried.
- Text search is not a Firestore feature. For substring or fuzzy search, move that feature to a database that
  has it — the fleet's recorded direction is neonDB for search-heavy data.

## 🔴 What the client is allowed to send

Rules can enumerate permitted keys with `hasOnly([...])`, which pairs directly with the client-side payload
rule: **a blank optional field has its key removed, not sent as `null`.** An unexpected key is refused outright,
while a `null` on a *permitted* key persists as a real null and breaks every reader expecting a string.

Rules police shape and ownership at the door; they cannot produce a message a user can act on, so the ordered
gate still runs above them: `aoneahsan-cccs-data-contract`.

## Rules are the real boundary

Client-side role checks are UI affordances; rules are the security. Deny by default, validate shape and
ownership on write, and keep them readable — a rule nobody can reason about is a rule with a hole.

Who an `isAdmin()` helper is actually true for, how that flag is seeded without letting a user set it, and the
panel these rules exist to serve: `aoneahsan-cccs-platform-admin`.

For rule patterns, indexes and the audit format, read `references/patterns.md`.
