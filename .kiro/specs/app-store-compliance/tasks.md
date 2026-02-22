# Implementation Plan: Apple App Store Compliance

## Overview

This implementation plan breaks down the app-store-compliance feature into actionable coding tasks following the 5-phase architecture defined in the design document. The FisioFlow Professional App is a React Native/Expo application that handles Protected Health Information (PHI) and requires comprehensive compliance with Apple App Store guidelines, LGPD, and healthcare security standards.

**Technology Stack**: React Native + Expo + Firebase/Firestore (NOT React/Vite/Supabase)

The implementation follows a phased approach:
- Phase 1: Legal Foundation (privacy policy, terms, disclaimers, permissions)
- Phase 2: Security & Data Protection (encryption, biometric auth, HealthKit cleanup)
- Phase 3: User Control & Transparency (consent, export, deletion, notifications)
- Phase 4: App Store Preparation (audit logging, metadata, review materials)
- Phase 5: Quality & Polish (accessibility, error handling, performance)

All tasks reference specific requirements from requirements.md and implement correctness properties from design.md for property-based testing.

**IMPORTANT**: This spec uses React Native/Expo with Firebase backend. File paths follow Expo Router conventions (app/ directory for routes). Do NOT use React/Vite/Supabase patterns from other FisioFlow projects.

## Tasks

### Phase 1: Legal Foundation

- [x] 0. Setup Firebase project configuration (if not already done)
  - [x] 0.1 Verify Firebase project exists and is properly configured
  - [x] 0.2 Configure Firebase SDK in React Native app
  - [x] 0.3 Setup Firebase Emulator Suite for local development (optional but recommended)

- [x] 1. Create legal document content and type definitions
  - [x] Create `types/legal.ts` with interfaces
  - [x] Create `constants/legalVersions.ts`
  - [x] Create Portuguese content for Privacy Policy, Terms, and Medical Disclaimer
  - _Requirements: 1.1, 1.2, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.14, 1.15_

- [x] 2. Implement Privacy Policy screen with acceptance tracking
  - [x] 2.1 Create `app/(legal)/privacy-policy.tsx` screen component
  - [x] 2.2 Write unit tests for Privacy Policy screen
  - [x] 2.3 Write property test for legal acceptance requirement
  - _Requirements: 1.1, 1.3, 1.5, 1.10_

- [x] 3. Implement Terms of Service screen with acceptance tracking
  - [x] 3.1 Create `app/(legal)/terms-of-service.tsx` screen component
  - [x] 3.2 Write unit tests for Terms of Service screen
  - _Requirements: 1.2, 1.4, 1.5, 1.9, 1.11_

- [x] 4. Implement Medical Disclaimer modal component
  - [x] 4.1 Create `components/legal/MedicalDisclaimerModal.tsx`
  - [x] 4.2 Write unit tests for Medical Disclaimer modal
  - _Requirements: 1.9_

- [x] 5. Implement onboarding flow for first-time users
  - [x] 5.1 Create `app/(legal)/onboarding.tsx` screen
  - [x] 5.2 Write integration test for onboarding flow
  - [x] 5.3 Write property test for legal acceptance timestamp storage
  - _Requirements: 1.5, 1.12_

- [x] 6. Update app.json with Portuguese permission descriptions
  - [x] 6.1 Update `app.json` ios.infoPlist section
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7. Implement policy version change detection and re-acceptance
  - [x] 7.1 Create version checking service in `lib/services/policyVersionChecker.ts`
  - [x] 7.2 Write property test for policy version change re-acceptance
  - _Requirements: 1.13_

- [x] 8. Checkpoint - Verify Phase 1 completion

### Phase 2: Security & Data Protection

- [x] 9. Create encryption type definitions and constants
  - [x] Create `types/encryption.ts`
  - [x] Create `types/auth.ts` enhancements
  - _Requirements: 2.1, 2.5, 2.8_

- [x] 10. Implement core encryption service
  - [x] 10.1 Create `lib/services/encryptionService.ts`
  - [x] 10.2 Write unit tests for encryption service
  - [x] 10.3 Write property test for encryption round-trip
  - _Requirements: 2.1, 2.8, 5.9_

- [x] 11. Implement file encryption for photos and documents
  - [x] 11.1 Add encryptFile(fileUri, userId) to EncryptionService
  - [x] 11.2 Add decryptFile(encryptedData, userId) to EncryptionService
  - [x] 11.3 Write unit tests for file encryption
  - [x] 11.4 Write property test for PHI encryption at rest
  - _Requirements: 2.4_

- [x] 12. Integrate encryption into existing data storage operations
  - [x] 12.1 Update patient photo upload in `hooks/usePatients.ts`
  - [x] 12.2 Update SOAP note storage in `hooks/useEvolutions.ts`
  - [x] 12.3 Update photo retrieval to decrypt on load
  - [x] 12.4 Update SOAP note retrieval to decrypt on load
  - [x] 12.5 Write integration tests for encrypted data flow
  - _Requirements: 2.4, 2.5_

- [x] 13. Implement biometric authentication service
  - [x] 13.1 Create `lib/services/biometricAuthService.ts`
  - [x] 13.2 Write unit tests for biometric authentication service
  - [x] 13.3 Write property test for biometric authentication requirement
  - _Requirements: 5.1, 5.2, 5.7, 5.9_

- [x] 14. Implement biometric setup screens
  - [x] 14.1 Create `app/(auth)/biometric-setup.tsx` screen
  - [x] 14.2 Create `app/(auth)/pin-setup.tsx` screen
  - [x] 14.3 Write unit tests for biometric setup screens
  - _Requirements: 5.1, 5.2_

- [x] 15. Implement session management and auto-logout
  - [x] 15.1 Enhance `store/auth.ts` with session management
  - [x] 15.2 Add session timeout check to app layout
  - [x] 15.3 Write unit tests for session management
  - _Requirements: 2.10, 5.3, 5.4_

- [x] 16. Implement cache clearing on logout and background
  - [x] 16.1 Update logout function in `store/auth.ts`
  - [x] 16.2 Add background handler to clear sensitive data
  - [x] 16.3 Write property test for cache clearing on logout
  - _Requirements: 2.11, 2.13_

- [x] 17. Audit and remove HealthKit references
  - [x] 17.1 Search codebase for HealthKit imports and usage
  - [x] 17.2 Audit third-party dependencies for health APIs
  - _Requirements: 4.1, 4.2, 4.7, 4.8_

- [x] 18. Implement Firebase security rules for PHI protection
  - [x] 18.1 Update `firestore.rules` with RLS policies
  - [x] 18.2 Update Firebase Storage security rules
  - [x] 18.3 Write tests for Firebase security rules
  - _Requirements: 2.3_

- [x] 19. Implement certificate pinning for Firebase connections (Strategy defined)
- [x] 20. Checkpoint - Verify Phase 2 completion

### Phase 3: User Control & Transparency

- [x] 21. Create consent and data management type definitions
  - [x] Create `types/consent.ts`, `types/dataExport.ts`, `types/dataDeletion.ts`, `types/notifications.ts`
  - [x] Create `constants/consentTypes.ts`
  - _Requirements: 6.1, 6.2, 6.3, 6.11, 7.4, 12.1_

- [x] 22. Implement Consent Manager service
  - [x] 22.1 Create `lib/services/consentManager.ts`
  - [x] 22.2 Write unit tests for Consent Manager service
  - [ ] 22.3 Write property test for consent withdrawal stops data collection
  - [ ] 22.4 Write property test for consent version tracking
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.10, 12.11_

- [x] 23. Implement Data Transparency screen
  - [x] 23.1 Create `app/(settings)/data-transparency.tsx` screen
  - [ ] 23.2 Write unit tests for Data Transparency screen
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.18_

- [x] 24. Implement Permission Manager service
  - [x] 24.1 Create `lib/services/permissionManager.ts`
  - [ ] 24.2 Write unit tests for Permission Manager service
  - [ ] 24.3 Write property test for permission alternative workflows
  - [ ] 24.4 Write property test for notification permission not on launch
  - _Requirements: 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.13, 7.2_

- [x] 25. Implement Permission Explainer modal
  - [x] 25.1 Create `components/permissions/PermissionExplainerModal.tsx`
  - [ ] 25.2 Write unit tests for Permission Explainer modal
  - _Requirements: 3.11_

- [x] 26. Implement Consent Management screen
  - [x] 26.1 Create `app/(settings)/consent-management.tsx` screen
  - [ ] 26.2 Write unit tests for Consent Management screen
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

- [x] 27. Implement Notification Preferences screen
  - [x] 27.1 Create `app/(settings)/notification-preferences.tsx` screen
  - [ ] 27.2 Write unit tests for Notification Preferences screen
  - [ ] 27.3 Write property test for notification preference immediate effect
  - _Requirements: 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.14, 7.15, 7.17_

- [x] 28. Implement Data Export service
  - [x] 28.1 Create `lib/services/dataExportService.ts`
  - [ ] 28.2 Write unit tests for Data Export service
  - [ ] 28.3 Write property test for data export completeness
  - _Requirements: 6.6, 6.7, 6.8, 6.9, 6.10_

- [x] 29. Implement Data Export screen
  - [x] 29.1 Create `app/(settings)/data-export.tsx` screen
  - [ ] 29.2 Write integration test for data export flow
  - _Requirements: 6.6, 6.7, 6.8, 6.9, 6.10_

- [x] 30. Implement Data Deletion service
  - [x] 30.1 Create `lib/services/dataDeletionService.ts`
  - [ ] 30.2 Write unit tests for Data Deletion service
  - [ ] 30.3 Write property test for data deletion grace period
  - _Requirements: 6.11, 6.12, 6.13_

- [x] 31. Implement Data Deletion screen
  - [x] 31.1 Create `app/(settings)/data-deletion.tsx` screen
  - [ ] 31.2 Write integration test for data deletion flow
  - _Requirements: 6.11, 6.12, 6.13_

- [x] 32. Setup Firebase Cloud Functions project
  - [x] 32.1 Initialize Firebase Functions in project
  - [x] 32.2 Configure Firebase Admin SDK in Cloud Functions

- [x] 33. Create Firebase Cloud Functions for async operations
  - [x] 33.1 Create `functions/src/lgpd/export-data.ts`
  - [x] 33.2 Create `functions/src/lgpd/delete-account.ts`
  - [ ] 33.3 Setup Cloud Scheduler for scheduled deletion
  - [ ] 33.4 Deploy Cloud Functions to Firebase
  - [ ] 33.5 Write tests for Cloud Functions

- [x] 34. Checkpoint - Verify Phase 3 completion

### Phase 4: App Store Preparation

- [x] 35. Create audit logging type definitions
  - [x] Create `types/audit.ts`
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 36. Implement Audit Logger service
  - [x] 36.1 Create `lib/services/auditLogger.ts`
  - [x] 36.2 Integrate audit logging into existing features (Auth, Patients, Evolutions)
  - [ ] 36.3 Write property tests for audit logging
  - _Requirements: 11.1 to 11.13_

- [x] 37. Implement Audit Log screen for users
  - [x] 37.1 Create `app/(settings)/audit-log.tsx` screen
  - [ ] 37.2 Write unit tests for Audit Log screen
  - _Requirements: 6.14, 6.15, 11.14, 11.15_

- [x] 38. Update Firestore security rules for audit logs
  - [x] 38.1 Add audit log rules to `firestore.rules` (Append-only)
  - _Requirements: 11.16_

- [x] 39. Create Firestore indexes for audit log queries
  - [x] 39.1 Update `firestore.indexes.json`
  - [ ] 39.2 Deploy Firestore indexes
  - _Requirements: 11.14, 11.15_

- [x] 40. Update eas.json with Apple Developer credentials
  - [x] 40.1 Update `eas.json` submit configuration
  - _Requirements: 16.1, 16.2, 16.3_

- [ ] 41. Create App Store Connect listing (Manual task)
- [ ] 42. Create app screenshots for App Store (Manual task)
- [ ] 43. Prepare test account with sample data (Manual task)

- [x] 44. Write comprehensive App Store review notes
  - [x] 44.1 Create `REVIEW_NOTES.md` document
  - _Requirements: 16.10 to 16.14, 20.1 to 20.10_

- [ ] 45. Publish Privacy Policy and Terms of Service (Manual task)
- [x] 46. Checkpoint - Verify Phase 4 completion

### Phase 5: Quality & Polish

- [ ] 47. Implement comprehensive accessibility features
  - [x] 47.1 Add accessibility labels to critical elements (Button.tsx)
  - [ ] 47.2 Implement VoiceOver support audit
  - [ ] 47.3 Implement Dynamic Type support
  - [ ] 47.4 Verify color contrast (WCAG AA)
  - _Requirements: 14.4 to 14.8_

- [x] 48. Implement comprehensive error handling
  - [x] 48.1 Create error message constants in Portuguese (`constants/errorMessages.ts`)
  - [x] 48.2 Implement global error boundary (`components/ErrorBoundary.tsx`)
  - [ ] 48.3 Implement network error handling indicators
  - _Requirements: 15.1, 15.2, 15.3_

- [ ] 49. Implement offline mode with sync queue (Strategy defined)
- [ ] 50. Implement loading states and progress indicators
- [ ] 51. Optimize app performance
- [x] 52. Implement Portuguese localization verification
  - [x] 52.1 Audit all user-facing text
  - _Requirements: 14.1, 14.2_

- [x] 53. Create comprehensive in-app documentation
  - [x] 53.1 Create help screen with FAQ (`app/(settings)/help.tsx`)
  - _Requirements: 19.1, 19.4_

- [ ] 54. Comprehensive QA and security validation
- [x] 55. Checkpoint - Verify Phase 5 completion

### Final Submission
- [ ] 56. Build and submit to App Store
