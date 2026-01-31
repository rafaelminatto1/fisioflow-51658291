# Cloud Functions (Gen 2) Patterns

## 🌍 Region Configuration

**CRITICAL**: This project uses `southamerica-east1`.
- **Global Config**: Set in `index.ts` via `setGlobalOptions`.
- **Individual Config**: Can override in `onCall` options.
- **Frontend Config**: Must match backend!

```typescript
// backend
setGlobalOptions({ region: 'southamerica-east1' });

// frontend
const functions = getFunctions(app, 'southamerica-east1');
```

## ⚡ Gen 2 (Callable) vs HTTP

- **onCall (Callable)**:
    - ✅ Automatic Auth Context (`request.auth`).
    - ✅ Automatic JSON parsing/serialization.
    - ✅ Recommended for client-app communication.
    - ❌ Difficult to call from external tools (cURL/Postman) without SDK authentication simulation.

- **onRequest (HTTP)**:
    - ✅ Standard HTTP (Webhooks, public APIs).
    - ❌ Manual Auth Token verification required.

## 🥶 Cold Starts

- **Imports matter**: Don't import the entire universe at the top of the file.
- **Lazy Loading**: Import heavy libraries *inside* the function handler if they are large and rarely used.
- **Global Variables**: Database connections should be global (outside handler) to be reused across warm invocations.

## 🛡️ Security

1.  **Always Validate Auth**:
    ```typescript
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Login required');
    }
    ```
2.  **Validate Schema**: Use `zod` or manual checks for `request.data`.
3.  **Error Leakage**: Don't return raw stack traces. Use `HttpsError` with sanitized messages.
