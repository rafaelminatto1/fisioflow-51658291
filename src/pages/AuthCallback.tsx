/**
 * Auth Callback Page
 *
 * Handles authentication callbacks from:
 * - OAuth providers (Google, Apple, GitHub, etc.)
 * - Magic Links (email OTP)
 * - Phone OTP verification
 *
 * This page processes the redirect from Supabase Auth and
 * redirects users to the appropriate location based on user type.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { logger } from '@/lib/errors/logger';

type CallbackStatus = 'loading' | 'success' | 'error';

type AuthError = {
  message: string;
  code?: string;
  description?: string;
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [error, setError] = useState<AuthError | null>(null);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL parameters
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        const type = searchParams.get('type') || searchParams.get('userType');

        setUserType(type);

        // Handle errors
        if (error) {
          throw new Error(errorDescription || error);
        }

        // Get session from Supabase
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!sessionData.session) {
          // No session - might need to wait for token exchange
          // Check if we have access_token in hash
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');

          if (accessToken) {
            // Wait a bit for Supabase to process the session
            await new Promise(resolve => setTimeout(resolve, 1000));

            const { data: retryData, error: retryError } = await supabase.auth.getSession();

            if (retryError || !retryData.session) {
              throw new Error('Falha ao estabelecer sessão. O link pode ter expirado.');
            }
          } else {
            throw new Error('Nenhuma sessão encontrada. Faça login novamente.');
          }
        }

        const user = sessionData.session.user;
        logger.info('Auth callback processado', { userId: user?.id, type }, 'AuthCallback');

        setStatus('success');

        // Determine redirect destination
        const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirect') || '/';

        // Check user type from metadata or params
        const resolvedUserType = type || user?.user_metadata?.user_type || 'patient';

        // Show success toast
        toast({
          title: 'Login realizado com sucesso!',
          description: `Bem-vindo${user?.user_metadata?.full_name ? ', ' + user.user_metadata.full_name : ''}!`,
        });

        // Redirect based on user type
        setTimeout(() => {
          if (resolvedUserType === 'patient') {
            navigate(`/paciente/dashboard${returnUrl !== '/' ? `?redirect=${encodeURIComponent(returnUrl)}` : ''}`, {
              replace: true,
            });
          } else {
            navigate(returnUrl, { replace: true });
          }
        }, 1500);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro na autenticação';
        setError({
          message: errorMessage,
          code: searchParams.get('error_code') || undefined,
        });
        setStatus('error');
        logger.error('Erro no callback de autenticação', err, 'AuthCallback');
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  const handleTryAgain = () => {
    navigate('/auth', { replace: true });
  };

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <AuthLayout>
      <Card className="border-border/50 shadow-xl bg-background/80 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-6 min-h-[400px]">
            {status === 'loading' && (
              <>
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    {userType === 'patient' ? (
                      <Mail className="w-10 h-10 text-primary animate-pulse" />
                    ) : (
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    )}
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <h2 className="text-xl font-semibold">Verificando autenticação...</h2>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {userType === 'patient'
                      ? 'Estamos confirmando seu acesso. Um momento, por favor.'
                      : 'Estabelecendo sua sessão segura.'}
                  </p>
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">
                    Login realizado!
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Redirecionando para o dashboard...
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Carregando...</span>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-destructive" />
                  </div>
                </div>

                <div className="space-y-3 text-center max-w-sm">
                  <h2 className="text-xl font-semibold text-destructive">
                    Erro na autenticação
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {error?.message || 'Ocorreu um erro ao processar sua autenticação.'}
                  </p>
                  {error?.code && (
                    <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                      Código: {error.code}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 w-full max-w-xs">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleTryAgain}
                  >
                    Tentar novamente
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleGoHome}
                  >
                    Ir para home
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground text-center max-w-xs">
                  <p>Possíveis causas:</p>
                  <ul className="mt-2 space-y-1 text-left">
                    <li>• O link de acesso expirou (links valem 10 minutos)</li>
                    <li>• O link já foi utilizado</li>
                    <li>• Há um problema com sua conexão</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
