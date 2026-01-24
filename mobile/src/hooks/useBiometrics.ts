import * as LocalAuthentication from 'expo-local-authentication';
import { useState, useEffect } from 'react';

export function useBiometrics() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsSupported(compatible);
    })();
  }, []);

  const authenticate = async () => {
    if (!isSupported) return false;
    
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Login FisioFlow',
      fallbackLabel: 'Usar senha',
    });

    return result.success;
  };

  return { isSupported, authenticate };
}
