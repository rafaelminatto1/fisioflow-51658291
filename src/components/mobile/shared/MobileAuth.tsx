/**
 * MobileAuth - Componente de autenticação para iOS
 * Suporta login com email/senha e biometria (Face ID/Touch ID)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics } from '@capacitor/haptics';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SafeScreen } from './SafeAreaWrapper';
import { setupBiometricAuth, saveCredentialsForBiometric, hasSavedCredentials, getBiometricType } from '@/lib/mobile/biometric';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Mail, Fingerprint } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
});

type LoginForm = z.infer<typeof loginSchema>;

interface MobileAuthProps {
  onSuccess?: () => void;
}

/**
 * MobileAuth - Tela de login mobile
 */
export function MobileAuth({ onSuccess }: MobileAuthProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBiometricOption, setShowBiometricOption] = useState(false);
  const [biometricType, setBiometricType] = useState<'face' | 'touch' | 'none'>('none');

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  useEffect(() => {
    // Verificar se há credenciais salvas para mostrar opção biométrica
    const checkSavedCredentials = async () => {
      const hasSaved = await hasSavedCredentials();
      const type = await getBiometricType();

      setShowBiometricOption(hasSaved);
      setBiometricType(type);

      // Se tem credenciais salvas e é iOS, tentar login biométrico automaticamente
      if (hasSaved && Capacitor.getPlatform() === 'ios') {
        // Não fazer login automático, apenas mostrar a opção
        console.log('Credenciais salvas encontradas, aguardando input do usuário');
      }
    };

    checkSavedCredentials();
  }, []);

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      setError('');

      // Haptic feedback
      if (Capacitor.isNativePlatform()) {
        await Haptics.notification({ type: 'success' });
      }

      // Login com Supabase
      const { error: signInError, data } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (signInError) {
        // Haptic feedback de erro
        if (Capacitor.isNativePlatform()) {
          await Haptics.notification({ type: 'error' });
        }
        setError('Email ou senha incorretos');
        return;
      }

      // Salvar credenciais para biometria
      await saveCredentialsForBiometric(data.email, data.password);

      // Fechar teclado
      if (Capacitor.isNativePlatform()) {
        await Keyboard.hide();
      }

      // Chamar callback de sucesso ou navegar
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Erro no login:', err);
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setLoading(true);
      setError('');

      // Haptic feedback
      if (Capacitor.isNativePlatform()) {
        await Haptics.notification({ type: 'warning' });
      }

      const success = await setupBiometricAuth();

      if (success) {
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/');
        }
      } else {
        setError('Falha na autenticação biométrica');
      }
    } catch (err) {
      console.error('Erro no login biométrico:', err);
      setError('Erro ao fazer login biométrico');
    } finally {
      setLoading(false);
    }
  };

  const getBiometricIcon = () => {
    if (biometricType === 'face') {
      return '👤'; // Face ID
    }
    return '👆'; // Touch ID
  };

  return (
    <SafeScreen className="flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💆</span>
          </div>
          <CardTitle className="text-2xl">FisioFlow Pro</CardTitle>
          <CardDescription>
            {showBiometricOption
              ? 'Use biometria ou entre com suas credenciais'
              : 'Entre com suas credenciais para acessar'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Opção de Login Biométrico */}
          {showBiometricOption && (
            <Button
              variant="outline"
              className="w-full h-14 text-base"
              onClick={handleBiometricLogin}
              disabled={loading}
            >
              <Fingerprint className="h-5 w-5 mr-2" />
              Entrar com {biometricType === 'face' ? 'Face ID' : 'Touch ID'}
            </Button>
          )}

          {/* Separador */}
          {showBiometricOption && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou
                </span>
              </div>
            </div>
          )}

          {/* Form de Login */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  autoComplete="email"
                  disabled={loading}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="•••••••••"
                  className="pl-10"
                  autoComplete="current-password"
                  disabled={loading}
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Esqueceu senha */}
          <div className="text-center">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => navigate('/forgot-password')}
            >
              Esqueceu sua senha?
            </button>
          </div>
        </CardContent>
      </Card>
    </SafeScreen>
  );
}
