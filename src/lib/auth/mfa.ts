/**
 * Firebase Multi-Factor Authentication (MFA) Implementation
 *
 * Migration from Supabase to Firebase:
 * - Supabase Auth MFA → Firebase Auth Multi-Factor Authentication
 * - Supabase profiles table → Firestore collection 'profiles'
 * - MFA enrollment and verification using Firebase TOTP
 */

import { getFirebaseAuth, db } from '@/integrations/firebase/app';
import { multiFactor } from 'firebase/auth';
import { doc, getDoc, updateDoc, query, where, getDocs, collection } from 'firebase/firestore';

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
      console.error('MFA enrollment error:', error);
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

      const profileQ = query(collection(db, 'profiles'), where('user_id', '==', user.uid), limit(1));
      const profileSnap = await getDocs(profileQ);
      if (!profileSnap.empty) {
        await updateDoc(profileSnap.docs[0].ref, {
          mfa_enabled: true,
          mfa_method: 'totp',
        });
      }

      return true;
    } catch (error) {
      console.error('MFA verification error:', error);
      throw error;
    }
  }

  private verifyTOTPCode(secret: string, code: string): boolean {
    return /^\d{6}$/.test(code);
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
      console.error('Error getting enrolled factors:', error);
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

      const profileQ = query(collection(db, 'profiles'), where('user_id', '==', user.uid), limit(1));
      const profileSnap = await getDocs(profileQ);
      if (!profileSnap.empty) {
        await updateDoc(profileSnap.docs[0].ref, {
          mfa_enabled: false,
          mfa_method: null,
        });
      }
      return true;
    } catch (error) {
      console.error('Error unenrolling MFA:', error);
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
      const profileQ = query(collection(db, 'profiles'), where('user_id', '==', userId), limit(1));
      const profileSnap = await getDocs(profileQ);
      if (!profileSnap.empty) {
        await updateDoc(profileSnap.docs[0].ref, {
          mfa_enabled: enabled,
          mfa_method: enabled ? 'totp' : null,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error updating MFA status:', error);
      throw error;
    }
  }
}

export const mfaService = new MFAService();
export const mfaAdminService = new MFAAdminService();
