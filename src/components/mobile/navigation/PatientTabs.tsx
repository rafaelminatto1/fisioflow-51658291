/**
 * FisioFlow - Patient App Navigation
 * React Navigation Bottom Tabs for Patient Users
 */

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';

import { Box } from '../core';
import { Typography } from '../core';

/**
 * Icon Components - Simple implementations for React Native
 */
function HomeIcon({ focused }: { focused: boolean }) {
  return <Typography className={`text-${focused ? 'primary' : 'muted-foreground'} text-xl`}>🏠</Typography>;
}

function ExerciseIcon({ focused }: { focused: boolean }) {
  return <Typography className={`text-${focused ? 'primary' : 'muted-foreground'} text-xl`}>🏃</Typography>;
}

function AppointmentIcon({ focused }: { focused: boolean }) {
  return <Typography className={`text-${focused ? 'primary' : 'muted-foreground'} text-xl`}>📅</Typography>;
}

function ProgressIcon({ focused }: { focused: boolean }) {
  return <Typography className={`text-${focused ? 'primary' : 'muted-foreground'} text-xl`}>📈</Typography>;
}

function SettingsIcon({ focused }: { focused: boolean }) {
  return <Typography className={`text-${focused ? 'primary' : 'muted-foreground'} text-xl`}>⚙️</Typography>;
}

/**
 * Tab Screens - Placeholder screens
 */
function HomeScreen() {
  return (
    <Box className="flex-1 items-center justify-center bg-background p-6">
      <Typography className="text-3xl font-bold text-primary mb-4">FisioFlow</Typography>
      <Typography className="text-xl text-center text-foreground mb-2">Bem-vindo!</Typography>
      <Typography className="text-sm text-center text-muted-foreground">
        Área do paciente - Dashboard em desenvolvimento...
      </Typography>
    </Box>
  );
}

function ExercisesScreen() {
  return (
    <Box className="flex-1 items-center justify-center bg-background p-6">
      <Typography className="text-2xl font-bold">Meus Exercícios</Typography>
      <Typography className="text-muted-foreground mt-2">Em desenvolvimento...</Typography>
    </Box>
  );
}

function AppointmentsScreen() {
  return (
    <Box className="flex-1 items-center justify-center bg-background p-6">
      <Typography className="text-2xl font-bold">Minhas Consultas</Typography>
      <Typography className="text-muted-foreground mt-2">Em desenvolvimento...</Typography>
    </Box>
  );
}

function ProgressScreen() {
  return (
    <Box className="flex-1 items-center justify-center bg-background p-6">
      <Typography className="text-2xl font-bold">Meu Progresso</Typography>
      <Typography className="text-muted-foreground mt-2">Em desenvolvimento...</Typography>
    </Box>
  );
}

function SettingsScreen() {
  return (
    <Box className="flex-1 items-center justify-center bg-background p-6">
      <Typography className="text-2xl font-bold">Configurações</Typography>
      <Typography className="text-muted-foreground mt-2">Em desenvolvimento...</Typography>
    </Box>
  );
}

/**
 * Patient Tabs Navigator
 */
const Tab = createBottomTabNavigator();

export function PatientTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 85 : 65,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="PatientHome"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ focused }) => <HomeIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Exercises"
        component={ExercisesScreen}
        options={{
          tabBarLabel: 'Exercícios',
          tabBarIcon: ({ focused }) => <ExerciseIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarLabel: 'Consultas',
          tabBarIcon: ({ focused }) => <AppointmentIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarLabel: 'Progresso',
          tabBarIcon: ({ focused }) => <ProgressIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="PatientSettings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Mais',
          tabBarIcon: ({ focused }) => <SettingsIcon focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
