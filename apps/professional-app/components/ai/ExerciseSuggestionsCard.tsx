/**
 * Exercise Suggestions Card - Card de Sugestões de Exercícios
 *
 * Exibe sugestões inteligentes de exercícios baseadas em IA
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { Card } from "@/components";
import { useHaptics } from "@/hooks/useHaptics";
import {
  generateExerciseSuggestions,
  generateInsights,
  ExerciseRecommendation,
  SuggestionContext,
} from "@/lib/ai/exerciseSuggestions";

interface Props {
  patientId: string;
  conditions: any[];
  recentEvolutions: any[];
  painLevel: number;
  onSelectExercise?: (exercise: ExerciseRecommendation) => void;
}

export function ExerciseSuggestionsCard({
  patientId,
  conditions,
  recentEvolutions,
  painLevel,
  onSelectExercise,
}: Props) {
  const colors = useColors();
  const { light, medium } = useHaptics();
  const [suggestions, setSuggestions] = useState<ExerciseRecommendation[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  useEffect(() => {
    loadSuggestions();
  }, [patientId, painLevel]);

  const loadSuggestions = async () => {
    setIsLoading(true);
    try {
      const context: SuggestionContext = {
        patientId,
        conditions: conditions.map((c) => ({
          id: c.id || c.name,
          name: c.name || c.condition,
          bodyPart: c.bodyPart || c.body_part || "geral",
          severity: c.severity || "moderate",
          chronic: c.chronic || false,
        })),
        recentEvolutions,
        completedExercises: [],
        painLevel,
        mobilityScore: 50,
        goals: [],
      };

      const [suggestionsResult, insightsResult] = await Promise.all([
        generateExerciseSuggestions(context),
        Promise.resolve(generateInsights(context)),
      ]);

      setSuggestions(suggestionsResult);
      setInsights(insightsResult);
    } catch (error) {
      console.error("Error loading suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "#EF4444";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#10B981";
      default:
        return colors.textSecondary;
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "leaf-outline";
      case "medium":
        return "fitness-outline";
      case "hard":
        return "flame-outline";
      default:
        return "help-outline";
    }
  };

  if (isLoading) {
    return (
      <Card style={styles.container} padding="md">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Analisando paciente...
          </Text>
        </View>
      </Card>
    );
  }

  if (suggestions.length === 0 && insights.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Insights Section */}
      {insights.length > 0 && (
        <Card style={styles.insightsCard} padding="md">
          <View style={styles.insightsHeader}>
            <Ionicons name="bulb" size={20} color={colors.warning} />
            <Text style={[styles.insightsTitle, { color: colors.text }]}>Insights</Text>
          </View>
          {insights.map((insight, index) => (
            <Text key={index} style={[styles.insightText, { color: colors.textSecondary }]}>
              {insight}
            </Text>
          ))}
        </Card>
      )}

      {/* Suggestions Section */}
      <Card style={styles.suggestionsCard} padding="md">
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="sparkles" size={20} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Exercícios Sugeridos</Text>
          </View>
          <TouchableOpacity onPress={loadSuggestions}>
            <Ionicons name="refresh" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
          {suggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.exerciseId}
              style={[
                styles.suggestionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor:
                    expandedSuggestion === suggestion.exerciseId ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                light();
                setExpandedSuggestion(
                  expandedSuggestion === suggestion.exerciseId ? null : suggestion.exerciseId,
                );
              }}
            >
              {/* Priority Badge */}
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(suggestion.priority) + "20" },
                ]}
              >
                <View
                  style={[
                    styles.priorityDot,
                    { backgroundColor: getPriorityColor(suggestion.priority) },
                  ]}
                />
                <Text
                  style={[styles.priorityText, { color: getPriorityColor(suggestion.priority) }]}
                >
                  {suggestion.priority === "high"
                    ? "Alta"
                    : suggestion.priority === "medium"
                      ? "Média"
                      : "Baixa"}
                </Text>
              </View>

              {/* Exercise Info */}
              <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={2}>
                {suggestion.exerciseName}
              </Text>
              <Text style={[styles.targetArea, { color: colors.textSecondary }]}>
                {suggestion.targetArea}
              </Text>

              {/* Difficulty & Duration */}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons
                    name={getDifficultyIcon(suggestion.difficulty)}
                    size={14}
                    color={colors.textMuted}
                  />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {suggestion.difficulty === "easy"
                      ? "Fácil"
                      : suggestion.difficulty === "medium"
                        ? "Médio"
                        : "Difícil"}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {suggestion.estimatedDuration}min
                  </Text>
                </View>
              </View>

              {/* Expanded Details */}
              {expandedSuggestion === suggestion.exerciseId && (
                <View style={styles.expandedContent}>
                  <Text style={[styles.reasonText, { color: colors.text }]}>
                    {suggestion.reason}
                  </Text>

                  {suggestion.benefits.length > 0 && (
                    <View style={styles.benefitsContainer}>
                      <Text style={[styles.benefitsTitle, { color: colors.textSecondary }]}>
                        Benefícios:
                      </Text>
                      <View style={styles.benefitsList}>
                        {suggestion.benefits.map((benefit, idx) => (
                          <View key={idx} style={styles.benefitTag}>
                            <Text style={[styles.benefitText, { color: colors.success }]}>
                              {benefit}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      medium();
                      onSelectExercise?.(suggestion);
                    }}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addButtonText}>Adicionar ao Plano</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  insightsCard: {
    marginBottom: 12,
  },
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  suggestionsCard: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  scrollView: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  suggestionCard: {
    width: 160,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "600",
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  targetArea: {
    fontSize: 12,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  benefitsContainer: {
    marginBottom: 12,
  },
  benefitsTitle: {
    fontSize: 11,
    marginBottom: 4,
  },
  benefitsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  benefitTag: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  benefitText: {
    fontSize: 10,
    fontWeight: "500",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
