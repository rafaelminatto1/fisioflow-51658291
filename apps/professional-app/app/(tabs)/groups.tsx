import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColorScheme";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Card, Header } from "@/components";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function GroupsScreen() {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);

  const { data: classesData, isLoading, refetch } = useQuery({
    queryKey: ["group-classes"],
    queryFn: () => fetchApi<any[]>("/api/groups/classes"),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderClassItem = ({ item }: { item: any }) => (
    <Card style={styles.classCard}>
      <View style={styles.classHeader}>
        <View>
          <Text style={[styles.className, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.classInfo, { color: colors.textSecondary }]}>
            {DAYS[item.dayOfWeek]} • {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
          </Text>
        </View>
        <View style={[styles.capacityBadge, { backgroundColor: colors.primary + "15" }]}>
          <Text style={[styles.capacityText, { color: colors.primary }]}>
            {item.enrolled_count}/{item.capacity}
          </Text>
        </View>
      </View>
      
      <View style={styles.therapistRow}>
        <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
        <Text style={[styles.therapistName, { color: colors.textSecondary }]}>
          {item.therapist_name || "Sem instrutor"}
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.checkInButton, { backgroundColor: colors.primary }]}
        onPress={() => { /* Navegar para check-in da turma */ }}
      >
        <Text style={styles.checkInButtonText}>Fazer Check-in</Text>
        <Ionicons name="qr-code-outline" size={18} color="white" />
      </TouchableOpacity>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <Header title="Turmas e Pilates" showBackButton={false} />
      
      <View style={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {classesData?.data?.length || 0}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Turmas Ativas</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>
              {classesData?.data?.reduce((acc: number, curr: any) => acc + Number(curr.enrolled_count), 0) || 0}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Alunos Total</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : (
          <FlatList
            data={classesData?.data || []}
            renderItem={renderClassItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            onRefresh={onRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="layers-outline" size={48} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nenhuma turma cadastrada.
                </Text>
                <TouchableOpacity style={[styles.createButton, { borderColor: colors.primary }]}>
                  <Text style={[styles.createButtonText, { color: colors.primary }]}>Criar Primeira Turma</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: "100%",
  },
  list: {
    paddingBottom: 20,
  },
  classCard: {
    padding: 16,
    marginBottom: 12,
  },
  classHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  className: {
    fontSize: 16,
    fontWeight: "bold",
  },
  classInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  capacityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  capacityText: {
    fontSize: 12,
    fontWeight: "800",
  },
  therapistRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  therapistName: {
    fontSize: 12,
  },
  checkInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  checkInButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
  },
  createButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  createButtonText: {
    fontWeight: "bold",
  }
});
