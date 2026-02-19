# Appointments Not Showing - Fix Summary

## Changes Made

I've added comprehensive debugging to help identify why appointments aren't showing on the schedule page.

### 1. Enhanced Logging

**Files Modified:**
- `src/services/appointmentService.ts` - Added detailed logging for API calls and validation
- `src/hooks/useFilteredAppointments.ts` - Added query parameter logging
- `src/pages/Schedule.tsx` - Added organization ID logging

**What it logs:**
- Organization ID presence and value
- API request parameters (dateFrom, dateTo, limit)
- API response structure and data count
- Validation failures with detailed error messages
- Final processed appointment counts

### 2. Diagnostic Component

**New File:**
- `src/components/schedule/ScheduleDiagnostics.tsx` - Visual diagnostic panel

**Features:**
- Real-time query status display
- Organization ID validation
- Appointment count and sample data
- Error messages
- Visual indicators (icons, colors, badges)
- Only shows in development mode

**Added to:**
- `src/pages/Schedule.tsx` - Displays at the top of the schedule page (DEV only)

### 3. Documentation

**New Files:**
- `DEBUG_APPOINTMENTS_NOT_SHOWING.md` - Comprehensive debugging guide
- `APPOINTMENTS_FIX_SUMMARY.md` - This file

## How to Use

### Step 1: Start the Development Server

```bash
npm run dev
```

### Step 2: Open the Schedule Page

1. Navigate to `http://localhost:8080`
2. Log in if needed
3. Click on "Agenda" in the sidebar

### Step 3: Check the Diagnostic Panel

You should see an orange diagnostic panel at the top of the schedule page with:

- **Status**: Current loading state
- **User Info**: Whether user is authenticated and has an organization ID
- **Query Info**: View type and current date
- **Results**: Number of appointments loaded
- **Sample Data**: First appointment details (if any)
- **Warnings**: If organization ID is missing

### Step 4: Check Browser Console

Open Developer Tools (F12) and look for these log messages:

1. `[INFO] Schedule page - Organization ID` - Shows if organizationId exists
2. `[INFO] useFilteredAppointments query` - Shows query parameters
3. `[INFO] Fetching appointments` - Shows API call is being made
4. `[INFO] Appointments API response received` - Shows what the API returned
5. `[ERROR] Appointment validation failed` - Shows validation errors (if any)
6. `[INFO] Appointments processed successfully` - Shows final results

## Common Issues and Solutions

### Issue 1: Organization ID Missing

**Symptoms:**
- Diagnostic panel shows "✗ Não definido" for Organization ID
- Console shows `hasOrganizationId: false`
- No API calls are made

**Solution:**
The user profile doesn't have an `organization_id` field. Fix this by:

1. Open Firebase Console → Firestore Database
2. Find the `profiles` collection
3. Locate your user document (search by email)
4. Add or update the `organization_id` field with a valid UUID
5. Refresh the page

### Issue 2: API Returns No Data

**Symptoms:**
- Diagnostic panel shows "0" appointments
- Console shows `dataLength: 0`
- No validation errors

**Solution:**
No appointments exist in the database for this organization/date range. Either:
- Create a test appointment
- Check if appointments exist in the database
- Verify the date range is correct

### Issue 3: Validation Failures

**Symptoms:**
- Console shows multiple "Appointment validation failed" errors
- Diagnostic panel shows "0" appointments but API returned data

**Solution:**
Check the validation error details in the console. Common issues:
- Missing required fields (`patient_id`, `date`, `start_time`)
- Invalid date format (should be "YYYY-MM-DD")
- Invalid time format (should be "HH:MM")
- Invalid UUID format

## After Debugging

Once you've identified and fixed the issue, you can:

### Remove the Diagnostic Component

1. Remove the import from `src/pages/Schedule.tsx`:
   ```typescript
   import { ScheduleDiagnostics } from '@/components/schedule/ScheduleDiagnostics';
   ```

2. Remove the component usage:
   ```typescript
   {import.meta.env.DEV && (
     <div className="px-4 pt-4">
       <ScheduleDiagnostics 
         currentDate={currentDate} 
         viewType={viewType as 'day' | 'week' | 'month'} 
       />
     </div>
   )}
   ```

3. Delete the file:
   ```bash
   rm src/components/schedule/ScheduleDiagnostics.tsx
   ```

### Keep or Remove Enhanced Logging

The enhanced logging in the service and hooks can be kept for future debugging, or you can remove it if you prefer cleaner logs.

To remove logging:
- Remove the `logger.info()` and `logger.error()` calls added in this session
- Keep the original error handling

## Expected Outcome

After following these steps, you should be able to:

1. See exactly where the data flow breaks
2. Identify if it's an auth issue, API issue, or validation issue
3. Fix the root cause
4. See appointments loading correctly

## Need Help?

If you're still having issues after checking the diagnostics:

1. Take a screenshot of the diagnostic panel
2. Copy the console logs (especially the INFO and ERROR messages)
3. Share them for further analysis

The logs will show exactly where the problem is occurring.
