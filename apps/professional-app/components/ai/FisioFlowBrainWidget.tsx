import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  LayoutAnimation,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import Animated, { FadeIn } from "react-native-reanimated";

interface Insight {
  type: "plateau" | "progress" | "alert";
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  citation?: string;
}

interface BrainResponse {
  insights: Insight[];
  summary: string;
}

export function FisioFlowBrainWidget({ patientId }: { patientId: string }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(true);

  const { data, isLoading, isError } = useQuery<BrainResponse>({
    queryKey: ["brain-insights", patientId],
    queryFn: async () => {
      const res = await fetchApi<any>(`/api/ai/brain/insights/${patientId}`);
      return res.data;
    },
    enabled: !!patientId,
  });

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" },
        ]}
      >
        <View style={styles.header}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.primary }]}>
            Brain analisando histórico...
          </Text>
        </View>
      </View>
    );
  }

  if (isError || !data) return null;

  return (
    <Animated.View
      entering={FadeIn}
      style={[
        styles.container,
        {
          backgroundColor: colors.primary + "08",
          borderColor: colors.primary + "25",
        },
      ]}
    >
      <TouchableOpacity onPress={toggleExpand} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.brainIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="analytics" size={14} color="#fff" />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Copiloto Clínico IA</Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          <Text style={[styles.summary, { color: colors.textSecondary }]}>{data.summary}</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.insightsRow}
          >
            {data.insights.map((insight, index) => (
              <View
                key={index}
                style={[
                  styles.insightCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: insight.severity === "high" ? "#EF444440" : colors.border,
                  },
                ]}
              >
                <View style={styles.insightHeader}>
                  <Ionicons
                    name={
                      insight.type === "plateau"
                        ? "trending-down"
                        : insight.type === "progress"
                          ? "trending-up"
                          : "alert-circle"
                    }
                    size={16}
                    color={insight.severity === "high" ? "#EF4444" : colors.primary}
                  />
                  <Text style={[styles.insightTitle, { color: colors.text }]}>{insight.title}</Text>
                </View>
                <Text
                  style={[styles.insightDesc, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {insight.description}
                </Text>
                {insight.citation && (
                  <Text style={[styles.citation, { color: colors.textMuted }]}>
                    {insight.citation}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={[styles.chatBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="chatbubbles-outline" size={16} color="#fff" />
            <Text style={styles.chatBtnText}>Consultar Brain</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brainIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  summary: {
    fontSize: 13,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  insightsRow: {
    gap: 10,
    paddingBottom: 8,
  },
  insightCard: {
    width: 240,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 100,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: "bold",
  },
  insightDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  citation: {
    fontSize: 10,
    fontStyle: "italic",
    marginTop: "auto",
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  chatBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
});
