/**
 * FisioFlow - Professional App Navigation
 * React Navigation Bottom Tabs for Professional Users
 */

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';

// Import icons - using a simpler approach for React Native
// We'll create icon components that work on both platforms

/**
 * Icon Components - Simple SVG implementations for React Native
 * For now, using emoji/text as placeholders until we integrate proper icons
 */
function HomeIcon({ focused }: { focused: boolean }) {
  return <Box className={`text-${focused ? 'primary' : 'muted-foreground'}`}>🏠</Box>;
}

function CalendarIcon({ focused }: { focused: boolean }) {
  return <Box className={`text-${focused ? 'primary' : 'muted-foreground'}`}>📅</Box>;
}

function UsersIcon({ focused }: { focused: boolean }) {
  return <Box className={`text-${focused ? 'primary' : 'muted-foreground'}`}>👥</Box>;
}

function SessionsIcon({ focused }: { focused: boolean }) {
  return <Box className={`text-${focused ? 'primary' : 'muted-foreground'}`}>📋</Box>;
}

function SettingsIcon({ focused }: { focused: boolean }) {
  return <Box className={`text-${focused ? 'primary' : 'muted-foreground'}`}>⚙️</Box>;
}

import { Box } from '../core';
import { Typography } from '../core';

/**
 * Tab Screens - Placeholder screens for now
 * These will be replaced with actual screen components
 */
function DashboardScreen() {
  return (
    <Box className="flex-1 items-center justify-center bg-background">
      <Typography className="text-2xl font-bold">Dashboard Profissional</Typography>
      <Typography className="text-muted-foreground mt-2">Em desenvolvimento...</Typography>
    </Box>
  );
}

function CalendarScreen() {
  return (
    <Box className="flex-1 items-center justify-center bg-background">
      <Typography className="text-2xl font-bold">Agenda</Typography>
      <Typography className="text-muted-foreground mt-2">Em desenvolvimento...</Typography>
    </Box>
  );
}

function PatientsScreen() {
  return (
    <Box className="flex-1 items-center justify-center bg-background">
      <Typography className="text-2xl font-bold">Pacientes</Typography>
      <Typography className="text-muted-foreground mt-2">Em desenvolvimento...</Typography>
    </Box>
  );
}

function SessionsScreen() {
  return (
    <Box className="flex-1 items-center justify-center bg-background">
      <Typography className="text-2xl font-bold">Sessões</Typography>
      <Typography className="text-muted-foreground mt-2">Em desenvolvimento...</Typography>
    </Box>
  );
}

function SettingsScreen() {
  return (
    <Box className="flex-1 items-center justify-center bg-background">
      <Typography className="text-2xl font-bold">Configurações</Typography>
      <Typography className="text-muted-foreground mt-2">Em desenvolvimento...</Typography>
    </Box>
  );
}

/**
 * Professional Tabs Navigator
 */
const Tab = createBottomTabNavigator();

export function ProTabsNavigator() {
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
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ focused }) => <HomeIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Agenda',
          tabBarIcon: ({ focused }) => <CalendarIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Patients"
        component={PatientsScreen}
        options={{
          tabBarLabel: 'Pacientes',
          tabBarIcon: ({ focused }) => <UsersIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Sessions"
        component={SessionsScreen}
        options={{
          tabBarLabel: 'Sessões',
          tabBarIcon: ({ focused }) => <SessionsIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Mais',
          tabBarIcon: ({ focused }) => <SettingsIcon focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
