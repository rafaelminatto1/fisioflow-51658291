import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ColorScheme = 'light' | 'dark' | null;

interface ThemeColors {
  primary: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  notification: string;
  success: string;
  warning: string;
  error: string;
  tabIconDefault: string;
}

const lightColors: ThemeColors = {
  primary: '#2563eb',
  background: '#ffffff',
  card: '#f8fafc',
  text: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  notification: '#2563eb',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  tabIconDefault: '#94a3b8',
};

const darkColors: ThemeColors = {
  primary: '#3b82f6',
  background: '#0f172a',
  card: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  border: '#334155',
  notification: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  tabIconDefault: '#64748b',
};

interface ThemeContextValue {
  colorScheme: 'light' | 'dark';
  colors: ThemeColors;
  setColorScheme: (scheme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = '@fisioflow:theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [userPreference, setUserPreference] = useState<'light' | 'dark' | null>(null);

  // Load saved theme preference
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setUserPreference(saved);
      }
    });
  }, []);

  const colorScheme: 'light' | 'dark' = userPreference || systemColorScheme || 'dark';
  const colors = colorScheme === 'dark' ? darkColors : lightColors;

  const setColorScheme = async (scheme: 'light' | 'dark') => {
    setUserPreference(scheme);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, scheme);
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, colors, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
