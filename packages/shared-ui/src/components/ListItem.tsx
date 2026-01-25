/**
 * FisioFlow Design System - ListItem Component
 *
 * List items for displaying structured data
 * Supports leading/trailing widgets and multiline content
 */

import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';
import { Divider } from './Divider';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Switch } from './Switch';
import { Checkbox } from './Checkbox';

export type ListItemSize = 'sm' | 'md' | 'lg';

export interface ListItemProps {
  /** Item title */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Leading element (avatar, icon, checkbox) */
  leading?: ReactNode;
  /** Trailing element (icon, switch, badge) */
  trailing?: ReactNode;
  /** Additional description below subtitle */
  description?: string;
  /** Item is pressable */
  pressable?: boolean;
  /** onPress handler */
  onPress?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Item size */
  size?: ListItemSize;
  /** Show divider */
  divider?: boolean;
  /** Item variant */
  variant?: 'default' | 'outlined' | 'elevated';
  /** Number of lines for subtitle */
  subtitleLines?: number;
  /** Leading widget type (for auto-styling) */
  leadingType?: 'avatar' | 'icon' | 'checkbox' | 'radio';
  /** Trailing widget type */
  trailingType?: 'icon' | 'switch' | 'badge' | 'chevron';
  /** Badge count */
  badge?: number;
  /** Additional styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

const sizeConfig = {
  sm: { paddingVertical: 10, paddingHorizontal: 16, titleSize: 14, subtitleSize: 12 },
  md: { paddingVertical: 12, paddingHorizontal: 16, titleSize: 16, subtitleSize: 13 },
  lg: { paddingVertical: 16, paddingHorizontal: 16, titleSize: 18, subtitleSize: 14 },
};

/**
 * ListItem Component
 */
export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  description,
  pressable = false,
  onPress,
  disabled = false,
  size = 'md',
  divider = true,
  variant = 'default',
  subtitleLines = 2,
  leadingType,
  trailingType,
  badge,
  style,
  testID,
}: ListItemProps) {
  const theme = useTheme();
  const config = sizeConfig[size];

  const Container = pressable || onPress ? TouchableOpacity : View;
  const containerProps: any = {};
  if (pressable || onPress) {
    containerProps.onPress = onPress;
    containerProps.disabled = disabled;
    containerProps.activeOpacity = 0.7;
  }

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.md,
        };
      case 'elevated':
        return {
          borderRadius: theme.borderRadius.md,
          ...theme.shadows.sm,
        };
      default:
        return {};
    }
  };

  return (
    <>
      <Container
        testID={testID}
        style={[styles.container, { paddingVertical: config.paddingVertical, paddingHorizontal: config.paddingHorizontal }, getVariantStyle(), disabled && styles.disabled, style]}
        {...containerProps}
      >
        {leading && (
          <View style={[styles.leading, { marginRight: 12 }]}>
            {leading}
          </View>
        )}

        <View style={styles.content}>
          {title && (
            <Text
              style={[
                styles.title,
                {
                  fontSize: config.titleSize,
                  color: disabled ? theme.colors.gray[400] : theme.colors.text.primary,
                },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}

          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                {
                  fontSize: config.subtitleSize,
                  color: disabled ? theme.colors.gray[400] : theme.colors.text.secondary,
                },
              ]}
              numberOfLines={subtitleLines}
            >
              {subtitle}
            </Text>
          )}

          {description && (
            <Text
              style={[
                styles.description,
                { color: theme.colors.text.tertiary },
              ]}
            >
              {description}
            </Text>
          )}
        </View>

        {(trailing || badge) && (
          <View style={[styles.trailing, { marginLeft: 12 }]}>
            {badge !== undefined && badge > 0 && (
              <Badge variant="primary" size="sm">
                {badge > 99 ? '99+' : badge}
              </Badge>
            )}
            {trailing}
          </View>
        )}
      </Container>
      {divider && <Divider />}
    </>
  );
}

/**
 * ListItem with Avatar
 */
export interface AvatarListItemProps extends Omit<ListItemProps, 'leading'> {
  /** Avatar source or name */
  avatar: { source?: { uri: string } | number; name?: string };
  /** Avatar size */
  avatarSize?: 'sm' | 'md' | 'lg';
}

export function AvatarListItem({
  avatar,
  avatarSize = 'md',
  ...props
}: AvatarListItemProps) {
  return (
    <ListItem
      {...props}
      leading={
        <Avatar
          source={avatar.source}
          name={avatar.name}
          size={avatarSize}
        />
      }
      leadingType="avatar"
    />
  );
}

/**
 * ListItem with Checkbox
 */
export interface CheckboxListItemProps extends Omit<ListItemProps, 'leading' | 'trailing'> {
  /** Checked state */
  checked?: boolean;
  /** onCheckedChange */
  onCheckedChange?: (checked: boolean) => void;
}

export function CheckboxListItem({
  checked = false,
  onCheckedChange,
  pressable = false,
  ...props
}: CheckboxListItemProps) {
  return (
    <ListItem
      {...props}
      pressable
      onPress={() => onCheckedChange?.(!checked)}
      leading={
        <Checkbox
          checked={checked}
          onChange={() => onCheckedChange?.(!checked)}
        />
      }
      leadingType="checkbox"
    />
  );
}

/**
 * ListItem with Switch
 */
export interface SwitchListItemProps extends Omit<ListItemProps, 'trailing'> {
  /** Switch value */
  value?: boolean;
  /** onValueChange */
  onValueChange?: (value: boolean) => void;
}

export function SwitchListItem({
  value = false,
  onValueChange,
  ...props
}: SwitchListItemProps) {
  return (
    <ListItem
      {...props}
      trailing={
        <Switch
          value={value}
          onChange={onValueChange}
          size="sm"
        />
      }
      trailingType="switch"
    />
  );
}

/**
 * ListItemGroup - Groups related list items
 */
export interface ListItemGroupProps {
  /** Group items */
  children: ReactNode;
  /** Group header */
  header?: string;
  /** Group footer */
  footer?: string;
  /** Divider position */
  dividerPosition?: 'inset' | 'full';
  /** Group variant */
  variant?: 'default' | 'outlined' | 'elevated';
  /** Additional styles */
  style?: any;
}

export function ListItemGroup({
  children,
  header,
  footer,
  dividerPosition = 'inset',
  variant = 'default',
  style,
}: ListItemGroupProps) {
  const theme = useTheme();

  const getGroupStyle = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.md,
          overflow: 'hidden',
        };
      case 'elevated':
        return {
          borderRadius: theme.borderRadius.md,
          ...theme.shadows.sm,
          overflow: 'hidden',
        };
      default:
        return {};
    }
  };

  return (
    <View style={[styles.group, getGroupStyle(), style]}>
      {header && (
        <View
          style={[
            styles.groupHeader,
            {
              paddingHorizontal: dividerPosition === 'inset' ? 16 : 16,
              backgroundColor:
                variant !== 'default' ? theme.colors.gray[50] : undefined,
            },
          ]}
        >
          <Text
            style={[
              styles.groupHeaderText,
              { color: theme.colors.text.tertiary },
            ]}
          >
            {header}
          </Text>
        </View>
      )}
      {children}
      {footer && (
        <View
          style={[
            styles.groupFooter,
            {
              paddingHorizontal: 16,
              backgroundColor:
                variant !== 'default' ? theme.colors.gray[50] : undefined,
            },
          ]}
        >
          <Text
            style={[
              styles.groupFooterText,
              { color: theme.colors.text.tertiary },
            ]}
          >
            {footer}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * SimpleListItem - Simplified version for basic lists
 */
export interface SimpleListItemProps {
  /** Item title */
  title: string;
  /** Subtitle */
  subtitle?: string;
  /** Icon */
  icon?: ReactNode;
  /** onPress */
  onPress?: () => void;
  /** Show chevron */
  chevron?: boolean;
  /** Disabled */
  disabled?: boolean;
}

export function SimpleListItem({
  title,
  subtitle,
  icon,
  onPress,
  chevron = true,
  disabled = false,
}: SimpleListItemProps) {
  const theme = useTheme();

  return (
    <ListItem
      title={title}
      subtitle={subtitle}
      leading={icon}
      trailing={chevron ? <Text style={{ color: theme.colors.gray[400] }}>›</Text> : undefined}
      trailingType="chevron"
      pressable={!!onPress}
      onPress={onPress}
      disabled={disabled}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  leading: {
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  trailing: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '500',
    includeFontPadding: false,
  },
  subtitle: {
    includeFontPadding: false,
  },
  description: {
    fontSize: 12,
    marginTop: 2,
    includeFontPadding: false,
  },
  group: {
    overflow: 'hidden',
  },
  groupHeader: {
    paddingVertical: 10,
  },
  groupHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  groupFooter: {
    paddingVertical: 10,
  },
  groupFooterText: {
    fontSize: 12,
    includeFontPadding: false,
  },
});
