# 🛡️ Firebase App Check & reCAPTCHA Enterprise Configuration Guide

**Production Domain:** fisioflow-migration.web.app
**Project:** fisioflow-migration
**Date:** 2026-01-28

---

## 📋 Current State Analysis

### Issue Identified
- **Error:** `exchangeRecaptchaEnterpriseToken` returns 400
- **Root Cause:** **Firebase App Check app is NOT registered** in Firebase Console
- **reCAPTCHA Key:** `6LcTJVksAAAAACRBNy4BxFyvTWduSZq3Mmxv74lT`
- **Domain Status:** ✅ `fisioflow-migration.web.app` ALREADY in allowed domains

### Key Findings
1. ✅ reCAPTCHA Enterprise key is properly configured
2. ✅ Production domain is in allowed domains
3. ❌ **App Check app is not registered** - THIS IS THE PROBLEM
4. ⚠️ **App Check CANNOT be configured via CLI** - Must be done in Firebase Console

---

## 🔧 Configuration Steps

### ⚠️ IMPORTANT: App Check Cannot Be Configured Via CLI

The Firebase App Check registration **MUST be done manually** in the Firebase Console. There is no CLI, API, or gcloud command available for this step.

### Step 1: Register App in Firebase App Check (REQUIRED)

1. Go to: https://console.firebase.google.com
2. Select project: `fisioflow-migration`
3. Navigate to: **App Check** (in left sidebar)
4. Click **Get Started** or select your web app
5. For app: **FisioFlow Web** (App ID: `1:412418905255:web:07bc8e405b6f5c1e597782`)
6. Select **reCAPTCHA Enterprise** as the provider
7. Enter the Site Key: `6LcTJVksAAAAACRBNy4BxFyvTWduSZq3Mmxv74lT`
8. Click **Register**

### Step 2: Enable Enforcement (After Registration)

1. In the same App Check section
2. Find **Cloud Functions for Firebase**
3. Click the toggle to **Enable enforcement**
4. Confirm the action

### Step 3: Verify Configuration

After registration, you should see:
- ✅ App registered: `FisioFlow Web`
- ✅ Provider: `reCAPTCHA Enterprise`
- ✅ Site Key: `6LcTJVksAAAAACRBNy4BxFyvTWduSZq3Mmxv74lT`
- ✅ Enforcement enabled for Cloud Functions

### Step 4: Verify Environment Variables

The reCAPTCHA key is already configured in your environment:

```bash
# Current value in .env (already correct)
VITE_RECAPTCHA_ENTERPRISE_KEY=6LcTJVksAAAAACRBNy4BxFyvTWduSZq3Mmxv74lT
```

**No changes needed** - just register the app in Firebase Console (Step 1).

### Step 5: Rebuild and Deploy (Only if needed)

```bash
# Build for production
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

---

## ✅ Verification

After configuration, verify:

1. **Check Token Exchange:**
   - Open browser DevTools → Network
   - Look for: `exchangeRecaptchaEnterpriseToken`
   - Should return 200 (not 400)

2. **Test API Calls:**
   - Login to production app
   - Navigate to Patients page
   - Click "Novo Paciente"
   - Modal should load without "Carregando organização..." timeout

3. **Check Console:**
   - No "Missing or insufficient permissions" errors
   - No reCAPTCHA 400 errors

---

## 📝 Troubleshooting

### If token exchange fails with 400:

**Root Cause:** App Check app is NOT registered in Firebase Console

**Solution:** Follow Step 1 above to register the app manually

**Why CLI doesn't work:**
- Firebase CLI has NO `app-check` commands
- App Check registration is ONLY available via Firebase Console UI
- REST API returns 404 for unregistered apps

### After registering, still seeing errors:

1. **Check Enforcement is Enabled:**
   - Go to Firebase Console → App Check
   - Verify enforcement is enabled for Cloud Functions

2. **Clear Browser Cache:**
   - Clear cookies and cache
   - Hard refresh (Ctrl+Shift+R)

3. **Wait for Propagation:**
   - App Check registration is usually instant
   - But browser may cache old failed tokens

---

## 🔐 Security Notes

1. **Never commit reCAPTCHA secrets** to version control
2. **Use separate keys** for development and production
3. **Monitor key usage** in Google Cloud Console
4. **Set appropriate score threshold** based on your risk tolerance

---

## 📚 References

- Firebase App Check Docs: https://firebase.google.com/docs/app-check
- reCAPTCHA Enterprise Docs: https://cloud.google.com/recaptcha-enterprise
- Firebase Console: https://console.firebase.google.com

---

*Last Updated: 2026-01-28*
