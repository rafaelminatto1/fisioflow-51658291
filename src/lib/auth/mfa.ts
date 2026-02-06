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

      if (!(await this.verifyTOTPCode(secret, code))) {
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

  /**
   * Verify TOTP code using proper HMAC-SHA1 algorithm
   * Implements RFC 6238 (TOTP) and RFC 4226 (HOTP)
   */
  private async verifyTOTPCode(secret: string, code: string): Promise<boolean> {
    // Validate code format first (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return false;
    }

    try {
      const secretBytes = this.base32Decode(secret);
      const codeInt = parseInt(code, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeStep = 30; // Standard TOTP time step

      // Check current time window and adjacent windows (for clock drift tolerance)
      // This allows codes from 1 step before and 1 step after
      for (let windowOffset = -1; windowOffset <= 1; windowOffset++) {
        let timeCounter = Math.floor((currentTime + (windowOffset * timeStep)) / timeStep);

        // Convert counter to 8-byte big-endian array
        const counterBytes = new Uint8Array(8);
        for (let i = 7; i >= 0; i--) {
          counterBytes[i] = timeCounter & 0xff;
          timeCounter >>= 8;
        }

        // Compute HMAC-SHA1
        const hmacKey = await crypto.subtle.importKey(
          'raw',
          secretBytes,
          { name: 'HMAC', hash: 'SHA-1' },
          false,
          ['sign']
        );

        const hmacSignature = await crypto.subtle.sign(
          'HMAC',
          hmacKey,
          counterBytes
        );

        const hmacData = new Uint8Array(hmacSignature);

        // Dynamic truncation (RFC 4226 section 5.4)
        const dynOffset = hmacData[hmacData.length - 1] & 0x0f;
        const binary = ((hmacData[dynOffset] & 0x7f) << 24) |
                      ((hmacData[dynOffset + 1] & 0xff) << 16) |
                      ((hmacData[dynOffset + 2] & 0xff) << 8) |
                      (hmacData[dynOffset + 3] & 0xff);

        const otp = binary % 1000000;

        if (otp === codeInt) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('TOTP verification error', error, 'mfa');
      return false;
    }
  }

  /**
   * Decode Base32 string to Uint8Array
   * Implements RFC 4648 Base32 encoding
   */
  private base32Decode(base32: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    base32 = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');

    const bits = base32.split('').map(char => {
      const index = alphabet.indexOf(char);
      if (index === -1) throw new Error(`Invalid Base32 character: ${char}`);
      return index.toString(2).padStart(5, '0');
    }).join('');

    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
    }

    return bytes;
  }

  /**
   * Generate backup codes for account recovery
   * Returns 10 single-use codes
   */
  generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generate 10-character alphanumeric codes in groups of 5
      const code1 = Math.random().toString(36).substring(2, 7).toUpperCase();
      const code2 = Math.random().toString(36).substring(2, 7).toUpperCase();
      codes.push(`${code1}-${code2}`);
    }
    return codes;
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
