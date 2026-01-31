# Firebase Authentication & Authorization Patterns

## 🔑 Role-Based Access Control (RBAC)

### Level 1: Firestore Profile (Acceptable for MVP)
- Store `role` field in `profiles/{uid}`.
- **Pros**: Easy to edit via dashboard/admin panel.
- **Cons**: Requires a Database Read to verify role in Security Rules and Backend Functions.

### Level 2: Custom Claims (Recommended for Scale)
- Set metadata on the user's auth token: `{ role: 'admin' }`.
- **Pros**: Available in `request.auth.token` (Security Rules) and `context.auth.token` (Functions) completely **FREE** (no database read).
- **Cons**: Requires token refresh to propagate changes (client must re-authenticate or force token refresh).

### 📝 Implementing Admin Checks (Backend)

```typescript
// ❌ WEAK
if (data.password === 'admin123') { ... }

// ⚠️ OKAY (Costly)
const profile = await db.doc(`profiles/${uid}`).get();
if (profile.data().role !== 'admin') throw new HttpsError(...);

// ✅ BEST (Custom Claims)
if (request.auth.token.role !== 'admin') throw new HttpsError(...);
```

## 🕵️ User Management

1.  **Listing Users**:
    - `adminAuth.listUsers()` is powerful but slow and rate-limited.
    - Don't expose this directly to clients for searching.
    - Sync minimal user data to a `users_public` collection if searching is needed.

2.  **Client-Side "isLoading"**:
    - Always handle the 3 states: `loading` (unknown), `unauthenticated` (null), `authenticated` (User object).
    - Don't assume `user === null` means logged out immediately; check `loading` first.
