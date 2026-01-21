/**
 * FisioFlow - Expo Mobile App Entry Point
 * Ponto de entrada para o app React Native via Expo
 * Usa React Navigation + NativeWind v4
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigation } from './src/components/mobile/navigation';

/**
 * Componente principal do app FisioFlow
 * Configuração:
 * - React Navigation para navegação
 * - NativeWind v4 para estilos Tailwind
 * - Safe Area handling automático
 */
export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <AppNavigation />
    </>
  );
}
