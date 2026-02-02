import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

// Custom themes with FisioFlow brand colors
// Based on Activity Fisioterapia logo - Baby Blue palette
const FisioFlowLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    // Primary - Baby Blue (cor principal da marca)
    primary: '#0284C7',
    background: '#FAFAF9',
    card: '#FFFFFF',
    text: '#1C1917',
    border: '#E7E5E4',
    // Secondary - Logo Original Blue (Activity brand color)
    notification: '#5EB3E6',
    // Accent - Coral (cor quente para destaque)
    accent: '#F97316',
    success: '#22C55E',
    warning: '#EAB308',
    error: '#EF4444',
  },
};

const FisioFlowDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    // Primary - Baby Blue (adapted for dark mode)
    primary: '#38BDF8',
    background: '#0C0A09',
    card: '#1C1917',
    text: '#FAFAF9',
    border: '#292524',
    // Secondary - Logo Original Blue (adapted for dark mode)
    notification: '#7DD3FC',
    // Accent - Coral (adapted for dark mode)
    accent: '#FB923C',
    success: '#4ADE80',
    warning: '#FACC15',
    error: '#F87171',
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Use user's system preference for color scheme
  const theme = colorScheme === 'light' ? FisioFlowLightTheme : FisioFlowDarkTheme;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
