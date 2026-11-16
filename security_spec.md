# Security Specification — Leps Commerce Firestore Rules

## 1. Data Invariants & Master Source of Truth

1. **Master Source of Truth (`catalogs/{catalogId}`)**: Every catalog belongs to a single verified Firebase user identified by immutable `ownerUid`. No user PII (`email`) is stored on `catalogs`, `products`, or `slugs`.
2. **PII Isolation (`users/{userId}`)**: Merchant email and account profile are strictly isolated inside `/users/{userId}`. Only `request.auth.uid == userId` may `get`, `create`, or `update` their own profile; `list` and `delete` are denied (`false`).
3. **Subcollection Master Gate (`catalogs/{catalogId}/products/{productId}`)**: Products cannot be created, updated, or deleted unless the parent `catalogs/{catalogId}` document exists and its `ownerUid == request.auth.uid` (enforced via `get()` after static validation). List queries on products do NOT call `get()`, enforcing visibility strictly via `resource.data.isPublic == true || (isSignedIn() && resource.data.ownerUid == request.auth.uid)`.
4. **Atomic Slug Binding (`slugs/{slugId}`)**: A subdomain slug lookup document cannot exist without a valid parent catalog owned by the same user (`getAfter(/databases/$(database)/documents/catalogs/$(incoming().catalogId)).data.ownerUid == request.auth.uid`). `list` is denied (`false`) to prevent subdomain enumeration.
5. **Email Verification & Temporal Integrity**: All write operations require `request.auth.token.email_verified == true`. `createdAt` and `updatedAt` must equal `request.time` on creation, and `createdAt`, `uid`, `ownerUid`, `id`, and `catalogId` are immutable on update.
6. **Volumetric & Regex Guards**: Every ID (`<= 128`, `^[a-zA-Z0-9_\\-]+$`), slug (`2..63`, `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`), domain (`3..253`), and string field enforces explicit `.size()` and regex bounds synchronized with `firebase-blueprint.json`.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Target Collection | Attack Vector | Expected Result |
| :--- | :--- | :--- | :--- |
| 1 | `/users/{uid}` | **PII Blanket Read / Enumeration**: Authenticated User B attempts `get` or `list` on User A's `/users/{uidA}`. | `PERMISSION_DENIED` |
| 2 | `/users/{uid}` | **Unverified Email Write**: Authenticated user with `email_verified: false` attempts to create `/users/{uid}`. | `PERMISSION_DENIED` |
| 3 | `/users/{uid}` | **Shadow / Ghost Field Injection**: Owner sends `{ ...validUser, isAdmin: true }` or `{ role: 'admin' }`. | `PERMISSION_DENIED` |
| 4 | `/users/{uid}` | **Client Timestamp Forgery**: Owner sends `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`. | `PERMISSION_DENIED` |
| 5 | `/catalogs/{id}` | **Identity Spoofing**: User B sets `ownerUid: userA_uid` when creating `/catalogs/cat-1`. | `PERMISSION_DENIED` |
| 6 | `/catalogs/{id}` | **Owner Hijack Update**: Owner attempts to reassign `ownerUid` or `id` on update. | `PERMISSION_DENIED` |
| 7 | `/catalogs/{id}` | **Resource Exhaustion / ID Poisoning**: Attacker passes a 1,500-char `{catalogId}` or invalid characters (`../hack`). | `PERMISSION_DENIED` |
| 8 | `/catalogs/{id}` | **Value Poisoning on Update**: Owner sends valid `affectedKeys` (`['nombre']`) with `nombre: 12345` or 500-char string (`> 120`). | `PERMISSION_DENIED` |
| 9 | `/catalogs/{id}` | **Blanket Collection Scraping**: Unauthenticated or User B runs `list` on `/catalogs` without `ownerUid == auth.uid`. | `PERMISSION_DENIED` |
| 10 | `/catalogs/{id}/products/{pid}` | **Orphan / Cross-Tenant Product Write**: User B creates a product inside User A's catalog subcollection. | `PERMISSION_DENIED` |
| 11 | `/catalogs/{id}/products/{pid}` | **Price & Image Blob Exhaustion**: Owner tries to write negative `precioActual: -50` or a 100KB inline base64 `imagen` (`> 2048` chars). | `PERMISSION_DENIED` |
| 12 | `/slugs/{slugId}` | **Orphaned / Hijacked Slug Binding**: User creates `/slugs/relojes` pointing to non-existent or User A's `catalogId`. | `PERMISSION_DENIED` |
