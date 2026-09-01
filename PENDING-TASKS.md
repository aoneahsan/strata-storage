# strata-storage — Pending Tasks

Fleet standards and agreed follow-ups the **agent** owes this project. Open work only; greppable on
`^### TASK-`. On completion: rename `TASK-` → `DONE-` keeping the number **and** move the entry to
`docs/DONE-TASKS.md` with the date and commit. Numbers are never reused.

Companions: `docs/MANUAL-TASKS.md` (owner-only, the owner ticks those off) ·
`docs/REPORTED-ISSUES.md` (consumer-reported bugs) · `docs/RESOLVED-ISSUES.md` (history).

---

### TASK-001 — 3.0.0: a real default key prefix, with migrate-on-read and an opt-out

**Agreed:** 2026-09-01, owner decision, during the 2.9.0 issue-queue pass.
**Depends on:** `2.9.0` (shipped) — specifically `isStorageEnvelope`.

**What.** Give the web adapters a real default key prefix (`strata:`) instead of the empty string, so the
library's keys are distinguishable by name and not only by shape.

**Why it is a major version.** It changes where every existing consumer's data lives. Every key written by
every version up to 2.9.0 is stored unprefixed; a new default makes all of it unreadable on upgrade with
no error — reads simply return `null`.

**Why it depends on 2.9.0 rather than replacing it.** A safe migration is read-through: on a miss at
`strata:<key>`, look for the bare `<key>`, and if it is ours, rewrite it under the prefix. Deciding
whether a bare key is *ours* — with no prefix to go on, in an area shared with every other script on the
origin — is exactly what `isStorageEnvelope` answers. Without it, migrate-on-read would adopt other
applications' keys.

**What it must ship with:**

1. **Migrate-on-read**, gated on the envelope check, so no consumer loses data on upgrade.
2. 🔴 **An opt-out that is documented and easy** — `namespace: false` or an explicit
   `adapters: { localStorage: { prefix: '' } }` — for consumers whose physical key names are frozen.
3. A migration note in the README and on the docs site, and a major-version CHANGELOG entry.

🔴 **The opt-out is not optional, and here is the measured reason.** Trizlink
(`trizlink-project-root/trizlink`) reads two physical keys directly, bypassing this library because both
reads happen before it exists:

- `src/services/logger.ts:32` reads `trizlink:logLevel` straight from `localStorage`; that key is written
  by an instance with **no namespace**, so a default prefix would have this library write
  `strata:trizlink:logLevel` while the logger keeps reading the bare key — the two diverge permanently.
- `src/lib/theme-axes.ts:186` — the pre-paint script — reads `trizlink:<axis>` the same way.

And `trizlink-project-root/02-FROZEN-CONTRACTS.md` §9 freezes its nine device keys against renaming
precisely because moving one signs every installed user out or discards the theme they chose. Trizlink is
not unusual: any consumer with a pre-paint script or a frozen key set is in the same position.

**Not in scope:** changing what `namespace` does today. It already prefixes, it is unaffected, and
consumers using it need no migration.

---

**Last updated:** 2026-09-01 (created — TASK-001 recorded when 2.9.0 closed the reported-issue queue.)
