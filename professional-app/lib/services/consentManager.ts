import { Consent, ConsentHistory, ConsentType, ConsentCategory } from '@/types/consent';
import { CONSENT_TYPES } from '@/constants/consentTypes';
import { config } from '@/lib/config';
import { authApi } from '@/lib/auth-api';

export class ConsentManager {
  private static instance: ConsentManager;
  
  private constructor() {}

  static getInstance(): ConsentManager {
    if (!ConsentManager.instance) {
      ConsentManager.instance = new ConsentManager();
    }
    return ConsentManager.instance;
  }

  private async fetchApi(endpoint: string, method: string = 'GET', body?: any) {
    const token = await authApi.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${config.apiUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
    }

    return res.json();
  }

  /**
   * Initialize consent manager for user
   */
  async initialize(userId: string): Promise<void> {
    await this.getUserConsents(userId);
  }

  /**
   * Grant consent for a specific type
   */
  async grantConsent(
    userId: string,
    consentType: string,
    version: string,
    metadata?: Record<string, any>
  ): Promise<Consent> {
    const payload = {
        userId,
        consentType,
        version,
        metadata,
        type: this.getConsentTypeCategory(consentType),
        category: this.getConsentCategory(consentType),
        name: consentType,
        description: this.getConsentDescription(consentType),
        action: 'granted'
    };

    const response = await this.fetchApi('/api/consents/grant', 'POST', payload);
    return response.data;
  }

  /**
   * Withdraw consent (only for optional consents)
   */
  async withdrawConsent(
    userId: string,
    consentType: string,
    reason?: string
  ): Promise<void> {
    const typeCategory = this.getConsentTypeCategory(consentType);
    if (typeCategory === 'required') {
      throw new Error('Cannot withdraw required consent');
    }

    await this.fetchApi('/api/consents/withdraw', 'POST', {
        userId,
        consentType,
        reason
    });
  }

  /**
   * Check if user has granted specific consent
   */
  async hasConsent(userId: string, consentType: string): Promise<boolean> {
     try {
         const response = await this.fetchApi(`/api/consents/check?userId=${userId}&consentType=${consentType}`);
         return response.data?.status === 'granted';
     } catch {
         return false;
     }
  }

  /**
   * Get all consents for user
   */
  async getUserConsents(userId: string): Promise<Consent[]> {
    try {
        const response = await this.fetchApi(`/api/consents/user/${userId}`);
        return response.data || [];
    } catch {
        return [];
    }
  }

  /**
   * Get consent history
   */
  async getConsentHistory(userId: string, consentType?: string): Promise<ConsentHistory[]> {
    try {
        const url = consentType 
            ? `/api/consents/history/${userId}?consentType=${consentType}`
            : `/api/consents/history/${userId}`;
        const response = await this.fetchApi(url);
        return response.data || [];
    } catch {
        return [];
    }
  }

  /**
   * Check if consent needs renewal (version changed)
   */
  async needsRenewal(userId: string, consentType: string, currentVersion: string): Promise<boolean> {
      try {
          const response = await this.fetchApi(`/api/consents/check-renewal?userId=${userId}&consentType=${consentType}&version=${currentVersion}`);
          return response.data?.needsRenewal || false;
      } catch {
          return true;
      }
  }

  /**
   * Sync consent with device permissions
   */
  async syncDevicePermissions(userId: string): Promise<void> {
    console.log('Syncing device permissions for', userId);
  }
  
  // Helpers
  private getConsentTypeCategory(consentType: string): ConsentType {
      const required = [
          CONSENT_TYPES.PRIVACY_POLICY, 
          CONSENT_TYPES.TERMS_OF_SERVICE,
          CONSENT_TYPES.CAMERA_PERMISSION, 
          CONSENT_TYPES.PHOTOS_PERMISSION
      ];
      
      return required.includes(consentType as any) ? 'required' : 'optional';
  }

  private getConsentCategory(consentType: string): ConsentCategory {
      if (consentType === CONSENT_TYPES.PRIVACY_POLICY || consentType === CONSENT_TYPES.TERMS_OF_SERVICE) return 'legal';
      if (consentType.includes('permission')) return 'permission';
      if (consentType === CONSENT_TYPES.ANALYTICS || consentType === CONSENT_TYPES.CRASH_REPORTS) return 'analytics';
      if (consentType === CONSENT_TYPES.MARKETING_EMAILS) return 'marketing';
      return 'legal'; // Default
  }

  private getConsentDescription(consentType: string): string {
      return consentType;
  }
}

export const consentManager = ConsentManager.getInstance();
