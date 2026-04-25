import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { Button } from "@/components";

interface EmptyStateFinancialProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: "transactions" | "payments" | "nfse" | "receipts" | "error";
  variant?: "default" | "no-results" | "initial";
}

export function EmptyStateFinancial({
  title,
  description,
  actionLabel,
  onAction,
  illustration = "transactions",
  variant = "default",
}: EmptyStateFinancialProps) {
  const colors = useColors();

  const getIcon = () => {
    switch (illustration) {
      case "payments":
        return "wallet-outline";
      case "nfse":
        return "receipt-outline";
      case "receipts":
        return "document-text-outline";
      case "error":
        return "alert-circle-outline";
      default:
        return "cash-outline";
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "no-results":
        return {
          iconColor: colors.textMuted,
          titleColor: colors.text,
        };
      case "initial":
        return {
          iconColor: colors.primary,
          titleColor: colors.text,
        };
      default:
        return {
          iconColor: colors.textMuted,
          titleColor: colors.textSecondary,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={getIcon()} size={64} color={variantStyles.iconColor} />
      </View>

      <Text style={[styles.title, { color: variantStyles.titleColor }]}>{title}</Text>

      {description && (
        <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
      )}

      {actionLabel && onAction && (
        <View style={styles.buttonContainer}>
          <Button title={actionLabel} onPress={onAction} variant="primary" leftIcon="add" />
        </View>
      )}

      {variant === "no-results" && (
        <TouchableOpacity
          style={[styles.clearFilters, { borderColor: colors.border }]}
          onPress={onAction}
        >
          <Ionicons name="refresh-outline" size={16} color={colors.primary} />
          <Text style={[styles.clearFiltersText, { color: colors.primary }]}>Limpar filtros</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface EmptyStateSkeletonProps {
  count?: number;
}

export function EmptyStateSkeleton({ count = 3 }: EmptyStateSkeletonProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.skeletonCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[styles.skeletonAvatar, { backgroundColor: colors.border }]} />
          <View style={styles.skeletonContent}>
            <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: "60%" }]} />
            <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: "40%" }]} />
          </View>
          <View style={[styles.skeletonValue, { backgroundColor: colors.border }]} />
        </View>
      ))}
    </View>
  );
}

interface EmptyStateIllustratedProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: "3d" | "flat" | "minimal";
}

export function EmptyStateIllustrated({
  title,
  description,
  actionLabel,
  onAction,
  illustration = "minimal",
}: EmptyStateIllustratedProps) {
  const colors = useColors();

  return (
    <View style={styles.illustratedContainer}>
      <View style={styles.illustrationContainer}>
        <View style={[styles.illustrationCircle, { backgroundColor: colors.primary + "10" }]}>
          <Ionicons name="wallet-outline" size={80} color={colors.primary} />
        </View>
        <View
          style={[styles.illustrationSmallCircle, { backgroundColor: colors.success + "15" }]}
        />
        <View
          style={[styles.illustrationSmallCircle2, { backgroundColor: colors.warning + "15" }]}
        />
      </View>

      <Text style={[styles.illustratedTitle, { color: colors.text }]}>{title}</Text>

      <Text style={[styles.illustratedDescription, { color: colors.textSecondary }]}>
        {description}
      </Text>

      {actionLabel && onAction && (
        <View style={styles.illustratedButtonContainer}>
          <Button title={actionLabel} onPress={onAction} variant="primary" size="lg" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 280,
  },
  clearFilters: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: "500",
  },
  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  skeletonValue: {
    width: 80,
    height: 20,
    borderRadius: 10,
  },
  illustratedContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  illustrationContainer: {
    position: "relative",
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  illustrationCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  illustrationSmallCircle: {
    position: "absolute",
    top: 20,
    right: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  illustrationSmallCircle2: {
    position: "absolute",
    bottom: 30,
    left: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  illustratedTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  illustratedDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 320,
  },
  illustratedButtonContainer: {
    width: "100%",
    maxWidth: 280,
  },
});
