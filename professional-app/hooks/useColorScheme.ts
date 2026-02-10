import { useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme, Appearance } from 'react-native';
import { Colors, ColorScheme } from '@/constants/colors';

export function useColorScheme(): ColorScheme {
  const colorScheme = useRNColorScheme();
  return colorScheme ?? 'light';
}

export function useColors() {
  const colorScheme = useColorScheme();
  return Colors[colorScheme];
}

// Hook para obter o esquema de cores atual sem depender do ciclo de renderização
export function useCurrentColorScheme(): ColorScheme {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    Appearance.getColorScheme() ?? 'light'
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme: newScheme }) => {
      setColorScheme(newScheme ?? 'light');
    });

    return () => subscription.remove();
  }, []);

  return colorScheme;
}
