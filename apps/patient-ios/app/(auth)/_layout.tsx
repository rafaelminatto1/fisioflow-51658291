import { Stack } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../../lib/constants';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        </>
      )}
    </Stack>
  );
}
