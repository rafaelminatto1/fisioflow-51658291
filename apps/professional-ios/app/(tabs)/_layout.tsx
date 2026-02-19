import { Tabs } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { HapticFeedback } from '@/lib/haptics';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { useState } from 'react';

import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Tab icons configuration
const tabs = [
  {
    name: 'index',
    title: 'Início',
    icon: 'home',
    filledIcon: 'home',
  },
  {
    name: 'agenda',
    title: 'Agenda',
    icon: 'calendar',
    filledIcon: 'calendar-check',
  },
  {
    name: 'patients',
    title: 'Pacientes',
    icon: 'users',
    filledIcon: 'users',
  },
  {
    name: 'exercises',
    title: 'Exercícios',
    icon: 'dumbbell',
    filledIcon: 'dumbbell',
  },
  {
    name: 'profile',
    title: 'Perfil',
    icon: 'user',
    filledIcon: 'user',
  },
] as const;

function TabBarButton({
  route,
  isFocused,
  onPress,
  onLongPress,
  colors,
}: {
  route: (typeof tabs)[number];
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  colors: any;
}) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.9, { damping: 15 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15 });
    }, 100);

    // Haptic feedback on iOS
    if (Platform.OS === 'ios') {
      HapticFeedback.light();
    }

    onPress();
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={route.title}
      onLayout={() => {}}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={[styles.tabButton, animatedStyle]}
    >
      <Icon
        name={isFocused ? route.filledIcon : route.icon}
        size={24}
        color={isFocused ? colors.primary : colors.tabIconDefault}
      />
      <Animated.Text
        style={[
          styles.tabLabel,
          { color: isFocused ? colors.primary : colors.tabIconDefault },
        ]}
      >
        {route.title}
      </Animated.Text>
    </AnimatedPressable>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const [currentTab, setCurrentTab] = useState('index');

  return (
    <>
      <Tabs
        screenListeners={{
          tabPress: (e) => {
            if (Platform.OS === 'ios') {
              HapticFeedback.selection();
            }
          },
        }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 88 : 68,
            paddingBottom: Platform.OS === 'ios' ? 34 : 10,
            paddingTop: 8,
            elevation: 0,
            shadowOpacity: 0,
            shadowRadius: 0,
            shadowOffset: { width: 0, height: 0 },
          },
          tabBarShowLabel: false,
        }}
      >
        {tabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ color, focused }) => (
                <Icon
                  name={focused ? tab.filledIcon : tab.icon}
                  size={24}
                  color={color}
                />
              ),
            }}
          />
        ))}
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44, // WCAG minimum touch target
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
