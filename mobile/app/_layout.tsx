import { Slot } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import '../global.css';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}