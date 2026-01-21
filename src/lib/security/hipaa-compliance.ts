/**
 * HIPAA Compliance Configuration for FisioFlow
 *
 * This file contains security configurations and utilities to help
 * achieve HIPAA compliance for handling Protected Health Information (PHI).
 *
 * IMPORTANT: This is NOT legal advice. Consult with a legal professional
 * to ensure full HIPAA compliance.
 *
 * Key Requirements:
 * 1. Encryption in transit (TLS 1.2+)
 * 2. Encryption at rest
 * 3. Access controls & authentication
 * 4. Audit logging
 * 5. Business Associate Agreement (BAA) with vendors
 * 6. Minimum necessary standard
 * 7. User training & policies
 *
 * @see https://vercel.com/kb/guide/hipaa-compliance-guide-vercel
 * @see https://supabase.com/docs/guides/platform/hipaa-compliance
 */

// ============================================================================
// SECURITY HEADERS CONFIGURATION
// ============================================================================

/**
 * Security headers for Vercel deployment
 * Add these to vercel.json in the headers section
 */
export const HIPAA_SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.vercel-insights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://generativelanguage.googleapis.com",
    "media-src 'self' blob:",
  ].join('; '),
} as const;

/**
 * CORS configuration for HIPAA compliance
 * Restricts cross-origin requests to approved domains only
 */
export const HIPAA_CORS_CONFIG = {
  allowedOrigins: [
    'https://fisioflow.vercel.app',
    'https://fisioflow.app',
    // Add your custom domains here
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'apikey',
    'X-Client-Info',
    'X-HIPAA-Audit-Token',
  ],
  maxAge: 86400, // 24 hours
  credentials: true,
} as const;

// ============================================================================
// AUDIT LOGGING CONFIGURATION
// ============================================================================

export type HIPAAAuditEvent =
  | 'phi_access'
  | 'phi_view'
  | 'phi_create'
  | 'phi_update'
  | 'phi_delete'
  | 'phi_export'
  | 'authentication'
  | 'authorization'
  | 'failed_access'
  | 'data_breach';

export interface HIPAAAuditLog {
  id: string;
  event_type: HIPAAAuditEvent;
  user_id: string | null;
  resource_type: string; // 'patient', 'appointment', 'soap_note', etc.
  resource_id: string;
  phi_fields: string[]; // Which PHI fields were accessed
  purpose: string;
  ip_address?: string;
  user_agent?: string;
  location?: string;
  created_at: string;
}

/**
 * PHI (Protected Health Information) identifiers that must be audited
 * Based on HIPAA Safe Harbor provision
 */
export const PHI_IDENTIFIERS = [
  'names',
  'geographic_subdivisions_smaller_than_state',
  'elements_related_to_dates',
  'telephone_numbers',
  'fax_numbers',
  'email_addresses',
  'social_security_numbers',
  'medical_record_numbers',
  'health_plan_beneficiary_numbers',
  'account_numbers',
  'certificate_license_numbers',
  'vehicle_identifiers',
  'device_identifiers',
  'web_urls',
  'ip_addresses',
  'biometric_identifiers',
  'full_face_photos',
  'other_identifying_characteristics',
] as const;

/**
 * Fields that contain PHI in FisioFlow tables
 */
export const PHI_FIELDS_BY_TABLE: Record<string, string[]> = {
  patients: [
    'name', 'full_name', 'email', 'phone', 'cpf',
    'address', 'birth_date', 'insurance_number',
    'medical_history', 'medications', 'allergies',
  ],
  appointments: [
    'patient_id', 'reason', 'notes', 'diagnosis',
  ],
  soap_notes: [
    'subjective', 'objective', 'assessment', 'plan',
    'patient_id', 'therapist_id',
  ],
  pain_records: [
    'body_part', 'pain_type', 'notes',
  ],
  treatments: [
    'description', 'notes', 'outcomes',
  ],
};

// ============================================================================
// ENCRYPTION CONFIGURATION
// ============================================================================

/**
 * Encryption configuration for data at rest
 * Supabase handles this automatically, but we document it here
 */
export const ENCRYPTION_CONFIG = {
  // Supabase uses AES-256 for data at rest
  algorithm: 'AES-256-GCM',

  // TLS 1.2+ for data in transit (handled by Supabase and Vercel)
  tlsMinVersion: 'TLSv1.2',

  // Encryption keys should be rotated periodically
  keyRotationDays: 90,

  // Backup encryption
  backupEncryption: 'AES-256',

  // Session encryption
  sessionEncryption: 'JWT-SHA256',
} as const;

// ============================================================================
// ACCESS CONTROL CONFIGURATION
// ============================================================================

/**
 * Minimum necessary standard - limit PHI access to what's needed
 */
export const ACCESS_CONTROL_CONFIG = {
  // Session timeout (inactivity)
  sessionTimeoutMinutes: 15,

  // Maximum session duration
  maxSessionHours: 8,

  // Require MFA for PHI access
  requireMFAForPHI: true,

  // IP allowlist (if applicable)
  ipAllowlist: [] as string[],

  // Geographic restrictions
  geoRestrictions: [] as string[],

  // Role-based access control
  rolePermissions: {
    admin: ['read', 'write', 'delete', 'export', 'manage_users'],
    fisioterapeuta: ['read', 'write', 'update_own'],
    paciente: ['read_own'],
    receptionist: ['read', 'write', 'update_appointments'],
  } as const,
} as const;

// ============================================================================
// DATA RETENTION CONFIGURATION
// ============================================================================

/**
 * HIPAA doesn't specify retention periods, but state laws may
 * Configure based on your local requirements
 */
export const DATA_RETENTION_CONFIG = {
  // Adult patient records
  adultRetentionYears: 10,

  // Minor patient records (often longer)
  minorRetentionYears: 18, // Until age of majority + X years

  // Financial records
  financialRetentionYears: 7,

  // Audit logs (must be retained for 6 years per HIPAA)
  auditLogRetentionYears: 6,

  // Backup retention
  backupRetentionDays: 30, // For PITR
} as const;

// ============================================================================
// INCIDENT RESPONSE CONFIGURATION
// ============================================================================

export const INCIDENT_RESPONSE_CONFIG = {
  // Time to report breach (HIPAA requirement: 60 days)
  breachReportingDays: 60,

  // Incident severity levels
  severityLevels: ['low', 'medium', 'high', 'critical'] as const,

  // Notification requirements
  notificationRequired: true,

  // Incident log retention
  incidentLogRetentionYears: 6,
} as const;

// ============================================================================
// BAA (BUSINESS ASSOCIATE AGREEMENT) VENDORS
// ============================================================================

/**
 * Vendors that process PHI and require a BAA
 */
export const BAA_VENDORS: Record<string, { hasBAA: boolean; notes: string }> = {
  vercel: {
    hasBAA: true,
    notes: 'BAA available through Vercel Enterprise plan',
  },
  supabase: {
    hasBAA: true,
    notes: 'BAA available through Supabase Pro HIPAA add-on',
  },
  openai: {
    hasBAA: false,
    notes: 'Do not send PHI to OpenAI. Use de-identified data only.',
  },
  anthropic: {
    hasBAA: false,
    notes: 'Do not send PHI to Anthropic. Use de-identified data only.',
  },
  elevenlabs: {
    hasBAA: false,
    notes: 'Only send de-identified exercise names, not patient data.',
  },
  stripe: {
    hasBAA: true,
    notes: 'BAA available for healthcare payments',
  },
};

// ============================================================================
// HIPAA COMPLIANCE CHECKLIST
// ============================================================================

export const HIPAA_COMPLIANCE_CHECKLIST = {
  administrative: [
    'Security management process',
    'Privacy officer designated',
    'Workforce training & policies',
    'Business associate agreements',
    'Incident response procedures',
    'Contingency plan',
    'Evaluation of security compliance',
  ],
  physical: [
    'Facility access controls',
    'Workstation security',
    'Device & media controls',
    'Disposal procedures',
  ],
  technical: [
    'Access control (unique user IDs)',
    'Audit logging',
    'Integrity controls',
    'Transmission security (TLS)',
    'Encryption at rest',
  ],
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a data field contains PHI
 */
export function containsPHI(tableName: string, fieldName: string): boolean {
  return PHI_FIELDS_BY_TABLE[tableName]?.includes(fieldName) ?? false;
}

/**
 * Sanitize data by removing PHI (for external services)
 */
export function sanitizePHI<T extends Record<string, unknown>>(
  data: T,
  tableName: string
): Partial<T> {
  const phiFields = PHI_FIELDS_BY_TABLE[tableName] || [];
  const sanitized: Partial<T> = {};

  for (const [key, value] of Object.entries(data)) {
    if (!phiFields.includes(key)) {
      sanitized[key as keyof T] = value;
    }
  }

  return sanitized;
}

/**
 * Check if vendor has BAA
 */
export function vendorHasBAA(vendorName: string): boolean {
  return BAA_VENDORS[vendorName]?.hasBAA ?? false;
}

/**
 * Get security headers for Vercel configuration
 */
export function getVercelSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const [key, value] of Object.entries(HIPAA_SECURITY_HEADERS)) {
    headers[key] = value;
  }

  return headers;
}

// ============================================================================
// vercel.json CONFIGURATION
// ============================================================================

/**
 * Example vercel.json configuration for HIPAA compliance
 *
 * Copy this to your vercel.json file:
 *
 * {
 *   "headers": [
 *     {
 *       "source": "/(.*)",
 *       "headers": [
 *         { "key": "X-Frame-Options", "value": "DENY" },
 *         { "key": "X-Content-Type-Options", "value": "nosniff" },
 *         { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
 *         { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
 *       ]
 *     }
 *   ],
 *   "rewrites": [
 *     {
 *       "source": "/api/webhooks/:path*",
 *       "destination": "/api/webhooks-handler"
 *     }
 *   ]
 * }
 */
