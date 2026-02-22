/**
 * Policy Version Checker Service
 * Checks user's accepted policy versions against current versions
 * Triggers re-acceptance flow if versions don't match
 * Blocks app access until re-acceptance is complete
 * 
 * Requirements: 1.13
 */

import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { LEGAL_VERSIONS } from '@/constants/legalVersions';

export interface PolicyVersionStatus {
  privacyPolicyUpToDate: boolean;
  termsOfServiceUpToDate: boolean;
  medicalDisclaimerUpToDate: boolean;
  needsReAcceptance: boolean;
  outdatedPolicies: string[];
}

export class PolicyVersionChecker {
  /**
   * Check if user's accepted policy versions match current versions
   * @param userId - User ID to check
   * @returns Status object indicating which policies need re-acceptance
   */
  async checkPolicyVersions(userId: string): Promise<PolicyVersionStatus> {
    try {
      // Get user document with accepted versions
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        // User document doesn't exist, needs to complete onboarding
        return {
          privacyPolicyUpToDate: false,
          termsOfServiceUpToDate: false,
          medicalDisclaimerUpToDate: false,
          needsReAcceptance: true,
          outdatedPolicies: ['privacy-policy', 'terms-of-service', 'medical-disclaimer'],
        };
      }

      const userData = userDoc.data();
      const outdatedPolicies: string[] = [];

      // Check Privacy Policy version
      const privacyPolicyUpToDate = 
        userData.privacyPolicyVersion === LEGAL_VERSIONS.PRIVACY_POLICY;
      if (!privacyPolicyUpToDate) {
        outdatedPolicies.push('privacy-policy');
      }

      // Check Terms of Service version
      const termsOfServiceUpToDate = 
        userData.termsOfServiceVersion === LEGAL_VERSIONS.TERMS_OF_SERVICE;
      if (!termsOfServiceUpToDate) {
        outdatedPolicies.push('terms-of-service');
      }

      // Check Medical Disclaimer version
      const medicalDisclaimerUpToDate = 
        userData.medicalDisclaimerVersion === LEGAL_VERSIONS.MEDICAL_DISCLAIMER;
      if (!medicalDisclaimerUpToDate) {
        outdatedPolicies.push('medical-disclaimer');
      }

      return {
        privacyPolicyUpToDate,
        termsOfServiceUpToDate,
        medicalDisclaimerUpToDate,
        needsReAcceptance: outdatedPolicies.length > 0,
        outdatedPolicies,
      };
    } catch (error) {
      console.error('Error checking policy versions:', error);
      // On error, assume re-acceptance is needed for safety
      return {
        privacyPolicyUpToDate: false,
        termsOfServiceUpToDate: false,
        medicalDisclaimerUpToDate: false,
        needsReAcceptance: true,
        outdatedPolicies: ['privacy-policy', 'terms-of-service', 'medical-disclaimer'],
      };
    }
  }

  /**
   * Check if current user needs to re-accept policies
   * Convenience method that uses the current authenticated user
   * @returns Status object or null if no user is authenticated
   */
  async checkCurrentUser(): Promise<PolicyVersionStatus | null> {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }

    return this.checkPolicyVersions(user.uid);
  }

  /**
   * Determine if app access should be blocked
   * @param userId - User ID to check
   * @returns true if app access should be blocked, false otherwise
   */
  async shouldBlockAppAccess(userId: string): Promise<boolean> {
    const status = await this.checkPolicyVersions(userId);
    return status.needsReAcceptance;
  }

  /**
   * Get list of policies that need re-acceptance
   * @param userId - User ID to check
   * @returns Array of policy names that need re-acceptance
   */
  async getOutdatedPolicies(userId: string): Promise<string[]> {
    const status = await this.checkPolicyVersions(userId);
    return status.outdatedPolicies;
  }

  /**
   * Get human-readable names for outdated policies
   * @param userId - User ID to check
   * @returns Array of human-readable policy names
   */
  async getOutdatedPolicyNames(userId: string): Promise<string[]> {
    const outdatedPolicies = await this.getOutdatedPolicies(userId);
    
    const nameMap: Record<string, string> = {
      'privacy-policy': 'Política de Privacidade',
      'terms-of-service': 'Termos de Uso',
      'medical-disclaimer': 'Aviso Médico',
    };

    return outdatedPolicies.map(policy => nameMap[policy] || policy);
  }
}

// Export singleton instance
export const policyVersionChecker = new PolicyVersionChecker();
