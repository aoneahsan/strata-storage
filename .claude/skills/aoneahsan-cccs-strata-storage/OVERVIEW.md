# Overview — `aoneahsan-cccs-strata-storage`

## Purpose

Implementing and configuring `strata-storage` — the owner's zero-dependency universal storage package and
the designated storage layer in the Capacitor package baseline. One API over web and native backends, so a
project stops hand-wrapping localStorage/IndexedDB/Keychain per platform.

## What this skill does

- Makes the project-unique **`namespace`** a hard rule (ISSUE-01/08): both `prefix` forms are unsafe
  guidance, while `namespace` has consistently produced isolated physical keys.
- Carries the setup contract: provider-free `defineStorage()`, lazy init, optional peers only for what the
  host uses, and the entry-point import map (core / capacitor / react / vue / angular / firebase).
- Gives the **backend decision guide** — which `storage` type per need on web and mobile, including `secure`
  for anything sensitive on native and `sqlite` for structured multi-store data.
- States that every power feature (encryption, compression, TTL, query, cross-tab sync, integrity, durable,
  mirror) is **opt-in and off by default** — never assumed on.
- Requires backend-scoped subscriptions because an unscoped `subscribe()` fans out to unsupported adapters
  and can abort app boot (ISSUE-07).
- Draws the honesty lines: native secrets in `secure` only; no secrets in web storage at all; encrypted web
  values are only as safe as the co-shipped key.
- Reminds that the package is itself a Capacitor plugin (`cap sync` after install) and routes package bugs
  to the package repo's `docs/REPORTED-ISSUES.md`.

## When it gets invoked

- Adding client-side or native storage to any project.
- Choosing between localStorage / IndexedDB / cookies / secure / SQLite / filesystem.
- Persisting settings, sensitive values, or offline data; wiring cross-tab or cross-device sync.
- Storage-related console errors (foreign-key JSON parse noise is the known signature).
- Reviewing a project that hand-rolls storage wrappers.

## Where it applies

Every web and Capacitor project; pairs with the zustand-persistence and URL-state skills.

## Sources

`_source-understanding/projects/strata-storage-package.md` (architecture, entry points, the open LabFlow
issue with verified root cause) · the package's own `AI-INTEGRATION-GUIDE.md` and docs site
(`stratastorage.aoneahsan.com`) — the current-version truth.

## Related skills

`aoneahsan-cccs-capacitor-packages-setup` (where strata sits in the baseline) · `-react-state-zustand`
(persistence adapter) · `-url-state-persistence` (the `url` backend's concern) · `-capacitor` (native shell)
· `-report-project-issues` (filing package bugs).

## Maintenance

Re-check when ISSUE-01/07/08 ships a fix; keep `namespace` until physical-key probes prove a replacement.
