/**
 * Current version numbers for legal documents
 * Update these when Privacy Policy or Terms of Service content changes
 * Users will be required to re-accept when versions change
 */

export const LEGAL_VERSIONS = {
  /**
   * Privacy Policy version
   * Current: 1.0.0 (Initial release)
   */
  PRIVACY_POLICY: '1.0.0',

  /**
   * Terms of Service version
   * Current: 1.0.0 (Initial release)
   */
  TERMS_OF_SERVICE: '1.0.0',

  /**
   * Medical Disclaimer version
   * Current: 1.0.0 (Initial release)
   */
  MEDICAL_DISCLAIMER: '1.0.0',
} as const;

/**
 * Last update dates for legal documents
 */
export const LEGAL_LAST_UPDATED = {
  PRIVACY_POLICY: '2024-02-08',
  TERMS_OF_SERVICE: '2024-02-08',
  MEDICAL_DISCLAIMER: '2024-02-08',
} as const;
