
/**
 * Hook para gerenciar configurações dinâmicas e Feature Flags
 */

import { useState, useEffect } from 'react';
import { getRemoteConfig, getValue, fetchAndActivate } from 'firebase/remote-config';
import { app } from '@/integrations/firebase/app';

export const useRemoteConfig = (key: string, defaultValue: unknown) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const remoteConfig = getRemoteConfig(app);
    remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hora em cache

    const fetchConfig = async () => {
      try {
        await fetchAndActivate(remoteConfig);
        const val = getValue(remoteConfig, key);
        
        if (typeof defaultValue === 'boolean') {
          setValue(val.asBoolean());
        } else if (typeof defaultValue === 'number') {
          setValue(val.asNumber());
        } else {
          setValue(val.asString());
        }
      } catch (err) {
        console.warn(`RemoteConfig error for key ${key}:`, err);
      }
    };

    fetchConfig();
  }, [key, defaultValue]);

  return value;
};

// Exemplos de flags para o FisioFlow
export const useFeatureFlags = () => {
  const enableAI = useRemoteConfig('feature_ai_summary', true);
  const enableGoniometry = useRemoteConfig('feature_goniometry_v2', false); // Pode ser liberado gradualmente
  const maintenanceMode = useRemoteConfig('maintenance_mode', false);

  return { enableAI, enableGoniometry, maintenanceMode };
};
