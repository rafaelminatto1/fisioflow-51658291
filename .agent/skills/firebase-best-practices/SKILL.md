---
name: firebase-best-practices
description: Best practices for Firebase Backend (Firestore, Auth, Functions). Scalability, security, and architectural patterns.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Firebase Best Practices

> **"Serverless" does not mean "limitless". It means "manage your quotas".**

## 🎯 Selective Reading Rule

**Read ONLY files relevant to the request!**

| File | Description | When to Read |
|------|-------------|--------------|
| `firestore-patterns.md` | Data modeling, querying, optimization | Database design/queries |
| `auth-patterns.md` | Custom claims, Roles, Security Rules | Authentication/Authorization tasks |
| `functions-patterns.md` | Triggers, Regions, VPC, Cold Starts | Cloud Functions development |

---

## 🧠 Core Philosophy for This Project

1.  **Region Consistency**: ALWAYS use `southamerica-east1` (Sao Paulo) for latency.
2.  **Scalability First**:
    - ❌ NEVER fetch pure collections without `limit()` or `where()`.
    - ❌ NEVER fetch ALL users to find ONE.
    - ✅ Use Direct Lookups (IDs) whenever possible.
3.  **Security**:
    - ✅ Validate `context.auth` in every Callable Function.
    - ✅ Validate `request.auth` in every Security Rule.
    - ❌ NEVER trust client input.
4.  **Cost Awareness**:
    - Firestore reads cost money. Optimize for "Read Once, Render Many".

---

## 🛑 Common Anti-Patterns (Avoid These)

- **Looping Reads**: `users.forEach(async u => await db.doc(u).get())` → 💣 USE `getAll` or `in` queries.
- **Client-Side Admin**: using generic `listUsers` in client code without strict RLS.
- **Region Mismatch**: Calling `us-central1` function from `southamerica-east1` app key.
