import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

// Custom themes with FisioFlow brand colors
const FisioFlowLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2563eb',
    background: '#ffffff',
    card: '#f8fafc',
    text: '#0f172a',
    border: '#e2e8f0',
    notification: '#2563eb',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  },
};

const FisioFlowDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#3b82f6',
    background: '#0f172a',
    card: '#1e293b',
    text: '#f1f5f9',
    border: '#334155',
    notification: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Default to dark mode as per 2026 UX trends
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
