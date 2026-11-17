---
name: aoneahsan-cccs-firebase
description: 'Firebase: the free-tier boundary, CLI-driven config and deployment, the deploy flag that destroys indexes, the Hosting quotas that switch a site off (10 GB/month transfer, 10 GB storage, version retention), Google-only auth across web and native, analytics wiring. Use when setting up Firebase, deploying hosting or rules, when a site nears its Hosting limits or was disabled ("hosting storage is full"), wiring authentication, or choosing which Firebase products a project may use.'
metadata:
  author: aoneahsan
  source: custom-skills/_source-understanding/files/generic-project-rules.md
---

# Firebase

> 🔴 **Hosting moved (owner, 2026-11-05):** every frontend deploys on Cloudflare Pages; a Firebase-hosted site migrates (`~/.claude/rules/cloudflare-hosting.md`). The Hosting notes below apply only until a site has moved.

## 🔴 The deploy flag that destroys indexes

```bash
firebase deploy --only firestore:rules      # ✅
firebase deploy --only firestore:indexes    # ✅
firebase deploy --only firestore            # ❌ NEVER — this can delete your indexes
```

`--only firestore` deploys rules *and* indexes as a unit, and an index missing from your local file is
**removed**. Always name the sub-target.

## The free-tier boundary

| Use | Do not use |
|---|---|
| **Auth** · **Firestore** · **Hosting** · **Analytics** | **Cloud Functions** — needs the paid Blaze plan → Cloudflare Workers instead |
| | **Cloud Storage** — → FilesHub (`aoneahsan-cccs-fileshub`) |
| | `@capacitor-firebase/crashlytics` and `/performance` — banned |

Firestore's free tier is **50,000 reads/day**, and exhausting it takes production down for every user until
reset. That is not hypothetical — see `aoneahsan-cccs-react-api-tanstack-query` for the budget it produced.

## 🔴 Hosting quotas — a site goes dark at 10 GB/month transfer

Spark Hosting allows **10 GB stored** (past it, deploys fail) and **10 GB/month transferred** (past it, the
site is disabled until the next month). Two incidents on 2026-09-11: a 2.36 MB single-file page answered
every URL through a catch-all rewrite, and ai-ztools kept 305 deploys (9.59 GB) while prefetching a 67 MB
model on every page view.

- **The file answering unknown URLs stays ≤ 50 KB gzipped** — the scoped rewrite in `references/setup.md`,
  a `404.html` under 1 KB, and a real `robots.txt` and favicon.
- **No heavy asset in `public/`, and none prefetched on idle** — models, engines and big media go to FilesHub
  or a server. A deploy stays ≤ 150 MB, with no file over 25 MiB.
- **Every site sets `maxVersions`** (3; ztools 1) right after its first deploy.
- **The gate refuses** the first two (`pretooluse-hosting-budget-gate.sh`); `/hosting-audit` shows the whole
  fleet; a session line fires for any site past 90%.
- **Real users near the cap** → the owner moves the site to Cloudflare. **Never Blaze.**

Full law and the numbers: `~/.claude/rules-detail/firebase-cli-automation.md` → Hosting quotas.

## 🔴 A deploy is verified by pixels, before and after (owner directive 2026-09-25)

Never deploy a build you have not seen render. Build fresh, serve **that exact output**, load it in the
automation browser at 1440 and 390, and confirm **visible content in the screenshot** with zero console
errors. Then stamp it (`pretooluse-deploy-verify-gate.sh --stamp <publicDir> "<what you saw>"`) and deploy.
After the deploy, repeat the check on the **live URL** and compare the served bundle hash with the local
one. Green gates and a populated DOM or semantics tree are not proof: the 2026-09-25 callvault page had
both and was blank. Law and CDP recipe: `rules/deploy-verification.md`.

## 🔴 Never move a project to Blaze — the owner does, by hand

Blaze **is** a Cloud Billing account linked to the project. No agent links, enables or switches one on any
Firebase or Google Cloud project, by any means (owner directive 2026-09-10, `rules/00-house-rules.md`). That
includes the Firebase CLI's own offer: `ext:install`, `ext:update`, `deploy --only extensions` and a bare
`deploy` of a `firebase.json` that declares extensions all prompt to pick a billing account — **never answer
it**; abort, or run with `--non-interactive` so the CLI refuses instead. A step that needs Blaze **stops and
asks**. `pretooluse-billing-gate.sh` refuses those commands; the full law and the read-only "which projects am
I paying for?" audit are in `rules-detail/zero-cost.md`.

## Google-only auth

Web: Firebase `signInWithPopup` + `GoogleAuthProvider`.
Native: `@codetrix-studio/capacitor-google-auth` for the id token, then `signInWithCredential` — landing the
**same** Firebase user. **Never `@capacitor-firebase/authentication`.**

No email/password in the product UI. The one exception is a **DEV-only, UI-less test hook** for automation,
dynamically imported under `import.meta.env.DEV`, with its absence from `dist/` enforced as a build gate.

Native setup — `google-services.json`, SHA-1/256 in the console, the web client id as `serverClientId` — is
owner work; record it in `docs/MANUAL-TASKS.md`. Note that `serverClientId` is exactly the value the
Capacitor env trap silently blanks (`aoneahsan-cccs-capacitor`).

## Config is public, and still env-driven

The Firebase web config is client-public by design, but it still lives in `.env` with a boot-time check, so a
misconfigured deploy fails loudly instead of half-working.

## The CLI does the work

Firebase CLI operations — project settings, auth providers, Firestore, deployment — are agent-operable and
should be done directly rather than handed back as manual steps. Deploying hosting, rules and indexes is
pre-authorised for projects under `code/`. **Billing is the exception** — CLI-possible, and still never the
agent's (above).

## Analytics

Firebase Analytics is one of three sinks behind a single service that skips whichever providers lack keys —
see `aoneahsan-cccs-coding-standards`. If it runs natively it reads the advertising ID, which obliges the
AD_ID manifest permission and the matching Play declarations
(`aoneahsan-cccs-android-finalization`).

For project setup, security-rule patterns and deployment, read `references/setup.md`.
