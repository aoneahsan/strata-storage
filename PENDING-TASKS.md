# strata-storage — Pending Tasks

Fleet standards and agreed follow-ups the **agent** owes this project. Open work only; greppable on
`^### TASK-`. On completion: rename `TASK-` → `DONE-` keeping the number **and** move the entry to
`docs/DONE-TASKS.md` with the date and commit. Numbers are never reused.

Companions: `docs/DONE-TASKS.md` (history) · `docs/MANUAL-TASKS.md` (owner-only, the owner ticks those
off) · `docs/REPORTED-ISSUES.md` (consumer-reported bugs) · `docs/RESOLVED-ISSUES.md`.

---

## Open

_None._

🔴 **The next id is `TASK-003`.** `DONE-001` (the 3.0.0 default key prefix) and `DONE-002` (timers holding
a Node process open) both shipped in `3.0.0` on 2026-09-01 and are recorded in
[`docs/DONE-TASKS.md`](docs/DONE-TASKS.md).

---

**Last updated:** 2026-09-01 (queue emptied — both tasks shipped in 3.0.0.)

### TASK-004 — AI: account 3 via the hourly lease, the cheapest paid fallback, and economy in a grant's last 24 h

<!-- fleet:ai-cheapest-fallback-v1 -->
- **Source:** owner, 2026-10-25 (LifeWell OD-115): *"when we do not have usable credits we use most lowest model … so we
  will ensure longest use value from paid plans … go to lowest automatically when it's like 24h remaining with remaining
  credits"*; *"credits added in fileshub … ai-accounts/3 … enabled it for "all projects" so use that for all projects"*.
  Standard: `aoneahsan-cccs-fileshub-ai` → `references/fallback-and-expiry.md` — never ask the owner these again.
- **Applies when:** the project calls an AI model (now, or when it adds AI). No AI → close it as not applicable, one line why.
- **LEFT:** (1) free credit through FilesHub's hourly lease (`POST …/ai/lease`; account 3 serves all projects; the call
  ledger) — still on `GET …/ai/route`? move it (`ai-credit-lease` tracker); (2) cap every call at economy when
  `credits.expires_at` is within 24 h (pure function + test watched failing); (3) the paid fallback on the cheapest live
  model from the secret `<PROVIDER>_FALLBACK_MODEL` — today `gpt-6-luna` ($0.10/$0.50) or `claude-haiku-5-5`, checked
  with `GET /v1/models`, reasoning-model request shape, unset = pause; (4) one live call proving each path.
- **Reference:** LifeWell `supabase/functions/_shared/{ai-broker,ai-lease,ai-ledger,ai-lease-math,ai-openai-shape}.ts`.
  Platform half: FilesHub TASK-010.
- **Priority:** high · **Added:** 2026-10-25 · **Close:** rename `DONE-`, move to `docs/DONE-TASKS.md`; tracker row
  `done` (`~/Documents/01-code/docs/tracking/ai-cheapest-fallback-tracker.json`); one line in root CLAUDE.md + AGENTS.md.
