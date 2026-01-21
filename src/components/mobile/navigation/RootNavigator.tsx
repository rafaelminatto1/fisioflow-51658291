/**
 * FisioFlow - Root Navigation Container
 * Main navigation structure for the mobile app
 */

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { ProTabsNavigator } from './ProTabs';
import { PatientTabsNavigator } from './PatientTabs';
import { Box, Typography } from '../core';
import { Button } from '../core';

/**
 * Mock Auth Screen - Will be replaced with actual auth
 */
function AuthScreen({ navigation }: any) {
  return (
    <Box className="flex-1 bg-sky-500 items-center justify-center p-6">
      <Box className="bg-white rounded-2xl p-8 w-full shadow-xl">
        {/* Logo */}
        <Box className="items-center mb-6">
          <Box className="w-16 h-16 bg-sky-500 rounded-2xl items-center justify-center mb-4">
            <Typography className="text-white text-3xl font-bold">F</Typography>
          </Box>
          <Typography className="text-2xl font-bold text-gray-900">FisioFlow</Typography>
          <Typography className="text-sm text-gray-600 mt-1">
            Fisioterapia na palma da mão
          </Typography>
        </Box>

        {/* Login Options */}
        <Box className="space-y-3 w-full">
          <Button
            onPress={() => navigation.navigate('ProApp')}
            className="w-full"
          >
            Entrar como Profissional
          </Button>

          <Button
            onPress={() => navigation.navigate('PatientApp')}
            variant="outline"
            className="w-full"
          >
            Entrar como Paciente
          </Button>
        </Box>

        {/* Demo Notice */}
        <Box className="mt-6 pt-4 border-t border-gray-200">
          <Typography className="text-xs text-center text-gray-500">
            Versão de demonstração
          </Typography>
          <Typography className="text-xs text-center text-gray-400 mt-1">
            Funcionalidades de login em desenvolvimento
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Loading Screen
 */
function LoadingScreen() {
  return (
    <Box className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator size="large" color="#0ea5e9" />
      <Typography className="text-muted-foreground mt-4">Carregando...</Typography>
    </Box>
  );
}

/**
 * Stack Navigator Types
 */
export type RootStackParamList = {
  Auth: undefined;
  ProApp: undefined;
  PatientApp: undefined;
};

/**
 * Root Stack Navigator
 */
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root Navigation Component
 */
export function RootNavigator() {
  // TODO: Implement actual auth state management
  // For now, always show auth screen
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'professional' | 'patient' | null>(null);

  useEffect(() => {
    // Simulate auth check
    const timer = setTimeout(() => {
      setIsLoading(false);
      // For demo, start at auth screen
      setIsAuthenticated(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : userRole === 'professional' ? (
        <Stack.Screen name="ProApp" component={ProTabsNavigator} />
      ) : (
        <Stack.Screen name="PatientApp" component={PatientTabsNavigator} />
      )}
    </Stack.Navigator>
  );
}

/**
 * App Navigation Container
 * Wraps the root navigator with NavigationContainer
 */
export function AppNavigation() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}
