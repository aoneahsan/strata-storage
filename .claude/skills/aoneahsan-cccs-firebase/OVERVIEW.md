# Overview — `aoneahsan-cccs-firebase`

## Purpose

Firebase as used across these projects: which products are inside the free-tier boundary, how configuration
and deployment are driven from the CLI, and how authentication works across web and native.

## What this skill does

- Leads with the **`--only firestore` hazard** — it deploys rules and indexes together, so an index absent
  locally is deleted — and gives the two safe sub-targets.
- Draws the **free-tier boundary**: Auth, Firestore, Hosting and Analytics in; Cloud Functions and Cloud
  Storage out, with the approved alternatives; the two banned Capacitor Firebase packages restated.
- Notes the 50,000 read/day limit and connects it to the fetch budget it produced.
- States the **Hosting quotas** — 10 GB stored, 10 GB/month transferred, then the site goes dark — and the
  four rules that keep a site far from them: a small file answering unknown URLs, no heavy assets in
  `public/`, `maxVersions` on every site, and Cloudflare (never Blaze) when real users approach the cap.
- Specifies **Google-only authentication** — popup on web, the codetrix plugin plus `signInWithCredential` on
  native so both land the same user — and rules out `@capacitor-firebase/authentication`.
- Carves out the **DEV-only, UI-less test hook** for automation, with dynamic import and a build-gate check
  that it never reaches `dist/`.
- Requires the client-public web config to still be env-driven with a boot check.
- Establishes that CLI operations are **agent work, not manual steps**, and that hosting/rules/indexes
  deployment is pre-authorised under `code/`.
- Places Firebase Analytics as one of three sinks behind a degrading service, and flags the AD_ID obligation
  it creates on Android.

## When it gets invoked

- Setting up Firebase in a project, or configuring auth providers.
- Deploying hosting, security rules or indexes.
- A site nears its Hosting limits, was disabled, or the Console says "hosting storage is full".
- Wiring Google Sign-In on web or native.
- Deciding whether a Firebase product may be used.
- Wiring analytics.

## Where it applies

Every project using Firebase — the majority of the fleet. Projects on Supabase map the concerns across; see
`aoneahsan-cccs-supabase`.

## Sources

`_source-understanding/files/generic-project-rules.md` (R-024, R-030, R-033) and
`_source-understanding/files/prompt-logs.md` (the Firebase-CLI-does-everything directive, the Google-auth
reference projects, the automation test-hook pattern).

## Related skills

`aoneahsan-cccs-firestore` (data, rules and indexes) · `-react-api-tanstack-query` (the read budget) ·
`-capacitor` (the `serverClientId` env trap) · `-android-finalization` (AD_ID) · `-nodejs` (why Functions are
out) · `-fileshub` (why Storage is out).

## Maintenance

Re-check when the owner changes the free-tier boundary or adopts a Firebase product currently excluded.
