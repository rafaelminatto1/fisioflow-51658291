/**
 * MFA service backed by Workers API
 */

import { securityApi, profileApi } from '@/lib/api/workers-client';
import { fisioLogger as logger } from '@/lib/errors/logger';

export interface MFAEnrollment {
  id: string;
  type: 'totp' | 'phone';
  factors: {
    id: string;
    friendly_name: string;
    status: 'verified' | 'unverified';
  }[];
}

export interface MFAVerifyParams {
  factorId: string;
  code: string;
}

export interface MFAChallenge {
  id: string;
  expires_at: string;
}

export class MFAService {
  async enrollMFA(_userId: string, friendlyName?: string): Promise<{
    qrCode: string;
    secret: string;
    factorId: string;
  }> {
    try {
      const result = await securityApi.mfa.enroll(friendlyName);
      return result.data;
    } catch (error) {
      logger.error('MFA enrollment error', error, 'mfa');
      throw error;
    }
  }

  async verifyMFAEnrollment(factorId: string, code: string): Promise<boolean> {
    try {
      const result = await securityApi.mfa.verifyEnrollment(factorId, code);
      await profileApi.updateMe({ mfa_enabled: true, mfa_method: 'totp' });
      return Boolean(result.data?.verified);
    } catch (error) {
      logger.error('MFA verification error', error, 'mfa');
      throw error;
    }
  }

  generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () => {
      const code1 = Math.random().toString(36).substring(2, 7).toUpperCase();
      const code2 = Math.random().toString(36).substring(2, 7).toUpperCase();
      return `${code1}-${code2}`;
    });
  }

  async getEnrolledFactors(_userId: string): Promise<MFAEnrollment[]> {
    try {
      const result = await securityApi.mfa.listFactors();
      if (!result.data?.length) return [];
      return result.data.map((factor) => ({
        id: factor.factor_id,
        type: factor.type === 'totp' ? 'totp' : 'phone',
        factors: [
          {
            id: factor.factor_id,
            friendly_name: factor.friendly_name || 'Authenticator App',
            status: factor.verified ? 'verified' : 'unverified',
          },
        ],
      }));
    } catch (error) {
      logger.error('Error getting enrolled factors', error, 'mfa');
      return [];
    }
  }

  async createChallenge(factorId: string): Promise<MFAChallenge> {
    return {
      id: factorId,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  async verifyChallenge(_challengeId: string, code: string): Promise<boolean> {
    const result = await securityApi.mfa.verifyOtp(code);
    return Boolean(result.data?.verified);
  }

  async unenrollMFA(factorId: string): Promise<boolean> {
    try {
      if (factorId) {
        await securityApi.mfa.deleteFactor(factorId);
      } else {
        const factors = await securityApi.mfa.listFactors();
        if (factors.data[0]?.factor_id) {
          await securityApi.mfa.deleteFactor(factors.data[0].factor_id);
        }
      }
      await securityApi.mfa.disable();
      await profileApi.updateMe({ mfa_enabled: false, mfa_method: null });
      return true;
    } catch (error) {
      logger.error('Error unenrolling MFA', error, 'mfa');
      throw error;
    }
  }

  async hasMFAEnabled(_userId: string): Promise<boolean> {
    try {
      const settings = await securityApi.mfa.getSettings();
      return Boolean(settings.data?.mfa_enabled);
    } catch {
      return false;
    }
  }

  async getMFASettings(_userId: string): Promise<{
    enabled: boolean;
    factors: Array<{ id: string; friendlyName: string; createdAt: string }>;
  }> {
    try {
      const [settings, factors] = await Promise.all([
        securityApi.mfa.getSettings(),
        securityApi.mfa.listFactors(),
      ]);
      return {
        enabled: Boolean(settings.data?.mfa_enabled),
        factors: factors.data.map((factor) => ({
          id: factor.factor_id,
          friendlyName: factor.friendly_name || 'Authenticator App',
          createdAt: factor.created_at,
        })),
      };
    } catch {
      return { enabled: false, factors: [] };
    }
  }
}

export class MFAAdminService {
  async requireMFAForRole(role: string): Promise<boolean> {
    return ['admin', 'fisioterapeuta'].includes(role);
  }

  async checkUserMFA(userId: string): Promise<boolean> {
    return mfaService.hasMFAEnabled(userId);
  }

  async updateUserMFAStatus(_userId: string, enabled: boolean): Promise<void> {
    if (enabled) {
      await profileApi.updateMe({ mfa_enabled: true });
    } else {
      await profileApi.updateMe({ mfa_enabled: false, mfa_method: null });
    }
  }
}

export const mfaService = new MFAService();
export const mfaAdminService = new MFAAdminService();
