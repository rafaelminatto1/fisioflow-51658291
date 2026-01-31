# Firestore Best Practices

## 📚 Data Modeling

### 1. Subcollections vs Root Collections
- **Subcollections** (`users/{uid}/appointments/{id}`): Good for data that scales *with* the parent and deleted *with* the parent.
- **Root Collections** (`appointments/{id}`): Good for global queries ("All appointments today").
- **Decision**: If you need to query "Across all parents", use Root Collection (or Collection Group, but indices are expensive).

### 2. Document Size Limits
- Max 1MB.
- ❌ Don't store large blobs (Base64 images) in Firestore. Use **Storage**.
- ❌ Don't keep unbounded arrays (`comments: [...]`) in a doc. Use a **Subcollection**.

## 🚀 Query Performance

### 1. Read Operations
- **Anti-Pattern**:
  ```typescript
  // ❌ BAD: Fetches ALL, then filters in memory
  const snap = await db.collection('users').get();
  const admins = snap.docs.filter(d => d.data().role === 'admin');
  ```
- **Pattern**:
  ```typescript
  // ✅ GOOD: Filter at database level
  const snap = await db.collection('users').where('role', '==', 'admin').get();
  ```

### 2. Pagination
- Always use `limit()` and `startAfter()`.
- Never return >100 items in a single API call unless strictly required.

### 3. Aggregation
- Don't count documents by download (`snap.size`).
- Use **Aggregation Queries** (`count()`, `sum()`, `average()`) which are server-side and cheaper.

## 🛡️ Security Rules

1.  **Default Deny**: `match /{document=**} { allow read, write: if false; }`
2.  **Auth Required**: `if request.auth != null`
3.  **Role Based**: `if get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data.role == 'admin'` (Note: Reads cost money, Custom Claims are better).
