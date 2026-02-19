# Debug: Appointments Not Showing on Schedule Page

## Problem
Appointments are not displaying on the schedule page (`/agenda`). Console shows no errors related to data fetching, but appointments array is empty.

## Root Cause Analysis

Based on the console logs and code review, the issue is likely one of the following:

1. **Missing Organization ID**: The `organizationId` from `user?.organizationId` might be empty or undefined
2. **Data Validation Failure**: Appointments from the API might be failing Zod schema validation
3. **API Response Format**: The backend might be returning data in an unexpected format

## Changes Made

### 1. Enhanced Logging in `src/services/appointmentService.ts`

Added detailed logging to track:
- When `fetchAppointments` is called with what parameters
- What the API response looks like (structure, data length, sample item)
- Organization ID validation (returns empty array if missing)
- Detailed validation errors for each failed appointment
- Final processed results (valid vs invalid counts)

### 2. Enhanced Logging in `src/hooks/useFilteredAppointments.ts`

Added logging to track:
- Query parameters (organizationId, viewType, date)
- Whether filters are active
- Whether the query is enabled

### 3. Enhanced Logging in `src/pages/Schedule.tsx`

Added logging to track:
- Whether user exists
- Organization ID value
- Whether organization ID is present

## How to Test

### Step 1: Open Browser Console
1. Open the app in your browser: `http://localhost:8080`
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Clear the console

### Step 2: Navigate to Schedule Page
1. Click on "Agenda" in the sidebar
2. Watch the console for log messages

### Step 3: Look for These Log Messages

**Expected logs in order:**

1. **Schedule page - Organization ID**
   ```
   [INFO] Schedule page - Organization ID
   {
     hasUser: true/false,
     organizationId: "xxx-xxx-xxx" or "",
     hasOrganizationId: true/false
   }
   ```
   
   ⚠️ **If `hasOrganizationId: false`** → This is the problem! User doesn't have an organization assigned.

2. **useFilteredAppointments query**
   ```
   [INFO] useFilteredAppointments query
   {
     organizationId: "xxx-xxx-xxx" or "",
     viewType: "week",
     date: "2026-02-19...",
     filtersActive: false,
     enabled: true
   }
   ```
   
   ⚠️ **If `organizationId: ""`** → Query won't run because it's disabled when organizationId is empty.

3. **Fetching appointments**
   ```
   [INFO] Fetching appointments
   {
     organizationId: "xxx-xxx-xxx",
     limit: 3000,
     dateFrom: "2026-02-17",
     dateTo: "2026-02-23"
   }
   ```
   
   ⚠️ **If this log doesn't appear** → Query is not running (likely due to missing organizationId).

4. **Appointments API response received**
   ```
   [INFO] Appointments API response received
   {
     hasData: true,
     dataLength: 10,
     responseKeys: ["data", "error"],
     sampleItem: { id: "...", hasPatientId: true, hasDate: true, hasTime: true }
   }
   ```
   
   ⚠️ **If `dataLength: 0`** → Backend returned no appointments.
   ⚠️ **If `hasDate: false` or `hasTime: false`** → Data format issue.

5. **Appointment validation failed** (if any)
   ```
   [ERROR] Appointment validation failed for ID xxx
   {
     id: "...",
     patient_name: "João",
     date: "2026-02-19",
     start_time: "10:00",
     validationError: [...]
   }
   ```
   
   ⚠️ **If you see many of these** → Schema validation is failing. Check the `validationError` details.

6. **Appointments processed successfully**
   ```
   [INFO] Appointments processed successfully
   {
     totalReceived: 10,
     validAppointments: 10,
     invalidAppointments: 0,
     sampleValid: { id: "...", patientName: "...", date: Date, time: "10:00" }
   }
   ```
   
   ✅ **If `validAppointments > 0`** → Data is being processed correctly!
   ⚠️ **If `validAppointments: 0` but `totalReceived > 0`** → All appointments are failing validation.

## Common Issues and Solutions

### Issue 1: Missing Organization ID

**Symptoms:**
- `hasOrganizationId: false` in logs
- No "Fetching appointments" log appears

**Solution:**
Check the user's profile in Firestore:
1. Open Firebase Console
2. Go to Firestore Database
3. Find the `profiles` collection
4. Find your user document (by email or UID)
5. Check if `organization_id` field exists and has a valid UUID value

**Fix:**
If missing, add the `organization_id` field manually or run the profile sync.

### Issue 2: All Appointments Failing Validation

**Symptoms:**
- `totalReceived > 0` but `validAppointments: 0`
- Multiple "Appointment validation failed" errors

**Solution:**
Check the validation error details in the console. Common issues:
- Missing required fields (`patient_id`, `date`, `start_time`)
- Invalid date format (should be "YYYY-MM-DD")
- Invalid time format (should be "HH:MM")
- Invalid UUID format for IDs

### Issue 3: Backend Returning No Data

**Symptoms:**
- `dataLength: 0` in "Appointments API response received"
- No validation errors

**Solution:**
1. Check if appointments exist in the database for this organization
2. Check if the date range is correct (dateFrom/dateTo)
3. Verify the backend function is working correctly

## Next Steps

After reviewing the console logs, report back with:

1. Which log messages you see
2. Any error messages
3. The values of `organizationId` and `hasOrganizationId`
4. The `dataLength` from the API response

This will help identify the exact issue and provide a targeted fix.

## Rollback

If these changes cause issues, you can revert by:
```bash
git checkout src/services/appointmentService.ts
git checkout src/hooks/useFilteredAppointments.ts
git checkout src/pages/Schedule.tsx
```
