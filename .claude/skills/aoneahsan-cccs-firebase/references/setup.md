# Firebase setup

## Config from env, validated at boot

```ts
// src/config/firebase.ts
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missing = Object.entries(cfg).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  throw new Error(`Firebase configuration missing: ${missing.join(', ')}`);   // names, never values
}
```

These four are `[REQUIRED]` in `.env.example`. The values are client-public by design — the security boundary
is Firestore rules, not config secrecy.

## Persistent cache

```ts
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
```

A mandatory second layer against the read quota — but never a substitute for query limits.

## Google Sign-In, one helper

```ts
export async function signInWithGoogle(): Promise<User> {
  if (!Capacitor.isNativePlatform()) {
    const { user } = await signInWithPopup(getAuth(), new GoogleAuthProvider());
    return user;
  }
  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
  const { authentication } = await GoogleAuth.signIn();
  const credential = GoogleAuthProvider.credential(authentication.idToken);
  const { user } = await signInWithCredential(getAuth(), credential);
  return user;
}
```

Both paths resolve to a Firebase `User`, so nothing downstream is platform-aware.

## DEV-only automation hook

```ts
// src/services/test-auth.dev.ts — never imported in production
export function installTestAuth() {
  (window as any).__testAuth = async (email: string, password: string) => {
    try {
      return await signInWithEmailAndPassword(getAuth(), email, password);
    } catch (e: any) {
      // Projects with Email Enumeration Protection report invalid-credential,
      // NOT user-not-found — catch both or auto-provisioning silently fails.
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        return createUserWithEmailAndPassword(getAuth(), email, password);
      }
      throw e;
    }
  };
}
```

```ts
if (import.meta.env.DEV) void import('./services/test-auth.dev').then((m) => m.installTestAuth());
```

Build gate: `grep -r "__testAuth" dist/` must return nothing.

**Never overwrite an existing user's `role`** in such a hook — an unconditional re-pin has silently clobbered
Admin-SDK-provisioned personas on sign-in. Provision only brand-new accounts, at least privilege.

## Deployment

```bash
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Never `--only firestore`. Never `firebase deploy` bare on a project with indexes you have not exported.

```json
// firebase.json — static files win first; only dot-less paths reach the SPA
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**", "**/*.map"],
    "headers": [
      { "source": "/assets/**",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
    ],
    "rewrites": [{ "regex": "^/[^.]*$", "destination": "/index.html" }]
  }
}
```

Firebase serves an existing file before applying a rewrite, so prerendered per-route HTML is returned rather
than the SPA shell — which is what makes `aoneahsan-cccs-postbuild-seo-html` work on this host.

The rewrite matches **only paths with no dot**, so scanner probes (`/wp-login.php`, `/.env`) and missing
assets fall through to a `404.html` you ship in `public/` — a real 404 under 1 KB, not a soft one (proven on a
live preview channel 2026-09-11). 🔴 An app whose routes contain a dot keeps
`{ "source": "**", "destination": "/index.html" }`; the 50 KB budget on `index.html` still holds it. Ship a
real `robots.txt` and favicon too, and keep `index.html` small (≤ 50 KB gzipped — the deploy gate enforces it)
with the code in hashed bundles.

After the first deploy, cap retention — otherwise storage grows by one full copy per deploy:

```bash
TOKEN=$(python3 -c "import json,os;print(json.load(open(os.path.expanduser('~/.config/configstore/firebase-tools.json')))['tokens']['access_token'])")
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  "https://firebasehosting.googleapis.com/v1beta1/sites/<site>/config?updateMask=maxVersions" -d '{"maxVersions":"3"}'
```

`.well-known/assetlinks.json` **is** served despite the `**/.*` ignore pattern — verified. No change needed
for deep links.

## Multi-project CLI

```bash
firebase use --add          # alias a project
firebase use <alias>        # switch
firebase projects:list
```

Check `.firebaserc` before deploying in a repo with more than one target — deploying to the wrong project is
recoverable but noisy.
