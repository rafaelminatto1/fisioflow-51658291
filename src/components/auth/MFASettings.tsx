/**
 * MFA Settings Component
 * Componente React para gerenciar autenticação multi-fator
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QRCodeSVG } from 'qrcode.react';
import { mfaService } from '@/lib/auth/mfa';
import { logger } from '@/lib/errors/logger';

interface MFASettingsProps {
  userId: string;
}

export function MFASettings({ userId }: MFASettingsProps) {
  const [loading, setLoading] = useState(false);
  const [hasMFA, setHasMFA] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showEnroll, setShowEnroll] = useState(false);

  useEffect(() => {
    checkMFAStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function checkMFAStatus() {
    try {
      const enabled = await mfaService.hasMFAEnabled(userId);
      setHasMFA(enabled);
    } catch (err) {
      logger.error('Error checking MFA status', err, 'MFASettings');
    }
  }

  async function handleEnrollMFA() {
    setLoading(true);
    setError('');

    try {
      const result = await mfaService.enrollMFA(userId, 'Google Authenticator');
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setFactorId(result.factorId);
      setShowEnroll(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao configurar MFA');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyMFA() {
    setLoading(true);
    setError('');

    try {
      const verified = await mfaService.verifyMFAEnrollment(factorId, code);

      if (verified) {
        setSuccess('MFA configurado com sucesso!');
        setHasMFA(true);
        setShowEnroll(false);
        setCode('');
        setQrCode('');
        setSecret('');

        // Update database
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ mfa_enabled: true })
          .eq('id', userId);

        if (updateError) {
          logger.error('Error updating MFA status', updateError, 'MFASettings');
        }
      } else {
        setError('Código inválido. Tente novamente.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar código');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisableMFA() {
    if (!confirm('Tem certeza que deseja desabilitar MFA? Isso reduzirá a segurança da sua conta.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const factors = await mfaService.getEnrolledFactors(userId);

      if (factors.length > 0 && factors[0].factors.length > 0) {
        await mfaService.unenrollMFA(factors[0].factors[0].id);
      }

      setHasMFA(false);
      setSuccess('MFA desabilitado com sucesso');

      // Update database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ mfa_enabled: false })
        .eq('id', userId);

      if (updateError) {
        logger.error('Error updating MFA status', updateError, 'MFASettings');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao desabilitar MFA');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Autenticação Multi-Fator (MFA)</CardTitle>
        <CardDescription>
          Adicione uma camada extra de segurança à sua conta usando um aplicativo autenticador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="default" className="border-green-500 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {!showEnroll ? (
          <div className="space-y-4">
            {hasMFA ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">MFA está habilitado</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sua conta está protegida com autenticação multi-fator.
                </p>
                <Button
                  variant="outline"
                  onClick={handleDisableMFA}
                  disabled={loading}
                >
                  Desabilitar MFA
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-yellow-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">MFA não está habilitado</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Recomendamos fortemente habilitar MFA para proteger sua conta.
                </p>
                <Button
                  onClick={handleEnrollMFA}
                  disabled={loading}
                >
                  {loading ? 'Configurando...' : 'Habilitar MFA'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Passo 1: Escaneie o QR Code</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use um aplicativo autenticador (Google Authenticator, Authy, etc.) para escanear este QR code:
              </p>
              <div className="flex justify-center p-4 bg-white rounded-lg border">
                {qrCode && <QRCodeSVG value={qrCode} size={200} />}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Ou digite manualmente: {secret}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Passo 2: Insira o código</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Digite o código de 6 dígitos do seu aplicativo autenticador:
              </p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="flex-1 px-3 py-2 border rounded-lg text-center text-2xl tracking-widest"
                  autoFocus
                />
                <Button
                  onClick={handleVerifyMFA}
                  disabled={loading || code.length !== 6}
                >
                  {loading ? 'Verificando...' : 'Verificar'}
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => {
                setShowEnroll(false);
                setQrCode('');
                setSecret('');
                setCode('');
                setError('');
              }}
            >
              Cancelar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * MFA Verification Component for Login
 */
interface MFALoginProps {
  factorId: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function MFALogin({ factorId, onVerified, onCancel }: MFALoginProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  async function handleVerify() {
    if (code.length !== 6) {
      setError('Por favor, insira o código de 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const challenge = await mfaService.createChallenge(factorId);
      const verified = await mfaService.verifyChallenge(challenge.id, code);

      if (verified) {
        onVerified();
      } else {
        setError('Código inválido');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar código');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Verificação em Duas Etapas</CardTitle>
        <CardDescription>
          Digite o código do seu aplicativo autenticador
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <input
          type="text"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="w-full px-3 py-2 border rounded-lg text-center text-2xl tracking-widest"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
        />

        <div className="flex space-x-2">
          <Button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="flex-1"
          >
            {loading ? 'Verificando...' : 'Verificar'}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
