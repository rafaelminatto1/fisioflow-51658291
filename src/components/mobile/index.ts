/**
 * Barrel export de componentes mobile
 * Facilita importações de componentes mobile
 */

// Core universal components (Web + React Native)
export * from './core';

// Navigation components (React Navigation)
export * from './navigation';

// Legacy Shared Components (Web-based, to be migrated)
export { SafeAreaWrapper, SafeHeader, SafeFooter, SafeScreen, useSafeAreaInsets } from './shared/SafeAreaWrapper';
export { MobileTabBar, MobileLayout, useMobileTabBar } from './shared/MobileTabBar';
export { MobileAuth } from './shared/MobileAuth';

// Pro Components
export { ProApp, useProApp } from '../../pages/mobile/pro/ProApp';
export { ProDashboard } from './pro/ProDashboard';

// Patient Components
export { PatientApp } from '../../pages/mobile/PatientApp';
