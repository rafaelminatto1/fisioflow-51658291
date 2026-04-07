import { useState, useEffect } from 'react';

export type DefaultViewMode = 'notion' | 'classic';

export interface EvolutionSettings {
  defaultView: DefaultViewMode;
  enableSuggestions: boolean;
  disabledCommands: string[];
  commandOrder: string[]; 
}

const DEFAULT_SETTINGS: EvolutionSettings = {
  defaultView: 'notion',
  enableSuggestions: true,
  disabledCommands: [],
  commandOrder: [] // Empty means default order
};

const STORAGE_KEY = 'fisioflow_evolution_settings';

export function useEvolutionSettings() {
  const [settings, setSettings] = useState<EvolutionSettings>(() => {
    try {
      const item = window.localStorage.getItem(STORAGE_KEY);
      return item ? { ...DEFAULT_SETTINGS, ...JSON.parse(item) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error reading evolution settings from localStorage', error);
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving evolution settings to localStorage', error);
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<EvolutionSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings
    }));
  };

  const toggleCommand = (commandId: string) => {
    setSettings((prev) => {
      const isDisabled = prev.disabledCommands.includes(commandId);
      const newDisabled = isDisabled 
        ? prev.disabledCommands.filter(id => id !== commandId)
        : [...prev.disabledCommands, commandId];

      return {
        ...prev,
        disabledCommands: newDisabled
      };
    });
  };

  const reorderCommands = (newOrder: string[]) => {
    setSettings(prev => ({
      ...prev,
      commandOrder: newOrder
    }));
  };

  return {
    settings,
    updateSettings,
    toggleCommand,
    reorderCommands
  };
}
