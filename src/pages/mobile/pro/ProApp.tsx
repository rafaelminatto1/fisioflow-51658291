/**
 * ProApp - Entry Point do Aplicativo iOS para Profissionais
 *
 * Este é o componente principal que será carregado quando um usuário
 * com role de profissional (fisioterapeuta, admin, estagiario) acessar o app
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { MobileLayout } from '@/components/mobile/shared/MobileTabBar';
import { SafeScreen } from '@/components/mobile/shared/SafeAreaWrapper';
import { ProDashboard } from '@/components/mobile/pro/ProDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { setupBiometricAuth } from '@/lib/mobile/biometric';
import { initPushNotifications } from '@/lib/mobile/push-notifications';

/**
 * Tela de loading para mostrar durante inicialização
 */
function LoadingScreen() {
  return (
    <SafeScreen className="flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando FisioFlow Pro...</p>
      </div>
    </SafeScreen>
  );
}

/**
 * ProApp - Componente principal do app profissional
 */
export function ProApp() {
  const { user, loading: authLoading } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setIsInitializing(false);
      return;
    }

    // Inicializar features nativas do iOS
    const initializeApp = async () => {
      try {
        // Configurar StatusBar (barra de status do iOS)
        await StatusBar.setStyle({ style: 'light' });
        await StatusBar.setBackgroundColor({ color: '#0ea5e9' });

        // Inicializar push notifications
        await initPushNotifications();

        // Tentar login biométrico se disponível
        const biometricSuccess = await setupBiometricAuth();
        if (biometricSuccess) {
          console.log('Login biométrico bem-sucedido');
        }
      } catch (error) {
        console.error('Erro ao inicializar app:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  // Redirecionar para login se não autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Mostrar loading durante inicialização ou autenticação
  if (isInitializing || authLoading) {
    return <LoadingScreen />;
  }

  // Redirecionar para login se não há usuário
  if (!user) {
    return null;
  }

  return (
    <MobileLayout userRole="professional" showTabBar={true}>
      <ProDashboard />
    </MobileLayout>
  );
}

/**
 * Hook customizado para usar o ProApp
 */
export function useProApp() {
  const { user } = useAuth();

  return {
    user,
    isProfessional: true,
    // Verificar se é admin
    isAdmin: user?.user_metadata?.role === 'admin',
    // Verificar se é estagiário (permissões limitadas)
    isIntern: user?.user_metadata?.role === 'estagiario',
    // Verificar se é fisioterapeuta
    isTherapist: user?.user_metadata?.role === 'fisioterapeuta'
  };
}
