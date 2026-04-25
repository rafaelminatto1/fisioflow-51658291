import React from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { useColors } from "@/hooks/useColorScheme";
import { Card } from "@/components";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface FinancialChartProps {
  data: Array<{ date: string; value: number; label?: string }>;
  type?: "line" | "bar";
  title?: string;
  showDots?: boolean;
  color?: string;
}

export function FinancialChart({
  data,
  type = "line",
  title = "Evolução Financeira",
  showDots = true,
  color,
}: FinancialChartProps) {
  const colors = useColors();
  const chartColor = color || colors.primary;

  if (!data || data.length === 0) {
    return null;
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const avgValue = data.reduce((acc, d) => acc + d.value, 0) / data.length;

  const formatValue = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  const chartData = data.map((item, index) => ({
    value: item.value,
    label: item.label || item.date,
    dataPointText: formatValue(item.value),
  }));

  return (
    <Card style={styles.container} padding="lg">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartContainer}>
          {type === "line" ? (
            <LineChart
              data={chartData}
              width={Math.max(SCREEN_WIDTH - 64, data.length * 60)}
              height={180}
              color={chartColor}
              thickness={2}
              isAnimated
              animationDuration={800}
              maxValue={maxValue * 1.2}
              noOfSections={4}
              spacing={40}
              showVerticalLines={false}
              showXAxisIndices
              showYAxisIndices
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{
                color: colors.textSecondary,
                fontSize: 10,
              }}
              dataPointsShape="circle"
              dataPointsWidth={showDots ? 6 : 0}
              dataPointsHeight={showDots ? 6 : 0}
              dataPointsColor={chartColor}
              textShiftY={-2}
              textShiftX={-10}
              textFontSize={10}
              textColor={colors.text}
              startFillColor={chartColor + "40"}
              endFillColor={chartColor + "05"}
              startOpacity={0.9}
              endOpacity={0.2}
              areaChart
            />
          ) : (
            <BarChart
              data={chartData}
              width={Math.max(SCREEN_WIDTH - 64, data.length * 50)}
              height={180}
              barWidth={24}
              color={chartColor}
              isAnimated
              animationDuration={800}
              maxValue={maxValue * 1.2}
              noOfSections={4}
              spacing={16}
              showVerticalLines={false}
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{
                color: colors.textSecondary,
                fontSize: 10,
              }}
              barBorderRadius={4}
              frontColor={chartColor}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Máximo</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatValue(maxValue)}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Média</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatValue(avgValue)}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatValue(data.reduce((acc, d) => acc + d.value, 0))}
          </Text>
        </View>
      </View>
    </Card>
  );
}

interface PaymentNotificationProps {
  pendingCount: number;
  overdueCount: number;
  totalPending: number;
}

export function PaymentNotifications({
  pendingCount,
  overdueCount,
  totalPending,
}: PaymentNotificationProps) {
  const colors = useColors();

  if (pendingCount === 0 && overdueCount === 0) {
    return null;
  }

  return (
    <View style={[styles.notificationContainer, { backgroundColor: colors.warningLight + "60" }]}>
      <Ionicons name="notifications-outline" size={24} color={colors.warning} />
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { color: colors.text }]}>Pagamentos Pendentes</Text>
        <Text style={[styles.notificationText, { color: colors.textSecondary }]}>
          {overdueCount > 0 && `${overdueCount} vencido${overdueCount > 1 ? "s" : ""} • `}
          {pendingCount} pendente{pendingCount > 1 ? "s" : ""} • Total: R$ {totalPending.toFixed(2)}
        </Text>
      </View>
      <View style={[styles.notificationBadge, { backgroundColor: colors.warning }]}>
        <Text style={[styles.notificationBadgeText, { color: "#fff" }]}>
          {pendingCount + overdueCount}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  chartContainer: {
    marginBottom: 12,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  stat: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  notificationContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  notificationText: {
    fontSize: 12,
  },
  notificationBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
