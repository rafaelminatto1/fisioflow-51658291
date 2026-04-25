import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColorScheme";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function Badge({ children, variant = "default", style, icon }: BadgeProps) {
  const colors = useColors();

  const getVariantStyles = () => {
    switch (variant) {
      case "default":
        return {
          backgroundColor: colors.primary + "20",
          color: colors.primary,
          borderColor: "transparent",
        };
      case "secondary":
        return {
          backgroundColor: colors.secondary + "20",
          color: colors.secondary,
          borderColor: "transparent",
        };
      case "destructive":
        return {
          backgroundColor: colors.errorLight,
          color: colors.error,
          borderColor: "transparent",
        };
      case "success":
        return {
          backgroundColor: colors.successLight,
          color: colors.success,
          borderColor: "transparent",
        };
      case "warning":
        return {
          backgroundColor: colors.warningLight,
          color: colors.warning,
          borderColor: "transparent",
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          color: colors.text,
          borderColor: colors.border,
        };
      default:
        return {
          backgroundColor: colors.surface,
          color: colors.text,
          borderColor: colors.border,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          borderWidth: variant === "outline" ? 1 : 0,
        },
        style,
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.text, { color: variantStyles.color }]}>{children}</Text>
    </View>
  );
}

interface BadgeCounterProps {
  count: number;
  variant?: "default" | "destructive" | "success" | "warning";
  max?: number;
  size?: "sm" | "md" | "lg";
}

export function BadgeCounter({
  count,
  variant = "default",
  max = 99,
  size = "md",
}: BadgeCounterProps) {
  const colors = useColors();
  const displayCount = count > max ? `${max}+` : count;

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return { width: 20, height: 20, fontSize: 10 };
      case "lg":
        return { width: 28, height: 28, fontSize: 12 };
      default:
        return { width: 24, height: 24, fontSize: 11 };
    }
  };

  const getVariantColor = () => {
    switch (variant) {
      case "destructive":
        return colors.error;
      case "success":
        return colors.success;
      case "warning":
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  const sizeStyles = getSizeStyles();
  const bgColor = getVariantColor();

  return (
    <View
      style={[
        styles.counter,
        {
          width: sizeStyles.width,
          height: sizeStyles.height,
          backgroundColor: bgColor,
          borderRadius: sizeStyles.width / 2,
        },
      ]}
    >
      <Text
        style={[
          styles.counterText,
          {
            fontSize: sizeStyles.fontSize,
            color: "#fff",
          },
        ]}
      >
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: "flex-start",
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  counter: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 20,
  },
  counterText: {
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});
