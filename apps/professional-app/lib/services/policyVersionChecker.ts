import { fetchApi } from "@/lib/api";
import { LEGAL_VERSIONS } from "@/constants/legalVersions";
import { fisioLogger } from "../errors/logger";

export interface PolicyStatus {
  needsUpdate: boolean;
  missingPolicies: string[];
}

class PolicyVersionChecker {
  private static instance: PolicyVersionChecker;

  private constructor() {}

  static getInstance(): PolicyVersionChecker {
    if (!PolicyVersionChecker.instance) {
      PolicyVersionChecker.instance = new PolicyVersionChecker();
    }
    return PolicyVersionChecker.instance;
  }

  async checkPolicyStatus(): Promise<PolicyStatus> {
    try {
      const user = await fetchApi<any>("/api/profile/me");
      if (!user) return { needsUpdate: false, missingPolicies: [] };

      const userData = await fetchApi<any>(`/api/users/${user.id}`);

      const missingPolicies: string[] = [];
      let needsUpdate = false;

      // Check Privacy Policy
      if (userData.privacyPolicyVersion !== LEGAL_VERSIONS.PRIVACY_POLICY) {
        missingPolicies.push("privacy_policy");
        needsUpdate = true;
      }

      // Check Terms of Service
      if (userData.termsOfServiceVersion !== LEGAL_VERSIONS.TERMS_OF_SERVICE) {
        missingPolicies.push("terms_of_service");
        needsUpdate = true;
      }

      // Check Medical Disclaimer
      if (userData.medicalDisclaimerVersion !== LEGAL_VERSIONS.MEDICAL_DISCLAIMER) {
        missingPolicies.push("medical_disclaimer");
        needsUpdate = true;
      }

      return { needsUpdate, missingPolicies };
    } catch (error) {
      fisioLogger.error("Policy check failed", error, "PolicyVersionChecker");
      // On error, default to not requiring update to avoid blocking user unnecessarily
      return { needsUpdate: false, missingPolicies: [] };
    }
  }
}

export const policyVersionChecker = PolicyVersionChecker.getInstance();
