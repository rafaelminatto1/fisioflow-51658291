/**
 * FisioFlow Design System - Card Component
 *
 * Flexible card component for content grouping
 * Supports multiple variants, sizes, and press interactions
 */

import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  PressableProps,
  StyleProp,
} from 'react-native';
import { useTheme } from '../theme';

export type CardVariant = 'elevated' | 'outlined' | 'filled' | 'glass';
export type CardSize = 'sm' | 'md' | 'lg';

export interface CardProps {
  /** Card content */
  children: ReactNode;
  /** Visual variant */
  variant?: CardVariant;
  /** Card size (affects padding) */
  size?: CardSize;
  /** Make card pressable */
  pressable?: boolean;
  /** onPress handler (when pressable) */
  onPress?: () => void;
  /** Disable press interaction */
  disabled?: boolean;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Test ID */
  testID?: string;
  /** Border radius override */
  borderRadius?: number;
}

const sizeConfig = {
  sm: { padding: 12 },
  md: { padding: 16 },
  lg: { padding: 20 },
};

/**
 * Card Component
 */
export function Card({
  children,
  variant = 'elevated',
  size = 'md',
  pressable = false,
  onPress,
  disabled = false,
  style,
  testID,
  borderRadius,
}: CardProps) {
  const theme = useTheme();
  const config = sizeConfig[size];

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.card,
      padding: config.padding,
      borderRadius: borderRadius ?? theme.borderRadius.lg,
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.background,
          ...theme.shadows.md,
        };
      case 'outlined':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      case 'filled':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.backgroundSecondary,
        };
      case 'glass':
        return {
          ...baseStyle,
          backgroundColor: theme.isDark
            ? 'rgba(30, 41, 59, 0.8)'
            : 'rgba(255, 255, 255, 0.8)',
          borderWidth: 1,
          borderColor: theme.isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)',
          ...theme.shadows.sm,
        };
      default:
        return baseStyle;
    }
  };

  const cardStyle = getCardStyle();
  const cardInner = <View style={styles.content}>{children}</View>;

  if (pressable && onPress) {
    return (
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={[cardStyle, disabled && styles.disabled, style]}
      >
        {cardInner}
      </TouchableOpacity>
    );
  }

  return (
    <View testID={testID} style={[cardStyle, style]}>
      {cardInner}
    </View>
  );
}

/**
 * Card Section Component
 * For organizing content within cards
 */
export interface CardSectionProps {
  children: ReactNode;
  /** Section spacing */
  spacing?: number;
  /** Additional styles */
  style?: ViewStyle;
}

export function CardSection({ children, spacing = 8, style }: CardSectionProps) {
  return <View style={[styles.section, { gap: spacing }, style]}>{children}</View>;
}

/**
 * Card Header Component
 */
export interface CardHeaderProps {
  title?: string;
  subtitle?: string;
  rightElement?: ReactNode;
  /** Additional styles */
  style?: ViewStyle;
}

export function CardHeader({ title, subtitle, rightElement, style }: CardHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerContent}>
        {title && (
          <View>
            <View style={styles.headerTitle}>
              {typeof title === 'string' ? (
                <TextNative style={[styles.title, { color: theme.colors.text.primary }]}>
                  {title}
                </TextNative>
              ) : (
                title
              )}
            </View>
            {subtitle && (
              <View style={styles.headerSubtitle}>
                {typeof subtitle === 'string' ? (
                  <TextNative style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                    {subtitle}
                  </TextNative>
                ) : (
                  subtitle
                )}
              </View>
            )}
          </View>
        )}
        {rightElement && <View style={styles.headerRight}>{rightElement}</View>}
      </View>
    </View>
  );
}

/**
 * Card Content Component
 */
export interface CardContentProps {
  children: ReactNode;
  /** Additional styles */
  style?: ViewStyle;
}

export function CardContent({ children, style }: CardContentProps) {
  return <View style={style}>{children}</View>;
}

/**
 * Card Footer Component
 */
export interface CardFooterProps {
  children: ReactNode;
  /** Additional styles */
  style?: ViewStyle;
}

export function CardFooter({ children, style }: CardFooterProps) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

// Import Text at the bottom to avoid name collision
import { Text as TextNative, TouchableOpacity as TouchableOpacityNative } from 'react-native';

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  section: {
    flexDirection: 'column',
  },
  header: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
  },
  headerSubtitle: {
    marginTop: 2,
  },
  headerRight: {
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  disabled: {
    opacity: 0.5,
  },
});
