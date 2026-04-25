import React from "react";
import { View, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColorScheme";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: "text" | "rectangular" | "circular";
  style?: any;
}

export function Skeleton({
  width = "100%",
  height = 20,
  variant = "rectangular",
  style,
}: SkeletonProps) {
  const colors = useColors();

  const getBorderRadius = () => {
    switch (variant) {
      case "circular":
        return 9999;
      case "text":
        return 4;
      default:
        return 8;
    }
  };

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: getBorderRadius(),
          backgroundColor: colors.border,
        },
        style,
      ]}
    />
  );
}

export function CardSkeleton() {
  return (
    <View style={styles.cardSkeleton}>
      <View style={styles.cardHeader}>
        <Skeleton width={40} height={40} variant="circular" />
        <View style={styles.headerText}>
          <Skeleton width={150} height={16} variant="text" />
          <Skeleton width={100} height={12} variant="text" style={{ marginTop: 6 }} />
        </View>
      </View>
      <View style={styles.cardBody}>
        <Skeleton width={120} height={24} variant="text" />
        <View style={styles.cardFooter}>
          <Skeleton width={80} height={16} variant="text" />
          <View style={styles.badgeSkeleton}>
            <Skeleton width={60} height={24} variant="rectangular" />
          </View>
        </View>
      </View>
    </View>
  );
}

export function TransactionListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.listSkeleton}>
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </View>
  );
}

export function SummaryCardSkeleton() {
  return (
    <View style={styles.summaryCardSkeleton}>
      <Skeleton width={32} height={32} variant="circular" />
      <Skeleton width={100} height={20} variant="text" style={{ marginTop: 8 }} />
      <Skeleton width={60} height={14} variant="text" style={{ marginTop: 4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
  cardSkeleton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  cardBody: {
    gap: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  badgeSkeleton: {
    width: 60,
  },
  listSkeleton: {
    gap: 12,
  },
  summaryCardSkeleton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "flex-start",
    flex: 1,
  },
});
