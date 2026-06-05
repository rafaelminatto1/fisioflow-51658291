import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Card } from "@/components";
import { useColors } from "@/hooks/useColorScheme";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Sparkles, FileText, Dumbbell } from "lucide-react-native";

interface SemanticRecommenderMobileWidgetProps {
  condition?: string;
}

export const SemanticRecommenderMobileWidget: React.FC<SemanticRecommenderMobileWidgetProps> = ({
  condition,
}) => {
  const colors = useColors();

  const { data, isLoading } = useQuery({
    queryKey: ["semantic-recommendations", condition],
    queryFn: () =>
      fetchApi<{ recommendations: { protocols: any[]; exercises: any[] } }>(
        `/api/ai-search/recommend?condition=${encodeURIComponent(condition || "")}`,
      ),
    enabled: !!condition && condition.length > 3,
    staleTime: 1000 * 60 * 60, // 1h
  });

  if (!condition || condition === "Não informada") {
    return null;
  }

  if (isLoading) {
    return (
      <Card
        style={[
          styles.container,
          { backgroundColor: colors.surface + "B0", borderColor: colors.border + "40" },
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Buscando recomendações da IA...
        </Text>
      </Card>
    );
  }

  const protocols = data?.recommendations?.protocols || [];
  const exercises = data?.recommendations?.exercises || [];

  if (protocols.length === 0 && exercises.length === 0) {
    return null;
  }

  return (
    <Card
      style={[
        styles.container,
        {
          backgroundColor: colors.surface + "B0",
          borderColor: colors.primary + "40",
          borderWidth: 1.5,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + "15" }]}>
          <Sparkles size={16} color={colors.primary} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Inteligência Clínica Ativa</Text>
          <Text style={[styles.subtitle, { color: colors.primary }]}>{condition}</Text>
        </View>
      </View>

      {protocols.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={12} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              WIKI & PROTOCOLOS
            </Text>
          </View>
          <View style={styles.list}>
            {protocols.slice(0, 2).map((p: any) => (
              <View
                key={p.id}
                style={[
                  styles.item,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.itemText, { color: colors.text }]} numberOfLines={1}>
                  {p.title}
                </Text>
                <Text style={[styles.itemCategory, { color: colors.textMuted }]}>{p.category}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {exercises.length > 0 && (
        <View style={[styles.section, { marginTop: 12 }]}>
          <View style={styles.sectionHeader}>
            <Dumbbell size={12} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              EXERCÍCIOS SUGERIDOS
            </Text>
          </View>
          <View style={styles.list}>
            {exercises.slice(0, 3).map((e: any) => (
              <View
                key={e.id}
                style={[
                  styles.item,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.itemText, { color: colors.text }]} numberOfLines={1}>
                  {e.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1.2,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  section: {},
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  itemCategory: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});
