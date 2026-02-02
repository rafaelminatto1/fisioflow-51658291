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
  accent: string; // Coral warmth para destaque
  success: string;
  warning: string;
  error: string;
  tabIconDefault: string;
}

const lightColors: ThemeColors = {
  // Primary - Baby Blue (cor principal da marca)
  primary: '#0284C7',
  background: '#FAFAF9',
  card: '#FFFFFF',
  text: '#1C1917',
  textSecondary: '#57534E',
  border: '#E7E5E4',
  // Secondary - Logo Original Blue (Activity brand)
  notification: '#5EB3E6',
  // Accent - Coral (calor quente para destaque)
  accent: '#F97316',
  success: '#22C55E',
  warning: '#EAB308',
  error: '#EF4444',
  tabIconDefault: '#78716C',
};

const darkColors: ThemeColors = {
  // Primary - Baby Blue (adapted for dark mode)
  primary: '#38BDF8',
  background: '#0C0A09',
  card: '#1C1917',
  text: '#FAFAF9',
  textSecondary: '#A8A29E',
  border: '#292524',
  // Secondary - Logo Original Blue (adapted for dark mode)
  notification: '#7DD3FC',
  // Accent - Coral (adapted for dark mode)
  accent: '#FB923C',
  success: '#4ADE80',
  warning: '#FACC15',
  error: '#F87171',
  tabIconDefault: '#94A3B8',
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
