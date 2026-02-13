# FisioFlow Authentication System Guide

## Overview

This guide describes the robust Supabase authentication system implemented for the FisioFlow application. The system includes comprehensive error handling, role-based access control, session management, and security features.

## Architecture

### Core Components

1. **AuthProvider** (`src/components/auth/AuthProvider.tsx`)
   - Main authentication context provider
   - Handles login, registration, logout, and profile management
   - Implements retry logic and circuit breaker patterns
   - Comprehensive error handling and logging

2. **SecurityProvider** (`src/components/auth/SecurityProvider.tsx`)
   - Session monitoring and security features
   - Inactivity timeout and auto-logout
   - Login attempt tracking and account lockout
   - Activity monitoring

3. **ProtectedRoute** (`src/components/ProtectedRoute.tsx`)
   - Route-level authentication protection
   - Role-based access control
   - Graceful error handling and loading states

4. **RoleGuard** (`src/components/auth/RoleGuard.tsx`)
   - Component-level role protection
   - Flexible permission checking
   - Custom fallback components

## Setup

### 1. Environment Variables

Ensure these environment variables are set in your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret
VITE_GOOGLE_REDIRECT_URI=your_google_redirect_uri
```

### 2. App Integration

Wrap your app with the authentication providers:

```tsx
import { AuthProvider } from '@/components/auth/AuthProvider';
import { SecurityProvider } from '@/components/auth/SecurityProvider';

function App() {
  return (
    <AuthProvider>
      <SecurityProvider
        options={{
          maxLoginAttempts: 5,
          lockoutDuration: 15 * 60 * 1000, // 15 minutes
          inactivityTimeout: 30 * 60 * 1000, // 30 minutes
          enableAutoLogout: true,
        }}
      >
        <Router>
          {/* Your app content */}
        </Router>
      </SecurityProvider>
    </AuthProvider>
  );
}
```

## Authentication Flow

### Registration

The registration process uses a 3-step wizard:

1. **Step 1: Basic Information**
   - User type selection (patient, therapist, student, partner)
   - Personal details (name, email, phone, CPF, birth date)

2. **Step 2: Password & Professional Details**
   - Password creation with validation
   - Professional information (for therapists and students)
   - CREFITO, experience, consultation fees, bio

3. **Step 3: Terms & Confirmation**
   - Review information
   - Accept terms and privacy policy
   - Final account creation

### Login

- Email and password authentication
- Remember me option
- Rate limiting and account lockout protection
- Automatic session management

### Session Management

- Automatic session refresh
- Inactivity monitoring
- Graceful session expiry handling
- Secure logout with data cleanup

## Role-Based Access Control

### User Roles

- `admin`: Full system access
- `fisioterapeuta`: Licensed physiotherapist
- `estagiario`: Student/trainee with supervised access
- `paciente`: Patient receiving treatment
- `parceiro`: Physical education partner

### Permission System

```tsx
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const permissions = usePermissions();
  
  if (permissions.canViewAllPatients()) {
    return <AllPatientsView />;
  }
  
  if (permissions.canViewAssignedPatients()) {
    return <AssignedPatientsView />;
  }
  
  return <AccessDenied />;
}
```

### Route Protection

```tsx
import { ProtectedRoute, TherapistRoute } from '@/components/ProtectedRoute';
import { RoleGuard } from '@/components/auth/RoleGuard';

// Protect entire routes
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/patients" element={
        <TherapistRoute>
          <PatientsPage />
        </TherapistRoute>
      } />
      
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminPanel />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

// Protect components
function PatientList() {
  return (
    <RoleGuard allowedRoles={['admin', 'fisioterapeuta']}>
      <div>Patient list content</div>
    </RoleGuard>
  );
}
```

## Security Features

### Session Monitoring

```tsx
import { useSessionMonitor } from '@/hooks/useSessionMonitor';

function MyComponent() {
  const {
    sessionStatus,
    timeUntilExpiry,
    isExpiringSoon,
    forceRefresh
  } = useSessionMonitor();
  
  if (isExpiringSoon) {
    return <SessionExpiryWarning onRefresh={forceRefresh} />;
  }
  
  return <MyContent />;
}
```

### Security Provider

```tsx
import { useSecurity } from '@/components/auth/SecurityProvider';

function LoginForm() {
  const { isAccountLocked, reportFailedLogin } = useSecurity();
  
  if (isAccountLocked) {
    return <AccountLockedMessage />;
  }
  
  const handleLoginError = () => {
    reportFailedLogin();
  };
  
  return <LoginFormComponent onError={handleLoginError} />;
}
```

## Error Handling

The system includes comprehensive error handling:

### Error Types

- **AuthError**: Authentication-related errors
- **ValidationError**: Form validation errors
- **NetworkError**: Connection and API errors
- **AppError**: General application errors

### Error Logging

All errors are logged with context for debugging:

```tsx
import { errorLogger } from '@/lib/errors/logger';

// Errors are automatically logged by the auth system
// Manual logging example:
errorLogger.logError(new Error('Custom error'), {
  context: 'MyComponent.handleAction',
  userId: user?.id,
  additional: 'data'
});
```

## Hooks Reference

### useAuth()

Primary authentication hook:

```tsx
const {
  user,           // Current user object
  profile,        // User profile data
  session,        // Supabase session
  loading,        // Loading state
  initialized,    // Auth system initialized
  role,          // User role
  signIn,        // Login function
  signUp,        // Registration function
  signOut,       // Logout function
  resetPassword, // Password reset
  updatePassword,// Update password
  updateProfile, // Update profile
  refreshProfile // Refresh profile data
} = useAuth();
```

### usePermissions()

Permission checking hook:

```tsx
const {
  can,                    // Check specific permission
  canAny,                // Check any of multiple permissions
  canAll,                // Check all permissions
  hasRole,               // Check role level
  isAdmin,               // Is admin user
  isProfessional,        // Is professional user
  canViewAllPatients,    // Specific permission checks
  // ... more permission methods
} = usePermissions();
```

### useSessionMonitor()

Session monitoring hook:

```tsx
const {
  sessionStatus,          // Session status
  timeUntilExpiry,       // Time until session expires
  isExpiringSoon,        // Is session expiring soon
  forceRefresh,          // Force session refresh
  forceSignOut,          // Force logout
  getTimeUntilExpiryFormatted // Formatted time string
} = useSessionMonitor();
```

## Best Practices

### 1. Error Handling

Always handle authentication errors gracefully:

```tsx
const handleLogin = async (email: string, password: string) => {
  try {
    const { error } = await signIn(email, password);
    if (error) {
      // Error is already logged and shown to user
      // Handle specific error cases if needed
      if (error.message.includes('invalid_credentials')) {
        // Handle invalid credentials
      }
    }
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected login error:', error);
  }
};
```

### 2. Route Protection

Always protect sensitive routes:

```tsx
// Good: Protected route
<Route path="/admin" element={
  <AdminRoute>
    <AdminPanel />
  </AdminRoute>
} />

// Bad: Unprotected sensitive route
<Route path="/admin" element={<AdminPanel />} />
```

### 3. Permission Checking

Use the permission system for fine-grained access control:

```tsx
// Good: Check permissions before showing UI
function PatientActions({ patientId }: { patientId: string }) {
  const { canEditPatient, canDeletePatient } = usePermissions();
  
  return (
    <div>
      {canEditPatient() && <EditPatientButton patientId={patientId} />}
      {canDeletePatient() && <DeletePatientButton patientId={patientId} />}
    </div>
  );
}

// Bad: Show UI without permission checking
function PatientActions({ patientId }: { patientId: string }) {
  return (
    <div>
      <EditPatientButton patientId={patientId} />
      <DeletePatientButton patientId={patientId} />
    </div>
  );
}
```

### 4. Loading States

Always handle loading states:

```tsx
function MyComponent() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <NotLoggedIn />;
  }
  
  return <MyContent />;
}
```

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set
   - Restart development server after adding environment variables

2. **Profile Not Loading**
   - Check if profiles table exists in Supabase
   - Verify RLS policies allow reading profiles
   - Check network connectivity

3. **Session Expires Too Quickly**
   - Check Supabase project settings
   - Verify session timeout configuration
   - Check for session monitoring conflicts

4. **Permission Denied Errors**
   - Verify user role in database
   - Check permission definitions
   - Ensure profile is loaded before checking permissions

### Debug Mode

Enable debug logging in development:

```tsx
import { errorLogger } from '@/lib/errors/logger';

// The error logger automatically logs more details in development
// Check browser console for detailed logs
```

### Security Status (Admin Only)

For debugging, admins can see the SecurityStatus component:

```tsx
import { SecurityStatus } from '@/components/auth/SecurityProvider';

function App() {
  return (
    <div>
      {/* Your app */}
      <SecurityStatus /> {/* Only visible to admins */}
    </div>
  );
}
```

## Migration from Previous System

If migrating from a previous auth system:

1. **Update imports**: Replace old auth imports with new ones
2. **Update route protection**: Replace old ProtectedRoute with new one
3. **Update permission checking**: Use new permission hooks
4. **Test thoroughly**: Verify all auth flows work correctly

## Testing

### Manual Testing Checklist

- [ ] Registration flow works for all user types
- [ ] Email confirmation process
- [ ] Login with correct credentials
- [ ] Login with incorrect credentials (rate limiting)
- [ ] Password reset flow
- [ ] Session refresh on expiry
- [ ] Automatic logout on inactivity
- [ ] Role-based route protection
- [ ] Permission checking in components
- [ ] Profile updates
- [ ] Logout and cleanup

### Test Accounts

Use the test accounts provided in the login form for testing different roles.

## Support

For issues or questions about the authentication system:

1. Check this guide first
2. Look at browser console for error logs
3. Check network requests in developer tools
4. Verify Supabase configuration and RLS policies

## Future Enhancements

Potential future improvements:

- Two-factor authentication (2FA)
- Advanced audit logging
- Device management
- Advanced session controls
- Password complexity policies
- Account recovery flows