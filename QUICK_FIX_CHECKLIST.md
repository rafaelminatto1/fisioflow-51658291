# Quick Fix Checklist - Appointments Not Showing

## ✅ Immediate Actions

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Open Schedule Page
- Navigate to `http://localhost:8080/agenda`
- Look for the orange diagnostic panel at the top

### 3. Check Diagnostic Panel

**Look for these indicators:**

| Indicator | Good ✅ | Bad ❌ |
|-----------|---------|--------|
| **Usuário** | ✓ Autenticado | ✗ Não autenticado |
| **Organization ID** | UUID shown | ✗ Não definido |
| **Status** | Dados carregados | Erro ao carregar |
| **Agendamentos** | Number > 0 | 0 |

### 4. Open Browser Console (F12)

**Search for these messages:**

```
[INFO] Schedule page - Organization ID
```
- Check if `hasOrganizationId: true`
- Check if `organizationId` has a value

```
[INFO] Fetching appointments
```
- If you DON'T see this → Organization ID is missing

```
[INFO] Appointments API response received
```
- Check `dataLength` - should be > 0

```
[ERROR] Appointment validation failed
```
- If you see many of these → Validation issue

## 🔧 Quick Fixes

### Fix 1: Missing Organization ID

**If diagnostic shows "✗ Não definido":**

1. Open Firebase Console
2. Go to Firestore → `profiles` collection
3. Find your user (search by email)
4. Check if `organization_id` field exists
5. If missing, add it with a valid UUID
6. Refresh the page

### Fix 2: No Appointments in Database

**If `dataLength: 0` in console:**

1. Check if appointments exist in the database
2. Create a test appointment
3. Verify the date range includes today

### Fix 3: Validation Errors

**If seeing "Appointment validation failed":**

1. Look at the `validationError` in console
2. Common issues:
   - Missing `patient_id`
   - Invalid date format
   - Missing `start_time`
3. Fix the data in the database

## 📊 Success Indicators

You'll know it's working when you see:

1. ✅ Diagnostic panel shows:
   - Green checkmark for user
   - Organization ID displayed
   - "Dados carregados" status
   - Appointment count > 0
   - Sample appointment data

2. ✅ Console shows:
   ```
   [INFO] Appointments processed successfully
   {
     totalReceived: 10,
     validAppointments: 10,
     invalidAppointments: 0
   }
   ```

3. ✅ Appointments appear in the calendar

## 🆘 Still Not Working?

Share these details:

1. Screenshot of the diagnostic panel
2. Console logs (copy all INFO and ERROR messages)
3. Value of `organizationId` from console
4. Value of `dataLength` from API response

## 🧹 Cleanup After Fix

Once working, remove the diagnostic component:

1. Edit `src/pages/Schedule.tsx`
2. Remove the `ScheduleDiagnostics` import and usage
3. Delete `src/components/schedule/ScheduleDiagnostics.tsx`
4. (Optional) Remove extra logging from service files

---

**Files to check:**
- `DEBUG_APPOINTMENTS_NOT_SHOWING.md` - Detailed debugging guide
- `APPOINTMENTS_FIX_SUMMARY.md` - Complete summary of changes
