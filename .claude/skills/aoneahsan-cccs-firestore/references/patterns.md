# Firestore patterns

## Rules: deny by default

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn()      { return request.auth != null; }
    function isOwner(uid)      { return isSignedIn() && request.auth.uid == uid; }
    function isAdmin()         { return isSignedIn() &&
                                  get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin','super_admin']; }

    match /users/{uid} {
      allow read:   if isOwner(uid) || isAdmin();
      allow create: if isOwner(uid) && request.resource.data.keys().hasOnly(['name','email','createdAt']);
      allow update: if isOwner(uid) && request.resource.data.role == resource.data.role;   // cannot self-promote
      allow delete: if isAdmin();
    }

    match /{document=**} { allow read, write: if false; }   // explicit catch-all deny
  }
}
```

Three things earn their place: `hasOnly` on create (so a client cannot inject fields), the role-immutability
check on update (self-promotion is the classic hole), and the explicit catch-all — a collection you forget to
match is otherwise unprotected only if `allow` was written loosely elsewhere.

`get()` inside a rule **costs a read** and is subject to rule-evaluation limits. Prefer a custom claim for
role checks on hot paths.

**The `resource == null` trap.** A read rule clause like `allow read: if isStaff() || resource == null || …`
is evaluated left-to-right with NO implicit auth gate — `resource == null` (true for a not-yet-created doc,
used so a get-or-create's `getDoc` resolves cleanly) is reachable by an **unauthenticated** client, turning
the rule into an anonymous existence oracle: allowed → the id doesn't exist, permission-denied → it does.
Always wrap it: `allow read: if isSignedIn() && (isStaff() || resource == null || <membership>)`. Note it
only ever satisfies a single-doc `get`, never a `list` (query results can't be null), so it never widens
list access — but the existence leak on `get` is real. (taxease, 2026-07-21.)

## Indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "jobs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status",    "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Field order in the index must match the query: equality filters first, then the range/sort field. A query
adding a second sort needs a new index — the error message contains a console link that creates it, but add it
to the file too or the next deploy removes it.

## `docs/firestore-queries.json`

```jsonc
{
  "lastUpdated": "2026-07-20",
  "nextReview": "2026-07-23",
  "queries": [
    {
      "id": "jobs-list-by-status",
      "file": "src/services/jobs.ts:42",
      "collection": "jobs",
      "operation": "query",
      "filters": ["status ==", "ownerId =="],
      "orderBy": ["createdAt desc"],
      "limit": 20,
      "compositeIndex": "status ASC, createdAt DESC",
      "ruleVerified": true,
      "indexVerified": true
    }
  ]
}
```

## Counting

```ts
import { getCountFromServer, query, collection, where } from 'firebase/firestore';

const snap = await getCountFromServer(
  query(collection(db, 'jobs'), where('status', '==', 'failed')),
);
const failed = snap.data().count;
```

For a count displayed on every render, maintain a counter field updated on write instead — an aggregation per
render is still a read per render.

## Cursor pagination

```ts
let q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'), limit(20));
if (cursor) q = query(q, startAfter(cursor));

const snap = await getDocs(q);
const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const nextCursor = snap.docs.at(-1);
```

Never `offset` — Firestore bills for skipped documents, so page 50 costs fifty pages of reads.

## Scoped listeners

```ts
const unsub = onSnapshot(doc(db, 'jobs', id), (snap) => setJob(snap.data()));
return () => unsub();                       // always detach
```

A listener on an unbounded collection is the same bug as an unbounded fetch, charged continuously.

## Testing as a non-admin

```ts
// Two identities, deliberately. t1 is an admin in most projects — using it hides rules bugs.
await signIn('aoneahsan.apps.t1+1@gmail.com');   // plain user — exercise USER flows here
await signIn('aoneahsan.apps.t1@gmail.com');     // admin — only for genuinely admin-side checks
```

Credentials: `~/.claude/rules/automation-test-accounts.md`. The password is never in a repo.

## Denormalisation with fan-out

```ts
// Author name is copied onto each post so a list needs one query, not N+1.
await updateDoc(doc(db, 'users', uid), { displayName: newName });
const posts = await getDocs(query(collection(db, 'posts'), where('authorId', '==', uid), limit(50)));
const batch = writeBatch(db);
posts.forEach((p) => batch.update(p.ref, { authorName: newName }));
await batch.commit();
```

Batches cap at 500 operations. Beyond that, chunk — and consider whether the denormalised field is worth the
write amplification.

## Moved verbatim from SKILL.md (2026-11-02)

### A LIST query must prove its rule from its own filters

🔴 **A LIST query must prove its rule from its OWN filters.** Firestore will not read the parent, or the
matched documents, to decide. So a rule reading `resource.data.ownerUid` requires
`where('ownerUid','==',uid)` on **every** list, count and aggregation — *including on a subcollection whose
parent the caller already owns*. A builder keyed on `classId`/`studentId` alone is the recurring failure
shape: obviously-correct-looking code that is denied at runtime. Same obligation for an admin branch
comparing `claimSchool() == resource.data.schoolId`. And **`sum()`/`average()` need the aggregated field in
the composite index**, not just the filtered ones (`count()` does not). On one project this class produced
**20 production-breaking defects** while typecheck, lint and build all passed and the console stayed silent.
Prove it with a live 403-vs-200 probe as a non-admin — never by reading the rule. Full text:
`~/.claude/rules/data-fetch-budget.md`.

### The quota incident

*Video Controls Plus, 2026-10-03:* two dry runs of a Firestore→Supabase copy tool read a 123,416-document
analytics collection and exhausted the quota; signed-in users lost cloud reads for about 19 hours. The
collection had been counted, and the count was never compared with the quota.
