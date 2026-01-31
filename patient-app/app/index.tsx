import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export default function Index() {
  const { isAuthenticated, user } = useAuthStore();

  // If authenticated and is a patient, go to patient tabs
  if (isAuthenticated && user) {
    return <Redirect href="/(tabs)" />;
  }

  // Otherwise, go to login
  return <Redirect href="/(auth)/login" />;
}
