import { fetchApi } from "@/lib/api";
import { LEGAL_VERSIONS } from "@/constants/legalVersions";
import { CONSENT_TYPES } from "@/constants/consentTypes";
import { consentManager } from "./consentManager";
import { fisioLogger } from "../errors/logger";

export interface PolicyStatus {
  needsUpdate: boolean;
  missingPolicies: string[];
}

/** Documentos legais que precisam de aceite na versão vigente. */
export const REQUIRED_LEGAL_CONSENTS = [
  { consentType: CONSENT_TYPES.PRIVACY_POLICY, version: LEGAL_VERSIONS.PRIVACY_POLICY },
  { consentType: CONSENT_TYPES.TERMS_OF_SERVICE, version: LEGAL_VERSIONS.TERMS_OF_SERVICE },
  { consentType: CONSENT_TYPES.MEDICAL_DISCLAIMER, version: LEGAL_VERSIONS.MEDICAL_DISCLAIMER },
];

class PolicyVersionChecker {
  private static instance: PolicyVersionChecker;

  private constructor() {}

  static getInstance(): PolicyVersionChecker {
    if (!PolicyVersionChecker.instance) {
      PolicyVersionChecker.instance = new PolicyVersionChecker();
    }
    return PolicyVersionChecker.instance;
  }

  /**
   * Até 08/2026 isto lia `privacyPolicyVersion` de `GET /api/users/:id` — rota que
   * nunca existiu (404), então `needsUpdate` era sempre false e uma política nova
   * jamais era reapresentada. A versão aceita vive em `lgpd_consents`.
   */
  async checkPolicyStatus(): Promise<PolicyStatus> {
    try {
      const user = await fetchApi<any>("/api/profile/me");
      const userId = user?.user?.id || user?.id;
      if (!userId) return { needsUpdate: false, missingPolicies: [] };

      const missingPolicies = await consentManager.missingLegalConsents(
        userId,
        REQUIRED_LEGAL_CONSENTS,
      );

      return { needsUpdate: missingPolicies.length > 0, missingPolicies };
    } catch (error) {
      fisioLogger.error("Policy check failed", error, "PolicyVersionChecker");
      // On error, default to not requiring update to avoid blocking user unnecessarily
      return { needsUpdate: false, missingPolicies: [] };
    }
  }
}

export const policyVersionChecker = PolicyVersionChecker.getInstance();
