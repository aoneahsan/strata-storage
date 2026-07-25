# Manual / User-Only Tasks — strata-storage

> The ONE place for everything only you (the human) can do. Fixed path: `docs/MANUAL-TASKS.md`.
> Global spec: `~/.claude/rules/manual-tasks.md`. Last updated: 2026-07-25

> ℹ️ **`npm publish` is no longer a manual task.** As of 2026-07-25 the agent publishes npm packages
> automatically once work on them is done, behind a 7-step pre-publish gate — see
> `~/.claude/skills/aoneahsan-cccs-packages-up-to-date/references/publishing.md`. Only the *first-ever*
> publish of a brand-new package still needs you.

## ⏳ Pending manual tasks

| # | Task | Why only you | Status |
|---|------|--------------|--------|
| 1 | **Deprecate `2.8.2` on npm** (recommended) — command below | A public statement about a release; not asked for, so left to you | ☐ Not started |

### Why 2.8.2 should be deprecated

**`2.8.2` on npm is a bad release.** (`2.8.3` was published 2026-07-25 and is now `latest`; verified from
the registry that `npx cap sync` and `registerCapacitorAdapters` are back in the shipped docs.) It was published 2026-06-30T12:46Z, ~55 minutes after 2.8.1,
from a stale working tree. Verified by diffing the two published tarballs:

- The compiled output is **byte-identical** to 2.8.1 — no runtime code or API changed.
- The **bundled docs regressed to a pre-2.8.1 state**: the `npx cap sync` native-setup step and the
  `registerCapacitorAdapters(storage)` helper were removed from both `README.md` and
  `AI-INTEGRATION-GUIDE.md`. Without `cap sync`, the native adapters (`secure`, `sqlite`,
  `preferences`, `filesystem`) silently do not work on-device — so anyone installing the current
  `latest` is missing a required setup step.
- `bugs.url` was changed off GitHub Issues to the marketing contact form.

The version bump was never committed or tagged here, which is why the repo sat at 2.8.1 while npm
served 2.8.2. **2.8.3 restores all of it**, is tagged `v2.8.3`, and is published.

Deprecating 2.8.2 stops anyone pinning to it unknowingly. It is reversible (`npm deprecate <pkg>@2.8.2 ""`):

```bash
npm deprecate strata-storage@2.8.2 "Published in error from a stale tree; docs omit the required 'npx cap sync' step. Use 2.8.3 or later."
```

## ✅ Completed manual tasks

| # | Task | Completed |
|---|------|-----------|
| 1 | DNS `stratastorage-docs.aoneahsan.com` → `aoneahsan.github.io` (Hostinger) | 2026-07-25 |
| 2 | Publish `2.8.3` to npm (now agent-automated; verified live from the registry) | 2026-07-25 |
