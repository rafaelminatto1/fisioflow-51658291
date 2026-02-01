/**
 * Header Component
 * Reusable header for screens
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Icon } from './Icon';

export interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  leftComponent?: React.ReactNode;
  transparent?: boolean;
}

export function Header({
  title,
  showBackButton = false,
  onBackPress,
  rightComponent,
  leftComponent,
  transparent = false,
}: HeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: transparent ? 'transparent' : colors.background },
        { borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.content}>
        {leftComponent || (
          <View style={styles.leftContainer}>
            {showBackButton && (
              <Pressable onPress={onBackPress} style={styles.backButton}>
                <Icon name="arrow-left" size={24} color={colors.text} />
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.rightContainer}>{rightComponent}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
  },
  leftContainer: {
    width: 40,
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
