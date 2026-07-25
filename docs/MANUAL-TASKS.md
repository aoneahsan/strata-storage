# Manual / User-Only Tasks — strata-storage

> The ONE place for everything only you (the human) can do. Fixed path: `docs/MANUAL-TASKS.md`.
> Global spec: `~/.claude/rules/manual-tasks.md`. Last updated: 2026-07-25

## ⏳ Pending manual tasks

| # | Task | Why only you | Status |
|---|------|--------------|--------|
| 1 | **Publish `2.8.3` to npm** — `yarn build` then `npm publish` | `npm publish` is user-only by standing rule | ☐ Not started |
| 2 | **Deprecate `2.8.2` on npm** (optional but recommended) — see below | Registry mutation, same reason as publish | ☐ Not started |

### Why 2.8.3 needs publishing

**`2.8.2` on npm is a bad release.** It was published 2026-06-30T12:46Z, ~55 minutes after 2.8.1,
from a stale working tree. Verified by diffing the two published tarballs:

- The compiled output is **byte-identical** to 2.8.1 — no runtime code or API changed.
- The **bundled docs regressed to a pre-2.8.1 state**: the `npx cap sync` native-setup step and the
  `registerCapacitorAdapters(storage)` helper were removed from both `README.md` and
  `AI-INTEGRATION-GUIDE.md`. Without `cap sync`, the native adapters (`secure`, `sqlite`,
  `preferences`, `filesystem`) silently do not work on-device — so anyone installing the current
  `latest` is missing a required setup step.
- `bugs.url` was changed off GitHub Issues to the marketing contact form.

The version bump was never committed or tagged here, which is why the repo sat at 2.8.1 while npm
served 2.8.2. **2.8.3 restores all of it** and is tagged `v2.8.3` in this repo.

Suggested deprecation notice for #2:

```bash
npm deprecate strata-storage@2.8.2 "Published in error from a stale tree; docs omit the required 'npx cap sync' step. Use 2.8.3 or later."
```

## ✅ Completed manual tasks

| # | Task | Completed |
|---|------|-----------|
| 1 | DNS `stratastorage-docs.aoneahsan.com` → `aoneahsan.github.io` (Hostinger) | 2026-07-25 |
