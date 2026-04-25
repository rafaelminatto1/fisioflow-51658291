import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { Card } from "@/components";

interface FinancialSummaryCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  icon: keyof typeof Ionicons.prototype.props.name;
  variant?: "success" | "warning" | "primary" | "info";
  onPress?: () => void;
}

export function FinancialSummaryCard({
  title,
  amount,
  subtitle,
  trend,
  icon,
  variant = "primary",
  onPress,
}: FinancialSummaryCardProps) {
  const colors = useColors();

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          backgroundColor: colors.success + "08",
          iconColor: colors.success,
          borderColor: colors.success + "15",
          iconBg: colors.success + "15",
        };
      case "warning":
        return {
          backgroundColor: colors.warning + "08",
          iconColor: colors.warning,
          borderColor: colors.warning + "15",
          iconBg: colors.warning + "15",
        };
      case "info":
        return {
          backgroundColor: colors.info + "08",
          iconColor: colors.info,
          borderColor: colors.info + "15",
          iconBg: colors.info + "15",
        };
      default:
        return {
          backgroundColor: colors.primary + "08",
          iconColor: colors.primary,
          borderColor: colors.primary + "15",
          iconBg: colors.primary + "15",
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      style={styles.gridCard}
    >
      <Card
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: variantStyles.borderColor,
          },
        ]}
        padding="none"
      >
        <View style={styles.cardInner}>
          <View style={styles.contentHeader}>
            <View style={[styles.iconContainer, { backgroundColor: variantStyles.iconBg }]}>
              <Ionicons name={icon as any} size={20} color={variantStyles.iconColor} />
            </View>
            <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
          </View>

          <View style={styles.amountContainer}>
            <Text style={[styles.amount, { color: colors.text }]}>
              R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
            )}
          </View>

          {trend && (
            <View style={styles.trendContainer}>
              <View
                style={[
                  styles.trendBadge,
                  {
                    backgroundColor:
                      (trend.positive !== false ? colors.success : colors.error) + "15",
                  },
                ]}
              >
                <Ionicons
                  name={trend.positive !== false ? "trending-up" : "trending-down"}
                  size={12}
                  color={trend.positive !== false ? colors.success : colors.error}
                />
                <Text
                  style={[
                    styles.trendValue,
                    {
                      color: trend.positive !== false ? colors.success : colors.error,
                    },
                  ]}
                >
                  {Math.abs(trend.value).toFixed(1)}%
                </Text>
              </View>
              <Text style={[styles.trendLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {trend.label}
              </Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

interface FinancialSummaryGridProps {
  cards: Array<{
    title: string;
    amount: number;
    subtitle?: string;
    trend?: {
      value: number;
      label: string;
      positive?: boolean;
    };
    icon: keyof typeof Ionicons.prototype.props.name;
    variant?: "success" | "warning" | "primary" | "info";
    onPress?: () => void;
  }>;
}

export function FinancialSummaryGrid({ cards }: FinancialSummaryGridProps) {
  return (
    <View style={styles.grid}>
      {cards.map((card, index) => (
        <FinancialSummaryCard key={index} {...card} />
      ))}
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: keyof typeof Ionicons.prototype.props.name;
  color?: "success" | "warning" | "error" | "primary";
}

export function StatCard({ label, value, icon, color = "primary" }: StatCardProps) {
  const colors = useColors();

  const getColor = () => {
    switch (color) {
      case "success":
        return colors.success;
      case "warning":
        return colors.warning;
      case "error":
        return colors.error;
      default:
        return colors.primary;
    }
  };

  return (
    <View style={styles.statCard}>
      {icon && <Ionicons name={icon as any} size={16} color={getColor()} style={styles.statIcon} />}
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardInner: {
    padding: 16,
  },
  contentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  amountContainer: {
    marginBottom: 12,
  },
  amount: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trendValue: {
    fontSize: 11,
    fontWeight: "700",
  },
  trendLabel: {
    fontSize: 10,
    fontWeight: "500",
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  gridCard: {
    flex: 1,
  },
  statCard: {
    alignItems: "center",
    flex: 1,
  },
  statIcon: {
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
