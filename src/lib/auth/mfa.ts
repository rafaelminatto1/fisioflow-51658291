/**
 * Supabase Multi-Factor Authentication (MFA) Implementation
 *
 * Provides MFA support for enhanced security
 * Uses TOTP (Time-based One-Time Password) authenticator apps
 */

import { createClient } from '@supabase/supabase-js';

export interface MFAEnrollment {
  id: string;
  type: 'totp';
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
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  /**
   * Enroll a user in MFA using TOTP (Time-based One-Time Password)
   * Requires user to be authenticated
   */
  async enrollMFA(_userId: string, friendlyName?: string): Promise<{
    qrCode: string;
    secret: string;
    factorId: string;
  }> {
    try {
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            store: false,
          },
        }
      );

      // Get user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      // Enroll MFA factor
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: friendlyName || 'Authenticator App',
      });

      if (error) {
        throw error;
      }

      // Return QR code and secret for user to add to authenticator app
      return {
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        factorId: data.id,
      };
    } catch (error) {
      console.error('MFA enrollment error:', error);
      throw error;
    }
  }

  /**
   * Verify MFA enrollment with code from authenticator app
   */
  async verifyMFAEnrollment(factorId: string, code: string): Promise<boolean> {
    try {
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        code,
      });

      if (error) {
        throw error;
      }

      return data !== null;
    } catch (error) {
      console.error('MFA verification error:', error);
      throw error;
    }
  }

  /**
   * Get list of enrolled MFA factors for user
   */
  async getEnrolledFactors(_userId: string): Promise<MFAEnrollment[]> {
    try {
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error) {
        throw error;
      }

      return data.all || [];
    } catch (error) {
      console.error('Error getting enrolled factors:', error);
      throw error;
    }
  }

  /**
   * Create MFA challenge for login verification
   */
  async createChallenge(factorId: string): Promise<MFAChallenge> {
    try {
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const { data, error } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (error) {
        throw error;
      }

      return {
        id: data.id,
        expires_at: data.expires_at,
      };
    } catch (error) {
      console.error('Error creating MFA challenge:', error);
      throw error;
    }
  }

  /**
   * Verify MFA code during login
   */
  async verifyChallenge(challengeId: string, code: string): Promise<boolean> {
    try {
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const { data, error } = await supabase.auth.mfa.verify({
        challengeId,
        code,
      });

      if (error) {
        throw error;
      }

      return data !== null;
    } catch (error) {
      console.error('Error verifying MFA challenge:', error);
      throw error;
    }
  }

  /**
   * Unenroll a user from MFA
   */
  async unenrollMFA(factorId: string): Promise<boolean> {
    try {
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error unenrolling MFA:', error);
      throw error;
    }
  }

  /**
   * Check if user has MFA enabled
   */
  async hasMFAEnabled(userId: string): Promise<boolean> {
    try {
      const factors = await this.getEnrolledFactors(userId);
      return factors.some(f => f.factors.length > 0);
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return false;
    }
  }

  /**
   * Get MFA settings for user
   */
  async getMFASettings(userId: string): Promise<{
    enabled: boolean;
    factors: Array<{
      id: string;
      friendlyName: string;
      createdAt: string;
    }>;
  }> {
    try {
      const factors = await this.getEnrolledFactors(userId);

      return {
        enabled: factors.some(f => f.factors.length > 0),
        factors: factors.flatMap(f =>
          f.factors.map(factor => ({
            id: factor.id,
            friendlyName: factor.friendly_name,
            createdAt: new Date().toISOString(),
          }))
        ),
      };
    } catch (error) {
      console.error('Error getting MFA settings:', error);
      return {
        enabled: false,
        factors: [],
      };
    }
  }
}

/**
 * Admin-only MFA enforcement
 * Can be used to require MFA for specific roles
 */
export class MFAAdminService {
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  );

  /**
   * Require MFA for admin users
   */
  async requireMFAForRole(role: string): Promise<boolean> {
    const rolesRequiringMFA = ['admin', 'fisioterapeuta'];
    return rolesRequiringMFA.includes(role);
  }

  /**
   * Check if user has MFA enabled (admin function)
   */
  async checkUserMFA(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('mfa_enabled')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking user MFA:', error);
        return false;
      }

      return data?.mfa_enabled || false;
    } catch (error) {
      console.error('Error in checkUserMFA:', error);
      return false;
    }
  }

  /**
   * Update user MFA status in database
   */
  async updateUserMFAStatus(userId: string, enabled: boolean): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('profiles')
        .update({ mfa_enabled: enabled })
        .eq('id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating MFA status:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const mfaService = new MFAService();
export const mfaAdminService = new MFAAdminService();
