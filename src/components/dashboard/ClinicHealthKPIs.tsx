import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Card } from "@/components";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useColors } from "@/hooks/useColorScheme";
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  HandCoins,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react-native";

export interface ClinicKPIs {
  occupancy: { booked: number; capacity: number };
  noShow: { count: number; total: number };
  financial: { totalRevenue: number; avgTicket: number };
  clinical: { avgSessions: number };
}

export const ClinicHealthKPIs: React.FC = () => {
  const colors = useColors();

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["clinic-kpis"],
    queryFn: async () => {
      const res = await fetchApi<{ data: ClinicKPIs }>("/api/clinic-metrics/kpis");
      return res.data;
    },
    staleTime: 1000 * 60 * 10, // 10 mins
  });

  if (isLoading || !kpis) {
    return null;
  }

  const occupancyRate = (kpis.occupancy.booked / kpis.occupancy.capacity) * 100;
  const noShowRate = (kpis.noShow.count / kpis.noShow.total) * 100;
  
  // Cálculo simplificado de LTV para o dashboard: Ticket Médio * Média de sessões
  const estimatedLtv = kpis.financial.avgTicket * kpis.clinical.avgSessions;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Saúde do Negócio</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>Métricas reais da Mooca Fisio</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* KPI: Ocupação */}
        <KPIItem 
          label="OCUPAÇÃO" 
          value={`${occupancyRate.toFixed(1)}%`} 
          sub={`${kpis.occupancy.booked} agendamentos`}
          icon={Calendar}
          status={occupancyRate > 75 ? "good" : occupancyRate > 50 ? "warning" : "bad"}
          color="#3b82f6"
        />

        {/* KPI: No-Show */}
        <KPIItem 
          label="FALTAS (90D)" 
          value={`${noShowRate.toFixed(1)}%`} 
          sub={`${kpis.noShow.count} no-shows`}
          icon={AlertCircle}
          status={noShowRate < 12 ? "good" : noShowRate < 20 ? "warning" : "bad"}
          color="#ef4444"
        />

        {/* KPI: LTV Estimado */}
        <KPIItem 
          label="LTV MÉDIO" 
          value={`R$ ${estimatedLtv.toFixed(0)}`} 
          sub={`Base: ${kpis.clinical.avgSessions.toFixed(1)} sessões`}
          icon={TrendingUp}
          status={estimatedLtv > 2000 ? "good" : estimatedLtv > 1000 ? "warning" : "bad"}
          color="#10b981"
        />

        {/* KPI: Receita Mês */}
        <KPIItem 
          label="RECEITA MÊS" 
          value={`R$ ${(kpis.financial.totalRevenue / 1000).toFixed(1)}k`} 
          sub="Total realizado"
          icon={HandCoins}
          status="neutral"
          color="#8b5cf6"
        />
      </ScrollView>
    </View>
  );
};

const KPIItem = ({ label, value, sub, icon: Icon, status, color }: any) => {
  const colors = useColors();
  
  const statusColor = status === "good" ? "#10b981" : status === "warning" ? "#fbbf24" : status === "bad" ? "#ef4444" : colors.textSecondary;

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Icon size={14} color={color} />
      </View>
      
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      
      <View style={styles.cardFooter}>
        <Text style={[styles.subValue, { color: colors.textSecondary }]} numberOfLines={1}>{sub}</Text>
        {status !== "neutral" && (
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 11,
    fontWeight: "600",
  },
  scroll: {
    paddingLeft: 20,
    paddingRight: 10,
    gap: 12,
  },
  card: {
    width: 160,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  value: {
    fontSize: 22,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  subValue: {
    fontSize: 9,
    fontWeight: "700",
    flex: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  }
});
