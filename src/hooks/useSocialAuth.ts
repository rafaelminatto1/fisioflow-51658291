/**
 * Social Authentication Hook
 *
 * Provides OAuth social login functionality using Supabase Auth.
 * Supports: Google, Apple, GitHub, Microsoft, Facebook
 *
 * Configuration required in Supabase Dashboard:
 * - Authentication > Providers > Add provider
 * - Enable desired OAuth providers
 * - Configure redirect URLs
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export type SocialProvider = 'google' | 'apple' | 'github' | 'microsoft' | 'facebook';

export interface SocialAuthResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email?: string;
    name?: string;
    avatar?: string;
  };
}

export interface UseSocialAuthOptions {
  redirectTo?: string;
  onError?: (error: Error) => void;
  onSuccess?: (user: SocialAuthResult['user']) => void;
}

// ============================================================================
// PROVIDER CONFIGURATION
// ============================================================================

const PROVIDER_SCOPES: Record<SocialProvider, string> = {
  google: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
  apple: '',
  github: 'user:email repo:read',
  microsoft: 'User.Read',
  facebook: 'email,public_profile',
};

// ============================================================================
// SOCIAL AUTH HOOK
// ============================================================================

export function useSocialAuth(options: UseSocialAuthOptions = {}) {
  const { redirectTo, onError, onSuccess } = options;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sign in with OAuth provider
   */
  const signInWithProvider = useCallback(
    provider: SocialProvider
  ): Promise<void> => {
    setLoading(true);
    setLoadingProvider(provider);
    setError(null);

    const redirectUrl = redirectTo || `${window.location.origin}/auth/callback`;

    supabase.auth
      .signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          scopes: PROVIDER_SCOPES[provider],
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      .then(({ data, error }) => {
        if (error) {
          throw error;
        }

        logger.info(`OAuth redirect initiated for ${provider}`, 'useSocialAuth');
      })
      .catch((err) => {
        const errorMessage = `Falha ao entrar com ${provider}: ${err.message}`;
        setError(errorMessage);
        onError?.(err);
        logger.error(`OAuth ${provider} error:`, err, 'useSocialAuth');
      })
      .finally(() => {
        setLoading(false);
        setLoadingProvider(null);
      });
  },
  [redirectTo, onError]
  );

  /**
   * Sign in with Google
   */
  const signInWithGoogle = useCallback(() => {
    return signInWithProvider('google');
  }, [signInWithProvider]);

  /**
   * Sign in with Apple
   */
  const signInWithApple = useCallback(() => {
    return signInWithProvider('apple');
  }, [signInWithProvider]);

  /**
   * Sign in with GitHub
   */
  const signInWithGithub = useCallback(() => {
    return signInWithProvider('github');
  }, [signInWithProvider]);

  /**
   * Sign in with Microsoft
   */
  const signInWithMicrosoft = useCallback(() => {
    return signInWithProvider('microsoft');
  }, [signInWithProvider]);

  /**
   * Sign in with Facebook
   */
  const signInWithFacebook = useCallback(() => {
    return signInWithProvider('facebook');
  }, [signInWithProvider]);

  /**
   * Handle OAuth callback (from redirect)
   */
  const handleCallback = useCallback(async (): Promise<SocialAuthResult> => {
    setLoading(true);
    setError(null);

    try {
      // Get the session from the URL hash
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (!data.session) {
        // Exchange the code for a session
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!sessionData.session) {
          throw new Error('No session returned from OAuth callback');
        }
      }

      const user = data.session?.user;
      const result: SocialAuthResult = {
        success: true,
        user: user
          ? {
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.user_metadata?.name,
              avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            }
          : undefined,
      };

      onSuccess?.(result.user);

      // Navigate to dashboard or intended page
      const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirect') || '/';
      navigate(returnUrl, { replace: true });

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Falha na autenticação OAuth';
      setError(errorMessage);
      onError?.(err as Error);
      logger.error('OAuth callback error:', err, 'useSocialAuth');

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, [navigate, searchParams, onError, onSuccess]);

  /**
   * Sign out
   */
  const signOut = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await supabase.auth.signOut();
      navigate('/auth', { replace: true });
    } catch (err) {
      const errorMessage = 'Falha ao sair';
      setError(errorMessage);
      onError?.(err as Error);
      logger.error('Sign out error:', err, 'useSocialAuth');
    } finally {
      setLoading(false);
    }
  }, [navigate, onError]);

  /**
   * Link OAuth provider to existing account
   */
  const linkProvider = useCallback(
    async (provider: SocialProvider): Promise<SocialAuthResult> => {
      setLoading(true);
      setLoadingProvider(provider);
      setError(null);

      const redirectUrl = redirectTo || `${window.location.origin}/auth/callback`;

      try {
        const { data, error } = await supabase.auth.linkIdentity({
          provider,
          options: {
            redirectTo: redirectUrl,
            scopes: PROVIDER_SCOPES[provider],
          },
        });

        if (error) {
          throw error;
        }

        return {
          success: true,
          user: {
            id: data.user?.id || '',
            email: data.user?.email,
            name: data.user?.user_metadata?.full_name || data.user?.user_metadata?.name,
            avatar: data.user?.user_metadata?.avatar_url || data.user?.user_metadata?.picture,
          },
        };
      } catch (err) {
        const errorMessage = `Falha ao vincular ${provider}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`;
        setError(errorMessage);
        onError?.(err as Error);
        logger.error(`Link ${provider} error:`, err, 'useSocialAuth');

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setLoading(false);
        setLoadingProvider(null);
      }
    },
    [redirectTo, onError]
  );

  /**
   * Unlink OAuth provider
   */
  const unlinkProvider = useCallback(
    async (provider: SocialProvider): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const { error } = await supabase.auth.unlinkIdentity(provider);

        if (error) {
          throw error;
        }
      } catch (err) {
        const errorMessage = `Falha ao desvincular ${provider}`;
        setError(errorMessage);
        onError?.(err as Error);
        logger.error(`Unlink ${provider} error:`, err, 'useSocialAuth');
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  /**
   * Get linked providers for current user
   */
  const getLinkedProviders = useCallback(async (): Promise<SocialProvider[]> => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return [];
      }

      // Get identities from user
      const { data: identities } = await supabase.auth.getUserById(user.id);

      if (!identities) {
        return [];
      }

      return identities.identities?.map((id) => id.provider as SocialProvider) || [];
    } catch (err) {
      logger.error('Get linked providers error:', err, 'useSocialAuth');
      return [];
    }
  }, []);

  return {
    // State
    loading,
    loadingProvider,
    error,

    // Methods
    signInWithProvider,
    signInWithGoogle,
    signInWithApple,
    signInWithGithub,
    signInWithMicrosoft,
    signInWithFacebook,
    handleCallback,
    signOut,
    linkProvider,
    unlinkProvider,
    getLinkedProviders,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a provider is available
 */
export function isProviderAvailable(provider: SocialProvider): boolean {
  // This would check environment variables or Supabase config
  // For now, assume all are available if properly configured
  return true;
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: SocialProvider): string {
  const names: Record<SocialProvider, string> = {
    google: 'Google',
    apple: 'Apple',
    github: 'GitHub',
    microsoft: 'Microsoft',
    facebook: 'Facebook',
  };
  return names[provider];
}

/**
 * Get provider icon URL (for external use)
 */
export function getProviderIconUrl(provider: SocialProvider): string {
  const urls: Record<SocialProvider, string> = {
    google: '/icons/google.svg',
    apple: '/icons/apple.svg',
    github: '/icons/github.svg',
    microsoft: '/icons/microsoft.svg',
    facebook: '/icons/facebook.svg',
  };
  return urls[provider];
}
