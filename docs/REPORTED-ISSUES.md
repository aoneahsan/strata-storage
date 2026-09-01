# strata-storage — Reported Issues (open queue)

The ONE place consumers/agents report strata-storage issues for the owner to fix HERE (in this package).
**Open entries only** — each one a `### ISSUE-NN — <title>` section with full detail (symptom, verbatim
errors, repro, affected version, root cause if diagnosed, reporter project + date). On fixing: MOVE the
entry to `docs/RESOLVED-ISSUES.md` (add resolution date + the fixing npm version) and mirror any
consumer-relevant guidance into the docs. External reporters may also use GitHub Issues; entries here are
the authoritative fix queue. Fleet rule: `~/.claude/rules/project-issue-reporting.md` (owner machines).

🔴 **The next issue is `ISSUE-11`.** Numbers are never reused, even after an entry is archived — the next
id is one past the highest that has ever existed in either file. `ISSUE-09` was briefly assigned twice
(2026-08-25 LabFlow/ClearHire and 2026-09-01 Trizlink); the later filing was renumbered to `ISSUE-10`
when both were resolved.

---

## Open

_None._

All ten entries filed to date are resolved and recorded in
[`docs/RESOLVED-ISSUES.md`](./RESOLVED-ISSUES.md). The last six — `ISSUE-01`, `06`, `07`, `08`, `09` and
`10`, reported by LabFlow, ClearHire, HabitForge, LifeWell and Trizlink — were closed together in
**`2.9.0`** on 2026-09-01, each verified by driving the reporter's own repro in a real browser against
published `2.8.5` and then against the release.

**Known and deliberate, not a defect:** since `2.9.0` a web adapter identifies its own data by shape, so a
key written to the same storage area by anything other than this library is invisible to `keys()` by
design. `setLogLevel('debug')` reports each skip with its key and reason. The related **3.0.0** work — a
real default key prefix with migrate-on-read and an opt-out — is tracked in the root
[`PENDING-TASKS.md`](../PENDING-TASKS.md) as `TASK-001`, not here: it is planned work, not a reported bug.

**Last updated:** 2026-09-01 (queue emptied — all six open entries fixed in 2.9.0 and moved to
`docs/RESOLVED-ISSUES.md`; the duplicate `ISSUE-09` renumbered to `ISSUE-10` on the way out.)
