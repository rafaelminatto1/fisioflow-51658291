import React, { useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useColors } from "@/hooks/useColorScheme";
import { Card } from "@/components";
import { Bar } from "./BarChart";
import { StatGrid } from "./StatGrid";
import { useFinancialMetrics, formatCurrency, formatNumber } from "@/hooks/useFinancialMetrics";

type PeriodType = "week" | "month" | "quarter" | "year";

interface FinancialTabProps {
  selectedPeriod: PeriodType;
}

export function FinancialTab({ selectedPeriod }: FinancialTabProps) {
  const colors = useColors();

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (selectedPeriod) {
      case "week": {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        return {
          startDate: weekStart.toISOString().split("T")[0],
          endDate: now.toISOString().split("T")[0],
        };
      }
      case "month":
        return {
          startDate: startOfMonth(now).toISOString().split("T")[0],
          endDate: endOfMonth(now).toISOString().split("T")[0],
        };
      case "quarter": {
        const quarterStart = subMonths(now, 3);
        return {
          startDate: quarterStart.toISOString().split("T")[0],
          endDate: now.toISOString().split("T")[0],
        };
      }
      case "year": {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return {
          startDate: yearStart.toISOString().split("T")[0],
          endDate: now.toISOString().split("T")[0],
        };
      }
      default:
        return {
          startDate: startOfMonth(now).toISOString().split("T")[0],
          endDate: endOfMonth(now).toISOString().split("T")[0],
        };
    }
  }, [selectedPeriod]);

  const { data: metrics, isLoading, error } = useFinancialMetrics(dateRange);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>
          Carregando dados financeiros...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <Card style={styles.infoCard} padding="md">
        <View style={styles.infoContent}>
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={{ marginLeft: 8, color: colors.textSecondary }}>
            Erro ao carregar dados financeiros.
          </Text>
        </View>
      </Card>
    );
  }

  const financialStats = [
    {
      label: "Faturamento",
      value: formatCurrency(metrics?.totalRevenue || 0),
      color: colors.success,
    },
    { label: "Sessões", value: metrics?.sessionsCount || 0, color: colors.primary },
    {
      label: "Pendentes",
      value: formatCurrency(metrics?.pendingRevenue || 0),
      color: colors.warning,
    },
    {
      label: "Ticket Médio",
      value: formatCurrency(
        metrics?.sessionsCount ? metrics.totalRevenue / metrics.sessionsCount : 0,
      ),
      color: colors.info,
    },
  ];

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumo Financeiro</Text>
      <StatGrid stats={financialStats} />

      {metrics?.revenueByDay && metrics.revenueByDay.length > 0 && (
        <Card style={styles.chartCard} padding="md">
          <Text style={[styles.chartTitle, { color: colors.text }]}>Faturamento Diário</Text>
          <View style={styles.chartContent}>
            {metrics.revenueByDay.slice(-7).map((item, idx) => {
              const maxRevenue = Math.max(
                ...metrics.revenueByDay.map((d) =>
                  typeof d.total === "string" ? parseFloat(d.total) : d.total,
                ),
                0,
              );
              const value = typeof item.total === "string" ? parseFloat(item.total) : item.total;
              return (
                <Bar
                  key={idx}
                  label={format(new Date(item.date), "dd", { locale: ptBR })}
                  value={Math.round(value / 100)}
                  maxValue={maxRevenue / 100}
                  color={colors.success}
                />
              );
            })}
          </View>
        </Card>
      )}

      <Card style={styles.infoCard} padding="md">
        <Text style={[styles.chartTitle, { color: colors.text, marginBottom: 12 }]}>Pacientes</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {formatNumber(metrics?.patientsCount || 0)}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Ativos</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.success }]}>
              +{formatNumber(metrics?.newPatientsThisMonth || 0)}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Novos (mês)</Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  chartCard: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 24,
  },
  chartContent: {
    flexDirection: "row",
    height: 200,
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingBottom: 20,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  infoCard: {
    marginBottom: 16,
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});
