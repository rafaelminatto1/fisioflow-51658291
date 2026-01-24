import { Stack } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { ActivityIndicator, View } from 'react-native';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E293B' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="login" />
        </>
      )}
    </Stack>
  );
}
