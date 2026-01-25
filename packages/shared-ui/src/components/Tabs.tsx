/**
 * FisioFlow Design System - Tabs Component
 *
 * Tab navigation and segmented control components
 * Supports scrollable tabs and icon support
 */

import React, { ReactNode, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  LayoutChangeEvent,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type TabSize = 'sm' | 'md' | 'lg';

export interface TabItem {
  /** Tab identifier */
  value: string;
  /** Tab label */
  label: string;
  /** Tab icon */
  icon?: ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Badge count */
  badge?: number;
}

export interface TabsProps {
  /** Available tabs */
  tabs: TabItem[];
  /** Current active tab value */
  value: string;
  /** onChange handler */
  onChange: (value: string) => void;
  /** Tab size */
  size?: TabSize;
  /** Enable scroll for many tabs */
  scrollable?: boolean;
  /** Show indicator */
  showIndicator?: boolean;
  /** Additional styles */
  style?: any;
  /** Test ID */
  testID?: string;
  /** Enable haptic feedback */
  haptic?: boolean;
}

/**
 * Tabs Component
 */
export function Tabs({
  tabs,
  value,
  onChange,
  size = 'md',
  scrollable = false,
  showIndicator = true,
  style,
  testID,
  haptic = true,
}: TabsProps) {
  const theme = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [tabLayouts, setTabLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const activeIndex = tabs.findIndex((tab) => tab.value === value);

  const indicatorPosition = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const sizeConfig = {
    sm: { height: 36, paddingVertical: 6, paddingHorizontal: 12, fontSize: 12 },
    md: { height: 44, paddingVertical: 8, paddingHorizontal: 16, fontSize: 14 },
    lg: { height: 52, paddingVertical: 10, paddingHorizontal: 20, fontSize: 16 },
  };

  const config = sizeConfig[size];

  React.useEffect(() => {
    if (showIndicator && tabLayouts[value]) {
      indicatorPosition.value = withSpring(tabLayouts[value].x, {
        damping: 20,
        stiffness: 300,
      });
      indicatorWidth.value = withSpring(tabLayouts[value].width, {
        damping: 20,
        stiffness: 300,
      });
    }
  }, [value, tabLayouts, showIndicator]);

  const handleTabPress = (tab: TabItem, index: number) => {
    if (tab.disabled || tab.value === value) return;

    if (haptic) {
      try {
        Haptics.selectionAsync();
      } catch {
        // Ignore
      }
    }

    onChange(tab.value);

    // Scroll tab into view if scrollable
    if (scrollable && scrollViewRef.current) {
      const tabLayout = tabLayouts[tab.value];
      if (tabLayout) {
        const centerX = tabLayout.x + tabLayout.width / 2;
        const screenCenter = SCREEN_WIDTH / 2;
        scrollViewRef.current.scrollTo({
          x: centerX - screenCenter,
          animated: true,
        });
      }
    }
  };

  const handleTabLayout = (tabValue: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLayouts((prev) => ({
      ...prev,
      [tabValue]: { x, width },
    }));
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value }],
    width: indicatorWidth.value,
  }));

  const renderTab = (tab: TabItem, index: number) => {
    const isActive = tab.value === value;

    return (
      <TouchableOpacity
        key={tab.value}
        onPress={() => handleTabPress(tab, index)}
        disabled={tab.disabled}
        activeOpacity={0.7}
        onLayout={(e) => handleTabLayout(tab.value, e)}
        style={[
          styles.tab,
          {
            height: config.height,
            paddingHorizontal: config.paddingHorizontal,
          },
        ]}
      >
        <View style={styles.tabContent}>
          {tab.icon && (
            <View style={[styles.tabIcon, isActive && styles.tabIconActive]}>
              {tab.icon}
            </View>
          )}
          <Text
            style={[
              styles.tabLabel,
              {
                fontSize: config.fontSize,
                color: isActive
                  ? theme.colors.primary[500]
                  : tab.disabled
                  ? theme.colors.gray[400]
                  : theme.colors.text.secondary,
              },
            ]}
          >
            {tab.label}
          </Text>
          {tab.badge !== undefined && tab.badge > 0 && (
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.colors.danger[500] },
              ]}
            >
              <Text style={styles.badgeText}>
                {tab.badge > 99 ? '99+' : tab.badge}
              </Text>
            </View>
          )}
        </View>
        {isActive && showIndicator && (
          <View
            style={[
              styles.indicator,
              { backgroundColor: theme.colors.primary[500] },
            ]}
          />
        )}
      </TouchableOpacity>
    );
  };

  const tabsContent = (
    <View
      style={[
        styles.tabsContainer,
        { borderBottomColor: theme.colors.border },
        style,
      ]}
    >
      {scrollable ? (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollableContent}
        >
          {tabs.map(renderTab)}
        </ScrollView>
      ) : (
        <View style={styles.fixedContent}>{tabs.map(renderTab)}</View>
      )}
    </View>
  );

  return (
    <View testID={testID}>
      {tabsContent}
    </View>
  );
}

/**
 * Segmented Control (iOS style)
 */
export interface SegmentedControlProps {
  /** Available options */
  options: Array<{ value: string; label: string }>;
  /** Current value */
  value: string;
  /** onChange handler */
  onChange: (value: string) => void;
  /** Size */
  size?: TabSize;
  /** Additional styles */
  style?: any;
  /** Enable haptic feedback */
  haptic?: boolean;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  style,
  haptic = true,
}: SegmentedControlProps) {
  const theme = useTheme();
  const [segmentLayouts, setSegmentLayouts] = useState<Record<string, number>>({});
  const activeIndex = options.findIndex((opt) => opt.value === value);

  const sizeConfig = {
    sm: { height: 28, paddingVertical: 4, paddingHorizontal: 12, fontSize: 12 },
    md: { height: 32, paddingVertical: 6, paddingHorizontal: 16, fontSize: 13 },
    lg: { height: 40, paddingVertical: 8, paddingHorizontal: 20, fontSize: 15 },
  };

  const config = sizeConfig[size];

  const activePosition = segmentLayouts[value] ?? 0;
  const activeWidth = segmentLayouts[value]
    ? (segmentLayouts as any)[`${value}_width`]
    : 0;

  const handlePress = (option: { value: string; label: string }) => {
    if (option.value === value) return;

    if (haptic) {
      try {
        Haptics.selectionAsync();
      } catch {
        // Ignore
      }
    }

    onChange(option.value);
  };

  const handleLayout = (optionValue: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setSegmentLayouts((prev) => ({
      ...prev,
      [optionValue]: x,
      [`${optionValue}_width`]: width,
    }));
  };

  return (
    <View
      style={[
        styles.segmentedContainer,
        {
          backgroundColor: theme.colors.gray[100],
          height: config.height,
        },
        style,
      ]}
    >
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            styles.segmentedActive,
            {
              left: activePosition,
              width: activeWidth,
              backgroundColor: theme.colors.background,
            },
          ]}
        />
      </View>
      <View style={styles.segmentsWrapper}>
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => handlePress(option)}
              activeOpacity={1}
              onLayout={(e) => handleLayout(option.value, e)}
              style={[
                styles.segment,
                {
                  paddingVertical: config.paddingVertical,
                  paddingHorizontal: config.paddingHorizontal,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  {
                    fontSize: config.fontSize,
                    color: isActive
                      ? theme.colors.text.primary
                      : theme.colors.text.secondary,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/**
 * TabPanel - Content container for tabs
 */
export interface TabPanelProps {
  /** Tab value this panel belongs to */
  value: string;
  /** Current active tab value */
  activeValue: string;
  /** Panel content */
  children: ReactNode;
  /** Additional styles */
  style?: any;
}

export function TabPanel({ value, activeValue, children, style }: TabPanelProps) {
  if (value !== activeValue) return null;

  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({
  tabsContainer: {
    borderBottomWidth: 1,
  },
  scrollableContent: {
    paddingHorizontal: 8,
  },
  fixedContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabIcon: {
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontWeight: '500',
    includeFontPadding: false,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    includeFontPadding: false,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  segmentsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    includeFontPadding: false,
  },
  segmentedActive: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
