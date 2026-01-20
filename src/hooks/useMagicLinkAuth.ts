/**
 * Magic Link Authentication Hook
 *
 * Provides passwordless authentication using Supabase Magic Links.
 * Ideal for patients who want quick, frictionless access.
 *
 * Features:
 * - Send magic link to email
 * - OTP-based authentication
 * - Session management
 * - Patient-friendly redirect handling
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface MagicLinkOptions {
  redirectTo?: string;
  userType?: 'patient' | 'therapist' | 'admin';
}

export interface MagicLinkResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface UseMagicLinkAuthOptions {
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

// ============================================================================
// MAGIC LINK AUTH HOOK
// ============================================================================

export function useMagicLinkAuth(options: UseMagicLinkAuthOptions = {}) {
  const { onError, onSuccess } = options;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  /**
   * Send magic link to user's email
   */
  const sendMagicLink = useCallback(
    async (emailAddress: string, magicLinkOptions: MagicLinkOptions = {}): Promise<MagicLinkResult> => {
      setLoading(true);
      setError(null);

      const redirectUrl = magicLinkOptions.redirectTo ||
        `${window.location.origin}/auth/callback?userType=${magicLinkOptions.userType || 'patient'}`;

      try {
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email: emailAddress,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              user_type: magicLinkOptions.userType || 'patient',
            },
          },
        });

        if (signInError) {
          throw signInError;
        }

        logger.info(`Magic link enviado para ${emailAddress}`, {}, 'useMagicLinkAuth');

        setSent(true);
        setEmail(emailAddress);

        // Start countdown for resend (60 seconds)
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return {
          success: true,
          message: 'Link de acesso enviado! Verifique seu email.',
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Erro ao enviar link de acesso. Tente novamente.';

        setError(errorMessage);
        onError?.(err as Error);
        logger.error('Erro ao enviar magic link', err, 'useMagicLinkAuth');

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  /**
   * Send OTP for passwordless login
   */
  const sendOTP = useCallback(
    async (phoneNumber: string): Promise<MagicLinkResult> => {
      setLoading(true);
      setError(null);

      try {
        const { error: signInError } = await supabase.auth.signInWithOtp({
          phone: phoneNumber,
        });

        if (signInError) {
          throw signInError;
        }

        logger.info(`OTP enviado para ${phoneNumber}`, {}, 'useMagicLinkAuth');

        setSent(true);

        // Start countdown for resend
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return {
          success: true,
          message: 'Código enviado! Verifique seu telefone.',
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Erro ao enviar código. Tente novamente.';

        setError(errorMessage);
        onError?.(err as Error);
        logger.error('Erro ao enviar OTP', err, 'useMagicLinkAuth');

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  /**
   * Verify OTP code (for phone-based login)
   */
  const verifyOTP = useCallback(
    async (
      contact: string,
      token: string,
      type: 'email' | 'sms' = 'email'
    ): Promise<MagicLinkResult> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          [type]: contact,
          token,
          type: type === 'email' ? 'email' : 'sms',
        });

        if (verifyError) {
          throw verifyError;
        }

        logger.info('OTP verificado com sucesso', { userId: data.user?.id }, 'useMagicLinkAuth');

        const userType = searchParams.get('userType') || 'patient';
        const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirect') || '/';

        // Navigate based on user type
        if (userType === 'patient') {
          navigate(`/paciente/dashboard${returnUrl !== '/' ? `?redirect=${returnUrl}` : ''}`);
        } else {
          navigate(returnUrl, { replace: true });
        }

        onSuccess?.();

        return {
          success: true,
          message: 'Login realizado com sucesso!',
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Código inválido ou expirado. Tente novamente.';

        setError(errorMessage);
        onError?.(err as Error);
        logger.error('Erro ao verificar OTP', err, 'useMagicLinkAuth');

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setLoading(false);
      }
    },
    [navigate, searchParams, onError, onSuccess]
  );

  /**
   * Handle magic link callback (from redirect)
   */
  const handleCallback = useCallback(async (): Promise<MagicLinkResult> => {
    setLoading(true);
    setError(null);

    try {
      // Get the session from the URL
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error('Nenhuma sessão encontrada. O link pode ter expirado.');
      }

      const user = data.session.user;
      logger.info('Magic link callback processado', { userId: user.id }, 'useMagicLinkAuth');

      const userType = searchParams.get('userType') || user?.user_metadata?.user_type || 'patient';
      const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirect') || '/';

      // Navigate based on user type
      if (userType === 'patient') {
        navigate(`/paciente/dashboard${returnUrl !== '/' ? `?redirect=${returnUrl}` : ''}`);
      } else {
        navigate(returnUrl, { replace: true });
      }

      onSuccess?.();

      return {
        success: true,
        message: 'Login realizado com sucesso!',
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Falha na autenticação com link mágico.';

      setError(errorMessage);
      onError?.(err as Error);
      logger.error('Erro no callback do magic link', err, 'useMagicLinkAuth');

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, [navigate, searchParams, onError, onSuccess]);

  /**
   * Reset state (for "try again" or different email)
   */
  const reset = useCallback(() => {
    setSent(false);
    setError(null);
    setCountdown(0);
  }, []);

  return {
    // State
    loading,
    email,
    sent,
    countdown,
    error,

    // Methods
    sendMagicLink,
    sendOTP,
    verifyOTP,
    handleCallback,
    reset,
    setEmail,
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Send magic link for patient login
 */
export async function sendPatientMagicLink(email: string): Promise<MagicLinkResult> {
  const { supabase } = await import('@/integrations/supabase/client');

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?userType=patient`,
        data: {
          user_type: 'patient',
        },
      },
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: 'Link de acesso enviado! Verifique seu email.',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao enviar link.',
    };
  }
}

/**
 * Send magic link for therapist login
 */
export async function sendTherapistMagicLink(email: string): Promise<MagicLinkResult> {
  const { supabase } = await import('@/integrations/supabase/client');

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?userType=therapist`,
        data: {
          user_type: 'therapist',
        },
      },
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: 'Link de acesso enviado! Verifique seu email.',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao enviar link.',
    };
  }
}
