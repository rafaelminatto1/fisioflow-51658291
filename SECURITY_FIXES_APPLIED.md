# Security Fixes Applied - FisioFlow

**Date:** January 31, 2026
**Status:** Critical Fixes Applied

---

## Fixes Applied

### 1. Removed Hardcoded Secrets from firebase.json
**File:** `/home/rafael/antigravity/fisioflow/fisioflow-51658291/firebase.json`

**Before:**
```json
"env": [
  {
    "variables": {
      "DB_HOST": "35.192.122.198",
      "DB_SOCKET_PATH": "/cloudsql",
      "ABLY_API_KEY": "zmqcyQ.hjud3A:UFQTNkXMSS17eJawRzhNP0cg-qBhn6Rp3vdJkib-c30",
      "NODE_ENV": "production",
      "WHATSAPP_BUSINESS_ACCOUNT_ID": "806225345331804",
      "WHATSAPP_PHONE_NUMBER": "+551158749885"
    }
  }
]
```

**After:**
```json
"env": [
  {
    "variables": {
      "DB_SOCKET_PATH": "/cloudsql",
      "NODE_ENV": "production"
    }
  }
]
```

**Action Required:**
- [ ] Rotate Ably API key at https://ably.com/dashboard
- [ ] Move DB_HOST to Google Secret Manager
- [ ] Configure WhatsApp credentials via Secret Manager

---

### 2. Added Security Warning to MFA TOTP Verification
**File:** `/home/rafael/antigravity/fisioflow/fisioflow-51658291/src/lib/auth/mfa.ts`

**Fix Applied:**
Added comprehensive security warning and documentation about the insecure TOTP implementation.

**Action Required:**
```bash
npm install otplib
```

Then replace the verification function with:
```typescript
import { authenticator } from 'otplib';

private verifyTOTPCode(secret: string, code: string): boolean {
  return authenticator.verify({
    token: code,
    secret: secret,
    window: 2
  });
}
```

---

### 3. Fixed Firestore Storage Rule Bypass
**File:** `/home/rafael/antigravity/fisioflow/fisioflow-51658291/storage.rules`

**Before:**
```javascript
function isAdmin() {
  return isAuthenticated() &&
    firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

**After:**
```javascript
function isAdmin() {
  return isAuthenticated() &&
    firestore.exists(/databases/(default)/documents/users/$(request.auth.uid)) &&
    firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

**Note:** Applied to all role-checking functions (isAdmin, isPhysiotherapist, isIntern, isPatient).

---

### 4. Added Content-Security-Policy Header
**File:** `/home/rafael/antigravity/fisioflow/fisioflow-51658291/firebase.json`

**Added:**
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.firebaseio.com https://*.firebasedatabase.app https://*.googleapis.com https://moocafisio.com.br https://ably.io; frame-src 'self' https://www.youtube.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self';"
}
```

**Future Improvement:** Remove `'unsafe-inline'` from script-src and style-src.

---

## Remaining Critical Actions

### Immediate (Today):

1. **Rotate Exposed Secrets:**
   - [ ] Ably API Key: `zmqcyQ.hjud3A:UFQTNkXMSS17eJawRzhNP0cg-qBhn6Rp3vdJkib-c30`
   - [ ] WhatsApp Access Token in .env
   - [ ] Inngest Signing Key

2. **Set up Google Secret Manager:**
   ```bash
   # Install gcloud CLI if not already installed
   gcloud secrets create ABLY_API_KEY --data-file="-"
   echo "your_new_api_key" | gcloud secrets versions add ABLY_API_KEY --data-file="-"

   # Grant Cloud Functions access
   gcloud secrets add-iam-policy-binding ABLY_API_KEY \
     --member="serviceAccount:YOUR_PROJECT@appspot.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. **Fix MFA Implementation:**
   - [ ] Install otplib
   - [ ] Replace verifyTOTPCode function
   - [ ] Force MFA re-enrollment for all users

### This Week:

4. **Remove Bootstrap Admin Backdoor** from firestore.rules:
   ```javascript
   // REMOVE THIS FUNCTION after initial setup
   function isBootstrapAdmin() { ... }
   ```

5. **Deploy Security Fixes:**
   ```bash
   firebase deploy --only hosting,storage,firestore
   ```

---

## Security Checklist

- [x] Removed hardcoded secrets from firebase.json
- [x] Added security warning for MFA implementation
- [x] Fixed storage rules existence check
- [x] Added Content-Security-Policy header
- [ ] Rotate all exposed API keys
- [ ] Implement proper TOTP verification with otplib
- [ ] Remove bootstrap admin backdoor
- [ ] Set up Google Secret Manager
- [ ] Implement fail-closed rate limiting
- [ ] Add distributed rate limiting with Redis
- [ ] Review and fix XSS vulnerabilities
- [ ] Implement password strength requirements
- [ ] Add input sanitization library

---

## Files Modified

1. `/home/rafael/antigravity/fisioflow/fisioflow-51658291/firebase.json`
2. `/home/rafael/antigravity/fisioflow/fisioflow-51658291/src/lib/auth/mfa.ts`
3. `/home/rafael/antigravity/fisioflow/fisioflow-51658291/storage.rules`
4. `/home/rafael/antigravity/fisioflow/fisioflow-51658291/SECURITY_AUDIT_REPORT.md` (Created)

---

## Deploy Commands

```bash
# Deploy all security fixes
firebase deploy --only hosting,storage,firestore

# After rotating secrets and setting up Secret Manager
firebase deploy --only functions
```

---

**Next Security Audit Recommended:** March 31, 2026
