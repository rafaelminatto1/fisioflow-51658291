/**
 * MobileRouter - Router baseado em role para apps móveis
 *
 * Este componente direciona o usuário para o app apropriado
 * baseado no seu role (profissional vs paciente)
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ProApp } from './pro/ProApp';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Componente principal que rooteia para PRO ou Patient app
 */
export default function MobileRouter() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para login se não autenticado
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Se ainda está carregando autenticação
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Se não há usuário, retorna null (vai redirecionar pelo useEffect)
  if (!user) {
    return null;
  }

  // Determinar o role do usuário
  const role = user?.user_metadata?.role || user?.app_metadata?.role;

  // PACIENTE vai para o PatientApp existente
  if (role === 'paciente') {
    // Importar dinamicamente o PatientApp para evitar circular dependency
    const { PatientApp } = require('./patient/PatientApp');
    return <PatientApp />;
  }

  // PROFISSIONAIS (admin, fisioterapeuta, estagiario) vão para ProApp
  return <ProApp />;
}

/**
 * Hook para determinar se está em ambiente mobile
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Verifica se está em plataforma nativa (Capacitor)
    setIsMobile(Capacitor.isNativePlatform());

    // Verifica tamanho da tela (fallback para web)
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', checkScreenSize);
    checkScreenSize();

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  return isMobile;
}

/**
 * Hook para obter o role do usuário atual
 */
export function useUserRole(): 'professional' | 'patient' | null {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const role = user?.user_metadata?.role || user?.app_metadata?.role;

  return role === 'paciente' ? 'patient' : 'professional';
}

import { useState } from 'react';
