import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Card } from './Card';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  color?: string;
  subtitle?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  style?: ViewStyle;
}

export function StatCard({
  title,
  value,
  icon,
  color,
  subtitle,
  trend,
  style,
}: StatCardProps) {
  const { colors } = useTheme();

  return (
    <Card style={[styles.container, style]} padding={16}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
        {icon && <Icon name={icon as any} size={20} color={color || colors.primary} />}
      </View>

      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>

      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}

      {trend && (
        <View style={styles.trendContainer}>
          <Icon
            name={trend.positive ? 'trending-up' : 'trending-down'}
            size={14}
            color={trend.positive ? colors.success : colors.error}
          />
          <Text
            style={[
              styles.trendValue,
              { color: trend.positive ? colors.success : colors.error },
            ]}
          >
            {trend.value}
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    marginTop: -4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '600',
  },
});
