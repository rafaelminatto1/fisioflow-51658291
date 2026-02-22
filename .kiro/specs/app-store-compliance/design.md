# Design Document - Apple App Store Compliance

## Overview

This design document specifies the technical implementation for making the FisioFlow Professional App fully compliant with Apple App Store guidelines. The app is a React Native/Expo-based clinical management tool for physiotherapists that handles Protected Health Information (PHI) including SOAP notes, patient photos, medical history, and exercise prescriptions.

### Problem Statement

The FisioFlow Professional App currently has critical compliance gaps preventing App Store approval:
- No accessible privacy policy or terms of service
- Inadequate PHI data protection and encryption
- Missing or generic permission justifications (NSUsageDescription)
- Unused HealthKit references
- Lack of user data transparency and control
- No audit logging for PHI access
- Incomplete App Store Connect configuration

### Solution Approach

We will implement a comprehensive compliance system across 5 phases:

**Phase 1 - Legal Foundation**: Privacy policy, terms of service, medical disclaimers, and permission justifications
**Phase 2 - Security & Data Protection**: PHI encryption, enhanced authentication, HealthKit cleanup
**Phase 3 - User Control & Transparency**: Data transparency screen, consent management, notification preferences, data export/deletion
**Phase 4 - App Store Preparation**: Audit logging, metadata configuration, review materials
**Phase 5 - Quality & Polish**: Accessibility, error handling, performance, documentation

### Success Criteria

- All 315 acceptance criteria met and verified
- App passes internal security and privacy audits
- Privacy Policy and Terms of Service published and accessible
- All App Store Connect metadata complete with valid credentials
- Test account prepared with sample data
- App approved by Apple on first submission attempt


## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native/Expo App                     │
├─────────────────────────────────────────────────────────────┤
│  Presentation Layer                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Legal Screens│  │ Settings     │  │ Data Control │     │
│  │ - Privacy    │  │ - Consent    │  │ - Export     │     │
│  │ - Terms      │  │ - Permissions│  │ - Deletion   │     │
│  │ - Disclaimers│  │ - Audit Log  │  │ - Transparency│    │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Consent Mgr  │  │ Audit Logger │  │ Encryption   │     │
│  │ - Track      │  │ - PHI Access │  │ - AES-256    │     │
│  │ - Validate   │  │ - Immutable  │  │ - E2EE SOAP  │     │
│  │ - Withdraw   │  │ - Firestore  │  │ - Key Mgmt   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Auth Manager │  │ Data Export  │  │ Permission   │     │
│  │ - Biometric  │  │ - JSON/PDF   │  │ - Request    │     │
│  │ - PIN        │  │ - PHI Bundle │  │ - Explain    │     │
│  │ - 2FA        │  │ - Async      │  │ - Fallback   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Firebase     │  │ Secure Store │  │ Local Cache  │     │
│  │ - Firestore  │  │ - Tokens     │  │ - Encrypted  │     │
│  │ - Auth       │  │ - Keys       │  │ - Ephemeral  │     │
│  │ - Storage    │  │ - Biometric  │  │ - Clear on   │     │
│  │ - RLS        │  │              │  │   Logout     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Firebase   │    │ Expo Modules │    │  iOS APIs    │
│   Backend    │    │ - SecureStore│    │ - Biometric  │
│              │    │ - LocalAuth  │    │ - Permissions│
└──────────────┘    └──────────────┘    └──────────────┘
```

### Architecture Principles

1. **Privacy by Design**: Minimize data collection, encrypt by default, user control
2. **Defense in Depth**: Multiple security layers (encryption, authentication, RLS, audit)
3. **Separation of Concerns**: Legal, security, and business logic are isolated
4. **Fail Secure**: Errors default to denying access, not granting it
5. **Auditability**: All PHI access is logged immutably
6. **Testability**: Each component is independently testable


## Components and Interfaces

### 1. Legal Components

#### PrivacyPolicyScreen
**Location**: `app/(legal)/privacy-policy.tsx`

**Purpose**: Display privacy policy with acceptance tracking

**Interface**:
```typescript
interface PrivacyPolicyScreenProps {
  mode: 'onboarding' | 'view'; // Onboarding requires acceptance
  onAccept?: () => void;
}
```

**Features**:
- Render markdown content from remote URL or local fallback
- Track scroll position to ensure user reads content
- Require explicit acceptance checkbox for onboarding
- Store acceptance timestamp in Firestore
- Support version tracking for policy updates

#### TermsOfServiceScreen
**Location**: `app/(legal)/terms-of-service.tsx`

**Purpose**: Display terms of service with acceptance tracking

**Interface**:
```typescript
interface TermsOfServiceScreenProps {
  mode: 'onboarding' | 'view';
  onAccept?: () => void;
}
```

**Features**: Same as PrivacyPolicyScreen

#### MedicalDisclaimerModal
**Location**: `components/legal/MedicalDisclaimerModal.tsx`

**Purpose**: Display medical disclaimers in relevant contexts

**Interface**:
```typescript
interface MedicalDisclaimerModalProps {
  visible: boolean;
  context: 'first-launch' | 'exercise-prescription' | 'protocol-application';
  onAcknowledge: () => void;
}
```

**Features**:
- Context-specific disclaimer text
- Require acknowledgment before proceeding
- Log acknowledgment with timestamp
- Non-dismissible until acknowledged


### 2. Data Control Components

#### DataTransparencyScreen
**Location**: `app/(settings)/data-transparency.tsx`

**Purpose**: Show all data collected and how it's used

**Interface**:
```typescript
interface DataCategory {
  id: string;
  name: string;
  description: string;
  purpose: string;
  retention: string;
  thirdParties: string[];
  examples: string[];
}

interface DataTransparencyScreenProps {
  userId: string;
}
```

**Features**:
- Display categorized data collection (Personal, Health, Usage, Technical)
- Show purpose for each data type
- List third-party recipients (Firebase, Expo)
- Display retention periods
- Link to Privacy Policy for details
- Real-time updates when practices change

#### DataExportScreen
**Location**: `app/(settings)/data-export.tsx`

**Purpose**: Allow users to export all their data

**Interface**:
```typescript
interface DataExportScreenProps {
  userId: string;
}

interface ExportOptions {
  format: 'json' | 'pdf';
  includePatients: boolean;
  includeSOAPNotes: boolean;
  includePhotos: boolean;
  includeAuditLog: boolean;
}
```

**Features**:
- Select export format (JSON, PDF)
- Choose data categories to include
- Generate export asynchronously for large datasets
- Email download link when ready (< 48 hours)
- Encrypt export file with user-provided password
- Auto-delete export after 7 days

#### DataDeletionScreen
**Location**: `app/(settings)/data-deletion.tsx`

**Purpose**: Allow users to request account and data deletion

**Interface**:
```typescript
interface DataDeletionScreenProps {
  userId: string;
}

interface DeletionRequest {
  userId: string;
  requestedAt: Date;
  scheduledFor: Date; // 30 days later
  status: 'pending' | 'cancelled' | 'completed';
  reason?: string;
}
```

**Features**:
- Display warning about permanent data loss
- Explain 30-day grace period
- Require password confirmation
- Allow cancellation during grace period
- Send confirmation email
- Provide data export before deletion
- Log deletion request in audit log


### 3. Consent Management Components

#### ConsentManagerScreen
**Location**: `app/(settings)/consent-management.tsx`

**Purpose**: Central hub for reviewing and managing all consents

**Interface**:
```typescript
interface Consent {
  id: string;
  type: 'required' | 'optional';
  category: 'legal' | 'permission' | 'analytics' | 'marketing';
  name: string;
  description: string;
  grantedAt?: Date;
  withdrawnAt?: Date;
  version: string;
  status: 'granted' | 'withdrawn' | 'pending';
}

interface ConsentManagerScreenProps {
  userId: string;
}
```

**Features**:
- List all consents (required and optional)
- Show consent status and timestamps
- Allow withdrawal of optional consents
- Explain consequences of withdrawal
- Track consent version history
- Sync with Firebase in real-time

#### PermissionExplainerModal
**Location**: `components/permissions/PermissionExplainerModal.tsx`

**Purpose**: Explain permissions before requesting them

**Interface**:
```typescript
interface PermissionExplainerModalProps {
  permission: 'camera' | 'photos' | 'location' | 'notifications';
  visible: boolean;
  onRequest: () => void;
  onCancel: () => void;
}
```

**Features**:
- Context-specific explanation for each permission
- Visual examples of how permission is used
- Alternative workflows if denied
- Link to system settings if previously denied
- Track explanation views in analytics

#### NotificationPreferencesScreen
**Location**: `app/(settings)/notification-preferences.tsx`

**Purpose**: Granular control over notification types

**Interface**:
```typescript
interface NotificationPreference {
  category: 'appointments' | 'patients' | 'system' | 'marketing';
  enabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:mm
  quietHoursEnd?: string;
}

interface NotificationPreferencesScreenProps {
  userId: string;
}
```

**Features**:
- Toggle each notification category
- Set quiet hours per category
- Test notification delivery
- Respect iOS system settings
- Sync preferences to Firebase
- Immediate effect (no app restart)


### 4. Authentication Components

#### BiometricAuthScreen
**Location**: `app/(auth)/biometric-setup.tsx`

**Purpose**: Setup and manage biometric authentication

**Interface**:
```typescript
interface BiometricAuthScreenProps {
  mode: 'setup' | 'verify';
  onSuccess: () => void;
  onFallback: () => void;
}

interface BiometricConfig {
  enabled: boolean;
  type: 'faceId' | 'touchId' | 'none';
  fallbackEnabled: boolean;
  requireOnLaunch: boolean;
  requireAfterBackground: boolean; // 5 minutes
}
```

**Features**:
- Detect available biometric hardware
- Setup Face ID or Touch ID
- Configure PIN fallback (6 digits minimum)
- Test biometric authentication
- Handle biometric changes (new fingerprint added)
- Auto-logout after failed attempts (5 tries)

#### PINSetupScreen
**Location**: `app/(auth)/pin-setup.tsx`

**Purpose**: Setup PIN as biometric fallback

**Interface**:
```typescript
interface PINSetupScreenProps {
  mode: 'create' | 'verify' | 'change';
  onSuccess: (pin: string) => void;
}
```

**Features**:
- Require 6-digit PIN minimum
- Confirm PIN entry (enter twice)
- Validate PIN strength
- Store PIN hash in SecureStore
- Support PIN change with old PIN verification

#### TwoFactorAuthScreen
**Location**: `app/(auth)/two-factor-setup.tsx`

**Purpose**: Optional 2FA setup for enhanced security

**Interface**:
```typescript
interface TwoFactorAuthScreenProps {
  userId: string;
  mode: 'setup' | 'verify' | 'disable';
}

interface TwoFactorConfig {
  enabled: boolean;
  method: 'sms' | 'email' | 'authenticator';
  backupCodes: string[];
}
```

**Features**:
- Generate QR code for authenticator apps
- Send verification codes via SMS or email
- Generate backup codes
- Verify 2FA during setup
- Allow disabling with password confirmation


### 5. Audit and Compliance Components

#### AuditLogScreen
**Location**: `app/(settings)/audit-log.tsx`

**Purpose**: Display user's audit log entries

**Interface**:
```typescript
interface AuditLogEntry {
  id: string;
  userId: string;
  timestamp: Date;
  action: 'login' | 'logout' | 'view' | 'create' | 'update' | 'delete' | 'export';
  resourceType: 'patient' | 'soap_note' | 'photo' | 'protocol' | 'settings';
  resourceId?: string;
  deviceInfo: {
    model: string;
    osVersion: string;
    appVersion: string;
  };
  ipAddress?: string;
  metadata?: Record<string, any>;
}

interface AuditLogScreenProps {
  userId: string;
  filters?: {
    startDate?: Date;
    endDate?: Date;
    actions?: string[];
    resourceTypes?: string[];
  };
}
```

**Features**:
- Display chronological audit log
- Filter by date range, action type, resource type
- Search by resource ID
- Export audit log as CSV
- Paginate for performance (50 entries per page)
- Real-time updates for new entries
- Cannot modify or delete entries (immutable)


## Data Models

### TypeScript Interfaces

#### Legal Acceptance Models

```typescript
// types/legal.ts

export interface PrivacyPolicyAcceptance {
  id: string;
  userId: string;
  version: string;
  acceptedAt: Date;
  ipAddress?: string;
  deviceInfo: DeviceInfo;
}

export interface TermsOfServiceAcceptance {
  id: string;
  userId: string;
  version: string;
  acceptedAt: Date;
  ipAddress?: string;
  deviceInfo: DeviceInfo;
}

export interface MedicalDisclaimerAcknowledgment {
  id: string;
  userId: string;
  context: 'first-launch' | 'exercise-prescription' | 'protocol-application';
  acknowledgedAt: Date;
  version: string;
}

export interface DeviceInfo {
  model: string;
  osVersion: string;
  appVersion: string;
  platform: 'ios' | 'android';
}
```

#### Consent Models

```typescript
// types/consent.ts

export type ConsentType = 'required' | 'optional';
export type ConsentCategory = 'legal' | 'permission' | 'analytics' | 'marketing';
export type ConsentStatus = 'granted' | 'withdrawn' | 'pending';

export interface Consent {
  id: string;
  userId: string;
  type: ConsentType;
  category: ConsentCategory;
  name: string;
  description: string;
  version: string;
  status: ConsentStatus;
  grantedAt?: Date;
  withdrawnAt?: Date;
  metadata?: Record<string, any>;
}

export interface ConsentHistory {
  id: string;
  consentId: string;
  userId: string;
  action: 'granted' | 'withdrawn' | 'updated';
  timestamp: Date;
  version: string;
  reason?: string;
}

// Predefined consent types
export const CONSENT_TYPES = {
  PRIVACY_POLICY: 'privacy-policy',
  TERMS_OF_SERVICE: 'terms-of-service',
  CAMERA_PERMISSION: 'camera-permission',
  PHOTOS_PERMISSION: 'photos-permission',
  LOCATION_PERMISSION: 'location-permission',
  NOTIFICATIONS_PERMISSION: 'notifications-permission',
  ANALYTICS: 'analytics',
  CRASH_REPORTS: 'crash-reports',
  MARKETING_EMAILS: 'marketing-emails',
} as const;
```


#### Audit Log Models

```typescript
// types/audit.ts

export type AuditAction = 
  | 'login' 
  | 'logout' 
  | 'view' 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'export'
  | 'consent-granted'
  | 'consent-withdrawn'
  | 'settings-changed';

export type AuditResourceType = 
  | 'patient' 
  | 'soap_note' 
  | 'photo' 
  | 'protocol' 
  | 'exercise'
  | 'appointment'
  | 'settings'
  | 'consent';

export interface AuditLogEntry {
  id: string;
  userId: string;
  timestamp: Date;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;
  deviceInfo: DeviceInfo;
  ipAddress?: string;
  metadata?: Record<string, any>;
  // Immutable - no update or delete operations allowed
}

export interface AuditLogQuery {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  actions?: AuditAction[];
  resourceTypes?: AuditResourceType[];
  limit?: number;
  offset?: number;
}
```

#### Data Export Models

```typescript
// types/dataExport.ts

export type ExportFormat = 'json' | 'pdf';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

export interface DataExportRequest {
  id: string;
  userId: string;
  format: ExportFormat;
  options: ExportOptions;
  status: ExportStatus;
  requestedAt: Date;
  completedAt?: Date;
  expiresAt?: Date; // 7 days after completion
  downloadUrl?: string;
  encryptionPassword?: string; // Hashed
  fileSize?: number;
  error?: string;
}

export interface ExportOptions {
  includePatients: boolean;
  includeSOAPNotes: boolean;
  includePhotos: boolean;
  includeProtocols: boolean;
  includeExercises: boolean;
  includeAppointments: boolean;
  includeAuditLog: boolean;
  includeConsents: boolean;
}

export interface ExportedData {
  exportId: string;
  exportedAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
  };
  patients?: any[];
  soapNotes?: any[];
  photos?: any[];
  protocols?: any[];
  exercises?: any[];
  appointments?: any[];
  auditLog?: AuditLogEntry[];
  consents?: Consent[];
}
```


#### Data Deletion Models

```typescript
// types/dataDeletion.ts

export type DeletionStatus = 'pending' | 'cancelled' | 'completed';

export interface DataDeletionRequest {
  id: string;
  userId: string;
  requestedAt: Date;
  scheduledFor: Date; // 30 days after request
  cancelledAt?: Date;
  completedAt?: Date;
  status: DeletionStatus;
  reason?: string;
  confirmationToken: string;
}

export interface DeletionScope {
  deleteAccount: boolean;
  deletePatients: boolean;
  deleteSOAPNotes: boolean;
  deletePhotos: boolean;
  deleteProtocols: boolean;
  deleteExercises: boolean;
  deleteAppointments: boolean;
  // Audit log is retained for 1 year minimum per compliance
  retainAuditLog: boolean;
}
```

#### Authentication Models

```typescript
// types/auth.ts

export type BiometricType = 'faceId' | 'touchId' | 'none';
export type TwoFactorMethod = 'sms' | 'email' | 'authenticator';

export interface BiometricConfig {
  userId: string;
  enabled: boolean;
  type: BiometricType;
  fallbackEnabled: boolean;
  pinHash?: string; // Hashed PIN for fallback
  requireOnLaunch: boolean;
  requireAfterBackground: boolean;
  backgroundTimeout: number; // Seconds (default 300 = 5 minutes)
  failedAttempts: number;
  lockedUntil?: Date;
}

export interface TwoFactorConfig {
  userId: string;
  enabled: boolean;
  method: TwoFactorMethod;
  secret?: string; // For authenticator apps
  phoneNumber?: string; // For SMS
  email?: string; // For email codes
  backupCodes: string[]; // Hashed
  verifiedAt?: Date;
}

export interface SessionConfig {
  userId: string;
  sessionTimeout: number; // Minutes (default 15)
  autoLogoutEnabled: boolean;
  lastActivityAt: Date;
}
```


#### Encryption Models

```typescript
// types/encryption.ts

export interface EncryptionKey {
  id: string;
  userId: string;
  algorithm: 'AES-256-GCM';
  keyHash: string; // Never store actual key
  createdAt: Date;
  rotatedAt?: Date;
  expiresAt?: Date;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string; // Initialization vector
  authTag: string; // Authentication tag for GCM
  algorithm: 'AES-256-GCM';
  keyId: string;
}

export interface E2EEConfig {
  enabled: boolean;
  resourceTypes: ('soap_note' | 'photo' | 'document')[];
  keyRotationDays: number; // Default 90
}
```

#### Notification Preferences Models

```typescript
// types/notifications.ts

export type NotificationCategory = 'appointments' | 'patients' | 'system' | 'marketing';

export interface NotificationPreference {
  userId: string;
  category: NotificationCategory;
  enabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string;
  channels: {
    push: boolean;
    email: boolean;
    inApp: boolean;
  };
}

export interface NotificationPreferences {
  userId: string;
  appointments: NotificationPreference;
  patients: NotificationPreference;
  system: NotificationPreference;
  marketing: NotificationPreference;
  updatedAt: Date;
}
```


## API and Service Layer

### 1. Consent Manager Service

**Location**: `lib/services/consentManager.ts`

```typescript
export class ConsentManager {
  /**
   * Initialize consent manager for user
   */
  async initialize(userId: string): Promise<void>;

  /**
   * Grant consent for a specific type
   */
  async grantConsent(
    userId: string,
    consentType: string,
    version: string,
    metadata?: Record<string, any>
  ): Promise<Consent>;

  /**
   * Withdraw consent (only for optional consents)
   */
  async withdrawConsent(
    userId: string,
    consentType: string,
    reason?: string
  ): Promise<void>;

  /**
   * Check if user has granted specific consent
   */
  async hasConsent(userId: string, consentType: string): Promise<boolean>;

  /**
   * Get all consents for user
   */
  async getUserConsents(userId: string): Promise<Consent[]>;

  /**
   * Get consent history
   */
  async getConsentHistory(userId: string, consentType?: string): Promise<ConsentHistory[]>;

  /**
   * Check if consent needs renewal (version changed)
   */
  async needsRenewal(userId: string, consentType: string, currentVersion: string): Promise<boolean>;

  /**
   * Sync consent with device permissions
   */
  async syncDevicePermissions(userId: string): Promise<void>;
}
```

**Implementation Notes**:
- Store consents in Firestore collection `user_consents`
- Use Firebase Auth UID as userId
- Implement real-time listeners for consent changes
- Cache consent status locally for offline access
- Validate consent type against predefined list
- Prevent withdrawal of required consents
- Log all consent changes to audit log


### 2. Audit Logger Service

**Location**: `lib/services/auditLogger.ts`

```typescript
export class AuditLogger {
  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;

  /**
   * Log user login
   */
  async logLogin(userId: string, deviceInfo: DeviceInfo): Promise<void>;

  /**
   * Log user logout
   */
  async logLogout(userId: string): Promise<void>;

  /**
   * Log PHI access (view)
   */
  async logPHIAccess(
    userId: string,
    resourceType: AuditResourceType,
    resourceId: string
  ): Promise<void>;

  /**
   * Log PHI modification (create, update, delete)
   */
  async logPHIModification(
    userId: string,
    action: 'create' | 'update' | 'delete',
    resourceType: AuditResourceType,
    resourceId: string,
    metadata?: Record<string, any>
  ): Promise<void>;

  /**
   * Log data export request
   */
  async logDataExport(userId: string, exportId: string): Promise<void>;

  /**
   * Log consent change
   */
  async logConsentChange(
    userId: string,
    consentType: string,
    action: 'granted' | 'withdrawn'
  ): Promise<void>;

  /**
   * Query audit log
   */
  async query(query: AuditLogQuery): Promise<AuditLogEntry[]>;

  /**
   * Export audit log as CSV
   */
  async exportAsCSV(userId: string, query?: AuditLogQuery): Promise<string>;

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<DeviceInfo>;

  /**
   * Get IP address (if available)
   */
  private async getIPAddress(): Promise<string | undefined>;
}
```

**Implementation Notes**:
- Store in Firestore collection `audit_logs` with append-only security rules
- Use Firestore server timestamp for accuracy
- Never include PHI in log messages (only IDs)
- Implement batching for performance (max 500 writes/batch)
- Set TTL for automatic deletion after 1 year (Firestore TTL policy)
- Index by userId, timestamp, action, resourceType for efficient queries
- Compress old logs (> 90 days) to reduce storage costs


### 3. Encryption Service

**Location**: `lib/services/encryption.ts`

```typescript
export class EncryptionService {
  /**
   * Initialize encryption for user
   */
  async initialize(userId: string): Promise<void>;

  /**
   * Encrypt data using AES-256-GCM
   */
  async encrypt(data: string, userId: string): Promise<EncryptedData>;

  /**
   * Decrypt data
   */
  async decrypt(encryptedData: EncryptedData, userId: string): Promise<string>;

  /**
   * Encrypt file for Firebase Storage
   */
  async encryptFile(fileUri: string, userId: string): Promise<EncryptedData>;

  /**
   * Decrypt file from Firebase Storage
   */
  async decryptFile(encryptedData: EncryptedData, userId: string): Promise<string>;

  /**
   * Generate encryption key for user
   */
  private async generateKey(userId: string): Promise<string>;

  /**
   * Store key securely in Expo SecureStore
   */
  private async storeKey(userId: string, key: string): Promise<void>;

  /**
   * Retrieve key from SecureStore
   */
  private async retrieveKey(userId: string): Promise<string>;

  /**
   * Rotate encryption key
   */
  async rotateKey(userId: string): Promise<void>;

  /**
   * Clear encryption keys on logout
   */
  async clearKeys(userId: string): Promise<void>;
}
```

**Implementation Notes**:
- Use `expo-crypto` for AES-256-GCM encryption
- Store keys in `expo-secure-store` (iOS Keychain)
- Implement key derivation using PBKDF2
- Generate unique IV for each encryption operation
- Use authenticated encryption (GCM mode) to prevent tampering
- Implement key rotation every 90 days
- Clear all keys from memory on logout or app background


### 4. Data Export Service

**Location**: `lib/services/dataExport.ts`

```typescript
export class DataExportService {
  /**
   * Request data export
   */
  async requestExport(
    userId: string,
    format: ExportFormat,
    options: ExportOptions
  ): Promise<DataExportRequest>;

  /**
   * Generate JSON export
   */
  async generateJSONExport(userId: string, options: ExportOptions): Promise<ExportedData>;

  /**
   * Generate PDF export
   */
  async generatePDFExport(userId: string, options: ExportOptions): Promise<string>;

  /**
   * Check export status
   */
  async getExportStatus(exportId: string): Promise<DataExportRequest>;

  /**
   * Download export file
   */
  async downloadExport(exportId: string): Promise<string>;

  /**
   * Cancel pending export
   */
  async cancelExport(exportId: string): Promise<void>;

  /**
   * Clean up expired exports
   */
  async cleanupExpiredExports(): Promise<void>;

  /**
   * Encrypt export with user password
   */
  private async encryptExport(data: string, password: string): Promise<string>;
}
```

**Implementation Notes**:
- Use Firebase Cloud Functions for async export generation
- Store export files in Firebase Storage with 7-day expiration
- Send email notification when export is ready
- Implement progress tracking for large exports
- Use streaming for memory-efficient PDF generation
- Encrypt exports with user-provided password
- Include metadata (export date, version, user info)
- Implement rate limiting (1 export per 24 hours)


### 5. Data Deletion Service

**Location**: `lib/services/dataDeletion.ts`

```typescript
export class DataDeletionService {
  /**
   * Request account deletion
   */
  async requestDeletion(
    userId: string,
    password: string,
    reason?: string
  ): Promise<DataDeletionRequest>;

  /**
   * Cancel deletion request (within 30-day grace period)
   */
  async cancelDeletion(deletionId: string, userId: string): Promise<void>;

  /**
   * Execute deletion (called by scheduled job after 30 days)
   */
  async executeDeletion(deletionId: string): Promise<void>;

  /**
   * Get deletion status
   */
  async getDeletionStatus(userId: string): Promise<DataDeletionRequest | null>;

  /**
   * Delete user data by category
   */
  private async deletePatientData(userId: string): Promise<void>;
  private async deleteSOAPNotes(userId: string): Promise<void>;
  private async deletePhotos(userId: string): Promise<void>;
  private async deleteProtocols(userId: string): Promise<void>;
  private async deleteAppointments(userId: string): Promise<void>;

  /**
   * Anonymize audit log (retain for compliance)
   */
  private async anonymizeAuditLog(userId: string): Promise<void>;

  /**
   * Send deletion confirmation email
   */
  private async sendDeletionConfirmation(userId: string): Promise<void>;
}
```

**Implementation Notes**:
- Require password confirmation before deletion
- Implement 30-day grace period (LGPD requirement)
- Send email confirmation with cancellation link
- Use Firebase Cloud Functions for scheduled deletion
- Implement soft delete (mark as deleted, actual deletion after 30 days)
- Retain audit log for 1 year (anonymized)
- Delete all Firebase Storage files
- Remove user from Firebase Auth
- Log deletion in audit log before anonymization


### 6. Permission Manager Service

**Location**: `lib/services/permissionManager.ts`

```typescript
export class PermissionManager {
  /**
   * Request permission with explanation
   */
  async requestPermission(
    permission: 'camera' | 'photos' | 'location' | 'notifications',
    context?: string
  ): Promise<boolean>;

  /**
   * Check permission status
   */
  async checkPermission(
    permission: 'camera' | 'photos' | 'location' | 'notifications'
  ): Promise<'granted' | 'denied' | 'undetermined'>;

  /**
   * Show permission explainer before requesting
   */
  async showExplainer(
    permission: 'camera' | 'photos' | 'location' | 'notifications'
  ): Promise<boolean>;

  /**
   * Open system settings if permission denied
   */
  async openSettings(): Promise<void>;

  /**
   * Get alternative workflow for denied permission
   */
  getAlternativeWorkflow(permission: string): string;

  /**
   * Sync permission status with consent manager
   */
  async syncWithConsentManager(userId: string): Promise<void>;

  /**
   * Track permission request in analytics
   */
  private async trackPermissionRequest(
    permission: string,
    granted: boolean
  ): Promise<void>;
}
```

**Implementation Notes**:
- Use Expo modules for permission requests
- Show explainer modal before first request
- Track permission status in consent manager
- Provide alternative workflows for denied permissions
- Never request permissions on app launch
- Request permissions just-in-time (when feature is used)
- Log permission changes to audit log


### 7. Biometric Authentication Service

**Location**: `lib/services/biometricAuth.ts`

```typescript
export class BiometricAuthService {
  /**
   * Check if biometric hardware is available
   */
  async isAvailable(): Promise<boolean>;

  /**
   * Get available biometric type
   */
  async getBiometricType(): Promise<BiometricType>;

  /**
   * Authenticate with biometrics
   */
  async authenticate(reason?: string): Promise<boolean>;

  /**
   * Setup biometric authentication
   */
  async setup(userId: string): Promise<void>;

  /**
   * Disable biometric authentication
   */
  async disable(userId: string): Promise<void>;

  /**
   * Setup PIN fallback
   */
  async setupPIN(userId: string, pin: string): Promise<void>;

  /**
   * Verify PIN
   */
  async verifyPIN(userId: string, pin: string): Promise<boolean>;

  /**
   * Handle failed authentication attempts
   */
  async handleFailedAttempt(userId: string): Promise<void>;

  /**
   * Check if account is locked
   */
  async isLocked(userId: string): Promise<boolean>;

  /**
   * Unlock account (after timeout)
   */
  async unlock(userId: string): Promise<void>;

  /**
   * Clear biometric data on logout
   */
  async clearBiometricData(userId: string): Promise<void>;
}
```

**Implementation Notes**:
- Use `expo-local-authentication` for biometric auth
- Store PIN hash in `expo-secure-store`
- Implement exponential backoff for failed attempts
- Lock account after 5 failed attempts (15 minutes)
- Clear biometric data on logout
- Support Face ID and Touch ID on iOS
- Provide clear error messages for biometric failures
- Log authentication attempts to audit log


## Security Architecture

### Encryption Strategy

#### Data at Rest
- **PHI in Firestore**: Encrypted using AES-256-GCM before storage
- **Files in Storage**: Encrypted before upload to Firebase Storage
- **Local Cache**: Encrypted using `expo-secure-store`
- **Authentication Tokens**: Stored in iOS Keychain via SecureStore

#### Data in Transit
- **Firebase Connections**: TLS 1.3 with certificate pinning
- **API Calls**: HTTPS only, reject HTTP connections
- **WebSocket**: Secure WebSocket (WSS) for real-time updates

#### Key Management
- **User Keys**: Derived from user credentials using PBKDF2
- **Storage**: iOS Keychain via `expo-secure-store`
- **Rotation**: Automatic key rotation every 90 days
- **Backup**: No key backup (user must remember credentials)

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                       │
└─────────────────────────────────────────────────────────────┘

1. App Launch
   ├─ Check if user logged in (Firebase Auth)
   ├─ If logged in → Check biometric config
   │  ├─ Biometric enabled → Request Face ID/Touch ID
   │  │  ├─ Success → Load app
   │  │  └─ Failure → Show PIN fallback
   │  └─ Biometric disabled → Load app
   └─ If not logged in → Show login screen

2. Login Screen
   ├─ User enters email/password
   ├─ Firebase Auth authentication
   ├─ Check if first login
   │  ├─ First login → Show onboarding
   │  │  ├─ Privacy Policy acceptance
   │  │  ├─ Terms of Service acceptance
   │  │  ├─ Medical Disclaimer acknowledgment
   │  │  └─ Biometric setup (optional)
   │  └─ Returning user → Load app
   └─ Log login to audit log

3. Session Management
   ├─ Track last activity timestamp
   ├─ Auto-logout after 15 minutes inactivity
   ├─ Re-authenticate when returning from background (> 5 min)
   └─ Clear sensitive data on logout

4. Logout
   ├─ Clear encryption keys from SecureStore
   ├─ Clear cached PHI from memory
   ├─ Invalidate Firebase Auth token
   ├─ Log logout to audit log
   └─ Return to login screen
```


### Firebase Security Rules

#### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isValidTimestamp() {
      return request.resource.data.timestamp == request.time;
    }
    
    // User Consents
    match /user_consents/{consentId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && 
                      isOwner(request.resource.data.userId) &&
                      isValidTimestamp();
      allow update: if isAuthenticated() && isOwner(resource.data.userId);
      allow delete: if false; // Never allow deletion
    }
    
    // Consent History
    match /consent_history/{historyId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && 
                      isOwner(request.resource.data.userId) &&
                      isValidTimestamp();
      allow update, delete: if false; // Immutable
    }
    
    // Audit Logs (append-only)
    match /audit_logs/{logId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && 
                      isOwner(request.resource.data.userId) &&
                      isValidTimestamp();
      allow update, delete: if false; // Immutable
    }
    
    // Privacy Policy Acceptances
    match /privacy_acceptances/{acceptanceId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && 
                      isOwner(request.resource.data.userId) &&
                      isValidTimestamp();
      allow update, delete: if false; // Immutable
    }
    
    // Terms of Service Acceptances
    match /terms_acceptances/{acceptanceId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && 
                      isOwner(request.resource.data.userId) &&
                      isValidTimestamp();
      allow update, delete: if false; // Immutable
    }
    
    // Data Export Requests
    match /data_exports/{exportId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && 
                      isOwner(request.resource.data.userId);
      allow update: if isAuthenticated() && 
                      isOwner(resource.data.userId) &&
                      request.resource.data.userId == resource.data.userId;
      allow delete: if false; // Keep for audit trail
    }
    
    // Data Deletion Requests
    match /deletion_requests/{deletionId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && 
                      isOwner(request.resource.data.userId);
      allow update: if isAuthenticated() && 
                      isOwner(resource.data.userId) &&
                      request.resource.data.status in ['pending', 'cancelled'];
      allow delete: if false; // Keep for audit trail
    }
    
    // Biometric Configs
    match /biometric_configs/{userId} {
      allow read, write: if isAuthenticated() && isOwner(userId);
    }
    
    // Notification Preferences
    match /notification_preferences/{userId} {
      allow read, write: if isAuthenticated() && isOwner(userId);
    }
  }
}
```


#### Firebase Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isValidFileSize() {
      return request.resource.size < 50 * 1024 * 1024; // 50MB limit
    }
    
    // Patient Photos (encrypted)
    match /patients/{userId}/{patientId}/photos/{photoId} {
      allow read: if isAuthenticated() && isOwner(userId);
      allow write: if isAuthenticated() && 
                     isOwner(userId) && 
                     isValidFileSize();
      allow delete: if isAuthenticated() && isOwner(userId);
    }
    
    // SOAP Note Attachments (encrypted)
    match /soap_notes/{userId}/{soapId}/attachments/{attachmentId} {
      allow read: if isAuthenticated() && isOwner(userId);
      allow write: if isAuthenticated() && 
                     isOwner(userId) && 
                     isValidFileSize();
      allow delete: if isAuthenticated() && isOwner(userId);
    }
    
    // Data Exports (encrypted, temporary)
    match /exports/{userId}/{exportId} {
      allow read: if isAuthenticated() && isOwner(userId);
      allow write: if false; // Only Cloud Functions can write
      allow delete: if false; // Auto-deleted by TTL
    }
  }
}
```

### Firestore Indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "audit_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "audit_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "action", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "audit_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "resourceType", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "user_consents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```


## State Management

### Global State Architecture

We'll use Zustand for global state management with the following stores:

#### 1. Compliance Store

**Location**: `store/compliance.ts`

```typescript
interface ComplianceState {
  // Legal acceptance status
  privacyPolicyAccepted: boolean;
  termsAccepted: boolean;
  medicalDisclaimerAcknowledged: boolean;
  
  // Consent status
  consents: Record<string, Consent>;
  
  // Onboarding status
  onboardingCompleted: boolean;
  
  // Actions
  setPrivacyPolicyAccepted: (accepted: boolean) => void;
  setTermsAccepted: (accepted: boolean) => void;
  setMedicalDisclaimerAcknowledged: (acknowledged: boolean) => void;
  updateConsent: (consentType: string, consent: Consent) => void;
  loadConsents: (userId: string) => Promise<void>;
  completeOnboarding: () => void;
}
```

#### 2. Auth Store (Enhanced)

**Location**: `store/auth.ts`

```typescript
interface AuthState {
  // Existing auth state
  user: User | null;
  loading: boolean;
  
  // Enhanced security
  biometricEnabled: boolean;
  sessionTimeout: number;
  lastActivityAt: Date | null;
  isLocked: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setupBiometric: () => Promise<void>;
  verifyBiometric: () => Promise<boolean>;
  updateLastActivity: () => void;
  checkSessionTimeout: () => boolean;
  lockSession: () => void;
  unlockSession: () => Promise<void>;
}
```

#### 3. Audit Store

**Location**: `store/audit.ts`

```typescript
interface AuditState {
  // Audit log entries
  entries: AuditLogEntry[];
  loading: boolean;
  
  // Filters
  filters: AuditLogQuery;
  
  // Actions
  loadAuditLog: (userId: string, query?: AuditLogQuery) => Promise<void>;
  logAction: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => Promise<void>;
  exportAuditLog: (userId: string) => Promise<string>;
  setFilters: (filters: Partial<AuditLogQuery>) => void;
}
```


## Navigation and User Flows

### Onboarding Flow (First Launch)

```
App Launch (First Time)
    ↓
Welcome Screen
    ↓
Privacy Policy Screen
    ├─ Scroll to bottom required
    ├─ Checkbox: "I have read and accept"
    └─ Button: "Continue" (disabled until checked)
    ↓
Terms of Service Screen
    ├─ Scroll to bottom required
    ├─ Checkbox: "I have read and accept"
    └─ Button: "Continue" (disabled until checked)
    ↓
Medical Disclaimer Screen
    ├─ Display disclaimer text
    ├─ Checkbox: "I understand and acknowledge"
    └─ Button: "Continue" (disabled until checked)
    ↓
Biometric Setup Screen (Optional)
    ├─ Option 1: Enable Face ID/Touch ID
    ├─ Option 2: Setup PIN only
    └─ Option 3: Skip (can enable later)
    ↓
Main App (Dashboard)
```

### Settings Navigation Structure

```
Settings Screen
├─ Account
│  ├─ Profile
│  ├─ Change Password
│  └─ Two-Factor Authentication
├─ Privacy & Security
│  ├─ Privacy Policy (view)
│  ├─ Terms of Service (view)
│  ├─ Data Transparency
│  ├─ Consent Management
│  ├─ Biometric Authentication
│  └─ Session Timeout
├─ Data Management
│  ├─ Export My Data
│  ├─ Audit Log
│  └─ Delete Account
├─ Notifications
│  ├─ Notification Preferences
│  └─ Quiet Hours
└─ About
   ├─ App Version
   ├─ Medical Disclaimer
   ├─ Support
   └─ Legal Documents
```

### Permission Request Flow

```
User Triggers Feature Requiring Permission
    ↓
Check Permission Status
    ├─ Granted → Proceed with feature
    ├─ Denied → Show "Open Settings" dialog
    └─ Undetermined → Continue below
    ↓
Show Permission Explainer Modal
    ├─ Title: "Why we need [Permission]"
    ├─ Description: Specific use case
    ├─ Visual example
    ├─ Alternative workflow (if available)
    └─ Buttons: "Allow" | "Not Now"
    ↓
User Taps "Allow"
    ↓
Request System Permission
    ├─ Granted → Log consent, proceed with feature
    └─ Denied → Log denial, show alternative workflow
```


### Data Export Flow

```
User Navigates to Settings → Data Management → Export My Data
    ↓
Data Export Screen
    ├─ Select Format: JSON | PDF
    ├─ Select Data Categories (checkboxes)
    │  ├─ ☑ Patient Records
    │  ├─ ☑ SOAP Notes
    │  ├─ ☑ Photos
    │  ├─ ☑ Protocols
    │  ├─ ☑ Exercises
    │  ├─ ☑ Appointments
    │  ├─ ☑ Audit Log
    │  └─ ☑ Consents
    ├─ Set Export Password (required)
    └─ Button: "Request Export"
    ↓
Confirm Export Request
    ├─ Warning: "Large exports may take up to 48 hours"
    ├─ Info: "You'll receive an email when ready"
    └─ Buttons: "Confirm" | "Cancel"
    ↓
Export Request Created
    ├─ Show progress indicator
    ├─ Status: "Processing..."
    └─ Email notification sent when complete
    ↓
Export Ready (within 48 hours)
    ├─ Email with download link
    ├─ In-app notification
    └─ Download available for 7 days
```

### Data Deletion Flow

```
User Navigates to Settings → Data Management → Delete Account
    ↓
Data Deletion Warning Screen
    ├─ ⚠️ Warning: "This action cannot be undone"
    ├─ Info: "30-day grace period before permanent deletion"
    ├─ Recommendation: "Export your data first"
    └─ Button: "Continue"
    ↓
Confirm Password Screen
    ├─ Input: Password
    ├─ Optional: Reason for deletion
    └─ Button: "Request Deletion"
    ↓
Deletion Request Created
    ├─ Status: "Scheduled for [date + 30 days]"
    ├─ Email confirmation sent
    ├─ Option to cancel anytime within 30 days
    └─ Button: "Cancel Deletion Request"
    ↓
After 30 Days (Automated)
    ├─ Execute deletion
    ├─ Remove all user data
    ├─ Anonymize audit log
    ├─ Delete Firebase Auth account
    └─ Send final confirmation email
```


## Firebase Configuration

### Collections Structure

```
Firestore Collections:
├─ user_consents/
│  └─ {consentId}
│     ├─ userId: string
│     ├─ type: 'required' | 'optional'
│     ├─ category: string
│     ├─ name: string
│     ├─ version: string
│     ├─ status: 'granted' | 'withdrawn'
│     ├─ grantedAt: timestamp
│     └─ withdrawnAt?: timestamp
│
├─ consent_history/
│  └─ {historyId}
│     ├─ consentId: string
│     ├─ userId: string
│     ├─ action: 'granted' | 'withdrawn'
│     ├─ timestamp: timestamp
│     └─ version: string
│
├─ audit_logs/
│  └─ {logId}
│     ├─ userId: string
│     ├─ timestamp: timestamp (server)
│     ├─ action: string
│     ├─ resourceType: string
│     ├─ resourceId?: string
│     ├─ deviceInfo: object
│     └─ ipAddress?: string
│
├─ privacy_acceptances/
│  └─ {acceptanceId}
│     ├─ userId: string
│     ├─ version: string
│     ├─ acceptedAt: timestamp
│     └─ deviceInfo: object
│
├─ terms_acceptances/
│  └─ {acceptanceId}
│     ├─ userId: string
│     ├─ version: string
│     ├─ acceptedAt: timestamp
│     └─ deviceInfo: object
│
├─ medical_disclaimers/
│  └─ {acknowledgmentId}
│     ├─ userId: string
│     ├─ context: string
│     ├─ acknowledgedAt: timestamp
│     └─ version: string
│
├─ data_exports/
│  └─ {exportId}
│     ├─ userId: string
│     ├─ format: 'json' | 'pdf'
│     ├─ status: string
│     ├─ requestedAt: timestamp
│     ├─ completedAt?: timestamp
│     ├─ expiresAt?: timestamp
│     └─ downloadUrl?: string
│
├─ deletion_requests/
│  └─ {deletionId}
│     ├─ userId: string
│     ├─ requestedAt: timestamp
│     ├─ scheduledFor: timestamp
│     ├─ status: string
│     └─ confirmationToken: string
│
├─ biometric_configs/
│  └─ {userId}
│     ├─ enabled: boolean
│     ├─ type: string
│     ├─ requireOnLaunch: boolean
│     └─ failedAttempts: number
│
└─ notification_preferences/
   └─ {userId}
      ├─ appointments: object
      ├─ patients: object
      ├─ system: object
      └─ marketing: object
```

### Firebase Storage Structure

```
Firebase Storage:
├─ patients/
│  └─ {userId}/
│     └─ {patientId}/
│        └─ photos/
│           └─ {photoId}.encrypted
│
├─ soap_notes/
│  └─ {userId}/
│     └─ {soapId}/
│        └─ attachments/
│           └─ {attachmentId}.encrypted
│
└─ exports/
   └─ {userId}/
      └─ {exportId}.encrypted
         (Auto-deleted after 7 days via TTL)
```


### App Configuration Updates

#### app.json Updates

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "O FisioFlow precisa acessar sua câmera para capturar fotos de progresso dos pacientes e demonstrações de exercícios. Essas fotos são criptografadas e armazenadas com segurança.",
        "NSPhotoLibraryUsageDescription": "O FisioFlow precisa acessar sua galeria de fotos para selecionar imagens existentes de pacientes e exercícios. Suas fotos são protegidas com criptografia.",
        "NSLocationWhenInUseUsageDescription": "O FisioFlow usa sua localização para verificar check-in na clínica e confirmar presença em consultas. Sua localização nunca é compartilhada com terceiros.",
        "NSFaceIDUsageDescription": "O FisioFlow usa Face ID para proteger o acesso aos dados sensíveis de saúde dos seus pacientes com autenticação biométrica segura."
      },
      "config": {
        "usesNonExemptEncryption": false
      }
    }
  }
}
```

**Note**: Remove `NSMicrophoneUsageDescription` if video recording is not implemented.

#### eas.json Updates

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "developer@fisioflow.com.br",
        "ascAppId": "6504123456",
        "appleTeamId": "ABC123XYZ"
      }
    }
  }
}
```

**Note**: Replace placeholders with actual Apple Developer credentials.


## Error Handling Strategy

### Error Categories

1. **Network Errors**
   - Offline mode with queued operations
   - Retry with exponential backoff
   - Clear user feedback

2. **Authentication Errors**
   - Session expired → Re-authenticate
   - Invalid credentials → Clear error message
   - Biometric failure → PIN fallback

3. **Permission Errors**
   - Permission denied → Alternative workflow
   - Permission revoked → Explain and guide to settings

4. **Data Errors**
   - Validation errors → Inline field errors
   - Encryption errors → Log and alert support
   - Storage errors → Retry or cache locally

5. **Firebase Errors**
   - Firestore permission denied → Check auth state
   - Storage quota exceeded → Alert user
   - Function timeout → Retry or queue

### Error Messages (Portuguese)

```typescript
export const ERROR_MESSAGES = {
  // Network
  OFFLINE: 'Você está offline. As alterações serão sincronizadas quando reconectar.',
  NETWORK_ERROR: 'Erro de conexão. Tentando novamente...',
  
  // Authentication
  INVALID_CREDENTIALS: 'Email ou senha incorretos.',
  SESSION_EXPIRED: 'Sua sessão expirou. Por favor, faça login novamente.',
  BIOMETRIC_FAILED: 'Autenticação biométrica falhou. Use seu PIN.',
  ACCOUNT_LOCKED: 'Conta bloqueada por 15 minutos após múltiplas tentativas.',
  
  // Permissions
  CAMERA_DENIED: 'Acesso à câmera negado. Você pode habilitar nas Configurações.',
  PHOTOS_DENIED: 'Acesso às fotos negado. Você pode habilitar nas Configurações.',
  LOCATION_DENIED: 'Acesso à localização negado. Check-in manual disponível.',
  NOTIFICATIONS_DENIED: 'Notificações desabilitadas. Você receberá alertas no app.',
  
  // Data
  ENCRYPTION_ERROR: 'Erro ao proteger dados. Contate o suporte.',
  EXPORT_FAILED: 'Falha ao exportar dados. Tente novamente.',
  DELETION_FAILED: 'Falha ao processar solicitação de exclusão.',
  
  // Firebase
  PERMISSION_DENIED: 'Você não tem permissão para acessar estes dados.',
  QUOTA_EXCEEDED: 'Limite de armazenamento atingido. Contate o suporte.',
  FUNCTION_TIMEOUT: 'Operação demorou muito. Tente novamente.',
};
```


## Testing Strategy

### Testing Approach

We will implement a dual testing strategy combining unit tests and property-based tests:

**Unit Tests**: Verify specific examples, edge cases, UI rendering, and integration points
**Property Tests**: Verify universal properties across all inputs using randomized testing

### Testing Tools

- **Unit Testing**: Jest + React Native Testing Library
- **Property-Based Testing**: fast-check (JavaScript property testing library)
- **E2E Testing**: Detox for critical user flows
- **Accessibility Testing**: @testing-library/react-native with accessibility queries

### Test Configuration

All property-based tests will run with minimum 100 iterations to ensure comprehensive coverage through randomization.

Each property test must include a comment tag referencing the design document property:
```typescript
// Feature: app-store-compliance, Property 1: First-time users must accept legal documents
```

### Test Coverage Goals

- Unit test coverage: > 80% for compliance-critical code
- Property test coverage: All testable acceptance criteria
- E2E test coverage: Critical user flows (onboarding, data export, deletion)
- Accessibility test coverage: All interactive screens


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all 315 acceptance criteria, I identified the following redundancies:
- Properties 2.1 and 13.1 both test PHI encryption at rest → Combined into Property 1
- Properties 2.13 and 13.9 both test cache clearing on logout → Combined into Property 2
- Properties 5.13 and 11.1 both test audit logging for authentication → Combined into Property 6

The following properties provide unique validation value and will be implemented:

### Property 1: PHI Encryption at Rest

*For any* PHI data (SOAP notes, patient photos, medical records), when stored in Firestore or Firebase Storage, the data must be encrypted using AES-256-GCM before storage.

**Validates: Requirements 2.1, 2.4, 13.1**

**Test Strategy**: Generate random PHI data, store it, retrieve the raw Firestore document, and verify it contains encrypted ciphertext (not plaintext).

### Property 2: Cache Clearing on Logout

*For any* user session, when the user logs out, all cached PHI data must be cleared from device memory, SecureStore, and AsyncStorage.

**Validates: Requirements 2.13, 13.9**

**Test Strategy**: Store random PHI in cache, perform logout, then verify all storage locations are empty of PHI.

### Property 3: SOAP Note Encryption Round Trip

*For any* SOAP note content, encrypting then decrypting the content must produce the original text without data loss or corruption.

**Validates: Requirements 2.5**

**Test Strategy**: Generate random SOAP note text (including special characters, Unicode), encrypt with E2EE, decrypt, and verify equality.


### Property 4: Legal Acceptance Required for First Use

*For any* new user account, the user cannot access the main app functionality until they have explicitly accepted both Privacy Policy and Terms of Service.

**Validates: Requirements 1.5, 9.9**

**Test Strategy**: Create random new user accounts, attempt to navigate to main app screens, verify navigation is blocked until legal documents are accepted.

### Property 5: Legal Acceptance Timestamp Storage

*For any* Privacy Policy or Terms of Service acceptance, a timestamp must be stored in Firestore with the user ID and document version.

**Validates: Requirements 1.12**

**Test Strategy**: Generate random acceptance events, verify Firestore contains timestamp, userId, and version for each acceptance.

### Property 6: Policy Version Change Requires Re-acceptance

*For any* user with existing policy acceptance, when the policy version changes, the user must re-accept before continuing to use the app.

**Validates: Requirements 1.13**

**Test Strategy**: Create user with policy v1 acceptance, update policy to v2, verify user is prompted to re-accept before app access.

### Property 7: Authentication Audit Logging

*For any* authentication event (login, logout, biometric auth), an immutable audit log entry must be created in Firestore with timestamp, userId, action, and device info.

**Validates: Requirements 5.13, 11.1, 11.3**

**Test Strategy**: Generate random authentication events, verify each creates an audit log entry with required fields.

### Property 8: PHI Modification Audit Logging

*For any* PHI modification (create, update, delete of patient data, SOAP notes, photos), an immutable audit log entry must be created with action type, resource type, and resource ID.

**Validates: Requirements 11.4, 11.5**

**Test Strategy**: Generate random PHI modifications, verify each creates audit log entry with correct action, resourceType, and resourceId.

### Property 9: Audit Log Immutability

*For any* audit log entry, once created, it cannot be modified or deleted through the app's normal operations.

**Validates: Requirements 11.16**

**Test Strategy**: Create random audit log entries, attempt to update or delete them, verify operations fail with permission denied.


### Property 10: Permission Alternative Workflows

*For any* denied device permission (camera, photos, location), the app must provide an alternative workflow that allows the user to accomplish their goal without that permission.

**Validates: Requirements 3.10**

**Test Strategy**: For each permission type, deny the permission, verify alternative workflow is available and functional.

### Property 11: Biometric Authentication for PHI Access

*For any* PHI access attempt when biometric authentication is enabled, the user must successfully authenticate with Face ID/Touch ID or PIN before viewing the data.

**Validates: Requirements 5.1**

**Test Strategy**: Enable biometric auth, attempt to access random PHI resources, verify authentication is required before data is displayed.

### Property 12: Data Export Completeness

*For any* data export request with all categories selected, the exported JSON must contain all user data including patients, SOAP notes, photos, protocols, exercises, appointments, audit log, and consents.

**Validates: Requirements 6.6, 6.8, 6.9**

**Test Strategy**: Create user with random data in all categories, request full export, parse JSON, verify all data categories are present and complete.

### Property 13: Data Deletion Grace Period

*For any* data deletion request, the deletion must be scheduled exactly 30 days in the future, and the user must be able to cancel the request at any time before that date.

**Validates: Requirements 6.13**

**Test Strategy**: Create random deletion requests, verify scheduledFor date is exactly 30 days after requestedAt, verify cancellation works before scheduled date.

### Property 14: Notification Permission Not on Launch

*For any* first app launch, the push notification permission request must not be triggered automatically—it should only be requested when the user accesses notification-related features.

**Validates: Requirements 7.2**

**Test Strategy**: Simulate first app launch, verify notification permission is not requested, navigate through app, verify permission is only requested when accessing notification settings.


### Property 15: Notification Preference Immediate Effect

*For any* notification category that is disabled by the user, notifications of that category must stop being sent immediately without requiring app restart.

**Validates: Requirements 7.15**

**Test Strategy**: Enable all notification categories, disable a random category, verify no notifications of that type are sent, verify other categories still work.

### Property 16: Consent Withdrawal Stops Data Collection

*For any* optional consent that is withdrawn, the related data collection activity must stop immediately.

**Validates: Requirements 12.10**

**Test Strategy**: Grant optional consent (e.g., analytics), verify data collection occurs, withdraw consent, verify data collection stops.

### Property 17: Consent Version Tracking

*For any* consent record stored in Firestore, it must include a version field that tracks which version of the policy/permission the user consented to.

**Validates: Requirements 12.11**

**Test Strategy**: Create random consent records, verify each has a version field, update policy version, verify new consents have new version.

### Property 18: Portuguese Localization

*For any* user-facing text in the app (buttons, labels, errors, messages), the text must be in Portuguese (Brazil).

**Validates: Requirements 14.1, 14.2, 15.1**

**Test Strategy**: Traverse all screens and components, extract all text strings, verify none are in English (except proper nouns, technical terms).

### Property 19: Accessibility Labels

*For any* interactive element (button, input, touchable), it must have an accessibility label for VoiceOver screen readers.

**Validates: Requirements 14.4, 14.5**

**Test Strategy**: Query all interactive elements, verify each has accessibilityLabel or accessibilityHint prop.

### Property 20: Offline Queue Synchronization

*For any* data modification made while offline, the change must be queued locally and synchronized to Firebase when connection is restored.

**Validates: Requirements 15.5, 15.6**

**Test Strategy**: Simulate offline mode, make random data changes, verify changes are queued, restore connection, verify changes sync to Firebase.


## Implementation Phases

### Phase 1: Legal Foundation (Week 1)

**Goal**: Implement privacy policy, terms of service, medical disclaimers, and permission justifications.

**Tasks**:
1. Create Privacy Policy and Terms of Service content (Portuguese)
2. Implement PrivacyPolicyScreen component with scroll tracking
3. Implement TermsOfServiceScreen component with acceptance checkbox
4. Implement MedicalDisclaimerModal component
5. Create onboarding flow for first-time users
6. Update app.json with specific NSUsageDescription strings
7. Store legal acceptances in Firestore
8. Implement version tracking for policy updates
9. Unit tests for legal components
10. Property tests for acceptance requirements

**Deliverables**:
- Privacy Policy and Terms of Service screens
- Medical disclaimer modal
- Onboarding flow
- Updated app.json with Portuguese permission descriptions
- Firestore collections for legal acceptances
- Test suite for legal components

### Phase 2: Security & Data Protection (Week 2-3)

**Goal**: Implement PHI encryption, enhanced authentication, and HealthKit cleanup.

**Tasks**:
1. Implement EncryptionService with AES-256-GCM
2. Integrate expo-crypto for encryption operations
3. Implement key management with expo-secure-store
4. Add encryption layer to all PHI storage operations
5. Implement E2EE for SOAP notes
6. Implement BiometricAuthService with Face ID/Touch ID
7. Implement PIN fallback authentication
8. Add session timeout (15 minutes inactivity)
9. Add re-authentication on app foreground (5 minutes)
10. Audit codebase for HealthKit references and remove if unused
11. Implement cache clearing on logout
12. Unit tests for encryption and authentication
13. Property tests for encryption round-trip
14. Security audit of implementation

**Deliverables**:
- EncryptionService with AES-256-GCM
- BiometricAuthService with PIN fallback
- Session management with timeouts
- Encrypted PHI storage
- E2EE for SOAP notes
- HealthKit cleanup (if applicable)
- Security test suite


### Phase 3: User Control & Transparency (Week 3-4)

**Goal**: Implement data transparency, consent management, notification preferences, data export, and data deletion.

**Tasks**:
1. Implement DataTransparencyScreen showing all collected data
2. Implement ConsentManager service
3. Implement ConsentManagerScreen for reviewing consents
4. Implement consent history tracking
5. Implement PermissionExplainerModal for each permission type
6. Implement PermissionManager service
7. Implement NotificationPreferencesScreen with granular controls
8. Implement quiet hours functionality
9. Implement DataExportService with JSON and PDF generation
10. Implement DataExportScreen with format selection
11. Implement async export with email notification
12. Implement DataDeletionService with 30-day grace period
13. Implement DataDeletionScreen with warnings
14. Implement deletion cancellation functionality
15. Create Firebase Cloud Functions for async export and scheduled deletion
16. Unit tests for all services and screens
17. Property tests for consent management and data operations
18. Integration tests for export and deletion flows

**Deliverables**:
- Data Transparency Screen
- Consent Management System
- Permission Manager with explainers
- Notification Preferences with quiet hours
- Data Export (JSON + PDF)
- Data Deletion with grace period
- Firebase Cloud Functions
- Comprehensive test suite

### Phase 4: App Store Preparation (Week 4-5)

**Goal**: Implement audit logging, update App Store metadata, and prepare review materials.

**Tasks**:
1. Implement AuditLogger service
2. Add audit logging to all PHI access points
3. Add audit logging to all authentication events
4. Implement AuditLogScreen for users
5. Configure Firestore security rules for audit logs (append-only)
6. Set up Firestore indexes for audit log queries
7. Implement audit log export functionality
8. Update eas.json with valid Apple credentials
9. Create App Store Connect listing
10. Write app description (Portuguese)
11. Create screenshots (iPhone 6.5", 5.5")
12. Create app icon (1024x1024)
13. Prepare test account with sample data
14. Write App Store review notes
15. Document PHI handling for reviewers
16. Create demo video (optional)
17. Publish Privacy Policy and Terms of Service URLs
18. Unit tests for audit logging
19. Property tests for audit log immutability
20. Final security and privacy review

**Deliverables**:
- Audit Logging System
- Audit Log Screen
- Firestore security rules and indexes
- Complete App Store Connect listing
- Screenshots and app icon
- Test account with sample data
- App Store review notes
- Published legal documents
- Audit test suite


### Phase 5: Quality & Polish (Week 5-6)

**Goal**: Implement accessibility, error handling, performance optimizations, and documentation.

**Tasks**:
1. Add accessibility labels to all interactive elements
2. Implement VoiceOver support
3. Test with iOS VoiceOver
4. Implement Dynamic Type support
5. Verify color contrast (WCAG AA)
6. Implement comprehensive error handling
7. Create Portuguese error messages
8. Implement offline mode with sync queue
9. Add loading states and progress indicators
10. Optimize app launch time
11. Implement image lazy loading and caching
12. Optimize bundle size
13. Create in-app help documentation
14. Create onboarding tutorial
15. Create FAQ section
16. Write user guide for data export/deletion
17. Write security best practices guide
18. Accessibility tests with automated tools
19. Performance tests for key flows
20. Final QA and bug fixes

**Deliverables**:
- Full accessibility support
- Comprehensive error handling
- Offline mode with sync
- Performance optimizations
- In-app documentation
- Help and FAQ sections
- User guides
- Accessibility test suite
- Performance test suite
- Final QA report

## Success Metrics

### Compliance Metrics
- ✅ All 315 acceptance criteria met
- ✅ Privacy Policy and Terms of Service published
- ✅ All NSUsageDescription strings updated
- ✅ HealthKit references removed (if unused)
- ✅ Audit logging for all PHI access
- ✅ Data export and deletion functional
- ✅ Biometric authentication implemented

### Quality Metrics
- ✅ Test coverage > 80% for compliance code
- ✅ All property tests passing (100 iterations each)
- ✅ Zero critical security vulnerabilities
- ✅ Zero critical accessibility issues
- ✅ App launch time < 3 seconds
- ✅ Crash-free rate > 99.5%

### App Store Metrics
- ✅ App Store Connect listing complete
- ✅ Valid Apple credentials in eas.json
- ✅ Test account prepared with sample data
- ✅ Review notes complete with testing instructions
- ✅ Screenshots and app icon ready
- ✅ Privacy Policy URL accessible
- ✅ App approved on first submission


## Risk Assessment and Mitigation

### High-Risk Areas

#### 1. PHI Encryption Implementation
**Risk**: Incorrect encryption implementation could expose patient data
**Mitigation**:
- Use well-tested libraries (expo-crypto)
- Implement comprehensive property tests for encryption round-trip
- Conduct security audit before deployment
- Use authenticated encryption (GCM mode) to prevent tampering
- Never log encryption keys or plaintext PHI

#### 2. Audit Log Integrity
**Risk**: Audit logs could be modified or deleted, compromising compliance
**Mitigation**:
- Implement append-only Firestore security rules
- Use server timestamps (not client timestamps)
- Test immutability with property tests
- Regular backups of audit logs
- Monitor for unauthorized access attempts

#### 3. Data Deletion Compliance
**Risk**: Data not fully deleted could violate LGPD
**Mitigation**:
- Implement comprehensive deletion across all Firebase services
- Test deletion completeness
- Implement 30-day grace period as required
- Anonymize audit logs (don't delete for compliance)
- Send confirmation emails at each step

#### 4. Session Management
**Risk**: Improper session handling could allow unauthorized PHI access
**Mitigation**:
- Implement automatic timeout (15 minutes)
- Clear sensitive data on background (5 minutes)
- Require re-authentication after timeout
- Clear all caches on logout
- Test session timeout with property tests

#### 5. App Store Rejection
**Risk**: App could be rejected for compliance issues
**Mitigation**:
- Follow all Apple guidelines precisely
- Provide detailed review notes
- Create comprehensive test account
- Document all PHI handling
- Prepare responses to common rejection reasons
- Conduct internal review before submission

### Medium-Risk Areas

#### 6. Permission Handling
**Risk**: Incorrect permission requests could cause rejection
**Mitigation**:
- Request permissions just-in-time
- Provide clear explanations before requesting
- Implement alternative workflows for denied permissions
- Never request on app launch
- Test permission flows thoroughly

#### 7. Offline Sync
**Risk**: Data loss or corruption during offline sync
**Mitigation**:
- Implement robust queue mechanism
- Use optimistic UI updates
- Handle conflicts gracefully
- Test offline scenarios extensively
- Provide clear sync status to users

#### 8. Localization
**Risk**: English text could slip through, violating Portuguese requirement
**Mitigation**:
- Centralize all strings in constants
- Use i18n library for consistency
- Automated tests to detect English strings
- Manual review by Portuguese speaker
- Test all screens and error messages


## Dependencies and Prerequisites

### Technical Dependencies

**Required Expo Modules**:
- `expo-crypto`: For AES-256-GCM encryption
- `expo-secure-store`: For secure key storage (iOS Keychain)
- `expo-local-authentication`: For Face ID/Touch ID
- `expo-notifications`: For push notifications
- `expo-image-picker`: For camera and photo library access
- `expo-location`: For location-based features
- `expo-device`: For device information

**Required npm Packages**:
- `firebase`: Firebase SDK (already installed)
- `fast-check`: Property-based testing library
- `@testing-library/react-native`: Testing utilities
- `jest`: Test runner (already configured)
- `react-native-pdf`: For PDF generation (data export)

**Firebase Services**:
- Firebase Authentication
- Cloud Firestore
- Cloud Storage
- Cloud Functions (for async export and scheduled deletion)
- Firebase Crashlytics (without PHI)

### External Dependencies

**Apple Developer Account**:
- Valid Apple Developer Program membership ($99/year)
- App Store Connect access
- Apple Team ID
- App-specific password for EAS Submit

**Legal Documents**:
- Privacy Policy (Portuguese) - needs legal review
- Terms of Service (Portuguese) - needs legal review
- Medical Disclaimer (Portuguese) - needs legal review
- Data Processing Agreement with Firebase

**Infrastructure**:
- Firebase project with Blaze plan (for Cloud Functions)
- Domain for hosting Privacy Policy and Terms of Service
- Email service for notifications (Firebase can use SendGrid)
- SSL certificate for legal document hosting

### Team Prerequisites

**Required Skills**:
- React Native/Expo development
- Firebase (Firestore, Auth, Storage, Functions)
- iOS development and App Store submission
- Security best practices (encryption, authentication)
- LGPD compliance knowledge
- Portuguese language (for content review)

**Required Access**:
- Firebase Console admin access
- Apple Developer Portal access
- App Store Connect access
- GitHub repository access
- Domain/hosting for legal documents


## Appendix A: File Structure

### New Files to Create

```
professional-app/
├── app/
│   ├── (legal)/
│   │   ├── privacy-policy.tsx
│   │   ├── terms-of-service.tsx
│   │   └── onboarding.tsx
│   ├── (settings)/
│   │   ├── data-transparency.tsx
│   │   ├── data-export.tsx
│   │   ├── data-deletion.tsx
│   │   ├── consent-management.tsx
│   │   ├── notification-preferences.tsx
│   │   └── audit-log.tsx
│   └── (auth)/
│       ├── biometric-setup.tsx
│       ├── pin-setup.tsx
│       └── two-factor-setup.tsx
├── components/
│   ├── legal/
│   │   ├── MedicalDisclaimerModal.tsx
│   │   └── LegalDocumentViewer.tsx
│   ├── permissions/
│   │   └── PermissionExplainerModal.tsx
│   └── compliance/
│       ├── ConsentCard.tsx
│       ├── AuditLogEntry.tsx
│       └── DataCategoryCard.tsx
├── lib/
│   └── services/
│       ├── consentManager.ts
│       ├── auditLogger.ts
│       ├── encryptionService.ts
│       ├── dataExportService.ts
│       ├── dataDeletionService.ts
│       ├── permissionManager.ts
│       └── biometricAuthService.ts
├── store/
│   ├── compliance.ts
│   └── audit.ts (new)
├── types/
│   ├── legal.ts
│   ├── consent.ts
│   ├── audit.ts
│   ├── dataExport.ts
│   ├── dataDeletion.ts
│   ├── auth.ts (enhanced)
│   ├── encryption.ts
│   └── notifications.ts
├── constants/
│   ├── consentTypes.ts
│   ├── errorMessages.ts
│   └── legalVersions.ts
└── __tests__/
    ├── services/
    │   ├── consentManager.test.ts
    │   ├── auditLogger.test.ts
    │   ├── encryptionService.test.ts
    │   ├── dataExportService.test.ts
    │   └── dataDeletionService.test.ts
    ├── properties/
    │   ├── encryption.property.test.ts
    │   ├── audit.property.test.ts
    │   ├── consent.property.test.ts
    │   └── legal.property.test.ts
    └── integration/
        ├── onboarding.test.ts
        ├── dataExport.test.ts
        └── dataDeletion.test.ts
```

### Files to Modify

```
professional-app/
├── app.json (update NSUsageDescription strings)
├── eas.json (update Apple credentials)
├── firestore.rules (add compliance collections)
├── firestore.indexes.json (add audit log indexes)
├── store/auth.ts (enhance with biometric and session management)
├── lib/firebase.ts (add encryption layer)
└── app/_layout.tsx (add onboarding check)
```


## Appendix B: Configuration Examples

### Privacy Policy Content Structure (Portuguese)

```markdown
# Política de Privacidade - FisioFlow Professional

**Última atualização**: [Data]
**Versão**: 1.0.0

## 1. Introdução
O FisioFlow Professional é uma ferramenta de gerenciamento clínico...

## 2. Dados Coletados
### 2.1 Dados Pessoais
- Nome completo
- Email
- Telefone
- CPF (opcional)

### 2.2 Dados de Saúde (PHI)
- Registros SOAP
- Fotos de pacientes
- Histórico médico
- Prescrições de exercícios

### 2.3 Dados Técnicos
- Informações do dispositivo
- Logs de acesso
- Dados de uso do aplicativo

## 3. Como Usamos Seus Dados
[Detailed explanation of data usage]

## 4. Compartilhamento de Dados
### 4.1 Firebase (Google Cloud)
- Armazenamento de dados
- Autenticação
- Backup

### 4.2 Expo
- Notificações push
- Atualizações do aplicativo

## 5. Segurança dos Dados
- Criptografia AES-256
- Autenticação biométrica
- Logs de auditoria

## 6. Seus Direitos (LGPD)
- Acesso aos seus dados
- Correção de dados
- Exclusão de dados
- Portabilidade de dados

## 7. Retenção de Dados
[Retention periods for each data category]

## 8. Contato
Email: privacidade@fisioflow.com.br
Telefone: [Phone]
```

### Medical Disclaimer Content (Portuguese)

```markdown
# Aviso Médico Importante

O FisioFlow Professional é uma ferramenta de gerenciamento clínico 
e NÃO substitui consulta, diagnóstico ou tratamento médico profissional.

## Responsabilidades do Profissional

1. Você é responsável por todas as decisões clínicas
2. Você deve verificar a adequação de exercícios para cada paciente
3. Você deve monitorar o progresso e ajustar tratamentos
4. O aplicativo não fornece diagnósticos ou recomendações médicas

## Limitações do Aplicativo

- Não é um dispositivo médico
- Não realiza diagnósticos
- Não substitui avaliação profissional
- Prescrições são criadas por você, não pelo aplicativo

Ao usar este aplicativo, você reconhece e aceita estas limitações.
```


## Appendix C: App Store Review Notes Template

```
App Store Review Notes - FisioFlow Professional

## App Overview
FisioFlow Professional is a clinical management tool for physiotherapists 
in Brazil. The app handles Protected Health Information (PHI) including 
patient records, SOAP notes, photos, and exercise prescriptions.

## Test Account
Email: reviewer@fisioflow.com.br
Password: ReviewTest2024!

The test account includes:
- 5 sample patients with complete records
- 10 SOAP notes with photos
- 15 exercise protocols
- Sample appointments and schedules

## PHI Handling
All patient health information is:
- Encrypted at rest using AES-256-GCM
- Encrypted in transit using TLS 1.3
- Protected by biometric authentication (Face ID/Touch ID)
- Logged in immutable audit logs
- Compliant with Brazilian LGPD regulations

## Permissions Explained

### Camera (NSCameraUsageDescription)
Used for capturing patient progress photos and exercise demonstration 
photos. Photos are encrypted before storage.

### Photo Library (NSPhotoLibraryUsageDescription)
Used for selecting existing photos of patients and exercises. All 
selected photos are encrypted.

### Location (NSLocationWhenInUseUsageDescription)
Used for clinic check-in verification and appointment confirmation. 
Location is never shared with third parties.

### Face ID (NSFaceIDUsageDescription)
Used to protect access to sensitive patient health data with biometric 
authentication.

## Business Model
This is a B2B application. Physiotherapists subscribe through our 
website (external billing). No in-app purchases. The app does not 
collect payment information.

## Privacy & Legal
- Privacy Policy: https://fisioflow.com.br/privacidade
- Terms of Service: https://fisioflow.com.br/termos
- Both accessible from login screen and settings
- Users must accept before first use

## Data Transparency
Users can:
- View all collected data (Settings → Data Transparency)
- Export all data in JSON or PDF (Settings → Export Data)
- Delete account with 30-day grace period (Settings → Delete Account)
- View audit log of all data access (Settings → Audit Log)

## Compliance
- LGPD compliant (Brazilian data protection law)
- HIPAA-aligned security controls
- Medical disclaimers on relevant screens
- Audit logging for all PHI access

## Testing Instructions
1. Login with test account
2. Navigate to "Pacientes" to view patient list
3. Select a patient to view SOAP notes and photos
4. Try biometric authentication (will use device biometrics)
5. Check Settings → Privacy & Security for compliance features
6. Review Settings → Data Transparency to see data collection

## Contact for Questions
Developer: dev@fisioflow.com.br
Phone: +55 11 XXXX-XXXX
Available 9am-6pm BRT (UTC-3)
```


## Appendix D: Firebase Cloud Functions

### Data Export Function

```typescript
// functions/src/dataExport.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generatePDF } from './utils/pdfGenerator';
import { encryptFile } from './utils/encryption';

export const generateDataExport = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, format, options, password } = data;
  
  // Verify user is requesting their own data
  if (context.auth.uid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Cannot export other user data');
  }

  try {
    // Collect all user data
    const userData = await collectUserData(userId, options);
    
    // Generate export file
    let exportFile: Buffer;
    if (format === 'json') {
      exportFile = Buffer.from(JSON.stringify(userData, null, 2));
    } else {
      exportFile = await generatePDF(userData);
    }
    
    // Encrypt with user password
    const encryptedFile = await encryptFile(exportFile, password);
    
    // Upload to Storage with 7-day expiration
    const bucket = admin.storage().bucket();
    const fileName = `exports/${userId}/${Date.now()}.${format}.encrypted`;
    const file = bucket.file(fileName);
    
    await file.save(encryptedFile, {
      metadata: {
        contentType: 'application/octet-stream',
        metadata: {
          expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        }
      }
    });
    
    // Generate signed URL (valid for 7 days)
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + (7 * 24 * 60 * 60 * 1000)
    });
    
    // Update export request status
    await admin.firestore()
      .collection('data_exports')
      .doc(data.exportId)
      .update({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        downloadUrl: url,
        fileSize: encryptedFile.length
      });
    
    // Send email notification
    await sendExportReadyEmail(userId, url);
    
    return { success: true, downloadUrl: url };
    
  } catch (error) {
    console.error('Export generation failed:', error);
    
    await admin.firestore()
      .collection('data_exports')
      .doc(data.exportId)
      .update({
        status: 'failed',
        error: error.message
      });
    
    throw new functions.https.HttpsError('internal', 'Export generation failed');
  }
});
```

### Scheduled Deletion Function

```typescript
// functions/src/scheduledDeletion.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const processScheduledDeletions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    
    // Find deletion requests scheduled for today or earlier
    const snapshot = await admin.firestore()
      .collection('deletion_requests')
      .where('status', '==', 'pending')
      .where('scheduledFor', '<=', now)
      .get();
    
    for (const doc of snapshot.docs) {
      const request = doc.data();
      
      try {
        await executeUserDeletion(request.userId);
        
        await doc.ref.update({
          status: 'completed',
          completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        await sendDeletionCompletedEmail(request.userId);
        
      } catch (error) {
        console.error(`Deletion failed for user ${request.userId}:`, error);
      }
    }
  });

async function executeUserDeletion(userId: string) {
  const db = admin.firestore();
  const storage = admin.storage().bucket();
  
  // Delete user data from Firestore
  await deleteCollection(db, `patients/${userId}`);
  await deleteCollection(db, `soap_notes/${userId}`);
  await deleteCollection(db, `protocols/${userId}`);
  await deleteCollection(db, `appointments/${userId}`);
  
  // Delete files from Storage
  await storage.deleteFiles({ prefix: `patients/${userId}/` });
  await storage.deleteFiles({ prefix: `soap_notes/${userId}/` });
  
  // Anonymize audit log (keep for compliance)
  await anonymizeAuditLog(userId);
  
  // Delete user from Firebase Auth
  await admin.auth().deleteUser(userId);
}
```


## Conclusion

This design document provides a comprehensive technical specification for implementing Apple App Store compliance in the FisioFlow Professional mobile app. The implementation addresses all 20 requirements with 315 acceptance criteria across legal, security, privacy, and quality dimensions.

### Key Design Decisions

1. **Encryption-First Approach**: All PHI is encrypted at rest using AES-256-GCM before storage, with keys managed through iOS Keychain via expo-secure-store.

2. **Immutable Audit Logging**: Append-only Firestore collection with server timestamps ensures compliance with healthcare regulations and provides tamper-proof audit trails.

3. **User-Centric Privacy**: Data transparency, export, and deletion features give users full control over their data, exceeding LGPD requirements.

4. **Biometric Security**: Face ID/Touch ID with PIN fallback provides strong authentication while maintaining usability.

5. **Offline-First with Sync**: Queue-based synchronization ensures data isn't lost during network interruptions while maintaining security.

6. **Property-Based Testing**: Using fast-check for 100+ iteration tests ensures correctness across all input variations, not just specific examples.

### Implementation Timeline

- **Week 1**: Legal foundation (privacy policy, terms, disclaimers, permissions)
- **Week 2-3**: Security & data protection (encryption, biometric auth, HealthKit cleanup)
- **Week 3-4**: User control & transparency (consent, export, deletion, notifications)
- **Week 4-5**: App Store preparation (audit logging, metadata, review materials)
- **Week 5-6**: Quality & polish (accessibility, error handling, performance, docs)

### Next Steps

1. **Legal Review**: Have Privacy Policy and Terms of Service reviewed by legal counsel
2. **Apple Developer Setup**: Obtain valid Apple Developer credentials for eas.json
3. **Firebase Configuration**: Set up Cloud Functions for async export and scheduled deletion
4. **Team Alignment**: Ensure all team members understand compliance requirements
5. **Begin Phase 1**: Start with legal foundation implementation

### Success Criteria

The implementation will be considered successful when:
- All 315 acceptance criteria are met and verified
- All 20 correctness properties pass with 100 iterations
- App passes internal security and privacy audits
- Test account is prepared with comprehensive sample data
- App Store Connect listing is complete with valid credentials
- Privacy Policy and Terms of Service are published and accessible
- App is submitted to App Store and approved on first attempt

---

**Document Version**: 1.0  
**Last Updated**: 2025-02-08  
**Status**: Ready for Implementation  
**Next Phase**: Task Breakdown and Implementation

