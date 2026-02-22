# Firestore Fallback Implementation

## Problem
The professional mobile app was experiencing 404 errors when trying to access Cloud Functions:
- `listPatientsV2` - 404 Not Found
- `listAppointments` - 404 Not Found  
- `getDashboardStatsV2` - 404 Not Found

These functions exist in the codebase but are not deployed to Cloud Run.

## Solution
Implemented a Firestore fallback system that allows the app to work without Cloud Functions by querying Firestore directly.

## Files Created/Modified

### 1. `professional-app/lib/config.ts` (Created)
Configuration file with feature flags:
```typescript
export const config = {
  useCloudFunctions: false, // Set to true when Cloud Functions are deployed
  // ... other config
}
```

### 2. `professional-app/lib/firestore-fallback.ts` (Created)
Direct Firestore access functions:
- `listPatientsFirestore()` - Queries patients collection
- `listAppointmentsFirestore()` - Queries appointments collection
- `getDashboardStatsFirestore()` - Returns empty stats (placeholder)

Key features:
- Simplified queries to avoid Firestore index requirements
- Single-field filtering with in-memory sorting/filtering
- Graceful error handling

### 3. `professional-app/lib/api.ts` (Modified)
Updated three main API functions to check `config.useCloudFunctions`:
- `getPatients()` - Uses Firestore fallback when flag is false
- `getAppointments()` - Uses Firestore fallback when flag is false
- `getDashboardStats()` - Uses Firestore fallback when flag is false

## How It Works

1. When `config.useCloudFunctions === false`:
   - API calls are intercepted before making HTTP requests
   - Data is fetched directly from Firestore collections
   - Results are mapped to match the expected API response format

2. When `config.useCloudFunctions === true`:
   - Normal Cloud Functions HTTP calls are made
   - Full functionality with server-side processing

## Query Optimization

To avoid Firestore composite index requirements:
- Use single `where()` clause per query
- Apply additional filters in-memory after fetching
- Sort results in-memory using JavaScript
- Prioritize most selective filter (therapistId > organizationId)

## Testing

The app now successfully:
- ✅ Loads without 404 errors
- ✅ Shows "[API] Using Firestore fallback" log messages
- ✅ Queries Firestore directly for patients and appointments
- ✅ Handles missing indexes gracefully

## Next Steps

### Option 1: Continue with Firestore (Recommended for MVP)
- App works immediately without deployment
- Add more Firestore fallback functions as needed
- Consider creating Firestore indexes for better performance

### Option 2: Deploy Cloud Functions
```bash
cd functions
npm run deploy
```
Then set `config.useCloudFunctions = true` in `professional-app/lib/config.ts`

## Logs Example

```
LOG  [API] Using Firestore fallback for getDashboardStats
LOG  [API] Using Firestore fallback for getAppointments  
LOG  [API] Using Firestore fallback for getPatients
```

## Benefits

1. **Immediate functionality** - App works without waiting for Cloud Functions deployment
2. **Graceful degradation** - Falls back to Firestore when Cloud Functions unavailable
3. **Easy toggle** - Single config flag to switch between modes
4. **No breaking changes** - Existing code continues to work
5. **Development friendly** - Faster iteration without deployment delays
