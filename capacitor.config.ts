import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fisioflow.app',
  appName: 'FisioFlow',
  webDir: 'dist',
  // Configuração do servidor removida para usar build local
  // Para desenvolvimento com hot reload, descomente a seção server abaixo:
  // server: {
  //   url: 'https://5aa177ed-5a71-4e0d-9acb-d82af5218253.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0EA5E9',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
