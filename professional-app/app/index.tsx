import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export default function Index() {
  const { isAuthenticated, user } = useAuthStore();

  // If authenticated and is a professional, go to professional tabs
  if (isAuthenticated && user && (user.role === 'professional' || user.role === 'admin')) {
    return <Redirect href="/(tabs)" />;
  }

  // Otherwise, go to login
  return <Redirect href="/(auth)/login" />;
}
