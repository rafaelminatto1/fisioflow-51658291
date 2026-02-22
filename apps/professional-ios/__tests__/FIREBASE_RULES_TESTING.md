# Firebase Security Rules Testing

This directory contains tests for Firebase Firestore and Storage security rules to ensure proper PHI (Protected Health Information) protection and access control.

## Requirements

These tests validate:
- **Requirement 2.3**: RLS policies prevent unauthorized access to patient data in Firestore
- **Requirement 2.4**: Files in Firebase Storage are encrypted and access-controlled, with 50MB size limits

## Test Approaches

We provide two types of tests:

### 1. Quick Logic Tests (Recommended for CI/CD)

**File**: `firebase-rules-quick.test.ts`

These tests verify the security rules logic without requiring Firebase emulators. They validate:
- Access control patterns (userId-based RLS)
- File size limits (50MB for PHI, 10MB for avatars)
- Content type validation
- Immutability requirements (audit logs, legal acceptances)
- Authentication requirements

**Run with**:
```bash
pnpm vitest run apps/professional-ios/__tests__/firebase-rules-quick.test.ts
```

**Advantages**:
- ✅ Fast execution (< 1 second)
- ✅ No external dependencies
- ✅ Perfect for CI/CD pipelines
- ✅ Tests security logic and requirements

**Limitations**:
- Does not test actual Firebase rule evaluation
- Does not test rule syntax errors

### 2. Full Integration Tests (Optional)

**File**: `firebase-security-rules.test.ts`

These tests run against actual Firebase emulators and test the complete rule evaluation. They verify:
- Actual Firestore rule enforcement
- Actual Storage rule enforcement
- Real authentication flows
- Cross-user access prevention
- Document size validation
- File upload validation

**Run with**:
```bash
# Option 1: Use the automated script (starts/stops emulators)
pnpm test:firebase-rules

# Option 2: Manual approach
# Terminal 1: Start emulators
firebase emulators:start --only firestore,storage

# Terminal 2: Run tests
pnpm vitest run apps/professional-ios/__tests__/firebase-security-rules.test.ts
```

**Advantages**:
- ✅ Tests actual Firebase rule evaluation
- ✅ Catches rule syntax errors
- ✅ Tests real authentication flows
- ✅ Comprehensive integration testing

**Limitations**:
- Requires Firebase CLI installed
- Requires emulators running
- Slower execution (5-10 seconds)
- More complex setup

## Prerequisites for Integration Tests

1. **Firebase Emulators**: Install Firebase CLI and emulators
   ```bash
   npm install -g firebase-tools
   firebase init emulators
   ```

2. **Select Emulators**: Choose Firestore and Storage emulators
   - Firestore: Port 8080 (default)
   - Storage: Port 9199 (default)

3. **Dependencies**: Already installed
   ```bash
   pnpm add -D -w @firebase/rules-unit-testing
   ```

## Running the Tests

### Quick Tests (Recommended)

Run the logic verification tests without emulators:

```bash
# From project root
pnpm vitest run apps/professional-ios/__tests__/firebase-rules-quick.test.ts

# With watch mode
pnpm vitest apps/professional-ios/__tests__/firebase-rules-quick.test.ts
```

### Integration Tests (Optional)

#### Option 1: Automated Script

#### Option 1: Automated Script

The script automatically starts emulators, runs tests, and stops emulators:

```bash
pnpm test:firebase-rules
```

#### Option 2: Manual Approach

In a separate terminal, start the emulators:

```bash
firebase emulators:start --only firestore,storage
```

Or use the project-specific command if configured:

```bash
firebase emulators:start
```

Then run the integration tests:

```bash
# From project root
pnpm vitest run apps/professional-ios/__tests__/firebase-security-rules.test.ts
```

### With Coverage

```bash
pnpm vitest run apps/professional-ios/__tests__/firebase-rules-quick.test.ts --coverage
```

## Test Structure

### Quick Logic Tests (`firebase-rules-quick.test.ts`)

1. **Firestore Rules Logic**
   - User Consents: Access control, immutability, size limits
   - Audit Logs: Append-only, userId matching
   - Privacy Acceptances: Immutability
   - Biometric Configs: User ownership

2. **Storage Rules Logic**
   - Patient Photos: 50MB limit, content types, ownership
   - SOAP Attachments: 50MB limit, ownership
   - User Avatars: 10MB limit, ownership

3. **Requirements Validation**
   - Requirement 2.3: RLS policies
   - Requirement 2.4: File encryption and limits

### Integration Tests (`firebase-security-rules.test.ts`)

1. **User Consents Collection**
   - ✓ Deny unauthenticated access
   - ✓ Allow users to read their own consents
   - ✓ Deny cross-user access
   - ✓ Allow users to create their own consents
   - ✓ Deny consent deletion (compliance requirement)

2. **Audit Logs Collection**
   - ✓ Allow users to read their own logs
   - ✓ Deny cross-user access
   - ✓ Allow users to create logs
   - ✓ Deny updates (immutable requirement)
   - ✓ Deny deletion (immutable requirement)

3. **Privacy Policy Acceptances**
   - ✓ Allow users to create acceptances
   - ✓ Deny updates (immutable requirement)

4. **Biometric Configs**
   - ✓ Allow users to read/update their own config
   - ✓ Deny cross-user access

5. **Document Size Validation**
   - ✓ Enforce 1MB document size limit

## CI/CD Integration

### Recommended: Quick Tests Only

For fast CI/CD pipelines, use the quick logic tests:

```yaml
# Example GitHub Actions workflow
- name: Run Firebase Security Rules Tests
  run: pnpm vitest run apps/professional-ios/__tests__/firebase-rules-quick.test.ts
```

### Optional: Full Integration Tests

To run integration tests in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
   - ✓ Deny unauthenticated access
   - ✓ Allow owner to upload photos
   - ✓ Deny non-owner access
   - ✓ Enforce 50MB file size limit
   - ✓ Allow files under 50MB
   - ✓ Enforce allowed content types (images, PDFs, videos)

2. **SOAP Note Attachments (PHI)**
   - ✓ Allow owner to upload attachments
   - ✓ Deny non-owner access
   - ✓ Enforce 50MB file size limit

3. **User Avatars (Non-PHI)**
   - ✓ Allow users to upload their own avatar
   - ✓ Deny uploading another user's avatar
   - ✓ Allow authenticated users to read avatars

## Test Data

The tests use the following test user IDs:
- `user1`: Primary test user
- `user2`: Secondary test user (for cross-user access tests)
- `patient1`: Test patient owned by user1
- `patient2`: Test patient owned by user2

## Troubleshooting

### Emulators Not Running

If tests fail with connection errors:
```
Error: Could not reach Firestore backend
```

**Solution**: Ensure Firebase emulators are running on the correct ports:
```bash
firebase emulators:start --only firestore,storage
```

### Port Conflicts

If emulators fail to start due to port conflicts:

**Solution**: Change ports in `firebase.json`:
```json
{
  "emulators": {
    "firestore": {
      "port": 8081
    },
    "storage": {
      "port": 9200
    }
  }
}
```

Then update the test file ports accordingly.

### Rules File Not Found

If tests fail with:
```
Error: ENOENT: no such file or directory, open 'firestore.rules'
```

**Solution**: Ensure you're running tests from the project root, or update the file paths in the test file.

## CI/CD Integration

To run these tests in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Start Firebase Emulators
  run: |
    firebase emulators:start --only firestore,storage &
    sleep 10  # Wait for emulators to start

- name: Run Security Rules Tests
  run: pnpm test apps/professional-ios/__tests__/firebase-security-rules.test.ts

- name: Stop Emulators
  run: firebase emulators:stop
```

## Security Considerations

These tests verify critical security requirements:

1. **PHI Protection**: Patient photos and SOAP notes are only accessible by the owner
2. **Immutability**: Audit logs and legal acceptances cannot be modified or deleted
3. **File Size Limits**: 50MB limit for PHI files prevents abuse
4. **Content Type Validation**: Only allowed file types (images, PDFs, videos) can be uploaded
5. **Authentication**: All PHI access requires authentication
6. **Authorization**: Users can only access their own data

## Related Documentation

- [Firestore Security Rules](../../../firestore.rules)
- [Storage Security Rules](../../../storage.rules)
- [App Store Compliance Spec](.kiro/specs/app-store-compliance/)
- [Requirements Document](.kiro/specs/app-store-compliance/requirements.md)
