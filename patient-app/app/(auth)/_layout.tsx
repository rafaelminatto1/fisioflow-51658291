import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';

export default function AuthLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="index" redirect="login" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" options={{ presentation: 'card' }} />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="link-professional" options={{ presentation: 'card' }} />
    </Stack>
  );
}
