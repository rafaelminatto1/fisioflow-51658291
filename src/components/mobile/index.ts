/**
 * Barrel export de componentes mobile
 * Facilita importações de componentes mobile
 */

// Shared Components
export { SafeAreaWrapper, SafeHeader, SafeFooter, SafeScreen, useSafeAreaInsets } from './shared/SafeAreaWrapper';
export { MobileTabBar, MobileLayout, useMobileTabBar } from './shared/MobileTabBar';
export { MobileAuth } from './shared/MobileAuth';

// Pro Components
export { ProApp, useProApp } from '../../pages/mobile/pro/ProApp';
export { ProDashboard } from './pro/ProDashboard';

// Patient Components
export { PatientApp } from '../../pages/mobile/PatientApp';
