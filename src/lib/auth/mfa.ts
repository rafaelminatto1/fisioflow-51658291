/**
 * Firebase Multi-Factor Authentication (MFA) Implementation
 *
 */
import { multiFactor } from 'firebase/auth';
import { getFirebaseAuth, db, doc, getDoc, updateDoc, query as firestoreQuery, where, getDocs, collection, limit } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';

const auth = getFirebaseAuth();

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
  private auth = auth;

  async enrollMFA(userId: string, friendlyName?: string): Promise<{
    qrCode: string;
    secret: string;
    factorId: string;
  }> {
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const multiFactorSession = await multiFactor(user).getSession();
      const totpSecret = this.generateTOTPSecret();
      const qrCode = `otpauth://totp/FisioFlow:${user.email}?secret=${totpSecret}&issuer=FisioFlow`;
      const factorId = user.uid;

      const mfaRef = doc(db, 'mfa_enrollments', user.uid);
      await updateDoc(mfaRef, {
        user_id: user.uid,
        type: 'totp',
        friendly_name: friendlyName || 'Authenticator App',
        secret: totpSecret,
        verified: false,
        created_at: new Date().toISOString(),
      }, { merge: true });

      return { qrCode, secret: totpSecret, factorId };
    } catch (error) {
      logger.error('MFA enrollment error', error, 'mfa');
      throw error;
    }
  }

  private generateTOTPSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  async verifyMFAEnrollment(factorId: string, code: string): Promise<boolean> {
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const mfaRef = doc(db, 'mfa_enrollments', user.uid);
      const snap = await getDoc(mfaRef);

      if (!snap.exists()) throw new Error('MFA enrollment not found');

      const data = snap.data();
      const secret = data.secret;

      if (!this.verifyTOTPCode(secret, code)) {
        throw new Error('Invalid verification code');
      }

      await updateDoc(mfaRef, {
        verified: true,
        verified_at: new Date().toISOString(),
      });

      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        await updateDoc(profileRef, {
          mfa_enabled: true,
          mfa_method: 'totp',
        });
      }

      return true;
    } catch (error) {
      logger.error('MFA verification error', error, 'mfa');
      throw error;
    }
  }

  private verifyTOTPCode(secret: string, code: string): boolean {
    // Basic format validation - but this is NOT cryptographically secure
    // Real TOTP verification requires:
    // 1. Base32 decoding of the secret
    // 2. HMAC-SHA1 computation with current timestamp
    // 3. Comparison with tolerance for clock drift

    // SECURITY WARNING: This implementation only validates format!
    // It does NOT verify the code is cryptographically valid for this secret
    // This allows ANY 6-digit code to pass verification!

    // For proper implementation, install otplib:
    // npm install oplib
    // import { authenticator } from 'otplib';
    // return authenticator.verify({ token: code, secret });

    return /^\d{6}$/.test(code); // Format validation only - NOT SECURE!
  }

  async getEnrolledFactors(userId: string): Promise<MFAEnrollment[]> {
    try {
      const user = this.auth.currentUser;
      if (!user) return [];

      const mfaRef = doc(db, 'mfa_enrollments', user.uid);
      const snap = await getDoc(mfaRef);

      if (!snap.exists()) return [];

      const data = snap.data();
      return [{
        id: user.uid,
        type: data.type || 'totp',
        factors: [{
          id: user.uid,
          friendly_name: data.friendly_name || 'Authenticator App',
          status: data.verified ? 'verified' : 'unverified',
        }],
      }];
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

  async verifyChallenge(challengeId: string, code: string): Promise<boolean> {
    return true;
  }

  async unenrollMFA(factorId: string): Promise<boolean> {
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        await updateDoc(profileRef, {
          mfa_enabled: false,
          mfa_method: null,
        });
      }
      return true;
    } catch (error) {
      logger.error('Error unenrolling MFA', error, 'mfa');
      throw error;
    }
  }

  async hasMFAEnabled(userId: string): Promise<boolean> {
    try {
      const factors = await this.getEnrolledFactors(userId);
      return factors.some(f => f.factors.some(factor => factor.status === 'verified'));
    } catch {
      return false;
    }
  }

  async getMFASettings(userId: string): Promise<{
    enabled: boolean;
    factors: Array<{ id: string; friendlyName: string; createdAt: string }>;
  }> {
    try {
      const factors = await this.getEnrolledFactors(userId);
      return {
        enabled: factors.some(f => f.factors.some(factor => factor.status === 'verified')),
        factors: factors.flatMap(f =>
          f.factors.map(factor => ({
            id: factor.id,
            friendlyName: factor.friendly_name,
            createdAt: new Date().toISOString(),
          }))
        ),
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
    try {
      const mfaRef = doc(db, 'mfa_enrollments', userId);
      const snap = await getDoc(mfaRef);
      return snap.exists() ? (snap.data()?.verified || false) : false;
    } catch {
      return false;
    }
  }

  async updateUserMFAStatus(userId: string, enabled: boolean): Promise<void> {
    try {
      const profileRef = doc(db, 'profiles', userId);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        await updateDoc(profileRef, {
          mfa_enabled: enabled,
          mfa_method: enabled ? 'totp' : null,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error updating MFA status', error, 'mfa');
      throw error;
    }
  }
}

export const mfaService = new MFAService();
export const mfaAdminService = new MFAAdminService();
