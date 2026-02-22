/**
 * Legal and compliance type definitions for FisioFlow Professional App
 * Covers privacy policy, terms of service, and medical disclaimer acceptance tracking
 */

/**
 * Device information captured during legal document acceptance
 */
export interface DeviceInfo {
  model: string;
  osVersion: string;
  appVersion: string;
  platform: 'ios' | 'android';
}

/**
 * Privacy Policy acceptance record
 * Stored in Firestore collection: privacy_acceptances
 */
export interface PrivacyPolicyAcceptance {
  id: string;
  userId: string;
  version: string;
  acceptedAt: Date;
  ipAddress?: string;
  deviceInfo: DeviceInfo;
}

/**
 * Terms of Service acceptance record
 * Stored in Firestore collection: terms_acceptances
 */
export interface TermsOfServiceAcceptance {
  id: string;
  userId: string;
  version: string;
  acceptedAt: Date;
  ipAddress?: string;
  deviceInfo: DeviceInfo;
}

/**
 * Medical Disclaimer acknowledgment record
 * Stored in Firestore collection: medical_disclaimers
 */
export interface MedicalDisclaimerAcknowledgment {
  id: string;
  userId: string;
  context: 'first-launch' | 'exercise-prescription' | 'protocol-application';
  acknowledgedAt: Date;
  version: string;
}
