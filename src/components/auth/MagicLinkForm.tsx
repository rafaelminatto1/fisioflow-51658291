/**
 * Magic Link Authentication Form
 *
 * Passwordless login form for patients using email magic links.
 * Provides a frictionless authentication experience.
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Alert, AlertDescription } from '@/components/shared/ui/alert';
import { Loader2, Mail, ArrowLeft, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useMagicLinkAuth } from '@/hooks/useMagicLinkAuth';

// ============================================================================
// TYPES
// ============================================================================

interface MagicLinkFormProps {
  userType?: 'patient' | 'therapist' | 'admin';
  onBack?: () => void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  redirectTo?: string;
  showBackButton?: boolean;
  className?: string;
}

// ============================================================================
// MAGIC LINK FORM COMPONENT
// ============================================================================

export function MagicLinkForm({
  userType = 'patient',
  onBack,
  onSuccess,
  onError,
  redirectTo,
  showBackButton = true,
  className = '',
}: MagicLinkFormProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const {
    loading,
    sent,
    countdown,
    error,
    sendMagicLink,
    reset,
  } = useMagicLinkAuth({
    onSuccess,
    onError,
  });

  const validateEmail = useCallback((emailAddress: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailAddress);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate email
      if (!email.trim()) {
        setEmailError('Por favor, insira seu email');
        return;
      }

      if (!validateEmail(email)) {
        setEmailError('Por favor, insira um email válido');
        return;
      }

      setEmailError(null);

      // Send magic link
      await sendMagicLink(email.trim(), {
        userType,
        redirectTo,
      });
    },
    [email, userType, redirectTo, sendMagicLink, validateEmail]
  );

  const handleResend = useCallback(async () => {
    reset();
    await sendMagicLink(email.trim(), {
      userType,
      redirectTo,
    });
  }, [email, userType, redirectTo, sendMagicLink, reset]);

  const handleTryDifferent = useCallback(() => {
    reset();
    setEmail('');
    setEmailError(null);
  }, [reset]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Back Button */}
      {showBackButton && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Voltar
        </button>
      )}

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center">
          {sent ? 'Verifique seu email' : 'Acesso sem senha'}
        </h2>
        <p className="text-sm text-muted-foreground text-center">
          {sent
            ? 'Enviamos um link de acesso para o email informado.'
            : userType === 'patient'
            ? 'Receba um link de acesso direto no seu email. Sem senhas para memorizar!'
            : 'Acesse sua conta sem senha usando um link mágico.'}
        </p>
      </div>

      {/* Form */}
      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="magic-link-email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="magic-link-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              className="h-11"
              required
              autoComplete="email"
              disabled={loading}
            />
            {emailError && (
              <span className="text-xs text-destructive font-medium">{emailError}</span>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="animate-slide-up-fade">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-150 active:scale-[0.98]"
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Enviar link de acesso
              </>
            )}
          </Button>
        </form>
      ) : (
        /* Success State */
        <div className="space-y-4">
          <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-sm text-green-800 dark:text-green-300">
              Link enviado para <strong>{email}</strong>
            </AlertDescription>
          </Alert>

          <div className="text-center space-y-3 py-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>O link expira em 10 minutos</span>
            </div>

            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Não recebeu o email? Verifique sua caixa de spam ou tente novamente.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 text-sm"
              onClick={handleTryDifferent}
              disabled={loading}
            >
              Tentar outro email
            </Button>
            <Button
              type="button"
              className="flex-1 h-10 text-sm"
              onClick={handleResend}
              disabled={loading || countdown > 0}
            >
              {countdown > 0 ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  {formatTime(countdown)}
                </>
              ) : (
                'Reenviar'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="pt-4 border-t border-border/50">
        <p className="text-xs text-center text-muted-foreground">
          <svg className="inline-block w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Link seguro e válido por 10 minutos. Apenas você pode acessá-lo.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// PATIENT MAGIC LINK CARD
// ============================================================================

interface PatientMagicLinkCardProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  redirectTo?: string;
}

export function PatientMagicLinkCard({
  onSuccess,
  onError,
  redirectTo,
}: PatientMagicLinkCardProps) {
  return (
    <div className="w-full max-w-md space-y-6 animate-fade-in">
      <MagicLinkForm
        userType="patient"
        onSuccess={onSuccess}
        onError={onError}
        redirectTo={redirectTo}
        showBackButton={false}
      />

      <p className="text-xs text-center text-muted-foreground">
        Ao continuar, você concorda com nossos{' '}
        <a href="/terms" className="underline underline-offset-4 hover:text-foreground transition-colors">
          Termos de Serviço
        </a>{' '}
        e{' '}
        <a href="/privacy" className="underline underline-offset-4 hover:text-foreground transition-colors">
          Política de Privacidade
        </a>
        .
      </p>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default MagicLinkForm;
